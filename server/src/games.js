'use strict';
// Catálogo de jogos. `proc` = executáveis pra detecção (desktop).
// `cover` = capa/arte oficial. Pra jogos da Steam usamos o CDN público
// (sem chave): header.jpg. Jogos fora da Steam ficam sem capa (fallback estilizado).
const steam = (id) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`;

const GAMES = [
  { id: 'valorant', name: 'VALORANT', proc: ['VALORANT.exe', 'VALORANT-Win64-Shipping.exe'], cover: null },
  { id: 'lol', name: 'League of Legends', proc: ['LeagueClient.exe', 'League of Legends.exe'], cover: null },
  { id: 'cs2', name: 'Counter-Strike 2', proc: ['cs2.exe', 'csgo.exe'], cover: steam(730) },
  { id: 'fortnite', name: 'Fortnite', proc: ['FortniteClient-Win64-Shipping.exe'], cover: null },
  { id: 'apex', name: 'Apex Legends', proc: ['r5apex.exe'], cover: steam(1172470) },
  { id: 'gtav', name: 'GTA V', proc: ['GTA5.exe', 'GTA5_Enhanced.exe'], cover: steam(271590) },
  { id: 'minecraft', name: 'Minecraft', proc: ['Minecraft.Windows.exe'], cover: null },
  { id: 'roblox', name: 'Roblox', proc: ['RobloxPlayerBeta.exe'], cover: null },
  { id: 'dota2', name: 'Dota 2', proc: ['dota2.exe'], cover: steam(570) },
  { id: 'overwatch', name: 'Overwatch 2', proc: ['Overwatch.exe'], cover: steam(2357570) },
  { id: 'eldenring', name: 'Elden Ring', proc: ['eldenring.exe'], cover: steam(1245620) },
  { id: 'cyberpunk', name: 'Cyberpunk 2077', proc: ['Cyberpunk2077.exe'], cover: steam(1091500) },
  { id: 'rust', name: 'Rust', proc: ['RustClient.exe'], cover: steam(252490) },
  { id: 'palworld', name: 'Palworld', proc: ['Palworld-Win64-Shipping.exe'], cover: steam(1623730) },
  { id: 'witcher3', name: 'The Witcher 3', proc: ['witcher3.exe'], cover: steam(292030) },
  { id: 'rocketleague', name: 'Rocket League', proc: ['RocketLeague.exe'], cover: steam(252950) },
];

module.exports = { GAMES };
