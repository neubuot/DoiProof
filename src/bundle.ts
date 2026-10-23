import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { createBundleZip } from '../core/bundle.mjs';
import { ProofRecord } from './proofRecord';

const evidenceDirectory = new Directory(Paths.document, 'evidence');

export function extensionFromUri(uri: string): string {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match?.[1]?.toLowerCase() ?? 'jpg';
}

export async function preserveEvidencePhoto(recordId: string, sourceUri: string): Promise<string> {
  if (!evidenceDirectory.exists) evidenceDirectory.create({ idempotent: true, intermediates: true });
  const destination = new File(evidenceDirectory, `${recordId}.${extensionFromUri(sourceUri)}`);
  await new File(sourceUri).copy(destination);
  return destination.uri;
}

export function bundleFileName(record: ProofRecord): string {
  return `DoiProof-${record.id.replace(/[^0-9A-Za-z.-]/g, '')}.zip`;
}

/** Baut das vollständige Beweispaket eines Verlaufseintrags im Speicher (gemeinsamer Kern). */
export async function buildEvidenceBundle(record: ProofRecord): Promise<Uint8Array> {
  if (!record.manifest || !record.localPhotoUri) throw new Error('Für diesen älteren Nachweis ist kein vollständiges Beweispaket vorhanden.');
  const photo = new File(record.localPhotoUri);
  if (!photo.exists) throw new Error('Das lokal gespeicherte Originalfoto wurde nicht gefunden.');
  return createBundleZip({
    photoBytes: await photo.bytes(),
    photoExtension: extensionFromUri(record.localPhotoUri),
    manifest: record.manifest,
    verification: {
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
    },
  });
}

export async function shareEvidenceBundle(record: ProofRecord): Promise<void> {
  const bytes = await buildEvidenceBundle(record);
  const output = new File(Paths.cache, bundleFileName(record));
  if (output.exists) output.delete();
  output.write(bytes);
  if (!await Sharing.isAvailableAsync()) throw new Error('Teilen ist auf diesem Gerät nicht verfügbar.');
  await Sharing.shareAsync(output.uri, { mimeType: 'application/zip', dialogTitle: 'DoiProof-Beweispaket teilen' });
}
