'use strict';
// Catálogo de jogos para "jogo favorito" e "jogando agora".
// `proc` lista executáveis usados na detecção automática (desktop/gamescan).
const GAMES = [
  { id: 'valorant', name: 'VALORANT', proc: ['VALORANT.exe', 'VALORANT-Win64-Shipping.exe'] },
  { id: 'lol', name: 'League of Legends', proc: ['LeagueClient.exe', 'League of Legends.exe'] },
  { id: 'cs2', name: 'Counter-Strike 2', proc: ['cs2.exe', 'csgo.exe'] },
  { id: 'fortnite', name: 'Fortnite', proc: ['FortniteClient-Win64-Shipping.exe'] },
  { id: 'apex', name: 'Apex Legends', proc: ['r5apex.exe'] },
  { id: 'gtav', name: 'GTA V', proc: ['GTA5.exe', 'GTA5_Enhanced.exe'] },
  { id: 'minecraft', name: 'Minecraft', proc: ['Minecraft.Windows.exe'] },
  { id: 'roblox', name: 'Roblox', proc: ['RobloxPlayerBeta.exe'] },
  { id: 'dota2', name: 'Dota 2', proc: ['dota2.exe'] },
  { id: 'overwatch', name: 'Overwatch 2', proc: ['Overwatch.exe'] },
  { id: 'eldenring', name: 'Elden Ring', proc: ['eldenring.exe'] },
  { id: 'cyberpunk', name: 'Cyberpunk 2077', proc: ['Cyberpunk2077.exe'] },
  { id: 'rust', name: 'Rust', proc: ['RustClient.exe'] },
  { id: 'palworld', name: 'Palworld', proc: ['Palworld-Win64-Shipping.exe'] },
  { id: 'witcher3', name: 'The Witcher 3', proc: ['witcher3.exe'] },
  { id: 'rocketleague', name: 'Rocket League', proc: ['RocketLeague.exe'] },
];

module.exports = { GAMES };
