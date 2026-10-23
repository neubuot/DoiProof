import { LOCATION_SETTINGS, type MetadataSettings, PRIVATE_SETTINGS } from './evidenceManifest';

/** Auswahl für den PDF-Prüfbericht. */
export type ReportSettings = {
  photo: boolean;
  location: boolean;
  map: boolean;
  online: boolean;
};

/** Dauerhafte Einstellungen der App (plattformneutral, ohne Datei-API; Speichern in settings.ts). */
export type AppSettings = {
  /** Nach der Aufnahme sofort verankern (öffentlich und dauerhaft auf der Blockchain). */
  autoSend: boolean;
  /** Vor dem Kamerastart aktuelle BTC- und Doichain-Blöcke binden. */
  usePreCaptureAnchors: boolean;
  /** Metadatenprofil der Aufnahme. */
  metadata: MetadataSettings;
  report: ReportSettings;
};

export const DEFAULT_SETTINGS: AppSettings = {
  autoSend: true,
  usePreCaptureAnchors: true,
  metadata: PRIVATE_SETTINGS,
  report: { photo: true, location: false, map: true, online: true },
};

const PROFILES = [PRIVATE_SETTINGS.profile, LOCATION_SETTINGS.profile, 'custom'];
const bool = (value: unknown, fallback: boolean): boolean => typeof value === 'boolean' ? value : fallback;
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

/**
 * Das Profil wird nur **vollständig** übernommen.
 *
 * Ein einzeln beschädigter Schalter darf nicht dazu führen, dass „Standort & Sensoren“
 * angezeigt wird, während keine Koordinaten erfasst werden: Die Aufnahme entstünde ohne
 * die Angaben, die sie laut Oberfläche enthält. „Privat“ ist der sichtbare, sichere Rückfall.
 */
function parseMetadata(value: unknown): MetadataSettings {
  const stored = record(value);
  if (!PROFILES.includes(stored.profile as MetadataSettings['profile'])) return PRIVATE_SETTINGS;
  const flags = ['includeLocation', 'includeImageDetails', 'includeDevice', 'includeSensors'] as const;
  if (flags.some(flag => typeof stored[flag] !== 'boolean')) return PRIVATE_SETTINGS;
  return {
    profile: stored.profile as MetadataSettings['profile'],
    includeLocation: stored.includeLocation as boolean,
    includeImageDetails: stored.includeImageDetails as boolean,
    includeDevice: stored.includeDevice as boolean,
    includeSensors: stored.includeSensors as boolean,
  };
}

/** Liest gespeicherte Einstellungen; Unbekanntes oder Beschädigtes fällt auf die Voreinstellung zurück. */
export function parseSettings(text: string): AppSettings {
  try {
    const stored = record(JSON.parse(text) as unknown);
    const report = record(stored.report);
    return {
      autoSend: bool(stored.autoSend, DEFAULT_SETTINGS.autoSend),
      usePreCaptureAnchors: bool(stored.usePreCaptureAnchors, DEFAULT_SETTINGS.usePreCaptureAnchors),
      metadata: parseMetadata(stored.metadata),
      report: {
        photo: bool(report.photo, DEFAULT_SETTINGS.report.photo),
        location: bool(report.location, DEFAULT_SETTINGS.report.location),
        map: bool(report.map, DEFAULT_SETTINGS.report.map),
        online: bool(report.online, DEFAULT_SETTINGS.report.online),
      },
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
