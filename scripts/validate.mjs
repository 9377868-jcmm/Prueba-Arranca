// Valida data/. Errores -> salida 1. Advertencias -> se imprimen (y salida 0, salvo --estricto).
import {readFileSync, readdirSync} from 'node:fs';
import {cargar} from './cargar.mjs';
import {cambios, tasaDe} from '../public/js/calc.js';

const {rows, empresas, alias, manual, manualProblemas, manualAvisos, tasas} = cargar();
const porCorte = Object.fromEntries(Object.entries(tasas.cortes).map(([c, t]) => [c, t.eur_usd]));
const err = [], adv = [];
const hoy = new Date().toISOString().slice(0, 10);
const nombres = new Set(empresas.map((e) => e.empresa));
const claves = new Set();
const obligatorios = ['corte', 'empresa', 'marca', 'modelo', 'modelo_clave', 'plan', 'moneda', 'frecuencia', 'confianza', 'fuente'];
rows.forEach((r, i) => {
  const w = `${r.corte}/${r.empresa_raw}/${r.modelo_clave}/${r.plan}`;
  obligatorios.forEach((k) => { if (typeof r[k] !== 'string' || !r[k]) err.push(`${w}: falta "${k}"`); });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.corte || '')) err.push(`fila ${i}: corte inválido`);
  else if (r.corte > hoy) err.push(`${w}: corte en el futuro`);
  ['inicial', 'cuota', 'n_cuotas'].forEach((k) => { if (r[k] !== null && (typeof r[k] !== 'number' || r[k] < 0)) err.push(`${w}: "${k}" debe ser número >= 0 o null`); });
  if (r.inicial === null && !r.inicial_txt && r.cuota === null && !r.cuota_txt) adv.push(`${w}: sin precio ni texto`);
  if (r.url && !/^https?:\/\//.test(r.url)) err.push(`${w}: url no es http(s)`);
  const k = `${r.corte}|${r.id}`;
  if (claves.has(k)) err.push(`${w}: plan duplicado en el corte`); claves.add(k);
  if (!nombres.has(r.empresa)) adv.push(`${r.empresa}: sin ficha en empresas.json`);
});
empresas.forEach((e) => { if (!e.empresa) err.push('empresa sin nombre en empresas.json'); });
Object.values(alias).forEach((a) => { if (!nombres.has(a)) err.push(`alias apunta a "${a}", que no está en empresas.json`); });

// Reglas entre cortes (solo origen "corte").
const cortes = [...new Set(rows.filter((r) => r.origen === 'corte').map((r) => r.corte))].sort();
const n = cortes.length;
if (n >= 1) {
  const ult = cortes[n - 1], ant = cortes[n - 2];
  if (ant) {
    const dd = (new Date(ult) - new Date(ant)) / 864e5;
    if (dd < 10 || dd > 20) adv.push(`intervalo entre cortes ${ant} → ${ult}: ${dd} días (esperado 10–20)`);
    const cnt = (c) => rows.filter((r) => r.corte === c && r.origen === 'corte').length;
    if (cnt(ult) < cnt(ant) * 0.7) adv.push(`el corte ${ult} tiene ${cnt(ult)} planes, ${cnt(ant)} el anterior (caída > 30 %)`);
    const emp = (c) => new Set(rows.filter((r) => r.corte === c && r.origen === 'corte').map((r) => r.empresa));
    emp(ant).forEach((e) => { if (!emp(ult).has(e)) adv.push(`${e} tenía planes en ${ant} y desaparece en ${ult}`); });
  }
  cambios(rows).filter((c) => c.fecha_ahora === ult).forEach((c) => {
    for (const [a, b, t] of [[c.inicial_antes, c.inicial_ahora, 'inicial'], [c.cuota_antes, c.cuota_ahora, 'cuota']])
      if (a > 0 && Math.abs(b / a - 1) > 0.4) adv.push(`${c.empresa} ${c.modelo_clave} ${t}: ${a} → ${b} (variación > 40 %)`);
  });
  const ur = rows.filter((r) => r.corte === ult && r.origen === 'corte');
  if (ur.filter((r) => /^baja/i.test(r.confianza)).length > ur.length / 2) adv.push('más de la mitad del último corte tiene confianza Baja');
}
// Planes con un componente en € cuyo corte no tiene tasa: no se pueden convertir a US$ ni entrar al ranking.
const sinTasa = new Map();
[...rows, ...manual.entradas.filter((e) => e.tipo === 'precio').map((e) => e.fila)].filter((r) => r.origen !== 'prensa' && (r.moneda_inicial === 'EUR' || r.moneda_cuota === 'EUR') && !tasaDe(r.corte, {porCorte})).forEach((r) => sinTasa.set(r.corte, (sinTasa.get(r.corte) || 0) + 1));
sinTasa.forEach((n, c) => adv.push(`${n} planes del corte ${c} tienen un componente en € y no hay tasa €/US$ para esa fecha (data/tasas.json): no entrarán al ranking`));
manualProblemas.forEach((m) => err.push(`manual ${m}`));
manualAvisos.forEach((m) => adv.push(`manual ${m}`));
if (manual.entradas.length > 25) adv.push(`hay ${manual.entradas.length} entradas manuales: archive las vencidas`);
console.log(`${rows.length} filas, ${n} cortes, ${empresas.length} empresas, ${manual.entradas.length} entradas manuales`);
adv.forEach((m) => console.log('  ADVERTENCIA', m));
err.forEach((m) => console.log('  ERROR', m));
if (err.length || (process.argv.includes('--estricto') && adv.length)) { console.log(`${err.length} errores, ${adv.length} advertencias`); process.exit(1); }
console.log(`OK (${adv.length} advertencias)`);
