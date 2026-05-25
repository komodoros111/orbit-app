import { getToken, BASE, SAME_ORIGIN } from './config.js';

// O cliente socket.io é servido pelo backend em /socket.io/socket.io.js.
// Carregamos a partir de BASE (suporta backend em outra origem, ex.: SPA na Vercel).
let sock = null;
let clientPromise = null;

export function ensureSocketClient() {
  if (window.io) return Promise.resolve();
  if (clientPromise) return clientPromise;
  clientPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = BASE + '/socket.io/socket.io.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Falha ao carregar o cliente socket.io de ' + BASE));
    document.head.appendChild(s);
  });
  return clientPromise;
}

export function connectSocket() {
  if (sock && sock.connected) return sock;
  if (!window.io) { console.warn('socket.io client não carregado'); return null; }
  const opts = { auth: { token: getToken() }, transports: ['websocket', 'polling'] };
  sock = SAME_ORIGIN ? window.io(opts) : window.io(BASE, opts);
  return sock;
}

export function socket() { return sock; }
export function emitS(...args) { if (sock) sock.emit(...args); }
export function onS(ev, cb) { if (sock) sock.on(ev, cb); }
export function offS(ev, cb) { if (sock) sock.off(ev, cb); }
export function disconnectSocket() { if (sock) { sock.disconnect(); sock = null; } }
