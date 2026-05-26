import { h, toast } from '../ui.js';
import { icon } from '../icons.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { sfx } from '../sound.js';

export function renderSubscription(app) {
  const page = h('div', { class: 'page' });
  const inner = h('div', { class: 'page-inner' });
  page.appendChild(inner);

  const benefit = (ic, t, d) => h('div', { class: 'list-row' },
    h('span', { class: 'ico', style: { color: 'var(--white)' }, html: icon(ic, 22) }),
    h('div', { class: 'lr-main' }, h('div', { class: 'lr-title' }, t), h('div', { class: 'lr-sub' }, d)));

  const statusPill = h('span', { class: 'role-pill' }, state.me.beta ? 'ATIVO' : 'INATIVO');
  const toggleBtn = h('button', { class: 'btn btn-primary' });

  function syncBtn() {
    toggleBtn.innerHTML = (state.me.beta ? icon('check', 16) : icon('sparkle', 16)) + '<span>' + (state.me.beta ? 'Beta ativado — desativar' : 'Ativar Pulsar (beta grátis)') + '</span>';
    statusPill.textContent = state.me.beta ? 'ATIVO' : 'INATIVO';
  }
  syncBtn();
  toggleBtn.addEventListener('click', async () => {
    try { const { beta } = await api.post('/api/subscription', { beta: !state.me.beta }); state.me.beta = beta; syncBtn(); if (beta) { sfx.success(); toast('Pulsar ativado (beta)', 'success'); } else toast('Pulsar desativado', 'info'); app.renderSidebar(); }
    catch (e) { toast(e.message, 'error'); }
  });

  inner.append(
    h('div', { class: 'row', style: { justifyContent: 'space-between', alignItems: 'center' } },
      h('h1', { class: 'page-title' }, h('span', { class: 'ico', html: icon('sparkle', 30) }), ' Pulsar'),
      statusPill),
    h('p', { class: 'page-sub' }, 'A assinatura premium do Orbit. Durante o beta, ative de graça e ajude a testar.'),

    h('div', { class: 'section-card' },
      h('h3', {}, 'Vantagens'),
      h('div', { style: { marginTop: '12px' } },
        benefit('sparkle', 'Selo premium no perfil', 'Apareça com o selo Pulsar ao lado do seu nome.'),
        benefit('coin', 'Pontos da loja (beta)', 'Sistema de pontos pra desbloquear cards, banners e cores.'),
        benefit('crown', 'Acesso antecipado', 'Recursos novos primeiro, em fase beta.'),
        benefit('camera', 'Avatar e cards exclusivos', 'Cosméticos que só assinantes têm.'),
      ),
      h('div', { style: { marginTop: '16px' } }, toggleBtn),
    ),

    h('div', { class: 'section-card center', style: { flexDirection: 'column', gap: '10px', padding: '34px' } },
      h('span', { class: 'soon-badge', html: icon('flame', 14) + ' PAGAMENTO EM BREVE' }),
      h('p', { class: 'muted', style: { textAlign: 'center', maxWidth: '420px' } }, 'O pagamento da assinatura ainda é beta. Por enquanto, o Pulsar é gratuito e o checkout chega em breve.'),
      h('button', { class: 'btn', disabled: 'true' }, h('span', { class: 'ico', html: icon('coin', 16) }), 'Assinar — Em Breve'),
    ),
  );
  return page;
}
