'use strict';
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const { Server } = require('socket.io');

const { db, DATA_DIR } = require('./db');
const { seed } = require('./seed');
const { GAMES } = require('./games');
const auth = require('./auth');
const perms = require('./perms');
const bots = require('./bots');

// ORBIT_PORT (desktop) tem prioridade; PORT é injetado por hosts (Render/Railway).
const PORT = Number(process.env.ORBIT_PORT || process.env.PORT || 4317);
const WEB_DIR = path.join(__dirname, '..', '..', 'web');

const app = express();
app.use(express.json({ limit: '4mb' }));

// CORS — permite SPA hospedado em outra origem (ex.: Vercel) falar com este backend.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Headers', 'authorization, content-type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Health check (para Render/Railway/uptime)
app.get('/healthz', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ---------- uploads (anexos do chat) ----------
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch {}
const HARD_MAX = 100 * 1024 * 1024; // teto absoluto (plano Orbit+)
const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => cb(null, crypto.randomUUID() + (path.extname(file.originalname || '').slice(0, 12) || '')),
});
const upload = multer({ storage: uploadStorage, limits: { fileSize: HARD_MAX } });
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));

// ---------- helpers ----------
function uid() {
  return crypto.randomUUID();
}

function serverSummary(s) {
  return { id: s.id, name: s.name, icon: s.icon, ownerId: s.ownerId };
}

function channelView(c) {
  return { id: c.id, serverId: c.serverId, name: c.name, type: c.type, position: c.position, topic: c.topic || '' };
}

function memberView(s, m) {
  const u = db.byId('users', m.userId);
  return {
    userId: m.userId,
    username: u ? u.username : 'desconhecido',
    tag: u ? u.tag : '0000',
    avatar: u ? u.avatar : null,
    roles: m.roles || [],
    banned: !!m.banned,
    muted: !!m.muted,
    playing: u ? u.playing : null,
    isOwner: s.ownerId === m.userId,
    perms: perms.memberPermissions(s, m),
  };
}

function serverDetail(s) {
  const channels = db
    .filter('channels', (c) => c.serverId === s.id)
    .sort((a, b) => a.position - b.position)
    .map(channelView);
  return {
    ...serverSummary(s),
    roles: (s.roles || []).slice().sort((a, b) => b.position - a.position),
    channels,
    members: (s.members || []).map((m) => memberView(s, m)),
    bots: bots.botsInServer(s.id).map((b) => ({ id: b.id, name: b.name, ai: !!(b.ai && b.ai.enabled) })),
  };
}

function authorOf(msg) {
  if (msg.botId) {
    const b = db.byId('bots', msg.botId);
    return { id: msg.botId, username: b ? b.name : 'Bot', tag: 'BOT', avatar: null, bot: true };
  }
  const u = db.byId('users', msg.authorId);
  return u
    ? { id: u.id, username: u.username, tag: u.tag, avatar: u.avatar, bot: false, namecard: u.namecard || null }
    : { id: msg.authorId, username: 'desconhecido', tag: '0000', avatar: null, bot: false };
}

function messageView(msg) {
  return { id: msg.id, channelId: msg.channelId, content: msg.content, ts: msg.ts, author: authorOf(msg), attachment: msg.attachment || null };
}

function userServers(userId) {
  return db.filter('servers', (s) => (s.members || []).some((m) => m.userId === userId && !m.banned));
}

function getMembership(server, userId) {
  return (server.members || []).find((m) => m.userId === userId);
}

function requirePerm(server, userId, perm) {
  const m = getMembership(server, userId);
  if (!m) return false;
  return perms.has(perms.memberPermissions(server, m), perm);
}

function defaultServerStructure(server) {
  // @everyone role uses the server id as its id
  server.roles = [
    { id: server.id, name: '@everyone', color: '#9a9a9a', permissions: perms.EVERYONE_DEFAULT, position: 0 },
  ];
  const general = { id: uid(), serverId: server.id, name: 'geral', type: 'text', position: 0, topic: 'Canal principal' };
  const voice = { id: uid(), serverId: server.id, name: 'Voz', type: 'voice', position: 1 };
  const forum = { id: uid(), serverId: server.id, name: 'fórum', type: 'forum', position: 2 };
  db.insert('channels', general);
  db.insert('channels', voice);
  db.insert('channels', forum);
}

// ---------- REST: auth ----------
app.post('/api/auth/register', async (req, res) => {
  try {
    res.json(await auth.register(req.body || {}));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    res.json(await auth.login(req.body || {}));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// ---------- Device authorization ("Entrar com Orbit") — PÚBLICO ----------
const devices = new Map(); // device_code -> { user_code, device_name, status, userId, createdAt, expiresAt }
function genUserCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s.slice(0, 4) + '-' + s.slice(4);
}
function findByUserCode(code) {
  const c = (code || '').toUpperCase();
  for (const [dc, d] of devices) if (d.user_code === c) return { dc, d };
  return null;
}

app.post('/api/device/start', (req, res) => {
  const device_code = crypto.randomUUID();
  const user_code = genUserCode();
  const device_name = String((req.body && req.body.device_name) || 'Dispositivo desconhecido').slice(0, 80);
  const now = Date.now();
  devices.set(device_code, { user_code, device_name, status: 'pending', userId: null, createdAt: now, expiresAt: now + 10 * 60000 });
  const base = process.env.ORBIT_SITE_URL || `${req.protocol}://${req.get('host')}`;
  res.json({ device_code, user_code, verify_url: `${base}/device?code=${user_code}`, expires_in: 600, interval: 2 });
});

app.post('/api/device/poll', (req, res) => {
  const code = req.body && req.body.device_code;
  const d = devices.get(code);
  if (!d) return res.status(404).json({ error: 'device_code inválido' });
  if (Date.now() > d.expiresAt) { devices.delete(code); return res.json({ status: 'expired' }); }
  if (d.status === 'approved' && d.userId) {
    const user = db.byId('users', d.userId);
    devices.delete(code); // uso único
    if (!user) return res.json({ status: 'denied' });
    return res.json({ status: 'approved', token: auth.sign(user), user: auth.publicUser(user) });
  }
  res.json({ status: d.status }); // pending | denied
});

// Everything below requires auth
app.use('/api', auth.authMiddleware);

app.get('/api/me', (req, res) => res.json({ user: auth.publicUser(req.user) }));

// ---------- upload de anexos (imagem/áudio/vídeo/arquivo) ----------
app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(413).json({ error: 'Falha no upload (arquivo muito grande? máx 100MB).' });
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    const max = req.user.beta ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (req.file.size > max) {
      fs.unlink(req.file.path, () => {});
      return res.status(413).json({ error: req.user.beta ? 'Arquivo acima de 100MB.' : 'Arquivo acima de 10MB. Orbit+ libera até 100MB.' });
    }
    res.json({ attachment: {
      url: '/uploads/' + path.basename(req.file.path),
      name: req.file.originalname || 'arquivo',
      size: req.file.size,
      type: req.file.mimetype || 'application/octet-stream',
    } });
  });
});

// limite de upload do usuário (pra UI mostrar antes de enviar)
app.get('/api/upload/limit', (req, res) => res.json({ max: req.user.beta ? 100 * 1024 * 1024 : 10 * 1024 * 1024, beta: !!req.user.beta }));

// ---------- Device authorization — AUTENTICADO (aprovar/negar no site) ----------
app.get('/api/device/info', (req, res) => {
  const found = findByUserCode(req.query.code);
  if (!found) return res.status(404).json({ error: 'Código não encontrado ou expirado' });
  if (Date.now() > found.d.expiresAt) return res.status(410).json({ error: 'Código expirado' });
  res.json({ device_name: found.d.device_name, status: found.d.status });
});

app.post('/api/device/approve', (req, res) => {
  const found = findByUserCode(req.body && req.body.code);
  if (!found) return res.status(404).json({ error: 'Código não encontrado' });
  if (Date.now() > found.d.expiresAt) return res.status(410).json({ error: 'Código expirado' });
  found.d.status = 'approved';
  found.d.userId = req.user.id;
  res.json({ ok: true, device_name: found.d.device_name });
});

app.post('/api/device/deny', (req, res) => {
  const found = findByUserCode(req.body && req.body.code);
  if (found) found.d.status = 'denied';
  res.json({ ok: true });
});

app.patch('/api/me', (req, res) => {
  const { avatar, favoriteGame, status, namecard, username } = req.body || {};
  const u = req.user;
  if (avatar !== undefined) u.avatar = avatar;
  if (favoriteGame !== undefined) u.favoriteGame = favoriteGame;
  if (status !== undefined) u.status = status;
  if (namecard !== undefined) u.namecard = namecard;
  if (username && username.trim().length >= 2) u.username = username.trim();
  db.save();
  res.json({ user: auth.publicUser(u) });
});

app.get('/api/games', (_req, res) => res.json({ games: GAMES.map((g) => ({ id: g.id, name: g.name })) }));

// ---------- REST: servers ----------
app.get('/api/servers', (req, res) => {
  res.json({ servers: userServers(req.user.id).map(serverSummary) });
});

app.post('/api/servers', (req, res) => {
  const name = (req.body && req.body.name || '').trim();
  if (name.length < 2) return res.status(400).json({ error: 'Nome muito curto' });
  const server = {
    id: uid(),
    name,
    icon: req.body.icon || null,
    ownerId: req.user.id,
    roles: [],
    members: [{ userId: req.user.id, roles: [], joinedAt: Date.now() }],
  };
  db.insert('servers', server);
  defaultServerStructure(server);
  db.save();
  res.json({ server: serverDetail(server) });
});

app.get('/api/servers/:id', (req, res) => {
  const s = db.byId('servers', req.params.id);
  if (!s) return res.status(404).json({ error: 'Servidor não encontrado' });
  if (!getMembership(s, req.user.id)) return res.status(403).json({ error: 'Você não é membro' });
  res.json({ server: serverDetail(s) });
});

app.post('/api/servers/:id/join', (req, res) => {
  const s = db.byId('servers', req.params.id);
  if (!s) return res.status(404).json({ error: 'Servidor não encontrado' });
  let m = getMembership(s, req.user.id);
  if (m && m.banned) return res.status(403).json({ error: 'Você está banido deste servidor' });
  if (!m) {
    s.members.push({ userId: req.user.id, roles: [], joinedAt: Date.now() });
    db.save();
    bots.onMemberJoin(botCtx, s.id, { user: req.user.username, server: s.name });
    io.to('server:' + s.id).emit('server:update', serverDetail(s));
  }
  res.json({ server: serverDetail(s) });
});

app.post('/api/servers/:id/leave', (req, res) => {
  const s = db.byId('servers', req.params.id);
  if (!s) return res.status(404).json({ error: 'Servidor não encontrado' });
  if (s.ownerId === req.user.id) return res.status(400).json({ error: 'Dono não pode sair; transfira ou apague o servidor' });
  s.members = s.members.filter((m) => m.userId !== req.user.id);
  db.save();
  bots.onMemberLeave(botCtx, s.id, { user: req.user.username, server: s.name });
  io.to('server:' + s.id).emit('server:update', serverDetail(s));
  res.json({ ok: true });
});

// ---------- channels ----------
app.post('/api/servers/:id/channels', (req, res) => {
  const s = db.byId('servers', req.params.id);
  if (!s) return res.status(404).json({ error: 'Servidor não encontrado' });
  if (!requirePerm(s, req.user.id, perms.PERMISSIONS.MANAGE_CHANNELS))
    return res.status(403).json({ error: 'Sem permissão para gerenciar canais' });
  const name = (req.body.name || '').trim();
  const type = ['text', 'voice', 'forum'].includes(req.body.type) ? req.body.type : 'text';
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
  const position = db.filter('channels', (c) => c.serverId === s.id).length;
  const ch = { id: uid(), serverId: s.id, name, type, position, topic: '' };
  db.insert('channels', ch);
  io.to('server:' + s.id).emit('server:update', serverDetail(s));
  res.json({ channel: channelView(ch) });
});

app.delete('/api/channels/:cid', (req, res) => {
  const ch = db.byId('channels', req.params.cid);
  if (!ch) return res.status(404).json({ error: 'Canal não encontrado' });
  const s = db.byId('servers', ch.serverId);
  if (!requirePerm(s, req.user.id, perms.PERMISSIONS.MANAGE_CHANNELS))
    return res.status(403).json({ error: 'Sem permissão' });
  db.remove('channels', (c) => c.id === ch.id);
  db.remove('messages', (m) => m.channelId === ch.id);
  io.to('server:' + s.id).emit('server:update', serverDetail(s));
  res.json({ ok: true });
});

app.get('/api/channels/:cid/messages', (req, res) => {
  const ch = db.byId('channels', req.params.cid);
  if (!ch) return res.status(404).json({ error: 'Canal não encontrado' });
  const s = db.byId('servers', ch.serverId);
  if (!getMembership(s, req.user.id)) return res.status(403).json({ error: 'Não é membro' });
  const list = db
    .filter('messages', (m) => m.channelId === ch.id)
    .sort((a, b) => a.ts - b.ts)
    .slice(-100)
    .map(messageView);
  res.json({ messages: list });
});

// ---------- roles ----------
app.get('/api/perms', (_req, res) => {
  res.json({ permissions: perms.PERMISSIONS, labels: perms.LABELS });
});

app.post('/api/servers/:id/roles', (req, res) => {
  const s = db.byId('servers', req.params.id);
  if (!s) return res.status(404).json({ error: 'Servidor não encontrado' });
  if (!requirePerm(s, req.user.id, perms.PERMISSIONS.MANAGE_ROLES))
    return res.status(403).json({ error: 'Sem permissão para gerenciar cargos' });
  const role = {
    id: uid(),
    name: (req.body.name || 'novo cargo').trim(),
    color: req.body.color || '#ffffff',
    permissions: Number(req.body.permissions) || 0,
    position: (s.roles.length || 1),
  };
  s.roles.push(role);
  db.save();
  io.to('server:' + s.id).emit('server:update', serverDetail(s));
  res.json({ role });
});

app.patch('/api/servers/:id/roles/:rid', (req, res) => {
  const s = db.byId('servers', req.params.id);
  if (!s) return res.status(404).json({ error: 'Servidor não encontrado' });
  if (!requirePerm(s, req.user.id, perms.PERMISSIONS.MANAGE_ROLES))
    return res.status(403).json({ error: 'Sem permissão' });
  const role = (s.roles || []).find((r) => r.id === req.params.rid);
  if (!role) return res.status(404).json({ error: 'Cargo não encontrado' });
  const { name, color, permissions } = req.body || {};
  if (name !== undefined) role.name = name;
  if (color !== undefined) role.color = color;
  if (permissions !== undefined && role.id !== s.id) role.permissions = Number(permissions) || 0;
  if (permissions !== undefined && role.id === s.id) role.permissions = Number(permissions) || 0;
  db.save();
  io.to('server:' + s.id).emit('server:update', serverDetail(s));
  res.json({ role });
});

app.delete('/api/servers/:id/roles/:rid', (req, res) => {
  const s = db.byId('servers', req.params.id);
  if (!s) return res.status(404).json({ error: 'Servidor não encontrado' });
  if (req.params.rid === s.id) return res.status(400).json({ error: 'Não dá pra apagar @everyone' });
  if (!requirePerm(s, req.user.id, perms.PERMISSIONS.MANAGE_ROLES))
    return res.status(403).json({ error: 'Sem permissão' });
  s.roles = s.roles.filter((r) => r.id !== req.params.rid);
  s.members.forEach((m) => { m.roles = (m.roles || []).filter((id) => id !== req.params.rid); });
  db.save();
  io.to('server:' + s.id).emit('server:update', serverDetail(s));
  res.json({ ok: true });
});

app.post('/api/servers/:id/members/:uid/roles', (req, res) => {
  const s = db.byId('servers', req.params.id);
  if (!s) return res.status(404).json({ error: 'Servidor não encontrado' });
  if (!requirePerm(s, req.user.id, perms.PERMISSIONS.MANAGE_ROLES))
    return res.status(403).json({ error: 'Sem permissão' });
  const m = getMembership(s, req.params.uid);
  if (!m) return res.status(404).json({ error: 'Membro não encontrado' });
  m.roles = Array.isArray(req.body.roles) ? req.body.roles.filter((rid) => rid !== s.id) : m.roles;
  db.save();
  io.to('server:' + s.id).emit('server:update', serverDetail(s));
  res.json({ member: memberView(s, m) });
});

// ---------- moderation ----------
// Returns the server on success, or null after sending an error response.
function moderate(req, res, perm, action) {
  const s = db.byId('servers', req.params.id);
  if (!s) { res.status(404).json({ error: 'Servidor não encontrado' }); return null; }
  if (!requirePerm(s, req.user.id, perm)) { res.status(403).json({ error: 'Sem permissão' }); return null; }
  const target = db.byId('users', req.params.uid);
  const m = getMembership(s, req.params.uid);
  if (!m || !target) { res.status(404).json({ error: 'Membro não encontrado' }); return null; }
  if (s.ownerId === target.id) { res.status(400).json({ error: 'Não dá pra moderar o dono' }); return null; }
  action(s, m, target);
  db.save();
  io.to('server:' + s.id).emit('server:update', serverDetail(s));
  return s;
}

app.post('/api/servers/:id/members/:uid/ban', (req, res) => {
  const s = moderate(req, res, perms.PERMISSIONS.BAN, (s, m) => { m.banned = true; });
  if (!s) return;
  const target = db.byId('users', req.params.uid);
  bots.onMemberBan(botCtx, s.id, { user: target.username, server: s.name, reason: (req.body && req.body.reason) || 'sem motivo' });
  res.json({ ok: true });
});

app.post('/api/servers/:id/members/:uid/kick', (req, res) => {
  const s = moderate(req, res, perms.PERMISSIONS.KICK, (s, m) => { s.members = s.members.filter((x) => x.userId !== m.userId); });
  if (!s) return;
  const target = db.byId('users', req.params.uid);
  bots.onMemberLeave(botCtx, s.id, { user: target.username, server: s.name });
  res.json({ ok: true });
});

app.post('/api/servers/:id/members/:uid/mute', (req, res) => {
  const s = moderate(req, res, perms.PERMISSIONS.MUTE, (s, m) => { m.muted = !m.muted; });
  if (!s) return;
  const target = db.byId('users', req.params.uid);
  const m = getMembership(s, req.params.uid);
  if (m.muted) bots.onMemberMute(botCtx, s.id, { user: target.username, server: s.name });
  res.json({ ok: true, muted: m.muted });
});

// ---------- friends + presence ----------
function publicFriend(u) {
  return { id: u.id, username: u.username, tag: u.tag, avatar: u.avatar,
    status: online.has(u.id) ? (u.status || 'online') : 'offline',
    playing: u.playing || null, favoriteGame: u.favoriteGame || null };
}
function miniUser(u) { return u ? { id: u.id, username: u.username, tag: u.tag, avatar: u.avatar } : null; }

app.get('/api/friends', (req, res) => {
  const rels = db.filter('friends', (f) => f.userId === req.user.id);
  const list = rels.map((f) => { const u = db.byId('users', f.friendId); return u ? publicFriend(u) : null; }).filter(Boolean);
  res.json({ friends: list });
});

// Pedidos de amizade (entrada e saída)
app.get('/api/friends/requests', (req, res) => {
  const incoming = db.filter('friendRequests', (r) => r.toId === req.user.id)
    .map((r) => ({ id: r.id, dir: 'in', user: miniUser(db.byId('users', r.fromId)), createdAt: r.createdAt }))
    .filter((r) => r.user);
  const outgoing = db.filter('friendRequests', (r) => r.fromId === req.user.id)
    .map((r) => ({ id: r.id, dir: 'out', user: miniUser(db.byId('users', r.toId)), createdAt: r.createdAt }))
    .filter((r) => r.user);
  res.json({ incoming, outgoing });
});

// Enviar pedido — por nome de usuário (ou nome#0000 se houver ambiguidade)
app.post('/api/friends/request', (req, res) => {
  const input = String(req.body.username || req.body.handle || '').trim();
  if (!input) return res.status(400).json({ error: 'Digite o nome do usuário' });
  let target;
  const m = input.match(/^(.+)#(\d{4})$/);
  if (m) target = db.find('users', (u) => u.username.toLowerCase() === m[1].toLowerCase() && u.tag === m[2]);
  else {
    const matches = db.filter('users', (u) => u.username.toLowerCase() === input.toLowerCase());
    if (matches.length > 1) return res.status(409).json({ error: 'Vários usuários com esse nome. Use nome#0000.' });
    target = matches[0];
  }
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'Você não pode se adicionar' });
  if (db.find('friends', (f) => f.userId === req.user.id && f.friendId === target.id)) return res.status(400).json({ error: 'Vocês já são amigos' });
  if (db.find('friendRequests', (r) => r.fromId === req.user.id && r.toId === target.id)) return res.status(400).json({ error: 'Pedido já enviado' });

  // Se o alvo já te mandou pedido, aceita automaticamente
  const reverse = db.find('friendRequests', (r) => r.fromId === target.id && r.toId === req.user.id);
  if (reverse) {
    db.remove('friendRequests', (r) => r.id === reverse.id);
    db.insert('friends', { userId: req.user.id, friendId: target.id, since: Date.now() });
    db.insert('friends', { userId: target.id, friendId: req.user.id, since: Date.now() });
    io.to('user:' + target.id).emit('friend:accepted', { user: publicFriend(req.user) });
    io.to('user:' + target.id).emit('notify', { kind: 'friend_accepted', text: `${req.user.username} aceitou sua amizade`, ts: Date.now() });
    return res.json({ ok: true, status: 'accepted' });
  }

  const reqDoc = { id: uid(), fromId: req.user.id, toId: target.id, createdAt: Date.now() };
  db.insert('friendRequests', reqDoc);
  io.to('user:' + target.id).emit('friend:request', { id: reqDoc.id, user: miniUser(req.user), createdAt: reqDoc.createdAt });
  io.to('user:' + target.id).emit('notify', { kind: 'friend_request', text: `${req.user.username} te enviou um pedido de amizade`, ts: Date.now() });
  res.json({ ok: true, status: 'pending', target: miniUser(target) });
});

app.post('/api/friends/requests/:id/accept', (req, res) => {
  const r = db.byId('friendRequests', req.params.id);
  if (!r || r.toId !== req.user.id) return res.status(404).json({ error: 'Pedido não encontrado' });
  db.remove('friendRequests', (x) => x.id === r.id);
  db.insert('friends', { userId: r.fromId, friendId: r.toId, since: Date.now() });
  db.insert('friends', { userId: r.toId, friendId: r.fromId, since: Date.now() });
  const other = db.byId('users', r.fromId);
  io.to('user:' + r.fromId).emit('friend:accepted', { user: publicFriend(req.user) });
  io.to('user:' + r.fromId).emit('notify', { kind: 'friend_accepted', text: `${req.user.username} aceitou seu pedido`, ts: Date.now() });
  res.json({ ok: true, friend: other ? publicFriend(other) : null });
});

app.post('/api/friends/requests/:id/decline', (req, res) => {
  const r = db.byId('friendRequests', req.params.id);
  if (!r || (r.toId !== req.user.id && r.fromId !== req.user.id)) return res.status(404).json({ error: 'Pedido não encontrado' });
  db.remove('friendRequests', (x) => x.id === r.id);
  res.json({ ok: true });
});

app.delete('/api/friends/:id', (req, res) => {
  db.remove('friends', (f) => (f.userId === req.user.id && f.friendId === req.params.id) || (f.userId === req.params.id && f.friendId === req.user.id));
  res.json({ ok: true });
});

// ---------- bots ----------
function botView(b, full) {
  const base = { id: b.id, name: b.name, ownerId: b.ownerId, serverId: b.serverId || null, avatar: b.avatar || null,
    ai: { enabled: !!(b.ai && b.ai.enabled), provider: b.ai?.provider || 'demo', model: b.ai?.model || '', systemPrompt: b.ai?.systemPrompt || '' },
    events: b.events || {} };
  if (full) base.token = b.token;
  if (full && b.ai) base.ai.apiKeySet = !!b.ai.apiKey;
  return base;
}

app.get('/api/bots', (req, res) => {
  res.json({ bots: db.filter('bots', (b) => b.ownerId === req.user.id).map((b) => botView(b, true)) });
});

app.post('/api/bots', (req, res) => {
  const name = (req.body.name || '').trim();
  if (name.length < 2) return res.status(400).json({ error: 'Nome muito curto' });
  const bot = {
    id: uid(),
    ownerId: req.user.id,
    name,
    avatar: null,
    token: 'orbit_bot_' + crypto.randomBytes(16).toString('hex'),
    serverId: null,
    ai: { enabled: false, provider: 'demo', model: '', apiKey: '', systemPrompt: 'Você é um bot do Orbit, prestativo e direto.' },
    events: {
      welcome: { enabled: true, message: 'Bem-vindo(a), {user}! Aproveite o {server}.', channelId: null },
      leave: { enabled: true, message: '{user} saiu do servidor.', channelId: null },
      ban: { enabled: true, message: '{user} foi banido. Motivo: {reason}.', channelId: null },
      mute: { enabled: true, message: '{user} foi silenciado.', channelId: null },
    },
  };
  db.insert('bots', bot);
  res.json({ bot: botView(bot, true) });
});

app.patch('/api/bots/:id', (req, res) => {
  const b = db.byId('bots', req.params.id);
  if (!b || b.ownerId !== req.user.id) return res.status(404).json({ error: 'Bot não encontrado' });
  const { name, avatar, ai, events } = req.body || {};
  if (name) b.name = name.trim();
  if (avatar !== undefined) b.avatar = avatar;
  if (ai) {
    b.ai = b.ai || {};
    if (ai.enabled !== undefined) b.ai.enabled = !!ai.enabled;
    if (ai.provider !== undefined) b.ai.provider = ai.provider;
    if (ai.model !== undefined) b.ai.model = ai.model;
    if (ai.systemPrompt !== undefined) b.ai.systemPrompt = ai.systemPrompt;
    if (ai.apiKey) b.ai.apiKey = ai.apiKey; // only overwrite when provided
  }
  if (events) b.events = Object.assign(b.events || {}, events);
  db.save();
  res.json({ bot: botView(b, true) });
});

app.delete('/api/bots/:id', (req, res) => {
  const b = db.byId('bots', req.params.id);
  if (!b || b.ownerId !== req.user.id) return res.status(404).json({ error: 'Bot não encontrado' });
  db.remove('bots', (x) => x.id === b.id);
  res.json({ ok: true });
});

app.post('/api/bots/:id/invite', (req, res) => {
  const b = db.byId('bots', req.params.id);
  if (!b || b.ownerId !== req.user.id) return res.status(404).json({ error: 'Bot não encontrado' });
  const s = db.byId('servers', req.body.serverId);
  if (!s) return res.status(404).json({ error: 'Servidor não encontrado' });
  if (!requirePerm(s, req.user.id, perms.PERMISSIONS.MANAGE_BOTS) && s.ownerId !== req.user.id)
    return res.status(403).json({ error: 'Sem permissão para adicionar bots' });
  b.serverId = s.id;
  db.save();
  io.to('server:' + s.id).emit('server:update', serverDetail(s));
  res.json({ ok: true });
});

// Test an AI bot directly (no server needed)
app.post('/api/bots/:id/chat', async (req, res) => {
  const b = db.byId('bots', req.params.id);
  if (!b || b.ownerId !== req.user.id) return res.status(404).json({ error: 'Bot não encontrado' });
  const { generateReply } = require('./ai');
  const reply = await generateReply(b.ai, (req.body && req.body.message) || '', { author: req.user.username });
  res.json({ reply });
});

// ---------- store + subscription ----------
app.get('/api/store', (req, res) => {
  const owned = new Set(db.filter('inventory', (i) => i.userId === req.user.id).map((i) => i.itemId));
  res.json({
    points: req.user.points,
    items: db.state.storeItems.map((it) => ({ ...it, owned: owned.has(it.id) })),
  });
});

app.get('/api/inventory', (req, res) => {
  const owned = db.filter('inventory', (i) => i.userId === req.user.id).map((i) => i.itemId);
  res.json({ inventory: db.state.storeItems.filter((it) => owned.includes(it.id)) });
});

app.post('/api/store/buy', (req, res) => {
  const item = db.state.storeItems.find((i) => i.id === req.body.itemId);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });
  if (db.find('inventory', (i) => i.userId === req.user.id && i.itemId === item.id))
    return res.status(400).json({ error: 'Você já tem esse item' });
  if (req.user.points < item.price) return res.status(400).json({ error: 'Pontos insuficientes' });
  req.user.points -= item.price;
  db.insert('inventory', { userId: req.user.id, itemId: item.id });
  db.save();
  res.json({ ok: true, points: req.user.points, item });
});

app.get('/api/subscription', (req, res) => {
  res.json({ beta: !!req.user.beta, points: req.user.points });
});

app.post('/api/subscription', (req, res) => {
  // Beta toggle — pagamento real fica "Em Breve" (sem cobrança).
  req.user.beta = !!req.body.beta;
  if (req.user.beta) req.user.points += 0;
  db.save();
  res.json({ beta: req.user.beta });
});

// ---------- landing page (marketing) at /landing ----------
const LANDING_DIR = path.join(__dirname, '..', '..', 'landing');
app.use('/landing', express.static(LANDING_DIR));

// ---------- static SPA (desktop + web/mobile) ----------
app.use(express.static(WEB_DIR));
app.get(/^\/(?!api\/).*/, (req, res) => {
  // SPA fallback for client-side routes
  if (req.path.includes('.')) return res.status(404).end();
  res.sendFile(path.join(WEB_DIR, 'index.html'));
});

// ---------- HTTP + Socket.IO ----------
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' }, maxHttpBufferSize: 5e6 });

const online = new Map(); // userId -> Set(socketId)

function postMessage(channelId, { authorId, botId, content, attachment }) {
  const ch = db.byId('channels', channelId);
  if (!ch || (!content && !attachment)) return null;
  const msg = { id: uid(), channelId, authorId: authorId || null, botId: botId || null, content: String(content || '').slice(0, 4000), attachment: attachment || null, ts: Date.now() };
  db.insert('messages', msg);
  // limita o histórico por canal (mantém as últimas 300) pra não inflar o store
  const chMsgs = db.state.messages.filter((m) => m.channelId === channelId);
  if (chMsgs.length > 300) {
    const drop = new Set(chMsgs.slice(0, chMsgs.length - 300).map((m) => m.id));
    db.state.messages = db.state.messages.filter((m) => !drop.has(m.id));
  }
  io.to('channel:' + channelId).emit('message:new', messageView(msg));
  return msg;
}
const botCtx = { postMessage };

function friendIds(userId) {
  return db.filter('friends', (f) => f.userId === userId).map((f) => f.friendId);
}

function broadcastPresence(user) {
  const payload = { id: user.id, status: online.has(user.id) ? (user.status || 'online') : 'offline', playing: user.playing || null };
  for (const fid of db.filter('friends', (f) => f.friendId === user.id).map((f) => f.userId)) {
    for (const sid of online.get(fid) || []) io.to(sid).emit('friend:presence', payload);
  }
}

io.use((socket, next) => {
  const user = auth.verify(socket.handshake.auth && socket.handshake.auth.token);
  if (!user) return next(new Error('unauthorized'));
  socket.data.userId = user.id;
  next();
});

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  if (!online.has(userId)) online.set(userId, new Set());
  online.get(userId).add(socket.id);
  socket.join('user:' + userId);
  const me = db.byId('users', userId);
  if (me) broadcastPresence(me);

  socket.on('channel:join', (channelId) => {
    // leave previous text rooms
    for (const r of socket.rooms) if (r.startsWith('channel:')) socket.leave(r);
    socket.join('channel:' + channelId);
  });

  socket.on('server:subscribe', (serverId) => {
    const s = db.byId('servers', serverId);
    if (s && getMembership(s, userId)) socket.join('server:' + serverId);
  });

  socket.on('message:send', async ({ channelId, content, attachment }) => {
    const ch = db.byId('channels', channelId);
    if (!ch || ch.type === 'voice') return;
    const s = db.byId('servers', ch.serverId);
    const m = getMembership(s, userId);
    if (!m || m.banned || m.muted) return;
    if (!perms.has(perms.memberPermissions(s, m), perms.PERMISSIONS.SEND_MESSAGES)) return;
    const msg = postMessage(channelId, { authorId: userId, content, attachment });
    if (msg) {
      const u = db.byId('users', userId);
      bots.maybeReply(botCtx, ch, msg, u ? u.username : 'alguém').catch(() => {});
    }
  });

  socket.on('activity:set', (game) => {
    const u = db.byId('users', userId);
    if (!u) return;
    u.playing = game || null;
    db.save();
    broadcastPresence(u);
  });

  socket.on('status:set', (status) => {
    const u = db.byId('users', userId);
    if (!u) return;
    u.status = status || 'online';
    db.save();
    broadcastPresence(u);
  });

  // ---- voice presence (room membership only; media is P2P via WebRTC) ----
  socket.on('voice:join', (channelId) => {
    socket.join('voice:' + channelId);
    socket.data.voiceChannel = channelId;
    io.to('voice:' + channelId).emit('voice:peers', voicePeers(channelId));
  });
  socket.on('voice:leave', (channelId) => {
    socket.leave('voice:' + (channelId || socket.data.voiceChannel));
    const ch = channelId || socket.data.voiceChannel;
    socket.data.voiceChannel = null;
    io.to('voice:' + ch).emit('voice:peers', voicePeers(ch));
  });

  // ---- WebRTC signaling (1:1 video/voice) ----
  socket.on('rtc:signal', ({ to, data }) => {
    io.to('user:' + to).emit('rtc:signal', { from: userId, data });
  });
  socket.on('call:invite', ({ to }) => {
    const u = db.byId('users', userId);
    io.to('user:' + to).emit('call:incoming', { from: userId, name: u ? u.username : 'alguém' });
  });
  socket.on('call:accept', ({ to }) => io.to('user:' + to).emit('call:accepted', { from: userId }));
  socket.on('call:reject', ({ to }) => io.to('user:' + to).emit('call:rejected', { from: userId }));
  socket.on('call:end', ({ to }) => io.to('user:' + to).emit('call:ended', { from: userId }));

  socket.on('disconnect', () => {
    const set = online.get(userId);
    if (set) {
      set.delete(socket.id);
      if (!set.size) online.delete(userId);
    }
    const u = db.byId('users', userId);
    if (u) {
      if (!online.has(userId)) { u.playing = u.playing; }
      broadcastPresence(u);
    }
    if (socket.data.voiceChannel) {
      io.to('voice:' + socket.data.voiceChannel).emit('voice:peers', voicePeers(socket.data.voiceChannel));
    }
  });
});

function voicePeers(channelId) {
  const room = io.sockets.adapter.rooms.get('voice:' + channelId) || new Set();
  const seen = new Set();
  const peers = [];
  for (const sid of room) {
    const s = io.sockets.sockets.get(sid);
    if (!s) continue;
    if (seen.has(s.data.userId)) continue;
    seen.add(s.data.userId);
    const u = db.byId('users', s.data.userId);
    peers.push({ userId: s.data.userId, username: u ? u.username : '??', avatar: u ? u.avatar : null });
  }
  return peers;
}

async function start() {
  await db.load();   // carrega do Redis (hospedado) ou do arquivo (local)
  seed();
  // Tenta a porta preferida; se ocupada, cai pra próxima e por fim numa porta livre (0).
  const candidates = [PORT, PORT + 1, PORT + 2, PORT + 3, PORT + 4, 0];
  return new Promise((resolve, reject) => {
    let i = 0;
    const tryNext = () => {
      const p = candidates[i++];
      httpServer.removeAllListeners('error');
      httpServer.once('error', (err) => {
        if (err && err.code === 'EADDRINUSE' && i < candidates.length) {
          console.warn('[orbit] porta', p, 'ocupada — tentando próxima…');
          tryNext();
        } else {
          reject(err);
        }
      });
      httpServer.listen(p, () => {
        const actual = httpServer.address().port;
        console.log('[orbit] servidor em http://127.0.0.1:' + actual);
        resolve(actual);
      });
    };
    tryNext();
  });
}

module.exports = { start, app, PORT };

// Run directly (node src/index.js) — when launched by Electron we call start() from main.
if (require.main === module) start();
