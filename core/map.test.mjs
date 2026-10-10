import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import JSZip from 'jszip';
import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import {
  MAP_ATTRIBUTION, REPORT_MAP_SIZE, TILE_SIZE, VIEWER_MAP_SIZE, isTilePng, loadMapTiles, mapUserAgent, mapView, tileKey, tileUrl,
} from './map.mjs';
import { fileTileCache, ianaTimeZone, loadFonts, nodeSha256 } from './node.mjs';
import { crc32 } from './verify.mjs';
import { createPdfReport, verifyPackage } from './pipeline.mjs';
import { buildBundle, fakeChain, fakeTileServer, syntheticTile, truncatedStreamPng } from '../scripts/fixtures/fixture.mjs';
import { inspectPng } from './png.mjs';
import { buildReportModel } from './report-model.mjs';
import { renderReportPdf } from './report-pdf.mjs';
import { cli, FONT_DIR } from '../scripts/verify.mjs';

const BERLIN = ianaTimeZone('Europe/Berlin');
const NOW = new Date('2026-10-10T12:00:00Z');
const AGENT = mapUserAgent('DoiProof-Test/1.0.0');

/** @param {Uint8Array} pdf */
async function imageCount(pdf) {
  const doc = await PDFDocument.load(pdf);
  return doc.context.enumerateIndirectObjects()
    .filter(([, object]) => object instanceof PDFRawStream && object.dict.get(PDFName.of('Subtype'))?.toString() === '/Image').length;
}

/** @param {(m: Record<string, any>) => void} [modify] */
async function analysisWith(modify) {
  const { zipBytes } = await buildBundle({ version: 'v3', modify });
  return (await verifyPackage(zipBytes, { sha256: nodeSha256 })).analysis;
}

test('Kartenausschnitt: Kacheln decken den Ausschnitt lückenlos und an der richtigen Stelle ab', () => {
  for (const [lat, lon] of [[48.137154, 11.575382], [48, 11], [-33.8688, 151.2093], [0, 0], [64.1466, -21.9426], [51.5007, -0.1246]]) {
    const view = mapView(lat, lon, REPORT_MAP_SIZE);
    assert.equal(view.width, 662);
    assert.equal(view.height, 340);
    // Jede Ecke und die Mitte liegen in genau einer Kachel
    for (const [px, py] of [[0, 0], [661.9, 0], [0, 339.9], [661.9, 339.9], [331, 170]]) {
      const hits = view.tiles.filter(t => px >= t.left && px < t.left + TILE_SIZE && py >= t.top && py < t.top + TILE_SIZE);
      assert.equal(hits.length, 1, `${lat}/${lon} bei ${px}/${py}`);
    }
    assert.ok(view.tiles.length >= 6 && view.tiles.length <= 12);
    assert.ok(view.tiles.every(t => t.zoom === 14 && Number.isInteger(t.x) && Number.isInteger(t.y) && t.x >= 0 && t.x < 16384));
    assert.equal(new Set(view.tiles.map(tileKey)).size, view.tiles.length);
  }
  // München liegt bei Zoom 14 in Kachel 8718/5685; die Markierung (Mitte) trifft sie
  const munich = mapView(48.137154, 11.575382, REPORT_MAP_SIZE);
  const center = munich.tiles.find(t => 331 >= t.left && 331 < t.left + TILE_SIZE && 170 >= t.top && 170 < t.top + TILE_SIZE);
  assert.deepEqual([center?.x, center?.y], [8718, 5685]);
  assert.equal(tileUrl({ zoom: 14, x: 8718, y: 5685 }), 'https://tile.openstreetmap.org/14/8718/5685.png');

  // Datumsgrenze: Kacheln jenseits von 180° kommen von der anderen Seite der Welt
  const dateline = mapView(0, 179.999, REPORT_MAP_SIZE);
  assert.ok(dateline.tiles.some(t => t.x === 0) && dateline.tiles.some(t => t.x === 16383));
  // Polnähe: keine Kacheln außerhalb der Welt
  assert.ok(mapView(85.05, 0, REPORT_MAP_SIZE).tiles.every(t => t.y >= 0));
  assert.throws(() => mapView(91, 0, REPORT_MAP_SIZE), /gültigen Koordinaten/);
  assert.throws(() => mapView(Number.NaN, 0, REPORT_MAP_SIZE), /gültigen Koordinaten/);

  // Prüfer-Oberfläche: breiterer Ausschnitt, dieselbe Mitte
  const viewer = mapView(48.137154, 11.575382, VIEWER_MAP_SIZE);
  assert.ok(viewer.tiles.length <= 12);
  assert.ok(viewer.tiles.some(t => t.x === 8718 && t.y === 5685 && 384 >= t.left && 384 < t.left + TILE_SIZE));
});

test('Kacheln: eindeutiger User-Agent, nacheinander geladen, Cache und strenge Prüfung', async () => {
  const view = mapView(48.137154, 11.575382, REPORT_MAP_SIZE);
  const server = fakeTileServer();
  /** @type {Map<string, import('./map.mjs').CachedTile>} */
  const store = new Map();
  const cache = {
    get: async (/** @type {string} */ key) => store.get(key) ?? null,
    put: async (/** @type {string} */ key, /** @type {Uint8Array} */ bytes) => { store.set(key, { bytes, storedAt: Date.now() }); },
  };
  const tiles = await loadMapTiles(view, { fetchImpl: server.fetchImpl, userAgent: AGENT, cache });
  assert.equal(tiles.length, view.tiles.length);
  assert.equal(server.calls.length, view.tiles.length);
  assert.ok(server.calls.every(call => call.userAgent === 'DoiProof-Test/1.0.0 (+https://github.com/neubuot/DoiProof)'));
  assert.ok(server.calls.every(call => /^https:\/\/tile\.openstreetmap\.org\/14\/\d+\/\d+\.png$/.test(call.url)));
  assert.ok(tiles.every(tile => isTilePng(tile.bytes)));
  // Zweiter Abruf kommt vollständig aus dem Cache
  await loadMapTiles(view, { fetchImpl: server.fetchImpl, userAgent: AGENT, cache });
  assert.equal(server.calls.length, view.tiles.length);
  // Ungültiger Cache-Inhalt wird ersetzt
  store.set(tileKey(view.tiles[0]), { bytes: new Uint8Array([1, 2, 3]), storedAt: Date.now() });
  await loadMapTiles(view, { fetchImpl: server.fetchImpl, userAgent: AGENT, cache });
  assert.equal(server.calls.length, view.tiles.length + 1);

  await assert.rejects(loadMapTiles(view, { fetchImpl: fakeTileServer({ status: 403 }).fetchImpl, userAgent: AGENT }), /HTTP 403/);
  await assert.rejects(loadMapTiles(view, { fetchImpl: fakeTileServer({ contentType: 'text/html' }).fetchImpl, userAgent: AGENT }), /kein PNG/);
  assert.equal(isTilePng(syntheticTile({ x: 1, y: 2 })), true);
  assert.equal(isTilePng(new Uint8Array(100)), false);
  const wide = syntheticTile({ x: 1, y: 2 });
  wide[19] = 1; // Breite 257 statt 256
  assert.equal(isTilePng(wide), false);
  // Abgeschnittene Antworten und falsche Prüfsummen erreichen den PNG-Decoder nicht
  const tile = syntheticTile({ x: 3, y: 4 });
  for (const cut of [tile.length - 1, tile.length - 12, tile.length >> 1, 60]) assert.equal(isTilePng(tile.subarray(0, cut)), false, `abgeschnitten bei ${cut}`);
  const flipped = tile.slice();
  flipped[flipped.length - 20] ^= 1;
  assert.equal(isTilePng(flipped), false);
  const trailing = new Uint8Array(tile.length + 4);
  trailing.set(tile);
  assert.equal(isTilePng(trailing), false);
  const truncatedServer = /** @type {typeof fetch} */ (/** @type {any} */ (async () => ({
    ok: true, status: 200, headers: { get: () => 'image/png' }, arrayBuffer: async () => tile.slice(0, tile.length >> 1).buffer,
  })));
  await assert.rejects(loadMapTiles(view, { fetchImpl: truncatedServer, userAgent: AGENT }), /beschädigt oder zu groß/);
});

test('Datei-Cache des Windows-Prüfers hält Kacheln 7 Tage', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'doiproof-tiles-'));
  try {
    const cache = fileTileCache(join(dir, 'map-cache'));
    const bytes = syntheticTile({ x: 5, y: 6 });
    assert.equal(await cache.get('14-5-6'), null);
    await cache.put('14-5-6', bytes);
    const cached = await cache.get('14-5-6');
    assert.deepEqual(cached?.bytes, bytes);
    assert.ok(Math.abs(Number(cached?.storedAt) - Date.now()) < 60000);
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await utimes(join(dir, 'map-cache', '14-5-6.png'), old, old);
    assert.equal(await cache.get('14-5-6'), null);
    // Abgelaufene Kacheln werden gelöscht, nicht nur übergangen (die Dateinamen verraten den Ort)
    assert.deepEqual(await readdir(join(dir, 'map-cache')), []);
    await cache.put('14-7-8', syntheticTile({ x: 7, y: 8 }));
    await writeFile(join(dir, 'map-cache', '14-1-1.png'), bytes);
    await utimes(join(dir, 'map-cache', '14-1-1.png'), old, old);
    await cache.put('14-9-9', syntheticTile({ x: 9, y: 9 }));
    assert.deepEqual((await readdir(join(dir, 'map-cache'))).sort(), ['14-7-8.png', '14-9-9.png']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('PDF-Bericht: Kartenausschnitt nur auf Wunsch, nur mit Standort und bestandenem Paket', async () => {
  const fonts = await loadFonts(FONT_DIR);
  const analysis = await analysisWith(m => { m.location.latitude = 48.137154; m.location.longitude = 11.575382; });
  const base = { analysis, fileName: 'p.zip', fonts, generatedAt: NOW, timeZone: BERLIN, producer: 'Test' };

  const server = fakeTileServer();
  const withMap = await createPdfReport({ ...base, includeMap: true, mapLoader: { fetchImpl: server.fetchImpl, userAgent: AGENT } });
  assert.deepEqual(withMap.mapStatus, { state: 'included' });
  const map = withMap.model.locationMap;
  assert.ok(map?.tiles && !map.unavailable);
  assert.equal(map.coordinates, '48.137154°, 11.575382°');
  assert.equal(map.attribution, MAP_ATTRIBUTION);
  assert.match(String(map.caption), /OpenStreetMap-Mitwirkende, https:\/\/www\.openstreetmap\.org\/copyright · Zoomstufe 14 · Kacheln abgerufen am 10\.10\.2026,\u00a014:00\u00a0Uhr/);
  assert.equal(server.calls.length, map.tiles.length);
  const without = await createPdfReport(base);
  assert.equal(await imageCount(withMap.pdf), (await imageCount(without.pdf)) + map.tiles.length);
  assert.equal(without.model.locationMap, null);

  // Kein Netzzugriff ohne ausdrücklichen Wunsch, ohne eingeblendeten Standort oder ohne Messung
  const silent = fakeTileServer();
  const loader = { fetchImpl: silent.fetchImpl, userAgent: AGENT };
  assert.deepEqual((await createPdfReport({ ...base, mapLoader: loader })).mapStatus, { state: 'not_requested' });
  assert.deepEqual((await createPdfReport({ ...base, includeMap: true, includeLocation: false, mapLoader: loader })).mapStatus, { state: 'location_hidden' });
  const privateProfile = await analysisWith(m => { m.profile = 'private'; m.location = { status: 'not_requested' }; });
  assert.deepEqual((await createPdfReport({ ...base, analysis: privateProfile, includeMap: true, mapLoader: loader })).mapStatus, { state: 'no_location' });
  // Verändertes Manifest (Hash bricht), Koordinaten wären aber lesbar: trotzdem keine Karte
  const { zipBytes } = await buildBundle({ version: 'v3' });
  const zip = await JSZip.loadAsync(zipBytes);
  const manifestText = await zip.file('manifest.json')?.async('string');
  zip.file('manifest.json', String(manifestText).replace('"latitude":48', '"latitude":47'));
  const broken = (await verifyPackage(await zip.generateAsync({ type: 'uint8array' }), { sha256: nodeSha256 })).analysis;
  assert.equal(broken.ok, false);
  assert.equal(broken.manifest?.location?.latitude, 47);
  assert.deepEqual((await createPdfReport({ ...base, analysis: broken, includeMap: true, mapLoader: loader })).mapStatus, { state: 'no_location' });
  assert.equal(silent.calls.length, 0);

  // Kartendienst nicht erreichbar: Bericht entsteht trotzdem, mit Hinweis statt Karte
  const offline = await createPdfReport({ ...base, includeMap: true, mapLoader: { fetchImpl: fakeTileServer({ status: 503 }).fetchImpl, userAgent: AGENT } });
  assert.equal(offline.mapStatus.state, 'unavailable');
  assert.match(String(offline.model.locationMap?.unavailable), /Kartenausschnitt nicht verfügbar: Kartenkachel nicht verfügbar \(HTTP 503\)/);
  assert.equal(await imageCount(offline.pdf), await imageCount(without.pdf));

  // Kachel mit gültigen Prüfsummen, aber kaputten Bilddaten: abgewiesen, Bericht ohne Karte
  const corrupt = syntheticTile({ x: 1, y: 1 });
  const idat = corrupt.findIndex((_, i) => String.fromCharCode(...corrupt.subarray(i, i + 4)) === 'IDAT');
  const idatLength = new DataView(corrupt.buffer).getUint32(idat - 4);
  corrupt.fill(0xff, idat + 4, idat + 40);
  new DataView(corrupt.buffer).setUint32(idat + 4 + idatLength, crc32(corrupt.subarray(idat, idat + 4 + idatLength)));
  assert.equal(isTilePng(corrupt), false);
  const corruptFetch = /** @type {typeof fetch} */ (/** @type {any} */ (async () => ({
    ok: true, status: 200, headers: { get: (/** @type {string} */ n) => (n === 'content-type' ? 'image/png' : null) }, arrayBuffer: async () => corrupt.buffer.slice(0),
  })));
  const unreadable = await createPdfReport({ ...base, includeMap: true, mapLoader: { fetchImpl: corruptFetch, userAgent: AGENT } });
  assert.deepEqual(unreadable.mapStatus, { state: 'unavailable', reason: 'Kartenkachel ist beschädigt oder zu groß.' });
  assert.ok((await PDFDocument.load(unreadable.pdf)).getPageCount() >= 4);

  // Simulierter Standort wird auch an der Karte vermerkt
  const mocked = await analysisWith(m => { m.location.mocked = true; });
  const mockedReport = await createPdfReport({ ...base, analysis: mocked, includeMap: true, mapLoader: { fetchImpl: fakeTileServer().fetchImpl, userAgent: AGENT } });
  assert.equal(mockedReport.model.locationMap?.warning, 'Das Gerät meldet einen simulierten Standort.');
});

test('Kommandozeile: --karte lädt den Ausschnitt nur zusammen mit --pdf und Standort', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'doiproof-cli-map-'));
  try {
    const { zipBytes, evidence } = await buildBundle({ version: 'v3' });
    const zipPath = join(dir, 'paket.zip');
    await writeFile(zipPath, zipBytes);
    const chain = fakeChain({ evidence: evidence.evidenceSha256 });
    const tiles = fakeTileServer();
    const fetchImpl = /** @type {typeof fetch} */ (/** @type {any} */ ((/** @type {string} */ url, /** @type {any} */ request) => (String(url).startsWith('https://tile.openstreetmap.org/')
      ? tiles.fetchImpl(url, request) : chain.fetchImpl(url, request))));
    let stdout = ''; let stderr = '';
    const io = { stdout: (/** @type {string} */ t) => { stdout += t; }, stderr: (/** @type {string} */ t) => { stderr += t; }, now: () => NOW, fetchImpl, mapCacheDir: join(dir, 'cache') };
    assert.equal(await cli([zipPath, '--online', '--pdf', join(dir, 'karte.pdf'), '--karte', '--zeitzone', 'Europe/Berlin'], io), 0);
    assert.match(stderr, /Kartenausschnitt eingebunden \(Kartendaten © OpenStreetMap-Mitwirkende/);
    assert.match(stdout, /PDF-Bericht gespeichert/);
    assert.ok(tiles.calls.length >= 6);
    assert.ok(tiles.calls.every(call => /^DoiProof-Pruefer\/\d+\.\d+\.\d+ \(Kommandozeile\) \(\+https:\/\/github\.com\/neubuot\/DoiProof\)$/.test(String(call.userAgent))));
    const before = tiles.calls.length;
    assert.equal(await cli([zipPath, '--pdf', join(dir, 'ohne.pdf')], io), 0);
    assert.equal(tiles.calls.length, before);
    // Zweiter Lauf kommt aus dem privaten Kachel-Cache
    assert.equal(await cli([zipPath, '--pdf', join(dir, 'karte-2.pdf'), '--karte'], io), 0);
    assert.equal(tiles.calls.length, before);
    assert.ok((await readdir(join(dir, 'cache'))).every(name => /^14-\d+-\d+\.png$/.test(name)));
    await assert.rejects(cli([zipPath, '--karte'], io), /nur zusammen mit --pdf/);
    await assert.rejects(cli([zipPath, '--pdf', join(dir, 'x.pdf'), '--karte', '--ohne-standort'], io), /passt nicht zu --ohne-standort/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('Präparierte PNGs (abgeschnittener zlib-Strom) blockieren den Bericht nicht – Kachel und Foto', { timeout: 30000 }, async () => {
  const hang = truncatedStreamPng(syntheticTile({ x: 9, y: 9 }));
  assert.deepEqual(inspectPng(hang), { ok: false, reason: 'Bilddaten unvollständig oder beschädigt' });
  assert.equal(isTilePng(hang), false);
  assert.equal(inspectPng(syntheticTile({ x: 9, y: 9 })).ok, true);
  const fonts = await loadFonts(FONT_DIR);

  // Kachel direkt im Modell (am Lader vorbei): der Renderer prüft selbst und meldet den Fehler
  const analysis = await analysisWith();
  const view = mapView(48, 11, REPORT_MAP_SIZE);
  const tiles = view.tiles.map(tile => ({ ...tile, bytes: hang, fetchedAt: NOW.getTime() }));
  const model = buildReportModel({ analysis, fileName: 'p.zip', generatedAt: NOW, timeZone: BERLIN, map: { view, tiles, loadedAt: NOW.toISOString(), loadedUntil: NOW.toISOString() } });
  /** @type {string[]} */
  const errors = [];
  const pdf = await renderReportPdf(model, { fonts, onMapError: reason => { errors.push(reason); } });
  assert.deepEqual(errors, ['Kartenkacheln konnten nicht eingebettet werden.']);
  assert.ok((await PDFDocument.load(pdf)).getPageCount() >= 4);

  // Foto in einem fremden Beweispaket: Hash stimmt (vom Ersteller berechnet), Bericht entsteht ohne Foto
  const { zipBytes } = await buildBundle({ version: 'v3', photo: hang });
  const photoAnalysis = (await verifyPackage(zipBytes, { sha256: nodeSha256 })).analysis;
  assert.equal(photoAnalysis.steps.photo, 'ok');
  const report = await createPdfReport({ analysis: photoAnalysis, fileName: 'praepariert.zip', fonts, generatedAt: NOW, timeZone: BERLIN, producer: 'Test' });
  assert.equal(report.model.photo?.kind, 'png');
  assert.ok((await PDFDocument.load(report.pdf)).getPageCount() >= 4);
  assert.equal(await imageCount(report.pdf), 0);
});

test('Stockender Kachelserver: Zeitlimit gilt auch für den Datenteil der Antwort', { timeout: 10000 }, async () => {
  const stalled = /** @type {typeof fetch} */ (/** @type {any} */ (async () => ({
    ok: true, status: 200, headers: { get: () => 'image/png' }, arrayBuffer: () => new Promise(() => {}),
  })));
  const started = Date.now();
  await assert.rejects(loadMapTiles(mapView(48, 11, REPORT_MAP_SIZE), { fetchImpl: stalled, userAgent: AGENT, timeoutMs: 300 }), /^Error: Zeitüberschreitung beim Kartendienst \(0 s\)\.$/);
  assert.ok(Date.now() - started < 3000);
  const huge = /** @type {typeof fetch} */ (/** @type {any} */ (async () => ({
    ok: true, status: 200, headers: { get: (/** @type {string} */ n) => (n === 'content-type' ? 'image/png' : n === 'content-length' ? String(50 * 1024 * 1024) : null) },
    arrayBuffer: () => { throw new Error('darf nicht gelesen werden'); },
  })));
  await assert.rejects(loadMapTiles(mapView(48, 11, REPORT_MAP_SIZE), { fetchImpl: huge, userAgent: AGENT }), /zu groß/);
});

test('Kartenausschnitt: Abrufzeit aus dem Cache, verständliche Fehler, kein Ausschnitt jenseits ±85°', async () => {
  const fonts = await loadFonts(FONT_DIR);
  const analysis = await analysisWith();
  const base = { analysis, fileName: 'p.zip', fonts, generatedAt: NOW, timeZone: BERLIN, producer: 'Test', includeMap: true };
  // Kacheln teils aus dem Cache (3 Tage alt), teils frisch: die Bildunterschrift nennt beide Zeitpunkte
  const old = NOW.getTime() - 3 * 24 * 60 * 60 * 1000;
  const view = mapView(48, 11, REPORT_MAP_SIZE);
  const first = tileKey(view.tiles[0]);
  const cache = { get: async (/** @type {string} */ key) => (key === first ? { bytes: syntheticTile(view.tiles[0]), storedAt: old } : null), put: async () => {} };
  const mixed = await createPdfReport({ ...base, mapLoader: { fetchImpl: fakeTileServer().fetchImpl, userAgent: AGENT, cache } });
  assert.match(String(mixed.model.locationMap?.caption), /Kacheln abgerufen zwischen 07\.10\.2026,\u00a014:00\u00a0Uhr und 10\.10\.2026,\u00a014:00\u00a0Uhr/);

  // Kein Netz: deutsche Meldung statt „fetch failed“, mit Satzende
  const offline = /** @type {typeof fetch} */ (/** @type {any} */ (async () => { throw new TypeError('fetch failed'); }));
  const noNet = await createPdfReport({ ...base, mapLoader: { fetchImpl: offline, userAgent: AGENT } });
  assert.deepEqual(noNet.mapStatus, { state: 'unavailable', reason: 'Kartendienst nicht erreichbar (keine Verbindung).' });
  assert.equal(noNet.model.locationMap?.unavailable, 'Kartenausschnitt nicht verfügbar: Kartendienst nicht erreichbar (keine Verbindung). Die Koordinaten stehen in der Tabelle.');

  // Südpol: Web-Mercator endet bei ±85,05°; keine Abfrage, kein falsch platzierter Ort
  const server = fakeTileServer();
  const pole = await createPdfReport({ ...base, analysis: await analysisWith(m => { m.location.latitude = -90; }), mapLoader: { fetchImpl: server.fetchImpl, userAgent: AGENT } });
  assert.equal(pole.mapStatus.state, 'unavailable');
  assert.match(String(pole.mapStatus.reason), /außerhalb des Kartenbereichs/);
  assert.equal(server.calls.length, 0);
  assert.throws(() => mapView(86, 0, REPORT_MAP_SIZE), /außerhalb des Kartenbereichs/);
});

test('PNG-Prüfung: nur einfache Einzelbilder mit stimmigem Aufbau', () => {
  const tile = syntheticTile({ x: 2, y: 3 });
  /** @param {Uint8Array} png @param {string} after @param {string} type @param {Uint8Array} data */
  const insert = (png, after, type, data) => {
    const at = png.findIndex((_, i) => String.fromCharCode(...png.subarray(i, i + 4)) === after) - 4;
    const length = new DataView(png.buffer, png.byteOffset).getUint32(at);
    const end = at + 12 + length;
    const chunk = new Uint8Array(12 + data.length);
    new DataView(chunk.buffer).setUint32(0, data.length);
    for (let i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i);
    chunk.set(data, 8);
    new DataView(chunk.buffer).setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)));
    const out = new Uint8Array(png.length + chunk.length);
    out.set(png.subarray(0, end)); out.set(chunk, end); out.set(png.subarray(end), end + chunk.length);
    return out;
  };
  const ihdr = tile.slice(16, 29);
  assert.deepEqual(inspectPng(insert(tile, 'IHDR', 'IHDR', ihdr)), { ok: false, reason: 'doppelter Bildkopf' });
  assert.deepEqual(inspectPng(insert(tile, 'IHDR', 'acTL', new Uint8Array(8))), { ok: false, reason: 'animierte PNG werden nicht eingebettet' });
  assert.deepEqual(inspectPng(insert(tile, 'PLTE', 'PLTE', new Uint8Array(6))), { ok: false, reason: 'Farbpalette ungültig' });
  assert.deepEqual(inspectPng(insert(tile, 'IDAT', 'tEXt', new Uint8Array([65, 0, 66]))), { ok: true, width: 256, height: 256, colorType: 3, bitDepth: 8 });
  const badDepth = tile.slice();
  badDepth[24] = 1; // Bittiefe 1 mit Farbtyp 3 ist erlaubt, mit Farbtyp 6 nicht
  badDepth[25] = 6;
  new DataView(badDepth.buffer).setUint32(29, crc32(badDepth.subarray(12, 29)));
  assert.deepEqual(inspectPng(badDepth), { ok: false, reason: 'unbekanntes PNG-Format' });
});
