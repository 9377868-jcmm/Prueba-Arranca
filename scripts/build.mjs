// Genera dist/: copia public/ y escribe dist/data/*.json, meta.json y feed.xml.
import {mkdirSync, cpSync, writeFileSync, rmSync} from 'node:fs';
import {cargar} from './cargar.mjs';
import {cambios, resumen, ultimoCorte} from '../public/js/calc.js';

const {rows, empresas, tasas, candidatos} = cargar();
rmSync('dist', {recursive: true, force: true});
cpSync('public', 'dist', {recursive: true});
mkdirSync('dist/data', {recursive: true});
const w = (f, o) => writeFileSync(`dist/data/${f}`, JSON.stringify(o));
const ult = ultimoCorte(rows);
const camb = cambios(rows).filter((c) => c.fecha_ahora === ult);
w('historial.json', rows);
w('empresas.json', empresas);
w('tasas.json', tasas);
w('candidatos.json', candidatos);
w('meta.json', {...resumen(rows), generado: new Date().toISOString(), filas: rows.length});

const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;'}[c]));
const entries = camb.map((c) => `<entry><id>tag:motos-cuotas,${ult}:${esc(c.id)}</id><title>${esc(`${c.empresa} · ${c.modelo_clave}: inicial ${c.inicial_antes} → ${c.inicial_ahora}, cuota ${c.cuota_antes} → ${c.cuota_ahora}`)}</title><updated>${ult}T00:00:00Z</updated></entry>`).join('');
writeFileSync('dist/feed.xml', `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><id>tag:motos-cuotas,feed</id><title>Cambios de precio · motos a cuotas Caracas</title><updated>${ult || '1970-01-01'}T00:00:00Z</updated>${entries}</feed>`);
console.log(`dist/ listo: ${rows.length} filas, corte ${ult}, ${camb.length} cambios`);
