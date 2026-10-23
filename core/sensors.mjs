/**
 * Sensorblock des Manifests v3: Definitionen, plattformneutrale Erfassungslogik, Prüfung und
 * Statistik. Die App speist Messwerte aus expo-sensors/expo-location ein; Tests und Prüfer nutzen
 * dieselben Regeln.
 */
import { isIsoTime, isPlainObject } from './util.mjs';

/**
 * @typedef {'recorded'|'not_requested'|'unavailable'|'permission_denied'|'no_data'|'error'} SensorStatus
 * @typedef {{ at: string, [field: string]: number | null | string }} SensorSample
 * @typedef {{
 *   status: SensorStatus,
 *   source?: string,
 *   units?: Record<string, string>,
 *   reason?: string,
 *   received?: number,
 *   reading?: SensorSample,
 *   series?: SensorSample[],
 * }} SensorRecord
 * @typedef {{
 *   label: string,
 *   group: 'motion'|'magnetic'|'pressure'|'light',
 *   source: string,
 *   fields: string[],
 *   units: Record<string, string>,
 *   names: Record<string, string>,
 * }} SensorDefinition
 */

/** @type {Record<string, SensorDefinition>} */
export const SENSORS = {
  accelerometer: {
    label: 'Beschleunigungssensor', group: 'motion', source: 'expo-sensors Accelerometer',
    fields: ['x', 'y', 'z'], units: { x: 'g', y: 'g', z: 'g' },
    names: { x: 'Beschleunigung x', y: 'Beschleunigung y', z: 'Beschleunigung z' },
  },
  gyroscope: {
    label: 'Gyroskop', group: 'motion', source: 'expo-sensors Gyroscope',
    fields: ['x', 'y', 'z'], units: { x: 'rad/s', y: 'rad/s', z: 'rad/s' },
    names: { x: 'Drehrate x', y: 'Drehrate y', z: 'Drehrate z' },
  },
  magnetometer: {
    label: 'Magnetometer', group: 'magnetic', source: 'expo-sensors Magnetometer',
    fields: ['x', 'y', 'z'], units: { x: 'µT', y: 'µT', z: 'µT' },
    names: { x: 'Magnetfeld x', y: 'Magnetfeld y', z: 'Magnetfeld z' },
  },
  compass: {
    label: 'Kompass', group: 'magnetic', source: 'expo-location Heading',
    fields: ['magHeading', 'trueHeading', 'accuracy'], units: { magHeading: '°', trueHeading: '°', accuracy: 'Stufe 0–3' },
    names: { magHeading: 'Richtung (magnetisch Nord)', trueHeading: 'Richtung (geografisch Nord)', accuracy: 'Kalibrierung' },
  },
  barometer: {
    label: 'Barometer', group: 'pressure', source: 'expo-sensors Barometer',
    fields: ['pressure', 'relativeAltitude'], units: { pressure: 'hPa', relativeAltitude: 'm' },
    names: { pressure: 'Luftdruck', relativeAltitude: 'Relative Höhe (Gerät)' },
  },
  light: {
    label: 'Lichtsensor', group: 'light', source: 'expo-sensors LightSensor',
    fields: ['illuminance'], units: { illuminance: 'lx' },
    names: { illuminance: 'Beleuchtungsstärke' },
  },
};

export const SENSOR_KEYS = /** @type {const} */ (['accelerometer', 'gyroscope', 'magnetometer', 'compass', 'barometer', 'light']);
export const SENSOR_STATUSES = ['recorded', 'not_requested', 'unavailable', 'permission_denied', 'no_data', 'error'];
export const STATUS_TEXT = {
  recorded: 'erfasst',
  not_requested: 'nicht erfasst – im Profil nicht angefordert',
  unavailable: 'nicht verfügbar',
  permission_denied: 'Berechtigung verweigert',
  no_data: 'keine Messwerte im Messfenster',
  error: 'Fehler bei der Erfassung',
};
export const DEFAULT_INTERVAL_MS = 200;
export const MAX_PRE = 10;
export const MAX_DURING = 10;
export const MAX_POST = 10;
const MAX_SERIES = MAX_PRE + MAX_DURING + MAX_POST;

/** @param {unknown} value */
export function roundSensorValue(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const rounded = Math.round(value * 1e6) / 1e6;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Plattformneutrale Erfassung: sammelt Messwerte je Sensor und baut den Manifestblock.
 * Phasen: vor dem Öffnen der Kamera, während die Kamera geöffnet ist, nach der Rückkehr.
 */
export class SensorCollector {
  /** @param {{ now?: () => number, intervalMs?: number, platform?: string }} [options] */
  constructor(options = {}) {
    this.now = options.now ?? (() => Date.now());
    this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.platform = options.platform;
    this.startedAt = this.now();
    /** @type {number | undefined} */ this.cameraOpenedAt = undefined;
    /** @type {number | undefined} */ this.cameraReturnedAt = undefined;
    /** @type {Record<string, { status?: SensorStatus, reason?: string, pre: SensorSample[], during: SensorSample[], post: SensorSample[], received: number }>} */
    this.state = {};
    for (const key of SENSOR_KEYS) this.state[key] = { pre: [], during: [], post: [], received: 0 };
  }

  /** @param {string} key @param {SensorStatus} status @param {string} [reason] */
  setStatus(key, status, reason) {
    const entry = this.state[key];
    if (!entry) return;
    entry.status = status;
    entry.reason = reason;
  }

  /** @param {string} key */
  count(key) { return this.state[key]?.received ?? 0; }

  /**
   * @param {string} key
   * @param {Record<string, unknown>} values
   * @param {number} [atMs]
   */
  add(key, values, atMs = this.now()) {
    const entry = this.state[key];
    const definition = SENSORS[key];
    if (!entry || !definition) return;
    /** @type {SensorSample} */
    const sample = { at: new Date(atMs).toISOString() };
    let any = false;
    for (const field of definition.fields) {
      if (values[field] === undefined) continue;
      const rounded = roundSensorValue(values[field]);
      sample[field] = rounded;
      if (rounded !== null) any = true;
    }
    if (!any) return;
    entry.received++;
    if (this.cameraOpenedAt === undefined || atMs < this.cameraOpenedAt) {
      entry.pre.push(sample);
      if (entry.pre.length > MAX_PRE) entry.pre.shift();
    } else if (this.cameraReturnedAt === undefined || atMs < this.cameraReturnedAt) {
      entry.during.push(sample);
      if (entry.during.length > MAX_DURING) entry.during.shift();
    } else if (entry.post.length < MAX_POST) entry.post.push(sample);
  }

  /** @param {number} [atMs] */
  markCameraOpened(atMs = this.now()) { this.cameraOpenedAt = atMs; }
  /** @param {number} [atMs] */
  markCameraReturned(atMs = this.now()) { this.cameraReturnedAt = atMs; }

  /**
   * @param {number} [endedAt]
   * @returns {Record<string, any>}
   */
  toManifest(endedAt = this.now()) {
    /** @type {Record<string, any>} */
    const block = {
      window: {
        startedAt: new Date(this.startedAt).toISOString(),
        cameraOpenedAt: this.cameraOpenedAt === undefined ? undefined : new Date(this.cameraOpenedAt).toISOString(),
        cameraReturnedAt: this.cameraReturnedAt === undefined ? undefined : new Date(this.cameraReturnedAt).toISOString(),
        endedAt: new Date(endedAt).toISOString(),
        intervalMs: this.intervalMs,
        platform: this.platform,
      },
    };
    const reference = this.cameraReturnedAt ?? endedAt;
    for (const key of SENSOR_KEYS) {
      const entry = this.state[key];
      const definition = SENSORS[key];
      const series = [...entry.pre, ...entry.during, ...entry.post];
      /** @type {SensorRecord} */
      let record;
      if (series.length) {
        let reading = series[0];
        for (const sample of series) {
          if (Math.abs(Date.parse(sample.at) - reference) < Math.abs(Date.parse(reading.at) - reference)) reading = sample;
        }
        record = { status: 'recorded', source: definition.source, units: definition.units, received: entry.received, reading, series };
      } else {
        const status = entry.status && entry.status !== 'recorded' ? entry.status : 'no_data';
        record = { status, source: definition.source, reason: entry.reason ?? defaultReason(status) };
      }
      block[key] = record;
    }
    return block;
  }
}

/** @param {SensorStatus} status */
function defaultReason(status) {
  if (status === 'no_data') return 'Der Sensor lieferte im Messfenster keinen Wert.';
  if (status === 'not_requested') return 'Im gewählten Metadatenprofil nicht angefordert.';
  return STATUS_TEXT[status];
}

/** Sensorblock für ein Profil ohne Sensorerfassung. */
export function notRequestedSensors() {
  /** @type {Record<string, any>} */
  const block = {};
  for (const key of SENSOR_KEYS) {
    block[key] = { status: 'not_requested', source: SENSORS[key].source, reason: defaultReason('not_requested') };
  }
  return block;
}

/** @param {unknown} sample @param {SensorDefinition} definition */
function validSample(sample, definition) {
  if (!isPlainObject(sample) || !isIsoTime(sample.at)) return false;
  let any = false;
  for (const [field, value] of Object.entries(sample)) {
    if (field === 'at') continue;
    if (!definition.fields.includes(field)) return false;
    if (value !== null && (typeof value !== 'number' || !Number.isFinite(value))) return false;
    if (value !== null) any = true;
  }
  return any;
}

/**
 * Strukturprüfung des Sensorblocks. Liefert eine Fehlermeldung oder null.
 * @param {unknown} sensors
 */
export function validateSensors(sensors) {
  if (!isPlainObject(sensors)) return 'Sensorblock ist kein Objekt.';
  for (const [key, record] of Object.entries(sensors)) {
    if (key === 'window') {
      if (!isPlainObject(record)) return 'Sensor-Messfenster ist ungültig.';
      for (const name of ['startedAt', 'cameraOpenedAt', 'cameraReturnedAt', 'endedAt']) {
        if (record[name] !== undefined && !isIsoTime(record[name])) return `Ungültige Zeit im Sensor-Messfenster: ${name}`;
      }
      continue;
    }
    const definition = SENSORS[key];
    if (!definition) return `Unbekannter Sensor im Manifest: ${key}`;
    if (!isPlainObject(record) || !SENSOR_STATUSES.includes(record.status)) return `Ungültiger Sensorstatus: ${key}`;
    if (record.status === 'recorded') {
      if (!validSample(record.reading, definition)) return `Ungültiger Einzelwert: ${key}`;
      if (!Array.isArray(record.series) || record.series.length === 0 || record.series.length > MAX_SERIES
        || !record.series.every(sample => validSample(sample, definition))) {
        return `Ungültige Messreihe: ${key}`;
      }
    } else if (record.reading !== undefined || record.series !== undefined) {
      return `Sensor ohne Erfassung enthält Messwerte: ${key}`;
    }
  }
  for (const key of SENSOR_KEYS) if (!(key in sensors)) return `Sensor fehlt im Manifest v3: ${key}`;
  return null;
}

/**
 * Min/Max/Mittel je Feld einer Messreihe.
 * @param {SensorSample[]} series
 * @param {string} field
 */
export function seriesStats(series, field) {
  const values = series.map(sample => sample[field]).filter(value => typeof value === 'number');
  if (!values.length) return null;
  const nums = /** @type {number[]} */ (values);
  const sum = nums.reduce((a, b) => a + b, 0);
  return { count: nums.length, min: Math.min(...nums), max: Math.max(...nums), mean: sum / nums.length };
}

/**
 * Barometrische Höhe nach internationaler Standardatmosphäre (nicht kalibriert).
 * @param {number} pressureHpa
 */
export function barometricAltitude(pressureHpa) {
  return 44330 * (1 - (pressureHpa / 1013.25) ** (1 / 5.255));
}

/** @param {unknown} sensors */
export function sensorOverview(sensors) {
  const overview = { recorded: /** @type {string[]} */ ([]), missing: /** @type {string[]} */ ([]) };
  if (!isPlainObject(sensors)) return overview;
  for (const key of SENSOR_KEYS) {
    const record = sensors[key];
    if (isPlainObject(record) && record.status === 'recorded') overview.recorded.push(key);
    else overview.missing.push(key);
  }
  return overview;
}
