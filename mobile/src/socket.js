import { io } from 'socket.io-client';
import { getApiBase, getToken } from './config';

let sock = null;

export async function connectSocket() {
  if (sock && sock.connected) return sock;
  const base = await getApiBase();
  const token = await getToken();
  sock = io(base, { auth: { token }, transports: ['websocket'], forceNew: true });
  return sock;
}

export function socket() { return sock; }
export function emitS(...args) { if (sock) sock.emit(...args); }
export function disconnectSocket() { if (sock) { sock.disconnect(); sock = null; } }
