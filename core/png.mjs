/**
 * Strenge PNG-Prüfung vor dem Einbetten in den PDF-Bericht. Der PNG-Decoder von pdf-lib
 * (@pdf-lib/upng) kehrt bei einem abgeschnittenen zlib-Strom nicht zurück; ein präpariertes Foto
 * in einem fremden Beweispaket oder eine kaputte Kartenkachel könnte so die Berichtserzeugung
 * endlos blockieren. Diese Prüfung entpackt die Bilddaten deshalb vorab mit dem zlib-Decoder von
 * pako, ohne sie zu speichern, und lässt nur vollständige, exakt passende Ströme durch.
 * Plattformneutral (Node und Hermes).
 */
import zlibInflate from 'pako/lib/zlib/inflate.js';
import ZStream from 'pako/lib/zlib/zstream.js';
import { crc32 } from './verify.mjs';

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
/** Erlaubte Bittiefen je Farbtyp und Zahl der Kanäle (PNG-Spezifikation, Tabelle 11.1). */
const COLOR_TYPES = /** @type {Record<number, { depths: number[], channels: number }>} */ ({
  0: { depths: [1, 2, 4, 8, 16], channels: 1 },
  2: { depths: [8, 16], channels: 3 },
  3: { depths: [1, 2, 4, 8], channels: 1 },
  4: { depths: [8, 16], channels: 2 },
  6: { depths: [8, 16], channels: 4 },
});
const ADAM7 = [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]];
const Z_OK = 0;
const Z_STREAM_END = 1;
/** Obergrenze der entpackten Bilddaten (ungefilterte Zeilen), damit kein Bild den Speicher sprengt. */
export const PNG_MAX_INFLATED = 256 * 1024 * 1024;

/**
 * Erwartete Länge der entpackten Bilddaten (Filterbyte plus Zeilenbytes je Zeile).
 * @param {number} width @param {number} height @param {number} channels @param {number} depth @param {boolean} interlaced
 */
function expectedLength(width, height, channels, depth, interlaced) {
  const row = (/** @type {number} */ w) => Math.ceil((w * channels * depth) / 8) + 1;
  if (!interlaced) return row(width) * height;
  let total = 0;
  for (const [x0, y0, dx, dy] of ADAM7) {
    const w = width > x0 ? Math.ceil((width - x0) / dx) : 0;
    const h = height > y0 ? Math.ceil((height - y0) / dy) : 0;
    if (w && h) total += row(w) * h;
  }
  return total;
}

/**
 * @param {Uint8Array} bytes
 * @param {{ maxInflated?: number, width?: number, height?: number }} [options] width/height: erzwungene Maße
 * @returns {{ ok: true, width: number, height: number, colorType: number, bitDepth: number } | { ok: false, reason: string }}
 */
export function inspectPng(bytes, options = {}) {
  const fail = (/** @type {string} */ reason) => /** @type {{ ok: false, reason: string }} */ ({ ok: false, reason });
  if (!(bytes instanceof Uint8Array) || bytes.length < 57) return fail('keine PNG-Datei');
  if (SIGNATURE.some((value, i) => bytes[i] !== value)) return fail('keine PNG-Datei');
  const u32 = (/** @type {number} */ at) => ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0;
  const type = (/** @type {number} */ at) => String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);

  // 1. Chunk-Folge: lückenlos, gültige CRC32, IHDR zuerst, IEND genau am Ende
  /** @type {[number, number][]} */
  const idat = [];
  let header = null;
  let palette = false;
  let idatClosed = false;
  let offset = 8;
  let ended = false;
  while (offset + 12 <= bytes.length) {
    const length = u32(offset);
    const name = type(offset + 4);
    const data = offset + 8;
    const end = data + length + 4;
    if (end > bytes.length || !/^[A-Za-z]{4}$/.test(name)) return fail('Chunk-Struktur beschädigt');
    if (crc32(bytes.subarray(offset + 4, data + length)) !== u32(data + length)) return fail('Prüfsumme eines Chunks falsch');
    if (!header) {
      if (name !== 'IHDR' || length !== 13) return fail('IHDR fehlt');
      header = {
        width: u32(data), height: u32(data + 4), bitDepth: bytes[data + 8], colorType: bytes[data + 9],
        compression: bytes[data + 10], filter: bytes[data + 11], interlace: bytes[data + 12],
      };
    } else if (name === 'IHDR') return fail('doppelter Bildkopf');
    // Animierte PNGs (APNG): Der Decoder übernähme die Maße der Einzelbilder und könnte riesige Puffer anlegen
    else if (name === 'acTL' || name === 'fcTL' || name === 'fdAT') return fail('animierte PNG werden nicht eingebettet');
    else if (name === 'PLTE') {
      if (palette || idat.length || !length || length % 3 !== 0 || length > 768) return fail('Farbpalette ungültig');
      palette = true;
    } else if (name === 'IDAT') {
      if (idatClosed) return fail('Bilddaten nicht zusammenhängend');
      if (length) idat.push([data, length]);
    } else if (name === 'IEND') { ended = length === 0 && end === bytes.length; break; }
    if (idat.length && name !== 'IDAT') idatClosed = true;
    offset = end;
  }
  if (!header || !ended) return fail('Datei unvollständig');
  const { width, height, bitDepth, colorType, compression, filter, interlace } = header;
  const color = COLOR_TYPES[colorType];
  if (!color || !color.depths.includes(bitDepth) || compression !== 0 || filter !== 0 || interlace > 1) return fail('unbekanntes PNG-Format');
  if (!width || !height || width > 100000 || height > 100000) return fail('ungültige Bildmaße');
  if ((options.width !== undefined && width !== options.width) || (options.height !== undefined && height !== options.height)) return fail('unerwartete Bildmaße');
  if (colorType === 3 && !palette) return fail('Farbpalette fehlt');
  if (!idat.length) return fail('keine Bilddaten');
  const expected = expectedLength(width, height, color.channels, bitDepth, interlace === 1);
  if (expected > (options.maxInflated ?? PNG_MAX_INFLATED)) return fail('Bild zu groß zum Einbetten');

  // 2. zlib-Strom vollständig entpacken (ohne zu speichern): Ende erreicht, Adler-32 stimmt,
  //    Länge genau wie erwartet, keine überzähligen Bytes
  const stream = new Uint8Array(idat.reduce((sum, [, length]) => sum + length, 0));
  let at = 0;
  for (const [start, length] of idat) { stream.set(bytes.subarray(start, start + length), at); at += length; }
  const strm = new ZStream();
  if (zlibInflate.inflateInit(strm) !== Z_OK) return fail('Bilddaten nicht lesbar');
  strm.input = stream;
  strm.next_in = 0;
  strm.avail_in = stream.length;
  const out = new Uint8Array(65536);
  let total = 0;
  let status = Z_OK;
  try {
    for (let rounds = Math.ceil(expected / out.length) + 4; rounds > 0 && status === Z_OK; rounds--) {
      strm.output = out;
      strm.next_out = 0;
      strm.avail_out = out.length;
      status = zlibInflate.inflate(strm, 0);
      total += out.length - strm.avail_out;
      if (total > expected) return fail('mehr Bilddaten als angegeben');
    }
  } catch {
    return fail('Bilddaten nicht lesbar');
  } finally {
    zlibInflate.inflateEnd(strm);
  }
  if (status !== Z_STREAM_END) return fail('Bilddaten unvollständig oder beschädigt');
  if (total !== expected || strm.avail_in !== 0) return fail('Bilddaten passen nicht zu den Bildmaßen');
  return { ok: true, width, height, colorType, bitDepth };
}
