import { getToken, setToken } from './config.js';
import { api } from './api.js';
import { state, setMe } from './state.js';
import { clear, wireSfx, toast } from './ui.js';
import { icon } from './icons.js';
import { renderLanding } from './views/landing.js';
import { renderAuth } from './views/auth.js';
import { showSplash } from './views/splash.js';
import { mountApp } from './app.js';
import { renderDeviceApproval } from './views/device.js';

const root = document.getElementById('app');
wireSfx(document);
if (localStorage.getItem('orbit.reduceMotion') === '1') document.body.classList.add('reduce-motion');
import('./sound.js').then((m) => m.loadCustomSounds && m.loadCustomSounds());

// Nome do app (muda no modo de teste)
const ORBIT_TEST = !!window.__ORBIT_TEST__;
const BRAND = ORBIT_TEST ? 'ORBIT TESTES' : 'ORBIT';
document.title = ORBIT_TEST ? 'Orbit Testes' : 'Orbit';

// Title bar escura customizada (somente no app desktop frameless)
if (window.orbitDesktop && window.orbitDesktop.win) {
  document.body.classList.add('frameless');
  const tb = document.createElement('div');
  tb.className = 'app-titlebar';
  tb.innerHTML =
    '<div class="tb-left">' + icon('orbit', 16) + '<span>' + BRAND + '</span></div>' +
    '<div class="tb-drag"></div>' +
    '<div class="tb-controls">' +
    '<button class="tb-btn" data-act="min" title="Minimizar">' + icon('minimize', 16) + '</button>' +
    '<button class="tb-btn" data-act="max" title="Maximizar">' + icon('maximize', 14) + '</button>' +
    '<button class="tb-btn close" data-act="close" title="Fechar">' + icon('close', 16) + '</button>' +
    '</div>';
  tb.addEventListener('click', (e) => {
    const b = e.target.closest('.tb-btn'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'min') window.orbitDesktop.win.minimize();
    else if (act === 'max') window.orbitDesktop.win.maximize();
    else if (act === 'close') window.orbitDesktop.win.close();
  });
  document.body.appendChild(tb);
}

const App = {
  root,
  // go to logged-out landing
  showLanding() { clear(root); root.className = 'hud-grid'; root.appendChild(renderLanding(App)); },
  showAuth(mode) { clear(root); root.className = 'hud-grid'; root.appendChild(renderAuth(App, mode)); },
  async onAuthed(token, user, { animate = true } = {}) {
    setToken(token);
    setMe(user);
    const splash = animate ? await showSplash() : null;
    clear(root); root.className = '';
    await mountApp(App, root);     // app monta por baixo da splash
    if (splash) await splash.finish(); // crossfade suave revelando o app
  },
  logout() {
    api.logout();
    state.me = null;
    location.reload();
  },
};

async function boot() {
  // Página de autorização de dispositivo (/device) — fluxo "Entrar com Orbit"
  if (location.pathname.replace(/\/$/, '') === '/device') {
    clear(root); root.className = 'hud-grid';
    root.appendChild(renderDeviceApproval(App));
    return;
  }
  const token = getToken();
  if (!token) { App.showLanding(); return; }
  try {
    const { user } = await api.me();
    await App.onAuthed(token, user, { animate: true });
  } catch (e) {
    setToken(null);
    App.showLanding();
  }
}

boot();
