import { h, clear, avatar, toast, iconBtn, modal, escapeHtml, confirmDialog } from './ui.js';
import { icon } from './icons.js';
import { api, uploadFile } from './api.js';
import { BASE } from './config.js';
import { state } from './state.js';
import { connectSocket, emitS, onS, socket, ensureSocketClient } from './socket.js';
import { sfx } from './sound.js';
import { renderFriends } from './views/friends.js';
import { renderBots } from './views/bots.js';
import { renderStore } from './views/storeview.js';
import { renderSubscription } from './views/subscription.js';
import { renderSettings } from './views/settings.js';
import { openServerSettings } from './views/roles.js';
import { CallManager } from './views/call.js';
import { renderMarkdown } from './markdown.js';
import { openProfile } from './views/profile.js';

export async function mountApp(App, root) {
  try { await ensureSocketClient(); } catch (e) { console.warn(e.message); }
  const sock = connectSocket();

  const shell = h('div', { class: 'shell no-sidebar' });
  const rail = h('div', { class: 'rail' });
  const sidebar = h('div', { class: 'sidebar' });
  const main = h('div', { class: 'main' });
  const members = h('div', { class: 'members' });
  shell.append(rail, sidebar, main, members);
  root.appendChild(shell);

  const app = {
    App, shell, rail, sidebar, main, members,
    view: 'friends',      // friends | bots | store | subscription | settings | server
    homeTab: 'friends',
    friendsTab: 'all',
    voiceChannelId: null,
    pendingIn: 0,
  };
  App.app = app;
  const call = new CallManager(app);
  app.call = call;

  // ---------- data ----------
  app.loadServers = async () => { state.servers = (await api.get('/api/servers')).servers; };
  app.loadPerms = async () => { const p = await api.get('/api/perms'); state.perms = p.permissions; state.permLabels = p.labels; };
  app.setNotif = (n) => { app.pendingIn = n; if (app.view !== 'server') renderSidebar(); };
  app.refreshNotifs = async () => {
    try { const { incoming } = await api.get('/api/friends/requests'); app.pendingIn = incoming.length; if (app.view !== 'server') renderSidebar(); } catch {}
    return app.pendingIn;
  };

  app.openServer = async (serverId, channelId) => {
    const { server } = await api.get('/api/servers/' + serverId);
    state.currentServer = server;
    app.view = 'server';
    emitS('server:subscribe', serverId);
    const channels = server.channels;
    let ch = channelId ? channels.find((c) => c.id === channelId) : null;
    if (!ch) ch = channels.find((c) => c.type === 'text') || channels[0];
    renderRail(); renderSidebar();
    if (ch) await app.openChannel(ch); else { clear(main); renderMembers(); }
  };

  app.openChannel = async (ch) => {
    state.currentChannel = ch;
    if (ch.type === 'voice') { renderSidebar(); return app.joinVoice(ch); }
    emitS('channel:join', ch.id);
    renderSidebar();
    await renderChat(ch);
    renderMembers();
  };

  app.goHome = (tab = 'friends') => {
    app.view = tab; app.homeTab = tab; state.currentServer = null; state.currentChannel = null;
    renderRail(); renderSidebar(); renderMain(); members.style.display = 'none';
  };

  // ---------- RAIL ----------
  function railItem(opts) {
    const it = h('div', { class: 'rail-item ' + (opts.cls || '') + (opts.active ? ' active' : ''), title: opts.title || '', onClick: opts.onClick });
    if (opts.img) { it.classList.add('has-img'); it.style.backgroundImage = `url(${opts.img})`; }
    else if (opts.icon) it.innerHTML = icon(opts.icon, opts.size || 22);
    else if (opts.text) it.textContent = opts.text;
    return it;
  }

  function renderRail() {
    clear(rail);
    rail.append(
      railItem({ cls: 'rail-logo', icon: 'orbit', size: 26, title: 'Início', active: app.view !== 'server' && app.view !== 'store' && app.view !== 'settings', onClick: () => app.goHome('friends') }),
      h('div', { class: 'rail-sep' }),
    );
    for (const s of state.servers) {
      rail.appendChild(railItem({
        text: s.name.slice(0, 2).toUpperCase(), img: s.icon,
        title: s.name, active: app.view === 'server' && state.currentServer && state.currentServer.id === s.id,
        onClick: () => app.openServer(s.id),
      }));
    }
    rail.append(
      railItem({ icon: 'plus', title: 'Criar servidor', onClick: openCreateServer }),
      h('div', { class: 'rail-sep' }),
      railItem({ icon: 'store', title: 'Loja', active: app.view === 'store', onClick: () => { app.view = 'store'; state.currentServer = null; renderRail(); renderSidebar(); renderMain(); members.style.display = 'none'; } }),
      railItem({ icon: 'gear', title: 'Configurações', active: app.view === 'settings', onClick: () => { app.view = 'settings'; state.currentServer = null; renderRail(); renderSidebar(); renderMain(); members.style.display = 'none'; } }),
    );
  }

  // ---------- SIDEBAR ----------
  function homeNavItem(label, ic, tab, badge) {
    const el = h('div', { class: 'channel' + (app.view === tab ? ' active' : ''), onClick: () => app.goHome(tab) },
      h('span', { class: 'ico', html: icon(ic, 18) }), h('span', { class: 'cname' }, label));
    if (badge) el.appendChild(h('span', { class: 'nav-badge' }, String(badge)));
    return el;
  }

  function userPanel() {
    const me = state.me;
    const micOn = !app.call.muted;
    const st = me.status || 'online';
    const stLabel = { online: 'Online', idle: 'Ausente', dnd: 'Não perturbe', offline: 'Offline' }[st] || 'Online';
    return h('div', { class: 'user-panel' },
      h('div', { style: { position: 'relative' } }, avatar(me, 38), h('span', { class: 'dot ' + st, style: { position: 'absolute', right: '-1px', bottom: '-1px' } })),
      h('div', { class: 'meta' },
        h('div', { class: 'uname' }, me.username, me.beta ? h('span', { class: 'ico', style: { marginLeft: '4px' }, html: icon('sparkle', 12) }) : ''),
        h('div', { class: 'ustatus' }, stLabel)),
      h('div', { class: 'controls' },
        iconBtn(micOn ? 'mic' : 'micOff', { title: 'Microfone', onClick: (e) => { app.call.toggleMute(); renderSidebar(); } }),
        iconBtn('gear', { title: 'Configurações', onClick: () => { app.view = 'settings'; renderRail(); renderSidebar(); renderMain(); } }),
      ),
    );
  }

  function renderSidebar() {
    clear(sidebar);
    shell.classList.toggle('no-sidebar', false);
    if (app.view === 'store' || app.view === 'settings') {
      // contextual minimal sidebar = home nav
      sidebar.append(homeHeader(), homeNavScroll(), userPanel());
      return;
    }
    if (app.view === 'server' && state.currentServer) { renderServerSidebar(); return; }
    // home
    sidebar.append(homeHeader(), homeNavScroll(), userPanel());
  }

  function homeHeader() { return h('div', { class: 'sidebar-head' }, h('span', { html: icon('orbit', 18) + '&nbsp; ORBIT' })); }
  function homeNavScroll() {
    const dmBox = h('div', { id: 'dm-list' }, h('div', { class: 'muted', style: { padding: '6px 10px', fontSize: '12px' } }, '…'));
    loadDMList(dmBox);
    return h('div', { class: 'sidebar-scroll' },
      h('div', { class: 'chan-group' },
        homeNavItem('Amigos', 'users', 'friends', app.pendingIn),
        homeNavItem('Pulsar', 'sparkle', 'subscription'),
        homeNavItem('Loja', 'store', 'store'),
        homeNavItem('Bots', 'bot', 'bots'),
      ),
      h('div', { class: 'chan-group' },
        h('div', { class: 'chan-group-h' }, h('span', {}, 'Mensagens diretas'),
          h('button', { title: 'Nova conversa', html: icon('plus', 14), onClick: () => app.goHome('friends') })),
        dmBox),
    );
  }
  async function loadDMList(box) {
    try {
      const { conversations } = await api.get('/api/dm/recent');
      clear(box);
      if (!conversations.length) { box.appendChild(h('div', { class: 'muted', style: { padding: '6px 10px', fontSize: '12px' } }, 'Sem conversas. Vá em Amigos.')); return; }
      for (const c of conversations) {
        const dotCls = c.user.status && c.user.status !== 'offline' ? 'online' : 'offline';
        box.appendChild(h('div', { class: 'dm-row' + (state.currentDM && state.currentDM.friend.id === c.user.id ? ' active' : ''), onClick: () => app.openDM(c.user) },
          h('div', { style: { position: 'relative' } }, avatar(c.user, 32), h('span', { class: 'dot ' + dotCls, style: { position: 'absolute', right: '-2px', bottom: '-2px' } })),
          h('div', { class: 'dm-meta' }, h('div', { class: 'dm-name' }, c.user.username), h('div', { class: 'dm-last' }, c.last || ''))));
      }
    } catch { clear(box); }
  }
  app._refreshDMList = () => { const box = document.getElementById('dm-list'); if (box) loadDMList(box); };

  function renderServerSidebar() {
    const s = state.currentServer;
    const head = h('div', { class: 'sidebar-head', onClick: () => openServerMenu(s) },
      h('span', { class: 'row gap-8' }, s.name, s.boostLevel ? h('span', { class: 'boost-badge', title: s.boosts + ' impulsos', html: icon('flame', 12) + ' Nv ' + s.boostLevel }) : ''),
      h('button', { class: 'icon-btn', html: icon('chevron', 16) }));
    const scroll = h('div', { class: 'sidebar-scroll' });
    const groups = { text: [], voice: [], forum: [] };
    for (const c of s.channels) (groups[c.type] || groups.text).push(c);
    const labels = { text: 'Canais de Texto', voice: 'Canais de Voz', forum: 'Fórum' };
    const canManage = hasPerm(s, 'MANAGE_CHANNELS');
    for (const type of ['text', 'voice', 'forum']) {
      const g = h('div', { class: 'chan-group' },
        h('div', { class: 'chan-group-h' }, h('span', {}, labels[type]),
          canManage ? h('button', { html: icon('plus', 14), title: 'Criar canal', onClick: () => openCreateChannel(s, type) }) : null));
      for (const c of groups[type]) g.appendChild(channelRow(s, c, canManage));
      scroll.appendChild(g);
    }
    sidebar.append(head, scroll, userPanel());
  }

  function channelRow(s, c, canManage) {
    const ic = c.type === 'voice' ? 'volume' : c.type === 'forum' ? 'forum' : 'hash';
    const active = state.currentChannel && state.currentChannel.id === c.id;
    const row = h('div', { class: 'channel' + (active ? ' active' : ''), onClick: () => app.openChannel(c) },
      h('span', { class: 'ico', html: icon(ic, 16) }),
      h('span', { class: 'cname' }, c.name),
      canManage ? h('button', { class: 'icon-btn chan-del', html: icon('trash', 13), onClick: async (e) => { e.stopPropagation(); if (await confirmDialog({ title: 'Apagar canal', message: `Apagar #${c.name}?`, confirmLabel: 'Apagar' })) { await api.del('/api/channels/' + c.id); } } }) : null,
    );
    if (c.type === 'voice') {
      const vm = h('div', { class: 'voice-members', id: 'voice-' + c.id });
      row.after && null;
      const wrap = h('div', {}, row, vm);
      renderVoiceMembers(c.id, vm);
      return wrap;
    }
    return row;
  }

  app._voicePeers = {};
  function renderVoiceMembers(channelId, container) {
    const peers = app._voicePeers[channelId] || [];
    clear(container);
    for (const p of peers) container.appendChild(h('div', { class: 'voice-member' }, h('span', { class: 'ico', html: icon('mic', 12) }), p.username));
  }

  // ---------- MAIN ----------
  function renderMain() {
    clear(main); members.style.display = 'none';
    if (app.view === 'friends') main.appendChild(renderFriends(app));
    else if (app.view === 'bots') main.appendChild(renderBots(app));
    else if (app.view === 'store') main.appendChild(renderStore(app));
    else if (app.view === 'subscription') main.appendChild(renderSubscription(app));
    else if (app.view === 'settings') main.appendChild(renderSettings(app));
  }

  // ---------- CHAT ----------
  async function renderChat(ch) {
    clear(main);
    const s = state.currentServer;
    const head = h('div', { class: 'main-head' },
      h('div', { class: 'title' }, h('span', { class: 'ico', html: icon('hash', 18) }), ch.name),
      ch.topic ? h('div', { class: 'topic' }, ch.topic) : null,
      h('div', { class: 'head-actions' },
        iconBtn('users', { title: 'Membros', onClick: () => { members.style.display = members.style.display === 'none' ? '' : 'none'; updateShellCols(); } }),
      ),
    );
    const list = h('div', { class: 'messages', id: 'msglist' });
    const ta = h('textarea', { class: '', rows: '1', placeholder: 'Conversar em #' + ch.name });
    const send = () => { const v = ta.value.trim(); if (v) { emitS('message:send', { channelId: ch.id, content: v }); ta.value = ''; ta.style.height = 'auto'; sfx.click(); } };
    const ac = h('div', { class: 'mention-pop hidden' });
    const acState = { items: [], active: 0, start: -1, trigger: '' };
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; updateAutocomplete(); });
    ta.addEventListener('keydown', (e) => {
      if (!ac.classList.contains('hidden') && acState.items.length) {
        if (e.key === 'ArrowDown') { e.preventDefault(); acState.active = (acState.active + 1) % acState.items.length; paintAC(); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); acState.active = (acState.active - 1 + acState.items.length) % acState.items.length; paintAC(); return; }
        if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applyAC(acState.items[acState.active]); return; }
        if (e.key === 'Escape') { hideAC(); return; }
      }
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });

    function hideAC() { ac.classList.add('hidden'); acState.items = []; }
    function paintAC() {
      clear(ac);
      acState.items.forEach((it, i) => ac.appendChild(h('div', { class: 'mention-item' + (i === acState.active ? ' active' : ''), onMousedown: (ev) => { ev.preventDefault(); applyAC(it); } },
        h('span', { class: 'ico', html: icon(it.icon, 16) }), h('span', { style: it.color ? { color: it.color } : {} }, it.label))));
    }
    function applyAC(it) {
      if (!it) return;
      const before = ta.value.slice(0, acState.start);
      const after = ta.value.slice(ta.selectionStart);
      ta.value = before + it.insert + ' ' + after;
      const pos = (before + it.insert + ' ').length;
      ta.setSelectionRange(pos, pos); ta.focus();
      hideAC();
    }
    function updateAutocomplete() {
      const s = state.currentServer;
      const pos = ta.selectionStart;
      const upto = ta.value.slice(0, pos);
      const m = upto.match(/(^|\s)([@#])([\wÀ-ÿ.-]*)$/);
      if (!m || !s) { hideAC(); return; }
      const trigger = m[2]; const q = m[3].toLowerCase();
      acState.start = pos - m[3].length - 1; acState.trigger = trigger;
      let items = [];
      if (trigger === '#') {
        items = s.channels.filter((c) => c.type === 'text' && c.name.toLowerCase().includes(q)).slice(0, 6)
          .map((c) => ({ icon: 'hash', label: c.name, insert: '#' + c.name }));
      } else {
        const roles = (s.roles || []).filter((r) => r.id !== s.id && r.name.toLowerCase().includes(q)).slice(0, 4)
          .map((r) => ({ icon: 'shield', label: '@' + r.name, insert: '@' + r.name, color: r.color }));
        const mems = (s.members || []).filter((mb) => !mb.banned && mb.username.toLowerCase().includes(q)).slice(0, 6)
          .map((mb) => ({ icon: 'user', label: '@' + mb.username, insert: '@' + mb.username }));
        const ev = ('everyone'.includes(q)) ? [{ icon: 'users', label: '@everyone', insert: '@everyone' }] : [];
        items = [...ev, ...roles, ...mems];
      }
      if (!items.length) { hideAC(); return; }
      acState.items = items; acState.active = 0; ac.classList.remove('hidden'); paintAC();
    }
    ta.addEventListener('blur', () => setTimeout(hideAC, 120));

    const fileInput = h('input', { type: 'file', style: { display: 'none' } });
    fileInput.addEventListener('change', async () => {
      const f = fileInput.files[0]; if (!f) return;
      toast('Enviando ' + f.name + '…', 'info');
      try {
        const attachment = await uploadFile(f);
        emitS('message:send', { channelId: ch.id, content: ta.value.trim(), attachment });
        ta.value = ''; ta.style.height = 'auto'; sfx.click();
      } catch (e) { toast(e.message, 'error'); }
      fileInput.value = '';
    });
    const attachBtn = h('button', { class: 'icon-btn', title: 'Anexar arquivo', html: icon('plus', 20), onClick: () => fileInput.click() });
    const composer = h('div', { class: 'composer' }, ac, h('div', { class: 'composer-box' }, attachBtn, fileInput, ta, h('button', { class: 'icon-btn send-btn', html: icon('send', 18), onClick: send })));
    main.append(head, list, composer);

    const { messages } = await api.get('/api/channels/' + ch.id + '/messages');
    app._messages = messages;
    renderMessages(list, messages);
    setTimeout(() => ta.focus(), 30);
    updateShellCols();
  }

  function renderMessages(list, msgs) {
    clear(list);
    let lastAuthor = null, lastTs = 0;
    for (const m of msgs) {
      const grouped = lastAuthor === (m.author.id) && (m.ts - lastTs) < 5 * 60000;
      list.appendChild(messageEl(m, grouped));
      lastAuthor = m.author.id; lastTs = m.ts;
    }
    list.scrollTop = list.scrollHeight;
  }

  function messageEl(m, grouped) {
    const time = new Date(m.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const clickProfile = m.author.bot ? null : () => openProfile(m.author.id, app);
    const av = avatar(m.author, 40);
    if (clickProfile) { av.style.cursor = 'pointer'; av.addEventListener('click', clickProfile); }
    const authorLine = h('div', { class: 'line1' },
      h('span', { class: 'author' + (m.author.bot ? ' bot' : ''), style: clickProfile ? { cursor: 'pointer' } : {}, onClick: clickProfile || undefined }, m.author.username, m.author.bot ? h('span', { class: 'botpill' }, 'BOT') : ''),
      h('span', { class: 'ts' }, time));
    const body = h('div', { class: 'body' }, grouped ? null : authorLine);
    if (m.content) body.appendChild(h('div', { class: 'content md', html: renderMarkdown(m.content, state.currentServer) }));
    if (m.attachment) body.appendChild(renderAttachment(m.attachment));
    return h('div', { class: 'msg' + (grouped ? ' grouped' : '') }, av, body);
  }

  function fmtSize(b) { b = b || 0; return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  function renderAttachment(att) {
    const url = att.url && att.url.startsWith('/') ? BASE + att.url : att.url;
    const type = att.type || '';
    if (type.startsWith('image/')) return h('a', { class: 'att', href: url, target: '_blank' }, h('img', { class: 'att-img', src: url, alt: att.name, loading: 'lazy' }));
    if (type.startsWith('video/')) return h('video', { class: 'att att-video', src: url, controls: 'true', preload: 'metadata' });
    if (type.startsWith('audio/')) return h('audio', { class: 'att att-audio', src: url, controls: 'true', preload: 'metadata' });
    return h('a', { class: 'att att-file', href: url, target: '_blank', download: att.name },
      h('span', { class: 'ico', html: icon('link', 18) }),
      h('div', {}, h('div', { class: 'af-name' }, att.name), h('div', { class: 'af-size' }, fmtSize(att.size))));
  }

  // ---------- Mensagens diretas (DM) ----------
  app.openDM = (friend) => {
    app.view = 'dm'; state.currentServer = null; state.currentChannel = null;
    state.currentDM = { friend, dmKey: 'dm:' + [state.me.id, friend.id].sort().join('|') };
    renderRail(); renderSidebar(); renderDM(friend);
  };
  async function renderDM(friend) {
    clear(main); members.style.display = 'none'; shell.classList.remove('with-members');
    const head = h('div', { class: 'main-head' },
      iconBtn('arrowLeft', { title: 'Voltar', onClick: () => app.goHome('friends') }),
      avatar(friend, 28),
      h('div', { class: 'title' }, friend.username),
      h('div', { class: 'head-actions' }, iconBtn('video', { title: 'Chamar', onClick: () => app.call.start(friend.id, friend.username) })));
    const list = h('div', { class: 'messages', id: 'msglist' });
    const ta = h('textarea', { rows: '1', placeholder: 'Conversar com ' + friend.username });
    const send = () => { const v = ta.value.trim(); if (v) { emitS('dm:send', { toId: friend.id, content: v }); ta.value = ''; ta.style.height = 'auto'; sfx.click(); } };
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; });
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    const fileInput = h('input', { type: 'file', style: { display: 'none' } });
    fileInput.addEventListener('change', async () => { const f = fileInput.files[0]; if (!f) return; toast('Enviando ' + f.name + '…', 'info'); try { const att = await uploadFile(f); emitS('dm:send', { toId: friend.id, content: ta.value.trim(), attachment: att }); ta.value = ''; } catch (e) { toast(e.message, 'error'); } fileInput.value = ''; });
    const composer = h('div', { class: 'composer' }, h('div', { class: 'composer-box' },
      h('button', { class: 'icon-btn', title: 'Anexar', html: icon('plus', 20), onClick: () => fileInput.click() }), fileInput, ta,
      h('button', { class: 'icon-btn send-btn', html: icon('send', 18), onClick: send })));
    main.append(head, list, composer);
    try { const { messages } = await api.get('/api/dm/' + friend.id + '/messages'); app._dmMessages = messages; renderMessages(list, messages); } catch {}
    setTimeout(() => ta.focus(), 30);
  }

  // ---------- MEMBERS ----------
  function renderMembers() {
    if (app.view !== 'server' || !state.currentServer) { members.style.display = 'none'; updateShellCols(); return; }
    members.style.display = '';
    clear(members);
    const s = state.currentServer;
    // group by highest role
    const online = s.members.filter((m) => !m.banned);
    members.appendChild(h('h4', {}, `Membros — ${online.length}`));
    for (const m of online.sort((a, b) => (b.isOwner - a.isOwner))) {
      const topRole = (m.roles || []).map((rid) => s.roles.find((r) => r.id === rid)).filter(Boolean).sort((a, b) => b.position - a.position)[0];
      const color = topRole ? topRole.color : null;
      const row = h('div', { class: 'member', onClick: () => openProfile(m.userId, app) },
        avatar(m, 34),
        h('div', { class: 'm-meta' },
          h('div', { class: 'm-name', style: color ? { color } : {} }, m.username, m.isOwner ? h('span', { class: 'ico crown', html: icon('crown', 13) }) : '', m.muted ? h('span', { class: 'ico', html: icon('micOff', 12) }) : ''),
          h('div', { class: 'm-sub' }, m.playing ? h('span', { class: 'playing-badge', html: icon('gamepad', 11) + ' ' + escapeHtml(m.playing) }) : (topRole ? topRole.name : 'membro'))),
      );
      members.appendChild(row);
    }
    if (s.bots && s.bots.length) {
      members.appendChild(h('h4', {}, 'Bots'));
      for (const b of s.bots) members.appendChild(h('div', { class: 'member' }, avatar({ username: b.name }, 34), h('div', { class: 'm-meta' }, h('div', { class: 'm-name' }, b.name, h('span', { class: 'botpill' }, 'BOT')), h('div', { class: 'm-sub' }, b.ai ? 'IA ativa' : 'bot'))));
    }
    updateShellCols();
  }

  function updateShellCols() {
    const showMembers = app.view === 'server' && members.style.display !== 'none';
    shell.classList.toggle('with-members', showMembers);
    shell.classList.toggle('no-sidebar', false);
  }

  // ---------- permissions helper ----------
  function hasPerm(server, permName) {
    if (!server) return false;
    const me = server.members.find((m) => m.userId === state.me.id);
    if (!me) return false;
    if (me.isOwner) return true;
    const bit = state.perms[permName];
    const ADMIN = state.perms.ADMIN;
    if (me.perms & ADMIN) return true;
    return (me.perms & bit) === bit;
  }
  app.hasPerm = hasPerm;

  // ---------- modals: create server/channel, server menu, member menu ----------
  function openCreateServer() {
    const name = h('input', { class: 'input', placeholder: 'Nome do servidor' });
    modal({
      title: 'Criar servidor',
      body: h('div', {}, h('div', { class: 'field' }, h('label', {}, 'Nome'), name), h('p', { class: 'muted', style: { fontSize: '12px' } }, 'Um espaço pra sua comunidade. Você poderá criar canais e cargos depois.')),
      actions: [{ label: 'Criar', primary: true, onClick: async (close) => {
        try { const { server } = await api.post('/api/servers', { name: name.value }); await app.loadServers(); close(); await app.openServer(server.id); toast('Servidor criado', 'success'); }
        catch (e) { toast(e.message, 'error'); }
      } }],
    });
    setTimeout(() => name.focus(), 50);
  }

  function openCreateChannel(s, type) {
    const name = h('input', { class: 'input', placeholder: 'novo-canal' });
    const sel = h('select', { class: 'select' },
      h('option', { value: 'text', selected: type === 'text' }, 'Texto'),
      h('option', { value: 'voice', selected: type === 'voice' }, 'Voz'),
      h('option', { value: 'forum', selected: type === 'forum' }, 'Fórum'));
    modal({ title: 'Criar canal', body: h('div', {}, h('div', { class: 'field' }, h('label', {}, 'Nome'), name), h('div', { class: 'field' }, h('label', {}, 'Tipo'), sel)),
      actions: [{ label: 'Criar', primary: true, onClick: async (close) => { try { await api.post(`/api/servers/${s.id}/channels`, { name: name.value, type: sel.value }); close(); } catch (e) { toast(e.message, 'error'); } } }] });
    setTimeout(() => name.focus(), 50);
  }

  function openServerMenu(s) {
    const items = [];
    items.push(menuRow('plus', 'Criar canal', () => openCreateChannel(s, 'text')));
    if (hasPerm(s, 'MANAGE_ROLES') || hasPerm(s, 'MANAGE_SERVER')) items.push(menuRow('shield', 'Cargos & permissões', () => openServerSettings(app, s)));
    items.push(menuRow('link', 'Convidar (copiar ID)', () => { navigator.clipboard?.writeText(s.id); toast('ID do servidor copiado', 'success'); }));
    items.push(menuRow('flame', `Impulsionar servidor (nível ${s.boostLevel || 0} · ${s.boosts || 0} impulsos)`, async () => {
      try { const r = await api.post(`/api/servers/${s.id}/boost`); toast('Servidor impulsionado! Total: ' + r.boosts, 'success'); }
      catch (e) { toast(e.message, 'error'); }
    }));
    items.push(menuRow('bot', 'Adicionar bot', () => { app.view = 'bots'; renderRail(); renderSidebar(); renderMain(); }));
    if (s.ownerId !== state.me.id) items.push(menuRow('logout', 'Sair do servidor', async () => { if (await confirmDialog({ title: 'Sair', message: 'Sair de ' + s.name + '?', confirmLabel: 'Sair' })) { await api.post(`/api/servers/${s.id}/leave`); await app.loadServers(); app.goHome(); } }));
    modal({ title: s.name, body: h('div', { class: 'col gap-4' }, items) });
  }

  function menuRow(ic, label, onClick) {
    return h('div', { class: 'list-row', style: { cursor: 'pointer' }, onClick: (e) => { const c = e.currentTarget.closest('.modal-overlay'); onClick(); if (c) { c.classList.add('out'); setTimeout(() => c.remove(), 150); } } },
      h('span', { class: 'ico', html: icon(ic, 18) }), h('div', { class: 'lr-main' }, h('div', { class: 'lr-title' }, label)));
  }

  function openMemberMenu(s, m) {
    if (m.userId === state.me.id) return;
    const rows = [];
    rows.push(menuRow('user', 'Ver perfil', () => openProfile(m.userId, app)));
    const canRoles = hasPerm(s, 'MANAGE_ROLES');
    if (canRoles) rows.push(menuRow('shield', 'Gerenciar cargos', () => openAssignRoles(s, m)));
    if (hasPerm(s, 'MUTE')) rows.push(menuRow('micOff', m.muted ? 'Remover silêncio' : 'Silenciar', async () => { await api.post(`/api/servers/${s.id}/members/${m.userId}/mute`); }));
    if (hasPerm(s, 'KICK')) rows.push(menuRow('logout', 'Expulsar', async () => { if (await confirmDialog({ title: 'Expulsar', message: `Expulsar ${m.username}?`, confirmLabel: 'Expulsar' })) await api.post(`/api/servers/${s.id}/members/${m.userId}/kick`); }));
    if (hasPerm(s, 'BAN')) rows.push(menuRow('ban', 'Banir', async () => { if (await confirmDialog({ title: 'Banir', message: `Banir ${m.username}?`, confirmLabel: 'Banir' })) await api.post(`/api/servers/${s.id}/members/${m.userId}/ban`, { reason: 'banido por moderador' }); }));
    rows.push(menuRow('video', 'Chamar em vídeo', () => app.call.start(m.userId, m.username)));
    if (!rows.length) { toast('Sem ações disponíveis', 'info'); return; }
    modal({ title: m.username + ' #' + m.tag, body: h('div', { class: 'col gap-4' }, rows) });
  }

  function openAssignRoles(s, m) {
    const assignable = s.roles.filter((r) => r.id !== s.id);
    const selected = new Set(m.roles || []);
    const body = h('div', { class: 'col gap-8' }, assignable.length ? assignable.map((r) => {
      const tg = h('div', { class: 'toggle' + (selected.has(r.id) ? ' on' : '') });
      tg.addEventListener('click', () => { if (selected.has(r.id)) selected.delete(r.id); else selected.add(r.id); tg.classList.toggle('on'); });
      return h('div', { class: 'perm-toggle' }, h('span', { class: 'role-pill', style: { color: r.color } }, h('span', { class: 'role-dot', style: { background: r.color } }), r.name), tg);
    }) : h('p', { class: 'muted' }, 'Crie cargos primeiro nas configurações do servidor.'));
    modal({ title: 'Cargos de ' + m.username, body, actions: [{ label: 'Salvar', primary: true, onClick: async (close) => { await api.post(`/api/servers/${s.id}/members/${m.userId}/roles`, { roles: [...selected] }); close(); } }] });
  }

  // ---------- voice ----------
  app.joinVoice = (ch) => {
    if (app.voiceChannelId === ch.id) return;
    if (app.voiceChannelId) emitS('voice:leave', app.voiceChannelId);
    app.voiceChannelId = ch.id;
    emitS('voice:join', ch.id);
    toast('Entrou na voz: ' + ch.name, 'info');
    sfx.open();
  };

  // ---------- socket events ----------
  onS('message:new', (m) => {
    if (state.currentChannel && m.channelId === state.currentChannel.id) {
      const list = document.getElementById('msglist');
      if (list) {
        const msgs = app._messages || [];
        const last = msgs[msgs.length - 1];
        const grouped = last && last.author.id === m.author.id && (m.ts - last.ts) < 5 * 60000;
        msgs.push(m); app._messages = msgs;
        const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 120;
        list.appendChild(messageEl(m, grouped));
        if (nearBottom) list.scrollTop = list.scrollHeight;
        if (m.author.id !== state.me.id) sfx.message();
      }
    }
  });
  onS('server:update', (detail) => {
    if (state.currentServer && detail.id === state.currentServer.id) {
      const curCh = state.currentChannel;
      state.currentServer = detail;
      if (curCh && !detail.channels.find((c) => c.id === curCh.id)) { const t = detail.channels.find((c) => c.type === 'text'); if (t) app.openChannel(t); }
      renderServerSidebarSafe();
      renderMembers();
    }
  });
  onS('dm:message', ({ dmKey, message }) => {
    if (state.currentDM && state.currentDM.dmKey === dmKey) {
      const list = document.getElementById('msglist');
      if (list) {
        const msgs = app._dmMessages || [];
        const last = msgs[msgs.length - 1];
        const grouped = last && last.author.id === message.author.id && (message.ts - last.ts) < 5 * 60000;
        msgs.push(message); app._dmMessages = msgs;
        const near = list.scrollHeight - list.scrollTop - list.clientHeight < 120;
        list.appendChild(messageEl(message, grouped));
        if (near) list.scrollTop = list.scrollHeight;
        if (message.author.id !== state.me.id) sfx.message();
      }
    }
    if (app.view !== 'server') app._refreshDMList && app._refreshDMList();
  });
  onS('friend:presence', (p) => { if (app.view === 'friends') renderMain(); });
  onS('notify', (n) => { toast(n.text, n.kind === 'friend_accepted' ? 'success' : 'info'); sfx.notify(); app.refreshNotifs(); if (app.view === 'friends' && app._friendsRefresh) app._friendsRefresh(); });
  onS('friend:request', () => { app.refreshNotifs(); if (app.view === 'friends' && app._friendsRefresh) app._friendsRefresh(); });
  onS('friend:accepted', () => { app.refreshNotifs(); if (app.view === 'friends' && app._friendsRefresh) app._friendsRefresh(); });
  onS('voice:peers', (peers) => {
    // peers belong to whichever voice channel we're in
    if (app.voiceChannelId) { app._voicePeers[app.voiceChannelId] = peers; const c = document.getElementById('voice-' + app.voiceChannelId); if (c) renderVoiceMembers(app.voiceChannelId, c); }
  });
  call.bindSocket();

  function renderServerSidebarSafe() { if (app.view === 'server') renderSidebar(); }
  app.renderRail = renderRail; app.renderSidebar = renderSidebar; app.renderMain = renderMain; app.renderMembers = renderMembers;

  // ---------- mobile ----------
  const mobileBar = h('div', { class: 'mobile-bar' },
    iconBtn('grid', { title: 'Menu', onClick: () => { shell.classList.toggle('nav-open'); toggleScrim(); } }),
    h('span', { style: { fontFamily: 'var(--font-display)', letterSpacing: '2px' } }, 'ORBIT'));
  let scrim = null;
  function toggleScrim() {
    if (shell.classList.contains('nav-open')) { scrim = h('div', { class: 'scrim', onClick: () => { shell.classList.remove('nav-open'); scrim?.remove(); } }); shell.appendChild(scrim); }
    else scrim?.remove();
  }
  shell.appendChild(mobileBar); // fixed overlay button; persists across re-renders

  // ---------- status automático (online / ausente) ----------
  function startStatusAutoDetect() {
    let last = Date.now();
    let current = state.me.status || 'online';
    const evaluate = () => {
      let s = 'online';
      if (document.hidden || !document.hasFocus()) s = 'idle';
      else if (Date.now() - last > 5 * 60000) s = 'idle';
      if (s !== current) { current = s; state.me.status = s; emitS('status:set', s); if (app.view !== 'server') renderSidebar(); }
    };
    const bump = () => { last = Date.now(); if (current !== 'online') evaluate(); };
    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'].forEach((ev) => window.addEventListener(ev, bump, { passive: true }));
    document.addEventListener('visibilitychange', evaluate);
    window.addEventListener('blur', evaluate);
    window.addEventListener('focus', bump);
    setInterval(evaluate, 30000);
    evaluate();
  }

  // ---------- desktop: detecção automática de jogo ----------
  if (window.orbitDesktop && window.orbitDesktop.onGame) {
    window.orbitDesktop.onGame((game) => {
      emitS('activity:set', game || null);
      state.me.playing = game || null;
      if (game) toast('Detectado: jogando ' + game, 'info');
      if (app.view === 'friends') renderMain();
    });
  }

  // ---------- boot data ----------
  await app.loadPerms();
  await app.loadServers();
  app.refreshNotifs();
  startStatusAutoDetect();
  renderRail();
  app.goHome('friends');

  // Modo de teste: cria os "amigos bots" que aceitam chamada automaticamente
  if (window.__ORBIT_TEST__ || new URLSearchParams(location.search).get('test') === '1') {
    import('./testpeer.js').then((m) => m.startTestPeer(state.me)).catch((e) => console.warn('testpeer', e));
  }
}
