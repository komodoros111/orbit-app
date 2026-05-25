import { h, clear, avatar, toast } from '../ui.js';
import { icon } from '../icons.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { setSound, soundOn, setCustomSound, clearCustomSound, hasCustomSound, playCustom, sfx } from '../sound.js';
import { idbSet, idbGet, idbDel } from '../idb.js';
import { isDesktop } from '../config.js';

function fileToAvatar(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 256; const c = document.createElement('canvas'); c.width = size; c.height = size;
        const ctx = c.getContext('2d'); const min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject; img.src = reader.result;
    };
    reader.onerror = reject; reader.readAsDataURL(file);
  });
}

function toggle(initial, onChange) {
  const t = h('div', { class: 'toggle' + (initial ? ' on' : '') });
  t.addEventListener('click', () => { const on = !t.classList.contains('on'); t.classList.toggle('on', on); onChange(on); });
  return t;
}
function settingRow(title, sub, control) {
  return h('div', { class: 'perm-toggle setting-row' }, h('div', {}, h('div', { class: 'lr-title' }, title), sub ? h('div', { class: 'lr-sub' }, sub) : null), control);
}

export function renderSettings(app) {
  const me = state.me;
  if (!app.settingsCat) app.settingsCat = 'account';

  const nav = h('div', { class: 'settings-nav' });
  const content = h('div', { class: 'settings-content' });

  const cats = [
    { group: 'Configurações de usuário' },
    { id: 'account', label: 'Minha conta', icon: 'user' },
    { id: 'voice', label: 'Voz e vídeo', icon: 'mic' },
    { id: 'notif', label: 'Notificações', icon: 'bell' },
    { group: 'Experiência' },
    { id: 'appearance', label: 'Aparência', icon: 'eye' },
    { id: 'keys', label: 'Atalhos do teclado', icon: 'gamepad' },
    { id: 'windows', label: isDesktop ? 'Janela & Windows' : 'App desktop', icon: 'grid' },
  ];

  function renderNav() {
    clear(nav);
    nav.appendChild(h('div', { class: 'settings-brand' }, h('span', { class: 'ico', html: icon('orbit', 18) }), 'CONFIGURAÇÕES'));
    for (const c of cats) {
      if (c.group) { nav.appendChild(h('div', { class: 'settings-group' }, c.group)); continue; }
      nav.appendChild(h('div', { class: 'channel' + (app.settingsCat === c.id ? ' active' : ''), onClick: () => { app.settingsCat = c.id; renderNav(); renderCat(); } },
        h('span', { class: 'ico', html: icon(c.icon, 16) }), h('span', { class: 'cname' }, c.label)));
    }
    nav.appendChild(h('div', { style: { marginTop: '18px', padding: '0 8px' } },
      h('button', { class: 'btn btn-sm btn-block', html: icon('logout', 14) + '<span>Sair da conta</span>', onClick: () => app.App.logout() })));
  }

  function renderCat() {
    clear(content);
    const fn = { account: accountCat, voice: voiceCat, notif: notifCat, appearance: appearanceCat, keys: keysCat, windows: windowsCat }[app.settingsCat] || accountCat;
    content.appendChild(h('div', { class: 'settings-inner anim-fade' }, fn()));
  }

  // ---- Minha conta ----
  function accountCat() {
    const avWrap = h('label', { class: 'avatar-edit' }, avatar(me, 96), h('div', { class: 'overlay', html: icon('camera', 24) }));
    const fileInput = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
    avWrap.appendChild(fileInput);
    fileInput.addEventListener('change', async () => {
      const f = fileInput.files[0]; if (!f) return;
      try { const d = await fileToAvatar(f); await api.patch('/api/me', { avatar: d }); me.avatar = d; toast('Avatar atualizado', 'success'); app.renderSidebar(); avWrap.replaceChild(avatar(me, 96), avWrap.firstChild); }
      catch { toast('Falha ao processar imagem', 'error'); }
    });
    const nameInput = h('input', { class: 'input', value: me.username });
    const stLabel = { online: 'Online', idle: 'Ausente', dnd: 'Não perturbe', offline: 'Offline' }[me.status || 'online'] || 'Online';
    return h('div', {},
      h('h1', { class: 'settings-title' }, 'Minha conta'),
      h('div', { class: 'section-card' },
        h('div', { class: 'row gap-16' }, avWrap,
          h('div', { style: { flex: 1 } },
            h('div', { class: 'field' }, h('label', {}, 'Nome de usuário'), nameInput),
            h('div', { class: 'mono muted', style: { fontSize: '12px' } }, 'Identificador: ' + me.username + '#' + me.tag))),
        h('div', { class: 'list-row', style: { marginTop: '14px' } },
          h('span', { class: 'dot ' + (me.status || 'online') }),
          h('div', { class: 'lr-main' }, h('div', { class: 'lr-title' }, 'Status: ' + stLabel), h('div', { class: 'lr-sub' }, 'Detectado automaticamente pelo Orbit (online quando ativo, ausente quando inativo).'))),
        h('button', { class: 'btn btn-primary', style: { marginTop: '14px' }, onClick: async () => { try { const { user } = await api.patch('/api/me', { username: nameInput.value }); Object.assign(me, user); toast('Perfil salvo', 'success'); app.renderSidebar(); } catch (e) { toast(e.message, 'error'); } } }, 'Salvar')));
  }

  // ---- Voz e vídeo ----
  function voiceCat() {
    const camSel = h('select', { class: 'select' }, h('option', { value: '' }, 'Câmera padrão'));
    const micSel = h('select', { class: 'select' }, h('option', { value: '' }, 'Microfone padrão'));
    const preview = h('video', { autoplay: 'true', muted: 'true', playsinline: 'true', style: { width: '100%', maxWidth: '360px', borderRadius: '10px', background: '#000', transform: 'scaleX(-1)' } });
    const meterFill = h('i');
    const meter = h('div', { class: 'mic-meter' }, meterFill);
    let stream = null, audioCtx = null, raf = null;

    async function populate() {
      try { const devs = await navigator.mediaDevices.enumerateDevices();
        const cams = devs.filter((d) => d.kind === 'videoinput');
        const mics = devs.filter((d) => d.kind === 'audioinput');
        const cv = camSel.value, mv = micSel.value;
        clear(camSel); camSel.appendChild(h('option', { value: '' }, 'Câmera padrão'));
        cams.forEach((d, i) => camSel.appendChild(h('option', { value: d.deviceId }, d.label || ('Câmera ' + (i + 1)))));
        clear(micSel); micSel.appendChild(h('option', { value: '' }, 'Microfone padrão'));
        mics.forEach((d, i) => micSel.appendChild(h('option', { value: d.deviceId }, d.label || ('Microfone ' + (i + 1)))));
        camSel.value = cv; micSel.value = mv;
      } catch {}
    }
    function stopTest() {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
      if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
      preview.srcObject = null; meterFill.style.width = '0%';
    }
    async function startTest() {
      stopTest();
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: camSel.value ? { deviceId: { exact: camSel.value } } : true,
          audio: micSel.value ? { deviceId: { exact: micSel.value } } : true,
        });
        preview.srcObject = stream;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const src = audioCtx.createMediaStreamSource(stream);
        const an = audioCtx.createAnalyser(); an.fftSize = 512; src.connect(an);
        const data = new Uint8Array(an.frequencyBinCount);
        const tick = () => { an.getByteFrequencyData(data); let s = 0; for (const v of data) s += v; meterFill.style.width = Math.min(100, (s / data.length) / 110 * 100) + '%'; raf = requestAnimationFrame(tick); };
        tick();
        populate(); // rótulos aparecem após permissão
      } catch (e) { toast('Sem acesso à câmera/microfone: ' + (e.message || e.name), 'error'); }
    }
    camSel.addEventListener('change', () => { if (stream) startTest(); });
    micSel.addEventListener('change', () => { if (stream) startTest(); });
    populate();

    return h('div', {},
      h('h1', { class: 'settings-title' }, 'Voz e vídeo'),
      h('div', { class: 'section-card' },
        h('h3', {}, 'Câmera'),
        h('p', { class: 'desc' }, 'Escolha e teste sua câmera antes de uma chamada.'),
        h('div', { class: 'field' }, h('label', {}, 'Dispositivo de câmera'), camSel),
        preview,
        h('div', { class: 'row gap-8', style: { marginTop: '12px' } },
          h('button', { class: 'btn btn-primary', html: icon('video', 16) + '<span>Testar câmera</span>', onClick: startTest }),
          h('button', { class: 'btn', onClick: stopTest }, 'Parar'))),
      h('div', { class: 'section-card' },
        h('h3', {}, 'Microfone'),
        h('p', { class: 'desc' }, 'Escolha o microfone e fale para ver o nível de entrada.'),
        h('div', { class: 'field' }, h('label', {}, 'Dispositivo de entrada'), micSel),
        meter,
        h('p', { class: 'muted', style: { fontSize: '12px', marginTop: '8px' } }, 'Inicie o teste de câmera acima para ativar o medidor do microfone.')));
  }

  // ---- Notificações ----
  function notifCat() {
    const toastsOn = localStorage.getItem('orbit.toasts') !== '0';

    function soundRow(ev, label, sub) {
      const file = h('input', { type: 'file', accept: 'audio/*', style: { display: 'none' } });
      const stateLabel = h('span', { class: 'tag-chip' }, hasCustomSound(ev) ? 'PERSONALIZADO' : 'PADRÃO');
      file.addEventListener('change', async () => {
        const f = file.files[0]; if (!f) return;
        if (f.size > 3 * 1024 * 1024) return toast('Arquivo muito grande (máx 3MB)', 'error');
        try { await setCustomSound(ev, f); stateLabel.textContent = 'PERSONALIZADO'; toast('Som personalizado salvo', 'success'); } catch { toast('Falha ao salvar som', 'error'); }
      });
      const controls = h('div', { class: 'row gap-8' },
        stateLabel,
        h('button', { class: 'icon-btn', title: 'Testar', html: icon('volume', 16), onClick: () => { if (!playCustom(ev)) sfx[ev] ? sfx[ev]() : sfx.click(); } }),
        h('label', { class: 'btn btn-sm', html: icon('camera', 13) + '<span>Escolher</span>' }, file),
        h('button', { class: 'btn btn-sm', html: icon('trash', 13), title: 'Remover', onClick: async () => { await clearCustomSound(ev); stateLabel.textContent = 'PADRÃO'; toast('Som restaurado para o padrão', 'info'); } }));
      return h('div', { class: 'perm-toggle setting-row' }, h('div', {}, h('div', { class: 'lr-title' }, label), h('div', { class: 'lr-sub' }, sub)), controls);
    }

    return h('div', {},
      h('h1', { class: 'settings-title' }, 'Notificações'),
      h('div', { class: 'section-card' },
        settingRow('Efeitos sonoros', 'Desligados por padrão. Ative para ouvir cliques, mensagens e alertas', toggle(soundOn(), (on) => setSound(on))),
        settingRow('Avisos na tela', 'Mostrar notificações (toasts) de pedidos e eventos', toggle(toastsOn, (on) => localStorage.setItem('orbit.toasts', on ? '1' : '0')))),
      h('div', { class: 'section-card' },
        h('h3', {}, 'Sons personalizados'),
        h('p', { class: 'desc' }, 'Opcional — use arquivos de áudio do seu PC. Sem personalizar, o Orbit usa sons sintetizados.'),
        soundRow('notify', 'Notificação', 'Pedidos de amizade e alertas'),
        soundRow('message', 'Mensagem', 'Nova mensagem recebida'),
        soundRow('click', 'Clique', 'Cliques na interface')));
  }

  // ---- Aparência ----
  function appearanceCat() {
    const reduce = document.body.classList.contains('reduce-motion');

    // tela de carregamento (vídeo opcional)
    const stateLabel = h('span', { class: 'tag-chip' }, 'PADRÃO (logo animada)');
    idbGet('splash:video').then((b) => { if (b) stateLabel.textContent = 'VÍDEO PERSONALIZADO'; }).catch(() => {});
    const file = h('input', { type: 'file', accept: 'video/*', style: { display: 'none' } });
    file.addEventListener('change', async () => {
      const f = file.files[0]; if (!f) return;
      if (f.size > 30 * 1024 * 1024) return toast('Vídeo muito grande (máx 30MB)', 'error');
      // valida duração <= 12s
      const url = URL.createObjectURL(f);
      const v = document.createElement('video'); v.preload = 'metadata'; v.src = url;
      v.onloadedmetadata = async () => {
        URL.revokeObjectURL(url);
        if (v.duration > 12.5) return toast('O vídeo precisa ter no máximo 12 segundos', 'error');
        try { await idbSet('splash:video', f); stateLabel.textContent = 'VÍDEO PERSONALIZADO'; toast('Vídeo de carregamento definido — a barra será removida', 'success'); } catch { toast('Falha ao salvar vídeo', 'error'); }
      };
      v.onerror = () => toast('Arquivo de vídeo inválido', 'error');
    });
    const splashSoundOn = localStorage.getItem('orbit.splashSound') === '1';

    return h('div', {},
      h('h1', { class: 'settings-title' }, 'Aparência'),
      h('div', { class: 'section-card' },
        h('h3', {}, 'Tema'),
        h('p', { class: 'desc' }, 'O Orbit é preto no branco por design — minimalista e focado.'),
        h('div', { class: 'theme-swatches' }, h('span', { class: 'sw sw-black' }), h('span', { class: 'sw sw-gray' }), h('span', { class: 'sw sw-white' }))),
      h('div', { class: 'section-card' },
        settingRow('Reduzir animações', 'Desativa transições e movimentos', toggle(reduce, (on) => { document.body.classList.toggle('reduce-motion', on); localStorage.setItem('orbit.reduceMotion', on ? '1' : '0'); }))),
      h('div', { class: 'section-card' },
        h('h3', {}, 'Tela de carregamento'),
        h('p', { class: 'desc' }, 'Escolha um vídeo do seu PC (máx 12s) para tocar ao abrir o app. Ao definir um vídeo, a barra de carregamento é removida.'),
        h('div', { class: 'row gap-8', style: { marginBottom: '12px' } }, stateLabel,
          h('label', { class: 'btn btn-sm btn-primary', html: icon('video', 13) + '<span>Escolher vídeo</span>' }, file),
          h('button', { class: 'btn btn-sm', html: icon('trash', 13) + '<span>Remover</span>', onClick: async () => { await idbDel('splash:video'); stateLabel.textContent = 'PADRÃO (logo animada)'; toast('Vídeo removido — voltou pra logo animada', 'info'); } })),
        settingRow('Reproduzir com som', 'Tocar o áudio do vídeo na tela de carregamento', toggle(splashSoundOn, (on) => localStorage.setItem('orbit.splashSound', on ? '1' : '0')))));
  }

  // ---- Atalhos ----
  function keysCat() {
    const keys = [['Enter', 'Enviar mensagem'], ['Shift + Enter', 'Nova linha'], ['@', 'Mencionar membro/cargo'], ['#', 'Mencionar canal'], ['Esc', 'Fechar janelas/menus']];
    return h('div', {},
      h('h1', { class: 'settings-title' }, 'Atalhos do teclado'),
      h('div', { class: 'section-card' }, keys.map(([k, d]) => h('div', { class: 'list-row' }, h('span', { class: 'kbd' }, k), h('div', { class: 'lr-main' }, h('div', { class: 'lr-title' }, d))))));
  }

  // ---- Janela & Windows (desktop) ----
  function windowsCat() {
    if (!isDesktop) {
      return h('div', {},
        h('h1', { class: 'settings-title' }, 'App desktop'),
        h('div', { class: 'section-card center', style: { flexDirection: 'column', gap: '10px', padding: '40px' } },
          h('span', { class: 'ico', style: { width: '40px', height: '40px', color: 'var(--muted)' }, html: icon('grid', 40) }),
          h('p', { class: 'muted', style: { textAlign: 'center' } }, 'Estas opções (iniciar com o Windows, fechar para a bandeja) estão disponíveis no app desktop do Orbit.')));
    }
    const wrap = h('div', {}, h('h1', { class: 'settings-title' }, 'Janela & Windows'), h('div', { class: 'section-card', id: 'win-card' }, h('p', { class: 'muted' }, 'Carregando…')));
    window.orbitDesktop.getPrefs().then((p) => {
      const card = wrap.querySelector('#win-card'); clear(card);
      card.append(
        settingRow('Iniciar com o Windows', 'Abrir o Orbit automaticamente ao ligar o PC', toggle(p.autoLaunch, (on) => window.orbitDesktop.setPref('autoLaunch', on).then(() => toast(on ? 'Vai iniciar com o Windows' : 'Não inicia mais com o Windows', 'success')))),
        settingRow('Fechar minimiza para a bandeja', 'Ao clicar no X, o Orbit continua rodando na bandeja', toggle(p.closeToTray, (on) => window.orbitDesktop.setPref('closeToTray', on))),
        settingRow('Minimizar para a bandeja', 'Ao minimizar, esconder na bandeja do sistema', toggle(p.minimizeToTray, (on) => window.orbitDesktop.setPref('minimizeToTray', on))));
    }).catch(() => {});
    return wrap;
  }

  const layout = h('div', { class: 'settings-layout' }, nav, content);
  renderNav(); renderCat();
  return layout;
}
