import test from 'node:test';
import assert from 'node:assert/strict';
import {enriquecer, convertir, tasaDe, rankearModelo, cambios, aCSV, filaManual} from '../public/js/calc.js';
import {validarEntrada} from '../public/js/manual-core.js';
import {tasasCalculadas} from '../scripts/cargar.mjs';

const base = {corte: '2026-10-20', empresa: 'A', marca: 'X', modelo: 'M1', modelo_clave: 'M1', plan: '10 cuotas · Quincenal', inicial_txt: '', cuota_txt: '', frecuencia: 'Quincenal', n_cuotas: 10, fuente: 'Web', url: '', confianza: 'Alta'};
const fila = (o, monedas) => enriquecer({...base, inicial: 100, cuota: 20, moneda: 'USD', ...o}, {}, {}, monedas);
const T = {porCorte: {'2026-10-05': 1.1, '2026-10-20': 1.2}};

test('moneda por componente: explícita > por defecto de la empresa > moneda única', () => {
  const a = fila({});                                              assert.deepEqual([a.moneda_inicial, a.moneda_cuota, a.mixto, a.moneda_norm], ['USD', 'USD', false, 'USD']);
  const b = fila({}, {A: {inicial: 'USD', cuota: 'EUR'}});         assert.deepEqual([b.moneda_inicial, b.moneda_cuota, b.mixto, b.moneda_norm], ['USD', 'EUR', true, 'MIXTA']);
  const c = fila({moneda_cuota: 'USD'}, {A: {inicial: 'USD', cuota: 'EUR'}}); assert.equal(c.moneda_cuota, 'USD');   // la fila explícita gana
  const d = fila({moneda: '€ (manual)'});                          assert.deepEqual([d.moneda_inicial, d.moneda_cuota], ['EUR', 'EUR']);
  assert.equal(b.costo_total, null);                                // sin total en moneda original si se mezclan
  assert.equal(a.costo_total, 300);
});

test('convertir: solo se convierte el componente en euros y se marca', () => {
  const m = convertir(fila({}, {A: {inicial: 'USD', cuota: 'EUR'}}), T);   // inicial US$100, cuota €20 × 1,2 = 24
  assert.equal(m.u_inicial, 100); assert.equal(m.u_cuota, 24); assert.equal(m.u_total, 340);
  assert.deepEqual([m.conv.inicial, m.conv.cuota, m.conv.tasa, m.conv.tasa_fecha, m.conv.origen], [false, true, 1.2, '2026-10-20', 'BCV']);
  const u = convertir(fila({}), T);                                         // todo US$: nada convertido
  assert.deepEqual([u.u_total, u.conv.inicial, u.conv.cuota], [300, false, false]);
  const e = convertir(fila({moneda: '€'}), T);                              // todo €
  assert.deepEqual([e.u_inicial, e.u_total, e.conv.inicial, e.conv.cuota], [120, 360, true, true]);
});

test('tasa: la del corte, la anterior más reciente, la escrita por el usuario; nunca una posterior', () => {
  assert.equal(tasaDe('2026-10-20', T).valor, 1.2);
  assert.equal(tasaDe('2026-10-12', T).valor, 1.1);
  assert.equal(tasaDe('2026-10-01', T), null);
  assert.deepEqual(tasaDe('2026-10-12', {...T, override: 1.5}), {valor: 1.5, fecha: null, origen: 'usuario'});
  assert.equal(tasaDe('2026-10-12', {eurUsd: 1.3}).valor, 1.3);               // nombre anterior
  assert.equal(tasaDe('2026-10-12', {porCorte: {'2026-10-12': null}}), null); // tasa vacía no cuenta
});

test('sin tasa: el plan en euros queda sin precio completo y fuera del ranking', () => {
  const ps = [fila({}, {A: {inicial: 'USD', cuota: 'EUR'}}), fila({empresa: 'B'})];
  const sin = rankearModelo(ps, {tasas: {porCorte: {}}});
  assert.equal(sin.ranking.length, 1); assert.equal(sin.sinCuota[0].falta_tasa, true);
  const con = rankearModelo(ps, {tasas: T});
  assert.equal(con.ranking.length, 2);
});

test('cambios compara solo si la moneda de cada componente es la misma', () => {
  const a = fila({corte: '2026-10-05'}, {A: {inicial: 'USD', cuota: 'EUR'}});
  const b = fila({corte: '2026-10-20', cuota: 25}, {A: {inicial: 'USD', cuota: 'EUR'}});
  assert.equal(cambios([a, b]).length, 1);
  const c = fila({corte: '2026-10-20', cuota: 25});                          // ahora todo en US$: no comparable
  assert.equal(cambios([a, c]).length, 0);
});

test('tasa derivada del BCV: eur_usd = eur_ves / usd_ves', () => {
  const t = tasasCalculadas({cortes: {a: {usd_ves: 100, eur_ves: 110}, b: {eur_usd: 1.2, usd_ves: 100, eur_ves: 999}, c: {}}});
  assert.equal(t.cortes.a.eur_usd, 1.1); assert.equal(t.cortes.a.eur_usd_calculada, true);
  assert.equal(t.cortes.b.eur_usd, 1.2); assert.equal(t.cortes.c.eur_usd, null);
});

test('entrada manual con dos monedas: se valida y se convierte; la antigua sigue valiendo', () => {
  const ctx = {hoy: '2026-10-22', alias: {}, empresas: new Set(['A']), ids: new Set(), modelos: new Set(), manualIds: new Set(), tasas: {porCorte: {}}};
  const e = (plan) => ({v: 1, tipo: 'precio', registrado_por: 'Juan', registrado: '2026-10-22', motivo: 'sin_publicar', fuente: 'Asesor por WhatsApp, captura', fecha_dato: '2026-10-22', confianza: 'Media', nuevo: 'modelo',
    plan: {empresa: 'A', marca: 'X', modelo: 'N', modelo_clave: 'N', plan: '24 cuotas · Quincenal', inicial: 600, cuota: 102, frecuencia: 'Quincenal', n_cuotas: 24, ...plan}});
  const nueva = validarEntrada(e({moneda_inicial: 'USD', moneda_cuota: 'EUR'}), ctx);
  assert.deepEqual(nueva.errores, []); assert.match(nueva.avisos.join(' '), /tasa/);
  assert.match(validarEntrada(e({moneda_inicial: 'USD'}), ctx).errores.join(' '), /moneda de la cuota/);
  assert.match(validarEntrada(e({moneda_inicial: 'USD', moneda_cuota: 'Bs'}), ctx).errores.join(' '), /moneda de la cuota/);
  assert.deepEqual(validarEntrada(e({moneda: 'USD'}), ctx).errores, []);                 // formato anterior
  const f = filaManual(e({moneda_inicial: 'USD', moneda_cuota: 'EUR'}), {}, {}, {});
  assert.deepEqual([f.moneda_inicial, f.moneda_cuota, f.mixto], ['USD', 'EUR', true]);
});

test('exportación: las columnas de moneda salen en el CSV', () => {
  const r = convertir(fila({}, {A: {inicial: 'USD', cuota: 'EUR'}}), T);
  const csv = aCSV([{...r, tasa_eur_usd: r.conv.tasa}], [{k: 'moneda_inicial', t: 'Moneda inicial'}, {k: 'moneda_cuota', t: 'Moneda cuota'}, {k: 'tasa_eur_usd', t: 'Tasa'}, {k: 'u_total', t: 'Total US$'}]);
  assert.ok(csv.includes('Moneda inicial;Moneda cuota;Tasa;Total US$')); assert.ok(csv.includes('USD;EUR;1,2;340') || csv.includes('USD;EUR;1.2;340'));
});
