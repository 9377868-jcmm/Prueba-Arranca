// Carga por Excel o CSV: convierte las filas de una hoja en entradas manuales y las revisa una por una.
// Funciones puras: se usan en el navegador y en las pruebas.
import {slug, diasEntreCuotas, sumaDias} from './calc.js';
import {validarEntrada, nombrePlan, resolverModelo, FRECUENCIAS} from './manual-core.js';

export const MAX_FILAS = 200;

/** Nombre completo de un modelo ("EK XPRESS II") -> su clave ("XPRESS II"), para reconocer ambos en el archivo. Se omiten los ambiguos. */
export function mapaModelos(rows) {
  const m = new Map(), malos = new Set();
  for (const r of rows) {
    const k = slug(r.modelo);
    if (m.has(k) && m.get(k) !== r.modelo_clave) malos.add(k);
    m.set(k, r.modelo_clave);
  }
  malos.forEach((k) => m.delete(k));
  return m;
}

// Columnas de la plantilla y los nombres alternativos que se aceptan en el encabezado.
export const COLUMNAS = [
  {k: 'empresa', t: 'Empresa', ancho: 24, alias: ['empresa', 'compania', 'concesionario']},
  {k: 'marca', t: 'Marca', ancho: 16, alias: ['marca']},
  {k: 'modelo', t: 'Modelo', ancho: 22, alias: ['modelo', 'moto']},
  {k: 'n_cuotas', t: 'N° de cuotas', ancho: 13, alias: ['n de cuotas', 'numero de cuotas', 'n cuotas', 'nro de cuotas', 'no de cuotas', 'cuotas', 'cantidad de cuotas', 'plazo']},
  {k: 'frecuencia', t: 'Frecuencia', ancho: 14, alias: ['frecuencia', 'periodicidad']},
  {k: 'inicial', t: 'Inicial', ancho: 11, alias: ['inicial', 'entrada', 'cuota inicial', 'monto inicial']},
  {k: 'moneda_inicial', t: 'Moneda de la inicial', ancho: 19, alias: ['moneda de la inicial', 'moneda inicial', 'moneda de inicial']},
  {k: 'cuota', t: 'Cuota', ancho: 11, alias: ['cuota', 'monto de la cuota', 'monto cuota', 'canon']},
  {k: 'moneda_cuota', t: 'Moneda de la cuota', ancho: 18, alias: ['moneda de la cuota', 'moneda cuota', 'moneda de cuota']},
  {k: 'fecha_dato', t: 'Fecha del dato', ancho: 15, alias: ['fecha del dato', 'fecha dato', 'fecha']},
  {k: 'fuente', t: 'Fuente', ancho: 34, alias: ['fuente', 'origen del dato']},
  {k: 'confianza', t: 'Confianza', ancho: 12, alias: ['confianza']},
  {k: 'url', t: 'Enlace', ancho: 26, alias: ['enlace', 'url', 'link']},
  {k: 'nota', t: 'Nota', ancho: 28, alias: ['nota', 'notas', 'observaciones', 'observacion']},
];
const REQUERIDAS = ['empresa', 'modelo', 'n_cuotas', 'frecuencia'];
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9$€#]+/g, ' ').trim();
const vacio = (v) => v === null || v === undefined || String(v).trim() === '';

// ---------- lectores de celdas ----------
/** Número con formato de Venezuela ("1.234,56") o con punto decimal ("82.5"). null si está vacío, NaN si no se entiende. */
export function numES(v) {
  if (vacio(v)) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  let s = String(v).replace(/[^\d.,-]/g, '');
  if (!/\d/.test(s)) return NaN;
  const punto = s.includes('.'), coma = s.includes(',');
  if (punto && coma) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (coma) s = s.replace(',', '.');
  else if (punto && /^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/** 'USD' | 'EUR' | null (vacío) | undefined (no reconocida). */
export function parseMoneda(v) {
  if (vacio(v)) return null;
  const s = norm(v).replace(/\s/g, '');
  if (['usd', 'us$', '$', 'dolar', 'dolares', 'dollar', 'dollars'].includes(s)) return 'USD';
  if (['eur', '€', 'euro', 'euros'].includes(s)) return 'EUR';
  return undefined;
}

/** Frecuencia reconocida: 'Quincenal' | 'Semanal' | 'Mensual', o null. */
export function parseFrecuencia(v) {
  const s = norm(v);
  if (/quincen|14 dias|cada 14|catorcen|bisemanal/.test(s)) return 'Quincenal';
  if (/seman|7 dias|cada 7/.test(s)) return 'Semanal';
  if (/mensual|30 dias|cada mes/.test(s)) return 'Mensual';
  return null;
}

const iso = (a, m, d) => {
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d ? f.toISOString().slice(0, 10) : null;
};
/** Fecha AAAA-MM-DD a partir de texto (AAAA-MM-DD o DD/MM/AAAA) o de un número de fecha de Excel. null si está vacía, undefined si no se entiende. */
export function parseFecha(v) {
  if (vacio(v)) return null;
  if (typeof v === 'number') return v > 30000 && v < 80000 ? new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5).toISOString().slice(0, 10) : undefined;
  const s = String(v).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return iso(+m[1], +m[2], +m[3]) || undefined;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(s);
  if (m) return iso(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]) || undefined;
  return undefined;
}

const parseConfianza = (v) => { const s = norm(v); return s === 'alta' ? 'Alta' : s === 'media' ? 'Media' : s === 'baja' ? 'Baja' : null; };

// ---------- tabla ----------
/** Encuentra la fila de encabezados y asigna cada columna. Devuelve {filas, faltan} o {error}. */
export function leerTabla(matriz) {
  const alias = new Map(COLUMNAS.flatMap((c) => c.alias.map((a) => [a, c.k])));
  for (let i = 0; i < Math.min(matriz.length, 10); i++) {
    const cols = {};
    (matriz[i] || []).forEach((celda, j) => { const k = alias.get(norm(celda)); if (k && !(k in cols)) cols[k] = j; });
    if (Object.keys(cols).length >= 3) {
      const faltan = REQUERIDAS.filter((k) => !(k in cols));
      if (!('inicial' in cols) && !('cuota' in cols)) faltan.push('inicial o cuota');
      const filas = [];
      for (let r = i + 1; r < matriz.length; r++) {
        const f = matriz[r] || [];
        if (f.every(vacio)) continue;
        filas.push({n: r + 1, v: Object.fromEntries(Object.entries(cols).map(([k, j]) => [k, f[j] ?? '']))});
      }
      return {filas, faltan: faltan.map((k) => COLUMNAS.find((c) => c.k === k)?.t || k)};
    }
  }
  return {error: 'No encontré los encabezados. La primera fila debe tener, al menos: Empresa, Modelo, N° de cuotas, Frecuencia y Inicial o Cuota. Use la plantilla.'};
}

// ---------- filas -> entradas ----------
/**
 * entorno: {ctx (para validarEntrada, se modifica), reales: filas vigentes del último corte, marcasMap, marcasLista, hoy}.
 * op: {fuente, motivo, confianza, fecha, quien, soloCambios, monedaInicial, monedaCuota}.
 * Devuelve {resultados: [{n, estado: 'ok'|'aviso'|'error'|'sin_cambio', errores, avisos, entrada, etiqueta}], resumen}.
 */
export function filasAEntradas(tabla, entorno, op) {
  const {ctx, reales, marcasMap = {}, marcasLista = [], nombresModelo = new Map()} = entorno;
  const empresas = new Map([...ctx.empresas].map((e) => [slug(e), e]));
  const marcasCanon = new Map([...marcasLista, ...Object.values(marcasMap).filter(Boolean)].map((m) => [slug(m), m]));
  const variantes = new Map(Object.entries(marcasMap).map(([k, v]) => [slug(k), v]));
  const vistos = new Map();
  const resultados = tabla.filas.slice(0, MAX_FILAS).map(({n, v}) => {
    const errores = [], avisos = [];
    const res = (estado, extra = {}) => ({n, estado, errores, avisos, ...extra});
    // empresa y modelo
    const empresa = empresas.get(slug(v.empresa));
    if (vacio(v.empresa)) errores.push('falta la empresa');
    else if (!empresa) errores.push(`la empresa "${String(v.empresa).trim()}" no existe: créela primero con "Empresa nueva"`);
    if (vacio(v.modelo)) errores.push('falta el modelo');
    const clave = vacio(v.modelo) ? '' : (nombresModelo.get(slug(String(v.modelo))) ?? resolverModelo(String(v.modelo), ctx.modelos));
    const modeloExiste = ctx.modelos.has(clave);
    // cuotas y frecuencia
    const nc = numES(v.n_cuotas);
    if (!(Number.isInteger(nc) && nc > 0)) errores.push('el n.° de cuotas debe ser un entero mayor que 0');
    const frec = parseFrecuencia(v.frecuencia);
    if (!frec) errores.push('la frecuencia debe ser semanal, quincenal, cada 14 días o mensual');
    // precios y monedas
    const inicial = numES(v.inicial), cuota = numES(v.cuota);
    for (const [x, t] of [[inicial, 'inicial'], [cuota, 'cuota']]) if (Number.isNaN(x) || (x !== null && x < 0)) errores.push(`la ${t} no es un número válido`);
    if (inicial === null && cuota === null) errores.push('falta la inicial o la cuota');
    const mI = parseMoneda(v.moneda_inicial), mC = parseMoneda(v.moneda_cuota);
    if (mI === undefined) errores.push('moneda de la inicial no reconocida (use USD o EUR)');
    if (mC === undefined) errores.push('moneda de la cuota no reconocida (use USD o EUR)');
    const monedaInicial = mI || op.monedaInicial || 'USD', monedaCuota = mC || op.monedaCuota || 'EUR';
    if (mI === null && inicial !== null) avisos.push(`moneda de la inicial no indicada: se asumió ${monedaInicial}`);
    if (mC === null && cuota !== null) avisos.push(`moneda de la cuota no indicada: se asumió ${monedaCuota}`);
    // fecha, fuente, confianza
    let fecha = parseFecha(v.fecha_dato);
    if (fecha === undefined) { errores.push('fecha no válida (use AAAA-MM-DD o DD/MM/AAAA)'); fecha = null; }
    fecha = fecha || op.fecha;
    const confianza = vacio(v.confianza) ? (op.confianza || 'Media') : parseConfianza(v.confianza);
    if (!confianza) errores.push('la confianza debe ser Alta, Media o Baja');
    const fuente = vacio(v.fuente) ? (op.fuente || '').trim() : String(v.fuente).trim();
    if (errores.length) return res('error', {etiqueta: `${v.empresa ?? ''} · ${v.modelo ?? ''}`});
    // plan existente (misma empresa, modelo, n.º de cuotas y mismos días entre cuotas) o plan nuevo
    const dias = diasEntreCuotas(frec);
    const existente = reales.find((r) => r.empresa === empresa && r.modelo_clave === clave && r.n_cuotas === nc && r.dias === dias);
    const plan = existente ? existente.plan : nombrePlan(nc, frec);
    const frecuencia = existente ? existente.frecuencia : frec;
    const id = `${slug(empresa)}~${slug(clave)}~${slug(plan)}`;
    const base = existente || reales.find((r) => r.modelo_clave === clave);
    // marca: la de la fila, o la del modelo existente
    let marca = vacio(v.marca) ? (base ? (base.marca_norm || base.marca) : '') : String(v.marca).trim();
    marca = variantes.get(slug(marca)) ?? marcasCanon.get(slug(marca)) ?? marca;
    if (!marca) errores.push('falta la marca (es un modelo nuevo)');
    if (vistos.has(id)) errores.push(`repetida en el archivo (igual a la fila ${vistos.get(id)})`);
    if (errores.length) return res('error', {etiqueta: `${empresa} · ${clave}`});
    // sin cambios
    const igual = (a, b) => (a === null && b === null) || (a !== null && b !== null && Math.abs(a - b) < 0.005);
    if (op.soloCambios && existente && igual(inicial, existente.inicial) && igual(cuota, existente.cuota) && (inicial === null || monedaInicial === existente.moneda_inicial) && (cuota === null || monedaCuota === existente.moneda_cuota))
    { vistos.set(id, n); return res('sin_cambio', {etiqueta: `${empresa} · ${clave} · ${plan}`}); }
    const entrada = {v: 1, tipo: 'precio', registrado_por: op.quien || '', registrado: entorno.hoy, motivo: op.motivo || 'sin_publicar', fuente, url: vacio(v.url) ? '' : String(v.url).trim(), fecha_dato: fecha, confianza,
      vence: sumaDias(fecha, 30), nota: vacio(v.nota) ? '' : String(v.nota).trim(), nuevo: existente ? null : (modeloExiste ? 'plan' : 'modelo'),
      plan: {empresa, marca, modelo: existente ? existente.modelo : (base ? base.modelo : String(v.modelo).trim()), modelo_clave: clave, plan, inicial, inicial_txt: '', cuota, cuota_txt: '',
        moneda_inicial: monedaInicial, moneda_cuota: monedaCuota, moneda: monedaInicial === monedaCuota ? (monedaInicial === 'EUR' ? '€ (manual)' : 'USD') : `${monedaInicial} (inicial) / ${monedaCuota} (cuota)`, frecuencia, n_cuotas: nc}};
    const r = validarEntrada(entrada, ctx);
    delete entrada._id;
    r.errores.forEach((m) => errores.push(m)); r.avisos.forEach((m) => avisos.push(m));
    if (errores.length) return res('error', {etiqueta: `${empresa} · ${clave} · ${plan}`});
    vistos.set(id, n); ctx.manualIds.add(id);
    return res(avisos.length ? 'aviso' : 'ok', {entrada, etiqueta: `${empresa} · ${clave} · ${plan}`});
  });
  const resumen = {total: resultados.length, ok: 0, aviso: 0, error: 0, sin_cambio: 0, sobran: Math.max(0, tabla.filas.length - MAX_FILAS)};
  resultados.forEach((r) => { resumen[r.estado]++; });
  return {resultados, resumen};
}

// ---------- plantilla ----------
/** Filas de la hoja de precios: solo encabezados, o los planes vigentes de una empresa para editar. */
export function filasPlantilla(reales, empresa = null) {
  const enc = COLUMNAS.map((c) => c.t);
  if (!empresa) return [enc];
  const filas = reales.filter((r) => r.empresa === empresa).sort((a, b) => a.modelo_clave.localeCompare(b.modelo_clave, 'es') || a.n_cuotas - b.n_cuotas)
    .map((r) => COLUMNAS.map((c) => ({empresa: r.empresa, marca: r.marca_norm || r.marca, modelo: r.modelo_clave, n_cuotas: r.n_cuotas, frecuencia: r.frecuencia, inicial: r.inicial, moneda_inicial: r.moneda_inicial,
      cuota: r.cuota, moneda_cuota: r.moneda_cuota, fecha_dato: '', fuente: '', confianza: '', url: '', nota: ''}[c.k])));
  return [enc, ...filas];
}

export const HOJAS_PLANTILLA = (filas, nFilas) => [
  {nombre: 'Precios', filas, anchos: COLUMNAS.map((c) => c.ancho),
    validaciones: [{rango: `E2:E${nFilas + 200}`, lista: FRECUENCIAS.join(',')}, {rango: `G2:G${nFilas + 200}`, lista: 'USD,EUR'}, {rango: `I2:I${nFilas + 200}`, lista: 'USD,EUR'}, {rango: `L2:L${nFilas + 200}`, lista: 'Alta,Media,Baja'}]},
  {nombre: 'Instrucciones', fijarEncabezado: false, anchos: [110], filas: [
    ['Cómo llenar la hoja "Precios"'],
    ['1. Una fila por plan. Empresa, Modelo, N° de cuotas, Frecuencia y al menos la Inicial o la Cuota son obligatorios.'],
    ['2. La Empresa debe existir en el monitor. Para una empresa nueva use "Cargar dato > Empresa nueva".'],
    ['3. Moneda de la inicial y de la cuota: USD o EUR. Lo más común es inicial en USD y cuota en EUR. Si la deja vacía se asume USD para la inicial y EUR para la cuota.'],
    ['4. Frecuencia: Semanal, Quincenal, Mensual o Cada 14 días.'],
    ['5. Fecha del dato: cuándo vio el precio (AAAA-MM-DD o DD/MM/AAAA). Si la deja vacía se usa la fecha que indique en el sitio. No puede ser futura ni tener más de 45 días.'],
    ['6. Fuente: de dónde sale el dato (mínimo 10 caracteres). Puede escribirla una sola vez en el sitio para todas las filas.'],
    ['7. Confianza: Alta (con enlace de respaldo), Media o Baja. Si la deja vacía se usa Media.'],
    ['8. Números: use coma o punto decimal (82,5 o 82.5). No escriba símbolos de moneda en la celda.'],
    ['9. Máximo 200 filas por envío. Si bajó los precios actuales de una empresa, solo cambie las celdas que cambiaron: las filas sin cambios se ignoran.'],
  ]},
];
