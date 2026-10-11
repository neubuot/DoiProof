import { DEFAULT_INTERVAL_MS, SensorCollector } from '../core/sensors.mjs';

type Subscription = { remove(): void };
type Permission = { granted: boolean; canAskAgain?: boolean };
export type DeviceSensorLike = {
  isAvailableAsync(): Promise<boolean>;
  getPermissionsAsync(): Promise<Permission>;
  requestPermissionsAsync(): Promise<Permission>;
  setUpdateInterval(intervalMs: number): void;
  addListener(listener: (data: Record<string, unknown>) => void): Subscription;
};
export type HeadingSource = (listener: (heading: { magHeading: number; trueHeading: number; accuracy: number }) => void) => Promise<Subscription>;

export type SensorSession = {
  markCameraOpened(): void;
  markCameraReturned(): void;
  /** Wartet kurz auf erste Messwerte (höchstens `timeoutMs`). */
  warmUp(timeoutMs?: number): Promise<void>;
  /** Nimmt nach der Rückkehr aus der Kamera noch kurz Werte auf und liefert den Manifestblock. */
  finish(postCaptureMs?: number): Promise<Record<string, unknown>>;
  stop(): void;
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function unavailableReason(key: string, platform: string): string {
  if (key === 'light' && platform === 'ios') return 'iOS stellt Apps keinen Umgebungslichtsensor zur Verfügung.';
  if (key === 'barometer') return 'Kein Barometer auf diesem Gerät.';
  return 'Sensor auf diesem Gerät nicht vorhanden.';
}

/**
 * Startet die Sensorerfassung für eine Aufnahme: Beschleunigung, Gyroskop, Magnetometer,
 * Barometer, Licht (wo verfügbar) und Kompass. Nicht verfügbare oder verweigerte Sensoren werden
 * ausdrücklich mit Status und Begründung vermerkt.
 */
export async function startSensorSession(
  sensors: Record<string, DeviceSensorLike>,
  heading: HeadingSource,
  platform: string,
  now: () => number = () => Date.now(),
): Promise<SensorSession> {
  const collector = new SensorCollector({ now, intervalMs: DEFAULT_INTERVAL_MS, platform });
  const subscriptions: Subscription[] = [];
  const active: string[] = [];
  await Promise.all(Object.entries(sensors).map(async ([key, sensor]) => {
    try {
      if (!await sensor.isAvailableAsync()) { collector.setStatus(key, 'unavailable', unavailableReason(key, platform)); return; }
      let permission = await sensor.getPermissionsAsync();
      if (!permission.granted && permission.canAskAgain !== false) permission = await sensor.requestPermissionsAsync();
      if (!permission.granted) { collector.setStatus(key, 'permission_denied', 'Zugriff auf Bewegungs- und Fitnessdaten nicht erlaubt.'); return; }
      sensor.setUpdateInterval(DEFAULT_INTERVAL_MS);
      subscriptions.push(sensor.addListener(data => collector.add(key, data)));
      active.push(key);
    } catch (error) {
      collector.setStatus(key, 'error', error instanceof Error ? error.message.slice(0, 160) : 'Unbekannter Fehler.');
    }
  }));
  try {
    subscriptions.push(await heading(value => collector.add('compass', {
      magHeading: value.magHeading,
      trueHeading: value.trueHeading >= 0 ? value.trueHeading : null,
      accuracy: value.accuracy,
    })));
    active.push('compass');
  } catch (error) {
    collector.setStatus('compass', 'unavailable', error instanceof Error ? `Kompass nicht verfügbar: ${error.message.slice(0, 120)}` : 'Kompass nicht verfügbar.');
  }
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    for (const subscription of subscriptions) {
      try { subscription.remove(); } catch { /* Bereits entfernt. */ }
    }
  };
  return {
    markCameraOpened: () => collector.markCameraOpened(),
    markCameraReturned: () => collector.markCameraReturned(),
    async warmUp(timeoutMs = 1200) {
      const started = now();
      while (now() - started < timeoutMs && active.some(key => key !== 'compass' && key !== 'light' && collector.count(key) < 3)) await wait(100);
    },
    async finish(postCaptureMs = 1200) {
      if (active.length && !stopped) await wait(postCaptureMs);
      stop();
      return collector.toManifest();
    },
    stop,
  };
}
