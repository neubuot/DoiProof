/**
 * Node.js-Adapter für Kommandozeile und Windows-Prüfer (Electron-Hauptprozess).
 * Darf nicht in der App importiert werden (node:crypto, node:fs).
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { TILE_MAX_AGE_MS } from './map.mjs';

/** @param {Uint8Array} bytes */
export async function nodeSha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Kachel-Cache im Dateisystem (Windows-Prüfer: Benutzerprofil). Die Dateinamen verraten den
 * ungefähren Standort; deshalb nur in einem privaten Verzeichnis verwenden.
 * @param {string} directory @param {number} [maxAgeMs]
 * @returns {import('./map.mjs').TileCache}
 */
export function fileTileCache(directory, maxAgeMs = TILE_MAX_AGE_MS) {
  const path = (/** @type {string} */ key) => join(directory, `${key.replace(/[^0-9-]/g, '')}.png`);
  return {
    async get(key) {
      try {
        if (Date.now() - (await stat(path(key))).mtimeMs >= maxAgeMs) return null;
        return new Uint8Array(await readFile(path(key)));
      } catch { return null; }
    },
    async put(key, bytes) {
      await mkdir(directory, { recursive: true });
      await writeFile(path(key), bytes);
    },
  };
}

export const FONT_FILES = {
  serif: 'Fraunces-SemiBold.ttf',
  serifItalic: 'Fraunces-Italic.ttf',
  sans: 'IBMPlexSans-Regular.ttf',
  sansBold: 'IBMPlexSans-SemiBold.ttf',
  mono: 'IBMPlexMono-Regular.ttf',
  monoMedium: 'IBMPlexMono-Medium.ttf',
};

/** @param {string} directory @returns {Promise<import('./report-pdf.mjs').FontBytes>} */
export async function loadFonts(directory) {
  const entries = await Promise.all(Object.entries(FONT_FILES).map(async ([key, file]) => [key, new Uint8Array(await readFile(join(directory, file)))]));
  return /** @type {any} */ (Object.fromEntries(entries));
}

/**
 * Zeitzone nach IANA-Name (z. B. Europe/Berlin), berechnet mit Intl (in Node vollständig verfügbar).
 * @param {string} name
 * @returns {import('./format.mjs').TimeZone}
 */
export function ianaTimeZone(name) {
  const format = new Intl.DateTimeFormat('en-US', {
    timeZone: name, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
  });
  return {
    name,
    offsetMinutes(date) {
      /** @type {Record<string, number>} */
      const parts = {};
      for (const part of format.formatToParts(date)) if (part.type !== 'literal') parts[part.type] = Number(part.value);
      const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
      return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
    },
  };
}
