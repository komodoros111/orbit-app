'use strict';
const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { startGameScan } = require('./gamescan');

const APP_ICON = path.join(__dirname, 'build', 'icon.ico');
const isPacked = app.isPackaged;
const SERVER_ENTRY = isPacked
  ? path.join(process.resourcesPath, 'server', 'src', 'index.js')
  : path.join(__dirname, '..', 'server', 'src', 'index.js');

process.env.ORBIT_PORT = process.env.ORBIT_PORT || '4317';

let mainWindow = null;
let splash = null;
let tray = null;
let isQuitting = false;

// ---------- preferências do desktop ----------
const PREFS_FILE = path.join(app.getPath('userData'), 'prefs.json');
const DEFAULT_PREFS = { autoLaunch: false, closeToTray: true, minimizeToTray: false };
let prefs = { ...DEFAULT_PREFS };

function loadPrefs() {
  try { prefs = { ...DEFAULT_PREFS, ...JSON.parse(fs.readFileSync(PREFS_FILE, 'utf8')) }; } catch { prefs = { ...DEFAULT_PREFS }; }
}
function savePrefs() {
  try { fs.writeFileSync(PREFS_FILE, JSON.stringify(prefs, null, 2)); } catch {}
}
function applyAutoLaunch() {
  try { app.setLoginItemSettings({ openAtLogin: !!prefs.autoLaunch, name: 'Orbit' }); } catch {}
}

// ---------- single instance ----------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) { if (!mainWindow.isVisible()) mainWindow.show(); if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  });
  app.whenReady().then(boot);
}

function createSplash() {
  splash = new BrowserWindow({
    width: 420, height: 320, frame: false, resizable: false, transparent: false,
    backgroundColor: '#000000', alwaysOnTop: true, center: true, show: true, icon: APP_ICON, skipTaskbar: true,
  });
  splash.loadFile(path.join(__dirname, 'splash.html'));
}

function createTray() {
  if (tray) return;
  try {
    let img = nativeImage.createFromPath(APP_ICON);
    if (!img.isEmpty()) img = img.resize({ width: 16, height: 16 });
    tray = new Tray(img.isEmpty() ? APP_ICON : img);
    tray.setToolTip('Orbit');
    const menu = Menu.buildFromTemplate([
      { label: 'Abrir Orbit', click: () => showMain() },
      { type: 'separator' },
      { label: 'Sair', click: () => { isQuitting = true; app.quit(); } },
    ]);
    tray.setContextMenu(menu);
    tray.on('double-click', () => showMain());
  } catch (e) { console.warn('tray indisponível:', e.message); }
}

function showMain() {
  if (!mainWindow) return;
  if (!mainWindow.isVisible()) mainWindow.show();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

function createMainWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 940, minHeight: 600,
    backgroundColor: '#070707', show: false, autoHideMenuBar: true, icon: APP_ICON,
    frame: false, // title bar escura customizada no app (sem a barra branca do Windows)
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadURL('http://127.0.0.1:' + port);

  mainWindow.once('ready-to-show', () => {
    // crossfade suave: janela principal entra por opacidade enquanto a splash some
    mainWindow.setOpacity(0);
    mainWindow.show();
    let o = 0;
    const fade = setInterval(() => {
      o = Math.min(1, o + 0.08);
      mainWindow.setOpacity(o);
      if (splash && !splash.isDestroyed()) splash.setOpacity(Math.max(0, 1 - o * 1.2));
      if (o >= 1) { clearInterval(fade); if (splash && !splash.isDestroyed()) splash.close(); mainWindow.setOpacity(1); }
    }, 24);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });

  // fechar -> minimizar pra bandeja (se configurado)
  mainWindow.on('close', (e) => {
    if (!isQuitting && prefs.closeToTray) {
      e.preventDefault();
      mainWindow.hide();
      return false;
    }
  });
  mainWindow.on('minimize', (e) => {
    if (prefs.minimizeToTray) { e.preventDefault(); mainWindow.hide(); }
  });

  startGameScan(mainWindow);
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ---------- IPC: controles da janela (title bar customizada) ----------
ipcMain.on('win:minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('win:maximize', () => { if (mainWindow) { mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(); } });
ipcMain.on('win:close', () => { if (mainWindow) mainWindow.close(); });

// ---------- IPC: preferências ----------
ipcMain.handle('prefs:get', () => prefs);
ipcMain.handle('prefs:set', (_e, payload) => {
  const { key, value } = payload || {};
  if (key in DEFAULT_PREFS) {
    prefs[key] = value;
    savePrefs();
    if (key === 'autoLaunch') applyAutoLaunch();
  }
  return prefs;
});

function grantMediaPermissions() {
  // App local confiável: concede câmera/microfone (corrige "Sem acesso à câmera").
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(['media', 'audioCapture', 'videoCapture', 'mediaKeySystem', 'notifications', 'fullscreen', 'clipboard-read'].includes(permission) || true);
  });
  ses.setPermissionCheckHandler(() => true);
}

async function boot() {
  loadPrefs();
  applyAutoLaunch();
  grantMediaPermissions();
  createTray();
  createSplash();
  try {
    const server = require(SERVER_ENTRY);
    const port = await server.start();
    createMainWindow(port || Number(process.env.ORBIT_PORT));
  } catch (err) {
    console.error('Falha ao iniciar o servidor Orbit:', err);
    if (splash && !splash.isDestroyed()) {
      splash.loadURL('data:text/html,<body style="background:%23000;color:%23fff;font-family:sans-serif;padding:24px"><h3>Erro ao iniciar o Orbit</h3><pre>' + encodeURIComponent(String(err)) + '</pre></body>');
    }
  }
}

app.on('before-quit', () => { isQuitting = true; });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) boot(); });
