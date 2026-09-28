import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import { verifyLocal } from './verify.mjs';

const PREVIEW_LIMIT = 25 * 1024 * 1024;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function imageMime(bytes) {
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}

export async function evidenceDetails(zipBytes, expectedHash) {
  if (!/^[0-9a-f]{64}$/.test(expectedHash)) throw new Error('Ungültiger Paket-Hash.');
  const local = await verifyLocal(zipBytes);
  if (local.evidenceSha256 !== expectedHash) throw new Error('Die ZIP-Datei hat sich seit der Prüfung geändert. Bitte erneut prüfen.');
  const zip = await JSZip.loadAsync(zipBytes);
  const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  const verification = JSON.parse(await zip.file('verification.json').async('string'));
  const photo = await zip.file(local.photoFile).async('nodebuffer');
  if (sha(photo) !== local.photoSha256) throw new Error('Fotodatei wurde verändert.');
  const mime = photo.length <= PREVIEW_LIMIT ? imageMime(photo) : null;
  return {
    manifest,
    verification,
    photoFile: local.photoFile,
    photoBytes: photo.length,
    photoPreview: mime ? `data:${mime};base64,${photo.toString('base64')}` : null,
    previewReason: photo.length > PREVIEW_LIMIT
      ? 'Das Foto ist größer als 25 MiB; die Vorschau wurde aus Speichergründen ausgelassen.'
      : mime ? null : 'Dieses Bildformat kann die Vorschau nicht sicher darstellen.',
  };
}
