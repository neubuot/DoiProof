import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import { verifyLocal, reportText } from './verify.mjs';

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
