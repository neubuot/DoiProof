/**
 * Node.js-Adapter für Kommandozeile und Windows-Prüfer (Electron-Hauptprozess).
 * Darf nicht in der App importiert werden (node:crypto, node:fs).
 */
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { TILE_MAX_AGE_MS } from './map.mjs';

/** @param {Uint8Array} bytes */
export async function nodeSha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

const CLOCK_TOLERANCE_MS = 60 * 1000;

/**
 * Kachel-Cache im Dateisystem (Windows-Prüfer: Benutzerprofil, Kommandozeile: Benutzer-Cache).
 * Die Dateinamen verraten den ungefähren Standort; deshalb nur in einem privaten Verzeichnis
 * verwenden. Kacheln werden höchstens maxAgeMs lang genutzt und danach gelöscht.
 * @param {string} directory @param {number} [maxAgeMs]
 * @returns {import('./map.mjs').TileCache}
 */
export function fileTileCache(directory, maxAgeMs = TILE_MAX_AGE_MS) {
  const path = (/** @type {string} */ key) => join(directory, `${key.replace(/[^0-9-]/g, '')}.png`);
  // Kleine Abweichungen in die Zukunft (Zeitauflösung des Dateisystems) gelten als frisch.
  const expired = (/** @type {number} */ mtimeMs) => { const age = Date.now() - mtimeMs; return age < -CLOCK_TOLERANCE_MS || age >= maxAgeMs; };
  return {
    async get(key) {
      try {
        const info = await stat(path(key));
        if (expired(info.mtimeMs)) { await unlink(path(key)).catch(() => {}); return null; }
        return { bytes: new Uint8Array(await readFile(path(key))), storedAt: info.mtimeMs };
      } catch { return null; }
    },
    async put(key, bytes) {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      // Erst vollständig schreiben, dann umbenennen: ein Abbruch hinterlässt keine halbe Kachel.
      const temporary = `${path(key)}.${process.pid}.part`;
      await writeFile(temporary, bytes, { mode: 0o600 });
      await rename(temporary, path(key));
      // Abgelaufene Kacheln und liegen gebliebene Teildateien entfernen
      for (const name of await readdir(directory)) {
        if (!/^\d+-\d+-\d+\.png(\.\d+\.part)?$/.test(name)) continue;
        const file = join(directory, name);
        try { if (expired((await stat(file)).mtimeMs)) await unlink(file); } catch { /* bereits entfernt */ }
      }
    },
  };
}

/** Privates Cache-Verzeichnis des Benutzers für die Kommandozeile (je Betriebssystem üblich). */
export function userCacheDirectory() {
  if (process.platform === 'win32') return join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'DoiProof', 'Cache');
  if (process.platform === 'darwin') return join(homedir(), 'Library', 'Caches', 'DoiProof');
  return join(process.env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'doiproof');
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
