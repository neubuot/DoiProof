import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { verifyLocal, verifyBundle } from './verify.mjs';

const sha = data => createHash('sha256').update(data).digest('hex');
const canonical = value => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
};
async function fixture(version = 'v2', modify = () => {}) {
  const photo = Buffer.from('example image bytes\0', 'utf8');
  const photoHash = sha(photo);
  const manifest = { schema: `org.doichain.doiproof.evidence/${version}`,
    profile: 'private', photo: { sha256: photoHash },
    capture: { source: 'camera', deviceTime: '2026-09-28T02:00:00.000Z' } };
  const manifestText = canonical(manifest);
  const verification = { photoSha256: photoHash, manifestSha256: sha(manifestText),
    evidenceSha256: sha(`DoiProof:${version}\nphoto:${photoHash}\nmanifest:${sha(manifestText)}`),
    status: 'pending' };
  const zip = new JSZip();
  zip.file('original.jpg', photo);
  zip.file('manifest.json', manifestText + '\n');
  zip.file('verification.json', JSON.stringify(verification) + '\n');
  modify(zip, { manifest, verification, photo });
  return zip.generateAsync({ type: 'nodebuffer' });
}
test('v2 verifies all three hash layers', async () => {
  const result = await verifyLocal(await fixture());
  assert.equal(result.version, 'v2');
  assert.equal(result.exportedStatus, 'pending');
});
test('v1 remains verifiable', async () => {
  assert.equal((await verifyLocal(await fixture('v1'))).version, 'v1');
});
test('photo alteration fails even if ZIP CRC is valid', async () => {
  await assert.rejects(verifyLocal(await fixture('v2', zip => zip.file('original.jpg', 'tampered'))),
    /Foto-Hash/);
});
test('manifest alteration fails', async () => {
  await assert.rejects(verifyLocal(await fixture('v2', (zip, { manifest }) => {
    zip.file('manifest.json', canonical({ ...manifest, profile: 'location' }) + '\n');
  })), /Manifest-Hash/);
});
test('claimed anchoring hash alteration fails', async () => {
  await assert.rejects(verifyLocal(await fixture('v2', (zip, { verification }) => {
    zip.file('verification.json', JSON.stringify({ ...verification, evidenceSha256: '0'.repeat(64) }) + '\n');
  })), /Beweispaket-Hash/);
});
test('unknown file or noncanonical manifest fails', async () => {
  await assert.rejects(verifyLocal(await fixture('v2', zip => zip.file('../unsafe.txt', 'x'))), /ZIP-Eintrag/);
  await assert.rejects(verifyLocal(await fixture('v2', (zip, { manifest }) => zip.file('manifest.json', JSON.stringify(manifest, null, 2) + '\n'))),
    /nicht kanonisch/);
});
test('online pending is incomplete; offline never contacts a service', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'doiproof-verify-'));
  const path = join(dir, 'packet.zip');
  const originalFetch = globalThis.fetch;
  let calls = 0;
  try {
    await writeFile(path, await fixture());
    globalThis.fetch = async (_url, request) => {
      calls++;
      const call = JSON.parse(request.body);
      assert.equal(call.params.name, 'check_proof');
      return { ok: true, json: async () => ({ result: { structuredContent: {
        sha256: call.params.arguments.sha256, status: 'pending',
      } } }) };
    };
    assert.equal((await verifyBundle(path)).online, null);
    assert.equal(calls, 0);
    assert.equal((await verifyBundle(path, true)).online.status, 'incomplete');
    assert.equal(calls, 1);
  } finally { globalThis.fetch = originalFetch; await rm(dir, { recursive: true, force: true }); }
});
test('online confirmed status checks transaction and matching block', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'doiproof-verify-'));
  const path = join(dir, 'packet.zip');
  const originalFetch = globalThis.fetch;
  const txid = 'a'.repeat(64), blockHash = 'b'.repeat(64);
  try {
    await writeFile(path, await fixture());
    globalThis.fetch = async (_url, request) => {
      const { params } = JSON.parse(request.body);
      const value = params.name === 'check_proof'
        ? { sha256: params.arguments.sha256, status: 'confirmed', txid, block_height: 123 }
        : params.name === 'get_transaction'
          ? { txid, block_hash: blockHash, confirmations: 2 }
          : { hash: blockHash, height: 123 };
      return { ok: true, json: async () => ({ result: { structuredContent: value } }) };
    };
    assert.equal((await verifyBundle(path, true)).online.status, 'matched');
  } finally { globalThis.fetch = originalFetch; await rm(dir, { recursive: true, force: true }); }
});
