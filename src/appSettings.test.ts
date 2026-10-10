import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SETTINGS, parseSettings } from './appSettings';

test('Einstellung „Nach Aufnahme sofort senden“ bleibt gespeichert; Beschädigtes fällt auf die Voreinstellung zurück', () => {
  assert.deepEqual(parseSettings(JSON.stringify({ autoSend: false })), { autoSend: false });
  assert.deepEqual(parseSettings(JSON.stringify({ autoSend: true })), { autoSend: true });
  for (const text of ['', '{', 'null', '[]', '{"autoSend":"nein"}', '{"autoSend":0}']) assert.deepEqual(parseSettings(text), DEFAULT_SETTINGS, text);
});
