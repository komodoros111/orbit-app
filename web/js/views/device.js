import { h, clear, toast, modal } from '../ui.js';
import { icon } from '../icons.js';
import { api } from '../api.js';
import { getToken, setToken, isDesktop } from '../config.js';
import { orbitSystem } from './splash.js';

function deviceName() {
  if (window.orbitDesktop && window.orbitDesktop.deviceName) return window.orbitDesktop.deviceName;
  const ua = navigator.userAgent;
  const browser = /Edg/.test(ua) ? 'Edge' : /Chrome/.test(ua) ? 'Chrome' : /Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'Navegador';
  return `${browser} · Web`;
}

// ---- Iniciado a partir da tela de login do app: "Entrar com Orbit" ----
export async function startDeviceLogin(App) {
  let stopped = false;
  let info;
  try {
    info = await api.post('/api/device/start', { device_name: deviceName() });
  } catch (e) { toast('Falha ao iniciar: ' + e.message, 'error'); return; }

  const openSite = () => {
    if (isDesktop && window.orbitDesktop.openExternal) window.orbitDesktop.openExternal(info.verify_url);
    else window.open(info.verify_url, '_blank', 'noopener');
  };
  openSite();

  const codeBig = h('div', { class: 'mono', style: { fontSize: '30px', letterSpacing: '6px', textAlign: 'center', padding: '14px', border: '1px solid var(--line-2)', borderRadius: '10px', margin: '8px 0 4px' } }, info.user_code);
  const status = h('p', { class: 'muted', style: { textAlign: 'center' } }, 'Aguardando aprovação no site…');
  const spin = h('span', { class: 'ico', style: { display: 'inline-block', animation: 'spin 1.2s linear infinite' }, html: icon('orbit', 22) });

  const m = modal({
    title: 'Entrar com Orbit',
    body: h('div', { class: 'col', style: { alignItems: 'center', gap: '6px' } },
      h('div', { class: 'center', style: { padding: '6px' } }, spin),
      h('p', { class: 'muted', style: { textAlign: 'center' } }, 'Abrimos o site no seu navegador. Confirme o código abaixo e autorize este dispositivo.'),
      codeBig, status),
    actions: [
      { label: 'Abrir site de novo', onClick: () => openSite() },
      { label: 'Cancelar', onClick: (close) => { stopped = true; close(); } },
    ],
    onClose: () => { stopped = true; },
  });

  const interval = (info.interval || 2) * 1000;
  async function poll() {
    if (stopped) return;
    try {
      const r = await api.post('/api/device/poll', { device_code: info.device_code });
      if (stopped) return;
      if (r.status === 'approved') {
        m.close();
        setToken(r.token);
        toast('Dispositivo autorizado', 'success');
        await App.onAuthed(r.token, r.user, { animate: true });
        return;
      }
      if (r.status === 'denied') { status.textContent = 'Acesso negado no site.'; setTimeout(() => m.close(), 1500); return; }
      if (r.status === 'expired') { status.textContent = 'Código expirado. Tente de novo.'; setTimeout(() => m.close(), 1500); return; }
    } catch (e) { /* keep trying */ }
    setTimeout(poll, interval);
  }
  setTimeout(poll, interval);
}

// ---- Página /device: aprovação no site ----
export function renderDeviceApproval(App) {
  const params = new URLSearchParams(location.search);
  const code = (params.get('code') || '').toUpperCase();
  const wrap = h('div', { class: 'auth-form-side', style: { minHeight: '100vh' } });
  const cardHost = h('div', { class: 'auth-card anim-rise' });
  wrap.appendChild(cardHost);

  const shell = h('div', { class: 'auth-wrap' },
    h('div', { class: 'auth-art' },
      h('div', { class: 'orbit-anim' }, orbitSystem()),
      h('div', { class: 'brand' }, h('span', { class: 'ico', html: icon('orbit', 28) }), 'ORBIT'),
      h('div', { class: 'pitch' }, h('h2', {}, 'Autorização de dispositivo'), h('p', { class: 'muted' }, 'Aprove com segurança o acesso à sua conta.'))),
    wrap);

  function header() {
    return h('div', {}, h('h1', {}, 'Entrar com Orbit'),
      h('p', { class: 'sub' }, code ? ('Código: ' + code) : 'Sem código na URL.'));
  }

  async function route() {
    clear(cardHost);
    cardHost.appendChild(header());
    if (!code) { cardHost.appendChild(h('p', { class: 'muted' }, 'Link inválido — abra a partir do app.')); return; }
    if (!getToken()) return renderLogin();
    // logged in: try to fetch device info
    try {
      const { device_name } = await api.get('/api/device/info?code=' + encodeURIComponent(code));
      const { user } = await api.me();
      renderApprove(device_name, user);
    } catch (e) {
      if (e.status === 401) { setToken(null); return renderLogin(); }
      cardHost.appendChild(h('div', { class: 'form-err' }, e.message));
    }
  }

  function renderLogin() {
    const email = h('input', { class: 'input', type: 'email', placeholder: 'voce@email.com' });
    const password = h('input', { class: 'input', type: 'password', placeholder: '••••••••' });
    const err = h('div', { class: 'form-err hidden' });
    const btn = h('button', { class: 'btn btn-primary btn-block', html: icon('logout', 16) + '<span>Entrar para autorizar</span>' });
    async function go() {
      err.classList.add('hidden'); btn.disabled = true;
      try { const r = await api.login({ email: email.value, password: password.value }); setToken(r.token); route(); }
      catch (e2) { err.textContent = e2.message; err.classList.remove('hidden'); btn.disabled = false; }
    }
    btn.addEventListener('click', go);
    [email, password].forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); }));
    cardHost.append(
      h('p', { class: 'muted', style: { marginBottom: '16px' } }, 'Entre na sua conta para autorizar o dispositivo.'),
      err,
      h('div', { class: 'field' }, h('label', {}, 'E-mail'), email),
      h('div', { class: 'field' }, h('label', {}, 'Senha'), password),
      btn);
  }

  function renderApprove(deviceLabel, user) {
    const result = h('div');
    const allow = h('button', { class: 'btn btn-primary btn-block', html: icon('check', 16) + '<span>Permitir</span>' });
    const deny = h('button', { class: 'btn btn-block', html: icon('close', 16) + '<span>Negar</span>' });
    allow.addEventListener('click', async () => {
      allow.disabled = deny.disabled = true;
      try { await api.post('/api/device/approve', { code }); done(true); } catch (e) { result.replaceChildren(h('div', { class: 'form-err' }, e.message)); }
    });
    deny.addEventListener('click', async () => {
      allow.disabled = deny.disabled = true;
      try { await api.post('/api/device/deny', { code }); done(false); } catch (e) { /* ignore */ done(false); }
    });
    function done(ok) {
      clear(cardHost);
      cardHost.append(
        header(),
        h('div', { class: 'center', style: { padding: '20px 0' } }, h('span', { class: 'ico', style: { width: '56px', height: '56px', color: 'var(--white)' }, html: icon(ok ? 'check' : 'close', 56) })),
        h('h3', { style: { textAlign: 'center' } }, ok ? 'Dispositivo autorizado' : 'Acesso negado'),
        h('p', { class: 'muted', style: { textAlign: 'center' } }, ok ? 'Pronto! Volte ao app — ele já vai entrar automaticamente.' : 'O dispositivo não foi autorizado.'));
    }
    cardHost.append(
      h('div', { class: 'card ticks', style: { padding: '18px', margin: '6px 0 18px', textAlign: 'center' } },
        h('div', { class: 'center', style: { marginBottom: '10px' } }, h('span', { class: 'ico', style: { width: '34px', height: '34px' }, html: icon('gamepad', 34) })),
        h('div', { style: { fontWeight: 700, fontSize: '15px' } }, deviceLabel),
        h('div', { class: 'mono muted', style: { fontSize: '12px', marginTop: '4px' } }, code)),
      h('p', { style: { textAlign: 'center', marginBottom: '16px' } }, 'Deseja permitir que ', h('b', {}, '“' + deviceLabel + '”'), ' entre na sua conta ', h('b', {}, user.username + '#' + user.tag), '?'),
      allow, h('div', { style: { height: '8px' } }), deny, result);
  }

  route();
  return shell;
}
