// Biblioteca de ícones SVG do Orbit — stroke fino, currentColor, estética HUD/gamer.
// Uso: icon('home', 20)  ->  string SVG
const P = {
  orbit: '<circle cx="12" cy="12" r="3.4"/><ellipse cx="12" cy="12" rx="9.2" ry="4.2" transform="rotate(28 12 12)"/><circle cx="19.4" cy="8.2" r="1.25" fill="currentColor" stroke="none"/>',
  home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10.5V20h12v-9.5"/><path d="M10 20v-5h4v5"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5 13 13l-4.5 2.5L11 11z"/>',
  hash: '<path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16"/>',
  volume: '<path d="M4 9v6h3.5L13 19V5L7.5 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  forum: '<path d="M4 5h12v8H8l-4 3V5z"/><path d="M9 16h7l4 3v-9a2 2 0 0 0-2-2"/>',
  users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 6a3 3 0 0 1 0 5.6"/><path d="M16.5 14.2A5.5 5.5 0 0 1 20.5 19"/>',
  store: '<path d="M5 8h14l-1 11H6L5 8z"/><path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8"/>',
  gift: '<rect x="4" y="9" width="16" height="5"/><path d="M5 14h14v6H5zM12 9v11"/><path d="M12 9S10 4 7.5 5.2 9.5 9 12 9zm0 0s2-5 4.5-3.8S14.5 9 12 9z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M18.4 18.4l-2.1-2.1M7.7 7.7 5.6 5.6"/>',
  bot: '<rect x="5" y="8" width="14" height="10" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01"/><circle cx="12" cy="4" r="1.2" fill="currentColor" stroke="none"/><path d="M3.5 12v2M20.5 12v2"/>',
  video: '<rect x="3" y="6.5" width="13" height="11" rx="2"/><path d="M16 10.5 21 8v8l-5-2.5z"/>',
  phone: '<path d="M5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5V18a2 2 0 0 1-2 2A15 15 0 0 1 5 6a2 2 0 0 1 0-2z"/>',
  phoneOff: '<path d="M5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5V18a2 2 0 0 1-2 2A15 15 0 0 1 5 6a2 2 0 0 1 0-2z"/><path d="M3 3l18 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  crown: '<path d="M4 17h16M4 17 3 7l5 4 4-6 4 6 5-4-1 10"/>',
  shield: '<path d="M12 3 5 6v5c0 4.2 2.8 7.6 7 9 4.2-1.4 7-4.8 7-9V6l-7-3z"/>',
  ban: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
  micOff: '<path d="M9 5.5a3 3 0 0 1 6 0V11M15 13.5a3 3 0 0 1-5.6 1.5"/><path d="M5 11a7 7 0 0 0 1.5 4.3M18.5 11a7 7 0 0 1-1 3.6M12 18.5V21M8.5 21h7M4 4l16 16"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  gamepad: '<rect x="3" y="8" width="18" height="9" rx="4"/><path d="M8 11v3M6.5 12.5h3M15 12h.01M17.5 13.5h.01"/>',
  send: '<path d="M4 12 20 4l-6 16-3-7-7-1z"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="M5 12.5 10 17.5 19 7"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  chevronRight: '<path d="M9 6l6 6-6 6"/>',
  trash: '<path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M14 6l4 4"/>',
  logout: '<path d="M15 5H6v14h9M10 12h10M17 9l3 3-3 3"/>',
  camera: '<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/>',
  sparkle: '<path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3z"/><path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v10M9.5 9.2a2.4 2.4 0 0 1 4.8.3c0 2.8-4.6 1.4-4.6 4.2a2.4 2.4 0 0 0 4.8.3"/>',
  screen: '<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8 20h8M12 16.5V20"/>',
  arrowLeft: '<path d="M11 6l-6 6 6 6M5 12h14"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
  pin: '<path d="M9 3h6l-1 6 3 3v2h-5v6l-1 1-1-1v-6H4v-2l3-3-1-6z"/>',
  link: '<path d="M9 14a4 4 0 0 1 0-5l2-2a4 4 0 0 1 6 6l-1 1M15 10a4 4 0 0 1 0 5l-2 2a4 4 0 0 1-6-6l1-1"/>',
  flame: '<path d="M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c0-1 0-1.5.5-2 1.5 1.5 2.5 3.2 2.5 5a5 5 0 0 1-10 0c0-4 3-5 5-10z"/>',
  rocket: '<path d="M5 14c0-5 4-10 9-11 1 5-1 9-5 11-1 .5-3 .5-4 0z"/><path d="M9 15l-3 3M14 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM7 17c-1.5 0-3 1.5-3 3 1.5 0 3-1.5 3-3z"/>',
  grid: '<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  minimize: '<path d="M5 12h14"/>',
  maximize: '<rect x="5" y="5" width="14" height="14" rx="1"/>',
};

export function icon(name, size = 20, stroke = 1.7) {
  const inner = P[name] || P.grid;
  return `<svg class="svg-ico" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

// Logo lockup: orbit mark + wordmark
export function logoMark(size = 40) {
  return `<span class="logo-mark ico" style="width:${size}px;height:${size}px">${icon('orbit', size)}</span>`;
}

export const ICON_NAMES = Object.keys(P);
