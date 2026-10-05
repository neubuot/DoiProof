/**
 * Gemeinsamer Prüf- und Berichtsablauf für Kommandozeile, Windows-Prüfer und Handy-App.
 * Plattformabhängig sind nur die übergebenen Adapter: SHA-256, fetch, Schriften und Zeitzone.
 */
import { buildReportModel } from './report-model.mjs';
import { renderReportPdf } from './report-pdf.mjs';
import { analyzeBundle, checkOnline, localSummary } from './verify.mjs';

export const VERSION = '1.0.0';

/**
 * @param {Uint8Array} zipBytes
 * @param {{ sha256: import('./util.mjs').Sha256, online?: boolean, fetchImpl?: typeof fetch, timeoutMs?: number, now?: () => Date }} options
 */
export async function verifyPackage(zipBytes, options) {
  const analysis = await analyzeBundle(zipBytes, { sha256: options.sha256 });
  const local = analysis.ok ? localSummary(analysis) : null;
  const online = options.online && local
    ? await checkOnline(local, { fetchImpl: options.fetchImpl, timeoutMs: options.timeoutMs, now: options.now })
    : null;
  return { analysis, local, online };
}

/**
 * @param {{
 *   analysis: import('./verify.mjs').BundleAnalysis,
 *   online?: import('./verify.mjs').OnlineResult | null,
 *   fileName: string,
 *   fonts: import('./report-pdf.mjs').FontBytes,
 *   generatedAt?: Date,
 *   timeZone?: import('./format.mjs').TimeZone,
 *   includePhoto?: boolean,
 *   includeLocation?: boolean,
 *   producer: string,
 * }} input
 */
export async function createPdfReport(input) {
  const model = buildReportModel({
    analysis: input.analysis, online: input.online ?? null, fileName: input.fileName,
    generatedAt: input.generatedAt, timeZone: input.timeZone,
    includePhoto: input.includePhoto, includeLocation: input.includeLocation, producer: input.producer,
  });
  const pdf = await renderReportPdf(model, { fonts: input.fonts });
  return { pdf, model };
}

/** Dateiname für den PDF-Bericht. @param {{ evidenceSha256: string | null, zipSha256: string }} meta */
export function pdfFileName(meta) {
  return `DoiProof-Pruefbericht-${(meta.evidenceSha256 ?? meta.zipSha256).slice(0, 12)}.pdf`;
}
