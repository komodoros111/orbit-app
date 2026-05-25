// Base da API/Socket.
// - Local/desktop: mesma origem (o próprio servidor Orbit serve o SPA).
// - SPA hospedado separadamente (ex.: Vercel): defina window.__ORBIT_API__
//   em /orbit.config.js, ou ?api=, ou um <meta name="orbit-api">.
function resolveBase() {
  const q = new URLSearchParams(location.search).get('api');
  if (q) { try { localStorage.setItem('orbit.api', q); } catch {} return q; }
  if (window.__ORBIT_API__) return window.__ORBIT_API__;
  const meta = document.querySelector('meta[name="orbit-api"]');
  if (meta && meta.content) return meta.content;
  try { const ls = localStorage.getItem('orbit.api'); if (ls) return ls; } catch {}
  return location.origin;
}

export const BASE = resolveBase().replace(/\/$/, '');
export const SAME_ORIGIN = BASE === location.origin;
export const TOKEN_KEY = 'orbit.token';

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }

// Electron expõe window.orbitDesktop via preload (detecção de jogo, etc.)
export const isDesktop = !!window.orbitDesktop;
