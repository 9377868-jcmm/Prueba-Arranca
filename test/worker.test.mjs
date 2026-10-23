import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {cargar, identificar, sha256hex, hoyCaracas, LIMITES} from '../src/intake.js';
import {enriquecer} from '../public/js/calc.js';

const AHORA = new Date('2026-10-22T15:00:00Z');
const base = {corte: '2026-10-20', empresa: 'A', marca: 'X', modelo: 'M1', modelo_clave: 'M1', plan: '10 cuotas · Quincenal', inicial_txt: '', cuota_txt: '', moneda: 'USD', frecuencia: 'Quincenal', n_cuotas: 10, fuente: 'Web', url: '', confianza: 'Alta', inicial: 100, cuota: 20};
const DATOS = {rows: [enriquecer(base, {}, {}, {})], empresas: [{empresa: 'A'}], manual: {entradas: []}, tasas: {cortes: {'2026-10-20': {eur_usd: 1.12}}}, marcas: {}};
const CODIGO = 'codigo-de-prueba-123';
const entrada = (o = {}, plan = {}) => ({v: 1, tipo: 'precio', motivo: 'sin_publicar', fuente: 'Asesor por WhatsApp, captura guardada', url: '', fecha_dato: '2026-10-22', confianza: 'Media', nuevo: null,
  plan: {empresa: 'A', marca: 'X', modelo: 'M1', modelo_clave: 'M1', plan: '10 cuotas · Quincenal', inicial: 110, cuota: 22, moneda_inicial: 'USD', moneda_cuota: 'EUR', frecuencia: 'Quincenal', n_cuotas: 10, ...plan}, ...o});

async function entorno(extra = {}) {
  return {GITHUB_TOKEN: 'token-secreto', CODIGOS: JSON.stringify({[await sha256hex(CODIGO)]: 'Ricardo'}), ...extra};
}
function githubFalso({falla} = {}) {
  const llamadas = [];
  const fetch = async (url, opts = {}) => {
    llamadas.push({url, metodo: opts.method || 'GET', cuerpo: opts.body ? JSON.parse(opts.body) : null, auth: opts.headers?.authorization});
    if (falla && url.includes(falla)) return new Response('{}', {status: 500});
    const ok = (o) => new Response(JSON.stringify(o), {status: 200});
    if (url.includes('/git/ref/heads/main')) return ok({object: {sha: 'abc123'}});
    if (url.includes('/git/refs')) return ok({});
    if (url.includes('/contents/')) return ok({});
    if (url.endsWith('/pulls')) return ok({number: 7, html_url: 'https://github.com/9377868-jcmm/Prueba-Arranca/pull/7'});
    return new Response('{}', {status: 404});
  };
  return {fetch, llamadas};
}
const peticion = (cuerpo, {origin = 'https://sitio.test', metodo = 'POST'} = {}) => new Request('https://sitio.test/api/cargar', {method: metodo, headers: {...(origin ? {origin} : {}), 'content-type': 'application/json'}, body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo)});
const deps = (gh) => ({datos: async () => structuredClone(DATOS), fetch: gh.fetch, ahora: () => AHORA});
const json = async (r) => r.json();

test('código: se identifica por hash y rechaza lo inválido', async () => {
  const env = await entorno();
  assert.equal((await identificar(CODIGO, env.CODIGOS)).nombre, 'Ricardo');
  assert.equal(await identificar('otro-codigo-distinto', env.CODIGOS), null);
  assert.equal(await identificar('corto', env.CODIGOS), null);
  assert.equal(await identificar(CODIGO, 'esto no es json'), null);
  assert.equal(await identificar(CODIGO, JSON.stringify({[await sha256hex(CODIGO)]: ''})), null);
  assert.equal(hoyCaracas(new Date('2026-10-22T02:00:00Z')), '2026-10-21');
});

test('estado: habilitado solo con los dos secretos', async () => {
  const a = await worker.fetch(new Request('https://sitio.test/api/estado'), await entorno());
  assert.deepEqual(await json(a), {habilitado: true});
  const b = await worker.fetch(new Request('https://sitio.test/api/estado'), {GITHUB_TOKEN: 'x'});
  assert.deepEqual(await json(b), {habilitado: false});
  const c = await worker.fetch(new Request('https://sitio.test/api/otra'), await entorno());
  assert.equal(c.status, 404);
  const d = await worker.fetch(new Request('https://sitio.test/api/cargar'), await entorno());
  assert.equal(d.status, 405);
  const e = await worker.fetch(new Request('https://sitio.test/index.html'), {ASSETS: {fetch: async () => new Response('estatico')}});
  assert.equal(await e.text(), 'estatico');
});

test('rechazos antes de tocar GitHub', async () => {
  const gh = githubFalso(), env = await entorno();
  const ok = {codigo: CODIGO, entradas: [entrada()]};
  assert.equal((await cargar(peticion(ok), {}, deps(gh))).status, 503);                                  // sin secretos
  assert.equal((await cargar(peticion(ok, {origin: 'https://malo.test'}), env, deps(gh))).status, 403);  // otro origen
  assert.equal((await cargar(peticion(ok, {origin: null}), env, deps(gh))).status, 403);                 // sin origen
  assert.equal((await cargar(peticion('no es json'), env, deps(gh))).status, 400);
  assert.equal((await cargar(peticion({codigo: CODIGO, entradas: []}), env, deps(gh))).status, 400);
  assert.equal((await cargar(peticion({codigo: 'codigo-equivocado', entradas: [entrada()]}), env, deps(gh))).status, 401);
  assert.equal((await cargar(peticion({codigo: CODIGO, entradas: Array(LIMITES.entradas + 1).fill(entrada())}), env, deps(gh))).status, 413);
  assert.equal((await cargar(peticion('x'.repeat(LIMITES.cuerpo + 1)), env, deps(gh))).status, 413);
  assert.equal(gh.llamadas.length, 0);
});

test('límite de velocidad por código y por IP', async () => {
  const gh = githubFalso(), env = await entorno({LIMITE: {limit: async ({key}) => ({success: !key.startsWith('ip:')})}});
  const r = await cargar(peticion({codigo: CODIGO, entradas: [entrada()]}), env, deps(gh));
  assert.equal(r.status, 429); assert.equal(gh.llamadas.length, 0);
});

test('validación: errores por fila y nada se envía a GitHub', async () => {
  const gh = githubFalso(), env = await entorno();
  const r = await cargar(peticion({codigo: CODIGO, entradas: [entrada(), entrada({fuente: 'corta'}), entrada({}, {empresa: 'Fantasma'})]}), env, deps(gh));
  assert.equal(r.status, 422);
  const c = await json(r);
  assert.deepEqual(c.errores.map((e) => e.indice), [1, 2]);
  assert.match(c.errores[0].errores.join(' '), /fuente/); assert.match(c.errores[1].errores.join(' '), /empresa/);
  assert.equal(gh.llamadas.length, 0);
});

test('camino exitoso: rama, archivo y PR; la identidad sale del código, no del navegador', async () => {
  const gh = githubFalso(), env = await entorno();
  const sucio = entrada({registrado_por: 'Hacker', registrado: '1999-01-01', intruso: 'x', _id: 'y'}, {extra: 'z'});
  const r = await cargar(peticion({codigo: CODIGO, entradas: [sucio]}), env, deps(gh));
  assert.equal(r.status, 200);
  const c = await json(r);
  assert.equal(c.ok, true); assert.equal(c.numero, 7); assert.match(c.url, /\/pull\/7$/);
  assert.deepEqual(gh.llamadas.map((l) => l.metodo + ' ' + l.url.replace(/^.*\/repos\/[^/]+\/[^/]+/, '')).map((s) => s.replace(/\/contents\/.*/, '/contents/…')),
    ['GET /git/ref/heads/main', 'POST /git/refs', 'PUT /contents/…', 'POST /pulls']);
  assert.ok(gh.llamadas.every((l) => l.auth === 'Bearer token-secreto'));
  const put = gh.llamadas[2];
  assert.match(put.url, /\/contents\/data\/manual\/2026-10-22-1500-a-m1-[0-9a-f]{6}\.json$/);
  assert.match(put.cuerpo.branch, /^carga\/20261022\d{4}-[0-9a-f]{6}$/);
  assert.equal(gh.llamadas[1].cuerpo.sha, 'abc123');
  const guardado = JSON.parse(Buffer.from(put.cuerpo.content, 'base64').toString('utf8'));
  assert.equal(guardado.length, 1);
  assert.equal(guardado[0].registrado_por, 'Ricardo'); assert.equal(guardado[0].registrado, '2026-10-22');
  assert.equal('intruso' in guardado[0], false); assert.equal('_id' in guardado[0], false); assert.equal('extra' in guardado[0].plan, false);
  assert.match(gh.llamadas[3].cuerpo.title, /^Dato manual: A · M1$/);
  assert.equal(gh.llamadas[3].cuerpo.base, 'main'); assert.equal(gh.llamadas[3].cuerpo.head, put.cuerpo.branch);
  assert.ok(!JSON.stringify(c).includes('token-secreto'));
});

test('lote: un solo archivo y un solo PR; las entradas se ven entre sí (empresa nueva y su plan)', async () => {
  const gh = githubFalso(), env = await entorno();
  const emp = {v: 1, tipo: 'empresa', motivo: 'alta_nueva', fuente: 'Instagram @xyz captura', fecha_dato: '2026-10-22', ficha: {empresa: 'Moto Fácil', modelo_negocio: 'Financiamiento', confianza: 'Media'}};
  const plan = entrada({nuevo: 'plan'}, {empresa: 'Moto Fácil', plan: '12 cuotas · Quincenal', n_cuotas: 12});
  const r = await cargar(peticion({codigo: CODIGO, entradas: [emp, plan, entrada({}, {inicial: 111})]}), env, deps(gh));
  assert.equal(r.status, 200);
  assert.equal(gh.llamadas.filter((l) => l.metodo === 'PUT').length, 1);
  const put = gh.llamadas.find((l) => l.metodo === 'PUT');
  assert.match(put.url, /\/contents\/data\/manual\/2026-10-22-1500-lote-varias-empresas-3-[0-9a-f]{6}\.json$/);
  assert.match(gh.llamadas.find((l) => l.url.endsWith('/pulls')).cuerpo.title, /^Carga manual: 3 datos \(por Ricardo\)$/);
});

test('texto del PR: sin menciones ni formato peligroso', async () => {
  const gh = githubFalso(), env = await entorno();
  await cargar(peticion({codigo: CODIGO, entradas: [entrada({fuente: 'Dato de @alguien | <script>x</script> [enlace](http://x)'})]}), env, deps(gh));
  const cuerpo = gh.llamadas.find((l) => l.url.endsWith('/pulls')).cuerpo.body;
  assert.ok(!/@alguien/.test(cuerpo)); assert.ok(!/<script>|\[enlace\]/.test(cuerpo)); assert.ok(!cuerpo.includes('|'));
});

test('si GitHub falla: 502 genérico, sin filtrar el token', async () => {
  for (const falla of ['/git/refs', '/contents/', '/pulls', '/git/ref/heads']) {
    const gh = githubFalso({falla}), env = await entorno();
    const r = await cargar(peticion({codigo: CODIGO, entradas: [entrada()]}), env, deps(gh));
    assert.equal(r.status, 502, falla);
    const t = await r.text(); assert.ok(!t.includes('token-secreto')); assert.ok(!t.includes('500'));
  }
});
