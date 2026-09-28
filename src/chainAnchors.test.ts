import assert from 'node:assert/strict';
import test from 'node:test';
import { getBitcoinAnchor, isValidPreCaptureAnchors } from './chainAnchors';
import { PreCaptureAnchors } from './proofRecord';

const anchors: PreCaptureAnchors = {
  bitcoin: {
    chain: 'btc', height: 900000, hash: 'a'.repeat(64),
    headerTimeUtc: '2026-09-28T02:00:00.000Z',
    observedAtDeviceUtc: '2026-09-28T02:02:00.000Z', source: 'test',
  },
  doichain: {
    chain: 'doi', height: 432000, hash: 'b'.repeat(64),
    headerTimeUtc: '2026-09-28T02:01:00.000Z',
    observedAtDeviceUtc: '2026-09-28T02:02:01.000Z', source: 'test',
  },
};

test('accepts a matching BTC and DOI pre-capture pair', () => {
  assert.equal(isValidPreCaptureAnchors(anchors), true);
});

test('rejects malformed or swapped pre-capture references', () => {
  assert.equal(isValidPreCaptureAnchors({ ...anchors, bitcoin: { ...anchors.bitcoin, hash: 'short' } }), false);
  assert.equal(isValidPreCaptureAnchors({ ...anchors, bitcoin: { ...anchors.bitcoin, chain: 'doi' } }), false);
});

test('BTC lookup binds height and timestamp to the exact fetched tip hash', async () => {
  const original = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);
    return url.endsWith('/blocks/tip/hash')
      ? new Response('a'.repeat(64))
      : new Response(JSON.stringify({ id: 'a'.repeat(64), height: 900000, timestamp: 1790551200 }));
  }) as typeof fetch;
  try {
    const anchor = await getBitcoinAnchor();
    assert.equal(anchor.hash, 'a'.repeat(64));
    assert.equal(anchor.height, 900000);
    assert.equal(requests[1], `https://blockstream.info/api/block/${'a'.repeat(64)}`);
  } finally {
    globalThis.fetch = original;
  }
});

test('BTC lookup rejects block details from a different hash', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => String(input).endsWith('/blocks/tip/hash')
    ? new Response('a'.repeat(64))
    : new Response(JSON.stringify({ id: 'b'.repeat(64), height: 900000, timestamp: 1790551200 }))) as typeof fetch;
  try {
    await assert.rejects(getBitcoinAnchor(), /passen nicht/);
  } finally {
    globalThis.fetch = original;
  }
});
