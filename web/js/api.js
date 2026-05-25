import { BASE, getToken, setToken } from './config.js';

export async function uploadFile(file) {
  const token = getToken();
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(BASE + '/api/upload', {
    method: 'POST',
    headers: token ? { authorization: 'Bearer ' + token } : {},
    body: fd,
  });
  let data = null; try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error((data && data.error) || ('Erro ' + res.status));
  return data.attachment;
}

async function req(method, path, body) {
  const headers = { 'content-type': 'application/json' };
  const token = getToken();
  if (token) headers.authorization = 'Bearer ' + token;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || ('Erro ' + res.status));
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => req('GET', p),
  post: (p, b) => req('POST', p, b),
  patch: (p, b) => req('PATCH', p, b),
  del: (p) => req('DELETE', p),

  // auth
  register: (b) => req('POST', '/api/auth/register', b),
  login: (b) => req('POST', '/api/auth/login', b),
  me: () => req('GET', '/api/me'),

  logout() { setToken(null); },
};
