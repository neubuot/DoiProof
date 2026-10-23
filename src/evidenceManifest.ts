import { computeEvidence } from '../core/manifest.mjs';
import { notRequestedSensors } from '../core/sensors.mjs';
import type { Sha256 } from '../core/util.mjs';
import { isValidPreCaptureAnchors } from './chainAnchors';
import type { EvidenceManifest, EvidenceProfile, LocationRecord, PreCaptureAnchors } from './proofRecord';

export type MetadataSettings = {
  profile: EvidenceProfile;
  includeLocation: boolean;
  includeImageDetails: boolean;
  includeDevice: boolean;
  includeSensors: boolean;
};

export type ImageDetails = {
  width?: number;
  height?: number;
  fileSize?: number;
  mimeType?: string;
  fileName?: string;
};

export type Evidence = {
  manifest: EvidenceManifest;
  manifestSha256: string;
  evidenceSha256: string;
};

export const PRIVATE_SETTINGS: MetadataSettings = {
  profile: 'private', includeLocation: false, includeImageDetails: false, includeDevice: false, includeSensors: false,
};

export const LOCATION_SETTINGS: MetadataSettings = {
  profile: 'location', includeLocation: true, includeImageDetails: true, includeDevice: true, includeSensors: true,
};

export type ManifestInput = {
  createdAt: string;
  settings: MetadataSettings;
  photoSha256: string;
  image: ImageDetails;
  source: 'camera' | 'library';
  capturedAt?: string;
  cameraOpenedAt?: string;
  preCapture?: PreCaptureAnchors;
  app: NonNullable<EvidenceManifest['app']>;
  device: NonNullable<EvidenceManifest['device']>;
  location: LocationRecord;
  sensors?: Record<string, unknown>;
};

/** Baut ein Manifest v3. Rein und deterministisch, damit es ohne Gerät testbar ist. */
export function buildManifestV3(input: ManifestInput): EvidenceManifest {
  if (input.preCapture && (input.source !== 'camera' || !isValidPreCaptureAnchors(input.preCapture))) {
    throw new Error('Vorab-Blöcke sind ungültig.');
  }
  const { settings } = input;
  const sensors = settings.includeSensors && input.sensors ? input.sensors
    : notRequestedSensors();
  if (settings.includeSensors && input.source === 'library') {
    for (const record of Object.values(sensors)) {
      if (record && typeof record === 'object' && (record as { status?: string }).status === 'not_requested') {
        (record as { reason?: string }).reason = 'Sensoren werden nur bei einer Kameraaufnahme der App erfasst.';
      }
    }
  }
  return {
    schema: 'org.doichain.doiproof.evidence/v3',
    createdAt: input.createdAt,
    profile: settings.profile,
    preCapture: input.source === 'camera' ? input.preCapture : undefined,
    app: input.app,
    photo: { sha256: input.photoSha256, ...(settings.includeImageDetails ? input.image : {}) },
    capture: { source: input.source, deviceTime: input.capturedAt, cameraOpenedAt: input.cameraOpenedAt },
    location: settings.includeLocation ? input.location : { status: 'not_requested' },
    sensors,
    device: settings.includeDevice ? input.device : undefined,
  };
}

/** Manifest-Hash und Paket-Hash nach dem gemeinsamen Verfahren (core/manifest.mjs). */
export async function sealManifest(manifest: EvidenceManifest, sha256: Sha256): Promise<Evidence> {
  const { manifestSha256, evidenceSha256 } = await computeEvidence(manifest, sha256);
  return { manifest, manifestSha256, evidenceSha256 };
}
