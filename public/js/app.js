import {vigentes, ultimoCorte, cambios, resumen, rankearModelo, mejoresPorModelo, posicionArranca, aUsd, aCSV, esNuevo, PESOS} from './calc.js';
import {fmtN, fmtUsd, fmtD, pillCls, h, td, enlace, descargar} from './format.js';
import {lineas, barras, colorDe} from './charts.js';

const TABS = ['mejores', 'evolucion', 'cambios', 'corte', 'arranca', 'empresas'];
const NUM = ['imax', 'cmax', 'eur', 'wt', 'wc', 'wi'];
const $ = (id) => document.getElementById(id);
let D = null;           // datos cargados
let S = {tab: 'mejores'}; // estado (se refleja en la URL)
let ocultas = new Set();

// ---------- estado <-> URL ----------
function leerHash() {
  const [t, q = ''] = location.hash.slice(1).split('?');
  const p = new URLSearchParams(q); S = {tab: TABS.includes(t) ? t : 'mejores'};
  p.forEach((v, k) => { S[k] = NUM.includes(k) ? (v === '' ? null : Number(v)) : v; });
}
function escribirHash() {
  const p = new URLSearchParams();
  Object.entries(S).forEach(([k, v]) => { if (k !== 'tab' && v !== null && v !== undefined && v !== '' && v !== false) p.set(k, v); });
  history.replaceState(null, '', `#${S.tab}${p.toString() ? '?' + p : ''}`);
}
function set(o, draw) { Object.assign(S, o); escribirHash(); draw && draw(); }
const tasas = () => ({eurUsd: S.eur ?? D.eurUsd ?? null});
const pesos = () => ({total: S.wt ?? PESOS.total, cuota: S.wc ?? PESOS.cuota, inicial: S.wi ?? PESOS.inicial});
const opts = () => ({pesos: pesos(), iMax: S.imax ?? null, cMax: S.cmax ?? null, soloConfiable: S.conf === '1', tasas: tasas()});

// ---------- controles reutilizables ----------
const num = (k, ph, aria) => h('input', {type: 'number', min: 0, step: 'any', placeholder: ph, 'aria-label': aria, value: S[k] ?? ''});
function bindNum(el, k, draw) { el.addEventListener('input', () => set({[k]: el.value === '' ? null : Number(el.value)}, draw)); return el; }
const sortable = (cols, rows, k, dir) => rows.slice().sort((a, b) => {
  const x = a[k], y = b[k]; if (x === null || x === undefined) return 1; if (y === null || y === undefined) return -1;
  const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es', {numeric: true}); return dir === 'desc' ? -c : c;
});
function tabla(cols, rows, {clase, onRow, sortKey, onSort} = {}) {
  const head = h('tr', {}, cols.map((c) => h('th', {'aria-sort': c.k && sortKey === c.k ? (S.dir === 'desc' ? 'descending' : 'ascending') : false, class: c.m ? 'hide-m' : ''},
    onSort && c.k ? h('button', {type: 'button', onclick: () => onSort(c.k)}, c.t) : c.t)));
  const body = rows.map((r) => {
    const tr = h('tr', {class: [clase && clase(r), onRow && 'click'].filter(Boolean).join(' ') || false, onclick: onRow && (() => onRow(r)), tabindex: onRow ? 0 : false,
      onkeydown: onRow && ((e) => { if (e.key === 'Enter') onRow(r); })}, cols.map((c) => { const v = c.f ? c.f(r) : r[c.k]; const cell = v instanceof Node ? h('td', {class: c.n ? 'n' : ''}, v) : td(c.n ? fmtN(v) : (v ?? '—'), c.n ? 'n' : ''); if (c.m) cell.classList.add('hide-m'); return cell; }));
    return tr;
  });
  return h('div', {class: 'tw'}, h('table', {}, h('thead', {}, head), h('tbody', {}, body)));
}
const conf = (r) => h('span', {class: 'pill ' + pillCls(r.confianza)}, r.confianza);
const arrBadge = (r) => r.empresa === 'Arranca' ? h('span', {class: 'badge a'}, 'Arranca') : null;
const btnCSV = (nombre, rows, cols) => h('button', {class: 'b', type: 'button', onclick: () => descargar(nombre + '.csv', aCSV(rows, cols), 'text/csv;charset=utf-8')}, 'Exportar CSV');
const btnJSON = (nombre, rows) => h('button', {class: 'b', type: 'button', onclick: () => descargar(nombre + '.json', JSON.stringify(rows, null, 1), 'application/json')}, 'Exportar JSON');
const COLS_EXPORT = [{k: 'empresa', t: 'Empresa'}, {k: 'marca', t: 'Marca'}, {k: 'modelo', t: 'Modelo'}, {k: 'plan', t: 'Plan'}, {k: 'inicial', t: 'Inicial'}, {k: 'cuota', t: 'Cuota'}, {k: 'moneda_norm', t: 'Moneda'},
  {k: 'frecuencia', t: 'Frecuencia'}, {k: 'n_cuotas', t: 'N° cuotas'}, {k: 'cuota_mensual', t: 'Cuota mensual equiv.'}, {k: 'costo_total', t: 'Costo total'}, {k: 'confianza', t: 'Confianza'}, {k: 'fuente', t: 'Fuente'}, {k: 'url', t: 'URL'}, {k: 'corte', t: 'Corte'}];

// ---------- vista: mejores planes ----------
function vMejores(el) {
  const vig = D.vig;
  const modelos = [...new Set(vig.map((r) => r.modelo_clave))];
  const info = new Map(mejoresPorModelo(vig, {tasas: tasas()}).map((m) => [m.modelo, m]));
  modelos.sort((a, b) => info.get(b).empresas - info.get(a).empresas || a.localeCompare(b, 'es'));
  if (!S.modelo || !modelos.includes(S.modelo)) S.modelo = modelos[0];
  const lista = h('datalist', {id: 'dl-modelos'}, modelos.map((m) => h('option', {value: m})));
  const selM = h('select', {'aria-label': 'Modelo'}, modelos.map((m) => h('option', {value: m, selected: m === S.modelo}, `${m} (${info.get(m).empresas} ${info.get(m).empresas === 1 ? 'empresa' : 'empresas'})`)));
  const iMax = bindNum(num('imax', 'Inicial máx. US$', 'Inicial máxima en dólares'), 'imax', () => drawRes());
  const cMax = bindNum(num('cmax', 'Cuota mensual máx. US$', 'Cuota mensual máxima en dólares'), 'cmax', () => drawRes());
  const soloC = h('input', {type: 'checkbox', checked: S.conf === '1'}); soloC.addEventListener('change', () => set({conf: soloC.checked ? '1' : ''}, () => { drawRes(); drawResumen(); }));
  const slider = (k, t) => { const i = h('input', {type: 'range', min: 0, max: 1, step: 0.05, value: S[k] ?? PESOS[{wt: 'total', wc: 'cuota', wi: 'inicial'}[k]]}); i.addEventListener('input', () => set({[k]: Number(i.value)}, () => { drawRes(); drawResumen(); })); return h('label', {}, t, i); };
  const res = h('div'), resumenEl = h('div');
  selM.addEventListener('change', () => set({modelo: selM.value, cmp: ''}, () => drawRes()));

  function drawResumen() {
    const filas = mejoresPorModelo(vig, opts()).filter((m) => m.comparables > 0);
    const q = (S.qm || '').toLowerCase();
    const cols = [{t: 'Modelo', f: (m) => m.modelo}, {t: 'Empresas', k: 'empresas', n: true},
      {t: 'Mejor equilibrio', f: (m) => `${m.mejor.empresa} · ${fmtUsd(m.mejor.u_total)}`},
      {t: 'Más barato (total)', m: true, f: (m) => `${m.barato.empresa} · ${fmtUsd(m.barato.u_total)}`},
      {t: 'Menor cuota/mes', m: true, f: (m) => `${m.cuota.empresa} · ${fmtUsd(m.cuota.u_cuota_m)}`},
      {t: 'Menor inicial', m: true, f: (m) => `${m.inicial.empresa} · ${fmtUsd(m.inicial.u_inicial)}`}];
    const vis = filas.filter((m) => !q || m.modelo.toLowerCase().includes(q));
    resumenEl.replaceChildren(tabla(cols, vis, {onRow: (m) => { selM.value = m.modelo; set({modelo: m.modelo, cmp: ''}, () => drawRes()); res.scrollIntoView({behavior: 'smooth'}); }, clase: (m) => m.mejor.empresa === 'Arranca' ? 'arr' : ''}),
      h('p', {class: 'note'}, `${vis.length} modelos con planes comparables. Toque una fila para ver el detalle.`));
  }

  function drawRes() {
    const ps = vig.filter((r) => r.modelo_clave === S.modelo);
    const {ranking, sinCuota} = rankearModelo(ps, opts());
    const cmpIds = (S.cmp || '').split(',').filter(Boolean);
    const cols = [
      {t: '', f: (r) => { const c = h('input', {type: 'checkbox', 'aria-label': 'Comparar ' + r.empresa, checked: cmpIds.includes(r.id)}); c.addEventListener('change', () => { const s = new Set(cmpIds); c.checked ? s.add(r.id) : s.delete(r.id); set({cmp: [...s].slice(-4).join(',')}, drawRes); }); return c; }},
      {t: '#', f: (r) => ranking.indexOf(r) + 1, n: true},
      {t: 'Empresa', f: (r) => h('span', {}, r.empresa, ' ', arrBadge(r))},
      {t: 'Plan', k: 'plan', m: true},
      {t: 'Inicial', k: 'u_inicial', n: true, f: (r) => fmtUsd(r.u_inicial)},
      {t: 'Cuota/mes', k: 'u_cuota_m', n: true, f: (r) => fmtUsd(r.u_cuota_m)},
      {t: 'Costo total', k: 'u_total', n: true, f: (r) => fmtUsd(r.u_total)},
      {t: 'Brecha', n: true, m: true, f: (r) => r.brecha_total === 0 ? 'mejor' : '+' + fmtN(r.brecha_total) + ' %'},
      {t: 'Etiquetas', f: (r) => h('span', {}, r.insignias.map((i) => h('span', {class: 'badge ' + (i === 'Mejor equilibrio' ? 'g' : 'b')}, i)))},
      {t: 'Confianza', m: true, f: conf}, {t: 'Fuente', m: true, f: (r) => enlace(r.url, r.fuente || '—')}];
    const kids = [h('h2', {}, S.modelo), h('p', {class: 'note'}, `${ps.length} planes de ${new Set(ps.map((p) => p.empresa)).size} empresas en el corte del ${fmtD(D.ult)}. Orden: mejor equilibrio entre costo total, cuota mensual e inicial (ajuste los pesos arriba).`)];
    if (ranking.length) {
      kids.push(tabla(cols, ranking, {clase: (r) => (r.empresa === 'Arranca' ? 'arr ' : '') + (r === ranking[0] ? 'best' : '')}));
      kids.push(h('h2', {style: 'margin-top:1rem'}, 'Costo total por plan (US$)'));
      const box = h('div', {class: 'chart'}); kids.push(box);
      setTimeout(() => barras(box, ranking.slice().sort((a, b) => a.u_total - b.u_total).map((r) => ({etiqueta: `${r.empresa} · ${r.plan.split('·')[0].trim()}`, valor: r.u_total, arranca: r.empresa === 'Arranca'}))), 0);
    } else kids.push(h('p', {class: 'empty'}, 'Ningún plan completo (inicial, cuota y número de cuotas) cumple los filtros.'));
    if (sinCuota.length) kids.push(h('h2', {style: 'margin-top:1rem'}, 'Sin precio completo'), h('p', {class: 'note'}, 'No se pueden ordenar por costo total: falta cuota, número de cuotas o tasa de cambio (€).'),
      tabla([{t: 'Empresa', f: (r) => h('span', {}, r.empresa, ' ', arrBadge(r))}, {t: 'Plan', k: 'plan'}, {t: 'Inicial', n: true, f: (r) => r.inicial !== null ? `${fmtN(r.inicial)} ${r.moneda_norm}` : (r.inicial_txt || '—')},
        {t: 'Cuota', n: true, f: (r) => r.cuota !== null ? fmtN(r.cuota) : (r.cuota_txt || 'No publicada')}, {t: 'Nota', k: 'nota', m: true}, {t: 'Confianza', f: conf}], sinCuota));
    const sel = ps.filter((p) => cmpIds.includes(p.id)).map((p) => ranking.find((r) => r.id === p.id) || aUsd(p, tasas()));
    if (sel.length >= 2) kids.push(h('h2', {style: 'margin-top:1rem'}, 'Comparación'), h('div', {class: 'cmp'}, sel.map((r) => h('div', {class: 'card'}, h('strong', {}, r.empresa), h('dl', {},
      ...[['Plan', r.plan], ['Inicial', fmtUsd(r.u_inicial)], ['Cuota/mes', fmtUsd(r.u_cuota_m)], ['Costo total', fmtUsd(r.u_total)], ['N° cuotas', fmtN(r.n_cuotas)], ['Frecuencia', r.frecuencia], ['Confianza', r.confianza]]
        .flatMap(([a, b]) => [h('dt', {}, a), h('dd', {}, b)]))))));
    kids.push(h('div', {class: 'ctrls', style: 'margin-top:1rem'}, btnCSV('mejores-' + S.modelo, ranking.concat(sinCuota), COLS_EXPORT), btnJSON('mejores-' + S.modelo, ranking.concat(sinCuota)), h('button', {class: 'b', type: 'button', onclick: () => navigator.clipboard && navigator.clipboard.writeText(location.href)}, 'Copiar enlace')));
    res.replaceChildren(h('div', {class: 'card'}, kids));
  }

  el.append(lista, h('div', {class: 'card'}, h('h2', {}, 'Los mejores planes por modelo'),
    h('p', {class: 'note'}, 'Defina qué le importa: más peso al costo total, a la cuota o a la inicial. Los montos están en US$ (los planes en € se incluyen si indica la tasa).'),
    h('div', {class: 'ctrls'}, iMax, cMax, h('label', {}, soloC, 'Solo confianza Alta/Media'),
      h('label', {}, '€ → US$', bindNum(num('eur', D.eurUsd ? String(D.eurUsd) : 'p. ej. 1,08', 'Tasa euro a dólar'), 'eur', () => { drawRes(); drawResumen(); })), h('input', {type: 'search', placeholder: 'Filtrar modelos', 'aria-label': 'Filtrar modelos', value: S.qm || '', oninput: (e) => set({qm: e.target.value}, drawResumen)})),
    h('div', {class: 'pesos ctrls'}, slider('wt', 'Costo total'), slider('wc', 'Cuota'), slider('wi', 'Inicial')), resumenEl),
    h('div', {class: 'card'}, h('div', {class: 'ctrls'}, h('label', {}, 'Modelo', selM)), res));
  drawResumen(); drawRes();
}

// ---------- vista: evolución ----------
function vEvolucion(el) {
  const modelos = [...new Set(D.rows.map((r) => r.modelo_clave))].sort((a, b) => a.localeCompare(b, 'es'));
  if (!S.modelo || !modelos.includes(S.modelo)) S.modelo = D.vig.some((r) => r.modelo_clave === 'NEW HORSE') ? 'NEW HORSE' : modelos[0];
  const sel = h('select', {'aria-label': 'Modelo'}, modelos.map((m) => h('option', {value: m, selected: m === S.modelo}, m)));
  const box = h('div', {class: 'chart'}), tb = h('div');
  const draw = () => {
    const rs = D.rows.filter((r) => r.modelo_clave === S.modelo).map((r) => aUsd(r, tasas())).filter((r) => r.u_inicial !== null);
    const por = d3.group(rs, (r) => r.empresa);
    lineas(box, [...por].map(([empresa, l]) => ({empresa, pts: [...d3.group(l, (r) => r.corte)].map(([c, x]) => ({c, v: x[0].u_inicial, empresa}))})), ocultas, (e) => { ocultas.has(e) ? ocultas.delete(e) : ocultas.add(e); draw(); });
    const cortes = [...new Set(D.rows.filter((r) => r.modelo_clave === S.modelo).map((r) => r.corte))].sort().slice(-8);
    const g = d3.group(D.rows.filter((r) => r.modelo_clave === S.modelo), (r) => r.empresa + ' | ' + r.plan);
    tb.replaceChildren(h('div', {class: 'tw'}, h('table', {}, h('thead', {}, h('tr', {}, ['Empresa', 'Plan', ...cortes.map(fmtD)].map((t) => h('th', {}, t)))),
      h('tbody', {}, [...g].sort((a, b) => a[0].localeCompare(b[0], 'es')).map(([, l]) => h('tr', {}, td(l[0].empresa), td(l[0].plan), ...cortes.map((c) => { const r = l.find((x) => x.corte === c); return td(r ? (r.cuota !== null ? fmtN(r.cuota) : (r.cuota_txt || 'No publicada')) : '—', 'n'); })))))));
  };
  sel.addEventListener('change', () => set({modelo: sel.value}, draw));
  el.append(h('div', {class: 'card'}, h('h2', {}, 'Inicial por empresa en el tiempo'), h('p', {class: 'note'}, 'En US$. Toque el nombre de una empresa en la leyenda para ocultarla o mostrarla. Incluye datos históricos de prensa.'),
    h('div', {class: 'ctrls'}, h('label', {}, 'Modelo', sel)), box), h('div', {class: 'card'}, h('h2', {}, 'Cuotas del modelo, corte a corte'), h('p', {class: 'note'}, '"—" = la empresa no publicó ese plan en ese corte. Cuota tal como la publica cada empresa (en su frecuencia).'), tb));
  draw();
}

// ---------- vista: cambios ----------
function vCambios(el) {
  const res = h('div');
  const draw = () => {
    const q = (S.q || '').toLowerCase();
    const rows = cambios(D.rows).filter((r) => !q || (r.empresa + ' ' + r.modelo).toLowerCase().includes(q)).sort((a, b) => b.fecha_ahora.localeCompare(a.fecha_ahora));
    const sg = (v) => v === null ? '—' : (v > 0 ? '+' : '') + fmtN(v);
    const cls = (v) => 'n ' + (v > 0 ? 'up' : v < 0 ? 'dn' : '');
    const cols = [{t: 'Empresa', k: 'empresa'}, {t: 'Modelo', k: 'modelo'}, {t: 'Plan', k: 'plan', m: true}, {t: 'Antes', m: true, f: (r) => fmtD(r.fecha_antes)}, {t: 'Ahora', f: (r) => fmtD(r.fecha_ahora)},
      {t: 'Inicial', n: true, f: (r) => `${fmtN(r.inicial_antes)} → ${fmtN(r.inicial_ahora)}`}, {t: 'Δ inicial', f: (r) => h('span', {class: cls(r.delta_inicial)}, sg(r.delta_inicial))},
      {t: 'Cuota', n: true, f: (r) => `${fmtN(r.cuota_antes)} → ${fmtN(r.cuota_ahora)}`}, {t: 'Δ cuota', f: (r) => h('span', {class: cls(r.delta_cuota)}, sg(r.delta_cuota))}];
    res.replaceChildren(rows.length ? tabla(cols, rows) : h('p', {class: 'empty'}, 'Todavía no hay planes con dos observaciones comparables. Aparecerán desde el próximo corte.'),
      h('div', {class: 'ctrls', style: 'margin-top:.75rem'}, btnCSV('cambios', rows, [{k: 'empresa', t: 'Empresa'}, {k: 'modelo', t: 'Modelo'}, {k: 'plan', t: 'Plan'}, {k: 'fecha_antes', t: 'Antes'}, {k: 'fecha_ahora', t: 'Ahora'}, {k: 'inicial_antes', t: 'Inicial antes'}, {k: 'inicial_ahora', t: 'Inicial ahora'}, {k: 'delta_inicial', t: 'Δ inicial'}, {k: 'cuota_antes', t: 'Cuota antes'}, {k: 'cuota_ahora', t: 'Cuota ahora'}, {k: 'delta_cuota', t: 'Δ cuota'}])));
  };
  el.append(h('div', {class: 'card'}, h('h2', {}, 'Cambios frente a la observación anterior'), h('p', {class: 'note'}, 'Rojo = subió, verde = bajó. Solo se comparan precios en la misma moneda.'),
    h('div', {class: 'ctrls'}, h('input', {type: 'search', placeholder: 'Buscar empresa o modelo', 'aria-label': 'Buscar cambios', value: S.q || '', oninput: (e) => set({q: e.target.value}, draw)})), res));
  draw();
}

// ---------- vista: último corte ----------
function vCorte(el) {
  const res = h('div'); let limite = 200;
  const emps = [...new Set(D.vig.map((r) => r.empresa))].sort(), frs = [...new Set(D.vig.map((r) => r.frecuencia))].sort();
  const selE = h('select', {'aria-label': 'Empresa'}, h('option', {value: ''}, 'Todas las empresas'), emps.map((e) => h('option', {value: e, selected: e === S.emp}, e)));
  const selF = h('select', {'aria-label': 'Frecuencia'}, h('option', {value: ''}, 'Todas las frecuencias'), frs.map((e) => h('option', {value: e, selected: e === S.frec}, e)));
  selE.addEventListener('change', () => set({emp: selE.value}, draw)); selF.addEventListener('change', () => set({frec: selF.value}, draw));
  const draw = () => {
    const q = (S.q || '').toLowerCase();
    let rows = D.vig.map((r) => aUsd(r, tasas())).filter((r) => (!S.emp || r.empresa === S.emp) && (!S.frec || r.frecuencia === S.frec) && (S.imax == null || r.u_inicial === null || r.u_inicial <= S.imax) && (S.cmax == null || r.u_cuota_m === null || r.u_cuota_m <= S.cmax) && (!q || [r.empresa, r.marca, r.modelo, r.plan].join(' ').toLowerCase().includes(q)));
    if (S.sort) rows = sortable(null, rows, S.sort, S.dir);
    const cols = [{t: 'Empresa', k: 'empresa', f: (r) => h('span', {}, r.empresa, ' ', arrBadge(r))}, {t: 'Marca', k: 'marca', m: true}, {t: 'Modelo', k: 'modelo'},
      {t: 'Inicial', k: 'inicial', n: true, f: (r) => r.inicial !== null ? fmtN(r.inicial) : (r.inicial_txt || '—')}, {t: 'Mon.', k: 'moneda_norm'},
      {t: 'Cuota', k: 'cuota', n: true, f: (r) => r.cuota !== null ? fmtN(r.cuota) : (r.cuota_txt || 'No publicada')}, {t: 'Frecuencia', k: 'frecuencia', m: true}, {t: 'N°', k: 'n_cuotas', n: true, m: true},
      {t: 'Costo total', k: 'costo_total', n: true, f: (r) => fmtN(r.costo_total)}, {t: 'Confianza', k: 'confianza', f: conf}, {t: 'Fuente', k: 'fuente', m: true, f: (r) => enlace(r.url, r.fuente || '—')}];
    const shown = rows.slice(0, limite);
    res.replaceChildren(tabla(cols, shown, {sortKey: S.sort, clase: (r) => r.empresa === 'Arranca' ? 'arr' : '', onSort: (k) => { set({dir: S.sort === k && S.dir !== 'desc' ? 'desc' : 'asc', sort: k}, draw); }}),
      h('p', {class: 'note'}, `${fmtN(rows.length)} de ${fmtN(D.vig.length)} planes`), h('div', {class: 'ctrls'},
        rows.length > shown.length && h('button', {class: 'b', type: 'button', onclick: () => { limite += 200; draw(); }}, 'Ver más'), btnCSV('ultimo-corte', rows, COLS_EXPORT), btnJSON('ultimo-corte', rows)));
  };
  el.append(h('div', {class: 'card'}, h('h2', {}, 'Planes del último corte'), h('p', {class: 'note'}, 'Precios tal como los publica cada empresa. Clic en un encabezado para ordenar. Los filtros de inicial y cuota (US$) están en "Mejores planes".'),
    h('div', {class: 'ctrls'}, h('input', {type: 'search', placeholder: 'Buscar modelo, marca…', 'aria-label': 'Buscar planes', value: S.q || '', oninput: (e) => { limite = 200; set({q: e.target.value}, draw); }}), selE, selF,
      h('button', {class: 'b', type: 'button', onclick: () => { set({q: '', emp: '', frec: '', imax: null, cmax: null, sort: ''}); render(); }}, 'Limpiar filtros')), res));
  draw();
}

// ---------- vista: Arranca ----------
function vArranca(el) {
  const pos = posicionArranca(D.vig, opts());
  const ficha = D.empresas.find((e) => e.empresa === 'Arranca');
  if (!pos.length) { el.append(h('div', {class: 'card'}, h('h2', {}, 'Arranca frente al mercado'), h('p', {class: 'empty'}, 'Arranca aún no tiene planes publicados en el monitor. Cuando se registren sus precios, aquí verá su posición por modelo y la brecha frente a la mejor oferta del mercado.'),
    ...(ficha ? [h('p', {class: 'note'}, `Estado: ${ficha.estado}.`)] : []))); return; }
  const cols = [{t: 'Modelo', k: 'modelo'}, {t: 'Posición', n: true, f: (p) => p.posicion ? `${p.posicion} de ${p.comparables}` : 'sin precio completo'},
    {t: 'Costo total Arranca', n: true, f: (p) => fmtUsd(p.plan?.u_total)}, {t: 'Mejor del mercado', f: (p) => p.mejor ? `${p.mejor.empresa} · ${fmtUsd(p.mejor.u_total)}` : '—'},
    {t: 'Brecha', n: true, f: (p) => p.plan?.brecha_total === 0 ? 'es la mejor' : p.plan ? '+' + fmtN(p.plan.brecha_total) + ' %' : '—'}];
  el.append(h('div', {class: 'card'}, h('h2', {}, 'Arranca frente al mercado'), h('p', {class: 'note'}, 'Posición de Arranca en cada modelo que ofrece, según los pesos de "Mejores planes".'),
    tabla(cols, pos, {onRow: (p) => { set({modelo: p.modelo, tab: 'mejores'}); render(); }})));
}

// ---------- vista: empresas ----------
function vEmpresas(el) {
  const cols = [{t: 'Empresa', f: (e) => h('span', {}, e.empresa, ' ', e.propia && h('span', {class: 'badge a'}, 'Propia'), esNuevo(e) && h('span', {class: 'badge g'}, 'Nuevo'), e.estado === 'próximamente' && h('span', {class: 'badge w'}, 'Próximamente'))},
    {t: 'Modelo de negocio', k: 'modelo_negocio'}, {t: 'Marcas', k: 'marcas', m: true}, {t: 'Frecuencia', k: 'frecuencia', m: true}, {t: 'Plazos', k: 'plazos', m: true}, {t: 'Gastos adm.', k: 'gastos_adm'},
    {t: 'Cómo publica', k: 'como_publica', m: true}, {t: 'Confianza', f: conf}];
  const cand = D.candidatos.candidatos || [];
  el.append(...[h('div', {class: 'card'}, h('h2', {}, 'Empresas seguidas'), h('p', {class: 'note'}, 'Cada actualización quincenal busca nuevos actores del mercado; los recién incorporados llevan la etiqueta "Nuevo".'), tabla(cols, D.empresas)),
    cand.length > 0 && h('div', {class: 'card'}, h('h2', {}, 'Actores en observación'), h('p', {class: 'note'}, 'Detectados, pero sin precios publicados todavía.'),
      tabla([{t: 'Nombre', k: 'nombre'}, {t: 'Detectado', f: (c) => fmtD(c.detectado)}, {t: 'Nota', k: 'nota'}, {t: 'Fuente', f: (c) => enlace(c.url, c.fuente || '—')}], cand))].filter(Boolean));
}

const VISTAS = {mejores: vMejores, evolucion: vEvolucion, cambios: vCambios, corte: vCorte, arranca: vArranca, empresas: vEmpresas};
function render() {
  document.querySelectorAll('#tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.p === S.tab)));
  const v = $('view'); v.replaceChildren(); VISTAS[S.tab](v); escribirHash();
}

// ---------- arranque ----------
function cabecera() {
  const r = resumen(D.rows), dias = Math.floor((Date.now() - new Date(D.ult + 'T00:00:00Z')) / 864e5);
  $('takeaway').textContent = `Corte del ${fmtD(r.ultimo_corte)}: ${fmtN(r.planes)} planes de ${r.empresas} empresas para ${r.modelos} modelos. ` + (r.cortes > 1 ? `${r.cambios} planes cambiaron de precio frente al corte anterior.` : 'Primer corte quincenal; los cambios aparecerán desde el próximo.');
  const nuevos = D.empresas.filter(esNuevo).length;
  $('chips').replaceChildren(...[h('span', {class: 'badge ' + (dias > 20 ? 'w' : 'g')}, `Datos de hace ${dias} ${dias === 1 ? 'día' : 'días'}`), nuevos > 0 && h('span', {class: 'badge b'}, `${nuevos} actores nuevos`)].filter(Boolean));
  $('tiles').replaceChildren(...[['Último corte', fmtD(r.ultimo_corte)], ['Cortes registrados', fmtN(r.cortes)], ['Planes en el corte', fmtN(r.planes)], ['Empresas', fmtN(r.empresas)], ['Modelos', fmtN(r.modelos)], ['Cambios vs. dato previo', fmtN(r.cambios)]]
    .map(([a, b]) => h('div', {class: 'tile'}, h('div', {class: 'lb'}, a), h('div', {class: 'v'}, b))));
}

async function main() {
  try {
    const get = (f) => fetch('data/' + f).then((r) => { if (!r.ok) throw new Error(f); return r.json(); });
    const [rows, empresas, tas, candidatos] = await Promise.all([get('historial.json'), get('empresas.json'), get('tasas.json'), get('candidatos.json')]);
    const ult = ultimoCorte(rows), t = tas.cortes?.[ult] || {};
    D = {rows, empresas, candidatos, ult, vig: vigentes(rows), eurUsd: t.eur_usd ?? null};
  } catch (e) {
    $('takeaway').replaceChildren('No se pudieron cargar los datos. ', h('button', {class: 'b', onclick: () => location.reload()}, 'Reintentar')); return;
  }
  leerHash(); cabecera();
  document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => { S = {tab: b.dataset.p, modelo: S.modelo, eur: S.eur}; render(); }));
  addEventListener('hashchange', () => { leerHash(); render(); });
  render();
}
main();
