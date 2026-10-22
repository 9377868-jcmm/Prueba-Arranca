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

// Moneda de un componente: 'USD' | 'EUR' o null si no es una de las dos.
const monComp = (m) => (m === 'USD' || m === 'EUR' ? m : null);
export const SIMBOLO = {USD: 'US$', EUR: '€', PCT: '%', OTRA: '?', MIXTA: 'US$ + €'};

/**
 * Agrega campos derivados a una fila cruda.
 * Moneda de cada componente: campo explícito de la fila > valor por defecto de la empresa (monedas.json) > moneda única del dato original.
 */
export function enriquecer(r, alias = {}, marcas = {}, monedas = {}) {
  const empresa = alias[r.empresa] || r.empresa;
  const dias = diasEntreCuotas(r.frecuencia);
  const cuota_mensual = num(r.cuota) && dias ? Math.round((r.cuota * 30 / dias) * 100) / 100 : null;
  const base = monedaNorm(r.moneda);
  const def = monedas[empresa] || {};
  const moneda_inicial = monComp(r.moneda_inicial) || monComp(def.inicial) || base;
  const moneda_cuota = monComp(r.moneda_cuota) || monComp(def.cuota) || base;
  const mixto = moneda_inicial !== moneda_cuota;
  // Costo total en la moneda original: solo tiene sentido si inicial y cuota están en la misma moneda.
  const costo_total = !mixto && num(r.inicial) && num(r.cuota) && num(r.n_cuotas) ? Math.round((r.inicial + r.cuota * r.n_cuotas) * 100) / 100 : null;
  return {
    ...r, empresa, empresa_raw: r.empresa,
    origen: r.origen === 'manual' ? 'manual' : /^prensa/i.test(r.fuente || '') ? 'prensa' : 'corte',
    marca_norm: marcaNorm(r.marca, marcas),
    moneda_inicial, moneda_cuota, mixto, moneda_norm: mixto ? 'MIXTA' : moneda_inicial, dias, cuota_mensual, costo_total,
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
    if (a.moneda_inicial !== b.moneda_inicial || a.moneda_cuota !== b.moneda_cuota) return;
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

const r2 = (v) => Math.round(v * 100) / 100;

/**
 * Tasa euro -> dólar aplicable a una fecha. Prioridad: la que escribió el usuario (override); la del mismo corte;
 * la más reciente anterior. Nunca usa una tasa posterior. Devuelve {valor, fecha, origen} o null.
 */
export function tasaDe(corte, tasas = {}) {
  const o = tasas.override ?? tasas.eurUsd;
  if (num(o) && o > 0) return {valor: o, fecha: null, origen: 'usuario'};
  const pc = tasas.porCorte || {};
  const fechas = Object.keys(pc).filter((f) => num(pc[f]) && pc[f] > 0 && f <= corte).sort();
  if (!fechas.length) return null;
  const f = fechas[fechas.length - 1];
  return {valor: pc[f], fecha: f, origen: 'BCV'};
}

/**
 * Pasa los precios a US$ componente por componente. Agrega u_inicial, u_cuota, u_cuota_m, u_total y
 * conv = {inicial, cuota, tasa, tasa_fecha, origen} (true = ese componente fue convertido), y falta_tasa si
 * un componente en € no se pudo convertir (entonces sus montos en US$ quedan null).
 */
export function convertir(r, tasas = {}) {
  const t = tasaDe(r.corte, tasas);
  let falta = false;
  const a = (v, mon) => {
    if (!num(v)) return {v: null, conv: false};
    if (mon === 'USD') return {v: r2(v), conv: false};
    if (mon === 'EUR') { if (t) return {v: r2(v * t.valor), conv: true}; falta = true; }
    return {v: null, conv: false};
  };
  const i = a(r.inicial, r.moneda_inicial), c = a(r.cuota, r.moneda_cuota), cm = a(r.cuota_mensual, r.moneda_cuota);
  const total = i.v !== null && c.v !== null && num(r.n_cuotas) ? r2(i.v + c.v * r.n_cuotas) : null;
  return {...r, u_inicial: i.v, u_cuota: c.v, u_cuota_m: cm.v, u_total: total, falta_tasa: falta,
    conv: {inicial: i.conv, cuota: c.conv, tasa: t ? t.valor : null, tasa_fecha: t ? t.fecha : null, origen: t ? t.origen : null}};
}
export const aUsd = convertir; // nombre anterior

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
export function filaManual(e, alias = {}, marcas = {}, monedas = {}) {
  return {
    ...enriquecer({...e.plan, corte: e.fecha_dato, fecha_dato: e.fecha_dato, fuente: 'Manual: ' + e.fuente, url: e.url || '',
      confianza: e.confianza || 'Media', nota: e.nota || '', origen: 'manual'}, alias, marcas, monedas),
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

// Estado de cada dato manual registrado (nada se borra: esto solo explica por qué cuenta o no).
export function estadosManual(entradas = [], rows = [], hoy = hoyISO()) {
  const real = new Map(vigentes(rows).map((r) => [r.id, r]));
  const precios = entradas.filter((e) => e.tipo === 'precio');
  const clave = (e) => e.registrado + e.fila.fecha_dato;
  return precios.map((e) => {
    const f = e.fila, r = real.get(f.id);
    const retirado = entradas.some((x) => x.tipo === 'retiro' && x.id === f.id && x.registrado >= e.registrado);
    const reemplazado = precios.some((o) => o !== e && o.fila.id === f.id && clave(o) > clave(e));
    const estado = retirado ? 'retirado' : reemplazado ? 'reemplazado' : (r && r.origen === 'corte' && r.corte >= f.fecha_dato) ? 'cubierto' : f.man.vence < hoy ? 'vencido' : 'vigente';
    return {fila: f, registrado: e.registrado, archivo: e.archivo, estado};
  }).sort((a, b) => clave({registrado: b.registrado, fila: b.fila}).localeCompare(clave({registrado: a.registrado, fila: a.fila})));
}
