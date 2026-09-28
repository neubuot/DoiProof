import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { EvidenceManifest, EvidenceProfile, PreCaptureAnchors } from './proofRecord';
import { isValidPreCaptureAnchors } from './chainAnchors';

export type MetadataSettings = {
  profile: EvidenceProfile;
  includeLocation: boolean;
  includeImageDetails: boolean;
  includeDevice: boolean;
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
  profile: 'private', includeLocation: false, includeImageDetails: false, includeDevice: false,
};

export const LOCATION_SETTINGS: MetadataSettings = {
  profile: 'location', includeLocation: true, includeImageDetails: true, includeDevice: true,
};

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

async function sha256Text(value: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
}

export async function createEvidence(
  photoSha256: string,
  source: 'camera' | 'library',
  capturedAt: string | undefined,
  image: ImageDetails,
  settings: MetadataSettings,
  preCapture?: PreCaptureAnchors,
): Promise<Evidence> {
  if (source === 'camera' && preCapture && !isValidPreCaptureAnchors(preCapture)) {
    throw new Error('Vorab-Blöcke sind ungültig.');
  }
  let location: EvidenceManifest['location'];
  if (settings.includeLocation) {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) throw new Error('Standortzugriff wurde nicht erlaubt. Bitte Profil „Privat“ wählen oder den Zugriff erlauben.');
    const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    location = {
      latitude: fix.coords.latitude,
      longitude: fix.coords.longitude,
      altitude: fix.coords.altitude,
      accuracy: fix.coords.accuracy,
      altitudeAccuracy: fix.coords.altitudeAccuracy,
      heading: fix.coords.heading,
      speed: fix.coords.speed,
      measuredAt: new Date(fix.timestamp).toISOString(),
      mocked: fix.mocked,
    };
  }
  const manifest: EvidenceManifest = {
    schema: 'org.doichain.doiproof.evidence/v2',
    createdAt: new Date().toISOString(),
    profile: settings.profile,
    preCapture: source === 'camera' ? preCapture : undefined,
    app: {
      version: '0.4.0',
      ...(process.env.EXPO_PUBLIC_SOURCE_COMMIT && /^[0-9a-f]{40}$/.test(process.env.EXPO_PUBLIC_SOURCE_COMMIT)
        ? { sourceCommit: process.env.EXPO_PUBLIC_SOURCE_COMMIT } : {}),
      identification: 'self-reported-unattested',
    },
    photo: {
      sha256: photoSha256,
      ...(settings.includeImageDetails ? image : {}),
    },
    capture: { deviceTime: capturedAt, source },
    location,
    device: settings.includeDevice ? {
      platform: Platform.OS,
      osVersion: Platform.Version,
      appVersion: '0.4.0',
    } : undefined,
  };
  const manifestSha256 = await sha256Text(canonicalJson(manifest));
  const evidenceSha256 = await sha256Text(`DoiProof:v2\nphoto:${photoSha256}\nmanifest:${manifestSha256}`);
  return { manifest, manifestSha256, evidenceSha256 };
}
