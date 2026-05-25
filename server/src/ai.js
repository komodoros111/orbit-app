'use strict';
// AI bridge for bots. Uses real provider when an API key is configured,
// otherwise returns a clearly-labelled demo reply so the UI still works.

async function generateReply(ai, userMessage, context = {}) {
  const cfg = ai || {};
  const provider = (cfg.provider || 'demo').toLowerCase();
  const system = cfg.systemPrompt || 'Você é um bot do Orbit, prestativo e direto.';

  try {
    if (provider === 'anthropic' && cfg.apiKey) {
      return await callAnthropic(cfg, system, userMessage);
    }
    if (provider === 'openai' && cfg.apiKey) {
      return await callOpenAI(cfg, system, userMessage);
    }
  } catch (err) {
    return `[IA indisponível: ${err.message}] (modo demo) Você disse: "${userMessage}"`;
  }
  // Demo fallback (no key configured)
  return demoReply(system, userMessage, context);
}

async function callAnthropic(cfg, system, userMessage) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: cfg.model || 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) throw new Error('Anthropic ' + res.status);
  const data = await res.json();
  return (data.content || []).map((c) => c.text).join('').trim() || '(sem resposta)';
}

async function callOpenAI(cfg, system, userMessage) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer ' + cfg.apiKey,
    },
    body: JSON.stringify({
      model: cfg.model || 'gpt-4o-mini',
      max_tokens: 512,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
    }),
  });
  if (!res.ok) throw new Error('OpenAI ' + res.status);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '(sem resposta)';
}

function demoReply(system, userMessage) {
  const m = userMessage.toLowerCase();
  if (/(oi|olá|ola|eai|salve|hello)/.test(m)) return 'Salve! Sou um bot do Orbit em modo demo. Configure uma chave de API pra eu pensar de verdade.';
  if (/(ajuda|help|comandos?)/.test(m)) return 'Comandos: fale comigo normalmente. Em modo demo eu só ecoo. Plugue uma API (Anthropic/OpenAI) nas configs do bot.';
  if (m.includes('?')) return 'Boa pergunta. No modo demo não tenho cérebro — configure uma chave de IA pra eu responder de verdade.';
  return `(modo demo) Recebi: "${userMessage}"`;
}

module.exports = { generateReply };
