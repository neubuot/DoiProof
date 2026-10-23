/**
 * Erzeugt das ZIP-Beweispaket. Gemeinsam für App-Export, Tests und den In-App-Prüfbericht.
 */
import JSZip from 'jszip';
import { canonicalJson } from './canonical.mjs';
import { schemaVersion } from './manifest.mjs';

/** @param {string} version */
export function bundleReadme(version) {
  const canonical = version === 'v3'
    ? 'Kanonisierung (v3): JSON Canonicalization Scheme nach RFC 8785 – Objektschlüssel nach UTF-16-Code-Units sortiert, keine Leerzeichen, Zahlen und Zeichenketten wie in ECMAScript.'
    : 'Kanonisierung (v1/v2): Objektschlüssel rekursiv mit JavaScript localeCompare sortiert, undefined ausgelassen, keine Leerzeichen.';
  return [
    `DoiProof-Beweispaket (Manifest ${version})`,
    '',
    'Inhalt: original.<endung> (Originalfoto), manifest.json (kanonisches Manifest mit genau einem abschließenden Zeilenumbruch), verification.json (exportierter Status, Selbstauskunft).',
    '',
    `Prüfung: SHA-256 des Originals und des kanonischen manifest.json (ohne abschließenden Zeilenumbruch) berechnen. Der gemeinsame Hash ist SHA-256 von "DoiProof:${version}\\nphoto:<PHOTO_HASH>\\nmanifest:<MANIFEST_HASH>". Nur dieser Hash wird auf Doichain verankert.`,
    '',
    canonical,
    '',
    'Vorab-Blöcke, Gerätezeiten, Standort, Sensorwerte und App-Version im Manifest sind Selbstauskünfte des Geräts. Ein altes Foto kann erneut verwendet werden. Den Bestätigungsblock und die Transaktion unabhängig auf der Kette prüfen, z. B. mit dem DoiProof-Prüfer (npm run verify) oder verifile.it.',
    '',
  ].join('\n');
}

/**
 * @param {{
 *   photoBytes: Uint8Array,
 *   photoExtension: string,
 *   manifest: Record<string, any>,
 *   verification: Record<string, any>,
 * }} input
 * @returns {Promise<Uint8Array>}
 */
export async function createBundleZip({ photoBytes, photoExtension, manifest, verification }) {
  const version = schemaVersion(manifest.schema);
  if (!version) throw new Error('Unbekannte Manifestversion.');
  const extension = /^[a-zA-Z0-9]{1,8}$/.test(photoExtension) ? photoExtension.toLowerCase() : 'jpg';
  const zip = new JSZip();
  zip.file(`original.${extension}`, photoBytes);
  zip.file('manifest.json', `${canonicalJson(manifest, version)}\n`);
  zip.file('verification.json', `${JSON.stringify(verification, null, 2)}\n`);
  zip.file('README.txt', bundleReadme(version));
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
