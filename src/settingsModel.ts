import { EvidenceProfile } from './proofRecord';

export type MetadataSettings = {
  profile: EvidenceProfile;
  includeLocation: boolean;
  includeImageDetails: boolean;
  includeDevice: boolean;
};

export const PRIVATE_SETTINGS: MetadataSettings = {
  profile: 'private', includeLocation: false, includeImageDetails: false, includeDevice: false,
};

export const LOCATION_SETTINGS: MetadataSettings = {
  profile: 'location', includeLocation: true, includeImageDetails: true, includeDevice: true,
};

/**
 * Dauerhaft gesicherte Vorgaben.
 *
 * Der API-Schlüssel gehört bewusst **nicht** hierher. Er bleibt flüchtig im Speicher der
 * laufenden Sitzung, wie es die Oberfläche und die Datenschutzerklärung zusagen.
 */
export type StoredSettings = {
  metadata: MetadataSettings;
  autoSend: boolean;
  usePreCaptureAnchors: boolean;
  includeSensitiveInPdf: boolean;
};

export const DEFAULT_SETTINGS: StoredSettings = {
  metadata: PRIVATE_SETTINGS,
  autoSend: true,
  usePreCaptureAnchors: true,
  includeSensitiveInPdf: false,
};

const PROFILES: readonly EvidenceProfile[] = ['private', 'location', 'custom'];
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

function isMetadataSettings(value: unknown): value is MetadataSettings {
  if (!value || typeof value !== 'object') return false;
  const metadata = value as Partial<MetadataSettings>;
  return PROFILES.includes(metadata.profile as EvidenceProfile)
    && isBoolean(metadata.includeLocation)
    && isBoolean(metadata.includeImageDetails)
    && isBoolean(metadata.includeDevice);
}

/**
 * Liest gespeicherte Vorgaben und fällt bei jeder Abweichung vollständig auf die
 * Vorgabewerte zurück.
 *
 * Ein teilweise übernommener Stand wäre die gefährlichere Variante: Das Profil entscheidet
 * darüber, ob eine Aufnahme Standortdaten bindet. Sichtbar auf „Privat“ zu stehen ist besser,
 * als unbemerkt mit einer Mischung aus beschädigten und voreingestellten Werten zu arbeiten.
 */
export function parseSettings(value: unknown): StoredSettings {
  if (!value || typeof value !== 'object') return DEFAULT_SETTINGS;
  const stored = value as Partial<StoredSettings>;
  if (!isMetadataSettings(stored.metadata) || !isBoolean(stored.autoSend)
    || !isBoolean(stored.usePreCaptureAnchors) || !isBoolean(stored.includeSensitiveInPdf)) {
    return DEFAULT_SETTINGS;
  }
  return {
    metadata: {
      profile: stored.metadata.profile,
      includeLocation: stored.metadata.includeLocation,
      includeImageDetails: stored.metadata.includeImageDetails,
      includeDevice: stored.metadata.includeDevice,
    },
    autoSend: stored.autoSend,
    usePreCaptureAnchors: stored.usePreCaptureAnchors,
    includeSensitiveInPdf: stored.includeSensitiveInPdf,
  };
}
