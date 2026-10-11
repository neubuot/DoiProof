import assert from 'node:assert/strict';
import test from 'node:test';
import { canResend, isNotAnchored, isPending, isProofRecord, proofToRecord, upsertRecord } from './proofRecord';

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

test('nicht verankerte Nachweise (Dienststatus „unknown“) lassen sich erneut senden', () => {
  const base = proofToRecord('a'.repeat(64), 'camera', { status: 'local' } as never, undefined, undefined, '2026-10-11T08:00:00.000Z');
  const withStatus = (status: string) => ({ ...base, status });
  for (const status of ['local', 'submission_unknown', 'unknown', 'not_found']) assert.equal(canResend(withStatus(status)), true, status);
  for (const status of ['pending', 'confirmed', 'expired']) assert.equal(canResend(withStatus(status)), false, status);
  assert.equal(isNotAnchored(withStatus('unknown')), true);
  assert.equal(isNotAnchored(withStatus('submission_unknown')), false);
  // Ein späteres Verankern bleibt sichtbar: „unknown“ wird weiter abgefragt
  assert.equal(isPending(withStatus('unknown')), true);
});
