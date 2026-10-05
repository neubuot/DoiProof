/**
 * Prüf- und Berichtslogik des Windows-Prüfers. Nutzt unverändert den gemeinsamen Kern aus core/
 * (beim Build nach desktop/core kopiert) und die eingebetteten Schriften aus desktop/fonts.
 */
import { readFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFonts, nodeSha256 } from './core/node.mjs';
import { createPdfReport, pdfFileName, verifyPackage, VERSION } from './core/pipeline.mjs';
import { reportText } from './core/report-text.mjs';
import { systemTimeZone } from './core/format.mjs';

export const FONT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fonts');
export { reportText, VERSION };

/**
 * Prüft eine ZIP-Datei und liefert das vollständige Ergebnis (für den Hauptprozess) sowie eine
 * Zusammenfassung ohne Foto und Manifestinhalte (für die Oberfläche).
 * @param {string} path
 * @param {boolean} online
 * @param {{ fetchImpl?: typeof fetch, now?: () => Date }} [options]
 */
export async function verifyForDesktop(path, online, options = {}) {
  const bytes = new Uint8Array(await readFile(path));
  const now = options.now ?? (() => new Date());
  const result = await verifyPackage(bytes, { sha256: nodeSha256, online, fetchImpl: options.fetchImpl, now });
  const generatedAtUtc = now().toISOString();
  return {
    full: { ...result, path: resolve(path), generatedAtUtc },
    summary: {
      ok: result.analysis.ok,
      error: result.analysis.error,
      failedStep: result.analysis.failedStep,
      steps: result.analysis.steps,
      generatedAtUtc,
      file: resolve(path),
      zipSha256: result.analysis.zip.sha256,
      local: result.local,
      online: result.online,
    },
  };
}

/**
 * Erzeugt den PDF-Bericht aus dem zwischengespeicherten Prüfergebnis. Die Datei wird erneut
 * gehasht; hat sie sich seit der Prüfung geändert, wird kein Bericht erzeugt.
 * @param {Awaited<ReturnType<typeof verifyForDesktop>>['full']} cached
 * @param {{ includePhoto?: boolean, includeLocation?: boolean, now?: () => Date }} [options]
 */
export async function createDesktopPdf(cached, options = {}) {
  const current = await nodeSha256(new Uint8Array(await readFile(cached.path)));
  if (current !== cached.analysis.zip.sha256) throw new Error('Die ZIP-Datei hat sich seit der Prüfung geändert. Bitte erneut prüfen.');
  return createPdfReport({
    analysis: cached.analysis, online: cached.online, fileName: basename(cached.path),
    fonts: await loadFonts(FONT_DIR), generatedAt: options.now?.() ?? new Date(), timeZone: systemTimeZone(),
    includePhoto: options.includePhoto, includeLocation: options.includeLocation,
    producer: `DoiProof-Prüfer ${VERSION} (Windows)`,
  });
}

/** @param {Awaited<ReturnType<typeof verifyForDesktop>>['full']} cached */
export function defaultReportName(cached) {
  return pdfFileName({ evidenceSha256: cached.analysis.hashes.evidenceSha256, zipSha256: cached.analysis.zip.sha256 });
}

/** Markdown-Kurzbericht (nur bei bestandener lokaler Prüfung). @param {Awaited<ReturnType<typeof verifyForDesktop>>['summary']} summary */
export function markdownReport(summary) {
  if (!summary.local) throw new Error('Markdown und JSON gibt es nur nach bestandener lokaler Prüfung. Bitte den PDF-Bericht wählen.');
  return reportText({ generatedAtUtc: summary.generatedAtUtc, file: summary.file, local: summary.local, online: summary.online });
}
