'use strict';
const { db } = require('./db');
const { generateReply } = require('./ai');

// Substitui variáveis nas mensagens de evento do bot.
function tpl(str, vars) {
  return String(str || '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`));
}

function botsInServer(serverId) {
  return db.filter('bots', (b) => b.serverId === serverId);
}

function defaultEventChannel(serverId, bot) {
  if (bot.eventChannelId) {
    const c = db.byId('channels', bot.eventChannelId);
    if (c) return c;
  }
  return db
    .filter('channels', (c) => c.serverId === serverId && c.type === 'text')
    .sort((a, b) => a.position - b.position)[0];
}

// ctx = { postMessage(channelId, { botId, content }) }
function fireEvent(ctx, serverId, event, vars) {
  for (const bot of botsInServer(serverId)) {
    const ev = (bot.events || {})[event];
    if (!ev || !ev.enabled || !ev.message) continue;
    const channel = ev.channelId ? db.byId('channels', ev.channelId) : defaultEventChannel(serverId, bot);
    if (!channel) continue;
    ctx.postMessage(channel.id, { botId: bot.id, content: tpl(ev.message, vars) });
  }
}

const onMemberJoin = (ctx, serverId, vars) => fireEvent(ctx, serverId, 'welcome', vars);
const onMemberLeave = (ctx, serverId, vars) => fireEvent(ctx, serverId, 'leave', vars);
const onMemberBan = (ctx, serverId, vars) => fireEvent(ctx, serverId, 'ban', vars);
const onMemberMute = (ctx, serverId, vars) => fireEvent(ctx, serverId, 'mute', vars);

// Resposta de IA: dispara quando a mensagem menciona o bot pelo nome ou começa com "!ia".
async function maybeReply(ctx, channel, message, authorName) {
  const bots = botsInServer(channel.serverId).filter((b) => b.ai && b.ai.enabled);
  const text = (message.content || '').trim();
  for (const bot of bots) {
    const lower = text.toLowerCase();
    const mention = lower.includes(bot.name.toLowerCase()) || lower.startsWith('!ia') || lower.startsWith('@' + bot.name.toLowerCase());
    if (!mention) continue;
    const prompt = text.replace(/^!ia/i, '').trim() || text;
    let reply;
    try {
      reply = await generateReply(bot.ai, prompt, { author: authorName });
    } catch (err) {
      reply = '[erro na IA] ' + err.message;
    }
    ctx.postMessage(channel.id, { botId: bot.id, content: reply });
  }
}

module.exports = { onMemberJoin, onMemberLeave, onMemberBan, onMemberMute, maybeReply, botsInServer };
