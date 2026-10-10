/**
 * Testdaten für Beweispakete v1–v3. Alle Werte sind erfunden; Koordinaten zeigen auf einen
 * runden Platzhalterort, das Bild ist synthetisch erzeugt.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { createBundleZip } from '../../core/bundle.mjs';
import { computeEvidence } from '../../core/manifest.mjs';
import { notRequestedSensors, SensorCollector } from '../../core/sensors.mjs';
import { nodeSha256 } from '../../core/node.mjs';
import { crc32 } from '../../core/verify.mjs';

export const SYNTHETIC_JPEG = join(dirname(fileURLToPath(import.meta.url)), 'synthetic-orientation6.jpg');
export const CAPTURE_MS = Date.parse('2026-10-01T07:31:35.000Z');

export const PRE_CAPTURE = {
  bitcoin: {
    chain: 'btc', height: 969415, hash: `0000000000000000000${'1'.repeat(45)}`,
    headerTimeUtc: '2026-10-01T07:23:36.000Z', observedAtDeviceUtc: '2026-10-01T07:31:20.512Z', source: 'https://blockstream.info/api',
  },
  doichain: {
    chain: 'doi', height: 434175, hash: '2'.repeat(64),
    headerTimeUtc: '2026-10-01T06:35:46.000Z', observedAtDeviceUtc: '2026-10-01T07:31:20.731Z', source: 'https://doi-api.sendlabs.de/mcp:get_chain_status',
  },
};

/** Synthetische Sensorreihe: vor der Kamera und nach der Rückkehr (Android-Verhalten). */
export function syntheticSensors({ light = false } = {}) {
  let now = CAPTURE_MS - 9000;
  const collector = new SensorCollector({ now: () => now, platform: 'android' });
  const feed = (/** @type {number} */ t) => {
    const k = (t - CAPTURE_MS) / 1000;
    collector.add('accelerometer', { x: 0.012 + k * 0.001, y: -0.981 + k * 0.0004, z: 0.154 }, t);
    collector.add('gyroscope', { x: 0.0012 * k, y: -0.0031, z: 0.0008 }, t);
    collector.add('magnetometer', { x: 21.4 + k * 0.1, y: -4.2, z: -38.9 }, t);
    collector.add('compass', { magHeading: 212.4 + k, trueHeading: 215.1 + k, accuracy: 3 }, t);
    collector.add('barometer', { pressure: 955.12 - k * 0.01 }, t);
    if (light) collector.add('light', { illuminance: 412 + k * 3 }, t);
  };
  for (let t = CAPTURE_MS - 9000; t < CAPTURE_MS - 7000; t += 200) feed(t);
  collector.markCameraOpened(CAPTURE_MS - 7000);
  collector.markCameraReturned(CAPTURE_MS);
  for (let t = CAPTURE_MS + 40; t < CAPTURE_MS + 1300; t += 200) feed(t);
  if (!light) collector.setStatus('light', 'unavailable', 'Kein Lichtsensor auf diesem Gerät.');
  now = CAPTURE_MS + 1300;
  return collector.toManifest(now);
}

/**
 * @param {{ version?: 'v1'|'v2'|'v3', location?: boolean, pre?: boolean, sensors?: boolean, source?: 'camera'|'library', photo?: Uint8Array, modify?: (m: any) => void }} [options]
 */
export async function buildBundle(options = {}) {
  const version = options.version ?? 'v3';
  const photoBytes = options.photo ?? new Uint8Array(await readFile(SYNTHETIC_JPEG));
  const photoSha256 = await nodeSha256(photoBytes);
  const source = options.source ?? 'camera';
  /** @type {Record<string, any>} */
  const manifest = {
    schema: `org.doichain.doiproof.evidence/${version}`,
    createdAt: new Date(CAPTURE_MS + 1400).toISOString(),
    profile: options.location === false ? 'private' : 'location',
    app: { version: '1.0.0', identification: 'self-reported-unattested' },
    photo: { sha256: photoSha256, width: 360, height: 480, fileSize: photoBytes.length, mimeType: 'image/jpeg', fileName: 'Testbild.jpg' },
    capture: { deviceTime: new Date(CAPTURE_MS).toISOString(), source },
  };
  if (options.pre !== false && source === 'camera') manifest.preCapture = PRE_CAPTURE;
  if (version === 'v3') {
    manifest.capture.cameraOpenedAt = new Date(CAPTURE_MS - 7000).toISOString();
    manifest.app.update = { channel: 'preview', runtimeVersion: 'abc123', updateId: null, embedded: true };
    manifest.device = { platform: 'android', osVersion: 34, osRelease: '14', appVersion: '1.0.0' };
    manifest.location = options.location === false ? { status: 'not_requested' } : {
      status: 'recorded', latitude: 48, longitude: 11, altitude: 500, accuracy: 10, altitudeAccuracy: 3,
      heading: null, speed: 0, measuredAt: new Date(CAPTURE_MS + 900).toISOString(), mocked: false,
    };
    manifest.sensors = options.sensors === false ? notRequestedSensors() : syntheticSensors();
  } else if (options.location !== false) {
    manifest.location = { latitude: 48, longitude: 11, altitude: 500, accuracy: 10, measuredAt: new Date(CAPTURE_MS + 900).toISOString(), mocked: false };
    manifest.device = { platform: 'android', osVersion: 34, appVersion: '0.5.0' };
  }
  options.modify?.(manifest);
  const evidence = await computeEvidence(manifest, nodeSha256);
  const verification = {
    evidenceSha256: evidence.evidenceSha256, photoSha256, manifestSha256: evidence.manifestSha256,
    status: 'pending', lastCheckedAt: new Date(CAPTURE_MS + 3000).toISOString(),
  };
  const zipBytes = await createBundleZip({ photoBytes, photoExtension: 'jpg', manifest, verification });
  return { zipBytes, manifest, verification, evidence, photoBytes };
}

/** Fake-fetch für Online-Prüfungen ohne Netzwerk. @param {{ evidence: string, status?: string }} o */
export function fakeChain({ evidence, status = 'confirmed' }) {
  const txid = '3'.repeat(64);
  const blockHash = '4'.repeat(64);
  /** @type {string[]} */
  const calls = [];
  /** @type {typeof fetch} */
  const fetchImpl = /** @type {any} */ (async (/** @type {string} */ url, /** @type {any} */ request) => {
    if (String(url).startsWith('https://blockstream.info')) {
      calls.push('btc');
      return { ok: true, status: 200, json: async () => ({ id: PRE_CAPTURE.bitcoin.hash, height: PRE_CAPTURE.bitcoin.height, timestamp: Date.parse(PRE_CAPTURE.bitcoin.headerTimeUtc) / 1000 }) };
    }
    const { params } = JSON.parse(request.body);
    calls.push(params.name);
    /** @type {any} */
    let value;
    if (params.name === 'check_proof') value = { sha256: evidence, status, txid, block_height: 434177, block_time_utc: '2026-10-01T08:03:06Z' };
    else if (params.name === 'get_transaction') value = { txid, block_hash: blockHash, confirmations: 7 };
    else if (params.arguments.block === blockHash) value = { hash: blockHash, height: 434177, time_utc: '2026-10-01T08:03:06Z', confirmations: 7 };
    else value = { hash: PRE_CAPTURE.doichain.hash, height: PRE_CAPTURE.doichain.height, time_utc: '2026-10-01T06:35:46Z' };
    return { ok: true, status: 200, json: async () => ({ result: { structuredContent: value } }) };
  });
  return { fetchImpl, calls, txid, blockHash };
}

/** @param {string} type @param {Uint8Array} data */
function pngChunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/**
 * Synthetische Kartenkachel (256 × 256, palettiertes PNG wie bei OpenStreetMap) mit Straßen,
 * Grünflächen, Gebäuden und einem Fluss in Weltkoordinaten, damit benachbarte Kacheln
 * nahtlos aneinanderpassen. Kein echtes Kartenbild.
 * @param {{ x: number, y: number }} tile
 */
export function syntheticTile({ x, y }) {
  const palette = [[242, 239, 233], [255, 255, 255], [214, 208, 196], [205, 235, 176], [170, 211, 223], [217, 208, 201], [247, 250, 191]];
  const hash = (/** @type {number} */ a, /** @type {number} */ b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;
  const raw = new Uint8Array(256 * 257);
  for (let j = 0; j < 256; j++) {
    raw[j * 257] = 0;
    for (let i = 0; i < 256; i++) {
      const gx = x * 256 + i; const gy = y * 256 + j;
      const rx = gx % 160; const ry = gy % 120;
      const block = hash(Math.floor(gx / 160), Math.floor(gy / 120)) % 7;
      const major = Math.floor(gy / 120) % 4 === 0;
      const river = Math.abs((gy % 1800) - (900 + 60 * Math.sin(gx / 190))) < 13;
      let color = 0;
      if (river) color = 4;
      else if (rx < 7 || ry < (major ? 9 : 6)) color = (rx === 0 || rx === 6 || ry === 0 || ry === (major ? 8 : 5)) ? 2 : (major && ry < 9 ? 6 : 1);
      else if (block === 0) color = 3;
      else if (block <= 3 && rx % 38 > 12 && rx % 38 < 33 && ry % 28 > 11 && ry % 28 < 25) color = 5;
      raw[j * 257 + 1 + i] = color;
    }
  }
  const header = new Uint8Array(13);
  new DataView(header.buffer).setUint32(0, 256);
  new DataView(header.buffer).setUint32(4, 256);
  header.set([8, 3, 0, 0, 0], 8);
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('PLTE', new Uint8Array(palette.flat())),
    pngChunk('IDAT', new Uint8Array(deflateSync(raw))),
    pngChunk('IEND', new Uint8Array(0)),
  ];
  const png = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { png.set(part, offset); offset += part.length; }
  return png;
}

/**
 * Fake-fetch für den Kachelserver: liefert synthetische Kacheln und merkt sich Abrufe und Header.
 * @param {{ status?: number, contentType?: string }} [options]
 */
export function fakeTileServer(options = {}) {
  /** @type {{ url: string, userAgent: string | undefined }[]} */
  const calls = [];
  /** @type {typeof fetch} */
  const fetchImpl = /** @type {any} */ (async (/** @type {string} */ url, /** @type {any} */ request) => {
    calls.push({ url: String(url), userAgent: request?.headers?.['User-Agent'] });
    const match = /\/(\d+)\/(\d+)\/(\d+)\.png$/.exec(String(url));
    if (!match) throw new Error(`Unerwartete URL: ${url}`);
    const bytes = syntheticTile({ x: Number(match[2]), y: Number(match[3]) });
    return {
      ok: (options.status ?? 200) === 200, status: options.status ?? 200,
      headers: { get: (/** @type {string} */ name) => (name.toLowerCase() === 'content-type' ? options.contentType ?? 'image/png' : null) },
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    };
  });
  return { fetchImpl, calls };
}
