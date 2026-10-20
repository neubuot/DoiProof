import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = async name => readFile(join(root, name), 'utf8');
const json = async name => JSON.parse(await read(name));

test('package.json ist die einzige Quelle der Version', async () => {
  const { version } = await json('package.json');
  assert.match(version, /^\d+\.\d+\.\d+$/, 'Version muss der Form major.minor.patch folgen.');

  const { expo } = await json('app.json');
  assert.equal(expo.version, undefined,
    'app.json darf keine eigene Version führen; app.config.js übernimmt sie aus package.json.');
});

test('app.config.js übernimmt die Version aus package.json', async () => {
  const { version } = await json('package.json');
  const { default: withVersion } = await import(join(root, 'app.config.js'));
  const { expo } = await json('app.json');
  assert.equal(withVersion({ config: expo }).version, version);
});

/**
 * Der native Ordner ist eingecheckt und wird nur bei einem erneuten `expo prebuild`
 * neu geschrieben. Ohne diese Prüfung trägt ein Release die alte versionName, während
 * package.json und das Beweis-Manifest bereits die neue nennen.
 */
test('android/app/build.gradle trägt dieselbe versionName', async () => {
  const { version } = await json('package.json');
  const gradle = await read('android/app/build.gradle');
  const match = gradle.match(/versionName\s+"([^"]+)"/);
  assert.ok(match, 'versionName wurde in android/app/build.gradle nicht gefunden.');
  assert.equal(match[1], version,
    'versionName weicht ab. Nach einer Versionsänderung `npx expo prebuild --platform android` ausführen.');
});
