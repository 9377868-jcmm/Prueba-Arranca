import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {enriquecer, filaManual, hoyISO, vigentes} from '../public/js/calc.js';

// Tasa euro -> dólar de cada corte: la registrada, o eur_ves / usd_ves del BCV si faltan.
export function tasasCalculadas(tasas) {
  const cortes = {};
  for (const [c, t] of Object.entries(tasas.cortes || {})) {
    const calc = t.eur_usd ?? (t.eur_ves > 0 && t.usd_ves > 0 ? Math.round((t.eur_ves / t.usd_ves) * 10000) / 10000 : null);
    cortes[c] = {...t, eur_usd: calc, eur_usd_calculada: t.eur_usd == null && calc != null};
  }
  return {...tasas, cortes};
}
import {validarEntrada} from '../public/js/manual-core.js';

const j = (p, d) => existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : d;

export function cargar(dir = 'data', hoy = hoyISO()) {
  const alias = j(`${dir}/alias.json`, {});
  const marcas = j(`${dir}/marcas.json`, {});
  delete marcas._nota;
  const monedas = j(`${dir}/monedas.json`, {});
  delete monedas._nota;
  const tasas = tasasCalculadas(j(`${dir}/tasas.json`, {cortes: {}}));
  const rows = readdirSync(`${dir}/cortes`).filter((f) => f.endsWith('.json')).sort()
    .flatMap((f) => JSON.parse(readFileSync(`${dir}/cortes/${f}`, 'utf8'))).map((r) => enriquecer(r, alias, marcas, monedas));
  rows.sort((a, b) => a.corte < b.corte ? -1 : a.corte > b.corte ? 1 : 0);
  const empresas = j(`${dir}/empresas.json`, []);

  // Datos manuales: se procesan por nombre de archivo (fecha) y en el orden de cada archivo.
  const ctx = {hoy, alias, empresas: new Set(empresas.map((e) => e.empresa)), ids: new Set(rows.map((r) => r.id)),
    modelos: new Set(rows.map((r) => r.modelo_clave)), manualIds: new Set(), marcas: new Set([...Object.keys(marcas), ...Object.values(marcas).filter(Boolean), ...rows.map((r) => r.marca)]),
    ultimos: new Map(vigentes(rows).map((r) => [r.id, r])),
    tasas: {porCorte: Object.fromEntries(Object.entries(tasas.cortes).map(([c, t]) => [c, t.eur_usd]))}};
  const entradas = [], fichas = [], problemas = [], avisos = [];
  const carpeta = `${dir}/manual`;
  const archivos = existsSync(carpeta) ? readdirSync(carpeta).filter((f) => f.endsWith('.json')).sort() : [];
  for (const f of archivos) {
    let lista;
    try { lista = JSON.parse(readFileSync(`${carpeta}/${f}`, 'utf8')); } catch (e) { problemas.push(`${f}: JSON inválido (${e.message})`); continue; }
    (Array.isArray(lista) ? lista : [lista]).forEach((e, i) => {
      const {errores, avisos: av} = validarEntrada(e, ctx);
      av.forEach((m) => avisos.push(`${f}[${i}]: ${m}`));
      if (errores.length) { errores.forEach((m) => problemas.push(`${f}[${i}]: ${m}`)); return; }
      if (e.tipo === 'precio') {
        const fila = filaManual(e, alias, marcas, monedas);
        ctx.manualIds.add(fila.id);
        entradas.push({tipo: 'precio', registrado: e.registrado, fila, archivo: f});
      } else if (e.tipo === 'empresa') {
        ctx.empresas.add(e.ficha.empresa);
        fichas.push({...e.ficha, estado: 'nuevo', alta: e.fecha_dato, origen: 'manual', manual: true, fuente: e.ficha.fuente || e.fuente});
      } else {
        entradas.push({tipo: 'retiro', id: e.id, registrado: e.registrado, archivo: f});
      }
    });
  }
  return {rows, alias, marcas, monedas, empresas: [...empresas, ...fichas], tasas, candidatos: j(`${dir}/candidatos.json`, {candidatos: []}),
    manual: {entradas, fichas}, manualProblemas: problemas, manualAvisos: avisos};
}
