// Funciones puras: sin DOM, se usan en el navegador, en el build y en las pruebas.

export const slug = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const monedaNorm = (m = '') => /^USD/i.test(m) ? 'USD' : /€/.test(m) ? 'EUR' : /%/.test(m) ? 'PCT' : 'OTRA';

// Días entre cuotas; null si no se puede determinar.
export const diasEntreCuotas = (f = '') =>
  /^semanal\s*\//i.test(f) ? null : /14|quincenal/i.test(f) ? 14 : /semanal/i.test(f) ? 7 : /mensual/i.test(f) ? 30 : null;

const num = (v) => typeof v === 'number' && Number.isFinite(v);

// Agrega campos derivados a una fila cruda del historial.
export const SIN_MARCA = 'Sin marca indicada';
const marcaNorm = (m, marcas) => (m in marcas ? marcas[m] : (m || null));

export function enriquecer(r, alias = {}, marcas = {}) {
  const empresa = alias[r.empresa] || r.empresa;
  const dias = diasEntreCuotas(r.frecuencia);
  const cuota_mensual = num(r.cuota) && dias ? Math.round((r.cuota * 30 / dias) * 100) / 100 : null;
  const costo_total = num(r.inicial) && num(r.cuota) && num(r.n_cuotas) ? Math.round((r.inicial + r.cuota * r.n_cuotas) * 100) / 100 : null;
  return {
    ...r, empresa, empresa_raw: r.empresa,
    origen: r.origen === 'manual' ? 'manual' : /^prensa/i.test(r.fuente || '') ? 'prensa' : 'corte',
    marca_norm: marcaNorm(r.marca, marcas),
    moneda_norm: monedaNorm(r.moneda), dias, cuota_mensual, costo_total,
    id: `${slug(empresa)}~${slug(r.modelo_clave)}~${slug(r.plan)}`,
  };
}

export const ultimoCorte = (rows) => rows.reduce((m, r) => r.origen === 'corte' && r.corte > m ? r.corte : m, '');
export const vigentes = (rows) => { const c = ultimoCorte(rows); return rows.filter((r) => r.corte === c && r.origen === 'corte'); };

export function cambios(rows) {
  const g = new Map();
  rows.filter((r) => r.origen !== 'manual').forEach((r) => { if (!g.has(r.id)) g.set(r.id, []); g.get(r.id).push(r); });
  const out = [];
  g.forEach((rs, id) => {
    if (rs.length < 2) return;
    rs.sort((a, b) => a.corte < b.corte ? -1 : 1);
    const a = rs[rs.length - 2], b = rs[rs.length - 1];
    if (a.moneda_norm !== b.moneda_norm) return;
    const di = num(a.inicial) && num(b.inicial) ? b.inicial - a.inicial : null;
    const dc = num(a.cuota) && num(b.cuota) ? b.cuota - a.cuota : null;
    if (di === 0 && dc === 0) return;
    if (di === null && dc === null) return;
    out.push({id, empresa: b.empresa, modelo: b.modelo, modelo_clave: b.modelo_clave, plan: b.plan, moneda_norm: b.moneda_norm,
      fecha_antes: a.corte, fecha_ahora: b.corte, inicial_antes: a.inicial, inicial_ahora: b.inicial, delta_inicial: di,
      cuota_antes: a.cuota, cuota_ahora: b.cuota, delta_cuota: dc});
  });
  return out;
}

export function resumen(rows) {
  const cortes = [...new Set(rows.filter((r) => r.origen === 'corte').map((r) => r.corte))].sort();
  const last = cortes[cortes.length - 1] || '';
  const v = rows.filter((r) => r.corte === last && r.origen === 'corte');
  return {ultimo_corte: last, cortes: cortes.length, planes: v.length, empresas: new Set(v.map((r) => r.empresa)).size,
    modelos: new Set(v.map((r) => r.modelo_clave)).size, cambios: cambios(rows).filter((c) => c.fecha_ahora === last).length};
}

// Pasa los valores a USD si hay forma de hacerlo (EUR requiere tasa eurUsd); si no, null.
export function aUsd(r, tasas = {}) {
  const f = r.moneda_norm === 'USD' ? 1 : r.moneda_norm === 'EUR' && num(tasas.eurUsd) ? tasas.eurUsd : null;
  const m = (v) => f !== null && num(v) ? Math.round(v * f * 100) / 100 : null;
  return {...r, u_inicial: m(r.inicial), u_cuota_m: m(r.cuota_mensual), u_total: m(r.costo_total)};
}

export const PESOS = {total: 0.5, cuota: 0.3, inicial: 0.2};
const BAJA = /^baja/i;

/**
 * Ordena los planes de UN modelo de mejor a peor.
 * Filtros: iMax, cMax (USD), soloConfiable (descarta confianza Baja).
 * Devuelve {ranking, sinCuota}: ranking = planes con inicial, cuota y n_cuotas (puntaje 0 = mejor);
 * sinCuota = planes con precio incompleto, ordenados por inicial.
 */
export function rankearModelo(planes, {pesos = PESOS, iMax = null, cMax = null, soloConfiable = false, sinManual = false, tasas = {}} = {}) {
  let ps = planes.map((p) => aUsd(p, tasas)).filter((p) => !(soloConfiable && BAJA.test(p.confianza || '')) && !(sinManual && p.origen === 'manual'));
  if (num(iMax)) ps = ps.filter((p) => p.u_inicial === null || p.u_inicial <= iMax);
  if (num(cMax)) ps = ps.filter((p) => p.u_cuota_m === null || p.u_cuota_m <= cMax);
  const completos = ps.filter((p) => p.u_total !== null && p.u_cuota_m !== null && p.u_inicial !== null);
  const rest = ps.filter((p) => !completos.includes(p));
  const rng = (k) => { const v = completos.map((p) => p[k]); return [Math.min(...v), Math.max(...v)]; };
  const [tMin, tMax] = rng('u_total'), [cMin, cMax2] = rng('u_cuota_m'), [iMin, iMax2] = rng('u_inicial');
  const nz = (x, lo, hi) => hi === lo ? 0 : (x - lo) / (hi - lo);
  const sw = pesos.total + pesos.cuota + pesos.inicial || 1;
  const ranking = completos.map((p) => ({...p,
    puntaje: Math.round(((pesos.total * nz(p.u_total, tMin, tMax) + pesos.cuota * nz(p.u_cuota_m, cMin, cMax2) + pesos.inicial * nz(p.u_inicial, iMin, iMax2)) / sw) * 1000) / 1000,
    brecha_total: tMin > 0 ? Math.round((p.u_total / tMin - 1) * 1000) / 10 : null,
    insignias: [p.u_total === tMin && 'Más barato', p.u_inicial === iMin && 'Menor inicial', p.u_cuota_m === cMin && 'Menor cuota'].filter(Boolean),
  })).sort((a, b) => a.puntaje - b.puntaje || a.u_total - b.u_total);
  if (ranking.length) ranking[0].insignias.unshift('Mejor equilibrio');
  const sinCuota = rest.sort((a, b) => (a.u_inicial ?? Infinity) - (b.u_inicial ?? Infinity));
  return {ranking, sinCuota};
}

// Resumen por modelo: quién ofrece lo mejor en costo total, cuota e inicial.
export function mejoresPorModelo(vig, opts = {}) {
  const g = new Map();
  vig.forEach((r) => { if (!g.has(r.modelo_clave)) g.set(r.modelo_clave, []); g.get(r.modelo_clave).push(r); });
  const out = [];
  g.forEach((ps, modelo) => {
    const {ranking, sinCuota} = rankearModelo(ps, opts);
    const empresas = new Set(ps.map((p) => p.empresa));
    const min = (k) => ranking.length ? ranking.reduce((a, b) => b[k] < a[k] ? b : a) : null;
    out.push({modelo, ofertas: ps.length, empresas: empresas.size, comparables: ranking.length, sin_precio_completo: sinCuota.length,
      mejor: ranking[0] || null, barato: min('u_total'), cuota: min('u_cuota_m'), inicial: min('u_inicial')});
  });
  return out.sort((a, b) => b.empresas - a.empresas || b.comparables - a.comparables || a.modelo.localeCompare(b.modelo, 'es'));
}

// Posición de Arranca frente al mercado en cada modelo que ofrece.
export function posicionArranca(vig, opts = {}, nombre = 'Arranca') {
  const mios = vig.filter((r) => r.empresa === nombre);
  return [...new Set(mios.map((r) => r.modelo_clave))].map((modelo) => {
    const {ranking} = rankearModelo(vig.filter((r) => r.modelo_clave === modelo), opts);
    const i = ranking.findIndex((p) => p.empresa === nombre);
    return {modelo, comparables: ranking.length, posicion: i >= 0 ? i + 1 : null, plan: i >= 0 ? ranking[i] : null, mejor: ranking[0] || null};
  });
}

const esc = (v) => { let s = v === null || v === undefined ? '' : String(v); if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export const aCSV = (rows, cols) => '﻿' + [cols.map((c) => esc(c.t)).join(';'), ...rows.map((r) => cols.map((c) => esc(r[c.k])).join(';'))].join('\r\n');

export const esNuevo = (e, hoy = new Date(), dias = 45) => e.estado === 'nuevo' || (e.alta && (hoy - new Date(e.alta + 'T00:00:00Z')) / 864e5 <= dias);

// ---------- datos manuales (capa superpuesta; nunca entra al historial) ----------
export const sumaDias = (f, d) => new Date(new Date(f + 'T00:00:00Z').getTime() + d * 864e5).toISOString().slice(0, 10);
export const hoyISO = () => new Date().toISOString().slice(0, 10);

// Entrada "precio" -> fila de plan con los mismos campos que el historial.
export function filaManual(e, alias = {}, marcas = {}) {
  return {
    ...enriquecer({...e.plan, corte: e.fecha_dato, fecha_dato: e.fecha_dato, fuente: 'Manual: ' + e.fuente, url: e.url || '',
      confianza: e.confianza || 'Media', nota: e.nota || '', origen: 'manual'}, alias, marcas),
    man: {registrado_por: e.registrado_por, registrado: e.registrado, vence: e.vence || sumaDias(e.fecha_dato, 30), motivo: e.motivo, fuente: e.fuente},
  };
}

// De la lista de entradas ({tipo:'precio', registrado, fila} / {tipo:'retiro', id, registrado}) a las filas activas.
export function manualActivas(entradas = [], hoy = hoyISO()) {
  const por = new Map();
  entradas.filter((e) => e.tipo === 'precio').forEach((e) => {
    const p = por.get(e.fila.id);
    if (!p || e.registrado + e.fila.fecha_dato >= p.registrado + p.fila.fecha_dato) por.set(e.fila.id, e);
  });
  entradas.filter((e) => e.tipo === 'retiro').forEach((r) => { const p = por.get(r.id); if (p && r.registrado >= p.registrado) por.delete(r.id); });
  return [...por.values()].map((e) => e.fila).filter((f) => f.man.vence >= hoy);
}

// Filas vigentes: último corte real + datos manuales activos (el dato real gana si es igual o más reciente).
export function vigentesConManual(rows, entradas = [], hoy = hoyISO()) {
  const out = new Map(vigentes(rows).map((r) => [r.id, r]));
  for (const m of manualActivas(entradas, hoy)) {
    const real = out.get(m.id);
    if (real && real.origen === 'corte' && m.fecha_dato <= real.corte) continue;
    out.set(m.id, real ? {...m, previo: {inicial: real.inicial, cuota: real.cuota, corte: real.corte}} : m);
  }
  return [...out.values()];
}
