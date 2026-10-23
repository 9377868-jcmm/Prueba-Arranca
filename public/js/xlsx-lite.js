// Lector y escritor mínimo de .xlsx y lector de CSV, sin dependencias (el sitio no puede cargar código externo).
// Lee: texto, números, texto en línea y cadenas compartidas de la primera hoja. Ignora estilos y fórmulas (usa el valor guardado).
// Escribe: una o varias hojas con texto, números, columnas anchas, encabezado en negrita, fila fija y listas desplegables.

const LIM_ARCHIVO = 2 * 1024 * 1024;      // 2 MB comprimido
const LIM_DESCOMPRIMIDO = 20 * 1024 * 1024; // protege de archivos zip que se inflan sin control
const dec = new TextDecoder('utf-8');
const enc = new TextEncoder();

// ---------- XML ----------
const ENT = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'"};
const desescapar = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ''; }
  return ENT[e.toLowerCase()];
});
const escapar = (s) => String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const atributo = (attrs, nombre) => { const m = new RegExp(`\\b${nombre}="([^"]*)"`).exec(attrs); return m ? desescapar(m[1]) : null; };
const textos = (xml) => [...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>|<t\b[^>]*\/>/g)].map((m) => desescapar(m[1] || '')).join('');

// ---------- ZIP (lectura) ----------
async function inflar(datos) {
  const flujo = new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}

function entradasZip(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('El archivo no es un .xlsx válido.');
  const total = v.getUint16(eocd + 10, true);
  let pos = v.getUint32(eocd + 16, true);
  const out = new Map();
  for (let n = 0; n < total; n++) {
    if (v.getUint32(pos, true) !== 0x02014b50) throw new Error('El archivo .xlsx está dañado.');
    const metodo = v.getUint16(pos + 10, true), comp = v.getUint32(pos + 20, true), real = v.getUint32(pos + 24, true);
    const ln = v.getUint16(pos + 28, true), le = v.getUint16(pos + 30, true), lc = v.getUint16(pos + 32, true), local = v.getUint32(pos + 42, true);
    const nombre = dec.decode(bytes.subarray(pos + 46, pos + 46 + ln));
    out.set(nombre, {metodo, comp, real, local});
    pos += 46 + ln + le + lc;
  }
  return {v, out};
}

async function leerEntrada(bytes, zip, nombre) {
  const e = zip.out.get(nombre);
  if (!e) return null;
  if (e.real > LIM_DESCOMPRIMIDO) throw new Error('El archivo es demasiado grande.');
  const inicio = e.local + 30 + zip.v.getUint16(e.local + 26, true) + zip.v.getUint16(e.local + 28, true);
  const datos = bytes.subarray(inicio, inicio + e.comp);
  const plano = e.metodo === 0 ? datos : e.metodo === 8 ? await inflar(datos) : null;
  if (!plano) throw new Error('El .xlsx usa una compresión que no se puede leer.');
  if (plano.length > LIM_DESCOMPRIMIDO) throw new Error('El archivo es demasiado grande.');
  return dec.decode(plano);
}

const columna = (ref) => { let n = 0; for (const c of /^[A-Z]+/.exec(ref)[0]) n = n * 26 + c.charCodeAt(0) - 64; return n - 1; };

/** Devuelve las filas de la primera hoja como arreglos de celdas (texto, número o ''). */
export async function leerXlsx(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length > LIM_ARCHIVO) throw new Error('El archivo pesa más de 2 MB.');
  const zip = entradasZip(bytes);
  const compartidas = [];
  const sst = await leerEntrada(bytes, zip, 'xl/sharedStrings.xml');
  if (sst) for (const m of sst.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>|<si\b[^>]*\/>/g)) compartidas.push(textos(m[1] || ''));
  // primera hoja según el libro; si no se puede, la primera hoja encontrada
  let ruta = null;
  const libro = await leerEntrada(bytes, zip, 'xl/workbook.xml'), rels = await leerEntrada(bytes, zip, 'xl/_rels/workbook.xml.rels');
  if (libro && rels) {
    const hoja = /<sheet\b([^>]*)\/?>/.exec(libro);
    const id = hoja && (atributo(hoja[1], 'r:id') || atributo(hoja[1], 'id'));
    for (const m of rels.matchAll(/<Relationship\b([^>]*)\/?>/g)) if (id && atributo(m[1], 'Id') === id) { const t = atributo(m[1], 'Target') || ''; ruta = t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, ''); }
  }
  if (!ruta || !zip.out.has(ruta)) ruta = [...zip.out.keys()].filter((k) => /^xl\/worksheets\/[^/]+\.xml$/.test(k)).sort()[0];
  if (!ruta) throw new Error('El .xlsx no tiene hojas.');
  const xml = await leerEntrada(bytes, zip, ruta);
  const filas = [];
  for (const m of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const ref = atributo(m[1], 'r');
    if (!ref || !/^[A-Z]+\d+$/.test(ref)) continue;
    const f = parseInt(/\d+$/.exec(ref)[0], 10) - 1, c = columna(ref);
    if (f > 5000 || c > 100) continue;
    const t = atributo(m[1], 't'), cuerpo = m[2] || '';
    const v = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(cuerpo);
    let valor = '';
    if (t === 'inlineStr') valor = textos(cuerpo);
    else if (v) {
      const crudo = desescapar(v[1]);
      if (t === 's') valor = compartidas[parseInt(crudo, 10)] ?? '';
      else if (t === 'str' || t === 'd') valor = crudo;
      else if (t === 'b') valor = crudo === '1' ? 'VERDADERO' : 'FALSO';
      else if (t === 'e') valor = '';
      else { const n = Number(crudo); valor = Number.isFinite(n) ? n : crudo; }
    }
    (filas[f] ||= [])[c] = valor;
  }
  return Array.from(filas, (r) => Array.from(r || [], (x) => x ?? ''));
}

// ---------- CSV ----------
export function leerCsv(texto) {
  const t = texto.replace(/^﻿/, '');
  const primera = t.split(/\r?\n/, 1)[0] || '';
  const delim = [';', '\t', ','].map((d) => [d, primera.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const filas = []; let fila = [], celda = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { celda += '"'; i++; } else q = false; } else celda += c; }
    else if (c === '"') q = true;
    else if (c === delim) { fila.push(celda); celda = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; fila.push(celda); filas.push(fila); fila = []; celda = ''; }
    else celda += c;
  }
  if (celda !== '' || fila.length) { fila.push(celda); filas.push(fila); }
  return filas.slice(0, 5001);
}

// ---------- ZIP y XLSX (escritura) ----------
const TABLA_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = TABLA_CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

function crearZip(archivos) { // [{nombre, texto}] sin compresión
  const partes = [], central = [];
  let pos = 0;
  for (const {nombre, texto} of archivos) {
    const n = enc.encode(nombre), d = enc.encode(texto), crc = crc32(d);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(10, 0, true); lh.setUint16(12, 0x5c21, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, d.length, true); lh.setUint32(22, d.length, true); lh.setUint16(26, n.length, true);
    partes.push(new Uint8Array(lh.buffer), n, d);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(14, 0x5c21, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, d.length, true); ch.setUint32(24, d.length, true); ch.setUint16(28, n.length, true); ch.setUint32(42, pos, true);
    central.push(new Uint8Array(ch.buffer), n);
    pos += 30 + n.length + d.length;
  }
  const tamCentral = central.reduce((s, x) => s + x.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true); fin.setUint32(12, tamCentral, true); fin.setUint32(16, pos, true);
  const todo = [...partes, ...central, new Uint8Array(fin.buffer)];
  const out = new Uint8Array(todo.reduce((s, x) => s + x.length, 0));
  let o = 0; for (const x of todo) { out.set(x, o); o += x.length; }
  return out;
}

const letra = (i) => { let s = ''; for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };

function xmlHoja({filas, anchos = [], validaciones = [], fijarEncabezado = true}) {
  const cols = anchos.length ? `<cols>${anchos.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
  const datos = filas.map((fila, r) => `<row r="${r + 1}">${fila.map((v, c) => {
    if (v === null || v === undefined || v === '') return '';
    const ref = letra(c) + (r + 1), estilo = r === 0 && fijarEncabezado ? ' s="1"' : '';
    return typeof v === 'number' && Number.isFinite(v) ? `<c r="${ref}"${estilo}><v>${v}</v></c>` : `<c r="${ref}"${estilo} t="inlineStr"><is><t xml:space="preserve">${escapar(v)}</t></is></c>`;
  }).join('')}</row>`).join('');
  const vistas = fijarEncabezado ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : '';
  const val = validaciones.length ? `<dataValidations count="${validaciones.length}">${validaciones.map((x) => `<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="${x.rango}"><formula1>"${escapar(x.lista)}"</formula1></dataValidation>`).join('')}</dataValidations>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${vistas}${cols}<sheetData>${datos}</sheetData>${val}</worksheet>`;
}

/** hojas: [{nombre, filas: (texto|número|null)[][], anchos?, validaciones?: [{rango, lista}]}]. Devuelve los bytes del .xlsx. */
export function crearXlsx(hojas) {
  const H = hojas.map((h, i) => ({...h, n: i + 1}));
  return crearZip([
    {nombre: '[Content_Types].xml', texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${H.map((h) => `<Override PartName="/xl/worksheets/sheet${h.n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`},
    {nombre: '_rels/.rels', texto: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
    {nombre: 'xl/workbook.xml', texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${H.map((h) => `<sheet name="${escapar(h.nombre).slice(0, 31)}" sheetId="${h.n}" r:id="rId${h.n}"/>`).join('')}</sheets></workbook>`},
    {nombre: 'xl/_rels/workbook.xml.rels', texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${H.map((h) => `<Relationship Id="rId${h.n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${h.n}.xml"/>`).join('')}<Relationship Id="rId${H.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
    {nombre: 'xl/styles.xml', texto: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>'},
    ...H.map((h) => ({nombre: `xl/worksheets/sheet${h.n}.xml`, texto: xmlHoja(h)})),
  ]);
}
