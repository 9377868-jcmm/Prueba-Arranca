// Reglas de los datos manuales: las usan el navegador (formulario), validate.mjs y build.mjs.
import {monedaNorm, diasEntreCuotas, sumaDias, slug, tasaDe} from './calc.js';

export const MOTIVOS = {sin_publicar: 'La empresa no publicó a tiempo', no_consultable: 'No se pudo consultar en línea', correccion: 'Corrección de un dato', alta_nueva: 'Alta de empresa o modelo nuevo', otro: 'Otro'};
export const FRECUENCIAS = ['Quincenal', 'Semanal', 'Mensual', 'Cada 14 días'];
export const MAX_URL = 6000;
export const REPO = {owner: '9377868-jcmm', repo: 'Prueba-Arranca', rama: 'main'};
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const http = (u) => /^https?:\/\//.test(u || '');

export const nombrePlan = (n, frecuencia) => `${n} cuotas · ${frecuencia}`;
export const claveModelo = (m) => String(m || '').trim().replace(/\s+/g, ' ').toUpperCase();
export const nombreArchivo = (e, ahora = new Date()) => {
  const t = ahora.toISOString().slice(0, 16).replace('T', '-').replace(':', '');
  const quien = e.tipo === 'empresa' ? e.ficha?.empresa : e.tipo === 'retiro' ? e.id : e.plan?.empresa + ' ' + e.plan?.modelo_clave;
  return `data/manual/${t}-${slug(quien).slice(0, 40) || e.tipo}.json`;
};

export function urlGitHub(archivo, entradas, repo = REPO) {
  const json = JSON.stringify(entradas, null, 1) + '\n';
  const url = `https://github.com/${repo.owner}/${repo.repo}/new/${repo.rama}?filename=${encodeURIComponent(archivo)}&value=${encodeURIComponent(json)}`;
  return {json, url, larga: url.length > MAX_URL, vacia: `https://github.com/${repo.owner}/${repo.repo}/new/${repo.rama}?filename=${encodeURIComponent(archivo)}`};
}

/**
 * Valida una entrada manual. ctx: {hoy, empresas:Set, ids:Set, modelos:Set, manualIds:Set, alias:{}, ultimos: Map(id -> fila real)}.
 * Devuelve {errores, avisos}.
 */
export function validarEntrada(e, ctx) {
  const err = [], av = [];
  const hoy = ctx.hoy;
  if (!e || typeof e !== 'object') return {errores: ['la entrada no es un objeto'], avisos: []};
  if (e.v !== 1) err.push('"v" debe ser 1');
  if (!['precio', 'empresa', 'retiro'].includes(e.tipo)) err.push('"tipo" debe ser precio, empresa o retiro');
  if (typeof e.registrado_por !== 'string' || e.registrado_por.trim().length < 2) err.push('falta "registrado_por" (mínimo 2 caracteres)');
  if (!FECHA.test(e.registrado || '')) err.push('"registrado" debe ser AAAA-MM-DD');
  if (!(e.motivo in MOTIVOS)) err.push('"motivo" no es válido');
  if (typeof e.fuente !== 'string' || e.fuente.trim().length < 10) err.push('"fuente" es obligatoria (mínimo 10 caracteres): diga de dónde sale el dato');
  if (!FECHA.test(e.fecha_dato || '')) err.push('"fecha_dato" debe ser AAAA-MM-DD');
  else if (e.fecha_dato > hoy) err.push('"fecha_dato" está en el futuro');
  else if (e.fecha_dato < sumaDias(hoy, -45)) err.push('"fecha_dato" tiene más de 45 días: el dato es demasiado viejo');
  if (e.url && !http(e.url)) err.push('"url" debe empezar por http:// o https://');
  if (err.length && e.tipo !== 'precio' && e.tipo !== 'empresa' && e.tipo !== 'retiro') return {errores: err, avisos: av};

  if (e.tipo === 'precio') {
    const p = e.plan || {};
    const nuevaMoneda = p.moneda_inicial !== undefined || p.moneda_cuota !== undefined;
    for (const k of ['empresa', 'marca', 'modelo', 'modelo_clave', 'plan', 'frecuencia', ...(nuevaMoneda ? [] : ['moneda'])]) if (typeof p[k] !== 'string' || !p[k].trim()) err.push(`falta plan.${k}`);
    if (p.empresa && !ctx.empresas.has(ctx.alias?.[p.empresa] || p.empresa)) err.push(`la empresa "${p.empresa}" no existe: créela primero (tipo "empresa")`);
    if (nuevaMoneda) {
      if (!['USD', 'EUR'].includes(p.moneda_inicial)) err.push('la moneda de la inicial debe ser USD o EUR');
      if (!['USD', 'EUR'].includes(p.moneda_cuota)) err.push('la moneda de la cuota debe ser USD o EUR');
    } else if (!['USD', 'EUR'].includes(monedaNorm(p.moneda))) err.push('la moneda debe ser USD o EUR');
    if (p.frecuencia && diasEntreCuotas(p.frecuencia) === null) err.push('la frecuencia debe ser semanal, quincenal, cada 14 días o mensual');
    for (const k of ['inicial', 'cuota']) if (p[k] !== null && p[k] !== undefined && (!num(p[k]) || p[k] < 0)) err.push(`plan.${k} debe ser un número mayor o igual a 0`);
    if (!num(p.inicial) && !num(p.cuota)) err.push('indique al menos la inicial o la cuota');
    if (num(p.cuota) && !(Number.isInteger(p.n_cuotas) && p.n_cuotas > 0)) err.push('plan.n_cuotas debe ser un entero mayor que 0 cuando hay cuota');
    if (!['Alta', 'Media', 'Baja'].includes(e.confianza)) err.push('"confianza" debe ser Alta, Media o Baja');
    if (e.confianza === 'Alta' && !http(e.url)) err.push('confianza Alta exige una "url" de respaldo');
    const vence = e.vence || (FECHA.test(e.fecha_dato || '') ? sumaDias(e.fecha_dato, 30) : '');
    if (e.vence && !FECHA.test(e.vence)) err.push('"vence" debe ser AAAA-MM-DD');
    else if (vence && FECHA.test(e.fecha_dato || '') && (vence < e.fecha_dato || vence > sumaDias(e.fecha_dato, 45))) err.push('"vence" debe estar entre la fecha del dato y 45 días después');
    const id = `${slug(ctx.alias?.[p.empresa] || p.empresa)}~${slug(p.modelo_clave)}~${slug(p.plan)}`;
    const existe = ctx.ids.has(id) || ctx.manualIds.has(id);
    const modeloExiste = ctx.modelos.has(p.modelo_clave);
    if (!['plan', 'modelo', null, undefined].includes(e.nuevo)) err.push('"nuevo" debe ser null, "plan" o "modelo"');
    else if (!e.nuevo && !existe) err.push('el plan no existe; marque "nuevo": "plan" o "modelo" si quiere crearlo');
    else if (e.nuevo === 'plan' && existe) err.push('el plan ya existe; no es nuevo');
    else if (e.nuevo === 'plan' && !modeloExiste) err.push('el modelo no existe; use "nuevo": "modelo"');
    else if (e.nuevo === 'modelo' && modeloExiste) err.push('el modelo ya existe; use "nuevo": "plan"');
    if (e.nuevo && p.plan && !/^\d+ cuotas · .+$/.test(p.plan)) err.push('el plan nuevo debe llamarse "<n> cuotas · <frecuencia>"');
    const real = ctx.ultimos?.get(id);
    if (real) {
      for (const [a, b, t] of [[real.inicial, p.inicial, 'inicial'], [real.cuota, p.cuota, 'cuota']]) if (num(a) && num(b) && a > 0 && Math.abs(b / a - 1) > 0.4) av.push(`${t}: ${a} → ${b} (variación mayor a 40 % frente al último corte)`);
      if (e.fecha_dato <= real.corte) av.push('el último corte real ya trae este plan con fecha igual o posterior: esta entrada no se usará');
    }
    const enEur = nuevaMoneda ? p.moneda_inicial === 'EUR' || p.moneda_cuota === 'EUR' : monedaNorm(p.moneda) === 'EUR';
    if (enEur && ctx.tasas && !tasaDe(e.fecha_dato, ctx.tasas)) av.push('hay un componente en € y no hay tasa €/US$ para esa fecha: el plan no entrará al ranking hasta que se registre la tasa');
    if (vence && vence <= sumaDias(hoy, 7)) av.push('el dato vence en 7 días o menos');
    if (ctx.alias?.[p.empresa] === 'Arranca' || p.empresa === 'Arranca') av.push('es un dato de Arranca (empresa propia): conserve la captura o la url de respaldo');
    if (p.marca && ctx.marcas && !ctx.marcas.has(p.marca)) av.push(`la marca "${p.marca}" no está en data/marcas.json (se usará tal cual)`);
    if (id) e._id = id;
  } else if (e.tipo === 'empresa') {
    const f = e.ficha || {};
    if (typeof f.empresa !== 'string' || !f.empresa.trim()) err.push('falta ficha.empresa');
    else if (ctx.empresas.has(f.empresa)) err.push(`la empresa "${f.empresa}" ya existe`);
    else if (ctx.alias && f.empresa in ctx.alias) err.push(`"${f.empresa}" es un alias de ${ctx.alias[f.empresa]}`);
    if (typeof f.modelo_negocio !== 'string' || !f.modelo_negocio.trim()) err.push('falta ficha.modelo_negocio');
    if (!['Alta', 'Media', 'Baja'].includes(f.confianza)) err.push('ficha.confianza debe ser Alta, Media o Baja');
  } else if (e.tipo === 'retiro') {
    if (!ctx.manualIds.has(e.id)) err.push('el retiro no coincide con ninguna entrada manual anterior');
  }
  return {errores: err, avisos: av};
}

// ---------- saneado y utilidades compartidas con el Worker y la carga por Excel ----------
const CLAVES = {
  comun: ['v', 'tipo', 'registrado_por', 'registrado', 'motivo', 'fuente', 'url', 'fecha_dato', 'confianza', 'vence', 'nota', 'nuevo', 'plan', 'ficha', 'id'],
  plan: ['empresa', 'marca', 'modelo', 'modelo_clave', 'plan', 'inicial', 'inicial_txt', 'cuota', 'cuota_txt', 'moneda', 'moneda_inicial', 'moneda_cuota', 'frecuencia', 'n_cuotas'],
  ficha: ['empresa', 'modelo_negocio', 'marcas', 'ubicacion', 'frecuencia', 'plazos', 'gastos_adm', 'como_publica', 'confianza', 'fuente'],
};
const MAX_TXT = 500;
const limpio = (v) => (typeof v === 'string' ? v.trim().slice(0, MAX_TXT) : v);
const pick = (o, claves) => Object.fromEntries(claves.filter((k) => o && k in o).map((k) => [k, limpio(o[k])]));

// Deja solo los campos conocidos (y los textos acotados): lo que llega de un navegador nunca se copia tal cual.
export function sanear(e) {
  if (!e || typeof e !== 'object') return null;
  const out = pick(e, CLAVES.comun.filter((k) => k !== 'plan' && k !== 'ficha'));
  if (e.plan && typeof e.plan === 'object') out.plan = pick(e.plan, CLAVES.plan);
  if (e.ficha && typeof e.ficha === 'object') out.ficha = pick(e.ficha, CLAVES.ficha);
  return out;
}

// Busca un modelo existente ignorando mayúsculas, tildes y espacios de más; si no existe, devuelve la clave nueva.
export function resolverModelo(texto, modelos) {
  const clave = claveModelo(texto);
  const s = slug(clave);
  for (const m of modelos) if (slug(m) === s) return m;
  return clave;
}

export function nombreArchivoLote(entradas, ahora = new Date()) {
  const t = ahora.toISOString().slice(0, 16).replace('T', '-').replace(':', '');
  const empresas = [...new Set(entradas.map((e) => e.plan?.empresa || e.ficha?.empresa).filter(Boolean))];
  const quien = empresas.length === 1 ? slug(empresas[0]).slice(0, 30) : 'varias-empresas';
  return `data/manual/${t}-lote-${quien}-${entradas.length}.json`;
}
