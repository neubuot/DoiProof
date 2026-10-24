/**
 * Gemeinsamer Prüf- und Berichtsablauf für Kommandozeile, Windows-Prüfer und Handy-App.
 * Plattformabhängig sind nur die übergebenen Adapter: SHA-256, fetch, Schriften und Zeitzone.
 */
import { loadReportMap } from './map.mjs';
import { evaluatePlausibility, loadReferences } from './plausibility.mjs';
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
 * @typedef {{ state: 'not_requested'|'location_hidden'|'not_passed'|'included'|'unavailable', reason?: string }} PlausibilityStatus
 */

/**
 * Lädt Referenzdaten und bewertet die versiegelten Sensorwerte nur auf ausdrücklichen Wunsch, nur bei
 * eingeblendetem Standort und nur für ein lokal bestandenes Paket. Die Zeitanker stammen aus der
 * Kettenabfrage; fehlt sie, wird sie hier nachgeholt. Fehler verhindern den Bericht nicht.
 * @param {{
 *   analysis: import('./verify.mjs').BundleAnalysis,
 *   online?: import('./verify.mjs').OnlineResult | null,
 *   includeLocation?: boolean,
 *   includePlausibility?: boolean,
 *   plausibilityLoader?: import('./plausibility.mjs').ReferenceLoader,
 *   generatedAt?: Date,
 * }} input
 * @returns {Promise<{ status: PlausibilityStatus, plausibility: import('./plausibility.mjs').PlausibilityResult | null, online: import('./verify.mjs').OnlineResult | null }>}
 */
export async function preparePlausibility(input) {
  let online = input.online ?? null;
  if (!input.includePlausibility) return { status: { state: 'not_requested' }, plausibility: null, online };
  if (input.includeLocation === false) return { status: { state: 'location_hidden' }, plausibility: null, online };
  if (!input.analysis.ok) return { status: { state: 'not_passed' }, plausibility: null, online };
  try {
    const loader = input.plausibilityLoader;
    if (!loader) throw new Error('Kein Referenzdienst eingerichtet.');
    const now = loader.now ?? (() => input.generatedAt ?? new Date());
    if (!online) online = await checkOnline(localSummary(input.analysis), { fetchImpl: loader.fetchImpl, timeoutMs: loader.timeoutMs, now });
    const capture = input.analysis.manifest?.capture;
    const deviceTime = capture && typeof capture.deviceTime === 'string' && Number.isFinite(Date.parse(capture.deviceTime)) ? new Date(Date.parse(capture.deviceTime)) : null;
    const references = await loadReferences({ coordinates: mapCoordinates(input.analysis), captureTime: deviceTime }, { ...loader, now });
    const plausibility = evaluatePlausibility({ analysis: input.analysis, online, references, generatedAt: input.generatedAt });
    return { status: { state: 'included' }, plausibility, online };
  } catch (error) {
    const text = error instanceof Error ? error.message.slice(0, 160).trim() : '';
    const reason = !text ? 'Plausibilitätsprüfung nicht möglich.' : /[.!?]$/.test(text) ? text : `${text}.`;
    return { status: { state: 'unavailable', reason }, plausibility: null, online };
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
 *   includePlausibility?: boolean,
 *   plausibilityLoader?: import('./plausibility.mjs').ReferenceLoader,
 *   plausibility?: import('./plausibility.mjs').PlausibilityResult | null,
 *   producer: string,
 * }} input  plausibility: bereits berechnetes Ergebnis (dann keine neue Abfrage)
 */
export async function createPdfReport(input) {
  const generatedAt = input.generatedAt ?? new Date();
  const prepared = await prepareReportMap({ ...input, generatedAt });
  const checked = input.plausibility !== undefined
    ? { status: /** @type {PlausibilityStatus} */ ({ state: input.plausibility ? 'included' : 'not_requested' }), plausibility: input.plausibility, online: input.online ?? null }
    : await preparePlausibility({ ...input, generatedAt });
  const model = buildReportModel({
    analysis: input.analysis, online: checked.online, fileName: input.fileName,
    generatedAt, timeZone: input.timeZone,
    includePhoto: input.includePhoto, includeLocation: input.includeLocation, map: prepared.map, producer: input.producer,
    plausibility: checked.plausibility,
  });
  /** @type {string | null} */
  let embedError = null;
  const pdf = await renderReportPdf(model, { fonts: input.fonts, onMapError: reason => { embedError = reason; } });
  /** @type {MapStatus} */
  const mapStatus = embedError ? { state: 'unavailable', reason: embedError } : prepared.status;
  return { pdf, model, mapStatus, plausibilityStatus: checked.status, plausibility: checked.plausibility, online: checked.online };
}

/** Dateiname für den PDF-Bericht. @param {{ evidenceSha256: string | null, zipSha256: string }} meta */
export function pdfFileName(meta) {
  return `DoiProof-Pruefbericht-${(meta.evidenceSha256 ?? meta.zipSha256).slice(0, 12)}.pdf`;
}
