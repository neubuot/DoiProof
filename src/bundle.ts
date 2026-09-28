import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { canonicalJson } from './evidence';
import { ProofRecord } from './proofRecord';

const evidenceDirectory = new Directory(Paths.document, 'evidence');

function extensionFromUri(uri: string): string {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match?.[1]?.toLowerCase() ?? 'jpg';
}

export async function preserveEvidencePhoto(recordId: string, sourceUri: string): Promise<string> {
  if (!evidenceDirectory.exists) evidenceDirectory.create({ idempotent: true, intermediates: true });
  const destination = new File(evidenceDirectory, `${recordId}.${extensionFromUri(sourceUri)}`);
  await new File(sourceUri).copy(destination);
  return destination.uri;
}

export async function shareEvidenceBundle(record: ProofRecord): Promise<void> {
  if (!record.manifest || !record.localPhotoUri) throw new Error('Für diesen älteren Nachweis ist kein vollständiges Beweispaket vorhanden.');
  const photo = new File(record.localPhotoUri);
  if (!photo.exists) throw new Error('Das lokal gespeicherte Originalfoto wurde nicht gefunden.');
  const zip = new JSZip();
  zip.file(`original.${extensionFromUri(record.localPhotoUri)}`, await photo.bytes());
  zip.file('manifest.json', `${canonicalJson(record.manifest)}\n`);
  zip.file('verification.json', `${JSON.stringify({
    evidenceSha256: record.sha256,
    photoSha256: record.photoSha256,
    manifestSha256: record.manifestSha256,
    status: record.status,
    txid: record.txid,
    blockTimeUtc: record.blockTimeUtc,
    blockHeight: record.blockHeight,
    blockHash: record.blockHash,
    confirmations: record.confirmations,
    lastCheckedAt: record.lastCheckedAt,
  }, null, 2)}\n`);
  const version = record.manifest.schema.endsWith('/v2') ? 'v2' : 'v1';
  zip.file('README.txt', `DoiProof-Beweispaket\n\nPrüfung: SHA-256 des Originals und des kanonischen manifest.json (ohne abschließenden Zeilenumbruch) berechnen. Der gemeinsame Hash ist SHA-256 von "DoiProof:${version}\\nphoto:<PHOTO_HASH>\\nmanifest:<MANIFEST_HASH>". Nur dieser Hash wird auf Doichain verankert. Die Vorab-Blöcke sind im Manifest enthalten; ihre Abfragezeit und die App-Version sind Selbstauskünfte des Geräts. Ein altes Foto kann erneut verwendet werden. Den Bestätigungsblock und die Transaktion unabhängig auf der Kette prüfen.\n`);
  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  const output = new File(Paths.cache, `DoiProof-${record.id}.zip`);
  output.write(bytes);
  if (!await Sharing.isAvailableAsync()) throw new Error('Teilen ist auf diesem Gerät nicht verfügbar.');
  await Sharing.shareAsync(output.uri, { mimeType: 'application/zip', dialogTitle: 'DoiProof-Beweispaket teilen' });
}
