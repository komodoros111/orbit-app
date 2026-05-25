import { h, clear, avatar, toast, modal, confirmDialog } from '../ui.js';
import { icon } from '../icons.js';
import { api } from '../api.js';
import { state } from '../state.js';

export function renderBots(app) {
  const page = h('div', { class: 'page' });
  const inner = h('div', { class: 'page-inner' });
  page.appendChild(inner);

  inner.append(
    h('div', { class: 'row', style: { justifyContent: 'space-between', alignItems: 'flex-start' } },
      h('div', {}, h('h1', { class: 'page-title' }, 'Bots'), h('p', { class: 'page-sub' }, 'Crie bots, conecte uma IA e configure eventos do servidor.')),
      h('button', { class: 'btn btn-primary', html: icon('plus', 16) + '<span>Novo bot</span>', onClick: createBot }),
    ),
  );
  const list = h('div', { id: 'bots-list' }, h('p', { class: 'muted' }, 'Carregando…'));
  inner.appendChild(list);

  async function load() {
    const { bots } = await api.get('/api/bots');
    state.bots = bots;
    clear(list);
    if (!bots.length) { list.appendChild(emptyState()); return; }
    for (const b of bots) {
      list.appendChild(h('div', { class: 'list-row' },
        avatar({ username: b.name }, 42),
        h('div', { class: 'lr-main' },
          h('div', { class: 'lr-title' }, b.name, b.ai.enabled ? h('span', { class: 'role-pill', style: { marginLeft: '8px' } }, h('span', { class: 'ico', html: icon('sparkle', 12) }), 'IA') : ''),
          h('div', { class: 'lr-sub mono' }, b.serverId ? 'Ativo num servidor' : 'Sem servidor'),
        ),
        h('button', { class: 'btn btn-sm', onClick: () => openBot(b) }, 'Configurar'),
      ));
    }
  }

  function emptyState() {
    return h('div', { class: 'section-card center', style: { flexDirection: 'column', gap: '12px', padding: '48px' } },
      h('span', { class: 'ico', style: { width: '48px', height: '48px', color: 'var(--muted)' }, html: icon('bot', 48) }),
      h('p', { class: 'muted' }, 'Nenhum bot ainda. Crie o primeiro.'),
      h('button', { class: 'btn btn-primary', html: icon('plus', 16) + '<span>Criar bot</span>', onClick: createBot }));
  }

  async function createBot() {
    const name = h('input', { class: 'input', placeholder: 'Nome do bot' });
    modal({ title: 'Novo bot', body: h('div', { class: 'field' }, h('label', {}, 'Nome'), name),
      actions: [{ label: 'Criar', primary: true, onClick: async (close) => { try { const { bot } = await api.post('/api/bots', { name: name.value }); close(); load(); openBot(bot); } catch (e) { toast(e.message, 'error'); } } }] });
    setTimeout(() => name.focus(), 50);
  }

  function openBot(bot) {
    let tab = 'geral';
    const tabsBar = h('div', { class: 'tabs' });
    const content = h('div', {});
    const tabsDef = [['geral', 'Geral'], ['ia', 'IA'], ['eventos', 'Eventos'], ['terminal', 'Terminal'], ['servidor', 'Servidor']];

    function setTab(t) { tab = t; [...tabsBar.children].forEach((c, i) => c.classList.toggle('active', tabsDef[i][0] === t)); renderTab(); }
    tabsDef.forEach(([id, label]) => tabsBar.appendChild(h('div', { class: 'tab' + (id === tab ? ' active' : ''), onClick: () => setTab(id) }, label)));

    function renderTab() {
      clear(content);
      if (tab === 'geral') content.appendChild(geralTab());
      else if (tab === 'ia') content.appendChild(iaTab());
      else if (tab === 'eventos') content.appendChild(eventosTab());
      else if (tab === 'terminal') content.appendChild(terminalTab());
      else content.appendChild(servidorTab());
    }

    function terminalTab() {
      const out = h('div', { class: 'bot-term-out' });
      const input = h('input', { class: 'bot-term-input', placeholder: 'mensagem ou /help', autocomplete: 'off', spellcheck: 'false' });
      const history = []; let hi = -1;
      const print = (text, cls) => { out.appendChild(h('div', { class: 'term-line ' + (cls || '') }, text)); out.scrollTop = out.scrollHeight; };
      print('Terminal de programação do bot. Digite uma mensagem para testar a IA, ou /help para comandos.', 'term-sys');
      async function run(raw) {
        const text = (raw || '').trim(); if (!text) return;
        history.unshift(text); hi = -1;
        out.appendChild(h('div', { class: 'term-line term-in' }, h('span', { class: 'term-ps' }, 'você ▸ '), text)); out.scrollTop = out.scrollHeight;
        if (text.startsWith('/')) return command(text);
        try { const { reply } = await api.post('/api/bots/' + bot.id + '/chat', { message: text }); print(bot.name + ' ▸ ' + reply, 'term-bot'); }
        catch (e) { print('erro: ' + e.message, 'term-err'); }
      }
      async function command(text) {
        const [cmd, ...rest] = text.slice(1).split(' '); const arg = rest.join(' ');
        try {
          if (cmd === 'help') print('Comandos:\n  /help              esta ajuda\n  /clear             limpa o terminal\n  /info              mostra config da IA\n  /ai on|off         liga/desliga a IA\n  /provider <p>      demo | anthropic | openai\n  /model <nome>      define o modelo\n  /sys <prompt>      define o prompt de sistema\n  /key <chave>       salva a chave de API\n  (qualquer outro texto é enviado ao bot)', 'term-sys');
          else if (cmd === 'clear') clear(out);
          else if (cmd === 'info') print(JSON.stringify({ name: bot.name, provider: bot.ai.provider, model: bot.ai.model, enabled: bot.ai.enabled, apiKeySet: bot.ai.apiKeySet }, null, 2), 'term-sys');
          else if (cmd === 'ai') { const on = arg.trim() === 'on'; await save({ ai: { enabled: on } }); print('IA ' + (on ? 'ativada' : 'desativada'), 'term-ok'); }
          else if (cmd === 'provider') { await save({ ai: { provider: arg.trim() } }); print('provedor = ' + arg.trim(), 'term-ok'); }
          else if (cmd === 'model') { await save({ ai: { model: arg.trim() } }); print('modelo = ' + arg.trim(), 'term-ok'); }
          else if (cmd === 'sys') { await save({ ai: { systemPrompt: arg } }); print('prompt de sistema atualizado', 'term-ok'); }
          else if (cmd === 'key') { await save({ ai: { apiKey: arg.trim() } }); print('chave de API salva', 'term-ok'); }
          else print('comando desconhecido: /' + cmd + ' — use /help', 'term-err');
        } catch (e) { print('erro: ' + e.message, 'term-err'); }
      }
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { const v = input.value; input.value = ''; run(v); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); if (hi < history.length - 1) { hi++; input.value = history[hi]; } }
        else if (e.key === 'ArrowDown') { e.preventDefault(); if (hi > 0) { hi--; input.value = history[hi]; } else { hi = -1; input.value = ''; } }
      });
      setTimeout(() => input.focus(), 60);
      return h('div', { class: 'bot-terminal' }, out, h('div', { class: 'bot-term-bar' }, h('span', { class: 'term-ps' }, '▸'), input));
    }

    function geralTab() {
      const name = h('input', { class: 'input', value: bot.name });
      return h('div', {},
        h('div', { class: 'field' }, h('label', {}, 'Nome'), name),
        h('div', { class: 'field' }, h('label', {}, 'Token do bot'),
          h('div', { class: 'row gap-8' }, h('input', { class: 'input mono', value: bot.token, readonly: 'true' }),
            h('button', { class: 'btn btn-sm', html: icon('link', 14), onClick: () => { navigator.clipboard?.writeText(bot.token); toast('Token copiado', 'success'); } }))),
        h('div', { class: 'row gap-8', style: { marginTop: '8px' } },
          h('button', { class: 'btn btn-primary', onClick: async () => { await save({ name: name.value }); } }, 'Salvar'),
          h('button', { class: 'btn', html: icon('trash', 14) + '<span>Apagar bot</span>', onClick: async () => { if (await confirmDialog({ title: 'Apagar bot', message: 'Apagar ' + bot.name + '?', confirmLabel: 'Apagar' })) { await api.del('/api/bots/' + bot.id); document.querySelector('.modal-overlay')?.remove(); load(); } } }),
        ),
      );
    }

    function iaTab() {
      const enabled = h('div', { class: 'toggle' + (bot.ai.enabled ? ' on' : '') });
      enabled.addEventListener('click', () => enabled.classList.toggle('on'));
      const provider = h('select', { class: 'select' },
        h('option', { value: 'demo', selected: bot.ai.provider === 'demo' }, 'Demo (sem chave)'),
        h('option', { value: 'anthropic', selected: bot.ai.provider === 'anthropic' }, 'Anthropic (Claude)'),
        h('option', { value: 'openai', selected: bot.ai.provider === 'openai' }, 'OpenAI (GPT)'));
      const model = h('input', { class: 'input', placeholder: 'claude-haiku-4-5-20251001 / gpt-4o-mini', value: bot.ai.model || '' });
      const apiKey = h('input', { class: 'input mono', type: 'password', placeholder: bot.ai.apiKeySet ? '•••••••• (já salva)' : 'cole sua chave de API' });
      const sysp = h('textarea', { class: 'textarea', html: bot.ai.systemPrompt || '' });
      const testIn = h('input', { class: 'input', placeholder: 'Testar: escreva uma mensagem' });
      const testOut = h('div', { class: 'card', style: { padding: '12px', minHeight: '44px', marginTop: '8px' } }, h('span', { class: 'muted' }, 'A resposta do bot aparece aqui.'));

      return h('div', {},
        h('div', { class: 'perm-toggle', style: { marginBottom: '14px' } }, h('span', {}, 'IA ativada'), enabled),
        h('div', { class: 'field' }, h('label', {}, 'Provedor'), provider),
        h('div', { class: 'field' }, h('label', {}, 'Modelo'), model),
        h('div', { class: 'field' }, h('label', {}, 'Chave de API'), apiKey),
        h('div', { class: 'field' }, h('label', {}, 'Prompt de sistema'), sysp),
        h('p', { class: 'muted', style: { fontSize: '12px' } }, 'No servidor, mencione o nome do bot ou comece com "!ia" para acionar a resposta.'),
        h('button', { class: 'btn btn-primary', onClick: async () => {
          await save({ ai: { enabled: enabled.classList.contains('on'), provider: provider.value, model: model.value, systemPrompt: sysp.value, apiKey: apiKey.value || undefined } });
          toast('IA salva', 'success');
        } }, 'Salvar IA'),
        h('hr', { style: { border: 0, borderTop: '1px solid var(--line)', margin: '18px 0' } }),
        h('div', { class: 'field' }, h('label', {}, 'Testar bot'), h('div', { class: 'row gap-8' }, testIn,
          h('button', { class: 'btn', onClick: async () => { try { const { reply } = await api.post('/api/bots/' + bot.id + '/chat', { message: testIn.value }); testOut.textContent = reply; } catch (e) { toast(e.message, 'error'); } } }, 'Enviar'))),
        testOut,
      );
    }

    function eventosTab() {
      const evts = [['welcome', 'Boas-vindas', 'Quando alguém entra'], ['leave', 'Saída', 'Quando alguém sai/é expulso'], ['ban', 'Banimento', 'Quando alguém é banido'], ['mute', 'Silenciamento', 'Quando alguém é silenciado']];
      const refs = {};
      const wrap = h('div', {});
      for (const [key, label, desc] of evts) {
        const ev = (bot.events && bot.events[key]) || { enabled: true, message: '' };
        const tg = h('div', { class: 'toggle' + (ev.enabled ? ' on' : '') });
        tg.addEventListener('click', () => tg.classList.toggle('on'));
        const msg = h('input', { class: 'input', value: ev.message || '' });
        refs[key] = { tg, msg };
        wrap.appendChild(h('div', { class: 'section-card', style: { marginBottom: '12px' } },
          h('div', { class: 'perm-toggle', style: { border: 0, padding: 0, marginBottom: '8px' } }, h('div', {}, h('div', { class: 'lr-title' }, label), h('div', { class: 'lr-sub' }, desc)), tg),
          msg));
      }
      wrap.appendChild(h('p', { class: 'muted', style: { fontSize: '12px' } }, 'Variáveis: {user}, {server}, {reason}'));
      wrap.appendChild(h('button', { class: 'btn btn-primary', style: { marginTop: '8px' }, onClick: async () => {
        const events = {}; for (const [key] of evts) events[key] = { enabled: refs[key].tg.classList.contains('on'), message: refs[key].msg.value };
        await save({ events }); toast('Eventos salvos', 'success');
      } }, 'Salvar eventos'));
      return wrap;
    }

    function servidorTab() {
      const sel = h('select', { class: 'select' }, h('option', { value: '' }, 'Selecione um servidor…'));
      for (const s of state.servers) sel.appendChild(h('option', { value: s.id, selected: bot.serverId === s.id }, s.name));
      return h('div', {},
        h('p', { class: 'desc' }, bot.serverId ? 'Este bot já está num servidor. Você pode movê-lo.' : 'Adicione o bot a um dos seus servidores para ativar os eventos.'),
        h('div', { class: 'field' }, h('label', {}, 'Servidor'), sel),
        h('button', { class: 'btn btn-primary', onClick: async () => { if (!sel.value) return toast('Escolha um servidor', 'error'); try { await api.post('/api/bots/' + bot.id + '/invite', { serverId: sel.value }); bot.serverId = sel.value; toast('Bot adicionado ao servidor', 'success'); } catch (e) { toast(e.message, 'error'); } } }, 'Adicionar ao servidor'),
      );
    }

    async function save(patch) { const { bot: updated } = await api.patch('/api/bots/' + bot.id, patch); Object.assign(bot, updated); load(); }

    modal({ title: 'Configurar — ' + bot.name, wide: true, body: h('div', {}, tabsBar, content) });
    renderTab();
  }

  load();
  return page;
}
