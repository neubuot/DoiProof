import * as Location from 'expo-location';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';
import { VERSION } from '../core/version.mjs';
import buildInfo from './buildInfo.json';
import { buildManifestV3, sealManifest, type Evidence, type ImageDetails, type MetadataSettings } from './evidenceManifest';
import { appSha256 } from './platform';
import type { EvidenceManifest, LocationRecord, PreCaptureAnchors } from './proofRecord';
import { startDeviceSensorSession, type SensorSession } from './sensors';

export { LOCATION_SETTINGS, PRIVATE_SETTINGS } from './evidenceManifest';
export type { Evidence, ImageDetails, MetadataSettings } from './evidenceManifest';

export type CapturePreparation = {
  locationPermission: 'granted' | 'denied' | 'not_requested';
  sensors?: SensorSession;
};

const COMMIT = /^[0-9a-f]{40}$/;

/** App-Kennung als nicht attestierte Selbstauskunft (Version, Commit, Update-Kanal). */
export function appIdentity(): NonNullable<EvidenceManifest['app']> {
  const commit = process.env.EXPO_PUBLIC_SOURCE_COMMIT || buildInfo.sourceCommit || '';
  return {
    version: VERSION,
    ...(COMMIT.test(commit) ? { sourceCommit: commit } : {}),
    identification: 'self-reported-unattested',
    ...(Updates.isEnabled ? {
      update: {
        channel: Updates.channel ?? null,
        runtimeVersion: Updates.runtimeVersion ?? null,
        updateId: Updates.updateId ?? null,
        embedded: Updates.isEmbeddedLaunch,
      },
    } : {}),
  };
}

function deviceInfo(): NonNullable<EvidenceManifest['device']> {
  const constants = Platform.constants as unknown as Record<string, unknown>;
  const model = Platform.OS === 'android' && typeof constants.Model === 'string'
    ? `${typeof constants.Manufacturer === 'string' ? `${constants.Manufacturer} ` : ''}${constants.Model}`.slice(0, 80) : undefined;
  return { platform: Platform.OS, osVersion: Platform.Version, appVersion: VERSION, ...(model ? { model } : {}) };
}

/**
 * Vor dem Öffnen der Kamera: Standortfreigabe einholen und Sensoren starten. Eine verweigerte
 * Freigabe bricht die Aufnahme nicht mehr ab, sondern wird im Manifest vermerkt.
 */
export async function prepareCapture(settings: MetadataSettings, source: 'camera' | 'library'): Promise<CapturePreparation> {
  let locationPermission: CapturePreparation['locationPermission'] = 'not_requested';
  if (settings.includeLocation) {
    const permission = await Location.requestForegroundPermissionsAsync();
    locationPermission = permission.granted ? 'granted' : 'denied';
  }
  const sensors = settings.includeSensors && source === 'camera' ? await startDeviceSensorSession() : undefined;
  return { locationPermission, sensors };
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}

async function measureLocation(permission: CapturePreparation['locationPermission']): Promise<LocationRecord> {
  if (permission === 'not_requested') return { status: 'not_requested' };
  if (permission === 'denied') return { status: 'permission_denied', reason: 'Die Standortfreigabe wurde verweigert.' };
  try {
    const fix = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), 20000,
      'Kein Standort innerhalb von 20 Sekunden.');
    return {
      status: 'recorded',
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
  } catch (error) {
    return { status: 'unavailable', reason: error instanceof Error ? error.message.slice(0, 160) : 'Standort nicht verfügbar.' };
  }
}

export async function createEvidence(input: {
  photoSha256: string;
  source: 'camera' | 'library';
  capturedAt?: string;
  cameraOpenedAt?: string;
  image: ImageDetails;
  settings: MetadataSettings;
  preCapture?: PreCaptureAnchors;
  preparation: CapturePreparation;
}): Promise<Evidence> {
  const [location, sensors] = await Promise.all([
    measureLocation(input.preparation.locationPermission),
    input.preparation.sensors?.finish(),
  ]);
  const manifest = buildManifestV3({
    createdAt: new Date().toISOString(),
    settings: input.settings,
    photoSha256: input.photoSha256,
    image: input.image,
    source: input.source,
    capturedAt: input.capturedAt,
    cameraOpenedAt: input.cameraOpenedAt,
    preCapture: input.preCapture,
    app: appIdentity(),
    device: deviceInfo(),
    location,
    sensors,
  });
  return sealManifest(manifest, appSha256);
}
