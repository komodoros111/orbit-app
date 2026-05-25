import { h, toast } from '../ui.js';
import { icon } from '../icons.js';
import { api } from '../api.js';
import { orbitSystem } from './splash.js';
import { startDeviceLogin } from './device.js';
import { isDesktop } from '../config.js';

export function renderAuth(App, mode = 'login') {
  let current = mode;
  const side = h('div', { class: 'auth-form-side' });

  function render() {
    const isLogin = current === 'login';
    const errBox = h('div', { class: 'form-err hidden' });

    const username = h('input', { class: 'input', placeholder: 'seunome', autocomplete: 'username' });
    const email = h('input', { class: 'input', type: 'email', placeholder: 'voce@email.com', autocomplete: 'email' });
    const password = h('input', { class: 'input', type: 'password', placeholder: '••••••••', autocomplete: isLogin ? 'current-password' : 'new-password' });

    const submit = h('button', { class: 'btn btn-primary btn-block', html: (isLogin ? icon('logout', 16) : icon('rocket', 16)) + `<span>${isLogin ? 'Entrar' : 'Criar conta'}</span>` });

    async function go() {
      errBox.classList.add('hidden');
      submit.disabled = true;
      try {
        const res = isLogin
          ? await api.login({ email: email.value, password: password.value })
          : await api.register({ username: username.value, email: email.value, password: password.value });
        toast(isLogin ? 'Bem-vindo de volta' : 'Conta criada', 'success');
        await App.onAuthed(res.token, res.user, { animate: true });
      } catch (e) {
        errBox.textContent = e.message;
        errBox.classList.remove('hidden');
        submit.disabled = false;
      }
    }
    submit.addEventListener('click', go);
    [username, email, password].forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); }));

    const card = h('div', { class: 'auth-card anim-rise' },
      h('button', { class: 'btn btn-ghost btn-sm', onClick: () => App.showLanding(), html: icon('arrowLeft', 14) + '<span>Voltar</span>', style: { marginBottom: '20px' } }),
      h('h1', {}, isLogin ? 'Entrar' : 'Criar conta'),
      h('p', { class: 'sub' }, isLogin ? 'Que bom te ver de novo.' : 'Entre na órbita em segundos.'),
      errBox,
      !isLogin ? h('div', { class: 'field' }, h('label', {}, 'Nome de usuário'), username) : null,
      h('div', { class: 'field' }, h('label', {}, 'E-mail'), email),
      h('div', { class: 'field' }, h('label', {}, 'Senha'), password),
      submit,
      // "Entrar com Orbit" é exclusivo do app desktop (abre o navegador e loga se já estiver logado lá)
      isDesktop ? h('div', { class: 'or-sep' }, h('span', {}, 'ou')) : null,
      isDesktop ? h('button', { class: 'btn btn-block', html: icon('orbit', 16) + '<span>Entrar com Orbit</span>', onClick: () => startDeviceLogin(App) }) : null,
      h('div', { class: 'auth-switch' },
        isLogin ? 'Não tem conta? ' : 'Já tem conta? ',
        h('a', { onClick: () => { current = isLogin ? 'register' : 'login'; render(); } }, isLogin ? 'Criar conta' : 'Entrar'),
      ),
    );
    side.replaceChildren(card);
    (isLogin ? email : username).focus();
  }
  render();

  const art = h('div', { class: 'auth-art' },
    h('div', { class: 'orbit-anim' }, orbitSystem()),
    h('div', { class: 'brand' }, h('span', { class: 'ico', html: icon('orbit', 28) }), 'ORBIT'),
    h('div', { class: 'pitch' },
      h('h2', {}, 'Entre na sua órbita.'),
      h('p', { class: 'muted' }, 'Conversas, jogos e a sua galera — no preto no branco.'),
    ),
  );

  return h('div', { class: 'auth-wrap' }, art, side);
}
