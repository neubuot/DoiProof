/**
 * Plattformneutrale Hilfsfunktionen. Dieses Modul läuft unverändert in Node.js (Prüfprogramm),
 * im Electron-Hauptprozess (Windows-Prüfer) und in Hermes (Handy-App). Es nutzt deshalb weder
 * Buffer noch TextDecoder oder andere Node-/Browser-spezifische APIs.
 */

export const HEX64 = /^[0-9a-f]{64}$/;

/**
 * @param {unknown} ok
 * @param {string} message
 * @returns {asserts ok}
 */
export function assert(ok, message) {
  if (!ok) throw new Error(message);
}

/** @param {ArrayBuffer | Uint8Array} value */
export function toHex(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

/**
 * UTF-8-Kodierung nach WHATWG (einzelne Surrogate werden zu U+FFFD).
 * @param {string} text
 */
export function utf8Encode(text) {
  /** @type {number[]} */
  const out = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        i++;
      } else code = 0xfffd;
    } else if (code >= 0xd800 && code <= 0xdfff) code = 0xfffd;
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    else out.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
  }
  return Uint8Array.from(out);
}

/**
 * Strikte UTF-8-Dekodierung: überlange Formen, Surrogate und Werte über U+10FFFF sind Fehler.
 * @param {Uint8Array} bytes
 * @param {string} label
 */
export function utf8Decode(bytes, label = 'Text') {
  let out = '';
  /** @type {number[]} */
  let chunk = [];
  const flush = () => { out += String.fromCharCode(...chunk); chunk = []; };
  for (let i = 0; i < bytes.length;) {
    const b0 = bytes[i];
    let code; let need;
    if (b0 < 0x80) { code = b0; need = 0; }
    else if (b0 >= 0xc2 && b0 <= 0xdf) { code = b0 & 0x1f; need = 1; }
    else if (b0 >= 0xe0 && b0 <= 0xef) { code = b0 & 0x0f; need = 2; }
    else if (b0 >= 0xf0 && b0 <= 0xf4) { code = b0 & 0x07; need = 3; }
    else throw new Error(`Ungültige UTF-8-Kodierung: ${label}`);
    if (need && i + need >= bytes.length) throw new Error(`Ungültige UTF-8-Kodierung: ${label}`);
    for (let k = 1; k <= need; k++) {
      const b = bytes[i + k];
      if ((b & 0xc0) !== 0x80) throw new Error(`Ungültige UTF-8-Kodierung: ${label}`);
      code = (code << 6) | (b & 0x3f);
    }
    if ((need === 2 && (code < 0x800 || (code >= 0xd800 && code <= 0xdfff)))
      || (need === 3 && (code < 0x10000 || code > 0x10ffff))) {
      throw new Error(`Ungültige UTF-8-Kodierung: ${label}`);
    }
    i += need + 1;
    if (code > 0xffff) {
      code -= 0x10000;
      chunk.push(0xd800 + (code >> 10), 0xdc00 + (code & 0x3ff));
    } else chunk.push(code);
    if (chunk.length > 4096) flush();
  }
  flush();
  return out;
}

/**
 * @param {Uint8Array[]} chunks
 */
export function concatBytes(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
  return out;
}

/** @param {unknown} value @returns {value is Record<string, any>} */
export function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** @param {unknown} value */
export function isIsoTime(value) {
  return typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));
}

/**
 * Hash-Funktion, die jede Plattform bereitstellt (Node: crypto, App: expo-crypto).
 * @typedef {(bytes: Uint8Array) => Promise<string>} Sha256
 */

/**
 * @param {Sha256} sha256
 * @param {string} text
 */
export function sha256Text(sha256, text) {
  return sha256(utf8Encode(text));
}

/**
 * fetch mit Zeitlimit ohne AbortSignal.timeout (fehlt in Hermes).
 * @param {typeof fetch} fetchImpl
 * @param {string} url
 * @param {RequestInit} [options]
 * @param {number} [timeoutMs]
 */
export async function fetchWithTimeout(fetchImpl, url, options = {}, timeoutMs = 15000) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, ...(controller ? { signal: controller.signal } : {}) });
  } catch (error) {
    if (controller?.signal.aborted) throw new Error(`Zeitüberschreitung nach ${Math.round(timeoutMs / 1000)} s: ${url}`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
