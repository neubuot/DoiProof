import assert from 'node:assert/strict';
import test from 'node:test';
import { isPending, isProofRecord, proofToRecord, upsertRecord } from './proofRecord';

const hash = 'a'.repeat(64);
const now = '2026-09-27T21:00:00.000Z';

test('creates a pending history record from an API response', () => {
  const record = proofToRecord(hash, 'camera', { sha256: hash, status: 'pending' }, now, undefined, now);
  assert.equal(record.sha256, hash);
  assert.equal(record.status, 'pending');
  assert.equal(record.capturedAt, now);
  assert.equal(isPending(record), true);
});

test('updates an existing record without losing its identity', () => {
  const existing = proofToRecord(hash, 'camera', { sha256: hash, status: 'pending' }, now, undefined, now);
  const updated = proofToRecord(hash, 'camera', {
    sha256: hash, status: 'confirmed', txid: 'tx-123', confirmations: 2,
  }, now, existing, '2026-09-27T21:05:00.000Z');
  assert.equal(updated.id, existing.id);
  assert.equal(updated.status, 'confirmed');
  assert.equal(updated.txid, 'tx-123');
  assert.equal(isPending(updated), false);
});

test('rejects malformed persisted records', () => {
  assert.equal(isProofRecord({ id: 'x', sha256: 'short', createdAt: now, status: 'pending' }), false);
});

test('keeps evidence metadata during a status refresh', () => {
  const existing = {
    ...proofToRecord(hash, 'camera', { sha256: hash, status: 'pending' }, now, undefined, now),
    photoSha256: 'b'.repeat(64),
    manifestSha256: 'c'.repeat(64),
    evidenceProfile: 'location' as const,
  };
  const updated = proofToRecord(hash, 'camera', { sha256: hash, status: 'confirmed' }, now, existing, now);
  assert.equal(updated.photoSha256, existing.photoSha256);
  assert.equal(updated.manifestSha256, existing.manifestSha256);
  assert.equal(updated.evidenceProfile, 'location');
});

test('preserves block height and v2 manifest while confirming a proof', () => {
  const previous = {
    ...proofToRecord(hash, 'camera', { sha256: hash, status: 'pending' }, now, undefined, now),
    manifest: { schema: 'org.doichain.doiproof.evidence/v2' as const, createdAt: now,
      profile: 'private' as const, photo: { sha256: 'b'.repeat(64) } },
  };
  const record = proofToRecord(hash, 'camera', {
    sha256: hash, status: 'confirmed', block_height: 432010,
  }, now, previous);
  assert.equal(record.blockHeight, 432010);
  assert.equal(record.manifest, previous.manifest);
});

test('local capture remains available for retry and is not polled before submission', () => {
  const draft = {
    ...proofToRecord(hash, 'camera', { sha256: hash, status: 'local' }, now, undefined, now),
    localPhotoUri: 'file:///private/original.jpg',
    manifest: { schema: 'org.doichain.doiproof.evidence/v2' as const,
      createdAt: now, profile: 'private' as const, photo: { sha256: 'b'.repeat(64) } },
  };
  assert.equal(isPending(draft), false);
  const submitted = proofToRecord(hash, 'camera', { sha256: hash, status: 'pending' }, now, draft, now);
  assert.equal(submitted.localPhotoUri, draft.localPhotoUri);
  assert.equal(submitted.manifest, draft.manifest);
  assert.deepEqual(upsertRecord([draft], submitted), [submitted]);
  assert.equal(isPending({ ...draft, status: 'submission_unknown' }), true);
});
