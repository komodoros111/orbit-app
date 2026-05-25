# Orbit Mobile (Android / Samsung)

App React Native (Expo) do Orbit. Conecta no mesmo backend do desktop/web.

## Rodar em desenvolvimento
```bash
cd mobile
npm install
npx expo start          # abra no app "Expo Go" (Play Store) lendo o QR
```
Na tela de login, toque em **"Configurar servidor"** e aponte para o backend:
- Celular físico (mesma rede do PC): `http://IP-DO-PC:4317` (ex.: `http://192.168.0.10:4317`)
- Emulador Android: `http://10.0.2.2:4317`
- Backend hospedado: a URL pública (ex.: `https://orbit-api.seudominio.com`)

> O PC precisa estar com o servidor Orbit rodando (`npm run server`) e acessível na rede.

## Gerar o APK para enviar aos amigos
A forma mais simples é o **EAS Build** (nuvem da Expo, conta grátis):

```bash
npm install -g eas-cli
cd mobile
eas login                       # crie/entre numa conta Expo (grátis)
eas build -p android --profile preview
```
- O perfil `preview` (em `eas.json`) gera um **APK instalável** (não AAB).
- Ao terminar, o EAS te dá um **link de download do APK**. Esse link já dá pra mandar pros amigos — eles baixam e instalam direto.
- Para colocar o botão "Baixar APK" no site: copie esse link em `web/orbit.config.js`
  → `window.__ORBIT_DL_APK__ = "https://expo.dev/artifacts/....apk"` e faça o redeploy.

### Alternativa local (sem nuvem)
Precisa de Android Studio/SDK instalado:
```bash
cd mobile
npx expo prebuild -p android
cd android && ./gradlew assembleRelease
# APK em: android/app/build/outputs/apk/release/app-release.apk
```

## Como os amigos instalam o APK
1. Baixam o `.apk` (pelo link ou pelo site).
2. No Android: **Configurações → Apps → Acesso especial → Instalar apps desconhecidos** → permitir para o navegador/gerenciador de arquivos.
3. Abrem o `.apk` e instalam.

## Notificações
Usa `expo-notifications` (canal Android + permissão). Notifica pedidos de amizade,
aceites e mensagens enquanto o app estiver conectado.
