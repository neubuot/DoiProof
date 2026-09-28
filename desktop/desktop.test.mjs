import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import { verifyLocal, reportText } from './verify.mjs';
import { evidenceDetails } from './details.mjs';
import { tileGrid } from './map.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('packaged verifier reuses the exact CLI source and can render a report', async () => {
  const source = await readFile(new URL('../scripts/verify.mjs', import.meta.url));
  const packaged = await readFile(new URL('./verify.mjs', import.meta.url));
  assert.equal(sha(source), sha(packaged));
  const photo = Buffer.from('desktop smoke photo');
  const photoHash = sha(photo);
  const manifest = JSON.stringify({
    capture: { source: 'camera' },
    photo: { sha256: photoHash },
    schema: 'org.doichain.doiproof.evidence/v2',
  });
  const manifestHash = sha(manifest);
  const evidenceHash = sha(`DoiProof:v2\nphoto:${photoHash}\nmanifest:${manifestHash}`);
  const zip = new JSZip();
  zip.file('original.jpg', photo);
  zip.file('manifest.json', manifest + '\n');
  zip.file('verification.json', JSON.stringify({
    photoSha256: photoHash, manifestSha256: manifestHash, evidenceSha256: evidenceHash,
  }) + '\n');
  const local = await verifyLocal(await zip.generateAsync({ type: 'nodebuffer' }));
  const report = reportText({ file: 'smoke.zip', generatedAtUtc: new Date().toISOString(), local, online: null });
  assert.match(report, /Byteintegrität der Datei und der Hashbindung bestätigt/);
  assert.match(report, new RegExp(evidenceHash));
});

test('revealed details are bound to the verified ZIP and preserve the complete manifest', async () => {
  const photo = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2]);
  const photoHash = sha(photo);
  const manifest = { app: { version: '0.4.0' }, capture: { source: 'camera' },
    location: { accuracy: 9.4, latitude: 48.19, longitude: 16.37, mocked: false },
    photo: { sha256: photoHash }, schema: 'org.doichain.doiproof.evidence/v2' };
  const canonical = JSON.stringify(manifest);
  const manifestHash = sha(canonical);
  const evidenceHash = sha(`DoiProof:v2\nphoto:${photoHash}\nmanifest:${manifestHash}`);
  const zip = new JSZip();
  zip.file('original.jpg', photo);
  zip.file('manifest.json', canonical + '\n');
  zip.file('verification.json', JSON.stringify({ photoSha256: photoHash,
    manifestSha256: manifestHash, evidenceSha256: evidenceHash }) + '\n');
  const bytes = await zip.generateAsync({ type: 'nodebuffer' });
  const details = await evidenceDetails(bytes, evidenceHash);
  assert.deepEqual(details.manifest, manifest);
  assert.equal(details.verification.evidenceSha256, evidenceHash);
  assert.match(details.photoPreview, /^data:image\/jpeg;base64,/);
  await assert.rejects(evidenceDetails(bytes, '0'.repeat(64)), /seit der Prüfung geändert/);
});

test('map uses valid Web Mercator tiles and rejects malformed coordinates', () => {
  const grid = tileGrid(48.19, 16.37);
  assert.equal(grid.tiles.length, 9);
  assert(grid.tiles.every(tile => tile.x >= 0 && tile.x < 16384 && tile.y >= 0 && tile.y < 16384));
  assert(grid.centerX >= 256 && grid.centerX < 512);
  assert(grid.centerY >= 256 && grid.centerY < 512);
  assert.throws(() => tileGrid(91, 16.37), /gültigen Koordinaten/);
});
