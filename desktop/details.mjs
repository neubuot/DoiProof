import { analyzeBundle } from './core/verify.mjs';
import { nodeSha256 } from './core/node.mjs';

const PREVIEW_LIMIT = 25 * 1024 * 1024;

/** @param {Uint8Array} bytes */
function imageMime(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)) return 'image/png';
  if (String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

/**
 * Liefert Foto und vollständiges Manifest erst nach erneuter Prüfung desselben Pakets.
 * @param {Uint8Array} zipBytes
 * @param {string} expectedHash
 */
export async function evidenceDetails(zipBytes, expectedHash) {
  if (!/^[0-9a-f]{64}$/.test(expectedHash)) throw new Error('Ungültiger Paket-Hash.');
  const analysis = await analyzeBundle(zipBytes, { sha256: nodeSha256 });
  if (!analysis.ok) throw new Error(analysis.error ?? 'Das Paket ist nicht unverändert.');
  if (analysis.hashes.evidenceSha256 !== expectedHash) throw new Error('Die ZIP-Datei hat sich seit der Prüfung geändert. Bitte erneut prüfen.');
  const photo = /** @type {Uint8Array} */ (analysis.photoBytes);
  const mime = photo.length <= PREVIEW_LIMIT ? imageMime(photo) : null;
  return {
    manifest: analysis.manifest,
    verification: analysis.verification,
    photoFile: analysis.photoFile,
    photoBytes: photo.length,
    photoPreview: mime ? `data:${mime};base64,${Buffer.from(photo).toString('base64')}` : null,
    previewReason: photo.length > PREVIEW_LIMIT
      ? 'Das Foto ist größer als 25 MiB; die Vorschau wurde aus Speichergründen ausgelassen.'
      : mime ? null : 'Dieses Bildformat kann die Vorschau nicht sicher darstellen.',
  };
}
