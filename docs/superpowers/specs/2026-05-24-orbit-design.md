# Orbit — Design / Spec

Data: 2026-05-24

App de conversa gamer estilo Discord, tema **preto e branco**, ícones **SVG** (sem emojis),
empacotável como **`setup.exe`** (Windows) e acessível também via **web/mobile** (mesmo SPA).

## Arquitetura (monorepo)

```
Orbit/
├─ server/   Node + Express + Socket.IO + store JSON (sem build nativo)
│            auth (JWT + bcryptjs), servidores, canais, mensagens em tempo real,
│            presença/atividade de jogo, cargos+permissões, motor de bots,
│            proxy de IA, sinalização WebRTC, serve o SPA (desktop + web)
├─ web/      SPA único (vanilla JS + ES modules + CSS). Carregado por:
│              - Electron via http://127.0.0.1:PORT (servidor sobe no processo main)
│              - Navegador/celular via http://<host>:PORT (responsivo)
├─ desktop/  Electron (main + preload), splash animada, detecção de jogo (tasklist),
│            electron-builder (NSIS) → Orbit Setup x.y.z.exe
└─ landing/  Landing page de divulgação (estática, responsiva, "Em Breve" p/ pagamentos)
```

Decisão-chave: **Electron carrega o SPA pelo servidor local (http)**, não `file://`.
Isso evita o bloqueio de ES modules em `file://` e unifica desktop + web num só cliente.
O processo `main` do Electron sobe o servidor em-processo e abre `http://127.0.0.1:PORT`.

## O que funciona de verdade
- Criar conta + login reais (bcryptjs + JWT)
- Servidores, canais (texto/voz/fórum), mensagens em tempo real (Socket.IO)
- Presença e "jogando agora" propagados em tempo real; detecção automática de jogo no desktop
- Cargos + permissões por servidor (criar/editar, cores, ordenação, atribuição a membros)
- Bots: criação + token; eventos de **boas-vindas / saída / ban / silenciamento**; resposta de **IA** (chama API real com a chave fornecida nas configs; sem chave usa eco de demonstração)
- Splash animada com a logo do Orbit ao logar
- Loja de pontos com animações + som (WebAudio) — cards de nome com fontes/cores e banners
- Assinatura / beta features (tela funcional dentro do app)
- Chamada de **vídeo 1:1 WebRTC** real (sinalização pelo servidor + STUN público)
- `setup.exe` gerado pelo electron-builder

## Stubs honestos (sub-projetos futuros)
- **Pagamento**: marcado "Em Breve" na landing; sem cobrança real (Stripe é fase à parte)
- **Mobile nativo**: o SPA responsivo cobre mobile via navegador; um app React Native é fase separada

## Modelo de dados (store JSON)
- users: { id, username, tag, email, passwordHash, avatar, points, beta, favoriteGame, status }
- friends: { userId, friendId, since }
- servers: { id, name, icon, ownerId, roles[], members[], channels[] }
- roles: { id, name, color, permissions[], position }
- channels: { id, serverId, name, type: text|voice|forum, position }
- messages: { id, channelId, authorId, content, ts, botId? }
- bots: { id, ownerId, name, token, serverId?, ai{provider,model,apiKey,systemPrompt}, events{welcome,leave,ban,mute} }
- storeItems: { id, kind: namecard|banner|font|color, name, price, data }

## Permissões (bitmask por cargo)
ADMIN, MANAGE_SERVER, MANAGE_CHANNELS, MANAGE_ROLES, KICK, BAN, MUTE,
SEND_MESSAGES, MANAGE_MESSAGES, CONNECT_VOICE, MANAGE_BOTS.

## Tema
Preto/branco com cinzas. Sem cor de marca além de tons neutros + acento branco.
Tipografia: display condensada para títulos, sans para corpo, mono para detalhes.
Ícones: biblioteca SVG própria, stroke fino, estética gamer/HUD.
