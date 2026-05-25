import { h } from '../ui.js';
import { icon } from '../icons.js';
import { sfx } from '../sound.js';
import { idbGet } from '../idb.js';

export function orbitSystem() {
  return h('div', { class: 'orbit-system' },
    h('div', { class: 'core' }),
    h('div', { class: 'orbit-ring r1' }, h('span', { class: 'sat' })),
    h('div', { class: 'orbit-ring r2' }, h('span', { class: 'sat' })),
    h('div', { class: 'orbit-ring r3' }, h('span', { class: 'sat' })),
  );
}

function logoSplash() {
  return h('div', { class: 'splash-inner' },
    h('div', { class: 'splash-logo' },
      h('div', { class: 'orbit-ring r1' }, h('span', { class: 'sat' })),
      h('div', { class: 'orbit-ring r2' }, h('span', { class: 'sat' })),
      h('div', { class: 'orbit-ring r3' }, h('span', { class: 'sat' })),
      h('span', { class: 'splash-mark', html: icon('orbit', 104) })),
    h('div', { class: 'splash-word' }, 'ORBIT'),
    h('div', { class: 'splash-bar' }, h('i')),
  );
}

// Mostra a splash como overlay fixo. Retorna { finish } pra fazer o crossfade
// (o app é montado por baixo enquanto a splash some suavemente).
export async function showSplash() {
  const overlay = h('div', { class: 'splash' });
  document.body.appendChild(overlay);
  let resolveReady; const ready = new Promise((r) => (resolveReady = r));

  let videoBlob = null;
  try { videoBlob = await idbGet('splash:video'); } catch {}

  if (videoBlob) {
    const withSound = localStorage.getItem('orbit.splashSound') === '1';
    const url = URL.createObjectURL(videoBlob);
    const v = h('video', { class: 'splash-video', src: url, autoplay: 'true', playsinline: 'true' });
    v.muted = !withSound;
    overlay.appendChild(v);
    overlay.appendChild(h('div', { class: 'splash-skip', onClick: () => resolveReady() }, 'Pular'));
    const cap = setTimeout(() => resolveReady(), 12000); // teto de 12s
    v.addEventListener('ended', () => { clearTimeout(cap); resolveReady(); });
    v.addEventListener('error', () => { clearTimeout(cap); resolveReady(); });
    try { await v.play(); } catch { v.muted = true; v.play().catch(() => {}); }
  } else {
    overlay.appendChild(logoSplash());
    sfx.boot();
    setTimeout(() => resolveReady(), 2200);
  }

  return {
    async finish() {
      await ready;
      overlay.classList.add('splash-out');
      await new Promise((r) => setTimeout(r, 640));
      overlay.remove();
    },
  };
}
