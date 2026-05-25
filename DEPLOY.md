# Hospedar o backend do Orbit (multiplayer real)

O backend do Orbit (`server/`) é um único processo Node que serve **API REST + Socket.IO + o app web (SPA)**. Hospedando ele, seus amigos usam o Orbit de qualquer lugar — pelo site, pelo APK ou por um desktop apontado pra ele — todos no **mesmo mundo** (mesmas contas, servidores e chat).

Já está tudo pronto: `Dockerfile`, `.dockerignore`, `render.yaml` e a porta dinâmica (`PORT`).

---

## Opção A — Render (mais simples, tem plano grátis)

1. Suba este repositório pro GitHub.
2. No [Render](https://render.com): **New ▸ Blueprint** e selecione o repo (ele lê o `render.yaml`).
3. Confirme. O Render builda o `Dockerfile` e sobe o serviço.
4. Pega a URL pública, algo como `https://orbit-xxxx.onrender.com`.
5. Teste: abra `https://orbit-xxxx.onrender.com/healthz` → deve responder `{"ok":true}`.

> **Persistência:** o plano **free é efêmero** — contas/servidores resetam quando o app "dorme" ou redeploya. Pra manter os dados, no `render.yaml` troque `plan: free` por `plan: starter` e descomente o bloco `disk:` (monta `/data`).

## Opção B — Railway

1. [Railway](https://railway.app) ▸ **New Project ▸ Deploy from GitHub** (detecta o `Dockerfile`).
2. Em **Variables**: adicione `ORBIT_JWT_SECRET` (qualquer string longa e secreta) e `ORBIT_DATA_DIR=/data`.
3. Em **Volumes**: crie um volume montado em `/data` (mantém os dados).
4. Pega a URL pública (`https://orbit-xxxx.up.railway.app`).

Qualquer host com Docker funciona igual (Fly.io, VPS, etc.): só rodar a imagem com `PORT` e um volume em `/data`.

---

## Depois de hospedar — conectar os clientes

A URL hospedada **já é o app completo** (abre no navegador e funciona). Para integrar os outros clientes:

### Site (Vercel)
Edite `web/orbit.config.js`:
```js
window.__ORBIT_API__ = "https://orbit-xxxx.onrender.com";
```
Depois: `cd web && npx vercel deploy --prod`. Agora `orbithouse.vercel.app` usa o backend hospedado (login/chat/loja online de verdade).

### Mobile (APK)
Edite `mobile/src/config.js` → `DEFAULT_API = "https://orbit-xxxx.onrender.com";`
Gere o APK (`eas build -p android --profile preview`) e mande pros amigos. Agora o celular fala com o backend online — não precisa do seu PC ligado.

### Desktop (entrar no mundo compartilhado)
Por padrão o `.exe` roda um servidor **local** (mundo só seu). Pra ele entrar no mundo compartilhado, edite `web/orbit.config.js` com a URL hospedada (igual ao site), rode `npm run dist` e distribua esse novo `.exe`. Ele continua abrindo normal, mas conversa com o backend online.

### "Entrar com Orbit"
Funciona automaticamente: o `verify_url` usa a própria URL pública do backend. Se quiser forçar outro domínio (ex.: o site da Vercel), defina a env `ORBIT_SITE_URL` no host.

---

## Resumo do que cada parte precisa

| Cliente   | Como aponta pro backend hospedado            |
|-----------|----------------------------------------------|
| Navegador | Abrir a URL do backend direto, OU o site Vercel com `__ORBIT_API__` setado |
| Mobile    | `mobile/src/config.js` → `DEFAULT_API`       |
| Desktop   | `web/orbit.config.js` → `__ORBIT_API__` + `npm run dist` |

CORS e WebSocket já estão liberados pra origem cruzada.
