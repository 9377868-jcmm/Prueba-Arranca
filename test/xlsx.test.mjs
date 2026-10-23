import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import {leerXlsx, leerCsv, crearXlsx} from '../public/js/xlsx-lite.js';

// Zip con compresión (como lo guarda Excel) para probar el lector con archivos que no salen de nuestro escritor.
function zipDeflate(archivos, {declararReal} = {}) {
  const enc = new TextEncoder(), partes = [], central = []; let pos = 0;
  const crc = (b) => zlib.crc32(b);
  for (const [nombre, texto] of Object.entries(archivos)) {
    const n = enc.encode(nombre), d = enc.encode(texto), c = zlib.deflateRawSync(d);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(8, 8, true); lh.setUint32(14, crc(d), true); lh.setUint32(18, c.length, true); lh.setUint32(22, d.length, true); lh.setUint16(26, n.length, true);
    partes.push(new Uint8Array(lh.buffer), n, c);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(10, 8, true); ch.setUint32(16, crc(d), true); ch.setUint32(20, c.length, true); ch.setUint32(24, declararReal ?? d.length, true); ch.setUint16(28, n.length, true); ch.setUint32(42, pos, true);
    central.push(new Uint8Array(ch.buffer), n);
    pos += 30 + n.length + c.length;
  }
  const tam = central.reduce((s, x) => s + x.length, 0), fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, Object.keys(archivos).length, true); fin.setUint16(10, Object.keys(archivos).length, true); fin.setUint32(12, tam, true); fin.setUint32(16, pos, true);
  return Buffer.concat([...partes, ...central, new Uint8Array(fin.buffer)]);
}

test('escribir y volver a leer: texto, números, tildes, símbolos y celdas vacías', async () => {
  const filas = [['Empresa', 'Inicial', 'Nota'], ['Dale & "Play" <1>', 600, 'ñandú €'], ['x', null, '']];
  const leido = await leerXlsx(crearXlsx([{nombre: 'Precios', filas, anchos: [20, 10, 30]}, {nombre: 'Instrucciones', filas: [['Otra hoja']]}]).buffer);
  assert.deepEqual(leido, [['Empresa', 'Inicial', 'Nota'], ['Dale & "Play" <1>', 600, 'ñandú €'], ['x']]);
});

test('lee un archivo comprimido tipo Excel: cadenas compartidas, texto enriquecido, números, vacías y la primera hoja del libro', async () => {
  const x = zipDeflate({
    'xl/workbook.xml': '<workbook xmlns:r="x"><sheets><sheet name="Datos" sheetId="2" r:id="rId7"/><sheet name="Otra" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId7" Target="worksheets/sheet2.xml"/></Relationships>',
    'xl/sharedStrings.xml': '<sst><si><t>Empresa</t></si><si><r><t>Chek</t></r><r><t>ia</t></r><rPh><t>fonetica</t></rPh></si><si><t xml:space="preserve"> Con &amp; espacios </t></si></sst>',
    'xl/worksheets/sheet1.xml': '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>NO ES ESTA</t></is></c></row></sheetData></worksheet>',
    'xl/worksheets/sheet2.xml': '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="str"><f>A1</f><v>texto</v></c></row><row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2"><v>82.5</v></c><c r="D2" t="s"><v>2</v></c></row><row r="4"><c r="A4"/><c r="B4" t="b"><v>1</v></c></row></sheetData></worksheet>',
  });
  const t = await leerXlsx(x.buffer.slice(x.byteOffset, x.byteOffset + x.byteLength));
  assert.deepEqual(t[0], ['Empresa', 'texto']);
  assert.deepEqual(t[1], ['Chekia', 82.5, '', ' Con & espacios ']);
  assert.deepEqual(t[2], []); assert.equal(t[3][1], 'VERDADERO');
});

test('rechaza lo que no es un .xlsx, lo dañado y los zip que se inflan', async () => {
  await assert.rejects(() => leerXlsx(new TextEncoder().encode('esto no es un excel').buffer), /xlsx/);
  await assert.rejects(() => leerXlsx(new Uint8Array(2 * 1024 * 1024 + 1).buffer), /2 MB/);
  const bomba = zipDeflate({'xl/worksheets/sheet1.xml': '<worksheet/>'}, {declararReal: 50 * 1024 * 1024});
  await assert.rejects(() => leerXlsx(bomba.buffer.slice(bomba.byteOffset, bomba.byteOffset + bomba.byteLength)), /demasiado grande/);
  const sinHojas = zipDeflate({'xl/otra.xml': '<a/>'});
  await assert.rejects(() => leerXlsx(sinHojas.buffer.slice(sinHojas.byteOffset, sinHojas.byteOffset + sinHojas.byteLength)), /hojas/);
});

test('la plantilla lleva listas desplegables y encabezado fijo', () => {
  const bytes = crearXlsx([{nombre: 'P', filas: [['A', 'B']], validaciones: [{rango: 'B2:B9', lista: 'USD,EUR'}]}]);
  const texto = Buffer.from(bytes).toString('latin1');
  assert.ok(texto.includes('USD,EUR')); assert.ok(texto.includes('state="frozen"'));
});

test('CSV: separador de ; , o tabulación, comillas, saltos dentro de comillas, BOM y CRLF', () => {
  assert.deepEqual(leerCsv('﻿a;b;c\r\n1;"x;y";3\r\n'), [['a', 'b', 'c'], ['1', 'x;y', '3']]);
  assert.deepEqual(leerCsv('a,b\n"he said ""hi""","dos\nlíneas"\n'), [['a', 'b'], ['he said "hi"', 'dos\nlíneas']]);
  assert.deepEqual(leerCsv('a\tb\n1\t2'), [['a', 'b'], ['1', '2']]);
  assert.deepEqual(leerCsv(''), []);
});
