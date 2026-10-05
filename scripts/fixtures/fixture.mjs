/**
 * Testdaten für Beweispakete v1–v3. Alle Werte sind erfunden; Koordinaten zeigen auf einen
 * runden Platzhalterort, das Bild ist synthetisch erzeugt.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBundleZip } from '../../core/bundle.mjs';
import { computeEvidence } from '../../core/manifest.mjs';
import { notRequestedSensors, SensorCollector } from '../../core/sensors.mjs';
import { nodeSha256 } from '../../core/node.mjs';

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
