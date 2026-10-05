/**
 * Minimale, begrenzte Auswertung von Bilddateien: Format, Abmessungen und ausgewählte EXIF-Felder.
 * Die Bilddatei ist durch den Foto-Hash gebunden; ihre EXIF-Angaben stammen von der Kamera und
 * sind nicht unabhängig belegt. GPS-Werte aus EXIF werden bewusst nicht ausgelesen, nur ihr
 * Vorhandensein, damit der Bericht keine zusätzlichen Ortsdaten preisgibt.
 */

/** @param {Uint8Array} b @param {number[]} sig @param {number} [offset] */
function startsWith(b, sig, offset = 0) {
  if (b.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (b[offset + i] !== sig[i]) return false;
  return true;
}

/** @param {Uint8Array} bytes */
export function detectImageType(bytes) {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { mime: 'image/jpeg', label: 'JPEG', embeddable: 'jpeg' };
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: 'image/png', label: 'PNG', embeddable: 'png' };
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return { mime: 'image/webp', label: 'WebP', embeddable: null };
  if (startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4)) {
    const brand = String.fromCharCode(...bytes.subarray(8, 12));
    if (/^(heic|heix|hevc|heim|heis|mif1|msf1)$/.test(brand)) return { mime: 'image/heic', label: 'HEIC', embeddable: null };
    if (/^avi[fs]$/.test(brand)) return { mime: 'image/avif', label: 'AVIF', embeddable: null };
  }
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return { mime: 'image/gif', label: 'GIF', embeddable: null };
  return { mime: 'application/octet-stream', label: 'unbekannt', embeddable: null };
}

/** @param {string} value */
function clean(value) {
  return value.replace(/\0+$/, '').replace(/[^\x20-\x7e -ÿ]/g, '').trim().slice(0, 80);
}

/**
 * @param {Uint8Array} b
 * @param {number} start  Anfang des TIFF-Headers
 * @param {number} end
 */
function parseTiff(b, start, end) {
  /** @type {Record<string, any>} */
  const exif = {};
  if (end - start < 8) return exif;
  const little = b[start] === 0x49 && b[start + 1] === 0x49;
  if (!little && !(b[start] === 0x4d && b[start + 1] === 0x4d)) return exif;
  const u16 = (/** @type {number} */ o) => (o + 2 > end ? -1 : little ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1]);
  const u32 = (/** @type {number} */ o) => (o + 4 > end ? -1
    : little ? (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16)) + b[o + 3] * 0x1000000
      : b[o] * 0x1000000 + ((b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]));
  if (u16(start + 2) !== 42) return exif;
  const sizes = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
  /** @param {number} ifd @param {(tag: number, read: () => any) => void} visit */
  const walk = (ifd, visit) => {
    const at = start + ifd;
    const count = u16(at);
    if (count < 0 || count > 256) return;
    for (let i = 0; i < count; i++) {
      const entry = at + 2 + i * 12;
      const tag = u16(entry); const type = u16(entry + 2); const n = u32(entry + 4);
      const size = /** @type {Record<number, number>} */ (sizes)[type];
      if (tag < 0 || !size || n < 0 || n > 4096) continue;
      const bytes = size * n;
      const dataAt = bytes <= 4 ? entry + 8 : start + u32(entry + 8);
      if (dataAt < start || dataAt + bytes > end) continue;
      visit(tag, () => {
        if (type === 2) return clean(String.fromCharCode(...b.subarray(dataAt, dataAt + n)));
        if (type === 3) return u16(dataAt);
        if (type === 4) return u32(dataAt);
        if (type === 5) { const den = u32(dataAt + 4); return den ? u32(dataAt) / den : null; }
        if (type === 10) {
          const s = (/** @type {number} */ v) => (v > 0x7fffffff ? v - 0x100000000 : v);
          const den = s(u32(dataAt + 4)); return den ? s(u32(dataAt)) / den : null;
        }
        return null;
      });
    }
  };
  let exifIfd = -1;
  walk(u32(start + 4), (tag, read) => {
    if (tag === 0x010f) exif.make = read();
    else if (tag === 0x0110) exif.model = read();
    else if (tag === 0x0112) exif.orientation = read();
    else if (tag === 0x0131) exif.software = read();
    else if (tag === 0x0132) exif.dateTime = read();
    else if (tag === 0x8769) exifIfd = read();
    else if (tag === 0x8825) exif.hasGps = true;
  });
  if (exifIfd > 0 && start + exifIfd < end) {
    walk(exifIfd, (tag, read) => {
      if (tag === 0x9003) exif.dateTimeOriginal = read();
      else if (tag === 0x9011) exif.offsetTimeOriginal = read();
      else if (tag === 0x829a) exif.exposureTime = read();
      else if (tag === 0x829d) exif.fNumber = read();
      else if (tag === 0x8827) exif.iso = read();
      else if (tag === 0x920a) exif.focalLength = read();
      else if (tag === 0xa405) exif.focalLength35mm = read();
      else if (tag === 0xa434) exif.lensModel = read();
    });
  }
  for (const [key, value] of Object.entries(exif)) {
    if (value === null || value === '' || (typeof value === 'number' && !Number.isFinite(value))) delete exif[key];
  }
  if (!(exif.orientation >= 1 && exif.orientation <= 8)) delete exif.orientation;
  return exif;
}

/**
 * @param {Uint8Array} bytes
 * @returns {{ type: ReturnType<typeof detectImageType>, width?: number, height?: number, exif: Record<string, any> }}
 */
export function readImageInfo(bytes) {
  const type = detectImageType(bytes);
  /** @type {{ type: ReturnType<typeof detectImageType>, width?: number, height?: number, exif: Record<string, any> }} */
  const info = { type, exif: {} };
  if (type.mime === 'image/png' && bytes.length >= 24) {
    info.width = ((bytes[16] << 24) >>> 0) + (bytes[17] << 16) + (bytes[18] << 8) + bytes[19];
    info.height = ((bytes[20] << 24) >>> 0) + (bytes[21] << 16) + (bytes[22] << 8) + bytes[23];
  }
  if (type.mime !== 'image/jpeg') return info;
  let offset = 2;
  let segments = 0;
  while (offset + 4 <= bytes.length && segments++ < 512) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    if (marker === 0xff) { offset++; continue; }
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker >= 0xd0 && marker <= 0xd7) { offset += 2; continue; }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) break;
    const body = offset + 4;
    if (marker === 0xe1 && length >= 8 && startsWith(bytes, [0x45, 0x78, 0x69, 0x66, 0, 0], body) && !Object.keys(info.exif).length) {
      info.exif = parseTiff(bytes, body + 6, offset + 2 + length);
    } else if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 7) {
      info.height = (bytes[body + 1] << 8) | bytes[body + 2];
      info.width = (bytes[body + 3] << 8) | bytes[body + 4];
    }
    offset += 2 + length;
  }
  return info;
}

export const ORIENTATION_TEXT = {
  1: 'normal', 2: 'gespiegelt', 3: 'um 180° gedreht', 4: 'vertikal gespiegelt',
  5: 'gespiegelt und um 90° gedreht', 6: 'um 90° im Uhrzeigersinn gedreht',
  7: 'gespiegelt und um 270° gedreht', 8: 'um 90° gegen den Uhrzeigersinn gedreht',
};
