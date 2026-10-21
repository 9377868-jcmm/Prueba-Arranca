import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {enriquecer} from '../public/js/calc.js';
const j = (p, d) => existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : d;
export function cargar(dir = 'data') {
  const alias = j(`${dir}/alias.json`, {});
  const rows = readdirSync(`${dir}/cortes`).filter((f) => f.endsWith('.json')).sort()
    .flatMap((f) => JSON.parse(readFileSync(`${dir}/cortes/${f}`, 'utf8'))).map((r) => enriquecer(r, alias));
  rows.sort((a, b) => a.corte < b.corte ? -1 : a.corte > b.corte ? 1 : 0);
  return {rows, alias, empresas: j(`${dir}/empresas.json`, []), tasas: j(`${dir}/tasas.json`, {cortes: {}}), candidatos: j(`${dir}/candidatos.json`, {candidatos: []})};
}
