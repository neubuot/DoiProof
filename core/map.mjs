/**
 * Kartenausschnitt mit OpenStreetMap-Kacheln (Web-Mercator) für den Windows-Prüfer und den
 * PDF-Prüfbericht. Kacheln werden nur geladen, wenn die Karte eingeschaltet ist; der Dienst sieht dabei
 * ungefähr den Standort und die IP-Adresse. Der PDF-Renderer selbst greift nie auf das Netz zu.
 * Plattformneutral (Node und Hermes): kein Buffer, kein TextDecoder, kein AbortSignal.timeout.
 */
import { fetchWithTimeout } from './util.mjs';
import { crc32 } from './verify.mjs';

export const MAP_ZOOM = 14;
export const TILE_SIZE = 256;
export const TILE_HOST = 'https://tile.openstreetmap.org';
export const TILE_MAX_BYTES = 1024 * 1024;
export const TILE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const MAP_ATTRIBUTION = '© OpenStreetMap contributors';
export const MAP_COPYRIGHT = 'Kartendaten © OpenStreetMap-Mitwirkende, openstreetmap.org/copyright';
/** Größe des Ausschnitts im PDF in CSS-Pixeln (1 px = 0,75 pt); Höhe wie im Windows-Prüfer. */
export const REPORT_MAP_SIZE = { width: 672, height: 340 };

/**
 * @typedef {{ x: number, y: number, zoom: number }} TileId
 * @typedef {TileId & { left: number, top: number }} PlacedTile  left/top: Lage im Ausschnitt in px
 * @typedef {{ latitude: number, longitude: number, zoom: number, width: number, height: number, tiles: PlacedTile[] }} MapView
 * @typedef {{ get(key: string): Promise<Uint8Array | null>, put(key: string, bytes: Uint8Array): Promise<void> }} TileCache
 * @typedef {{ fetchImpl?: typeof fetch, userAgent: string, cache?: TileCache | null, timeoutMs?: number }} TileLoader
 * @typedef {{ view: MapView, tiles: (PlacedTile & { bytes: Uint8Array })[], loadedAt: string }} LoadedMap
 */

/** @param {unknown} latitude @param {unknown} longitude */
export function validCoordinates(latitude, longitude) {
  return typeof latitude === 'number' && typeof longitude === 'number' && Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

/**
 * Weltpixel der Koordinate bei der Zoomstufe (Web-Mercator, 256-px-Kacheln).
 * @param {number} latitude @param {number} longitude @param {number} zoom
 */
export function worldPixel(latitude, longitude, zoom) {
  if (!validCoordinates(latitude, longitude)) throw new Error('Keine gültigen Koordinaten im Manifest.');
  const n = 2 ** zoom;
  const lat = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const sin = Math.sin(lat * Math.PI / 180);
  const x = (longitude + 180) / 360 * n * TILE_SIZE;
  const y = (1 - Math.log((1 + sin) / (1 - sin)) / (2 * Math.PI)) / 2 * n * TILE_SIZE;
  return { x: Math.min(n * TILE_SIZE - 1e-6, x), y: Math.min(n * TILE_SIZE - 1e-6, y), n };
}

/**
 * 3 × 3 Kacheln um die Koordinate für die Kartenansicht des Windows-Prüfers.
 * @param {number} latitude @param {number} longitude @param {number} [zoom]
 */
export function tileGrid(latitude, longitude, zoom = MAP_ZOOM) {
  const { x, y, n } = worldPixel(latitude, longitude, zoom);
  const tx = Math.floor(x / TILE_SIZE);
  const ty = Math.floor(y / TILE_SIZE);
  /** @type {(TileId & { col: number, row: number })[]} */
  const tiles = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const row = ty + dy;
      if (row >= 0 && row < n) tiles.push({ col: dx + 1, row: dy + 1, x: (tx + dx + n) % n, y: row, zoom });
    }
  }
  return { tiles, centerX: TILE_SIZE + x - tx * TILE_SIZE, centerY: TILE_SIZE + y - ty * TILE_SIZE };
}

/**
 * Alle Kacheln, die einen Ausschnitt von width × height px mit der Koordinate in der Mitte füllen.
 * @param {number} latitude @param {number} longitude
 * @param {{ width: number, height: number, zoom?: number }} size
 * @returns {MapView}
 */
export function mapView(latitude, longitude, { width, height, zoom = MAP_ZOOM }) {
  const { x, y, n } = worldPixel(latitude, longitude, zoom);
  const left = x - width / 2;
  const top = y - height / 2;
  /** @type {PlacedTile[]} */
  const tiles = [];
  for (let ty = Math.floor(top / TILE_SIZE); ty <= Math.floor((top + height - 1e-6) / TILE_SIZE); ty++) {
    if (ty < 0 || ty >= n) continue;
    for (let tx = Math.floor(left / TILE_SIZE); tx <= Math.floor((left + width - 1e-6) / TILE_SIZE); tx++) {
      tiles.push({ x: ((tx % n) + n) % n, y: ty, zoom, left: tx * TILE_SIZE - left, top: ty * TILE_SIZE - top });
    }
  }
  return { latitude, longitude, zoom, width, height, tiles };
}

/** @param {TileId} tile */
export function tileUrl(tile) {
  return `${TILE_HOST}/${tile.zoom}/${tile.x}/${tile.y}.png`;
}

/** Schlüssel für den Kachel-Cache, z. B. „14-8716-5686“. @param {TileId} tile */
export function tileKey(tile) {
  return `${tile.zoom}-${tile.x}-${tile.y}`;
}

/** User-Agent nach den Regeln des OSM-Kacheldienstes. @param {string} product z. B. „DoiProof-Pruefer/1.0.0 (Kommandozeile)“ */
export function mapUserAgent(product) {
  return `${product} (+https://github.com/neubuot/DoiProof)`;
}

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const PNG_BIT_DEPTHS = new Set([1, 2, 4, 8, 16]);
const PNG_COLOR_TYPES = new Set([0, 2, 3, 4, 6]);

/**
 * Prüft eine Kachel vollständig, bevor sie den PNG-Decoder erreicht: Signatur, 256 × 256 px,
 * lückenlose Chunk-Folge mit gültigen CRC32-Prüfsummen, mindestens ein IDAT und IEND am Ende.
 * Abgeschnittene oder manipulierte Antworten werden so abgewiesen (der Decoder von pdf-lib kann
 * an solchen Daten hängen bleiben). Ohne Plattform-APIs, damit es auch in Hermes läuft.
 * @param {Uint8Array} bytes
 */
export function isTilePng(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 57 || bytes.length > TILE_MAX_BYTES) return false;
  if (PNG_SIGNATURE.some((value, i) => bytes[i] !== value)) return false;
  const u32 = (/** @type {number} */ at) => ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0;
  const type = (/** @type {number} */ at) => String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);
  let offset = 8;
  let chunks = 0;
  let idat = false;
  while (offset + 12 <= bytes.length) {
    const length = u32(offset);
    const name = type(offset + 4);
    const end = offset + 12 + length;
    if (end > bytes.length || !/^[A-Za-z]{4}$/.test(name)) return false;
    if (crc32(bytes.subarray(offset + 4, offset + 8 + length)) !== u32(offset + 8 + length)) return false;
    if (chunks === 0) {
      const d = offset + 8;
      if (name !== 'IHDR' || length !== 13 || u32(d) !== TILE_SIZE || u32(d + 4) !== TILE_SIZE) return false;
      if (!PNG_BIT_DEPTHS.has(bytes[d + 8]) || !PNG_COLOR_TYPES.has(bytes[d + 9]) || bytes[d + 12] > 1) return false;
    }
    if (name === 'IDAT') idat = true;
    chunks++;
    offset = end;
    if (name === 'IEND') return idat && length === 0 && offset === bytes.length;
  }
  return false;
}

/**
 * Lädt die Kacheln eines Ausschnitts nacheinander (schonend für den Kacheldienst), zuerst aus dem Cache.
 * Wirft, wenn eine Kachel fehlt; ein lückenhafter Ausschnitt würde den Ort verfälscht darstellen.
 * @param {MapView} view @param {TileLoader} loader
 * @returns {Promise<(PlacedTile & { bytes: Uint8Array })[]>}
 */
export async function loadMapTiles(view, loader) {
  const fetchImpl = loader.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('Kein Netzwerkzugriff verfügbar.');
  /** @type {Map<string, Uint8Array>} */
  const loaded = new Map();
  const result = [];
  for (const tile of view.tiles) {
    const key = tileKey(tile);
    let bytes = loaded.get(key) ?? null;
    if (!bytes) {
      try { bytes = (await loader.cache?.get(key)) ?? null; } catch { bytes = null; }
      if (bytes && !isTilePng(bytes)) bytes = null;
    }
    if (!bytes) {
      const response = await fetchWithTimeout(fetchImpl, tileUrl(tile), { headers: { 'User-Agent': loader.userAgent } }, loader.timeoutMs ?? 12000);
      if (!response.ok) throw new Error(`Kartenkachel nicht verfügbar (HTTP ${response.status}).`);
      const type = response.headers?.get?.('content-type') ?? '';
      if (!type.startsWith('image/png')) throw new Error('Der Kartendienst lieferte kein PNG.');
      bytes = new Uint8Array(await response.arrayBuffer());
      if (!isTilePng(bytes)) throw new Error('Kartenkachel ist beschädigt oder zu groß.');
      try { await loader.cache?.put(key, bytes); } catch { /* Ein voller Cache verhindert die Karte nicht. */ }
    }
    loaded.set(key, bytes);
    result.push({ ...tile, bytes });
  }
  return result;
}

/**
 * Lädt den Kartenausschnitt für den PDF-Bericht zu einer Koordinate.
 * @param {number} latitude @param {number} longitude @param {TileLoader & { now?: () => Date }} loader
 * @returns {Promise<LoadedMap>}
 */
export async function loadReportMap(latitude, longitude, loader) {
  const view = mapView(latitude, longitude, REPORT_MAP_SIZE);
  const tiles = await loadMapTiles(view, loader);
  return { view, tiles, loadedAt: (loader.now?.() ?? new Date()).toISOString() };
}
