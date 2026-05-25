import { getApiBase, getToken } from './config';

async function req(method, path, body) {
  const base = await getApiBase();
  const token = await getToken();
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = 'Bearer ' + token;
  const res = await fetch(base + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
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
  login: (b) => req('POST', '/api/auth/login', b),
  register: (b) => req('POST', '/api/auth/register', b),
  me: () => req('GET', '/api/me'),
};
