import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SETTINGS, parseSettings } from './appSettings';
import { LOCATION_SETTINGS, PRIVATE_SETTINGS } from './evidenceManifest';

test('Einstellung „Nach Aufnahme sofort senden“ bleibt gespeichert; Beschädigtes fällt auf die Voreinstellung zurück', () => {
  assert.equal(parseSettings(JSON.stringify({ autoSend: false })).autoSend, false);
  assert.equal(parseSettings(JSON.stringify({ autoSend: true })).autoSend, true);
  for (const text of ['', '{', 'null', '[]', '{"autoSend":"nein"}', '{"autoSend":0}']) {
    assert.deepEqual(parseSettings(text), DEFAULT_SETTINGS, text);
  }
});

test('Profil, Vorabblöcke und Berichtsauswahl bleiben vollständig erhalten', () => {
  const stored = {
    autoSend: false,
    usePreCaptureAnchors: false,
    metadata: LOCATION_SETTINGS,
    report: { photo: false, location: true, map: false, online: false },
  };
  assert.deepEqual(parseSettings(JSON.stringify(stored)), stored);
});

/**
 * Eine Datei aus einer früheren Fassung kennt nur `autoSend`. Sie muss weiter gelten,
 * ohne die übrigen Einstellungen zu verlieren; dafür greifen die Voreinstellungen.
 */
test('eine ältere Einstellungsdatei bleibt gültig', () => {
  const parsed = parseSettings(JSON.stringify({ autoSend: false }));
  assert.equal(parsed.autoSend, false);
  assert.deepEqual(parsed.metadata, PRIVATE_SETTINGS);
  assert.equal(parsed.usePreCaptureAnchors, DEFAULT_SETTINGS.usePreCaptureAnchors);
  assert.deepEqual(parsed.report, DEFAULT_SETTINGS.report);
});

/**
 * Der gefährliche Fall: Ein einzeln beschädigter Schalter darf nicht dazu führen, dass
 * „Standort & Sensoren“ angezeigt wird, während keine Koordinaten erfasst werden.
 */
test('ein beschädigtes Profil fällt vollständig auf „Privat“ zurück', () => {
  const broken = { metadata: { ...LOCATION_SETTINGS, includeLocation: 'ja' } };
  assert.deepEqual(parseSettings(JSON.stringify(broken)).metadata, PRIVATE_SETTINGS);

  const unknown = { metadata: { ...LOCATION_SETTINGS, profile: 'alles' } };
  assert.deepEqual(parseSettings(JSON.stringify(unknown)).metadata, PRIVATE_SETTINGS);

  const missing = { metadata: { profile: 'location' } };
  assert.deepEqual(parseSettings(JSON.stringify(missing)).metadata, PRIVATE_SETTINGS);
});

test('übernimmt keine unbekannten Felder', () => {
  const parsed = parseSettings(JSON.stringify({ autoSend: true, apiKey: 'geheim' })) as Record<string, unknown>;
  assert.equal(parsed.apiKey, undefined);
  assert.deepEqual(Object.keys(parsed).sort(), ['autoSend', 'metadata', 'report', 'usePreCaptureAnchors']);
});
