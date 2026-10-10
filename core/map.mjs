/**
 * Kartenausschnitt mit OpenStreetMap-Kacheln (Web-Mercator) für den Windows-Prüfer und den
 * PDF-Prüfbericht. Kacheln werden nur geladen, wenn die Karte eingeschaltet ist; der Dienst sieht dabei
 * ungefähr den Standort und die IP-Adresse. Der PDF-Renderer selbst greift nie auf das Netz zu.
 * Plattformneutral (Node und Hermes): kein Buffer, kein TextDecoder, kein AbortSignal.timeout.
 */
import { inspectPng } from './png.mjs';
import { fetchBytesWithTimeout } from './util.mjs';

export const MAP_ZOOM = 14;
const MERCATOR_LIMIT = 85.05112878;
export const TILE_SIZE = 256;
export const TILE_HOST = 'https://tile.openstreetmap.org';
export const TILE_MAX_BYTES = 1024 * 1024;
export const TILE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const MAP_ATTRIBUTION = '© OpenStreetMap contributors';
export const MAP_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';
export const MAP_COPYRIGHT = `Kartendaten © OpenStreetMap-Mitwirkende, ${MAP_COPYRIGHT_URL}`;
/**
 * Ausschnitt im PDF in CSS-Pixeln (1 px = 0,75 pt): Höhe und größte Breite der Kartenansicht des
 * Windows-Prüfers (einspaltige Darstellung), also derselbe Maßstab und Zuschnitt.
 */
export const REPORT_MAP_SIZE = { width: 662, height: 340 };
/** Geladener Bereich der Kartenansicht im Windows-Prüfer; deckt jede Kartenbreite bis 768 px ab. */
export const VIEWER_MAP_SIZE = { width: 768, height: 340 };

/**
 * @typedef {{ x: number, y: number, zoom: number }} TileId
 * @typedef {TileId & { left: number, top: number }} PlacedTile  left/top: Lage im Ausschnitt in px
 * @typedef {{ latitude: number, longitude: number, zoom: number, width: number, height: number, tiles: PlacedTile[] }} MapView
 * @typedef {{ bytes: Uint8Array, storedAt: number }} CachedTile  storedAt: Abrufzeit in ms seit 1970
 * @typedef {{ get(key: string): Promise<CachedTile | null>, put(key: string, bytes: Uint8Array): Promise<void> }} TileCache
 * @typedef {{ fetchImpl?: typeof fetch, userAgent: string, cache?: TileCache | null, timeoutMs?: number, now?: () => Date }} TileLoader
 * @typedef {PlacedTile & { bytes: Uint8Array, fetchedAt: number }} LoadedTile
 * @typedef {{ view: MapView, tiles: LoadedTile[], loadedAt: string, loadedUntil: string }} LoadedMap
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
  const lat = Math.max(-MERCATOR_LIMIT, Math.min(MERCATOR_LIMIT, latitude));
  const sin = Math.sin(lat * Math.PI / 180);
  const x = (longitude + 180) / 360 * n * TILE_SIZE;
  const y = (1 - Math.log((1 + sin) / (1 - sin)) / (2 * Math.PI)) / 2 * n * TILE_SIZE;
  return { x: Math.min(n * TILE_SIZE - 1e-6, x), y: Math.min(n * TILE_SIZE - 1e-6, y), n };
}

/**
 * Alle Kacheln, die einen Ausschnitt von width × height px mit der Koordinate in der Mitte füllen.
 * @param {number} latitude @param {number} longitude
 * @param {{ width: number, height: number, zoom?: number }} size
 * @returns {MapView}
 */
export function mapView(latitude, longitude, { width, height, zoom = MAP_ZOOM }) {
  // Web-Mercator reicht nur bis ±85,05° Breite; darüber hinaus stünde die Markierung am Kartenrand statt am Ort.
  if (validCoordinates(latitude, longitude) && Math.abs(latitude) > MERCATOR_LIMIT) {
    throw new Error('Die Koordinate liegt außerhalb des Kartenbereichs (über ±85° Breite).');
  }
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

/**
 * Prüft eine Kachel vollständig, bevor sie Cache oder PNG-Decoder erreicht: Größenlimit, 256 × 256 px,
 * gültige Chunk-Folge mit CRC32 und ein vollständig entpackbarer zlib-Strom (siehe core/png.mjs).
 * @param {Uint8Array} bytes
 */
export function isTilePng(bytes) {
  return bytes instanceof Uint8Array && bytes.length <= TILE_MAX_BYTES
    && inspectPng(bytes, { width: TILE_SIZE, height: TILE_SIZE, maxInflated: 4 * 1024 * 1024 }).ok;
}

/**
 * Lädt die Kacheln eines Ausschnitts nacheinander (schonend für den Kacheldienst), zuerst aus dem Cache.
 * Wirft, wenn eine Kachel fehlt; ein lückenhafter Ausschnitt würde den Ort verfälscht darstellen.
 * @param {MapView} view @param {TileLoader} loader
 * @returns {Promise<LoadedTile[]>}
 */
export async function loadMapTiles(view, loader) {
  const fetchImpl = loader.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('Kein Netzwerkzugriff verfügbar.');
  const timeoutMs = loader.timeoutMs ?? 12000;
  /** @type {Map<string, CachedTile>} */
  const loaded = new Map();
  const result = [];
  for (const tile of view.tiles) {
    const key = tileKey(tile);
    let entry = loaded.get(key) ?? null;
    if (!entry) {
      try { entry = (await loader.cache?.get(key)) ?? null; } catch { entry = null; }
      if (entry && !isTilePng(entry.bytes)) entry = null;
    }
    if (!entry) {
      let response;
      try {
        response = await fetchBytesWithTimeout(fetchImpl, tileUrl(tile), {
          init: { headers: { 'User-Agent': loader.userAgent } }, timeoutMs, maxBytes: TILE_MAX_BYTES, label: 'Kartendienst',
        });
      } catch (error) {
        // Plattformmeldungen wie „fetch failed“ oder „Network request failed“ nicht in den Bericht übernehmen
        throw new Error(error instanceof Error && error.message.startsWith('Zeitüberschreitung')
          ? `Zeitüberschreitung beim Kartendienst (${Math.round(timeoutMs / 1000)} s).` : 'Kartendienst nicht erreichbar (keine Verbindung).');
      }
      if (!response.ok) throw new Error(response.status === 200 ? 'Kartenkachel ist zu groß.' : `Kartenkachel nicht verfügbar (HTTP ${response.status}).`);
      if (!response.contentType.startsWith('image/png')) throw new Error('Der Kartendienst lieferte kein PNG.');
      if (!isTilePng(response.bytes)) throw new Error('Kartenkachel ist beschädigt oder zu groß.');
      entry = { bytes: response.bytes, storedAt: (loader.now?.() ?? new Date()).getTime() };
      try { await loader.cache?.put(key, response.bytes); } catch { /* Ein voller Cache verhindert die Karte nicht. */ }
    }
    loaded.set(key, entry);
    result.push({ ...tile, bytes: entry.bytes, fetchedAt: entry.storedAt });
  }
  return result;
}

/**
 * Lädt den Kartenausschnitt für den PDF-Bericht zu einer Koordinate.
 * Abrufzeit ist die älteste und jüngste Abrufzeit der Kacheln; aus dem Cache können sie bis 7 Tage alt sein.
 * @param {number} latitude @param {number} longitude @param {TileLoader} loader
 * @returns {Promise<LoadedMap>}
 */
export async function loadReportMap(latitude, longitude, loader) {
  const view = mapView(latitude, longitude, REPORT_MAP_SIZE);
  const tiles = await loadMapTiles(view, loader);
  const times = tiles.map(tile => tile.fetchedAt);
  return { view, tiles, loadedAt: new Date(Math.min(...times)).toISOString(), loadedUntil: new Date(Math.max(...times)).toISOString() };
}
