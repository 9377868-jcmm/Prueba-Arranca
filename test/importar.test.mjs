import test from 'node:test';
import assert from 'node:assert/strict';
import {mapaModelos, numES, parseMoneda, parseFrecuencia, parseFecha, leerTabla, filasAEntradas, filasPlantilla, HOJAS_PLANTILLA, COLUMNAS, MAX_FILAS} from '../public/js/importar.js';
import {crearXlsx, leerXlsx} from '../public/js/xlsx-lite.js';
import {enriquecer, vigentes} from '../public/js/calc.js';

const base = {corte: '2026-10-20', empresa: 'A', marca: 'Empire Keeway', modelo: 'EK XPRESS II', modelo_clave: 'XPRESS II', plan: '26 cuotas · Cada 14 días', inicial_txt: '', cuota_txt: '', moneda: 'USD', frecuencia: 'Cada 14 días', n_cuotas: 26, fuente: 'Web', url: '', confianza: 'Alta', inicial: 334, cuota: 80};
const marcasMap = {Empire: 'Empire Keeway'};
const monedas = {A: {inicial: 'USD', cuota: 'EUR'}};
const rows = [enriquecer(base, {}, marcasMap, monedas), enriquecer({...base, modelo: 'Águila', modelo_clave: 'ÁGUILA', marca: 'Haojue', plan: '16 cuotas · Quincenal', frecuencia: 'Quincenal', n_cuotas: 16, inicial: 620, cuota: 62}, {}, marcasMap, monedas)];
const reales = vigentes(rows);
const entorno = (extra = {}) => ({reales, nombresModelo: mapaModelos(rows), marcasMap, marcasLista: ['Empire Keeway', 'Haojue'], hoy: '2026-10-22',
  ctx: {hoy: '2026-10-22', alias: {}, empresas: new Set(['A', 'Moto Fácil']), ids: new Set(rows.map((r) => r.id)), modelos: new Set(rows.map((r) => r.modelo_clave)), manualIds: new Set(), marcas: new Set(['Empire Keeway', 'Haojue']),
    ultimos: new Map(reales.map((r) => [r.id, r])), tasas: {porCorte: {'2026-10-20': 1.12}}}, ...extra});
const OP = {fuente: 'Asesor por WhatsApp, captura guardada', motivo: 'sin_publicar', confianza: 'Media', fecha: '2026-10-22', quien: 'Ricardo', soloCambios: true};
const ENC = COLUMNAS.map((c) => c.t);
const fila = (o) => COLUMNAS.map((c) => ({empresa: 'A', marca: '', modelo: 'xpress ii', n_cuotas: 26, frecuencia: 'Quincenal', inicial: 340, moneda_inicial: 'USD', cuota: 82, moneda_cuota: 'EUR', fecha_dato: '', fuente: '', confianza: '', url: '', nota: '', ...o}[c.k]));
const correr = (filas, op = OP, ent = entorno()) => filasAEntradas(leerTabla([ENC, ...filas]), ent, op);

test('números con formato de Venezuela y con punto', () => {
  const casos = [[1234.5, 1234.5], ['1.234,56', 1234.56], ['82,5', 82.5], ['82.5', 82.5], ['1.234', 1234], ['12.345.678', 12345678], ['$ 600', 600], ['€ 82,50', 82.5], ['1,234.56', 1234.56], [' 90 ', 90], ['', null], [null, null]];
  for (const [e, s] of casos) assert.equal(numES(e), s, String(e));
  assert.ok(Number.isNaN(numES('abc'))); assert.ok(Number.isNaN(numES('$')));
});

test('moneda, frecuencia y fecha', () => {
  assert.deepEqual(['USD', 'us$', '$', 'Dólares', 'EUR', '€', 'Euros', '', 'bs'].map(parseMoneda), ['USD', 'USD', 'USD', 'USD', 'EUR', 'EUR', 'EUR', null, undefined]);
  assert.deepEqual(['Quincenal', 'cada 14 días', 'SEMANAL', 'mensual', 'cada mes', 'diaria'].map(parseFrecuencia), ['Quincenal', 'Quincenal', 'Semanal', 'Mensual', 'Mensual', null]);
  const serial = (Date.UTC(2026, 9, 22) - Date.UTC(1899, 11, 30)) / 864e5;
  assert.deepEqual([serial, '2026-10-22', '22/10/2026', '5/1/26', '31/02/2026', 'ayer', '', 12].map(parseFecha), ['2026-10-22', '2026-10-22', '2026-10-22', '2026-01-05', undefined, undefined, null, undefined]);
});

test('tabla: encabezados con variantes, títulos antes, filas vacías y números de fila', () => {
  const t = leerTabla([['Precios de Dale'], [], ['empresa', 'MODELO', 'Nº de cuotas', 'Frecuencia', 'Entrada', 'Moneda inicial', 'Cuota'], ['A', 'x', 10, 'Semanal', 100], [], ['A', 'y', 12, 'Mensual', 90, 'USD', 5]]);
  assert.deepEqual(t.faltan, []);
  assert.deepEqual(t.filas.map((f) => f.n), [4, 6]);
  assert.equal(t.filas[1].v.moneda_inicial, 'USD'); assert.equal(t.filas[0].v.inicial, 100);
  assert.deepEqual(leerTabla([['Empresa', 'Modelo', 'Marca']]).faltan, ['N° de cuotas', 'Frecuencia', 'inicial o cuota']);
  assert.match(leerTabla([['hola', 'mundo'], ['1', '2']]).error, /encabezados/);
});

test('actualiza un plan existente aunque la frecuencia se escriba distinto; el modelo se reconoce sin mayúsculas', () => {
  const {resultados} = correr([fila({})]);
  const r = resultados[0];
  assert.equal(r.estado, 'ok');
  assert.equal(r.entrada.plan.plan, '26 cuotas · Cada 14 días'); assert.equal(r.entrada.plan.frecuencia, 'Cada 14 días');
  assert.equal(r.entrada.nuevo, null); assert.equal(r.entrada.plan.modelo_clave, 'XPRESS II'); assert.equal(r.entrada.plan.marca, 'Empire Keeway');
  assert.equal(r.entrada.registrado_por, 'Ricardo'); assert.equal(r.entrada.fuente, OP.fuente); assert.equal(r.entrada.fecha_dato, '2026-10-22'); assert.equal(r.entrada.vence, '2026-11-21');
  assert.equal(correr([fila({modelo: 'aguila', n_cuotas: 16, frecuencia: 'quincenal', inicial: 700, cuota: 70})]).resultados[0].entrada.plan.modelo_clave, 'ÁGUILA');
});

test('el nombre completo del modelo (EK XPRESS II) se reconoce como su clave (XPRESS II)', () => {
  const r = correr([fila({modelo: 'EK XPRESS II'}), fila({modelo: 'Ek Xpress Ii', n_cuotas: 20})]).resultados;
  assert.equal(r[0].entrada.plan.modelo_clave, 'XPRESS II'); assert.equal(r[0].entrada.nuevo, null);
  assert.equal(r[1].entrada.plan.modelo_clave, 'XPRESS II'); assert.equal(r[1].entrada.nuevo, 'plan');
  const dup = mapaModelos([...rows, enriquecer({...base, modelo: 'EK XPRESS II', modelo_clave: 'OTRO'}, {}, {}, {})]);
  assert.equal(dup.has('ek-xpress-ii'), false);                                                // ambiguo: no se adivina
});

test('plan nuevo, modelo nuevo y marca', () => {
  const {resultados} = correr([fila({n_cuotas: 20}), fila({modelo: 'Modelo Nuevo', marca: '', n_cuotas: 12}), fila({modelo: 'Modelo Nuevo', marca: 'Empire', n_cuotas: 12, inicial: 500})]);
  assert.equal(resultados[0].entrada.nuevo, 'plan'); assert.equal(resultados[0].entrada.plan.plan, '20 cuotas · Quincenal');
  assert.equal(resultados[1].estado, 'error'); assert.match(resultados[1].errores.join(' '), /marca/);
  assert.equal(resultados[2].entrada.nuevo, 'modelo'); assert.equal(resultados[2].entrada.plan.marca, 'Empire Keeway'); assert.equal(resultados[2].entrada.plan.modelo_clave, 'MODELO NUEVO');
});

test('errores claros por fila', () => {
  const {resultados, resumen} = correr([
    fila({empresa: 'Fantasma'}), fila({n_cuotas: 'x'}), fila({frecuencia: 'diaria'}), fila({inicial: '', cuota: ''}), fila({moneda_cuota: 'bs'}), fila({fecha_dato: '31/02/2026'}), fila({fecha_dato: '2026-12-31'}), fila({confianza: 'mucha'}), fila({inicial: -5}), fila({modelo: ''}),
  ]);
  const m = resultados.map((r) => r.errores.join(' | '));
  assert.match(m[0], /empresa "Fantasma" no existe/); assert.match(m[1], /n\.° de cuotas/); assert.match(m[2], /frecuencia/); assert.match(m[3], /falta la inicial o la cuota/);
  assert.match(m[4], /moneda de la cuota/); assert.match(m[5], /fecha no válida/); assert.match(m[6], /futuro/); assert.match(m[7], /confianza/); assert.match(m[8], /inicial no es un número/); assert.match(m[9], /falta el modelo/);
  assert.equal(resumen.error, 10);
});

test('fuente obligatoria: la de la fila gana sobre la del sitio; sin ninguna es error', () => {
  assert.equal(correr([fila({fuente: 'Instagram @dale, captura del 21-oct'})]).resultados[0].entrada.fuente, 'Instagram @dale, captura del 21-oct');
  const r = correr([fila({})], {...OP, fuente: ''}).resultados[0];
  assert.equal(r.estado, 'error'); assert.match(r.errores.join(' '), /fuente/);
});

test('monedas: las de la fila, o las usuales con aviso', () => {
  const a = correr([fila({moneda_inicial: '', moneda_cuota: ''})]).resultados[0];
  assert.equal(a.entrada.plan.moneda_inicial, 'USD'); assert.equal(a.entrada.plan.moneda_cuota, 'EUR'); assert.equal(a.estado, 'aviso');
  assert.match(a.avisos.join(' '), /se asumió USD/); assert.match(a.avisos.join(' '), /se asumió EUR/);
  const b = correr([fila({moneda_inicial: 'EUR', moneda_cuota: 'USD'})]).resultados[0];
  assert.deepEqual([b.entrada.plan.moneda_inicial, b.entrada.plan.moneda_cuota], ['EUR', 'USD']);
});

test('filas repetidas en el archivo y variación grande', () => {
  const r = correr([fila({}), fila({inicial: 341})]).resultados;
  assert.equal(r[0].estado, 'ok'); assert.equal(r[1].estado, 'error'); assert.match(r[1].errores.join(' '), /repetida en el archivo \(igual a la fila 2\)/);
  const g = correr([fila({cuota: 200})]).resultados[0];
  assert.equal(g.estado, 'aviso'); assert.match(g.avisos.join(' '), /40 %/);
});

test('ignora las filas que no cambian el precio', () => {
  const r = correr([fila({inicial: 334, cuota: 80}), fila({inicial: 335, cuota: 80, n_cuotas: 26, modelo: 'xpress ii'})], OP).resultados;
  assert.equal(r[0].estado, 'sin_cambio'); assert.equal(r[0].entrada, undefined);
  assert.equal(r[1].estado, 'error');                                                       // la misma fila ya apareció arriba (aunque no cambiara)
  assert.equal(correr([fila({inicial: 335})], OP).resultados[0].estado, 'ok');
  assert.equal(correr([fila({inicial: 334, cuota: 80})], {...OP, soloCambios: false}).resultados[0].estado, 'ok');
});

test('límite de filas', () => {
  const muchas = Array.from({length: MAX_FILAS + 5}, (_, i) => fila({n_cuotas: i + 1}));
  const {resultados, resumen} = correr(muchas);
  assert.equal(resultados.length, MAX_FILAS); assert.equal(resumen.sobran, 5);
});

test('plantilla vacía y precios actuales: ida y vuelta por .xlsx sin cambios', async () => {
  assert.equal(filasPlantilla(reales).length, 1);
  const filas = filasPlantilla(reales, 'A');
  assert.equal(filas.length, 3); assert.equal(filas[1][2], 'ÁGUILA');                           // ordenadas por modelo
  const bytes = crearXlsx(HOJAS_PLANTILLA(filas, filas.length - 1));
  const matriz = await leerXlsx(bytes.buffer);
  const {resultados, resumen} = filasAEntradas(leerTabla(matriz), entorno(), OP);
  assert.deepEqual([resumen.sin_cambio, resumen.error], [2, 0]);
  // el usuario cambia una cuota en la hoja y vuelve a subir
  matriz[2][7] = 90;
  const otra = filasAEntradas(leerTabla(matriz), entorno(), OP);
  assert.deepEqual([otra.resumen.sin_cambio, otra.resumen.ok], [1, 1]);
  assert.equal(otra.resultados.find((r) => r.entrada).entrada.plan.cuota, 90);
});
