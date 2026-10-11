/**
 * Gemeinsamer Prüf- und Berichtsablauf für Kommandozeile, Windows-Prüfer und Handy-App.
 * Plattformabhängig sind nur die übergebenen Adapter: SHA-256, fetch, Schriften und Zeitzone.
 */
import { loadReportMap } from './map.mjs';
import { buildReportModel, mapCoordinates } from './report-model.mjs';
import { renderReportPdf } from './report-pdf.mjs';
import { analyzeBundle, checkOnline, localSummary } from './verify.mjs';
import { VERSION } from './version.mjs';

export { VERSION };

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
 * @typedef {{ state: 'not_requested'|'location_hidden'|'no_location'|'included'|'unavailable', reason?: string }} MapStatus
 */

/**
 * Lädt den Kartenausschnitt nur auf ausdrücklichen Wunsch und nur, wenn der Standort im Bericht
 * erscheint und das Paket lokal bestanden hat. Fehler verhindern den Bericht nicht.
 * @param {{ analysis: import('./verify.mjs').BundleAnalysis, includeLocation?: boolean, includeMap?: boolean, mapLoader?: import('./map.mjs').TileLoader, generatedAt?: Date }} input
 * @returns {Promise<{ status: MapStatus, map: import('./map.mjs').LoadedMap | { error: string } | null }>}
 */
export async function prepareReportMap(input) {
  if (!input.includeMap) return { status: { state: 'not_requested' }, map: null };
  if (input.includeLocation === false) return { status: { state: 'location_hidden' }, map: null };
  const coordinates = mapCoordinates(input.analysis);
  if (!coordinates) return { status: { state: 'no_location' }, map: null };
  try {
    if (!input.mapLoader) throw new Error('Kein Kartendienst eingerichtet.');
    const map = await loadReportMap(coordinates.latitude, coordinates.longitude, { ...input.mapLoader, now: () => input.generatedAt ?? new Date() });
    return { status: { state: 'included' }, map };
  } catch (error) {
    const text = error instanceof Error ? error.message.slice(0, 160).trim() : '';
    const reason = !text ? 'Kartendienst nicht erreichbar.' : /[.!?]$/.test(text) ? text : `${text}.`;
    return { status: { state: 'unavailable', reason }, map: { error: reason } };
  }
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
 *   includeMap?: boolean,
 *   mapLoader?: import('./map.mjs').TileLoader,
 *   producer: string,
 * }} input
 */
export async function createPdfReport(input) {
  const generatedAt = input.generatedAt ?? new Date();
  const prepared = await prepareReportMap({ ...input, generatedAt });
  const model = buildReportModel({
    analysis: input.analysis, online: input.online ?? null, fileName: input.fileName,
    generatedAt, timeZone: input.timeZone,
    includePhoto: input.includePhoto, includeLocation: input.includeLocation, map: prepared.map, producer: input.producer,
  });
  /** @type {string | null} */
  let embedError = null;
  const pdf = await renderReportPdf(model, { fonts: input.fonts, onMapError: reason => { embedError = reason; } });
  /** @type {MapStatus} */
  const mapStatus = embedError ? { state: 'unavailable', reason: embedError } : prepared.status;
  return { pdf, model, mapStatus };
}

/** Dateiname für den PDF-Bericht. @param {{ evidenceSha256: string | null, zipSha256: string }} meta */
export function pdfFileName(meta) {
  return `DoiProof-Pruefbericht-${(meta.evidenceSha256 ?? meta.zipSha256).slice(0, 12)}.pdf`;
}
