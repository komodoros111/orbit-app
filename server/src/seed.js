'use strict';
const { db } = require('./db');

// Loja de pontos — cards de nome, banners, fontes e cores.
const STORE_ITEMS = [
  { id: 'nc_void', kind: 'namecard', name: 'Void', price: 800, tier: 'Épico',
    data: { bg: 'linear-gradient(135deg,#000,#1c1c1c)', text: '#ffffff', accent: '#ffffff', font: 'display' } },
  { id: 'nc_chrome', kind: 'namecard', name: 'Chrome', price: 1200, tier: 'Lendário',
    data: { bg: 'linear-gradient(135deg,#2a2a2a,#e8e8e8 60%,#9a9a9a)', text: '#0a0a0a', accent: '#000', font: 'display' } },
  { id: 'nc_scanline', kind: 'namecard', name: 'Scanline', price: 950, tier: 'Épico',
    data: { bg: 'repeating-linear-gradient(0deg,#0a0a0a,#0a0a0a 2px,#161616 3px)', text: '#fff', accent: '#bdbdbd', font: 'mono' } },
  { id: 'nc_paper', kind: 'namecard', name: 'Paper', price: 400, tier: 'Comum',
    data: { bg: '#f5f5f5', text: '#0a0a0a', accent: '#000', font: 'serif' } },
  { id: 'nc_grid', kind: 'namecard', name: 'Grid HUD', price: 1500, tier: 'Lendário',
    data: { bg: 'linear-gradient(#0a0a0a,#0a0a0a), radial-gradient(circle, rgba(255,255,255,.10) 1px, transparent 1px)', text: '#fff', accent: '#fff', font: 'mono' } },

  { id: 'bn_eclipse', kind: 'banner', name: 'Eclipse', price: 700, tier: 'Épico',
    data: { bg: 'radial-gradient(circle at 70% 30%, #2b2b2b, #000 70%)' } },
  { id: 'bn_static', kind: 'banner', name: 'Static', price: 500, tier: 'Comum',
    data: { bg: 'repeating-linear-gradient(45deg,#0d0d0d,#0d0d0d 6px,#1a1a1a 6px,#1a1a1a 12px)' } },
  { id: 'bn_horizon', kind: 'banner', name: 'Horizon', price: 1100, tier: 'Lendário',
    data: { bg: 'linear-gradient(180deg,#000 0%,#202020 60%,#cfcfcf 100%)' } },

  { id: 'ft_display', kind: 'font', name: 'Fonte Display', price: 300, tier: 'Comum', data: { font: 'display' } },
  { id: 'ft_mono', kind: 'font', name: 'Fonte Mono', price: 300, tier: 'Comum', data: { font: 'mono' } },
  { id: 'ft_serif', kind: 'font', name: 'Fonte Serif', price: 300, tier: 'Comum', data: { font: 'serif' } },

  { id: 'co_white', kind: 'color', name: 'Branco Puro', price: 200, tier: 'Comum', data: { color: '#ffffff' } },
  { id: 'co_silver', kind: 'color', name: 'Prata', price: 350, tier: 'Comum', data: { color: '#c9c9c9' } },
  { id: 'co_ash', kind: 'color', name: 'Cinza Fumaça', price: 350, tier: 'Comum', data: { color: '#8a8a8a' } },
];

function seed() {
  if (db.state.meta.seeded && db.state.storeItems.length) return;
  db.state.storeItems = STORE_ITEMS;
  db.state.meta.seeded = true;
  db.persistNow();
  console.log('[seed] loja inicializada com', STORE_ITEMS.length, 'itens');
}

module.exports = { seed, STORE_ITEMS };
