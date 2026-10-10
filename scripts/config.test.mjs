import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { VERSION } from '../core/version.mjs';
import { androidSection, END, mergeSection, START } from './release-notes.mjs';

const root = new URL('../', import.meta.url);
const json = async (/** @type {string} */ path) => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const text = (/** @type {string} */ path) => readFile(new URL(path, root), 'utf8');
const PROJECT_ID = '190b3b9c-3911-4831-947e-06bb20ce9d89';

test('App, Prüfprogramm und Windows-Prüfer tragen dieselbe Version 1.0.0', async () => {
  assert.equal(VERSION, '1.0.0');
  assert.equal((await json('package.json')).version, VERSION);
  assert.equal((await json('app.json')).expo.version, VERSION);
  assert.equal((await json('desktop/package.json')).version, VERSION);
  assert.match(await text('RELEASE_NOTES.md'), new RegExp(`DoiProof ${VERSION.replace(/\./g, '\\.')}`));
});

test('Expo-Konfiguration: Owner, Projekt, iOS-Bundle-ID, Berechtigungen und EAS Update', async () => {
  const { expo } = await json('app.json');
  assert.equal(expo.owner, 'neubuots-team');
  assert.equal(expo.slug, 'doiproof');
  assert.equal(expo.extra.eas.projectId, PROJECT_ID);
  assert.equal(expo.updates.url, `https://u.expo.dev/${PROJECT_ID}`);
  assert.deepEqual(expo.runtimeVersion, { policy: 'fingerprint' }, 'native Änderungen müssen einen neuen Build erzwingen');
  assert.equal(expo.ios.bundleIdentifier, 'org.doichain.doiproof');
  for (const key of ['NSCameraUsageDescription', 'NSLocationWhenInUseUsageDescription', 'NSMotionUsageDescription', 'NSPhotoLibraryUsageDescription']) {
    assert.ok(expo.ios.infoPlist[key]?.length > 40, key);
  }
  assert.equal(expo.ios.config.usesNonExemptEncryption, false);
  assert.equal(expo.android.package, 'org.doichain.doiproof');
  assert.ok(expo.android.blockedPermissions.includes('android.permission.RECORD_AUDIO'));
  assert.ok(expo.plugins.some((/** @type {any} */ p) => Array.isArray(p) && p[0] === 'expo-sensors' && p[1].motionPermission));
});

test('EAS: APK für Tester im Kanal preview, Store/TestFlight im Kanal production', async () => {
  const eas = await json('eas.json');
  assert.equal(eas.cli.appVersionSource, 'remote');
  assert.equal(eas.build.preview.distribution, 'internal');
  assert.equal(eas.build.preview.channel, 'preview');
  assert.equal(eas.build.preview.android.buildType, 'apk');
  assert.equal(eas.build.production.channel, 'production');
  assert.equal(eas.build.production.distribution, 'store');
  assert.ok(eas.build.production.ios, 'iOS-Profil für TestFlight');
  assert.ok(eas.submit.production.ios, 'Submit-Profil für TestFlight');
  const pkg = await json('package.json');
  for (const dep of ['expo-updates', 'expo-sensors', 'expo-document-picker', 'pdf-lib', '@pdf-lib/fontkit', 'qrcode-generator']) assert.ok(pkg.dependencies[dep], dep);
  assert.equal(pkg.scripts['eas-build-post-install'], 'node scripts/build-info.mjs');
});

test('Workflows: APK bei Release-Tag mit EXPO_TOKEN, EAS Update, Windows-Release', async () => {
  const apk = await text('.github/workflows/android-apk.yml');
  assert.match(apk, /tags: \['v\*'\]/);
  assert.match(apk, /secrets\.EXPO_TOKEN/);
  assert.match(apk, /eas build --platform android --profile preview --non-interactive/);
  assert.match(apk, /scripts\/release-notes\.mjs/);
  const update = await text('.github/workflows/eas-update.yml');
  assert.match(update, /eas update --channel "\$CHANNEL"/);
  assert.match(update, /options: \[preview, production\]/);
  const desktop = await text('.github/workflows/desktop-windows.yml');
  assert.match(desktop, /npm run dist:win/);
  assert.match(desktop, /gh release upload/);
  assert.doesNotMatch(desktop, /0\.6\.0/);
});

test('Release-Notes erhalten den Expo-Link idempotent', () => {
  const section = androidSection({
    version: '1.0.0', buildUrl: 'https://expo.dev/accounts/neubuots-team/projects/doiproof/builds/abc',
    apkUrl: 'https://expo.dev/artifacts/eas/abc.apk', commit: 'a'.repeat(40),
  });
  assert.match(section, /\[DoiProof 1\.0\.0 herunterladen\]\(https:\/\/expo\.dev\/artifacts\/eas\/abc\.apk\)/);
  const once = mergeSection('# DoiProof 1.0.0\n\nText', section);
  const twice = mergeSection(once, section.replace('abc.apk', 'def.apk'));
  assert.equal(twice.split(START).length, 2);
  assert.equal(twice.split(END).length, 2);
  assert.match(twice, /def\.apk/);
  assert.doesNotMatch(twice, /abc\.apk/);
  assert.throws(() => androidSection({ version: '1.0.0', buildUrl: 'https://evil.example/x', apkUrl: 'https://expo.dev/a.apk' }), /expo\.dev/);
});

test('Keine Zugangsdaten, Schlüssel oder Signaturdateien im Repository', () => {
  const files = execFileSync('git', ['ls-files'], { cwd: new URL('.', root), encoding: 'utf8' }).split('\n').filter(Boolean);
  for (const file of files) {
    assert.doesNotMatch(file, /\.(jks|keystore|p8|p12|pem|mobileprovision)$|(^|\/)credentials\.json$|(^|\/)\.env(\.|$)(?!example)/, file);
  }
  // -e, weil ein Muster mit führendem „-“ sonst als Option gilt; nur Exitcode 1 bedeutet „kein Treffer“
  const grep = (/** @type {string} */ pattern) => {
    try { return execFileSync('git', ['grep', '-I', '-n', '-E', '-e', pattern, '--', '.', ':!package-lock.json', ':!desktop/package-lock.json', ':!scripts/config.test.mjs'], { cwd: new URL('.', root), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (error) {
      if (/** @type {{ status?: number }} */ (error).status === 1) return '';
      throw error;
    }
  };
  assert.equal(grep('-----BEGIN [A-Z ]*PRIVATE KEY-----'), '');
  assert.equal(grep('EXPO_TOKEN *[:=] *["\']?[A-Za-z0-9_-]{20,}'), '');
  assert.equal(grep('ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}'), '');
});
