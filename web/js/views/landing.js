import { h } from '../ui.js';
import { icon, logoMark } from '../icons.js';
import { orbitSystem } from './splash.js';

function feature(ic, title, desc, soon) {
  return h('div', { class: 'feature' },
    h('span', { class: 'ico', html: icon(ic, 34) }),
    h('h3', {}, title),
    h('p', {}, desc),
    soon ? h('div', { style: { marginTop: '12px' } }, h('span', { class: 'soon-badge', html: icon('flame', 14) + ' EM BREVE' })) : null,
  );
}

export function renderLanding(App) {
  const nav = h('div', { class: 'lp-nav' },
    h('div', { class: 'brand' }, h('span', { class: 'ico', html: icon('orbit', 26) }), 'ORBIT'),
    h('div', { class: 'row gap-8' },
      h('a', { class: 'btn btn-ghost', href: '#download' }, 'Baixar'),
      h('button', { class: 'btn btn-ghost', onClick: () => App.showAuth('login') }, 'Entrar'),
      h('button', { class: 'btn btn-primary', onClick: () => App.showAuth('register') }, 'Criar conta'),
    ),
  );

  const hero = h('div', { class: 'lp-hero' },
    h('div', {},
      h('h1', {}, 'A órbita ', h('span', { class: 'grad-word' }, 'gamer'), ' das suas conversas'),
      h('p', { class: 'lead' }, 'Servidores, voz, vídeo, bots com IA e a atividade dos seus amigos — tudo num app preto no branco feito pra quem joga.'),
      h('div', { class: 'cta-row' },
        h('button', { class: 'btn btn-primary', onClick: () => App.showAuth('register'), html: icon('rocket', 16) + '<span>Começar agora</span>' }),
        h('button', { class: 'btn', onClick: () => App.showAuth('login') }, 'Já tenho conta'),
      ),
    ),
    h('div', { class: 'lp-mock' },
      h('div', { class: 'center', style: { position: 'absolute', inset: 0 } }, orbitSystem()),
    ),
  );

  const features = h('div', { class: 'lp-section' },
    h('h2', {}, 'Tudo num lugar só'),
    h('p', { class: 'sec-sub' }, 'Construído pra comunidades de jogo: do papo rápido à live com a galera.'),
    h('div', { class: 'feature-grid' },
      feature('hash', 'Servidores & Canais', 'Texto, voz e fórum. Crie comunidades com cargos e permissões finos.'),
      feature('video', 'Voz & Vídeo', 'Chamadas de vídeo 1:1 em WebRTC, nítidas e diretas.'),
      feature('bot', 'Bots com IA', 'Boas-vindas, saída, ban, mute e respostas de IA conectadas à sua API.'),
      feature('gamepad', 'Atividade dos amigos', 'Veja quem está jogando o quê, em tempo real, e defina seu jogo favorito.'),
      feature('shield', 'Cargos & Permissões', 'Administre o servidor com um sistema de cargos no estilo dos grandes.'),
      feature('store', 'Loja de pontos', 'Cards de nome, banners, fontes e cores pra estilizar seu perfil.'),
    ),
  );

  const dlWin = window.__ORBIT_DL_WIN__ || '/downloads/Orbit-Setup-0.1.0.exe';
  const dlApk = window.__ORBIT_DL_APK__ || '';
  const downloads = h('div', { class: 'lp-section', id: 'download' },
    h('h2', {}, 'Baixe o Orbit'),
    h('p', { class: 'sec-sub' }, 'Leve o Orbit pro seu desktop e pro celular.'),
    h('div', { class: 'dl-grid' },
      h('a', { class: 'dl-card', href: dlWin, download: '' },
        h('span', { class: 'ico', html: icon('grid', 30) }),
        h('div', {}, h('h3', {}, 'Windows'), h('p', {}, 'Instalador .exe (setup) — clique pra baixar')),
        h('span', { class: 'btn btn-primary', html: icon('rocket', 15) + '<span>Baixar .exe</span>' })),
      dlApk
        ? h('a', { class: 'dl-card', href: dlApk, download: '' },
            h('span', { class: 'ico', html: icon('gamepad', 30) }),
            h('div', {}, h('h3', {}, 'Android'), h('p', {}, 'APK — baixe e instale no seu Samsung')),
            h('span', { class: 'btn btn-primary', html: icon('rocket', 15) + '<span>Baixar APK</span>' }))
        : h('div', { class: 'dl-card disabled' },
            h('span', { class: 'ico', html: icon('gamepad', 30) }),
            h('div', {}, h('h3', {}, 'Android'), h('p', {}, 'APK em breve — gere pelo Expo (veja o README do mobile)')),
            h('span', { class: 'soon-badge', html: icon('flame', 13) + ' EM BREVE' })),
    ),
    h('p', { class: 'muted', style: { marginTop: '16px', fontSize: '13px' } }, 'No Android, ative "Instalar apps de fontes desconhecidas" para instalar o APK.'),
  );

  const beta = h('div', { class: 'lp-section' },
    h('h2', {}, h('span', { class: 'ico', html: icon('sparkle', 32) }), ' Pulsar '),
    h('p', { class: 'sec-sub' }, 'A assinatura premium do Orbit — perfil destacado, mais pontos e vantagens de beta. Pagamento chega já já.'),
    h('div', { class: 'feature-grid' },
      feature('sparkle', 'Perfil Premium', 'Assinatura paga com selo, avatar animado e destaque na lista.', true),
      feature('coin', 'Loja de Pontos', 'Sistema de pontos (beta) pra desbloquear cosméticos.', true),
      feature('crown', 'Vantagens Beta', 'Acesso antecipado a recursos novos antes de todo mundo.', true),
    ),
    h('div', { style: { marginTop: '24px' } },
      h('button', { class: 'btn', disabled: 'true' }, h('span', { class: 'ico', html: icon('flame', 16) }), 'Pagamento — Em Breve'),
    ),
  );

  const footer = h('div', { class: 'lp-footer' },
    h('div', { class: 'row gap-8' }, h('span', { class: 'ico', html: icon('orbit', 18) }), 'Orbit © 2026'),
    h('div', { class: 'muted' }, 'Preto no branco. Feito pra jogar.'),
  );

  return h('div', { class: 'landing' }, nav, hero, features, downloads, beta, footer);
}
