'use strict';
// Detecção automática de jogo aberto (Windows) via `tasklist`.
const { exec } = require('child_process');

// Mapa executável -> nome amigável (espelha server/src/games.js).
const PROC_TO_GAME = {
  'valorant.exe': 'VALORANT', 'valorant-win64-shipping.exe': 'VALORANT',
  'leagueclient.exe': 'League of Legends', 'league of legends.exe': 'League of Legends',
  'cs2.exe': 'Counter-Strike 2', 'csgo.exe': 'Counter-Strike 2',
  'fortniteclient-win64-shipping.exe': 'Fortnite',
  'r5apex.exe': 'Apex Legends',
  'gta5.exe': 'GTA V', 'gta5_enhanced.exe': 'GTA V',
  'minecraft.windows.exe': 'Minecraft',
  'robloxplayerbeta.exe': 'Roblox',
  'dota2.exe': 'Dota 2',
  'overwatch.exe': 'Overwatch 2',
  'eldenring.exe': 'Elden Ring',
  'cyberpunk2077.exe': 'Cyberpunk 2077',
  'rustclient.exe': 'Rust',
  'palworld-win64-shipping.exe': 'Palworld',
  'witcher3.exe': 'The Witcher 3',
  'rocketleague.exe': 'Rocket League',
};

function listProcesses() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve([]);
    exec('tasklist /fo csv /nh', { windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => {
      if (err || !stdout) return resolve([]);
      const names = [];
      for (const line of stdout.split(/\r?\n/)) {
        const m = line.match(/^"([^"]+)"/);
        if (m) names.push(m[1].toLowerCase());
      }
      resolve(names);
    });
  });
}

function detectGame(procs) {
  for (const p of procs) if (PROC_TO_GAME[p]) return PROC_TO_GAME[p];
  return null;
}

// Faz polling e avisa o renderer só quando o jogo muda.
function startGameScan(win, intervalMs = 12000) {
  let last = undefined;
  const tick = async () => {
    if (win.isDestroyed()) return;
    const procs = await listProcesses();
    const game = detectGame(procs);
    if (game !== last) {
      last = game;
      try { win.webContents.send('orbit:game', game); } catch {}
    }
  };
  tick();
  const timer = setInterval(tick, intervalMs);
  win.on('closed', () => clearInterval(timer));
}

module.exports = { startGameScan, detectGame, PROC_TO_GAME };
