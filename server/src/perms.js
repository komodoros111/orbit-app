'use strict';
// Permission bitmask, Discord-style.
const PERMISSIONS = {
  ADMIN: 1 << 0,
  MANAGE_SERVER: 1 << 1,
  MANAGE_CHANNELS: 1 << 2,
  MANAGE_ROLES: 1 << 3,
  KICK: 1 << 4,
  BAN: 1 << 5,
  MUTE: 1 << 6,
  SEND_MESSAGES: 1 << 7,
  MANAGE_MESSAGES: 1 << 8,
  CONNECT_VOICE: 1 << 9,
  MANAGE_BOTS: 1 << 10,
  CREATE_INVITE: 1 << 11,
};

const ALL = Object.values(PERMISSIONS).reduce((a, b) => a | b, 0);

// Default @everyone permission set
const EVERYONE_DEFAULT =
  PERMISSIONS.SEND_MESSAGES |
  PERMISSIONS.CONNECT_VOICE |
  PERMISSIONS.CREATE_INVITE;

const LABELS = {
  ADMIN: 'Administrador',
  MANAGE_SERVER: 'Gerenciar servidor',
  MANAGE_CHANNELS: 'Gerenciar canais',
  MANAGE_ROLES: 'Gerenciar cargos',
  KICK: 'Expulsar membros',
  BAN: 'Banir membros',
  MUTE: 'Silenciar membros',
  SEND_MESSAGES: 'Enviar mensagens',
  MANAGE_MESSAGES: 'Gerenciar mensagens',
  CONNECT_VOICE: 'Entrar em voz',
  MANAGE_BOTS: 'Gerenciar bots',
  CREATE_INVITE: 'Criar convite',
};

// Compute a member's effective permission bits within a server.
function memberPermissions(server, member) {
  if (!member) return 0;
  if (server.ownerId === member.userId) return ALL;
  let bits = 0;
  for (const roleId of member.roles || []) {
    const role = (server.roles || []).find((r) => r.id === roleId);
    if (role) bits |= role.permissions || 0;
  }
  // @everyone role (id === server.id)
  const everyone = (server.roles || []).find((r) => r.id === server.id);
  if (everyone) bits |= everyone.permissions || 0;
  if (bits & PERMISSIONS.ADMIN) return ALL;
  return bits;
}

function has(bits, perm) {
  if (bits & PERMISSIONS.ADMIN) return true;
  return (bits & perm) === perm;
}

module.exports = { PERMISSIONS, ALL, EVERYONE_DEFAULT, LABELS, memberPermissions, has };
