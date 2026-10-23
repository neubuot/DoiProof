import assert from 'node:assert/strict';
import test from 'node:test';
import { createBundleZip } from '../core/bundle.mjs';
import { nodeSha256 } from '../core/node.mjs';
import { buildReportModel } from '../core/report-model.mjs';
import { validateSensors } from '../core/sensors.mjs';
import { analyzeBundle } from '../core/verify.mjs';
import { PRE_CAPTURE, syntheticSensors } from '../scripts/fixtures/fixture.mjs';
import { buildManifestV3, LOCATION_SETTINGS, PRIVATE_SETTINGS, sealManifest, type ManifestInput } from './evidenceManifest';
import type { PreCaptureAnchors } from './proofRecord';

const photo = new TextEncoder().encode('synthetische Bildbytes');
const base = async (): Promise<ManifestInput> => ({
  createdAt: '2026-10-01T07:31:37.000Z',
  settings: LOCATION_SETTINGS,
  photoSha256: await nodeSha256(photo),
  image: { width: 3, height: 4, fileSize: photo.length, mimeType: 'image/jpeg', fileName: 'x.jpg' },
  source: 'camera',
  capturedAt: '2026-10-01T07:31:35.000Z',
  cameraOpenedAt: '2026-10-01T07:31:28.000Z',
  preCapture: PRE_CAPTURE as PreCaptureAnchors,
  app: { version: '1.0.0', identification: 'self-reported-unattested', update: { channel: 'preview', runtimeVersion: 'abc', updateId: null, embedded: true } },
  device: { platform: 'android', osVersion: 34, appVersion: '1.0.0' },
  location: { status: 'permission_denied', reason: 'Die Standortfreigabe wurde verweigert.' },
  sensors: syntheticSensors(),
});

async function roundTrip(input: ManifestInput) {
  const evidence = await sealManifest(buildManifestV3(input), nodeSha256);
  const zip = await createBundleZip({
    photoBytes: photo, photoExtension: 'jpg', manifest: evidence.manifest,
    verification: { evidenceSha256: evidence.evidenceSha256, photoSha256: input.photoSha256, manifestSha256: evidence.manifestSha256, status: 'local' },
  });
  return { evidence, analysis: await analyzeBundle(zip, { sha256: nodeSha256 }) };
}

test('App-Manifest v3 mit Sensoren und verweigertem Standort ist mit dem Prüfkern prüfbar', async () => {
  const { evidence, analysis } = await roundTrip(await base());
  assert.equal(analysis.ok, true, analysis.error ?? '');
  assert.equal(analysis.version, 'v3');
  assert.equal(analysis.hashes.evidenceSha256, evidence.evidenceSha256);
  assert.equal(evidence.manifest.location?.status, 'permission_denied');
  assert.equal(validateSensors(evidence.manifest.sensors), null);
  const model = buildReportModel({ analysis, fileName: 'app.zip' });
  assert.equal(model.glance.find(row => row.label === 'Ort')?.sub, 'Standortfreigabe verweigert');
});

test('Profil „Privat“ erfasst weder Standort, Sensoren noch Gerät und vermerkt das ausdrücklich', async () => {
  const input = { ...(await base()), settings: PRIVATE_SETTINGS };
  const { evidence, analysis } = await roundTrip(input);
  assert.equal(analysis.ok, true);
  assert.deepEqual(evidence.manifest.location, { status: 'not_requested' });
  assert.equal(evidence.manifest.device, undefined);
  assert.deepEqual(Object.keys(evidence.manifest.photo), ['sha256']);
  const sensors = evidence.manifest.sensors as Record<string, { status: string }>;
  assert.ok(Object.values(sensors).every(record => record.status === 'not_requested'));
});

test('Galeriebild: keine Vorabblöcke, Sensoren nur bei Kameraaufnahme', async () => {
  const input = { ...(await base()), source: 'library' as const, preCapture: undefined, sensors: undefined };
  const { evidence, analysis } = await roundTrip(input);
  assert.equal(analysis.ok, true);
  const light = (evidence.manifest.sensors as Record<string, { reason?: string }>).light;
  assert.match(String(light.reason), /nur bei einer Kameraaufnahme/);
  await assert.rejects(async () => buildManifestV3({ ...(await base()), source: 'library' }), /Vorab-Blöcke/);
});
