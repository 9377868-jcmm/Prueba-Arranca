import {vigentes, vigentesConManual, ultimoCorte, cambios, resumen, rankearModelo, mejoresPorModelo, posicionArranca, convertir, aCSV, SIMBOLO, esNuevo, manualActivas, PESOS, SIN_MARCA} from './calc.js';
import {fmtN, fmtT, fmtUsd, fmtD, pillCls, h, td, enlace, descargar} from './format.js';
import {lineas, barras} from './charts.js';
import {vCargar} from './manual.js';

const TABS = ['mejores', 'evolucion', 'cambios', 'corte', 'arranca', 'cargar', 'empresas'];
const NOMBRES = {mejores: 'Mejores planes', evolucion: 'Evolución', cambios: 'Cambios de precio', corte: 'Último corte', arranca: 'Arranca', cargar: 'Cargar dato', empresas: 'Empresas'};
const GLOBAL = ['marca', 'emp', 'imax', 'cmax', 'conf', 'eur', 'wt', 'wc', 'wi', 'man'];
const NUM = ['imax', 'cmax', 'eur', 'wt', 'wc', 'wi'];
const $ = (id) => document.getElementById(id);
let D = null;               // datos cargados
let S = {tab: 'mejores'};   // estado (se refleja en la URL)
let ocultas = new Set();

// ---------- estado <-> URL ----------
function leerHash() {
  const [t, q = ''] = location.hash.slice(1).split('?');
  S = {tab: TABS.includes(t) ? t : 'mejores'};
  new URLSearchParams(q).forEach((v, k) => { S[k] = NUM.includes(k) ? (v === '' ? null : Number(v)) : v; });
}
function escribirHash(push = false) {
  const p = new URLSearchParams();
  Object.entries(S).forEach(([k, v]) => { if (k !== 'tab' && v !== null && v !== undefined && v !== '' && v !== false) p.set(k, v); });
  history[push ? 'pushState' : 'replaceState'](null, '', `#${S.tab}${p.toString() ? '?' + p : ''}`);
}
const set = (o, draw) => { Object.assign(S, o); escribirHash(); draw && draw(); };
const tasas = () => ({override: S.eur ?? null, porCorte: D.tasasPorCorte});
const pesos = () => ({total: S.wt ?? PESOS.total, cuota: S.wc ?? PESOS.cuota, inicial: S.wi ?? PESOS.inicial});
const opts = () => ({pesos: pesos(), iMax: S.imax ?? null, cMax: S.cmax ?? null, soloConfiable: S.conf === '1', sinManual: S.man === '0', tasas: tasas()});

// Conjuntos de trabajo con los filtros globales (marca, empresa, incluir manuales) ya aplicados.
function datos() {
  const man = S.man !== '0';
  const ok = (r) => (!S.marca || (r.marca_norm ?? SIN_MARCA) === S.marca) && (!S.emp || r.empresa === S.emp);
  const mercado = D.vigAll.filter((r) => man || r.origen !== 'manual');
  return {vig: mercado.filter(ok), rows: D.rows.filter(ok), mercado};
}
const marcaDe = (r) => r.marca_norm ?? SIN_MARCA;

// ---------- componentes ----------
const sortable = (rows, k, dir) => rows.slice().sort((a, b) => {
  const x = a[k], y = b[k]; if (x === null || x === undefined) return 1; if (y === null || y === undefined) return -1;
  const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es', {numeric: true}); return dir === 'desc' ? -c : c;
});
function tabla(cols, rows, {clase, onRow, sortKey, onSort, etiqueta} = {}) {
  const head = h('tr', {}, cols.map((c) => h('th', {scope: 'col', 'aria-sort': c.k && sortKey === c.k ? (S.dir === 'desc' ? 'descending' : 'ascending') : false, class: c.m ? 'hide-m' : ''},
    onSort && c.k ? h('button', {type: 'button', onclick: () => onSort(c.k)}, c.t) : c.t)));
  const body = rows.map((r) => h('tr', {class: [clase && clase(r), onRow && 'click'].filter(Boolean).join(' ') || false, onclick: onRow && (() => onRow(r)), tabindex: onRow ? 0 : false,
    onkeydown: onRow && ((e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRow(r); } })},
  cols.map((c) => { const v = c.f ? c.f(r) : r[c.k]; const cell = v instanceof Node ? h('td', {class: c.n ? 'n' : ''}, v) : td(c.n ? fmtN(v) : (v ?? '—'), c.n ? 'n' : ''); if (c.m) cell.classList.add('hide-m'); return cell; })));
  return h('div', {class: 'tw', role: 'region', 'aria-label': etiqueta || 'Tabla', tabindex: 0}, h('table', {}, h('thead', {}, head), h('tbody', {}, body)));
}
const conf = (r) => h('span', {class: 'pill ' + pillCls(r.confianza)}, r.confianza);
// Monto en US$; si venía en euros, se marca "convertido" y se muestra el original y la tasa.
const hayConv = (r) => r.conv && (r.conv.inicial || r.conv.cuota);
function monto(r, k) {
  const u = {inicial: r.u_inicial, cuota: r.u_cuota_m, total: r.u_total}[k];
  if (u === null || u === undefined) return r.falta_tasa ? h('span', {class: 'sub-t'}, 'falta tasa del €') : '—';
  const conv = k === 'total' ? hayConv(r) : r.conv[k];
  if (!conv) return fmtUsd(u);
  const orig = k === 'inicial' ? `${SIMBOLO[r.moneda_inicial]} ${fmtN(r.inicial)}` : k === 'cuota' ? `${SIMBOLO[r.moneda_cuota]} ${fmtN(r.cuota_mensual)}/mes`
    : `${r.conv.inicial ? 'inicial' : ''}${r.conv.inicial && r.conv.cuota ? ' y ' : ''}${r.conv.cuota ? 'cuota' : ''} convertida`;
  const tit = `Convertido de € a US$ con la tasa ${fmtT(r.conv.tasa)} (${r.conv.origen === 'usuario' ? 'la que usted escribió' : 'BCV, ' + fmtD(r.conv.tasa_fecha)})`;
  return h('span', {}, '≈ ' + fmtUsd(u), ' ', h('span', {class: 'badge c', title: tit}, 'convertido'), h('div', {class: 'sub-t'}, orig + (k === 'total' ? '' : ' × ' + fmtT(r.conv.tasa))));
}
const txtUsd = (r, v) => (v === null || v === undefined ? '—' : (hayConv(r) ? '≈ ' : '') + fmtUsd(v));
const leyenda = () => h('p', {class: 'note'}, 'convertido = el precio estaba en euros y se pasó a US$ con la tasa indicada (la del BCV para ese corte o la que usted escriba en los filtros). Sin la etiqueta, el monto se publicó en US$.');
const leyendaSi = (cond) => (cond ? leyenda() : document.createDocumentFragment());
const monedas = (r) => (r.mixto ? `inicial ${SIMBOLO[r.moneda_inicial]} · cuota ${SIMBOLO[r.moneda_cuota]}` : SIMBOLO[r.moneda_inicial] || '—');
// Campos extra para exportar: moneda de cada componente, tasa usada y si hubo conversión.
const planoExport = (rows) => rows.map((r) => ({...r, tasa_eur_usd: r.conv?.tasa ?? '', inicial_convertida: r.conv ? (r.conv.inicial ? 'Sí' : 'No') : '', cuota_convertida: r.conv ? (r.conv.cuota ? 'Sí' : 'No') : ''}));
const insMarca = (r) => [r.empresa === 'Arranca' && h('span', {class: 'badge a'}, 'Arranca'),
  r.origen === 'manual' && h('span', {class: 'badge m', title: `Dato manual: ${r.man.fuente}. Registrado por ${r.man.registrado_por} el ${r.man.registrado}. Vence el ${r.man.vence}.`}, 'Manual · ' + fmtD(r.fecha_dato))];
const celdaPlan = (r, extra = []) => h('div', {}, h('strong', {}, r.empresa), ' ', ...insMarca(r), h('div', {class: 'sub-t'}, r.plan), extra.length > 0 && h('div', {}, extra),
  r.previo && h('div', {class: 'sub-t'}, `antes: ${fmtN(r.previo.inicial)} inicial · ${fmtN(r.previo.cuota)} cuota (corte ${fmtD(r.previo.corte)})`));
const btnCSV = (nombre, rows, cols) => h('button', {class: 'b', type: 'button', onclick: () => descargar(nombre + '.csv', aCSV(planoExport(rows), cols), 'text/csv;charset=utf-8')}, 'Exportar CSV');
const btnJSON = (nombre, rows) => h('button', {class: 'b', type: 'button', onclick: () => descargar(nombre + '.json', JSON.stringify(planoExport(rows), null, 1), 'application/json')}, 'Exportar JSON');
const btnEnlace = () => h('button', {class: 'b', type: 'button', onclick: (ev) => { navigator.clipboard && navigator.clipboard.writeText(location.href); const b = ev.currentTarget; b.textContent = '¡Enlace copiado!'; setTimeout(() => { b.textContent = 'Copiar enlace'; }, 1800); }}, 'Copiar enlace');
const hintMovil = () => h('p', {class: 'note hint-m'}, 'Deslice la tabla hacia los lados para ver más columnas.');
const COLS_EXPORT = [{k: 'empresa', t: 'Empresa'}, {k: 'marca_norm', t: 'Marca'}, {k: 'modelo', t: 'Modelo'}, {k: 'plan', t: 'Plan'}, {k: 'inicial', t: 'Inicial (original)'}, {k: 'moneda_inicial', t: 'Moneda inicial'},
  {k: 'cuota', t: 'Cuota (original)'}, {k: 'moneda_cuota', t: 'Moneda cuota'}, {k: 'frecuencia', t: 'Frecuencia'}, {k: 'n_cuotas', t: 'N° cuotas'}, {k: 'tasa_eur_usd', t: 'Tasa € a US$'}, {k: 'inicial_convertida', t: 'Inicial convertida'}, {k: 'cuota_convertida', t: 'Cuota convertida'},
  {k: 'u_inicial', t: 'Inicial US$'}, {k: 'u_cuota_m', t: 'Cuota mensual US$'}, {k: 'u_total', t: 'Costo total US$'}, {k: 'confianza', t: 'Confianza'}, {k: 'origen', t: 'Origen'}, {k: 'fuente', t: 'Fuente'}, {k: 'url', t: 'URL'}, {k: 'corte', t: 'Corte'}];

// ---------- barra de filtros global ----------
const barra = {};
function construirBarra() {
  const cuenta = new Map();
  D.vigAll.forEach((r) => cuenta.set(marcaDe(r), (cuenta.get(marcaDe(r)) || 0) + 1));
  const marcas = [...cuenta].sort((a, b) => (a[0] === SIN_MARCA) - (b[0] === SIN_MARCA) || b[1] - a[1] || a[0].localeCompare(b[0], 'es'));
  const empresas = [...new Set(D.vigAll.map((r) => r.empresa))].sort((a, b) => a.localeCompare(b, 'es'));
  const campo = (t, c) => h('label', {class: 'cf'}, h('span', {}, t), c);
  const numIn = (k, t) => { const i = h('input', {type: 'number', min: 0, step: 'any', inputmode: 'decimal'}); i.addEventListener('input', () => cambiarGlobal({[k]: i.value === '' ? null : Number(i.value)})); barra[k] = i; return campo(t, i); };
  barra.marca = h('select', {}, h('option', {value: ''}, 'Todas las marcas'), marcas.map(([m, n]) => h('option', {value: m}, `${m} (${n})`)));
  barra.emp = h('select', {}, h('option', {value: ''}, 'Todas las empresas'), empresas.map((e) => h('option', {value: e}, e)));
  barra.marca.addEventListener('change', () => cambiarGlobal({marca: barra.marca.value}));
  barra.emp.addEventListener('change', () => cambiarGlobal({emp: barra.emp.value}));
  barra.conf = h('input', {type: 'checkbox'}); barra.conf.addEventListener('change', () => cambiarGlobal({conf: barra.conf.checked ? '1' : ''}));
  barra.man = h('input', {type: 'checkbox'}); barra.man.addEventListener('change', () => cambiarGlobal({man: barra.man.checked ? '' : '0'}));
  barra.chips = h('div', {class: 'chips-f'});
  const cont = $('filtros-cont');
  cont.append(h('div', {class: 'fgrid'}, campo('Marca', barra.marca), campo('Empresa', barra.emp), numIn('imax', 'Inicial máx. (US$)'), numIn('cmax', 'Cuota mensual máx. (US$)'), numIn('eur', 'Tasa € → US$ (vacío = BCV)'),
    h('label', {class: 'cf chk'}, barra.conf, h('span', {}, 'Solo confianza Alta/Media')), h('label', {class: 'cf chk'}, barra.man, h('span', {}, 'Incluir datos manuales'))), barra.chips);
  if (matchMedia('(max-width: 640px)').matches) $('filtros').open = false;
  sincronizarBarra();
}
function sincronizarBarra() {
  barra.marca.value = S.marca || ''; barra.emp.value = S.emp || '';
  ['imax', 'cmax', 'eur'].forEach((k) => { if (document.activeElement !== barra[k]) barra[k].value = S[k] ?? ''; });
  barra.eur.placeholder = D.tasaActual ? 'BCV ' + fmtT(D.tasaActual) : 'p. ej. 1,08';
  barra.conf.checked = S.conf === '1'; barra.man.checked = S.man !== '0';
  const chips = [];
  const chip = (t, k) => h('button', {type: 'button', class: 'chip', onclick: () => cambiarGlobal({[k]: k === 'man' ? '' : null}, true), 'aria-label': `Quitar filtro: ${t}`}, t, ' ×');
  if (S.marca) chips.push(chip('Marca: ' + S.marca, 'marca'));
  if (S.emp) chips.push(chip('Empresa: ' + S.emp, 'emp'));
  if (S.imax != null) chips.push(chip('Inicial ≤ US$' + fmtN(S.imax), 'imax'));
  if (S.cmax != null) chips.push(chip('Cuota/mes ≤ US$' + fmtN(S.cmax), 'cmax'));
  if (S.conf === '1') chips.push(chip('Solo confianza Alta/Media', 'conf'));
  if (S.man === '0') chips.push(chip('Sin datos manuales', 'man'));
  if (chips.length) chips.push(h('button', {type: 'button', class: 'b', onclick: () => { GLOBAL.forEach((k) => { if (!['wt', 'wc', 'wi', 'eur'].includes(k)) delete S[k]; }); escribirHash(); sincronizarBarra(); renderVista(); }}, 'Limpiar todo'));
  barra.chips.replaceChildren(...chips);
  $('filtros-n').textContent = chips.length ? ` (${chips.length - 1})` : '';
  const {vig} = datos();
  $('contador').textContent = `${fmtN(vig.length)} planes de ${new Set(vig.map((r) => r.modelo_clave)).size} modelos con estos filtros`;
}
function cambiarGlobal(o, vacio = false) {
  Object.entries(o).forEach(([k, v]) => { if (v === null || v === '' || vacio) delete S[k]; else S[k] = v; });
  if (o.man === '0') S.man = '0';
  escribirHash(); sincronizarBarra(); renderVista();
}

// ---------- vista: mejores planes ----------
function vMejores(el) {
  const {vig} = datos();
  const o = opts();
  const info = new Map(mejoresPorModelo(vig, o).map((m) => [m.modelo, m]));
  const modelosTodos = [...new Set(vig.map((r) => r.modelo_clave))].sort((a, b) => ((info.get(b)?.empresas || 0) - (info.get(a)?.empresas || 0)) || a.localeCompare(b, 'es'));
  if (!modelosTodos.length) { el.append(h('div', {class: 'card'}, h('p', {class: 'empty'}, 'No hay planes con estos filtros. Quite alguno desde la barra de filtros.'))); return; }
  if (!S.modelo || !modelosTodos.includes(S.modelo)) S.modelo = modelosTodos[0];
  let lim = 25;
  const res = h('div'), resumenEl = h('div');
  const selM = h('input', {type: 'search', list: 'dl-modelos', value: S.modelo, 'aria-label': 'Modelo', placeholder: 'Escriba un modelo'});
  selM.addEventListener('change', () => { const m = modelosTodos.find((x) => x.toLowerCase() === selM.value.trim().toLowerCase()); if (m) set({modelo: m, cmp: ''}, drawRes); else selM.value = S.modelo; });
  const sliderVal = (k) => Math.round((S[k] ?? PESOS[{wt: 'total', wc: 'cuota', wi: 'inicial'}[k]]) * 100);
  const slider = (k, t) => {
    const out = h('output', {}, sliderVal(k) + ' %');
    const i = h('input', {type: 'range', min: 0, max: 100, step: 5, value: sliderVal(k), 'aria-label': t + ' (peso en el equilibrio)'});
    i.addEventListener('input', () => { out.textContent = i.value + ' %'; i.setAttribute('aria-valuetext', i.value + ' por ciento'); set({[k]: Number(i.value) / 100}, () => { drawRes(); drawResumen(); }); });
    return h('label', {class: 'cf'}, h('span', {}, t, ' ', out), i);
  };
  const todos = h('input', {type: 'checkbox', checked: S.todos === '1'}); todos.addEventListener('change', () => { lim = 25; set({todos: todos.checked ? '1' : ''}, drawResumen); });
  const q = h('input', {type: 'search', placeholder: 'Filtrar modelos', 'aria-label': 'Filtrar modelos', value: S.qm || ''});
  q.addEventListener('input', () => { lim = 25; set({qm: q.value}, drawResumen); });

  function drawResumen() {
    const todas = mejoresPorModelo(vig, o).filter((m) => m.comparables > 0);
    const filas = todas.filter((m) => (S.todos === '1' || m.empresas >= 2) && (!S.qm || m.modelo.toLowerCase().includes(S.qm.toLowerCase())));
    const celda = (p, v) => h('div', {}, h('strong', {}, p.empresa), ' ', ...insMarca(p), h('div', {class: 'sub-t'}, v));
    const cols = [{t: 'Modelo', f: (m) => h('strong', {}, m.modelo)}, {t: 'Empresas', k: 'empresas', n: true, m: true},
      {t: 'Mejor equilibrio', f: (m) => celda(m.mejor, `${txtUsd(m.mejor, m.mejor.u_total)} en total`)},
      {t: 'Más barato', m: true, f: (m) => celda(m.barato, txtUsd(m.barato, m.barato.u_total))}, {t: 'Menor cuota/mes', m: true, f: (m) => celda(m.cuota, txtUsd(m.cuota, m.cuota.u_cuota_m))}, {t: 'Menor inicial', m: true, f: (m) => celda(m.inicial, txtUsd(m.inicial, m.inicial.u_inicial))}];
    resumenEl.replaceChildren(tabla(cols, filas.slice(0, lim), {etiqueta: 'Mejores planes por modelo', onRow: (m) => { selM.value = m.modelo; set({modelo: m.modelo, cmp: ''}, drawRes); selM.scrollIntoView({behavior: 'smooth', block: 'center'}); }, clase: (m) => m.mejor.empresa === 'Arranca' ? 'arr' : ''}),
      h('p', {class: 'note'}, `${fmtN(filas.length)} modelos` + (S.todos === '1' ? '' : ' con 2 o más empresas') + '. Toque una fila para ver el detalle.'),
      filas.length > lim && h('button', {class: 'b', type: 'button', onclick: () => { lim += 25; drawResumen(); }}, 'Ver más modelos'));
  }

  function drawRes() {
    const ps = vig.filter((r) => r.modelo_clave === S.modelo);
    const {ranking, sinCuota} = rankearModelo(ps, o);
    const cmpIds = (S.cmp || '').split(',').filter(Boolean);
    const cols = [
      {t: 'Comparar', f: (r) => { const c = h('input', {type: 'checkbox', 'aria-label': 'Comparar ' + r.empresa + ' ' + r.plan, checked: cmpIds.includes(r.id)}); c.addEventListener('change', () => { const s = new Set(cmpIds); c.checked ? s.add(r.id) : s.delete(r.id); set({cmp: [...s].slice(-4).join(',')}, drawRes); }); return c; }},
      {t: '#', f: (r) => ranking.indexOf(r) + 1, n: true},
      {t: 'Empresa y plan', f: (r) => celdaPlan(r, r.insignias.map((i) => h('span', {class: 'badge ' + (i === 'Mejor equilibrio' ? 'g' : 'b')}, i)))},
      {t: 'Costo total', k: 'u_total', n: true, f: (r) => monto(r, 'total')},
      {t: 'Cuota/mes', k: 'u_cuota_m', n: true, f: (r) => monto(r, 'cuota')},
      {t: 'Inicial', k: 'u_inicial', n: true, f: (r) => monto(r, 'inicial')},
      {t: 'Brecha', n: true, m: true, f: (r) => r.brecha_total === 0 ? 'mejor' : '+' + fmtN(r.brecha_total) + ' %'},
      {t: 'Confianza', m: true, f: conf}, {t: 'Fuente', m: true, f: (r) => enlace(r.url, r.fuente || '—')}];
    const kids = [h('h2', {}, S.modelo), h('p', {class: 'note'}, `${ps.length} planes de ${new Set(ps.map((p) => p.empresa)).size} empresas. Orden: mejor equilibrio entre costo total, cuota mensual e inicial según sus prioridades.`)];
    const lider = ranking[0];
    if (lider && lider.origen === 'manual') kids.push(h('p', {class: 'note'}, `El primer lugar es un dato manual del ${fmtD(lider.fecha_dato)} (confianza ${lider.confianza}); verifíquelo con la empresa.`));
    if (ranking.length) {
      kids.push(hintMovil(), tabla(cols, ranking, {etiqueta: 'Ranking del modelo', clase: (r) => (r.empresa === 'Arranca' ? 'arr ' : '') + (r.origen === 'manual' ? 'man ' : '') + (r === ranking[0] ? 'best' : '')}));
      if (ranking.some(hayConv)) kids.push(leyenda());
      kids.push(h('h3', {}, 'Costo total por plan (US$)'));
      const box = h('div', {class: 'chart'}); kids.push(box);
      setTimeout(() => barras(box, ranking.slice().sort((a, b) => a.u_total - b.u_total).map((r) => ({etiqueta: `${r.empresa} · ${r.plan.split('·')[0].trim()}`, valor: r.u_total, arranca: r.empresa === 'Arranca'}))), 0);
    } else kids.push(h('p', {class: 'empty'}, 'Ningún plan completo (inicial, cuota y número de cuotas) cumple los filtros.'));
    if (sinCuota.length) kids.push(h('h3', {}, 'Sin precio completo'), h('p', {class: 'note'}, 'No se pueden ordenar por costo total: falta cuota, número de cuotas o la tasa del euro.'),
      tabla([{t: 'Empresa y plan', f: (r) => celdaPlan(r)}, {t: 'Inicial', n: true, f: (r) => r.inicial !== null ? `${SIMBOLO[r.moneda_inicial]} ${fmtN(r.inicial)}` : (r.inicial_txt || '—')},
        {t: 'Cuota', n: true, f: (r) => r.cuota !== null ? `${SIMBOLO[r.moneda_cuota]} ${fmtN(r.cuota)}` : (r.cuota_txt || 'No publicada')}, {t: 'Motivo', f: (r) => r.falta_tasa ? 'Falta la tasa del euro' : 'Falta cuota o n.° de cuotas'}, {t: 'Nota', k: 'nota', m: true}, {t: 'Confianza', f: conf}], sinCuota, {etiqueta: 'Planes sin precio completo'}));
    const sel = ps.filter((p) => cmpIds.includes(p.id)).map((p) => ranking.find((r) => r.id === p.id) || convertir(p, tasas()));
    if (sel.length >= 2) kids.push(h('h3', {}, 'Comparación'), h('div', {class: 'cmp'}, sel.map((r) => h('div', {class: 'card'}, h('strong', {}, r.empresa), h('dl', {},
      ...[['Plan', r.plan], ['Inicial', monto(r, 'inicial')], ['Cuota/mes', monto(r, 'cuota')], ['Costo total', monto(r, 'total')], ['N° cuotas', fmtN(r.n_cuotas)], ['Frecuencia', r.frecuencia], ['Confianza', r.confianza]]
        .flatMap(([a, b]) => [h('dt', {}, a), h('dd', {}, b)]))))));
    kids.push(h('div', {class: 'ctrls mt'}, btnCSV('mejores-' + S.modelo, ranking.concat(sinCuota), COLS_EXPORT), btnJSON('mejores-' + S.modelo, ranking.concat(sinCuota)), btnEnlace()));
    res.replaceChildren(h('div', {class: 'card'}, kids));
  }

  el.append(h('datalist', {id: 'dl-modelos'}, modelosTodos.map((m) => h('option', {value: m}))),
    h('div', {class: 'card'}, h('h2', {}, 'Los mejores planes por modelo'),
      h('p', {class: 'note'}, 'Montos en US$ (los planes en € entran si indica la tasa en los filtros). Defina qué le importa más al ordenar:'),
      h('div', {class: 'pesos'}, slider('wt', 'Costo total'), slider('wc', 'Cuota'), slider('wi', 'Inicial'), h('button', {class: 'b', type: 'button', onclick: () => { delete S.wt; delete S.wc; delete S.wi; escribirHash(); renderVista(); }}, 'Restablecer')),
      h('div', {class: 'ctrls'}, q, h('label', {class: 'cf chk'}, todos, h('span', {}, 'Incluir modelos de una sola empresa'))), hintMovil(), resumenEl),
    h('div', {class: 'card'}, h('div', {class: 'ctrls'}, h('label', {class: 'cf'}, h('span', {}, 'Modelo'), selM)), res));
  drawResumen(); drawRes();
}

// ---------- vista: evolución ----------
// Datos manuales como observaciones históricas (cada uno en su fecha); un dato real del mismo plan y fecha gana.
function manualesParaEvolucion() {
  if (S.man === '0') return [];
  const ok = (r) => (!S.marca || (r.marca_norm ?? SIN_MARCA) === S.marca) && (!S.emp || r.empresa === S.emp);
  return D.manual.entradas.filter((e) => e.tipo === 'precio').map((e) => e.fila).filter(ok);
}
function vEvolucion(el) {
  const reales = datos().rows, claves = new Set(reales.map((r) => r.id + '|' + r.corte));
  const rows = reales.concat(manualesParaEvolucion().filter((m) => !claves.has(m.id + '|' + m.corte)));
  const cuentaE = d3.rollup(rows, (v) => new Set(v.map((r) => r.empresa)).size, (r) => r.modelo_clave);
  const modelos = [...cuentaE.keys()].sort((a, b) => cuentaE.get(b) - cuentaE.get(a) || a.localeCompare(b, 'es'));
  if (!modelos.length) { el.append(h('div', {class: 'card'}, h('p', {class: 'empty'}, 'No hay datos con estos filtros.'))); return; }
  if (!S.modelo || !modelos.includes(S.modelo)) S.modelo = modelos[0];
  const inp = h('input', {type: 'search', list: 'dl-modelos-e', value: S.modelo, 'aria-label': 'Modelo', placeholder: 'Escriba un modelo'});
  const box = h('div', {class: 'chart'}), tb = h('div');
  const draw = () => {
    const rs = rows.filter((r) => r.modelo_clave === S.modelo);
    const us = rs.map((r) => convertir(r, tasas())).filter((r) => r.u_inicial !== null);
    lineas(box, [...d3.group(us, (r) => r.empresa)].map(([empresa, l]) => ({empresa, pts: [...d3.group(l, (r) => r.corte)].map(([c, x]) => ({c, v: x[0].u_inicial, empresa, man: x[0].origen === 'manual', orig: x[0].conv.inicial ? `${SIMBOLO[x[0].moneda_inicial]} ${fmtN(x[0].inicial)} × ${fmtT(x[0].conv.tasa)}` : null}))})), ocultas, (e) => { ocultas.has(e) ? ocultas.delete(e) : ocultas.add(e); draw(); });
    const cortes = [...new Set(rs.map((r) => r.corte))].sort().slice(-8);
    const g = d3.group(rs, (r) => r.empresa + ' | ' + r.plan);
    tb.replaceChildren(h('div', {class: 'tw', role: 'region', 'aria-label': 'Cuotas por corte', tabindex: 0}, h('table', {}, h('thead', {}, h('tr', {}, ['Empresa', 'Plan', ...cortes.map(fmtD)].map((t) => h('th', {scope: 'col'}, t)))),
      h('tbody', {}, [...g].sort((a, b) => a[0].localeCompare(b[0], 'es')).map(([, l]) => h('tr', {}, td(l[0].empresa), td(l[0].plan), ...cortes.map((c) => { const r = l.find((x) => x.corte === c); return td(r ? (r.cuota !== null ? `${fmtN(r.cuota)} ${r.moneda_norm === 'EUR' ? '€' : r.moneda_norm === 'USD' ? 'US$' : ''}` : (r.cuota_txt || 'No publicada')) + (r.origen === 'manual' ? ' (manual)' : '') : '—', 'n'); })))))));
  };
  inp.addEventListener('change', () => { const m = modelos.find((x) => x.toLowerCase() === inp.value.trim().toLowerCase()); if (m) set({modelo: m}, draw); else inp.value = S.modelo; });
  el.append(h('datalist', {id: 'dl-modelos-e'}, modelos.map((m) => h('option', {value: m}))), h('div', {class: 'card'}, h('h2', {}, 'Inicial por empresa en el tiempo'),
    h('p', {class: 'note'}, 'En US$. Toque el nombre de una empresa en la leyenda para ocultarla o mostrarla. Incluye datos históricos de prensa; los puntos huecos son datos cargados a mano.'),
    h('div', {class: 'ctrls'}, h('label', {class: 'cf'}, h('span', {}, 'Modelo'), inp)), box), h('div', {class: 'card'}, h('h2', {}, 'Cuotas del modelo, corte a corte'), h('p', {class: 'note'}, '"—" = la empresa no publicó ese plan en ese corte. La cuota va en la moneda y la frecuencia de cada empresa.'), hintMovil(), tb));
  draw();
}

// ---------- vista: cambios ----------
function vCambios(el) {
  const res = h('div');
  const base = cambios(datos().rows);
  const draw = () => {
    const q = (S.q || '').toLowerCase();
    const rows = base.filter((r) => !q || (r.empresa + ' ' + r.modelo).toLowerCase().includes(q)).sort((a, b) => b.fecha_ahora.localeCompare(a.fecha_ahora));
    const sg = (v) => v === null ? '—' : (v > 0 ? '+' : '') + fmtN(v);
    const cls = (v) => 'n ' + (v > 0 ? 'up' : v < 0 ? 'dn' : '');
    const cols = [{t: 'Empresa', k: 'empresa'}, {t: 'Modelo', k: 'modelo'}, {t: 'Plan', k: 'plan', m: true}, {t: 'Antes', m: true, f: (r) => fmtD(r.fecha_antes)}, {t: 'Ahora', f: (r) => fmtD(r.fecha_ahora)},
      {t: 'Inicial', n: true, f: (r) => `${fmtN(r.inicial_antes)} → ${fmtN(r.inicial_ahora)}`}, {t: 'Δ inicial', f: (r) => h('span', {class: cls(r.delta_inicial)}, sg(r.delta_inicial))},
      {t: 'Cuota', n: true, f: (r) => `${fmtN(r.cuota_antes)} → ${fmtN(r.cuota_ahora)}`}, {t: 'Δ cuota', f: (r) => h('span', {class: cls(r.delta_cuota)}, sg(r.delta_cuota))}];
    res.replaceChildren(rows.length ? tabla(cols, rows, {etiqueta: 'Cambios de precio'}) : h('p', {class: 'empty'}, 'Todavía no hay planes con dos observaciones comparables en estos filtros. Aparecerán desde el próximo corte.'),
      h('div', {class: 'ctrls mt'}, btnCSV('cambios', rows, [{k: 'empresa', t: 'Empresa'}, {k: 'modelo', t: 'Modelo'}, {k: 'plan', t: 'Plan'}, {k: 'fecha_antes', t: 'Antes'}, {k: 'fecha_ahora', t: 'Ahora'}, {k: 'inicial_antes', t: 'Inicial antes'}, {k: 'inicial_ahora', t: 'Inicial ahora'}, {k: 'delta_inicial', t: 'Δ inicial'}, {k: 'cuota_antes', t: 'Cuota antes'}, {k: 'cuota_ahora', t: 'Cuota ahora'}, {k: 'delta_cuota', t: 'Δ cuota'}])));
  };
  el.append(h('div', {class: 'card'}, h('h2', {}, 'Cambios frente a la observación anterior'), h('p', {class: 'note'}, 'Rojo = subió, verde = bajó. Solo compara precios en la misma moneda y no incluye datos manuales.'),
    h('div', {class: 'ctrls'}, h('input', {type: 'search', placeholder: 'Buscar empresa o modelo', 'aria-label': 'Buscar cambios', value: S.q || '', oninput: (e) => set({q: e.target.value}, draw)})), hintMovil(), res));
  draw();
}

// ---------- vista: último corte ----------
function vCorte(el) {
  const res = h('div'); let limite = 200;
  const {vig} = datos();
  const frs = [...new Set(vig.map((r) => r.frecuencia))].sort();
  const selF = h('select', {'aria-label': 'Frecuencia'}, h('option', {value: ''}, 'Todas las frecuencias'), frs.map((e) => h('option', {value: e, selected: e === S.frec}, e)));
  selF.addEventListener('change', () => set({frec: selF.value}, draw));
  const draw = () => {
    const q = (S.q || '').toLowerCase();
    let rows = vig.map((r) => convertir(r, tasas())).filter((r) => (!S.frec || r.frecuencia === S.frec) && (S.imax == null || r.u_inicial === null || r.u_inicial <= S.imax) && (S.cmax == null || r.u_cuota_m === null || r.u_cuota_m <= S.cmax) && (!q || [r.empresa, r.marca, r.modelo, r.plan].join(' ').toLowerCase().includes(q)));
    if (S.sort) rows = sortable(rows, S.sort, S.dir);
    const cols = [{t: 'Empresa', k: 'empresa', f: (r) => h('span', {}, r.empresa, ' ', ...insMarca(r))}, {t: 'Marca', k: 'marca_norm', m: true, f: marcaDe}, {t: 'Modelo', k: 'modelo'},
      {t: 'Inicial', k: 'inicial', n: true, f: (r) => r.inicial !== null ? `${SIMBOLO[r.moneda_inicial]} ${fmtN(r.inicial)}` : (r.inicial_txt || '—')}, {t: 'Monedas', k: 'moneda_norm', m: true, f: monedas},
      {t: 'Cuota', k: 'cuota', n: true, f: (r) => r.cuota !== null ? `${SIMBOLO[r.moneda_cuota]} ${fmtN(r.cuota)}` : (r.cuota_txt || 'No publicada')}, {t: 'Frecuencia', k: 'frecuencia', m: true}, {t: 'N°', k: 'n_cuotas', n: true, m: true},
      {t: 'Costo total', k: 'u_total', n: true, f: (r) => monto(r, 'total')}, {t: 'Confianza', k: 'confianza', f: conf}, {t: 'Fuente', k: 'fuente', m: true, f: (r) => enlace(r.url, r.fuente || '—')}];
    const shown = rows.slice(0, limite);
    res.replaceChildren(hintMovil(), leyendaSi(rows.some(hayConv)), tabla(cols, shown, {etiqueta: 'Planes del último corte', sortKey: S.sort, clase: (r) => (r.empresa === 'Arranca' ? 'arr ' : '') + (r.origen === 'manual' ? 'man' : ''), onSort: (k) => { set({dir: S.sort === k && S.dir !== 'desc' ? 'desc' : 'asc', sort: k}, draw); }}),
      h('p', {class: 'note'}, `${fmtN(rows.length)} de ${fmtN(vig.length)} planes`), h('div', {class: 'ctrls'},
        rows.length > shown.length && h('button', {class: 'b', type: 'button', onclick: () => { limite += 200; draw(); }}, 'Ver más'), btnCSV('ultimo-corte', rows, COLS_EXPORT), btnJSON('ultimo-corte', rows), btnEnlace()));
  };
  el.append(h('div', {class: 'card'}, h('h2', {}, 'Planes del último corte'), h('p', {class: 'note'}, 'Precios tal como los publica cada empresa. Toque un encabezado para ordenar. La marca, la empresa y los topes de precio se cambian en la barra de filtros.'),
    h('div', {class: 'ctrls'}, h('input', {type: 'search', placeholder: 'Buscar modelo, marca…', 'aria-label': 'Buscar planes', value: S.q || '', oninput: (e) => { limite = 200; set({q: e.target.value}, draw); }}), selF), res));
  draw();
}

// ---------- vista: Arranca ----------
function vArranca(el) {
  const pos = posicionArranca(datos().mercado, opts());
  const ficha = D.empresas.find((e) => e.empresa === 'Arranca');
  if (!pos.length) { el.append(h('div', {class: 'card'}, h('h2', {}, 'Arranca frente al mercado'), h('p', {class: 'empty'}, 'Arranca aún no tiene planes publicados en el monitor. Cuando se registren sus precios (por corte o con "Cargar dato"), aquí verá su posición por modelo y la brecha frente a la mejor oferta del mercado.'),
    ...(ficha ? [h('p', {class: 'note'}, `Estado: ${ficha.estado}.`)] : []))); return; }
  const cols = [{t: 'Modelo', k: 'modelo'}, {t: 'Posición', n: true, f: (p) => p.posicion ? `${p.posicion} de ${p.comparables}` : 'sin precio completo'},
    {t: 'Costo total Arranca', n: true, f: (p) => fmtUsd(p.plan?.u_total)}, {t: 'Mejor del mercado', f: (p) => p.mejor ? `${p.mejor.empresa} · ${fmtUsd(p.mejor.u_total)}` : '—'},
    {t: 'Brecha', n: true, f: (p) => p.plan?.brecha_total === 0 ? 'es la mejor' : p.plan ? '+' + fmtN(p.plan.brecha_total) + ' %' : '—'}];
  el.append(h('div', {class: 'card'}, h('h2', {}, 'Arranca frente al mercado'), h('p', {class: 'note'}, 'Posición de Arranca en cada modelo que ofrece, según sus prioridades. Esta vista compara contra todo el mercado: ignora los filtros de marca y empresa.'),
    tabla(cols, pos, {etiqueta: 'Posición de Arranca', onRow: (p) => go('mejores', {modelo: p.modelo})})));
}

// ---------- vista: empresas ----------
function vEmpresas(el) {
  const cols = [{t: 'Empresa', f: (e) => h('span', {}, e.empresa, ' ', e.propia && h('span', {class: 'badge a'}, 'Propia'), esNuevo(e) && h('span', {class: 'badge g'}, 'Nuevo'), e.manual && h('span', {class: 'badge m'}, 'Manual'), e.estado === 'próximamente' && h('span', {class: 'badge w'}, 'Próximamente'))},
    {t: 'Modelo de negocio', k: 'modelo_negocio'}, {t: 'Marcas', k: 'marcas', m: true}, {t: 'Frecuencia', k: 'frecuencia', m: true}, {t: 'Plazos', k: 'plazos', m: true}, {t: 'Gastos adm.', k: 'gastos_adm'},
    {t: 'Cómo publica', k: 'como_publica', m: true}, {t: 'Confianza', f: conf}];
  const cand = D.candidatos.candidatos || [];
  el.append(...[h('div', {class: 'card'}, h('h2', {}, 'Empresas seguidas'), h('p', {class: 'note'}, 'Cada actualización quincenal busca nuevos actores del mercado; los recién incorporados llevan la etiqueta "Nuevo".'), hintMovil(), tabla(cols, D.empresas, {etiqueta: 'Empresas seguidas'})),
    cand.length > 0 && h('div', {class: 'card'}, h('h2', {}, 'Actores en observación'), h('p', {class: 'note'}, 'Detectados, pero sin precios publicados todavía.'),
      tabla([{t: 'Nombre', k: 'nombre'}, {t: 'Detectado', f: (c) => fmtD(c.detectado)}, {t: 'Nota', k: 'nota'}, {t: 'Fuente', f: (c) => enlace(c.url, c.fuente || '—')}], cand, {etiqueta: 'Actores en observación'}))].filter(Boolean));
}

const VISTAS = {mejores: vMejores, evolucion: vEvolucion, cambios: vCambios, corte: vCorte, arranca: vArranca, cargar: (el) => vCargar(el, D), empresas: vEmpresas};
function renderVista() {
  const v = $('view'); v.replaceChildren();
  try { VISTAS[S.tab](v); } catch (e) { console.error(e); v.append(h('div', {class: 'card'}, h('p', {class: 'empty'}, 'No se pudo mostrar esta vista. '), h('button', {class: 'b', onclick: () => location.reload()}, 'Reintentar'))); }
  $('filtros').hidden = S.tab === 'cargar' || S.tab === 'empresas';
  $('contador').hidden = $('filtros').hidden;
  escribirHash();
}
function render() {
  document.querySelectorAll('#tabs a').forEach((a) => { if (a.dataset.p === S.tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  document.title = `${NOMBRES[S.tab]} · Motos a cuotas en Caracas`;
  sincronizarBarra(); renderVista();
}
function go(tab, extra = {}) {
  const g = Object.fromEntries(GLOBAL.map((k) => [k, S[k]]).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  S = {tab, ...g, ...(S.modelo ? {modelo: S.modelo} : {}), ...extra};
  escribirHash(true); render(); window.scrollTo({top: 0});
}

// ---------- arranque ----------
function cabecera() {
  const r = resumen(D.rows), dias = Math.max(0, Math.floor((Date.now() - new Date(D.ult + 'T00:00:00Z')) / 864e5));
  const nm = D.vigAll.filter((x) => x.origen === 'manual').length;
  $('takeaway').textContent = `Corte del ${fmtD(r.ultimo_corte)} · ${fmtN(r.planes)} planes · ${r.empresas} empresas · ${r.modelos} modelos` + (r.cortes > 1 ? ` · ${r.cambios} cambios de precio` : '');
  const nuevos = D.empresas.filter(esNuevo).length;
  $('chips').replaceChildren(...[h('span', {class: 'badge ' + (dias > 20 ? 'w' : 'g')}, `Datos del ${fmtD(D.ult)} (hace ${dias} ${dias === 1 ? 'día' : 'días'})`),
    nuevos > 0 && h('span', {class: 'badge g'}, `${nuevos} ${nuevos === 1 ? 'actor nuevo' : 'actores nuevos'}`), nm > 0 && h('span', {class: 'badge m'}, `${nm} ${nm === 1 ? 'dato manual vigente' : 'datos manuales vigentes'}`)].filter(Boolean));
}

async function main() {
  try {
    const get = (f, opcional) => fetch('data/' + f).then((r) => { if (!r.ok) throw new Error(f); return r.json(); }).catch((e) => { if (opcional !== undefined) return opcional; throw e; });
    const [rows, empresas, tas, candidatos, manual, marcasMap] = await Promise.all([get('historial.json'), get('empresas.json'), get('tasas.json'), get('candidatos.json', {candidatos: []}), get('manual.json', {entradas: [], fichas: []}), get('marcas.json', {})]);
    const ult = ultimoCorte(rows);
    delete marcasMap._nota;
    const porCorte = Object.fromEntries(Object.entries(tas.cortes || {}).map(([c, x]) => [c, x.eur_usd]));
    const ultTasa = Object.keys(porCorte).filter((c) => porCorte[c]).sort().pop();
    D = {rows, empresas, candidatos, manual, marcasMap, ult, vigAll: vigentesConManual(rows, manual.entradas), tasasPorCorte: porCorte, tasaActual: ultTasa ? porCorte[ultTasa] : null};
  } catch (e) {
    $('takeaway').replaceChildren('No se pudieron cargar los datos. ', h('button', {class: 'b', onclick: () => location.reload()}, 'Reintentar')); return;
  }
  leerHash(); cabecera(); construirBarra();
  document.querySelectorAll('#tabs a').forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); go(a.dataset.p); }));
  addEventListener('popstate', () => { leerHash(); render(); });
  render();
}
main();
