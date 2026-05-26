import { h, clear, avatar, toast, escapeHtml, confirmDialog, modal } from '../ui.js';
import { icon } from '../icons.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { emitS } from '../socket.js';
import { openProfile } from './profile.js';

export function renderFriends(app) {
  const page = h('div', { class: 'friends-page' });
  const inner = h('div', { class: 'page-inner' });
  page.appendChild(inner);
  const me = state.me;

  if (!app.friendsTab) app.friendsTab = 'all';
  const tabsBar = h('div', { class: 'tabs' });
  const body = h('div', { class: 'anim-fade' });

  const pendBadge = h('span', { class: 'nav-badge', style: { display: 'none' } });
  const tabsDef = [['all', 'Amigos', null], ['pending', 'Pendentes', pendBadge], ['add', 'Adicionar amigo', null]];
  function setTab(t) { app.friendsTab = t; [...tabsBar.children].forEach((c, i) => c.classList.toggle('active', tabsDef[i][0] === t)); renderTab(); }
  tabsDef.forEach(([id, label, badge]) => tabsBar.appendChild(h('div', { class: 'tab' + (id === app.friendsTab ? ' active' : '') , onClick: () => setTab(id) }, label, badge || '')));

  inner.append(
    h('h1', { class: 'page-title' }, 'Amigos'),
    h('p', { class: 'page-sub' }, 'Quem está online, o que estão jogando e seus pedidos.'),
    tabsBar, body);

  function renderTab() {
    clear(body);
    if (app.friendsTab === 'all') body.appendChild(allTab());
    else if (app.friendsTab === 'pending') body.appendChild(pendingTab());
    else body.appendChild(addTab());
  }

  // ---------- ALL (amigos + atividade) ----------
  function allTab() {
    const wrap = h('div', {});
    // atividade detectada automaticamente
    const detected = me.playing
      ? h('div', { class: 'detected-badge live' }, h('span', { class: 'ico', html: icon('gamepad', 16) }), 'Jogando ', h('b', {}, me.playing))
      : h('div', { class: 'detected-badge' }, h('span', { class: 'ico', html: icon('gamepad', 16) }), 'Nenhum jogo detectado');
    app._activityBadge = detected; // app atualiza quando detecta

    const detectNote = window.orbitDesktop
      ? h('p', { class: 'muted', style: { fontSize: '12px', marginTop: '10px' } }, 'O Orbit detecta automaticamente o jogo aberto no seu PC e mostra pros seus amigos no banner de atividade.')
      : h('p', { class: 'muted', style: { fontSize: '12px', marginTop: '10px' } }, 'A detecção automática de jogo funciona no app desktop do Orbit. No navegador, defina apenas seu jogo favorito.');

    const gameSelect = h('select', { class: 'select' }, h('option', { value: '' }, 'Jogo favorito…'));
    api.get('/api/games').then(({ games }) => { for (const g of games) gameSelect.appendChild(h('option', { value: g.name, selected: me.favoriteGame === g.name }, g.name)); }).catch(() => {});
    gameSelect.addEventListener('change', async () => { try { await api.patch('/api/me', { favoriteGame: gameSelect.value }); me.favoriteGame = gameSelect.value; toast('Jogo favorito salvo', 'success'); } catch (e) { toast(e.message, 'error'); } });

    wrap.appendChild(h('div', { class: 'section-card' },
      h('h3', {}, 'Sua atividade'),
      h('p', { class: 'desc' }, 'Detectada automaticamente — aparece pros seus amigos em tempo real.'),
      detected,
      detectNote,
      h('div', { class: 'field', style: { marginTop: '16px' } }, h('label', {}, 'Jogo favorito'), gameSelect)));

    const listCard = h('div', { class: 'section-card' }, h('h3', {}, 'Sua lista'), h('div', { id: 'flist' }, h('p', { class: 'muted' }, 'Carregando…')));
    wrap.appendChild(listCard);
    loadFriends(listCard.querySelector('#flist'));
    return wrap;
  }

  async function loadFriends(box) {
    try {
      const { friends } = await api.get('/api/friends');
      clear(box);
      if (!friends.length) { box.appendChild(h('p', { class: 'muted' }, 'Você ainda não tem amigos. Vá em "Adicionar amigo".')); return; }
      friends.sort((a, b) => (b.status !== 'offline') - (a.status !== 'offline'));
      for (const f of friends) {
        const dotCls = f.status === 'offline' ? 'offline' : 'online';
        box.appendChild(h('div', { class: 'activity-card hover-lift' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, cursor: 'pointer' }, onClick: () => openProfile(f.id, app) },
            h('div', { style: { position: 'relative' } }, avatar(f, 44), h('span', { class: 'dot ' + dotCls, style: { position: 'absolute', right: '-2px', bottom: '-2px' } })),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontWeight: 600 } }, f.username, f.pulsar ? h('span', { class: 'ico pulsar-mark', html: icon('sparkle', 12) }) : '', h('span', { class: 'mono muted', style: { fontSize: '11px', marginLeft: '6px' } }, '#' + f.tag)),
              f.playing ? h('div', { class: 'playing', html: icon('gamepad', 13) + ' Jogando <b style="color:#fff">' + escapeHtml(f.playing) + '</b>' })
                : h('div', { class: 'playing muted' }, f.status === 'offline' ? 'Offline' : (f.favoriteGame ? 'Curte ' + escapeHtml(f.favoriteGame) : 'Online')))),
          h('button', { class: 'icon-btn', title: 'Chamar', html: icon('video', 18), onClick: () => app.call.start(f.id, f.username) }),
          h('button', { class: 'icon-btn', title: 'Mais', html: icon('chevron', 16), onClick: () => openFriendMenu(f) })));
      }
    } catch (e) { clear(box); box.appendChild(h('p', { class: 'muted' }, 'Erro ao carregar amigos.')); }
  }

  // ---------- PENDING ----------
  function pendingTab() {
    const wrap = h('div', { id: 'pending-wrap' }, h('p', { class: 'muted' }, 'Carregando…'));
    loadPending(wrap);
    return wrap;
  }
  async function loadPending(wrap) {
    try {
      const { incoming, outgoing } = await api.get('/api/friends/requests');
      app.setNotif(incoming.length);
      clear(wrap);
      const inCard = h('div', { class: 'section-card' }, h('h3', {}, 'Recebidos — ' + incoming.length));
      if (!incoming.length) inCard.appendChild(h('p', { class: 'muted' }, 'Nenhum pedido recebido.'));
      for (const r of incoming) inCard.appendChild(h('div', { class: 'list-row hover-lift' },
        avatar(r.user, 40),
        h('div', { class: 'lr-main' }, h('div', { class: 'lr-title' }, r.user.username, h('span', { class: 'mono muted', style: { fontSize: '11px', marginLeft: '6px' } }, '#' + r.user.tag)), h('div', { class: 'lr-sub' }, 'quer ser seu amigo')),
        h('button', { class: 'btn btn-sm btn-primary', html: icon('check', 14) + '<span>Aceitar</span>', onClick: async () => { await api.post(`/api/friends/requests/${r.id}/accept`); toast('Amizade aceita', 'success'); refreshAll(); } }),
        h('button', { class: 'btn btn-sm', html: icon('close', 14), title: 'Recusar', onClick: async () => { await api.post(`/api/friends/requests/${r.id}/decline`); refreshAll(); } })));
      wrap.appendChild(inCard);

      const outCard = h('div', { class: 'section-card' }, h('h3', {}, 'Enviados — ' + outgoing.length));
      if (!outgoing.length) outCard.appendChild(h('p', { class: 'muted' }, 'Nenhum pedido enviado.'));
      for (const r of outgoing) outCard.appendChild(h('div', { class: 'list-row' },
        avatar(r.user, 40),
        h('div', { class: 'lr-main' }, h('div', { class: 'lr-title' }, r.user.username, h('span', { class: 'mono muted', style: { fontSize: '11px', marginLeft: '6px' } }, '#' + r.user.tag)), h('div', { class: 'lr-sub' }, 'aguardando resposta')),
        h('button', { class: 'btn btn-sm', html: icon('close', 14) + '<span>Cancelar</span>', onClick: async () => { await api.post(`/api/friends/requests/${r.id}/decline`); refreshAll(); } })));
      wrap.appendChild(outCard);
    } catch (e) { clear(wrap); wrap.appendChild(h('p', { class: 'muted' }, 'Erro ao carregar pedidos.')); }
  }

  function refreshAll() { renderTab(); app.refreshNotifs(); }

  function menuRow(ic, label, onClick) {
    return h('div', { class: 'list-row', style: { cursor: 'pointer' }, onClick: (e) => { const ov = e.currentTarget.closest('.modal-overlay'); onClick(); if (ov) { ov.classList.add('out'); setTimeout(() => ov.remove(), 150); } } },
      h('span', { class: 'ico', html: icon(ic, 18) }), h('div', { class: 'lr-main' }, h('div', { class: 'lr-title' }, label)));
  }
  function openFriendMenu(f) {
    modal({ title: f.username + ' #' + f.tag, body: h('div', { class: 'col gap-4' },
      menuRow('user', 'Ver perfil', () => openProfile(f.id, app)),
      menuRow('video', 'Chamar', () => app.call.start(f.id, f.username)),
      menuRow('ban', 'Bloquear', async () => { if (await confirmDialog({ title: 'Bloquear', message: 'Bloquear ' + f.username + '? Vocês deixam de ser amigos e ele não poderá te adicionar.', confirmLabel: 'Bloquear' })) { await api.post('/api/friends/' + f.id + '/block'); toast(f.username + ' bloqueado', 'info'); refreshAll(); } }),
      menuRow('trash', 'Apagar amizade', async () => { if (await confirmDialog({ title: 'Apagar amizade', message: 'Remover ' + f.username + ' dos amigos?', confirmLabel: 'Apagar' })) { await api.del('/api/friends/' + f.id); refreshAll(); } }),
    ) });
  }

  // ---------- ADD ----------
  function addTab() {
    const input = h('input', { class: 'input', placeholder: 'Digite um nome de usuário' });
    const status = h('div', {});
    const send = async () => {
      status.replaceChildren();
      try {
        const r = await api.post('/api/friends/request', { username: input.value });
        input.value = '';
        if (r.status === 'accepted') { toast('Vocês já são amigos agora', 'success'); }
        else { toast('Pedido de amizade enviado', 'success'); }
        status.appendChild(h('p', { class: 'ok-msg' }, r.status === 'accepted' ? 'Amizade criada!' : 'Pedido enviado com sucesso.'));
      } catch (e) { status.appendChild(h('div', { class: 'form-err' }, e.message)); }
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    return h('div', { class: 'section-card' },
      h('h3', {}, 'Adicionar amigo'),
      h('p', { class: 'desc' }, 'Digite o nome de usuário da pessoa (o nome que ela escolheu). Se houver mais de uma, use nome#0000.'),
      h('div', { class: 'row gap-8' }, h('div', { style: { flex: 1 } }, input),
        h('button', { class: 'btn btn-primary', html: icon('users', 16) + '<span>Enviar pedido</span>', onClick: send })),
      status,
      h('p', { class: 'muted mono', style: { marginTop: '12px', fontSize: '12px' } }, 'Seu identificador: ' + me.username + '#' + me.tag));
  }

  // expose refresh of pending count for this view
  app._friendsRefresh = () => { if (app.view === 'friends') renderTab(); };
  renderTab();
  // keep the pending badge in sync
  app.refreshNotifs().then(() => { if (app.pendingIn > 0) { pendBadge.textContent = app.pendingIn; pendBadge.style.display = ''; } });
  return page;
}
