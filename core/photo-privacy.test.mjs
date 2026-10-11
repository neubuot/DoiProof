import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import { readImageInfo, stripJpegMetadata } from './image.mjs';
import { ianaTimeZone, loadFonts, nodeSha256 } from './node.mjs';
import { createPdfReport, verifyPackage } from './pipeline.mjs';
import { SYNTHETIC_JPEG, buildBundle } from '../scripts/fixtures/fixture.mjs';
import { FONT_DIR } from '../scripts/verify.mjs';

const ascii = (/** @type {string} */ text) => [...text].map(c => c.charCodeAt(0));
const segment = (/** @type {number} */ marker, /** @type {number[]} */ body) => [0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 0xff, ...body];
const contains = (/** @type {Uint8Array} */ hay, /** @type {string} */ needle) => Buffer.from(hay).includes(Buffer.from(needle, 'latin1'));

/** Minimales EXIF (big endian) mit GPS-IFD-Verweis (Tag 0x8825) und Ausrichtung 6, dazu eine Testmarke. */
function exifWithGps() {
  const tiff = [
    ...ascii('MM'), 0, 42, 0, 0, 0, 8, // Kopf, IFD0 ab Offset 8
    0, 2, // zwei Einträge
    0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, // Orientation = 6
    0x88, 0x25, 0, 4, 0, 0, 0, 1, 0, 0, 0, 38, // GPS-IFD-Zeiger
    0, 0, 0, 0, // kein weiteres IFD
    0, 0, // GPS-IFD ohne Einträge (Offset 38)
    0, 0, 0, 0,
    ...ascii('GPS-TESTMARKE'),
  ];
  return segment(0xe1, [...ascii('Exif'), 0, 0, ...tiff]);
}

/** Synthetisches Testbild mit zusätzlichen Metadaten-Segmenten direkt nach SOI. */
async function photoWithMetadata() {
  const jpeg = new Uint8Array(await readFile(SYNTHETIC_JPEG));
  const extra = [
    ...exifWithGps(),
    ...segment(0xe1, ascii('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>XMP-TESTMARKE</x:xmpmeta>')),
    ...segment(0xed, ascii('Photoshop 3.0\0IPTC-TESTMARKE')),
    ...segment(0xfe, ascii('KOMMENTAR-TESTMARKE')),
    ...segment(0xe2, [...ascii('ICC_PROFILE'), 0, 1, 1, ...ascii('ICC-BLEIBT')]),
  ];
  return new Uint8Array([...jpeg.subarray(0, 2), ...extra, ...jpeg.subarray(2)]);
}

test('JPEG-Metadaten: EXIF/GPS, XMP, IPTC und Kommentare entfallen, Farbprofil und Bilddaten bleiben', async () => {
  const photo = await photoWithMetadata();
  assert.equal(readImageInfo(photo).exif.hasGps, true);
  const stripped = /** @type {Uint8Array} */ (stripJpegMetadata(photo));
  assert.ok(stripped);
  for (const mark of ['GPS-TESTMARKE', 'XMP-TESTMARKE', 'IPTC-TESTMARKE', 'KOMMENTAR-TESTMARKE', 'Exif']) assert.ok(!contains(stripped, mark), mark);
  assert.ok(contains(stripped, 'ICC-BLEIBT'));
  const info = readImageInfo(stripped);
  assert.deepEqual([info.width, info.height], [readImageInfo(photo).width, readImageInfo(photo).height]);
  assert.equal(info.exif.hasGps, undefined);
  // Ab SOS unverändert
  const sos = (/** @type {Uint8Array} */ b) => Buffer.from(b).indexOf(Buffer.from([0xff, 0xda]));
  assert.deepEqual(stripped.subarray(sos(stripped)), photo.subarray(sos(photo)));
  // Unbekannte Struktur: kein Ergebnis statt halber Daten
  assert.equal(stripJpegMetadata(new Uint8Array([0xff, 0xd8, 0x00, 0x01])), null);
  assert.equal(stripJpegMetadata(photo.subarray(0, 40)), null);
});

test('PDF-Bericht bettet das Foto ohne Kamera-Ortsangaben ein; das ZIP-Original bleibt unverändert', async () => {
  const photo = await photoWithMetadata();
  const { zipBytes } = await buildBundle({ version: 'v3', photo, modify: m => { m.profile = 'private'; m.location = { status: 'not_requested' }; } });
  const { analysis } = await verifyPackage(zipBytes, { sha256: nodeSha256 });
  assert.equal(analysis.ok, true);
  assert.deepEqual(analysis.photoBytes, photo, 'Original im Paket unverändert');
  const fonts = await loadFonts(FONT_DIR);
  const { pdf, model } = await createPdfReport({
    analysis, fileName: 'p.zip', fonts, generatedAt: new Date('2026-10-10T12:00:00Z'), timeZone: ianaTimeZone('Europe/Berlin'), producer: 'Test',
  });
  assert.equal(model.photo?.orientation, 6, 'Ausrichtung aus dem Original');
  const doc = await PDFDocument.load(pdf);
  const jpegs = doc.context.enumerateIndirectObjects()
    .map(([, object]) => object)
    .filter(object => object instanceof PDFRawStream && object.dict.get(PDFName.of('Filter')) === PDFName.of('DCTDecode'));
  assert.equal(jpegs.length, 1);
  const embedded = /** @type {PDFRawStream} */ (jpegs[0]).contents;
  for (const mark of ['GPS-TESTMARKE', 'XMP-TESTMARKE', 'IPTC-TESTMARKE', 'KOMMENTAR-TESTMARKE']) assert.ok(!contains(embedded, mark), mark);
  assert.deepEqual(embedded, stripJpegMetadata(photo));
  const gps = model.appendix.groups.flatMap(group => group.rows).find(row => row.quantity === 'GPS-Angaben im EXIF');
  assert.match(String(gps?.note), /im Foto dieses Berichts entfernt/);
});
