'use strict';
// Pure-JS JSON store. No native modules so it always runs and packages cleanly.
const fs = require('fs');
const path = require('path');
const os = require('os');

const DATA_DIR = process.env.ORBIT_DATA_DIR || path.join(os.homedir(), '.orbit');
const DATA_FILE = path.join(DATA_DIR, 'orbit.json');

const empty = () => ({
  users: [],
  servers: [],
  channels: [],
  messages: [],
  bots: [],
  friends: [],
  friendRequests: [], // { id, fromId, toId, createdAt }
  inventory: [], // { userId, itemId }
  storeItems: [],
  meta: { seeded: false },
});

let state = empty();
let saveTimer = null;

function load() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      state = Object.assign(empty(), JSON.parse(raw));
    } else {
      persistNow();
    }
  } catch (err) {
    console.error('[db] load failed, starting fresh:', err.message);
    state = empty();
  }
  return state;
}

function persistNow() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('[db] save failed:', err.message);
  }
}

function save() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(persistNow, 250);
}

const db = {
  get state() {
    return state;
  },
  load,
  save,
  persistNow,
  // collection helpers
  find(coll, pred) {
    return state[coll].find(pred);
  },
  filter(coll, pred) {
    return state[coll].filter(pred);
  },
  byId(coll, id) {
    return state[coll].find((x) => x.id === id);
  },
  insert(coll, doc) {
    state[coll].push(doc);
    save();
    return doc;
  },
  remove(coll, pred) {
    const before = state[coll].length;
    state[coll] = state[coll].filter((x) => !pred(x));
    if (state[coll].length !== before) save();
  },
};

module.exports = { db, DATA_FILE, DATA_DIR };
