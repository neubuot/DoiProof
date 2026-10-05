/**
 * Manifestversionen, Hashbindung und Strukturprüfung.
 *
 * Paket-Hash = SHA-256(UTF-8 von "DoiProof:<version>\nphoto:<FOTO>\nmanifest:<MANIFEST>")
 * Manifest-Hash = SHA-256(UTF-8 des kanonischen Manifests ohne abschließenden Zeilenumbruch)
 */
import { canonicalJson } from './canonical.mjs';
import { validateSensors } from './sensors.mjs';
import { HEX64, isIsoTime, isPlainObject, sha256Text } from './util.mjs';

export const SCHEMA_PREFIX = 'org.doichain.doiproof.evidence/';
export const CURRENT_VERSION = 'v3';
export const VERSIONS = ['v1', 'v2', 'v3'];
export const LOCATION_STATUSES = ['recorded', 'not_requested', 'permission_denied', 'unavailable', 'error'];

/** @param {unknown} schema @returns {'v1'|'v2'|'v3'|null} */
export function schemaVersion(schema) {
  const match = typeof schema === 'string' ? /^org\.doichain\.doiproof\.evidence\/(v[123])$/.exec(schema) : null;
  return match ? /** @type {'v1'|'v2'|'v3'} */ (match[1]) : null;
}

/** @param {string} version @param {string} photoSha256 @param {string} manifestSha256 */
export function evidenceMessage(version, photoSha256, manifestSha256) {
  return `DoiProof:${version}\nphoto:${photoSha256}\nmanifest:${manifestSha256}`;
}

/**
 * Berechnet Manifest- und Paket-Hash eines Manifests.
 * @param {Record<string, any>} manifest
 * @param {import('./util.mjs').Sha256} sha256
 */
export async function computeEvidence(manifest, sha256) {
  const version = schemaVersion(manifest.schema);
  if (!version) throw new Error('Unbekannte Manifestversion.');
  const manifestText = canonicalJson(manifest, version);
  const manifestSha256 = await sha256Text(sha256, manifestText);
  const evidenceSha256 = await sha256Text(sha256, evidenceMessage(version, manifest.photo.sha256, manifestSha256));
  return { version, manifestText, manifestSha256, evidenceSha256 };
}

/**
 * @param {unknown} pre
 * @param {unknown} source
 * @returns {string | null}
 */
export function validatePreCapture(pre, source) {
  if (pre === undefined) return null;
  if (source !== 'camera' || !isPlainObject(pre) || !isPlainObject(pre.bitcoin) || !isPlainObject(pre.doichain)) {
    return 'Vorabblöcke erfordern Kameraquelle und beide Blockreferenzen.';
  }
  for (const [key, chain] of [['bitcoin', 'btc'], ['doichain', 'doi']]) {
    const block = pre[key];
    if (block.chain !== chain || typeof block.hash !== 'string' || !HEX64.test(block.hash)
      || !Number.isSafeInteger(block.height) || block.height < 0
      || !isIsoTime(block.headerTimeUtc) || !isIsoTime(block.observedAtDeviceUtc)) {
      return `Ungültiger Vorabblock: ${key}`;
    }
  }
  return null;
}

/** @param {unknown} location @param {string} version */
export function validateLocation(location, version) {
  if (location === undefined) return null;
  if (!isPlainObject(location)) return 'Standortangabe ist kein Objekt.';
  const status = version === 'v3' ? location.status : 'recorded';
  if (!LOCATION_STATUSES.includes(status)) return 'Ungültiger Standortstatus.';
  if (status !== 'recorded') {
    return location.latitude === undefined && location.longitude === undefined ? null : 'Standort ohne Erfassung enthält Koordinaten.';
  }
  const { latitude, longitude } = location;
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return 'Ungültige Koordinaten im Manifest.';
  }
  if (!isIsoTime(location.measuredAt)) return 'Ungültige Standort-Messzeit.';
  for (const field of ['altitude', 'accuracy', 'altitudeAccuracy', 'heading', 'speed']) {
    const value = location[field];
    if (value !== undefined && value !== null && (typeof value !== 'number' || !Number.isFinite(value))) return `Ungültiger Standortwert: ${field}`;
  }
  return null;
}

/**
 * Strukturprüfung eines Manifests. Liefert eine Fehlermeldung oder null.
 * @param {Record<string, any>} manifest
 * @param {'v1'|'v2'|'v3'} version
 */
export function validateManifest(manifest, version) {
  if (!isPlainObject(manifest.photo) || typeof manifest.photo.sha256 !== 'string' || !HEX64.test(manifest.photo.sha256)) {
    return 'Ungültiger oder fehlender Wert: manifest.photo.sha256';
  }
  const preError = validatePreCapture(manifest.preCapture, manifest.capture?.source);
  if (preError) return preError;
  const locationError = validateLocation(manifest.location, version);
  if (locationError) return locationError;
  if (version === 'v3') {
    if (!isPlainObject(manifest.capture) || !['camera', 'library'].includes(manifest.capture.source)) return 'Aufnahmequelle fehlt im Manifest v3.';
    for (const field of ['deviceTime', 'cameraOpenedAt']) {
      if (manifest.capture[field] !== undefined && !isIsoTime(manifest.capture[field])) return `Ungültige Aufnahmezeit: ${field}`;
    }
    const sensorError = validateSensors(manifest.sensors);
    if (sensorError) return sensorError;
  }
  return null;
}
