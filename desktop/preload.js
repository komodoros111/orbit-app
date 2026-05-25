const { contextBridge, ipcRenderer, shell } = require('electron');
const os = require('os');

// API segura exposta ao renderer (SPA detecta via window.orbitDesktop).
contextBridge.exposeInMainWorld('orbitDesktop', {
  platform: process.platform,
  version: '0.1.0',
  deviceName: (() => {
    let host = 'PC';
    try { host = os.hostname(); } catch {}
    const plat = process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux';
    return `${host} · Orbit Desktop (${plat})`;
  })(),
  // Abre uma URL no navegador padrão do sistema.
  openExternal(url) { try { shell.openExternal(url); } catch {} },
  // Recebe o jogo detectado automaticamente pelo processo principal.
  onGame(cb) {
    ipcRenderer.on('orbit:game', (_e, name) => cb(name));
  },
  // Preferências do desktop (iniciar com Windows, fechar -> bandeja, etc.)
  getPrefs() { return ipcRenderer.invoke('prefs:get'); },
  setPref(key, value) { return ipcRenderer.invoke('prefs:set', { key, value }); },
  // Controles da janela (title bar customizada)
  win: {
    minimize() { ipcRenderer.send('win:minimize'); },
    maximize() { ipcRenderer.send('win:maximize'); },
    close() { ipcRenderer.send('win:close'); },
  },
});
