import { h, modal, avatar, toast, escapeHtml } from '../ui.js';
import { icon } from '../icons.js';
import { api } from '../api.js';
import { BASE } from '../config.js';
import { state } from '../state.js';

// capas reais dos jogos (CDN da Steam); fallback estilizado P&B
let GAME_COVERS = null;
async function loadCovers() {
  if (GAME_COVERS) return GAME_COVERS;
  GAME_COVERS = {};
  try { const { games } = await api.get('/api/games'); for (const g of games) if (g.cover) GAME_COVERS[g.name] = g.cover; } catch {}
  return GAME_COVERS;
}
function gradientFor(name) {
  let hsh = 0; for (let i = 0; i < name.length; i++) hsh = (hsh * 31 + name.charCodeAt(i)) >>> 0;
  const a = 8 + (hsh % 14), b = 22 + ((hsh >> 4) % 20), ang = hsh % 360;
  return `linear-gradient(${ang}deg, rgb(${a},${a},${a}), rgb(${b},${b},${b}))`;
}
function coverStyle(name) {
  const url = GAME_COVERS && GAME_COVERS[name];
  return url ? { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: gradientFor(name) };
}
function bannerStyle(banner) {
  if (!banner) return 'background: radial-gradient(circle at 70% 30%, #232323, #0a0a0a 70%);';
  if (banner.startsWith('data:') || banner.startsWith('http')) return `background-image:url(${banner});background-size:cover;background-position:center;`;
  if (banner.startsWith('/')) return `background-image:url(${BASE + banner});background-size:cover;background-position:center;`;
  return `background:${banner};`;
}

// Constrói o cartão de perfil (reutilizado no modal e na prévia das configurações)
export async function profileCard(u) {
  await loadCovers();
  return h('div', { class: 'profile-card' },
    h('div', { class: 'pc-banner', style: bannerStyle(u.banner) }),
    h('div', { class: 'pc-avatar', style: { position: 'relative' } }, avatar(u, 84),
      h('span', { class: 'dot ' + ((u.online === undefined ? true : u.online) ? (u.status || 'online') : 'offline'), style: { position: 'absolute', right: '4px', bottom: '4px' } })),
    h('div', { class: 'pc-body' },
      h('div', { class: 'pc-name' }, u.username,
        u.pulsar ? h('span', { class: 'ico pulsar-mark', title: 'Pulsar', html: icon('sparkle', 16) }) : '',
        u.serverTag ? h('span', { class: 'server-tag' }, u.serverTag) : ''),
      h('div', { class: 'pc-handle mono' }, '@' + u.username.toLowerCase().replace(/\s+/g, '') + ' · #' + u.tag),
      u.badges && u.badges.length ? h('div', { class: 'pc-badges' }, u.badges.map((b) =>
        h('span', { class: 'badge-chip', title: b.label }, h('span', { class: 'ico', html: icon(b.icon || 'sparkle', 13) }), b.label))) : null,
      u.bio ? h('div', { class: 'pc-section' }, h('div', { class: 'pc-label' }, 'Sobre'), h('div', { class: 'pc-bio' }, u.bio)) : null,
      u.favoriteGame ? h('div', { class: 'pc-section' }, h('div', { class: 'pc-label' }, 'Jogo favorito'),
        h('div', { class: 'game-banner', style: coverStyle(u.favoriteGame) }, h('span', { class: 'gb-scrim' }), h('span', { class: 'ico', html: icon('gamepad', 18) }), h('b', {}, u.favoriteGame))) : null,
      (u.games && u.games.length) ? h('div', { class: 'pc-section' }, h('div', { class: 'pc-label' }, 'Jogos'),
        h('div', { class: 'game-cards' }, u.games.map((g) =>
          h('div', { class: 'game-card', style: coverStyle(g), title: g }, h('span', { class: 'gc-scrim' }), h('span', { class: 'gc-name' }, g))))) : null,
    ),
  );
}

export async function openProfile(userId, app) {
  let u;
  try { u = (await api.get('/api/users/' + userId)).user; } catch (e) { toast(e.message, 'error'); return; }
  const card = await profileCard(u);

  const actions = [];
  if (userId !== state.me.id && app && app.call) actions.push({ label: 'Chamar', primary: true, onClick: (c) => { c(); app.call.start(userId, u.username); } });
  // ações de moderação (se você tem permissão no servidor atual)
  const s = state.currentServer;
  const mem = s && s.members && s.members.find((x) => x.userId === userId);
  if (s && mem && app && app.hasPerm && userId !== state.me.id && !mem.isOwner) {
    if (app.hasPerm(s, 'MUTE')) actions.push({ label: mem.muted ? 'Dessilenciar' : 'Silenciar', onClick: (c) => { c(); api.post(`/api/servers/${s.id}/members/${userId}/mute`).catch((e) => toast(e.message, 'error')); } });
    if (app.hasPerm(s, 'KICK')) actions.push({ label: 'Expulsar', onClick: (c) => { c(); api.post(`/api/servers/${s.id}/members/${userId}/kick`).catch((e) => toast(e.message, 'error')); } });
    if (app.hasPerm(s, 'BAN')) actions.push({ label: 'Banir', onClick: (c) => { c(); api.post(`/api/servers/${s.id}/members/${userId}/ban`, { reason: 'banido' }).catch((e) => toast(e.message, 'error')); } });
  }
  modal({ title: u.username + ' #' + u.tag, body: card, actions });
}
