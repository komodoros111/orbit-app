import { icon } from './icons.js';
import { sfx } from './sound.js';

// Hyperscript-ish element builder.
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return el;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }
export function $(sel, root = document) { return root.querySelector(sel); }
export function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function initials(name) { return (name || '?').trim().slice(0, 2).toUpperCase(); }

// Avatar (foto de perfil ou iniciais)
export function avatar(user, size = 36) {
  const a = h('div', { class: 'avatar', style: { width: size + 'px', height: size + 'px', fontSize: size * 0.36 + 'px' } });
  if (user && user.avatar) {
    a.style.backgroundImage = `url(${user.avatar})`;
    a.classList.add('has-img');
  } else {
    a.textContent = initials(user ? user.username : '?');
  }
  return a;
}

// Toast
let toastWrap;
export function toast(message, type = 'info') {
  if (localStorage.getItem('orbit.toasts') === '0' && type === 'info') return;
  if (!toastWrap) { toastWrap = h('div', { class: 'toast-wrap' }); document.body.appendChild(toastWrap); }
  const t = h('div', { class: 'toast toast-' + type },
    h('span', { class: 'ico', html: icon(type === 'error' ? 'close' : type === 'success' ? 'check' : 'bell', 16) }),
    h('span', {}, message));
  toastWrap.appendChild(t);
  if (type === 'error') sfx.error(); else if (type === 'success') sfx.success();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3200);
}

// Modal
export function modal({ title, body, actions = [], wide = false, onClose }) {
  const overlay = h('div', { class: 'modal-overlay anim-fade' });
  const close = () => { sfx.close(); overlay.classList.add('out'); setTimeout(() => overlay.remove(), 200); onClose && onClose(); };
  const head = h('div', { class: 'modal-head' },
    h('h3', {}, title || ''),
    h('button', { class: 'icon-btn', onClick: close, html: icon('close', 18) }));
  const footer = actions.length
    ? h('div', { class: 'modal-foot' }, actions.map((a) =>
        h('button', { class: 'btn ' + (a.primary ? 'btn-primary' : ''), onClick: () => a.onClick && a.onClick(close) }, a.label)))
    : null;
  const box = h('div', { class: 'modal-box card ticks' + (wide ? ' wide' : '') }, head, h('div', { class: 'modal-body' }, body), footer);
  overlay.appendChild(box);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);
  sfx.open();
  return { overlay, close };
}

export function confirmDialog({ title, message, confirmLabel = 'Confirmar', danger = false }) {
  return new Promise((resolve) => {
    const m = modal({
      title,
      body: h('p', { class: 'muted' }, message),
      actions: [
        { label: 'Cancelar', onClick: (c) => { c(); resolve(false); } },
        { label: confirmLabel, primary: true, onClick: (c) => { c(); resolve(true); } },
      ],
    });
  });
}

// pequeno botão de ícone
export function iconBtn(name, opts = {}) {
  return h('button', { class: 'icon-btn ' + (opts.class || ''), title: opts.title || '', onClick: opts.onClick, html: icon(name, opts.size || 18) });
}

// sons em hover/click para qualquer botão .btn
export function wireSfx(root = document) {
  root.addEventListener('click', (e) => { if (e.target.closest('.btn, .icon-btn, .rail-item, .channel')) sfx.click(); }, true);
}
