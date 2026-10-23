// Lógica de la carga remota de datos (sin acceso directo a GitHub desde el navegador).
// Todo recibe sus dependencias (fetch, reloj, datos publicados) para poder probarlo sin red.
import {vigentes, slug} from '../public/js/calc.js';
import {sanear, validarEntrada, nombreArchivo, nombreArchivoLote, REPO} from '../public/js/manual-core.js';

export const LIMITES = {cuerpo: 300000, entradas: 200};
const JSON_H = {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'};
export const responder = (obj, status = 200) => new Response(JSON.stringify(obj), {status, headers: JSON_H});

export async function sha256hex(texto) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Devuelve {nombre, hash} si el código existe en CODIGOS ({"<sha256 del código>": "Nombre"}), o null.
export async function identificar(codigo, codigosJson) {
  if (typeof codigo !== 'string' || codigo.length < 8 || codigo.length > 200) return null;
  let tabla;
  try { tabla = JSON.parse(codigosJson || '{}'); } catch { return null; }
  const hash = await sha256hex(codigo.trim());
  const nombre = Object.prototype.hasOwnProperty.call(tabla, hash) ? tabla[hash] : null;
  return typeof nombre === 'string' && nombre.trim() ? {nombre: nombre.trim().slice(0, 60), hash} : null;
}

// Fecha de hoy en Caracas (UTC-4, sin horario de verano).
export const hoyCaracas = (ahora = new Date()) => new Date(ahora.getTime() - 4 * 3600 * 1000).toISOString().slice(0, 10);

export function construirCtx({rows, empresas, manual, tasas, marcas}, hoy) {
  const porCorte = Object.fromEntries(Object.entries(tasas?.cortes || {}).map(([c, t]) => [c, t.eur_usd]));
  const marcasSet = new Set([...Object.keys(marcas || {}), ...Object.values(marcas || {}).filter(Boolean), ...rows.map((r) => r.marca)]);
  return {hoy, alias: {}, empresas: new Set(empresas.map((e) => e.empresa)), ids: new Set(rows.map((r) => r.id)), modelos: new Set(rows.map((r) => r.modelo_clave)),
    manualIds: new Set((manual?.entradas || []).filter((e) => e.tipo === 'precio').map((e) => e.fila.id)), marcas: marcasSet,
    ultimos: new Map(vigentes(rows).map((r) => [r.id, r])), tasas: {porCorte}};
}

/**
 * Sanea y valida las entradas que llegan del navegador. Fuerza quién registra (el nombre del código) y la fecha de registro.
 * Devuelve {limpias, errores: [{indice, errores}], avisos: [{indice, avisos}]}.
 */
export function prepararEntradas(entradas, nombre, ctx) {
  const limpias = [], errores = [], avisos = [];
  entradas.forEach((crudo, indice) => {
    const e = sanear(crudo);
    if (!e) { errores.push({indice, errores: ['la entrada no es válida']}); return; }
    e.v = 1; e.registrado_por = nombre; e.registrado = ctx.hoy;
    const r = validarEntrada(e, ctx);
    delete e._id;
    if (r.errores.length) errores.push({indice, errores: r.errores});
    else {
      if (r.avisos.length) avisos.push({indice, avisos: r.avisos});
      // las entradas siguientes del mismo envío ven a las anteriores (empresa nueva, plan nuevo, retiro)
      if (e.tipo === 'empresa') ctx.empresas.add(e.ficha.empresa);
      if (e.tipo === 'precio') ctx.manualIds.add(`${slug(e.plan.empresa)}~${slug(e.plan.modelo_clave)}~${slug(e.plan.plan)}`);
      limpias.push(e);
    }
  });
  return {limpias, errores, avisos};
}

const md = (s) => String(s ?? '').replace(/[\r\n|<>`\[\]]/g, ' ').replace(/@/g, '@​').slice(0, 120);
const num = (v) => (v === null || v === undefined ? '—' : String(v));

export function textoPR(entradas, nombre, avisos) {
  const lineas = entradas.slice(0, 25).map((e) => {
    if (e.tipo === 'precio') return `- **${md(e.plan.empresa)}** · ${md(e.plan.modelo_clave)} · ${md(e.plan.plan)}: inicial ${num(e.plan.inicial)} ${md(e.plan.moneda_inicial || e.plan.moneda)}, cuota ${num(e.plan.cuota)} ${md(e.plan.moneda_cuota || e.plan.moneda)} (${e.nuevo ? 'nuevo ' + e.nuevo : 'actualización'}; fuente: ${md(e.fuente)})`;
    if (e.tipo === 'empresa') return `- Empresa nueva: **${md(e.ficha.empresa)}** (fuente: ${md(e.fuente)})`;
    return `- Retiro del dato \`${md(e.id)}\` (motivo: ${md(e.motivo)})`;
  });
  if (entradas.length > 25) lineas.push(`- … y ${entradas.length - 25} más en el archivo`);
  const av = avisos.flatMap((a) => a.avisos.map((m) => `- Fila ${a.indice + 1}: ${md(m)}`));
  return [`Carga manual enviada desde el sitio por **${md(nombre)}**: ${entradas.length} ${entradas.length === 1 ? 'dato' : 'datos'}.`, '', ...lineas,
    ...(av.length ? ['', '**Avisos de validación**', ...av] : []), '', 'Revise las fuentes antes de unir. El dato aparecerá en el sitio con la etiqueta "Manual" y vencerá a los 30 días.'].join('\n');
}

function base64(texto) {
  const bytes = new TextEncoder().encode(texto);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

const azar = () => [...crypto.getRandomValues(new Uint8Array(3))].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Crea rama, archivo y PR en GitHub. Devuelve {numero, url}. Lanza Error con .status si GitHub falla. */
export async function crearPR(entradas, nombre, avisos, env, fetchFn = fetch, ahora = new Date()) {
  const [owner, repo] = (env.GITHUB_REPO || `${REPO.owner}/${REPO.repo}`).split('/');
  const api = (env.GITHUB_API || 'https://api.github.com') + `/repos/${owner}/${repo}`;
  const rama = REPO.rama;
  const h = {authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'user-agent': 'motos-cuotas-carga', 'x-github-api-version': '2022-11-28', 'content-type': 'application/json'};
  const llamar = async (ruta, opts = {}) => {
    const r = await fetchFn(api + ruta, {...opts, headers: h});
    if (!r.ok) { const err = new Error(`GitHub ${r.status} en ${ruta.split('/')[1] || ruta}`); err.status = r.status; throw err; }
    return r.json();
  };
  const sha = (await llamar(`/git/ref/heads/${rama}`)).object.sha;
  const archivo = (entradas.length === 1 ? nombreArchivo(entradas[0], ahora) : nombreArchivoLote(entradas, ahora)).replace(/\.json$/, `-${azar()}.json`);
  const ramaNueva = `carga/${ahora.toISOString().slice(0, 16).replace(/[-:T]/g, '')}-${azar()}`;
  await llamar('/git/refs', {method: 'POST', body: JSON.stringify({ref: `refs/heads/${ramaNueva}`, sha})});
  const json = JSON.stringify(entradas, null, 1) + '\n';
  await llamar(`/contents/${archivo}`, {method: 'PUT', body: JSON.stringify({message: `Carga manual: ${entradas.length} ${entradas.length === 1 ? 'dato' : 'datos'} (por ${md(nombre)})`, content: base64(json), branch: ramaNueva})});
  const primero = entradas[0];
  const titulo = entradas.length === 1
    ? (primero.tipo === 'precio' ? `Dato manual: ${md(primero.plan.empresa)} · ${md(primero.plan.modelo_clave)}` : primero.tipo === 'empresa' ? `Empresa nueva: ${md(primero.ficha.empresa)}` : 'Retiro de un dato manual')
    : `Carga manual: ${entradas.length} datos (por ${md(nombre)})`;
  const pr = await llamar('/pulls', {method: 'POST', body: JSON.stringify({title: titulo, head: ramaNueva, base: rama, body: textoPR(entradas, nombre, avisos)})});
  return {numero: pr.number, url: pr.html_url, archivo};
}

/** Manejador de /api/cargar. deps: {datos(): Promise<{rows, empresas, manual, tasas, marcas}>, fetch, ahora()}. */
export async function cargar(request, env, deps) {
  if (!env.GITHUB_TOKEN || !env.CODIGOS) return responder({error: 'La carga remota no está configurada.'}, 503);
  const origen = request.headers.get('origin');
  if (!origen || origen !== new URL(request.url).origin) return responder({error: 'Origen no permitido.'}, 403);
  const texto = await request.text();
  if (texto.length > LIMITES.cuerpo) return responder({error: 'El envío es demasiado grande.'}, 413);
  let cuerpo;
  try { cuerpo = JSON.parse(texto); } catch { return responder({error: 'El envío no es válido.'}, 400); }
  if (!cuerpo || !Array.isArray(cuerpo.entradas) || !cuerpo.entradas.length) return responder({error: 'No hay datos para enviar.'}, 400);
  if (cuerpo.entradas.length > LIMITES.entradas) return responder({error: `Máximo ${LIMITES.entradas} filas por envío.`}, 413);
  const quien = await identificar(cuerpo.codigo, env.CODIGOS);
  if (!quien) return responder({error: 'Código no válido.'}, 401);
  if (env.LIMITE) {
    const ip = request.headers.get('cf-connecting-ip') || 'sin-ip';
    const [a, b] = await Promise.all([env.LIMITE.limit({key: 'c:' + quien.hash}), env.LIMITE.limit({key: 'ip:' + ip})]);
    if (!a.success || !b.success) return responder({error: 'Demasiados envíos seguidos; espere un minuto.'}, 429);
  }
  const ahora = deps.ahora ? deps.ahora() : new Date();
  const ctx = construirCtx(await deps.datos(), hoyCaracas(ahora));
  const {limpias, errores, avisos} = prepararEntradas(cuerpo.entradas, quien.nombre, ctx);
  if (errores.length) return responder({error: 'Hay datos que no pasan la validación.', errores}, 422);
  try {
    const pr = await crearPR(limpias, quien.nombre, avisos, env, deps.fetch || fetch, ahora);
    return responder({ok: true, numero: pr.numero, url: pr.url, enviados: limpias.length, avisos});
  } catch (e) {
    console.error('carga: fallo al crear el PR', e.status || '', e.message);
    return responder({error: 'No se pudo crear la solicitud en GitHub. Intente de nuevo en unos minutos.'}, 502);
  }
}
