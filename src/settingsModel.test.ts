import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_SETTINGS, LOCATION_SETTINGS, parseSettings, PRIVATE_SETTINGS, StoredSettings,
} from './settingsModel';

const stored: StoredSettings = {
  metadata: LOCATION_SETTINGS,
  autoSend: false,
  usePreCaptureAnchors: false,
  includeSensitiveInPdf: true,
};

test('übernimmt einen vollständigen gespeicherten Stand', () => {
  assert.deepEqual(parseSettings(JSON.parse(JSON.stringify(stored))), stored);
});

test('Vorgabe ist das Profil ohne Standortabfrage', () => {
  assert.equal(DEFAULT_SETTINGS.metadata, PRIVATE_SETTINGS);
  assert.equal(DEFAULT_SETTINGS.metadata.includeLocation, false);
});

test('fällt bei fehlenden oder unbrauchbaren Daten vollständig zurück', () => {
  for (const value of [null, undefined, 42, 'privat', [], {}]) {
    assert.deepEqual(parseSettings(value), DEFAULT_SETTINGS);
  }
});

test('ein unbekanntes Profil verwirft den gesamten Stand', () => {
  const foreign = { ...stored, metadata: { ...LOCATION_SETTINGS, profile: 'alles' } };
  assert.deepEqual(parseSettings(foreign), DEFAULT_SETTINGS);
});

/**
 * Der gefährliche Fall: Ein beschädigter Schalter darf nicht dazu führen, dass das
 * Profil „Standortnachweis“ ohne Standortabfrage weiterläuft. Dann entstünden Nachweise
 * ohne Koordinaten, während die Oberfläche das Gegenteil anzeigt.
 */
test('ein beschädigter Schalter verwirft den gesamten Stand', () => {
  const broken = { ...stored, metadata: { ...LOCATION_SETTINGS, includeLocation: 'ja' } };
  assert.deepEqual(parseSettings(broken), DEFAULT_SETTINGS);
  assert.deepEqual(parseSettings({ ...stored, autoSend: 1 }), DEFAULT_SETTINGS);
});

test('übernimmt nur bekannte Felder', () => {
  const extra = { ...stored, metadata: { ...LOCATION_SETTINGS, apiKey: 'geheim' }, apiKey: 'geheim' };
  const parsed = parseSettings(extra) as StoredSettings & { apiKey?: string };
  assert.equal(parsed.apiKey, undefined);
  assert.equal((parsed.metadata as typeof parsed.metadata & { apiKey?: string }).apiKey, undefined);
});
