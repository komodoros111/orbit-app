'use strict';
// Store de dados do Orbit.
// - Local/desktop: arquivo JSON (sem dependências).
// - Hospedado: Upstash Redis (REST) quando UPSTASH_REDIS_REST_URL/TOKEN estão setados
//   → dados persistentes e grátis, sem driver nativo (usa fetch).
const fs = require('fs');
const path = require('path');
const os = require('os');

const DATA_DIR = process.env.ORBIT_DATA_DIR || path.join(os.homedir(), '.orbit');
const DATA_FILE = path.join(DATA_DIR, 'orbit.json');

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_KEY = process.env.ORBIT_REDIS_KEY || 'orbit:state';
const USE_REDIS = !!(REDIS_URL && REDIS_TOKEN);

const empty = () => ({
  users: [],
  servers: [],
  channels: [],
  messages: [],
  bots: [],
  friends: [],
  friendRequests: [],
  blocked: [], // { userId, blockedId }
  inventory: [],
  storeItems: [],
  meta: { seeded: false },
});

let state = empty();
let saveTimer = null;

// ---------- Upstash Redis (REST) ----------
async function redisCmd(args) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + REDIS_TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error('upstash ' + res.status + ' ' + (await res.text()));
  const j = await res.json();
  return j.result;
}

async function load() {
  if (USE_REDIS) {
    try {
      const raw = await redisCmd(['GET', REDIS_KEY]);
      if (raw) {
        state = Object.assign(empty(), JSON.parse(raw));
        console.log('[db] estado carregado do Redis (Upstash)');
      } else {
        state = empty();
        await persistNow();
        console.log('[db] Redis vazio — iniciando estado novo');
      }
    } catch (err) {
      console.error('[db] falha ao carregar do Redis:', err.message);
      state = empty();
    }
    return state;
  }
  // --- arquivo ---
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(DATA_FILE)) {
      state = Object.assign(empty(), JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
    } else {
      await persistNow();
    }
  } catch (err) {
    console.error('[db] load (arquivo) falhou, iniciando vazio:', err.message);
    state = empty();
  }
  return state;
}

async function persistNow() {
  if (USE_REDIS) {
    try { await redisCmd(['SET', REDIS_KEY, JSON.stringify(state)]); }
    catch (err) { console.error('[db] falha ao salvar no Redis:', err.message); }
    return;
  }
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('[db] save (arquivo) falhou:', err.message);
  }
}

function save() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { persistNow().catch(() => {}); }, 250);
}

const db = {
  get state() { return state; },
  load,
  save,
  persistNow,
  usingRedis: USE_REDIS,
  find(coll, pred) { return state[coll].find(pred); },
  filter(coll, pred) { return state[coll].filter(pred); },
  byId(coll, id) { return state[coll].find((x) => x.id === id); },
  insert(coll, doc) { state[coll].push(doc); save(); return doc; },
  remove(coll, pred) {
    const before = state[coll].length;
    state[coll] = state[coll].filter((x) => !pred(x));
    if (state[coll].length !== before) save();
  },
};

module.exports = { db, DATA_FILE, DATA_DIR };
