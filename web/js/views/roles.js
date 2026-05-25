import { h, clear, toast, modal, confirmDialog } from '../ui.js';
import { icon } from '../icons.js';
import { api } from '../api.js';
import { state } from '../state.js';

export function openServerSettings(app, server) {
  const left = h('div', { style: { width: '200px', borderRight: '1px solid var(--line)', paddingRight: '14px' } });
  const right = h('div', { style: { flex: 1, paddingLeft: '18px', minWidth: 0 } });
  const body = h('div', { class: 'row', style: { alignItems: 'stretch', gap: 0 } }, left, right);

  let roles = server.roles.slice().sort((a, b) => b.position - a.position);
  let selected = roles[0];

  function refreshRoles() {
    return api.get('/api/servers/' + server.id).then(({ server: s }) => { server = s; state.currentServer = s; roles = s.roles.slice().sort((a, b) => b.position - a.position); });
  }

  function renderList() {
    clear(left);
    left.appendChild(h('button', { class: 'btn btn-sm btn-primary btn-block', html: icon('plus', 14) + '<span>Novo cargo</span>', style: { marginBottom: '12px' }, onClick: createRole }));
    for (const r of roles) {
      left.appendChild(h('div', { class: 'channel' + (selected && selected.id === r.id ? ' active' : ''), onClick: () => { selected = r; renderList(); renderEditor(); } },
        h('span', { class: 'role-dot', style: { background: r.color } }), h('span', { class: 'cname' }, r.name)));
    }
  }

  function renderEditor() {
    clear(right);
    if (!selected) { right.appendChild(h('p', { class: 'muted' }, 'Selecione um cargo.')); return; }
    const isEveryone = selected.id === server.id;
    const name = h('input', { class: 'input', value: selected.name, disabled: isEveryone ? 'true' : null });
    const color = h('input', { type: 'color', value: toHex(selected.color), style: { width: '52px', height: '38px', background: 'none', border: '1px solid var(--line)', borderRadius: '6px' }, disabled: isEveryone ? 'true' : null });

    const permGrid = h('div', { class: 'perm-grid' });
    const toggles = {};
    for (const [key, bit] of Object.entries(state.perms)) {
      const on = (selected.permissions & bit) === bit;
      const tg = h('div', { class: 'toggle' + (on ? ' on' : '') });
      tg.addEventListener('click', () => tg.classList.toggle('on'));
      toggles[key] = { tg, bit };
      permGrid.appendChild(h('div', { class: 'perm-toggle' }, h('span', {}, state.permLabels[key] || key), tg));
    }

    right.append(
      h('div', { class: 'row gap-12', style: { marginBottom: '16px' } },
        h('div', { class: 'field', style: { flex: 1, margin: 0 } }, h('label', {}, 'Nome'), name),
        h('div', { class: 'field', style: { margin: 0 } }, h('label', {}, 'Cor'), color)),
      h('label', { style: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600 } }, 'Permissões'),
      permGrid,
      h('div', { class: 'row gap-8', style: { marginTop: '16px' } },
        h('button', { class: 'btn btn-primary', onClick: async () => {
          let permissions = 0; for (const { tg, bit } of Object.values(toggles)) if (tg.classList.contains('on')) permissions |= bit;
          try { await api.patch(`/api/servers/${server.id}/roles/${selected.id}`, { name: name.value, color: color.value, permissions }); await refreshRoles(); selected = roles.find((r) => r.id === selected.id) || roles[0]; renderList(); renderEditor(); toast('Cargo salvo', 'success'); }
          catch (e) { toast(e.message, 'error'); }
        } }, 'Salvar cargo'),
        !isEveryone ? h('button', { class: 'btn', html: icon('trash', 14) + '<span>Apagar</span>', onClick: async () => {
          if (await confirmDialog({ title: 'Apagar cargo', message: 'Apagar ' + selected.name + '?', confirmLabel: 'Apagar' })) { await api.del(`/api/servers/${server.id}/roles/${selected.id}`); await refreshRoles(); selected = roles[0]; renderList(); renderEditor(); }
        } }) : null,
      ),
    );
  }

  async function createRole() {
    try { const { role } = await api.post('/api/servers/' + server.id + '/roles', { name: 'novo cargo', color: '#ffffff', permissions: 0 }); await refreshRoles(); selected = roles.find((r) => r.id === role.id); renderList(); renderEditor(); }
    catch (e) { toast(e.message, 'error'); }
  }

  renderList(); renderEditor();
  modal({ title: server.name + ' — Cargos & Permissões', wide: true, body });
}

function toHex(c) {
  if (!c) return '#ffffff';
  if (c[0] === '#') return c.length === 7 ? c : '#ffffff';
  return '#ffffff';
}
