/**
 * Manifest-Anpassungen für Google Play (Expo-Config-Plugin, läuft bei Prebuild und EAS Build).
 *
 * - WRITE_EXTERNAL_STORAGE nur bis Android 9 (API 28): expo-image-picker verlangt sie dort für
 *   die Kamera (ImagePickerModule.ensureCameraPermissionsAreGranted). Ab Android 10 entfällt sie.
 * - Kamera als optionales Hardware-Merkmal: Ohne Kamera bleibt „Foto wählen“ und der Prüfer
 *   nutzbar; Play blendet die App auf solchen Geräten sonst aus.
 */
const { withAndroidManifest } = require('expo/config-plugins');

const TOOLS = 'http://schemas.android.com/tools';
const WRITE_STORAGE = 'android.permission.WRITE_EXTERNAL_STORAGE';
const OPTIONAL_FEATURES = ['android.hardware.camera', 'android.hardware.camera.autofocus'];

/**
 * @param {any} manifest Inhalt von AndroidManifest.xml in der Form von xml2js (modResults.manifest)
 * @returns {any}
 */
function applyPlayManifest(manifest) {
  manifest.$ = { ...manifest.$, 'xmlns:tools': TOOLS };
  const permissions = (manifest['uses-permission'] ?? []).filter((/** @type {any} */ p) => p.$?.['android:name'] !== WRITE_STORAGE);
  permissions.push({ $: { 'android:name': WRITE_STORAGE, 'android:maxSdkVersion': '28', 'tools:replace': 'android:maxSdkVersion' } });
  manifest['uses-permission'] = permissions;
  const features = (manifest['uses-feature'] ?? []).filter((/** @type {any} */ f) => !OPTIONAL_FEATURES.includes(f.$?.['android:name']));
  for (const name of OPTIONAL_FEATURES) features.push({ $: { 'android:name': name, 'android:required': 'false' } });
  manifest['uses-feature'] = features;
  return manifest;
}

/** @param {import('expo/config-plugins').ExpoConfig} config */
function withAndroidPlay(config) {
  return withAndroidManifest(config, mod => {
    applyPlayManifest(mod.modResults.manifest);
    return mod;
  });
}

module.exports = withAndroidPlay;
module.exports.applyPlayManifest = applyPlayManifest;
