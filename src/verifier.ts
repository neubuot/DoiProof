import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { systemTimeZone } from '../core/format.mjs';
import { createPdfReport, pdfFileName, verifyPackage, VERSION } from '../core/pipeline.mjs';
import { LIMITS } from '../core/verify.mjs';
import { appSha256, loadReportFonts } from './platform';

export type PickedZip = { name: string; size: number; bytes: Uint8Array };
export type VerificationResult = Awaited<ReturnType<typeof verifyPackage>> & { fileName: string; checkedAt: string };

/** ZIP-Beweispaket über den Systemdialog wählen (eigenes oder fremdes Paket). */
export async function pickZip(): Promise<PickedZip | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled || !picked.assets?.[0]) return null;
  const asset = picked.assets[0];
  if (asset.size !== undefined && asset.size > LIMITS.zip) throw new Error('Das ZIP ist größer als 200 MiB und wird nicht geprüft.');
  const file = new File(asset.uri);
  const bytes = await file.bytes();
  if (bytes.length > LIMITS.zip) throw new Error('Das ZIP ist größer als 200 MiB und wird nicht geprüft.');
  return { name: asset.name || 'Beweispaket.zip', size: bytes.length, bytes };
}

/** Dieselbe Prüfung wie scripts/verify.mjs: offline, auf Wunsch mit Online-Abgleich. */
export async function verifyZip(bytes: Uint8Array, fileName: string, online: boolean): Promise<VerificationResult> {
  const result = await verifyPackage(bytes, { sha256: appSha256, online });
  return { ...result, fileName, checkedAt: new Date().toISOString() };
}

/** Erzeugt den PDF-Prüfbericht mit dem gemeinsamen Berichtskern und öffnet den Teilen-Dialog. */
export async function shareReport(result: VerificationResult, options: { includePhoto: boolean; includeLocation: boolean }): Promise<string> {
  const { pdf, model } = await createPdfReport({
    analysis: result.analysis,
    online: result.online,
    fileName: result.fileName,
    fonts: await loadReportFonts(),
    timeZone: systemTimeZone(),
    includePhoto: options.includePhoto,
    includeLocation: options.includeLocation,
    producer: `DoiProof ${VERSION} (App)`,
  });
  const directory = new Directory(Paths.document, 'reports');
  if (!directory.exists) directory.create({ idempotent: true, intermediates: true });
  const name = pdfFileName(model.meta).replace(/\.pdf$/, `-${Date.now()}.pdf`);
  const output = new File(directory, name);
  output.write(pdf);
  if (!await Sharing.isAvailableAsync()) throw new Error('PDF wurde lokal gespeichert, aber der Teilen-Dialog ist auf diesem Gerät nicht verfügbar.');
  await Sharing.shareAsync(output.uri, { mimeType: 'application/pdf', dialogTitle: 'DoiProof-Prüfbericht teilen', UTI: 'com.adobe.pdf' });
  return output.uri;
}
