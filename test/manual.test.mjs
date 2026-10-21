import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, cpSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {enriquecer, filaManual, manualActivas, vigentesConManual, cambios, resumen, rankearModelo} from '../public/js/calc.js';
import {validarEntrada, nombrePlan, urlGitHub, nombreArchivo, MAX_URL} from '../public/js/manual-core.js';
import {cargar} from '../scripts/cargar.mjs';

const base = {corte: '2026-10-20', marca: 'Empire', modelo: 'M1', modelo_clave: 'M1', plan: '10 cuotas · Quincenal', inicial_txt: '', cuota_txt: '', moneda: 'USD', frecuencia: 'Quincenal', n_cuotas: 10, fuente: 'Web', url: '', confianza: 'Alta'};
const marcas = {Empire: 'Empire Keeway', 'No indicada': null};
const real = (o) => enriquecer({...base, empresa: 'A', inicial: 100, cuota: 20, ...o}, {}, marcas);
const entrada = (o = {}, plan = {}) => ({v: 1, tipo: 'precio', registrado_por: 'Juan', registrado: '2026-10-21', motivo: 'sin_publicar', fuente: 'Asesor por WhatsApp, captura', url: '',
  fecha_dato: '2026-10-21', confianza: 'Media', nuevo: null, plan: {empresa: 'A', marca: 'Empire', modelo: 'M1', modelo_clave: 'M1', plan: '10 cuotas · Quincenal', inicial: 110, cuota: 22, moneda: 'USD', frecuencia: 'Quincenal', n_cuotas: 10, ...plan}, ...o});
const ctx = (extra = {}) => ({hoy: '2026-10-21', alias: {}, empresas: new Set(['A']), ids: new Set([real().id]), modelos: new Set(['M1']), manualIds: new Set(), marcas: new Set(['Empire']),
  ultimos: new Map([[real().id, real()]]), ...extra});

test('marca_norm normaliza variantes y marca vacía', () => {
  assert.equal(real().marca_norm, 'Empire Keeway');
  assert.equal(real({marca: 'No indicada'}).marca_norm, null);
  assert.equal(real({marca: 'Toro'}).marca_norm, 'Toro');
});

test('fila manual: mismo id que la real, origen manual y vence a 30 días', () => {
  const f = filaManual(entrada(), {}, marcas);
  assert.equal(f.id, real().id); assert.equal(f.origen, 'manual'); assert.equal(f.man.vence, '2026-11-20'); assert.equal(f.marca_norm, 'Empire Keeway');
  assert.equal(f.costo_total, 330);
});

test('vigentesConManual: actualiza, añade, caduca, retira y respeta el dato real', () => {
  const rows = [real()];
  const e = (o, p) => ({tipo: 'precio', registrado: '2026-10-21', fila: filaManual(entrada(o, p), {}, marcas)});
  let v = vigentesConManual(rows, [e()], '2026-10-25');
  assert.equal(v.length, 1); assert.equal(v[0].origen, 'manual'); assert.equal(v[0].previo.cuota, 20);                       // más nuevo que el corte: reemplaza
  assert.equal(vigentesConManual(rows, [e({fecha_dato: '2026-10-20'})], '2026-10-25')[0].origen, 'corte');                  // empate: gana el real
  assert.equal(vigentesConManual(rows, [e()], '2026-12-30')[0].origen, 'corte');                                           // caducado
  assert.equal(vigentesConManual(rows, [e(), {tipo: 'retiro', id: real().id, registrado: '2026-10-22'}], '2026-10-25')[0].origen, 'corte'); // retirado
  assert.equal(vigentesConManual(rows, [e({nuevo: 'plan'}, {plan: '12 cuotas · Quincenal', n_cuotas: 12})], '2026-10-25').length, 2); // plan nuevo
  const dos = manualActivas([e({registrado: '2026-10-21'}, {cuota: 22}), {...e({registrado: '2026-10-23'}, {cuota: 25})}], '2026-10-25');
  assert.equal(dos.length, 1); assert.equal(dos[0].cuota, 25);                                                              // gana el más reciente
});

test('lo manual no contamina cambios ni resumen', () => {
  const rows = [real({corte: '2026-10-05'}), real(), filaManual(entrada(), {}, marcas)];
  assert.equal(cambios(rows).length, 0); assert.equal(resumen(rows.slice(0, 2)).planes, 1);
});

test('ranking: sinManual excluye y soloConfiable descarta Baja', () => {
  const m = filaManual(entrada({confianza: 'Baja'}, {empresa: 'B'}), {}, marcas);
  assert.equal(rankearModelo([real(), m], {sinManual: true}).ranking.length, 1);
  assert.equal(rankearModelo([real(), m], {soloConfiable: true}).ranking.length, 1);
  assert.equal(rankearModelo([real(), m]).ranking.length, 2);
});

test('validación: entrada correcta y errores típicos', () => {
  assert.deepEqual(validarEntrada(entrada(), ctx()).errores, []);
  const err = (o, p, c) => validarEntrada(entrada(o, p), ctx(c)).errores.join(' | ');
  assert.match(err({fuente: 'corta'}), /fuente/);
  assert.match(err({fecha_dato: '2026-12-01'}), /futuro/);
  assert.match(err({fecha_dato: '2026-08-01'}), /45 días/);
  assert.match(err({confianza: 'Alta'}), /url/);
  assert.match(err({}, {empresa: 'Z'}), /no existe/);
  assert.match(err({}, {moneda: 'Bs'}), /USD o EUR/);
  assert.match(err({}, {inicial: -5}), /inicial/);
  assert.match(err({}, {frecuencia: 'No indicada'}), /frecuencia/);
  assert.match(err({}, {plan: '99 cuotas · Quincenal'}), /no existe/);          // plan inexistente sin declarar "nuevo"
  assert.match(err({nuevo: 'plan'}), /ya existe/);
  assert.match(err({nuevo: 'modelo'}, {plan: '12 cuotas · Quincenal'}), /ya existe/);
  assert.match(err({nuevo: 'plan'}, {modelo_clave: 'NUEVO', plan: '12 cuotas · Quincenal'}), /modelo no existe/);
  assert.match(err({vence: '2027-01-01'}), /vence/);
  assert.equal(validarEntrada(entrada({nuevo: 'modelo'}, {modelo: 'Nuevo 1', modelo_clave: 'NUEVO 1', plan: '12 cuotas · Quincenal', n_cuotas: 12}), ctx()).errores.length, 0);
});

test('validación: avisos (variación, Arranca, cobertura real)', () => {
  const a = validarEntrada(entrada({}, {cuota: 40}), ctx()).avisos.join(' | ');
  assert.match(a, /40 %/);
  assert.match(validarEntrada(entrada({fecha_dato: '2026-10-20'}), ctx()).avisos.join(' '), /no se usará/);
  assert.match(validarEntrada(entrada({}, {empresa: 'Arranca'}), ctx({empresas: new Set(['Arranca'])})).avisos.join(' '), /Arranca/);
});

test('validación: empresa nueva y retiro', () => {
  const emp = (f) => ({v: 1, tipo: 'empresa', registrado_por: 'Juan', registrado: '2026-10-21', motivo: 'alta_nueva', fuente: 'Instagram @xyz captura', fecha_dato: '2026-10-21', ficha: {empresa: 'Moto Fácil', modelo_negocio: 'Financiamiento', confianza: 'Media', ...f}});
  assert.deepEqual(validarEntrada(emp(), ctx()).errores, []);
  assert.match(validarEntrada(emp({empresa: 'A'}), ctx()).errores.join(' '), /ya existe/);
  const ret = {v: 1, tipo: 'retiro', registrado_por: 'Juan', registrado: '2026-10-22', motivo: 'correccion', fuente: 'Era un dato equivocado', fecha_dato: '2026-10-21', id: 'x'};
  assert.match(validarEntrada(ret, ctx()).errores.join(' '), /retiro/);
  assert.deepEqual(validarEntrada(ret, ctx({manualIds: new Set(['x'])})).errores, []);
});

test('URL de GitHub: nombre de archivo y límite de longitud', () => {
  assert.equal(nombrePlan(26, 'Quincenal'), '26 cuotas · Quincenal');
  const f = nombreArchivo(entrada(), new Date('2026-10-21T15:30:00Z'));
  assert.match(f, /^data\/manual\/2026-10-21-1530-a-m1\.json$/);
  const u = urlGitHub(f, [entrada()]);
  assert.ok(u.url.length < MAX_URL && !u.larga); assert.ok(u.url.startsWith('https://github.com/9377868-jcmm/Prueba-Arranca/new/main?filename='));
  assert.ok(urlGitHub(f, Array.from({length: 12}, () => entrada())).larga);
});

test('cargar(): lee data/manual, omite lo inválido y mezcla fichas', () => {
  const d = mkdtempSync(join(tmpdir(), 'datos-'));
  mkdirSync(join(d, 'cortes')); mkdirSync(join(d, 'manual'));
  writeFileSync(join(d, 'cortes', '2026-10-20.json'), JSON.stringify([{...base, empresa: 'A', inicial: 100, cuota: 20}]));
  writeFileSync(join(d, 'empresas.json'), JSON.stringify([{empresa: 'A', modelo_negocio: 'x', confianza: 'Alta'}]));
  writeFileSync(join(d, 'marcas.json'), JSON.stringify({_nota: 'x', Empire: 'Empire Keeway'}));
  const emp = {v: 1, tipo: 'empresa', registrado_por: 'Juan', registrado: '2026-10-21', motivo: 'alta_nueva', fuente: 'Instagram @xyz captura', fecha_dato: '2026-10-21', ficha: {empresa: 'Moto Fácil', modelo_negocio: 'F', confianza: 'Media'}};
  writeFileSync(join(d, 'manual', '2026-10-21-0900-a.json'), JSON.stringify([emp, entrada({nuevo: 'plan'}, {empresa: 'Moto Fácil', plan: '12 cuotas · Quincenal', n_cuotas: 12})]));
  writeFileSync(join(d, 'manual', '2026-10-21-1000-malo.json'), JSON.stringify([entrada({fuente: 'x'})]));
  const c = cargar(d, '2026-10-21');
  assert.equal(c.manual.entradas.length, 1); assert.equal(c.manual.fichas.length, 1);
  assert.equal(c.empresas.length, 2); assert.equal(c.manualProblemas.length, 1); assert.match(c.manualProblemas[0], /malo\.json/);
  assert.equal(c.rows[0].marca_norm, 'Empire Keeway');
});
