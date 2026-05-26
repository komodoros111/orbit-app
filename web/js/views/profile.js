import { h, modal, avatar, toast, escapeHtml } from '../ui.js';
import { icon } from '../icons.js';
import { api } from '../api.js';
import { BASE } from '../config.js';
import { state } from '../state.js';

// "capa" estilizada determinística pro jogo (P&B) — sem depender de arte externa
function gameCover(name) {
  let hsh = 0; for (let i = 0; i < name.length; i++) hsh = (hsh * 31 + name.charCodeAt(i)) >>> 0;
  const a = 8 + (hsh % 14), b = 22 + ((hsh >> 4) % 20), ang = hsh % 360;
  return `linear-gradient(${ang}deg, rgb(${a},${a},${a}), rgb(${b},${b},${b}))`;
}
function bannerStyle(banner) {
  if (!banner) return 'background: radial-gradient(circle at 70% 30%, #232323, #0a0a0a 70%);';
  if (banner.startsWith('data:') || banner.startsWith('http')) return `background-image:url(${banner});background-size:cover;background-position:center;`;
  if (banner.startsWith('/')) return `background-image:url(${BASE + banner});background-size:cover;background-position:center;`;
  return `background:${banner};`;
}

export async function openProfile(userId, app) {
  let u;
  try { u = (await api.get('/api/users/' + userId)).user; } catch (e) { toast(e.message, 'error'); return; }

  const card = h('div', { class: 'profile-card' },
    h('div', { class: 'pc-banner', style: bannerStyle(u.banner) }),
    h('div', { class: 'pc-avatar', style: { position: 'relative' } }, avatar(u, 84),
      h('span', { class: 'dot ' + (u.online ? (u.status || 'online') : 'offline'), style: { position: 'absolute', right: '4px', bottom: '4px' } })),
    h('div', { class: 'pc-body' },
      h('div', { class: 'pc-name' }, u.username,
        u.pulsar ? h('span', { class: 'ico pulsar-mark', title: 'Pulsar', html: icon('sparkle', 16) }) : '',
        u.serverTag ? h('span', { class: 'server-tag' }, u.serverTag) : ''),
      h('div', { class: 'pc-handle mono' }, '@' + u.username.toLowerCase().replace(/\s+/g, '') + ' · #' + u.tag),
      u.badges && u.badges.length ? h('div', { class: 'pc-badges' }, u.badges.map((b) =>
        h('span', { class: 'badge-chip', title: b.label }, h('span', { class: 'ico', html: icon(b.icon || 'sparkle', 13) }), b.label))) : null,
      u.bio ? h('div', { class: 'pc-section' }, h('div', { class: 'pc-label' }, 'Sobre'), h('div', { class: 'pc-bio' }, u.bio)) : null,
      u.favoriteGame ? h('div', { class: 'pc-section' }, h('div', { class: 'pc-label' }, 'Jogo favorito'),
        h('div', { class: 'game-banner', style: { background: gameCover(u.favoriteGame) } }, h('span', { class: 'ico', html: icon('gamepad', 18) }), h('b', {}, u.favoriteGame))) : null,
      (u.games && u.games.length) ? h('div', { class: 'pc-section' }, h('div', { class: 'pc-label' }, 'Jogos'),
        h('div', { class: 'game-cards' }, u.games.map((g) =>
          h('div', { class: 'game-card', style: { background: gameCover(g) }, title: g }, h('span', { class: 'ico', html: icon('gamepad', 18) }), h('span', { class: 'gc-name' }, g))))) : null,
    ),
  );

  const actions = [];
  if (userId !== state.me.id && app && app.call) actions.push({ label: 'Chamar', primary: true, onClick: (c) => { c(); app.call.start(userId, u.username); } });
  modal({ title: u.username + ' #' + u.tag, body: card, actions });
}
