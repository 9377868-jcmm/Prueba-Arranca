// Una sola vez: divide el historial inicial en un archivo por corte (data/cortes/AAAA-MM-DD.json).
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
const rows = JSON.parse(readFileSync('data/_seed/historial.json', 'utf8'));
mkdirSync('data/cortes', {recursive: true});
const por = {};
rows.forEach((r) => (por[r.corte] ||= []).push(r));
Object.entries(por).forEach(([c, rs]) => writeFileSync(`data/cortes/${c}.json`, JSON.stringify(rs, null, 1) + '\n'));
console.log(`${rows.length} filas en ${Object.keys(por).length} archivos`);
