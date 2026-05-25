import { h, clear, toast } from '../ui.js';
import { icon } from '../icons.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { sfx } from '../sound.js';

export function renderStore(app) {
  const wrap = h('div', { class: 'store-wrap' });
  const pointsEl = h('span', {}, '—');
  const head = h('div', { class: 'store-head' },
    h('div', {},
      h('h1', {}, h('span', { class: 'ico', html: icon('store', 32) }), ' LOJA DE PONTOS'),
      h('p', { class: 'muted' }, 'Cards de nome, banners, fontes e cores — só no preto no branco.')),
    h('div', { class: 'col gap-8', style: { alignItems: 'flex-end' } },
      h('span', { class: 'points-pill' }, h('span', { class: 'ico', html: icon('coin', 18) }), pointsEl, ' pts'),
      h('span', { class: 'soon-badge', html: icon('flame', 12) + ' BETA' })),
  );
  const grid = h('div', { class: 'store-grid' });
  wrap.append(head, grid);

  function previewFor(it) {
    const d = it.data || {};
    if (it.kind === 'namecard') {
      const fontVar = { display: 'var(--font-display)', mono: 'var(--font-mono)', serif: 'var(--font-serif)' }[d.font] || 'var(--font-body)';
      return h('div', { class: 'namecard-preview', style: { background: d.bg, color: d.text, fontFamily: fontVar } },
        h('div', { class: 'dot online', style: { background: d.accent } }),
        h('div', {}, h('div', { class: 'nc-name' }, state.me.username), h('div', { style: { fontSize: '10px', opacity: .7, fontFamily: 'var(--font-mono)' } }, '#' + state.me.tag)));
    }
    if (it.kind === 'banner') return h('div', { style: { width: '210px', height: '74px', borderRadius: '8px', background: d.bg, border: '1px solid var(--line-2)' } });
    if (it.kind === 'font') { const fv = { display: 'var(--font-display)', mono: 'var(--font-mono)', serif: 'var(--font-serif)' }[d.font]; return h('div', { style: { fontFamily: fv, fontSize: '30px' } }, 'Orbit'); }
    if (it.kind === 'color') return h('div', { style: { width: '54px', height: '54px', borderRadius: '50%', background: d.color, border: '1px solid var(--line-2)' } });
    return h('div', {});
  }

  function reveal(item) {
    const fontVar = item.kind === 'namecard' ? ({ display: 'var(--font-display)', mono: 'var(--font-mono)', serif: 'var(--font-serif)' }[item.data.font] || 'var(--font-body)') : '';
    const ov = h('div', { class: 'reveal-overlay' },
      h('div', { class: 'burst' }, h('div', { class: 'ring-burst' }), h('div', { class: 'ring-burst', style: { animationDelay: '.15s' } }),
        h('div', { class: 'center', style: { position: 'absolute', inset: 0 } }, h('span', { class: 'ico', style: { width: '64px', height: '64px' }, html: icon(item.kind === 'banner' ? 'flame' : item.kind === 'font' ? 'sparkle' : item.kind === 'color' ? 'eye' : 'gift', 64) }))),
      h('div', { class: 'reveal-card center', style: { flexDirection: 'column', gap: '12px' } },
        previewFor(item),
        h('div', { style: { fontFamily: 'var(--font-display)', fontSize: '24px', letterSpacing: '1px' } }, item.name),
        h('div', { class: 'tier' }, item.tier || 'ITEM'),
        h('button', { class: 'btn btn-primary', onClick: () => ov.remove() }, 'Resgatar')),
    );
    document.body.appendChild(ov);
    sfx.reveal(); setTimeout(() => sfx.purchase(), 120);
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
  }

  function card(it, i) {
    const owned = it.owned;
    const buyBtn = owned
      ? (it.kind === 'namecard'
        ? h('button', { class: 'btn btn-sm', onClick: () => equip(it) }, 'Equipar')
        : h('span', { class: 'mono muted', style: { fontSize: '11px' } }, 'No inventário'))
      : h('button', { class: 'btn btn-sm btn-primary', html: icon('coin', 13) + '<span>' + it.price + '</span>', onClick: () => buy(it) });
    const c = h('div', { class: 'store-card', style: { animationDelay: (i * 0.04) + 's' } },
      h('div', { class: 'store-preview' }, owned ? h('span', { class: 'owned-flag' }, 'SEU') : null, previewFor(it)),
      h('div', { class: 'sc-body' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('div', { class: 'sc-name' }, it.name), h('span', { class: 'tier' }, it.tier || '')),
        h('div', { class: 'sc-row' }, h('span', { class: 'muted mono', style: { fontSize: '11px', textTransform: 'uppercase' } }, it.kind), buyBtn)));
    return c;
  }

  async function buy(it) {
    try {
      const res = await api.post('/api/store/buy', { itemId: it.id });
      state.me.points = res.points; pointsEl.textContent = res.points;
      reveal(res.item);
      load();
    } catch (e) { toast(e.message, 'error'); }
  }
  async function equip(it) {
    try { await api.patch('/api/me', { namecard: it.data }); state.me.namecard = it.data; toast('Card de nome equipado', 'success'); }
    catch (e) { toast(e.message, 'error'); }
  }

  async function load() {
    try {
      const { points, items } = await api.get('/api/store');
      pointsEl.textContent = points; state.me.points = points;
      clear(grid);
      items.forEach((it, i) => grid.appendChild(card(it, i)));
    } catch (e) { toast(e.message, 'error'); }
  }
  load();
  return wrap;
}
