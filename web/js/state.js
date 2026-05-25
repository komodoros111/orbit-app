// Estado global + barramento de eventos simples.
const bus = new EventTarget();

export const state = {
  me: null,
  servers: [],
  friends: [],
  bots: [],
  currentServer: null,   // serverDetail
  currentChannel: null,  // channel object
  perms: null,
  permLabels: null,
};

export function emit(name, detail) { bus.dispatchEvent(new CustomEvent(name, { detail })); }
export function on(name, cb) { bus.addEventListener(name, (e) => cb(e.detail)); }

export function setMe(u) { state.me = u; emit('me', u); }
