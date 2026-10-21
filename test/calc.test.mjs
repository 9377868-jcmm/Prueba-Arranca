import test from 'node:test';
import assert from 'node:assert/strict';
import {enriquecer, diasEntreCuotas, monedaNorm, rankearModelo, cambios, resumen, aCSV, mejoresPorModelo, posicionArranca, esNuevo} from '../public/js/calc.js';

const base = {corte: '2026-10-20', marca: 'X', modelo: 'M1', modelo_clave: 'M1', plan: 'p', inicial_txt: '', cuota_txt: '', moneda: 'USD', frecuencia: 'Quincenal', n_cuotas: 10, fuente: 'Web', url: '', confianza: 'Alta'};
const P = (o) => enriquecer({...base, ...o});

test('frecuencia y moneda', () => {
  assert.equal(diasEntreCuotas('Cada 14 días'), 14); assert.equal(diasEntreCuotas('Semanal (plan en semanas)'), 7);
  assert.equal(diasEntreCuotas('Mensual'), 30); assert.equal(diasEntreCuotas('No indicada'), null); assert.equal(diasEntreCuotas('Semanal / quincenal / mensual'), null);
  assert.equal(monedaNorm('€ (símbolo mostrado en web)'), 'EUR'); assert.equal(monedaNorm('USD / REF'), 'USD'); assert.equal(monedaNorm('%'), 'PCT');
});
test('derivados', () => {
  const r = P({empresa: 'A', inicial: 100, cuota: 20, frecuencia: 'Semanal', n_cuotas: 10});
  assert.equal(r.costo_total, 300); assert.equal(r.cuota_mensual, 85.71); assert.equal(r.origen, 'corte');
  assert.equal(P({empresa: 'A', inicial: 1, cuota: null}).costo_total, null);
  assert.equal(P({empresa: 'A', fuente: 'Prensa: X', inicial: 1, cuota: 1}).origen, 'prensa');
});
test('ranking: mejor equilibrio, etiquetas y brecha', () => {
  const ps = [P({empresa: 'A', inicial: 100, cuota: 50, n_cuotas: 10}), P({empresa: 'B', inicial: 300, cuota: 20, n_cuotas: 10}), P({empresa: 'C', inicial: 200, cuota: 40, n_cuotas: 10}), P({empresa: 'D', inicial: 90, cuota: null})];
  const {ranking, sinCuota} = rankearModelo(ps);
  assert.equal(ranking.length, 3); assert.equal(sinCuota[0].empresa, 'D');
  const barato = ranking.find((r) => r.insignias.includes('Más barato')); assert.equal(barato.empresa, 'B'); assert.equal(barato.brecha_total, 0);
  assert.ok(ranking[0].insignias.includes('Mejor equilibrio'));
  const soloCuota = rankearModelo(ps, {pesos: {total: 0, cuota: 1, inicial: 0}}).ranking[0]; assert.equal(soloCuota.empresa, 'B');
  const soloIni = rankearModelo(ps, {pesos: {total: 0, cuota: 0, inicial: 1}}).ranking[0]; assert.equal(soloIni.empresa, 'A');
});
test('filtros de presupuesto y confianza', () => {
  const ps = [P({empresa: 'A', inicial: 100, cuota: 50}), P({empresa: 'B', inicial: 300, cuota: 20, confianza: 'Baja'})];
  assert.equal(rankearModelo(ps, {iMax: 200}).ranking.length, 1);
  assert.equal(rankearModelo(ps, {soloConfiable: true}).ranking.length, 1);
});
test('euro requiere tasa', () => {
  const g = P({empresa: 'G', moneda: '€ (símbolo)', inicial: 100, cuota: 10});
  assert.equal(rankearModelo([g]).ranking.length, 0);
  assert.equal(rankearModelo([g], {tasas: {eurUsd: 1.1}}).ranking[0].u_inicial, 110);
});
test('cambios entre cortes y resumen', () => {
  const a = P({empresa: 'A', corte: '2026-10-05', inicial: 100, cuota: 10}), b = P({empresa: 'A', corte: '2026-10-20', inicial: 120, cuota: 10});
  const c = cambios([a, b]); assert.equal(c.length, 1); assert.equal(c[0].delta_inicial, 20);
  assert.equal(cambios([a, P({empresa: 'A', corte: '2026-10-20', inicial: 100, cuota: 10})]).length, 0);
  const r = resumen([a, b]); assert.equal(r.cortes, 2); assert.equal(r.cambios, 1);
});
test('CSV: BOM, separador ; y anti-fórmulas', () => {
  const s = aCSV([{a: '=SUM(1)', b: 'x;y', c: -5}], [{k: 'a', t: 'A'}, {k: 'b', t: 'B'}, {k: 'c', t: 'C'}]);
  assert.ok(s.startsWith('﻿A;B;C')); assert.ok(s.includes("'=SUM(1)")); assert.ok(s.includes('"x;y"')); assert.ok(s.endsWith(';-5'));
});
test('Arranca y nuevos actores', () => {
  const vig = [P({empresa: 'Arranca', inicial: 100, cuota: 50}), P({empresa: 'B', inicial: 90, cuota: 20})];
  assert.equal(posicionArranca(vig)[0].posicion, 2); assert.equal(mejoresPorModelo(vig)[0].empresas, 2);
  assert.ok(esNuevo({estado: 'nuevo'})); assert.ok(esNuevo({alta: '2026-10-10'}, new Date('2026-10-20'))); assert.ok(!esNuevo({alta: '2026-01-01'}, new Date('2026-10-20')));
});
