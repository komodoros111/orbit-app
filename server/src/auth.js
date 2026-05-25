'use strict';
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db } = require('./db');

const SECRET = process.env.ORBIT_JWT_SECRET || 'orbit-dev-secret-change-me';

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    tag: u.tag,
    avatar: u.avatar,
    points: u.points,
    beta: u.beta,
    status: u.status,
    favoriteGame: u.favoriteGame,
    playing: u.playing || null,
    namecard: u.namecard || null,
  };
}

function makeTag() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

async function register({ username, email, password }) {
  username = (username || '').trim();
  email = (email || '').trim().toLowerCase();
  if (username.length < 2) throw httpError(400, 'Nome de usuário muito curto');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw httpError(400, 'E-mail inválido');
  if ((password || '').length < 6) throw httpError(400, 'Senha precisa de 6+ caracteres');
  if (db.find('users', (u) => u.email === email)) throw httpError(409, 'E-mail já cadastrado');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: crypto.randomUUID(),
    username,
    tag: makeTag(),
    email,
    passwordHash,
    avatar: null,
    points: 500,
    beta: false,
    status: 'online',
    favoriteGame: null,
    playing: null,
    namecard: null,
    createdAt: Date.now(),
  };
  db.insert('users', user);
  return { token: sign(user), user: publicUser(user) };
}

async function login({ email, password }) {
  email = (email || '').trim().toLowerCase();
  const user = db.find('users', (u) => u.email === email);
  if (!user) throw httpError(401, 'Credenciais inválidas');
  const ok = await bcrypt.compare(password || '', user.passwordHash);
  if (!ok) throw httpError(401, 'Credenciais inválidas');
  return { token: sign(user), user: publicUser(user) };
}

function sign(user) {
  return jwt.sign({ uid: user.id }, SECRET, { expiresIn: '30d' });
}

function verify(token) {
  try {
    const payload = jwt.verify(token, SECRET);
    return db.byId('users', payload.uid) || null;
  } catch {
    return null;
  }
}

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// Express middleware
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const user = token && verify(token);
  if (!user) return res.status(401).json({ error: 'Não autenticado' });
  req.user = user;
  next();
}

module.exports = { register, login, verify, sign, publicUser, authMiddleware, httpError };
