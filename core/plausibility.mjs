/**
 * Optionale Plausibilitätsprüfung der versiegelten Sensorwerte gegen unabhängige Referenzdaten.
 * Die Beweiskette belegt, dass Foto und Aufnahmedaten unverändert sind. Dieses Modul prüft
 * zusätzlich, ob die Gerätewerte zu dem passen, was Wetter-, Gelände-, Karten-, Magnetfeld- und
 * Blockchain-Quellen für den angegebenen Ort und Zeitpunkt ausweisen.
 *
 * Ablauf wie bei der Karte: Referenzdaten werden nur auf ausdrücklichen Wunsch und vor dem
 * Rendern geladen (loadReferences). Die Bewertung (evaluatePlausibility) ist eine reine Funktion
 * über Paket, Kettenabfrage und Referenzdaten. Der PDF-Renderer greift nie selbst aufs Netz.
 * Alle Referenzwerte sind Modell- oder Näherungswerte und werden im Bericht so bezeichnet.
 * Plattformneutral (Node und Hermes): kein Buffer, kein TextDecoder, kein AbortSignal.timeout.
 */
import { formatCoordinate, formatDate, formatInt, formatMeasure, formatTime, UTC } from './format.mjs';
import { decimalYear, geomagneticField, WMM2025 } from './geomag.mjs';
import { mapCoordinates, samplePhase } from './report-model.mjs';
import { barometricAltitude, seriesStats } from './sensors.mjs';
import { fetchBytesWithTimeout, isPlainObject, utf8Decode } from './util.mjs';

export const OPEN_METEO_FORECAST = 'https://api.open-meteo.com/v1/forecast';
export const OPEN_METEO_ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';
export const OPEN_METEO_ELEVATION = 'https://api.open-meteo.com/v1/elevation';
export const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';
/** Aufnahmen, die älter sind, werden über die Archiv-API (Reanalyse) statt der Forecast-API abgefragt. */
export const ARCHIVE_AFTER_DAYS = 90;
export const REFERENCE_MAX_BYTES = 512 * 1024;
/** Koordinaten gehen gerundet an die Dienste: vier Nachkommastellen entsprechen etwa 10 m. */
export const COORDINATE_DECIMALS = 4;
export const WEATHER_FIELDS = ['surface_pressure', 'pressure_msl', 'temperature_2m', 'cloud_cover', 'direct_radiation', 'diffuse_radiation', 'precipitation'];

export { LEVELS, LEVEL_TEXT, LEVEL_EXPLANATION } from './plausibility-levels.mjs';
/** @typedef {import('./plausibility-levels.mjs').Level} Level */

/** Schwellen der Bewertung; die Einheiten stehen im Namen oder Kommentar. */
export const THRESHOLDS = Object.freeze({
  pressureStrongHpa: 1.5, pressureOkHpa: 5, pressureSuspiciousHpa: 20,
  fieldStrongPercent: 5, fieldOkPercent: 20,
  inclinationStrongDeg: 5, inclinationOkDeg: 12, inclinationSuspiciousDeg: 25,
  declinationOkDeg: 3, declinationSuspiciousDeg: 15,
  altitudeOkM: 120, altitudeSuspiciousM: 300,
  accelMinG: 0.95, accelMaxG: 1.05, gyroMaxRadS: 0.2, pairMaxDtMs: 300,
  magnetometerMinUt: 25, magnetometerMaxUt: 65,
  pressureSpanQuietHpa: 0.5, pressureSpanMovingHpa: 2,
  exposureClassLog2: 1.5,
});

/**
 * @typedef {{ fetchImpl?: typeof fetch, userAgent: string, timeoutMs?: number, now?: () => Date }} ReferenceLoader
 * @typedef {{ name: string, url: string | null, status: 'ok'|'error'|'skipped', detail: string, at: string | null }} ReferenceQuery
 * @typedef {{
 *   source: 'forecast'|'archive', url: string, gridLatitude: number | null, gridLongitude: number | null, modelElevation: number | null,
 *   hour: string, surfacePressure: number | null, pressureMsl: number | null, temperature: number | null, cloudCover: number | null,
 *   directRadiation: number | null, diffuseRadiation: number | null, precipitation: number | null,
 *   dayMinPressure: number | null, dayMaxPressure: number | null, sunrise: string | null, sunset: string | null,
 * }} WeatherReference
 * @typedef {{
 *   displayName: string, name: string, type: string, osmType: string, osmId: string, latitude: number | null, longitude: number | null,
 *   distanceM: number | null, licence: string,
 * }} PlaceReference
 * @typedef {{ queriedAt: string, queries: ReferenceQuery[], weather: WeatherReference | null, elevation: number | null, place: PlaceReference | null }} ReferenceData
 * @typedef {{ id: string, label: string, sensor: string, reference: string, comparison: string, level: Level }} Finding
 * @typedef {{ key: string, title: string, findings: Finding[], weight: string }} FindingGroup
 * @typedef {{ id: string, title: string, against: string, open: string, verdict: string }} Hypothesis
 * @typedef {{ step: string, how: string, result: string }} ReproStep
 * @typedef {{ source: string, provides: string, queried: string }} SourceRow
 * @typedef {{ title: string, kind: 'proof'|'hint'|'neutral'|'warning'|'failed', text: string }} OverviewTile
 * @typedef {{
 *   key: string, label: string, unit: string, device: number, reference: number, deviceText: string, referenceText: string,
 *   deviation: string, strong: number, ok: number, level: Level, interpretation: string,
 *   scale?: { min: number, max: number, minLabel: string, maxLabel: string, referenceLabel: string },
 * }} Comparison  strong/ok: halbe Breite des engen und des weiten Toleranzbands um den Referenzwert, scale: feste Skala statt der automatischen
 */

const DEG = Math.PI / 180;
const COMPASS_POINTS = ['N', 'NNO', 'NO', 'ONO', 'O', 'OSO', 'SO', 'SSO', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

/** @param {unknown} value */
const num = value => (typeof value === 'number' && Number.isFinite(value) ? value : null);
/** @param {unknown} value */
const iso = value => (typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(Date.parse(value)) : null);
/** Dezimalzahl mit Komma ohne Tausenderpunkt, z. B. 1029,4 hPa. @param {number} value @param {number} decimals */
const fix = (value, decimals) => {
  const text = Math.abs(value).toFixed(decimals).replace('.', ',');
  return `${value < 0 && Number(Math.abs(value).toFixed(decimals)) !== 0 ? '−' : ''}${text}`;
};
/** @param {Date} date */
const utcTime = date => `${formatTime(date, UTC)} UTC`;
/** @param {Date} date */
const utcDateTime = date => `${formatDate(date, UTC)}, ${formatTime(date, UTC)} UTC`;
/** @param {number} value */
const round = (value, decimals = 0) => { const k = 10 ** decimals; return Math.round(value * k) / k; };

// ---------- Rechenkerne ----------

/**
 * Sonnenstand nach dem NOAA-Algorithmus (Astronomical Algorithms, Meeus; Genauigkeit etwa 0,01°).
 * @param {Date} date @param {number} latitude @param {number} longitude
 * @returns {{ altitude: number, azimuth: number, declination: number, equationOfTime: number, sunrise: Date | null, sunset: Date | null }}
 */
export function sunPosition(date, latitude, longitude) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545) / 36525;
  const L0 = ((280.46646 + T * (36000.76983 + T * 0.0003032)) % 360 + 360) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const Mr = M * DEG;
  const C = Math.sin(Mr) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * Mr) * (0.019993 - 0.000101 * T) + Math.sin(3 * Mr) * 0.000289;
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * DEG);
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * DEG);
  const declination = Math.asin(Math.sin(eps * DEG) * Math.sin(lambda * DEG)) / DEG;
  const y = Math.tan(eps * DEG / 2) ** 2;
  const L0r = L0 * DEG;
  const eot = 4 * (y * Math.sin(2 * L0r) - 2 * e * Math.sin(Mr) + 4 * e * y * Math.sin(Mr) * Math.cos(2 * L0r)
    - 0.5 * y * y * Math.sin(4 * L0r) - 1.25 * e * e * Math.sin(2 * Mr)) / DEG;
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60 + date.getUTCMilliseconds() / 60000;
  const tst = ((minutes + eot + 4 * longitude) % 1440 + 1440) % 1440;
  const hourAngle = tst / 4 < 0 ? tst / 4 + 180 : tst / 4 - 180;
  const lat = latitude * DEG; const dec = declination * DEG;
  const cosZenith = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(hourAngle * DEG);
  const zenith = Math.acos(Math.max(-1, Math.min(1, cosZenith))) / DEG;
  let azimuth = 0;
  const denominator = Math.cos(lat) * Math.sin(zenith * DEG);
  if (Math.abs(denominator) > 1e-9) {
    const cosAz = Math.max(-1, Math.min(1, (Math.sin(lat) * Math.cos(zenith * DEG) - Math.sin(dec)) / denominator));
    const az = Math.acos(cosAz) / DEG;
    azimuth = hourAngle > 0 ? (az + 180) % 360 : (540 - az) % 360;
  }
  // Auf- und Untergang (Zenit 90,833° mit Refraktion) am selben UTC-Tag
  const cosHa = Math.cos(90.833 * DEG) / (Math.cos(lat) * Math.cos(dec)) - Math.tan(lat) * Math.tan(dec);
  /** @type {Date | null} */ let sunrise = null;
  /** @type {Date | null} */ let sunset = null;
  if (Math.abs(cosHa) <= 1) {
    const ha = Math.acos(cosHa) / DEG;
    const dayStart = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    sunrise = new Date(dayStart + (720 - 4 * (longitude + ha) - eot) * 60000);
    sunset = new Date(dayStart + (720 - 4 * (longitude - ha) - eot) * 60000);
  }
  return { altitude: 90 - zenith, azimuth, declination, equationOfTime: eot, sunrise, sunset };
}

/** Himmelsrichtung in 16 Stufen, z. B. 240° → „WSW“. @param {number} azimuth */
export function compassPoint(azimuth) {
  return COMPASS_POINTS[Math.round((((azimuth % 360) + 360) % 360) / 22.5) % 16];
}

const G0 = 9.80665; const MOLAR = 0.0289644; const R_GAS = 8.31447; const LAPSE = 0.0065;
/** Mittlere Temperatur der Luftsäule in K, wenn T in °C an der Höhe h gemessen wurde. @param {number} heightM @param {number} tempC */
const columnTemperature = (heightM, tempC) => tempC + 273.15 + LAPSE * heightM / 2;

/**
 * Luftdruck auf Meeresniveau barometrisch auf eine Höhe reduzieren (p(h) = p_MSL · exp(−g·M·h / (R·T_mittel))).
 * @param {number} pressureMslHpa @param {number} heightM @param {number} tempC Temperatur an der Höhe in °C
 */
export function reducePressureToHeight(pressureMslHpa, heightM, tempC) {
  return pressureMslHpa * Math.exp(-G0 * MOLAR * heightM / (R_GAS * columnTemperature(heightM, tempC)));
}

/** Umkehrung: Stationsdruck auf Meeresniveau beziehen (QNH-Näherung). @param {number} pressureHpa @param {number} heightM @param {number} tempC */
export function pressureToSeaLevel(pressureHpa, heightM, tempC) {
  return pressureHpa * Math.exp(G0 * MOLAR * heightM / (R_GAS * columnTemperature(heightM, tempC)));
}

/** Lichtwert EV100 = log2(N² / t) − log2(ISO / 100). @param {number} exposureTime s @param {number} fNumber @param {number} iso */
export function exposureValue(exposureTime, fNumber, iso) {
  return Math.log2(fNumber * fNumber / exposureTime) - Math.log2(iso / 100);
}

/** Grobe Szenenbeleuchtung aus dem Lichtwert (Faustformel lx ≈ 2,5 · 2^EV, Spanne ±40 %). @param {number} ev */
export function illuminanceFromExposure(ev) {
  const center = 2.5 * 2 ** ev;
  return { center, low: center * 0.6, high: center * 1.4 };
}

/** @param {number} lux */
export function illuminanceClass(lux) {
  if (lux < 1) return 'Dunkelheit';
  if (lux < 50) return 'Dämmerung oder schwache Beleuchtung';
  if (lux < 500) return 'Kunstlicht im Innenraum';
  if (lux < 5000) return 'Innenraum mit Tageslicht oder Schatten bei bedecktem Himmel';
  if (lux < 25000) return 'draußen bei bedecktem Himmel oder im Schatten';
  return 'direktes Sonnenlicht';
}

/** Großkreisentfernung in m (Haversine). @param {number} lat1 @param {number} lon1 @param {number} lat2 @param {number} lon2 */
export function distanceMeters(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * DEG; const dLon = (lon2 - lon1) * DEG;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.sqrt(a));
}

/**
 * @typedef {{ at: string, inclination: number, accel: number, field: number, gyro: number | null, quiet: boolean, disturbed: boolean, phase: string }} InclinationPair
 */

/**
 * Inklination aus zeitgleichen Beschleunigungs- und Magnetometermessungen: Winkel zwischen dem
 * Beschleunigungsvektor (zeigt bei ruhendem Gerät nach oben) und dem Feldvektor, minus 90°.
 * Verwertbar sind nur ruhige Paare: |a| 0,95 bis 1,05 g (auf 0,01 g gerundet), Gyroskop unter
 * 0,2 rad/s, Feldbetrag 25 bis 65 µT, Zeitabstand höchstens 300 ms.
 * @param {Record<string, any> | null} sensors
 * @returns {{ pairs: InclinationPair[], best: InclinationPair | null, quiet: number }}
 */
export function inclinationFromSensors(sensors) {
  const acc = series(sensors, 'accelerometer'); const mag = series(sensors, 'magnetometer'); const gyro = series(sensors, 'gyroscope');
  const window = sensors && isPlainObject(sensors.window) ? sensors.window : null;
  /** @type {InclinationPair[]} */
  const pairs = [];
  for (const a of acc) {
    const ax = num(a.x); const ay = num(a.y); const az = num(a.z);
    if (ax === null || ay === null || az === null) continue;
    const t = Date.parse(String(a.at));
    const b = nearest(mag, t, THRESHOLDS.pairMaxDtMs);
    if (!b) continue;
    const bx = num(b.x); const by = num(b.y); const bz = num(b.z);
    if (bx === null || by === null || bz === null) continue;
    const accel = Math.hypot(ax, ay, az); const field = Math.hypot(bx, by, bz);
    if (!accel || !field) continue;
    const angle = Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by + az * bz) / (accel * field)))) / DEG;
    const g = nearest(gyro, t, THRESHOLDS.pairMaxDtMs);
    const gyroRate = g ? Math.hypot(num(g.x) ?? 0, num(g.y) ?? 0, num(g.z) ?? 0) : null;
    const rounded = round(accel, 2);
    const disturbed = field < THRESHOLDS.magnetometerMinUt || field > THRESHOLDS.magnetometerMaxUt;
    const quiet = rounded >= THRESHOLDS.accelMinG && rounded <= THRESHOLDS.accelMaxG && gyroRate !== null && gyroRate < THRESHOLDS.gyroMaxRadS && !disturbed;
    pairs.push({ at: String(a.at), inclination: angle - 90, accel, field, gyro: gyroRate, quiet, disturbed, phase: samplePhase(String(a.at), window) });
  }
  const quietPairs = pairs.filter(pair => pair.quiet);
  // Ruhigstes Paar: kleinste Abweichung von 1 g, bei Gleichstand kleinste Drehrate
  const best = quietPairs.sort((p, q) => Math.abs(p.accel - 1) - Math.abs(q.accel - 1) || (p.gyro ?? 0) - (q.gyro ?? 0))[0] ?? null;
  return { pairs, best, quiet: quietPairs.length };
}

/** @param {Record<string, any> | null} sensors @param {string} key @returns {Record<string, any>[]} */
function series(sensors, key) {
  const record = sensors?.[key];
  if (!isPlainObject(record) || record.status !== 'recorded' || !Array.isArray(record.series)) return [];
  return record.series.filter(isPlainObject);
}

/** @param {Record<string, any>[]} samples @param {number} t @param {number} maxDt */
function nearest(samples, t, maxDt) {
  /** @type {Record<string, any> | null} */
  let best = null; let bestDt = Infinity;
  for (const sample of samples) {
    const dt = Math.abs(Date.parse(String(sample.at)) - t);
    if (dt < bestDt) { best = sample; bestDt = dt; }
  }
  return bestDt <= maxDt ? best : null;
}

/**
 * Kompass gegen Gyroskop: mittlere Drehrate aus der Kompassreihe je Phase (vor der Kamera, nach der
 * Rückkehr) gegen die mittlere Drehrate des Gyroskops im selben Zeitraum.
 * @param {Record<string, any> | null} sensors
 * @returns {{ phase: string, from: string, to: string, headingChange: number, seconds: number, compassRate: number, gyroRate: number | null, gyroCount: number } | null}
 */
export function compassAgainstGyroscope(sensors) {
  const compass = series(sensors, 'compass'); const gyro = series(sensors, 'gyroscope');
  const window = sensors && isPlainObject(sensors.window) ? sensors.window : null;
  /** @type {ReturnType<typeof compassAgainstGyroscope>} */
  let best = null;
  for (const phase of ['vor Kamera', 'nach Rückkehr', '–']) {
    const samples = compass.filter(s => samplePhase(String(s.at), window) === phase && num(s.magHeading) !== null);
    if (samples.length < 2) continue;
    let change = 0;
    for (let i = 1; i < samples.length; i++) {
      let d = /** @type {number} */ (num(samples[i].magHeading)) - /** @type {number} */ (num(samples[i - 1].magHeading));
      while (d > 180) d -= 360;
      while (d < -180) d += 360;
      change += d;
    }
    const t0 = Date.parse(String(samples[0].at)); const t1 = Date.parse(String(samples[samples.length - 1].at));
    const seconds = (t1 - t0) / 1000;
    if (seconds < 0.2) continue;
    const rates = gyro.filter(g => { const t = Date.parse(String(g.at)); return t >= t0 - 100 && t <= t1 + 100; })
      .map(g => Math.hypot(num(g.x) ?? 0, num(g.y) ?? 0, num(g.z) ?? 0));
    const gyroRate = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
    const compassRate = Math.abs(change) * DEG / seconds;
    if (!best || compassRate > best.compassRate) {
      best = { phase, from: String(samples[0].at), to: String(samples[samples.length - 1].at), headingChange: change, seconds, compassRate, gyroRate, gyroCount: rates.length };
    }
  }
  return best;
}

// ---------- Referenzdaten laden ----------

/** @param {number} value */
const coordinateText = value => value.toFixed(COORDINATE_DECIMALS);

/** @param {Date} date */
const isoDay = date => date.toISOString().slice(0, 10);

/**
 * Abfrage-URLs für Ort und Zeitpunkt. Die Wetterquelle hängt vom Alter der Aufnahme ab.
 * @param {{ latitude: number, longitude: number }} coordinates @param {Date} captureTime @param {Date} now
 */
export function referenceUrls(coordinates, captureTime, now) {
  const lat = coordinateText(coordinates.latitude); const lon = coordinateText(coordinates.longitude);
  const ageDays = (now.getTime() - captureTime.getTime()) / 86400000;
  const archive = ageDays > ARCHIVE_AFTER_DAYS;
  const day = isoDay(captureTime);
  return {
    weather: {
      source: /** @type {'forecast'|'archive'} */ (archive ? 'archive' : 'forecast'),
      url: `${archive ? OPEN_METEO_ARCHIVE : OPEN_METEO_FORECAST}?latitude=${lat}&longitude=${lon}&hourly=${WEATHER_FIELDS.join(',')}&daily=sunrise,sunset&start_date=${day}&end_date=${day}&timezone=UTC`,
    },
    elevation: `${OPEN_METEO_ELEVATION}?latitude=${lat}&longitude=${lon}`,
    place: `${NOMINATIM_REVERSE}?lat=${lat}&lon=${lon}&format=jsonv2&zoom=18`,
  };
}

/**
 * @param {typeof fetch} fetchImpl @param {string} url @param {ReferenceLoader} loader @param {string} label
 * @returns {Promise<any>}
 */
async function fetchJson(fetchImpl, url, loader, label) {
  /** @type {Awaited<ReturnType<typeof fetchBytesWithTimeout>>} */
  let response;
  try {
    response = await fetchBytesWithTimeout(fetchImpl, url, {
      init: { headers: { 'User-Agent': loader.userAgent, Accept: 'application/json', 'Accept-Language': 'de' } },
      timeoutMs: loader.timeoutMs ?? 15000, maxBytes: REFERENCE_MAX_BYTES, label,
    });
  } catch (error) {
    throw new Error(error instanceof Error && error.message.startsWith('Zeitüberschreitung')
      ? `Zeitüberschreitung bei ${label} (${Math.round((loader.timeoutMs ?? 15000) / 1000)} s).` : `${label} nicht erreichbar (keine Verbindung).`);
  }
  if (!response.ok) throw new Error(response.status === 200 ? `Antwort von ${label} ist zu groß.` : `${label} antwortet mit HTTP ${response.status}.`);
  try { return JSON.parse(utf8Decode(response.bytes, label)); } catch { throw new Error(`Antwort von ${label} ist kein lesbares JSON.`); }
}

/**
 * Lädt Wetter, Geländehöhe und Adresse zum Aufnahmeort. Jede Quelle wird einzeln protokolliert;
 * ein Fehler verhindert weder die anderen Abfragen noch den Bericht.
 * @param {{ coordinates: { latitude: number, longitude: number } | null, captureTime: Date | null }} input
 * @param {ReferenceLoader} loader
 * @returns {Promise<ReferenceData>}
 */
export async function loadReferences(input, loader) {
  const now = loader.now?.() ?? new Date();
  const fetchImpl = loader.fetchImpl ?? globalThis.fetch;
  /** @type {ReferenceData} */
  const data = { queriedAt: now.toISOString(), queries: [], weather: null, elevation: null, place: null };
  /** @param {string} name @param {string | null} url @param {'ok'|'error'|'skipped'} status @param {string} detail */
  const log = (name, url, status, detail) => { data.queries.push({ name, url, status, detail, at: status === 'skipped' ? null : (loader.now?.() ?? new Date()).toISOString() }); };
  if (!input.coordinates) {
    for (const name of ['Open-Meteo Wetter', 'Open-Meteo Elevation', 'Nominatim']) log(name, null, 'skipped', 'kein Standort im Paket');
    return data;
  }
  if (typeof fetchImpl !== 'function') {
    for (const name of ['Open-Meteo Wetter', 'Open-Meteo Elevation', 'Nominatim']) log(name, null, 'error', 'Kein Netzwerkzugriff verfügbar.');
    return data;
  }
  const urls = referenceUrls(input.coordinates, input.captureTime ?? now, now);
  const weatherName = urls.weather.source === 'archive' ? 'Open-Meteo Archiv-API' : 'Open-Meteo Forecast-API';

  if (!input.captureTime) log(weatherName, null, 'skipped', 'keine Aufnahmezeit im Paket');
  else {
    try {
      const json = await fetchJson(fetchImpl, urls.weather.url, loader, weatherName);
      data.weather = parseWeather(json, urls.weather.source, urls.weather.url, input.captureTime);
      log(weatherName, urls.weather.url, 'ok', `${data.weather.hour} UTC: Stationsdruck ${data.weather.surfacePressure ?? '–'} hPa, Meeresniveau ${data.weather.pressureMsl ?? '–'} hPa, ${data.weather.temperature ?? '–'} °C, Bewölkung ${data.weather.cloudCover ?? '–'} %`);
    } catch (error) { log(weatherName, urls.weather.url, 'error', error instanceof Error ? error.message : String(error)); }
  }
  try {
    const json = await fetchJson(fetchImpl, urls.elevation, loader, 'Open-Meteo Elevation');
    const value = num(Array.isArray(json?.elevation) ? json.elevation[0] : null);
    if (value === null) throw new Error('Antwort von Open-Meteo Elevation enthält keine Höhe.');
    data.elevation = value;
    log('Open-Meteo Elevation', urls.elevation, 'ok', `Geländehöhe ${formatMeasure(value, 1)} m`);
  } catch (error) { log('Open-Meteo Elevation', urls.elevation, 'error', error instanceof Error ? error.message : String(error)); }
  try {
    const json = await fetchJson(fetchImpl, urls.place, loader, 'Nominatim');
    if (!isPlainObject(json) || typeof json.display_name !== 'string') throw new Error(typeof json?.error === 'string' ? `Nominatim: ${json.error}` : 'Nominatim lieferte keine Adresse.');
    const lat = num(Number(json.lat)); const lon = num(Number(json.lon));
    data.place = {
      displayName: String(json.display_name).slice(0, 300), name: typeof json.name === 'string' ? json.name.slice(0, 120) : '',
      type: typeof json.type === 'string' ? json.type : '', osmType: typeof json.osm_type === 'string' ? json.osm_type : '',
      osmId: json.osm_id === undefined ? '' : String(json.osm_id), latitude: lat, longitude: lon,
      distanceM: lat !== null && lon !== null ? distanceMeters(input.coordinates.latitude, input.coordinates.longitude, lat, lon) : null,
      licence: typeof json.licence === 'string' ? json.licence : 'Data © OpenStreetMap contributors, ODbL 1.0',
    };
    log('Nominatim', urls.place, 'ok', data.place.displayName);
  } catch (error) { log('Nominatim', urls.place, 'error', error instanceof Error ? error.message : String(error)); }
  return data;
}

/**
 * @param {any} json @param {'forecast'|'archive'} source @param {string} url @param {Date} captureTime
 * @returns {WeatherReference}
 */
function parseWeather(json, source, url, captureTime) {
  if (!isPlainObject(json) || !isPlainObject(json.hourly) || !Array.isArray(json.hourly.time)) {
    throw new Error(typeof json?.reason === 'string' ? `Open-Meteo: ${json.reason}` : 'Antwort von Open-Meteo enthält keine Stundenwerte.');
  }
  const hourly = /** @type {Record<string, unknown[]>} */ (json.hourly);
  const hour = `${isoDay(captureTime)}T${String(captureTime.getUTCHours()).padStart(2, '0')}:00`;
  const index = hourly.time.indexOf(hour);
  if (index < 0) throw new Error(`Open-Meteo liefert keine Werte für ${hour} UTC.`);
  /** @param {string} field */
  const at = field => num(Array.isArray(hourly[field]) ? hourly[field][index] : null);
  const pressures = (Array.isArray(hourly.surface_pressure) ? hourly.surface_pressure : []).map(num).filter(v => v !== null);
  const daily = isPlainObject(json.daily) ? json.daily : {};
  /** @param {unknown} value */
  const dailyTime = value => (Array.isArray(value) && typeof value[0] === 'string' ? `${value[0]}:00Z` : null);
  return {
    source, url, gridLatitude: num(json.latitude), gridLongitude: num(json.longitude), modelElevation: num(json.elevation), hour,
    surfacePressure: at('surface_pressure'), pressureMsl: at('pressure_msl'), temperature: at('temperature_2m'), cloudCover: at('cloud_cover'),
    directRadiation: at('direct_radiation'), diffuseRadiation: at('diffuse_radiation'), precipitation: at('precipitation'),
    dayMinPressure: pressures.length ? Math.min(.../** @type {number[]} */ (pressures)) : null,
    dayMaxPressure: pressures.length ? Math.max(.../** @type {number[]} */ (pressures)) : null,
    sunrise: dailyTime(daily.sunrise), sunset: dailyTime(daily.sunset),
  };
}

// ---------- Bewertung ----------

/**
 * @typedef {{
 *   generatedAtUtc: string, queriedAtUtc: string | null,
 *   captureTimeUtc: string | null, coordinates: { latitude: number, longitude: number } | null, android: boolean,
 *   summary: { sentence: string, detail: string, counts: Record<Level, number>, total: number, matched: number, tone: 'passed'|'incomplete'|'failed' },
 *   overview: OverviewTile[], groups: FindingGroup[], hypotheses: Hypothesis[], assessment: string,
 *   comparisons: Comparison[], highlights: string[], anomalies: string[],
 *   proves: string, provesNot: string, sources: SourceRow[], repro: ReproStep[], notes: string[], references: ReferenceData,
 * }} PlausibilityResult
 */

/**
 * Bewertet die versiegelten Angaben gegen Referenzdaten und Kettenabfrage. Reine Funktion.
 * @param {{
 *   analysis: import('./verify.mjs').BundleAnalysis,
 *   online: import('./verify.mjs').OnlineResult | null,
 *   references: ReferenceData,
 *   generatedAt?: Date,
 * }} input
 * @returns {PlausibilityResult}
 */
export function evaluatePlausibility(input) {
  const { analysis, online, references } = input;
  const generatedAt = input.generatedAt ?? new Date();
  const manifest = /** @type {Record<string, any>} */ (analysis.manifest ?? {});
  const coordinates = mapCoordinates(analysis);
  const location = isPlainObject(manifest.location) && manifest.location.status !== 'not_requested' && manifest.location.status !== 'permission_denied' ? manifest.location : null;
  const capture = isPlainObject(manifest.capture) ? manifest.capture : {};
  const captureTime = iso(capture.deviceTime);
  const device = isPlainObject(manifest.device) ? manifest.device : null;
  const sensors = isPlainObject(manifest.sensors) ? manifest.sensors : null;
  const window = sensors && isPlainObject(sensors.window) ? sensors.window : null;
  const android = (window?.platform ?? device?.platform) === 'android';
  const exif = analysis.photoInfo?.exif ?? {};
  const pre = isPlainObject(manifest.preCapture) ? manifest.preCapture : null;
  const weather = references.weather;
  /** @type {FindingGroup[]} */
  const groups = [];
  /** @type {ReproStep[]} */
  const repro = [];
  /** @type {Comparison[]} */
  const comparisons = [];
  /** @param {string} key @param {string} title @param {string} weight */
  const group = (key, title, weight) => { /** @type {FindingGroup} */ const g = { key, title, findings: [], weight }; groups.push(g); return g; };
  /** @param {FindingGroup} g @param {Omit<Finding, 'id'>} finding */
  const add = (g, finding) => { g.findings.push({ id: `${g.key}-${g.findings.length + 1}`, ...finding }); return finding.level; };
  /** @param {string} key */
  const reading = key => { const record = sensors?.[key]; return isPlainObject(record) && record.status === 'recorded' && isPlainObject(record.reading) ? record.reading : null; };
  const noLocation = 'kein Standort im Paket';
  const queryError = (/** @type {string} */ name) => references.queries.find(q => q.name.startsWith(name) && q.status !== 'ok')?.detail ?? null;

  // Bezugsgrößen
  const sun = coordinates && captureTime ? sunPosition(captureTime, coordinates.latitude, coordinates.longitude) : null;
  const altitudeM = num(location?.altitude);
  const altitudeAccuracy = num(location?.altitudeAccuracy);
  const horizontalAccuracy = num(location?.accuracy);
  const field = coordinates && captureTime ? geomagneticField(coordinates.latitude, coordinates.longitude, Math.max(-0.5, Math.min(50, (altitudeM ?? 0) / 1000)), decimalYear(captureTime)) : null;
  const baro = reading('barometer'); const pressure = num(baro?.pressure);
  const baroSeries = series(sensors, 'barometer'); const pressureStats = seriesStats(/** @type {import('./sensors.mjs').SensorSample[]} */ (baroSeries), 'pressure');
  const mag = reading('magnetometer');
  const magnitudeOf = (/** @type {Record<string, any> | null} */ s) => (s && num(s.x) !== null && num(s.y) !== null && num(s.z) !== null ? Math.hypot(s.x, s.y, s.z) : null);
  const fieldMagnitude = magnitudeOf(mag);
  const magSeries = series(sensors, 'magnetometer');
  const magMagnitudes = magSeries.map(s => ({ at: String(s.at), value: magnitudeOf(s), phase: samplePhase(String(s.at), window) })).filter(s => s.value !== null);
  const disturbedSamples = magMagnitudes.filter(s => /** @type {number} */ (s.value) < THRESHOLDS.magnetometerMinUt || /** @type {number} */ (s.value) > THRESHOLDS.magnetometerMaxUt);
  const cleanSamples = magMagnitudes.filter(s => !disturbedSamples.includes(s));
  const readingDisturbed = fieldMagnitude !== null && (fieldMagnitude < THRESHOLDS.magnetometerMinUt || fieldMagnitude > THRESHOLDS.magnetometerMaxUt);
  const acc = reading('accelerometer'); const accelMagnitude = magnitudeOf(acc);
  const accSeries = series(sensors, 'accelerometer');
  const accMagnitudes = accSeries.map(magnitudeOf).filter(v => v !== null);
  const light = num(reading('light')?.illuminance);
  const lightSeries = series(sensors, 'light');
  const speed = num(location?.speed); const heading = num(location?.heading);
  const quietPressure = pressureStats ? pressureStats.max - pressureStats.min < THRESHOLDS.pressureSpanQuietHpa : null;
  const quietAccel = accelMagnitude !== null && accelMagnitude >= 0.9 && accelMagnitude <= 1.1;
  const anchor = online?.anchor ?? null;
  const btcPre = online?.preCapture?.bitcoin ?? null;
  const doiPre = online?.preCapture?.doichain ?? null;
  const sealedAt = anchor?.status === 'matched' && anchor.blockTimeUtc ? iso(anchor.blockTimeUtc) : null;
  const btcTime = pre ? iso(pre.bitcoin?.headerTimeUtc) : null;

  // ---- 1 Ort und Umgebung ----
  {
    const g = group('ort', 'Ort und Umgebung', '');
    const place = references.place;
    let levelPlace = /** @type {Level} */ ('offen');
    if (!coordinates) {
      add(g, { label: 'GNSS-Position', sensor: location ? 'ohne gültige Koordinaten' : 'nicht erfasst', reference: '–', comparison: 'Ohne Standort entfallen alle ortsgebundenen Abgleiche (Wetter, Höhe, Magnetfeld, Sonne).', level: 'offen' });
    } else {
      const parts = [`${formatCoordinate(coordinates.latitude, 'lat')} · ${formatCoordinate(coordinates.longitude, 'lon')}`];
      if (horizontalAccuracy !== null) parts.push(`±${formatMeasure(horizontalAccuracy, 1)} m`);
      parts.push(location?.mocked === true ? 'als simuliert gemeldet' : location?.mocked === false ? 'nicht simuliert' : 'Simulation nicht gemeldet');
      let reference; let comparison;
      if (place) {
        const object = place.name ? `„${place.name}“` : place.type ? `(${place.type})` : '';
        reference = `Nominatim (OpenStreetMap): ${place.displayName}.${place.osmId ? ` Nächstes OSM-Objekt: ${place.osmType === 'node' ? 'Knoten' : place.osmType === 'way' ? 'Weg' : 'Relation'} ${place.osmId}${object ? ` ${object}` : ''}${place.distanceM !== null ? `, ${formatMeasure(Math.round(place.distanceM))} m vom gemeldeten Punkt entfernt` : ''}.` : ''}`;
        comparison = place.distanceM !== null && place.distanceM <= 50 ? 'Punkt liegt bei der ermittelten Adresse. Ob das Foto diesen Ort zeigt, ist von Hand zu beurteilen (nächste Zeile).'
          : 'Adresse auflösbar, nächstes Objekt weiter entfernt (freie Fläche, Straße oder Gewässer). Ob das Foto diesen Ort zeigt, ist von Hand zu beurteilen.';
        levelPlace = location?.mocked === true ? 'auffaellig' : 'stimmig';
        if (location?.mocked === true) comparison = 'Das Gerät meldet einen simulierten Standort (Mock-Location). Alle ortsgebundenen Abgleiche stehen unter diesem Vorbehalt.';
      } else {
        reference = `Nominatim: ${queryError('Nominatim') ?? 'keine Antwort'}.`;
        comparison = 'Adresse nicht ermittelt.';
        levelPlace = location?.mocked === true ? 'auffaellig' : 'offen';
      }
      add(g, { label: 'GNSS-Position', sensor: parts.join(', '), reference, comparison, level: levelPlace });
      if (place) repro.push({ step: 'Adresse und nächstes Objekt', how: urlOf(references, 'Nominatim'), result: place.displayName });
    }
    add(g, {
      label: 'Sichtbare Umgebung', sensor: 'Bildinhalt (nicht automatisch ausgewertet)',
      reference: place ? `Adresse laut Nominatim: ${shortAddress(place)}. Öffnungszeiten, Beschilderung und Umgebung lassen sich dort nachschlagen.` : 'Keine Adresse ermittelt.',
      comparison: 'Motiv, Beschilderung, Tageslicht und Umgebung sind von Hand mit dem ermittelten Ort und der Wetterlage (Gruppe 5) abzugleichen.', level: 'offen',
    });
    let motionLevel = /** @type {Level} */ ('offen');
    let motionComparison = 'Geschwindigkeit nicht gemeldet.';
    if (speed !== null) {
      if (speed < 0.5) {
        const quiet = (quietPressure !== false) && (accelMagnitude === null || quietAccel);
        motionComparison = quiet ? 'Ruhendes Gerät, deckt sich mit Druckverlauf und Beschleunigung.' : 'GNSS meldet Stillstand, Druckverlauf oder Beschleunigung zeigen jedoch Bewegung (Treppe, Aufzug, Handbewegung).';
        motionLevel = quiet ? 'stimmig' : 'auffaellig';
      } else {
        motionComparison = `GNSS meldet Bewegung mit ${formatMeasure(speed, 1)} m/s (${formatMeasure(speed * 3.6, 1)} km/h). Druck- und Beschleunigungsreihen sind dazu passend unruhig oder nicht auswertbar.`;
        motionLevel = 'stimmig';
      }
    }
    add(g, {
      label: 'Geschwindigkeit, Richtung', sensor: speed === null ? 'nicht gemeldet' : `${formatMeasure(speed, 2)} m/s${heading !== null ? ` · ${formatMeasure(heading, 1)}°` : ''}`,
      reference: 'Ruhendes Gerät erwartet, wenn Druckverlauf (Gruppe 3) und Beschleunigung (Gruppe 6) ruhig sind.', comparison: motionComparison, level: motionLevel,
    });
    g.weight = levelPlace === 'stimmig'
      ? 'Beweiswert mittel. Die Adresse ist ermittelt, erst der Abgleich mit dem Bildinhalt macht den Ort zu einem starken Indiz. GNSS-Spoofing allein würde ein passendes Motiv nicht erklären.'
      : 'Beweiswert gering. Ohne auflösbare Adresse oder mit simuliertem Standort tragen die ortsgebundenen Indizien wenig.';
  }

  // ---- 2 Höhe ----
  let baroLevel = /** @type {Level} */ ('offen');
  {
    const g = group('hoehe', 'Höhe', '');
    const elevation = references.elevation;
    let altitudeLevel = /** @type {Level} */ ('offen');
    if (altitudeM === null) add(g, { label: 'Höhe über Ellipsoid', sensor: 'nicht gemeldet', reference: elevation !== null ? `Geländehöhe ${formatMeasure(elevation, 1)} m (Open-Meteo Elevation, Modellwert).` : '–', comparison: 'Keine GNSS-Höhe im Paket.', level: 'offen' });
    else if (elevation === null) add(g, { label: 'Höhe über Ellipsoid', sensor: `${formatMeasure(altitudeM, 1)} m${altitudeAccuracy !== null ? `, vertikal ±${formatMeasure(altitudeAccuracy, 1)} m` : ''}`, reference: `Open-Meteo Elevation: ${queryError('Open-Meteo Elevation') ?? noLocation}.`, comparison: 'Geländehöhe nicht ermittelt.', level: 'offen' });
    else {
      const delta = altitudeM - elevation;
      altitudeLevel = Math.abs(delta) <= THRESHOLDS.altitudeOkM ? 'stimmig' : 'auffaellig';
      comparisons.push({
        key: 'hoehe', label: 'Höhe', unit: 'm', device: altitudeM, reference: elevation,
        deviceText: `${formatMeasure(altitudeM, 1)} m über Ellipsoid (GNSS)`, referenceText: `${formatMeasure(elevation, 0)} m Gelände (Open-Meteo)`,
        deviation: `${fix(delta, 1)} m`, strong: 60, ok: THRESHOLDS.altitudeOkM, level: altitudeLevel,
        interpretation: Math.abs(delta) <= THRESHOLDS.altitudeOkM ? 'Die Differenz liegt im Rahmen von Geoidundulation (Mitteleuropa etwa +45 bis +50 m), GNSS-Höhenfehler und Stockwerk. Das ganze Umland liegt ähnlich hoch, die Höhe allein ist deshalb wenig trennscharf.' : 'Die Differenz ist größer, als Geoid und Gebäude erklären. Im Gebirge kann das Gelände am Gitterpunkt stark vom Aufnahmeort abweichen.',
      });
      add(g, {
        label: 'Höhe über Ellipsoid', sensor: `${formatMeasure(altitudeM, 1)} m${altitudeAccuracy !== null ? `, vertikal ±${formatMeasure(altitudeAccuracy, 1)} m` : ''}`,
        reference: `Geländehöhe ${formatMeasure(elevation, 1)} m über Meeresniveau (Open-Meteo Elevation, Copernicus-DEM mit 90 m Raster, Modellwert). Die GNSS-Höhe bezieht sich auf das WGS84-Ellipsoid. Die Geoidundulation (weltweit etwa −105 bis +85 m, Mitteleuropa etwa +45 bis +50 m) ist hier nicht abgezogen.`,
        comparison: `Abweichung ${fix(delta, 1)} m. ${Math.abs(delta) <= THRESHOLDS.altitudeOkM ? 'Im Rahmen von Geoidundulation, GNSS-Höhenunsicherheit und Stockwerkshöhe.' : Math.abs(delta) <= THRESHOLDS.altitudeSuspiciousM ? 'Mehr als Geoid und Gebäude erklären. Das Gelände am Gitterpunkt kann im Gebirge stark vom Aufnahmeort abweichen.' : 'Weit über Gelände oder weit darunter, nur im Gebirge, im Flugzeug oder bei schlechtem GNSS-Empfang erklärbar.'}`,
        level: altitudeLevel,
      });
      repro.push({ step: 'Geländehöhe', how: urlOf(references, 'Open-Meteo Elevation'), result: `${formatMeasure(elevation, 1)} m` });
    }
    if (pressure === null) add(g, { label: 'Barometrische Höhe', sensor: 'kein Luftdruck erfasst', reference: '–', comparison: 'Ohne Barometer entfällt die Rückrechnung.', level: 'offen' });
    else {
      const baroAltitude = barometricAltitude(pressure);
      const height = elevation ?? weather?.modelElevation ?? null;
      if (height === null || weather?.pressureMsl === null || weather?.temperature === null || !weather) {
        add(g, { label: 'Barometrische Höhe', sensor: `${formatMeasure(baroAltitude, 1)} m (Normatmosphäre 1013,25 hPa)`, reference: weather ? 'Wetterdaten unvollständig.' : `Open-Meteo: ${queryError('Open-Meteo') ?? noLocation}.`, comparison: 'Ohne Meeresniveaudruck und Geländehöhe lässt sich die Normatmosphärenhöhe nicht einordnen.', level: 'offen' });
      } else {
        const qnh = pressureToSeaLevel(pressure, height, weather.temperature);
        const dq = qnh - weather.pressureMsl;
        const offset = weather.pressureMsl - 1013.25;
        baroLevel = Math.abs(dq) <= THRESHOLDS.pressureStrongHpa ? 'stark' : Math.abs(dq) <= THRESHOLDS.pressureOkHpa ? 'stimmig' : 'auffaellig';
        comparisons.push({
          key: 'qnh', label: 'Druck auf Meeresniveau', unit: 'hPa', device: qnh, reference: weather.pressureMsl,
          deviceText: `${fix(qnh, 1)} hPa aus Sensordruck und ${formatMeasure(height, 0)} m`, referenceText: `${fix(weather.pressureMsl, 1)} hPa (Open-Meteo)`,
          deviation: `${fix(dq, 1)} hPa`, strong: THRESHOLDS.pressureStrongHpa, ok: THRESHOLDS.pressureOkHpa, level: baroLevel,
          interpretation: Math.abs(dq) <= THRESHOLDS.pressureOkHpa
            ? `Die barometrische Höhe von ${formatMeasure(baroAltitude, 0)} m statt ${formatMeasure(height, 0)} m erklärt sich vollständig aus der Wetterlage (${fix(offset, 0)} hPa ${offset >= 0 ? 'über' : 'unter'} der Normatmosphäre). Der Sensordruck bestätigt den Meeresniveaudruck ein zweites Mal.`
            : 'Die Rückrechnung passt nicht zum Meeresniveaudruck. Sensordruck, Geländehöhe oder Wetterlage passen nicht zusammen.',
        });
        add(g, {
          label: 'Barometrische Höhe', sensor: `${formatMeasure(baroAltitude, 1)} m (Normatmosphäre 1013,25 hPa)`,
          reference: `Gelände etwa ${formatMeasure(height, 0)} m. Die Differenz von ${fix(baroAltitude - height, 0)} m entspricht ${fix(offset, 1)} hPa Abweichung des Meeresniveaudrucks von der Normatmosphäre (etwa 8,5 m je hPa). Rückrechnung: Sensordruck ${fix(pressure, 2)} hPa über ${formatMeasure(height, 0)} m bei ${fix(weather.temperature, 1)} °C ergibt QNH ${fix(qnh, 1)} hPa, Open-Meteo ${fix(weather.pressureMsl, 1)} hPa.`,
          comparison: `${Math.abs(dq) <= THRESHOLDS.pressureOkHpa ? 'Der scheinbare Höhenwiderspruch löst sich über die Wetterlage auf und bestätigt den Luftdruck ein zweites Mal' : 'Die Rückrechnung passt nicht zum Meeresniveaudruck'}: QNH-Abweichung ${fix(dq, 1)} hPa.`,
          level: baroLevel,
        });
        repro.push({ step: 'Höhe aus Normatmosphäre', how: `h = 44330 · (1 − (p / 1013,25)^(1/5,255)) mit p = ${fix(pressure, 3)} hPa`, result: `${formatMeasure(baroAltitude, 1)} m` });
        repro.push({ step: 'Rückrechnung auf Meeresniveau', how: `QNH = p · exp(g · M · h / (R · T_mittel)) mit h = ${formatMeasure(height, 0)} m, T_mittel = ${fix(weather.temperature + 273.15, 2)} K + 0,0065 · h / 2`, result: `${fix(qnh, 1)} hPa` });
      }
    }
    g.weight = baroLevel === 'stark' || baroLevel === 'stimmig'
      ? 'Beweiswert mittel bis hoch. Die Höhe allein ist wenig trennscharf, aber die Umrechnung der barometrischen Höhe liefert einen zweiten, unabhängigen Druckabgleich.'
      : 'Beweiswert gering bis mittel. Die Höhe allein ist wenig trennscharf, und ohne Wetterdaten fehlt der zweite Druckabgleich.';
  }

  // ---- 3 Atmosphäre ----
  let pressureLevel = /** @type {Level} */ ('offen');
  {
    const g = group('atmosphaere', 'Atmosphäre', '');
    if (pressure === null) add(g, { label: 'Luftdruck', sensor: 'nicht erfasst', reference: weather?.surfacePressure !== null && weather ? `Open-Meteo ${weather.hour} UTC: Stationsdruck ${fix(weather.surfacePressure, 1)} hPa (Modellwert).` : '–', comparison: 'Kein Barometer im Gerät oder nicht erfasst.', level: 'offen' });
    else if (!weather || weather.surfacePressure === null) {
      add(g, { label: 'Luftdruck', sensor: pressureText(pressure, pressureStats), reference: `Open-Meteo: ${queryError('Open-Meteo') ?? (weather ? 'kein Stationsdruck in der Antwort' : noLocation)}.`, comparison: 'Kein Referenzdruck verfügbar.', level: 'offen' });
    } else {
      const delta = pressure - weather.surfacePressure;
      const abs = Math.abs(delta);
      pressureLevel = abs <= THRESHOLDS.pressureStrongHpa ? 'stark' : abs <= THRESHOLDS.pressureOkHpa ? 'stimmig' : abs <= THRESHOLDS.pressureSuspiciousHpa ? 'auffaellig' : 'widerspruch';
      comparisons.push({
        key: 'luftdruck', label: 'Luftdruck', unit: 'hPa', device: pressure, reference: weather.surfacePressure,
        deviceText: `${fix(pressure, 2)} hPa (Barometer)`, referenceText: `${fix(weather.surfacePressure, 1)} hPa Stationsdruck ${weather.hour.slice(11)} UTC (Open-Meteo${weather.modelElevation !== null ? `, ${formatMeasure(weather.modelElevation, 0)} m` : ''})`,
        deviation: `${fix(delta, 1)} hPa, etwa ${formatMeasure(Math.round(abs * 8.5))} m`, strong: THRESHOLDS.pressureStrongHpa, ok: THRESHOLDS.pressureOkHpa, level: pressureLevel,
        interpretation: pressureLevel === 'stark'
          ? `Auf ${fix(abs, 1)} hPa genau, das entspricht etwa ${formatMeasure(Math.round(abs * 8.5))} m Höhe. Der Tagesgang betrug ${weather.dayMinPressure !== null && weather.dayMaxPressure !== null ? `${fix(weather.dayMaxPressure - weather.dayMinPressure, 1)} hPa` : 'mehrere hPa'}${weather.pressureMsl !== null && Math.abs(weather.pressureMsl - 1013.25) > 8 ? `, und die Wetterlage war mit ${fix(weather.pressureMsl, 0)} hPa auf Meeresniveau untypisch` : ''}. Ein solcher Wert lässt sich nicht raten.`
          : pressureLevel === 'stimmig' ? `Abweichung ${fix(abs, 1)} hPa, etwa ${formatMeasure(Math.round(abs * 8.5))} m. Das passt zu einem Höhenunterschied zwischen Gitterpunkt und Aufnahmeort oder einem höheren Stockwerk.`
            : pressureLevel === 'auffaellig' ? `Abweichung ${fix(abs, 1)} hPa, etwa ${formatMeasure(Math.round(abs * 8.5))} m. Nur durch große Höhenunterschiede zum Gitterpunkt erklärbar.`
              : `Abweichung ${fix(abs, 1)} hPa. Weder Wetterlage noch Gebäudehöhe erklären einen solchen Unterschied: Der Sensor stand nicht an diesem Ort oder nicht zu dieser Zeit.`,
      });
      const check = weather.pressureMsl !== null && weather.temperature !== null && weather.modelElevation !== null
        ? ` Kontrollrechnung: ${fix(weather.pressureMsl, 1)} hPa auf ${formatMeasure(weather.modelElevation, 0)} m reduziert ergibt ${fix(reducePressureToHeight(weather.pressureMsl, weather.modelElevation, weather.temperature), 1)} hPa.` : '';
      add(g, {
        label: 'Luftdruck', sensor: pressureText(pressure, pressureStats),
        reference: `Open-Meteo ${weather.source === 'archive' ? 'Archiv-API (Reanalyse)' : 'Forecast-API (Modellanalyse)'} für ${weather.hour.slice(11)} UTC, Gitterpunkt ${weather.gridLatitude !== null ? `${fix(weather.gridLatitude, 3)}° N` : '?'} / ${weather.gridLongitude !== null ? `${fix(weather.gridLongitude, 3)}° O` : '?'}, Modellhöhe ${weather.modelElevation !== null ? formatMeasure(weather.modelElevation, 0) : '?'} m: Stationsdruck ${fix(weather.surfacePressure, 1)} hPa${weather.pressureMsl !== null ? `, auf Meeresniveau ${fix(weather.pressureMsl, 1)} hPa` : ''}${weather.temperature !== null ? `, ${fix(weather.temperature, 1)} °C` : ''}. Modellwert am Gitterpunkt, keine Stationsmessung.${check}`,
        comparison: `Abweichung ${fix(delta, 1)} hPa, entspricht etwa ${formatMeasure(Math.round(abs * 8.5))} m Höhe.${weather.dayMinPressure !== null && weather.dayMaxPressure !== null ? ` Tagesgang ${fix(weather.dayMinPressure, 1)} bis ${fix(weather.dayMaxPressure, 1)} hPa.` : ''}${pressureLevel === 'widerspruch' ? ' Ein Unterschied dieser Größe passt weder zur Wetterlage noch zu einer Gebäudehöhe.' : pressureLevel === 'auffaellig' ? ' Erklärbar durch große Höhenunterschiede zwischen Gitterpunkt und Aufnahmeort oder ein hohes Stockwerk.' : ''}`,
        level: pressureLevel,
      });
      repro.push({ step: 'Wetter am Gitterpunkt', how: weather.url, result: `${weather.hour.slice(11)} UTC: ${fix(weather.surfacePressure, 1)} hPa${weather.pressureMsl !== null ? `, ${fix(weather.pressureMsl, 1)} hPa MSL` : ''}${weather.temperature !== null ? `, ${fix(weather.temperature, 1)} °C` : ''}${weather.cloudCover !== null ? `, ${formatMeasure(weather.cloudCover, 0)} % Wolken` : ''}` });
      if (weather.pressureMsl !== null && weather.temperature !== null && weather.modelElevation !== null) {
        repro.push({ step: 'Druckreduktion', how: `p(h) = p_MSL · exp(−g · M · h / (R · T_mittel)) mit h = ${formatMeasure(weather.modelElevation, 0)} m, T_mittel = ${fix(weather.temperature + 273.15, 2)} K + 0,0065 · h / 2`, result: `${fix(reducePressureToHeight(weather.pressureMsl, weather.modelElevation, weather.temperature), 1)} hPa` });
      }
    }
    if (pressureStats && baroSeries.length > 1) {
      const first = num(baroSeries[0].pressure); const last = num(baroSeries[baroSeries.length - 1].pressure);
      const t0 = iso(baroSeries[0].at); const t1 = iso(baroSeries[baroSeries.length - 1].at);
      const span = pressureStats.max - pressureStats.min;
      const seconds = t0 && t1 ? (t1.getTime() - t0.getTime()) / 1000 : null;
      const dh = first !== null && last !== null ? barometricAltitude(last) - barometricAltitude(first) : null;
      const level = span < THRESHOLDS.pressureSpanQuietHpa ? 'stimmig' : span > THRESHOLDS.pressureSpanMovingHpa && speed !== null && speed < 0.5 ? 'auffaellig' : 'stimmig';
      add(g, {
        label: 'Druckverlauf', sensor: `${dh !== null ? `Höhenänderung ${fix(dh, 2)} m` : 'Höhenänderung unbekannt'}${seconds !== null ? ` in ${formatMeasure(Math.round(seconds))} s` : ''}, Spanne ${fix(span, 2)} hPa (n = ${pressureStats.count})`,
        reference: 'Ruhendes Gerät: Spanne unter 0,5 hPa erwartet. Treppe oder Aufzug: etwa 0,12 hPa je Meter.',
        comparison: level === 'stimmig' ? (span < THRESHOLDS.pressureSpanQuietHpa ? 'Kein Aufzug, keine Fahrt, keine Treppe.' : 'Druckänderung passt zur gemeldeten Bewegung.') : 'Deutliche Druckänderung bei gemeldetem Stillstand.',
        level,
      });
    }
    add(g, {
      label: 'Temperatur, Feuchte', sensor: 'nicht erhoben', reference: weather?.temperature !== null && weather ? `Open-Meteo ${weather.hour.slice(11)} UTC: ${fix(weather.temperature, 1)} °C (Modellwert).` : '–',
      comparison: 'Kein Sensor im Gerät.', level: 'offen',
    });
    g.weight = pressureLevel === 'stark'
      ? 'Beweiswert hoch. Der Drucksensor arbeitet unabhängig von GNSS und Netz. Ein zur Wetterlage passender Wert lässt sich nicht raten, er müsste aus einer Wetterquelle für genau diesen Ort und diese Stunde übernommen werden.'
      : pressureLevel === 'stimmig' ? 'Beweiswert mittel bis hoch. Der Drucksensor arbeitet unabhängig von GNSS und Netz. Die Restabweichung passt zu Höhenunterschieden zwischen Gitterpunkt und Aufnahmeort.'
        : pressureLevel === 'offen' ? 'Beweiswert nicht bestimmbar. Ohne Referenzdruck bleibt der Luftdruck ungeprüft.'
          : 'Beweiswert kritisch. Der Luftdruck passt nicht zur Wetterlage am angegebenen Ort.';
  }

  // ---- 4 Erdmagnetfeld ----
  let fieldLevel = /** @type {Level} */ ('offen');
  let inclinationLevel = /** @type {Level} */ ('offen');
  let declinationLevel = /** @type {Level} */ ('offen');
  const inclination = inclinationFromSensors(sensors);
  {
    const g = group('magnetfeld', 'Erdmagnetfeld', '');
    const modelText = field ? `WMM2025 (offline berechnet) für ${fix(coordinates?.latitude ?? 0, 3)}° N / ${fix(coordinates?.longitude ?? 0, 3)}° O, ${captureTime ? formatDate(captureTime, UTC) : ''}, Höhe ${fix(Math.max(0, altitudeM ?? 0) / 1000, 2)} km` : null;
    if (fieldMagnitude === null) add(g, { label: 'Feldstärke (Betrag)', sensor: 'nicht erfasst', reference: field ? `${modelText}: Totalintensität ${fix(field.f / 1000, 2)} µT (Modellwert).` : '–', comparison: 'Kein Magnetometer erfasst.', level: 'offen' });
    else if (!field) add(g, { label: 'Feldstärke (Betrag)', sensor: `${fix(fieldMagnitude, 2)} µT zur Aufnahme`, reference: noLocation, comparison: readingDisturbed ? 'Betrag außerhalb 25 bis 65 µT: gestörte Messung.' : 'Betrag im Bereich des Erdfelds (25 bis 65 µT), ohne Ort nicht genauer prüfbar.', level: readingDisturbed ? 'auffaellig' : 'offen' });
    else {
      const modelUt = field.f / 1000;
      const pct = (fieldMagnitude - modelUt) / modelUt * 100;
      fieldLevel = readingDisturbed ? 'auffaellig' : Math.abs(pct) <= THRESHOLDS.fieldStrongPercent ? 'stark' : Math.abs(pct) <= THRESHOLDS.fieldOkPercent ? 'stimmig' : 'auffaellig';
      comparisons.push({
        key: 'feldstaerke', label: 'Magnetfeldstärke', unit: 'µT', device: fieldMagnitude, reference: modelUt,
        deviceText: `${fix(fieldMagnitude, 2)} µT (Magnetometer)`, referenceText: `${fix(modelUt, 2)} µT Totalintensität (WMM2025)`,
        deviation: `${fix(pct, 1)} %`, strong: modelUt * THRESHOLDS.fieldStrongPercent / 100, ok: modelUt * THRESHOLDS.fieldOkPercent / 100, level: fieldLevel,
        interpretation: readingDisturbed ? 'Der Betrag liegt außerhalb des Erdfeldbereichs von 25 bis 65 µT. Ein Störfeld (Metall, Laptop, Magnet) überlagert die Messung, sie ist nicht verwertbar.'
          : fieldLevel === 'stark' ? `Abweichung ${fix(Math.abs(pct), 1)} %. Innenräume mit Stahlbeton und Geräten verfälschen typischerweise 5 bis 20 %, die Messung ist also sehr sauber. Das Magnetometer arbeitet ohne GNSS.`
            : fieldLevel === 'stimmig' ? `Abweichung ${fix(Math.abs(pct), 1)} %, im üblichen Rahmen für Innenräume.` : `Abweichung ${fix(Math.abs(pct), 1)} %, mehr als Innenräume üblicherweise verursachen.`,
      });
      const cleanValues = cleanSamples.map(s => /** @type {number} */ (s.value));
      add(g, {
        label: 'Feldstärke (Betrag)',
        sensor: `${fix(fieldMagnitude, 2)} µT zur Aufnahme${cleanValues.length > 1 ? ` (ungestörte Messungen ${fix(Math.min(...cleanValues), 1)} bis ${fix(Math.max(...cleanValues), 1)} µT)` : ''}`,
        reference: `${modelText}: Totalintensität ${fix(modelUt, 2)} µT. Modellwert des Hauptfelds ohne lokale Anomalien.`,
        comparison: readingDisturbed ? `Betrag außerhalb 25 bis 65 µT: Messung zur Aufnahme gestört (Abweichung ${fix(pct, 0)} %), nicht verwertbar.` : `Abweichung ${fix(pct, 1)} %. Innenräume mit Stahlbeton und Geräten verfälschen typischerweise 5 bis 20 %.`,
        level: fieldLevel,
      });
      repro.push({ step: 'Erdmagnetfeld', how: `WMM2025-Koeffizienten (NOAA/BGS, Epoche 2025,0) für ${fix(coordinates?.latitude ?? 0, 5)}° / ${fix(coordinates?.longitude ?? 0, 5)}°, ${fix(Math.max(0, altitudeM ?? 0) / 1000, 2)} km, Dezimaljahr ${fix(field.year, 3)}. Vergleich: geomag.bgs.ac.uk/web_service/GMModels/wmm/2025/`, result: `F ${formatInt(Math.round(field.f))} nT, I ${fix(field.inclination, 2)}°, D ${fix(field.declination, 2)}°` });
    }
    // Inklination
    if (!field) add(g, { label: 'Inklination', sensor: inclination.best ? `${fix(inclination.best.inclination, 1)}° (ruhigstes Paar)` : 'kein ruhiges Messpaar', reference: noLocation, comparison: 'Ohne Ort kein Modellwert.', level: 'offen' });
    else if (!inclination.best) {
      add(g, {
        label: 'Inklination', sensor: inclination.pairs.length ? `kein ruhiges Messpaar (${inclination.pairs.length} Paare, alle bewegt oder gestört)` : 'keine zeitgleichen Beschleunigungs- und Magnetometerwerte',
        reference: `${modelText}: ${fix(Math.abs(field.inclination), 2)}° ${field.inclination >= 0 ? 'abwärts' : 'aufwärts'}.`,
        comparison: 'Nur Paare mit |a| 0,95 bis 1,05 g, Gyroskop unter 0,2 rad/s und Feldbetrag 25 bis 65 µT sind verwertbar.', level: 'offen',
      });
    } else {
      const best = inclination.best;
      const delta = best.inclination - field.inclination;
      const signFlip = Math.abs(best.inclination + field.inclination) <= THRESHOLDS.inclinationOkDeg && Math.abs(delta) > THRESHOLDS.inclinationOkDeg && Math.abs(field.inclination) > 20;
      const effective = signFlip ? Math.abs(Math.abs(best.inclination) - Math.abs(field.inclination)) : Math.abs(delta);
      inclinationLevel = effective <= THRESHOLDS.inclinationStrongDeg ? 'stark' : effective <= THRESHOLDS.inclinationOkDeg ? 'stimmig' : 'auffaellig';
      if (signFlip && inclinationLevel === 'stark') inclinationLevel = 'stimmig';
      comparisons.push({
        key: 'inklination', label: 'Inklination', unit: '°', device: signFlip ? Math.abs(best.inclination) * Math.sign(field.inclination) : best.inclination, reference: field.inclination,
        deviceText: `${fix(Math.abs(best.inclination), 1)}° ${best.inclination >= 0 ? 'abwärts' : 'aufwärts'} (ruhigstes Sensorpaar)`, referenceText: `${fix(Math.abs(field.inclination), 2)}° ${field.inclination >= 0 ? 'abwärts' : 'aufwärts'} (WMM2025)`,
        deviation: `${fix(effective, 1)}°`, strong: THRESHOLDS.inclinationStrongDeg, ok: THRESHOLDS.inclinationOkDeg, level: inclinationLevel,
        interpretation: inclinationLevel === 'stark'
          ? `Abweichung ${fix(effective, 1)}° bei einem handgehaltenen Gerät. Die Inklination hängt vor allem von der geografischen Breite ab: ${fix(Math.abs(field.inclination), 0)}° passen zu mittleren Breiten der ${field.inclination >= 0 ? 'Nord' : 'Süd'}halbkugel und schließen weit nördlichere oder südlichere Orte aus.`
          : inclinationLevel === 'stimmig' ? `Abweichung ${fix(effective, 1)}°, für ein handgehaltenes Gerät noch stimmig.` : `Abweichung ${fix(effective, 1)}°, mehr als Handhaltung und Störfelder üblicherweise verursachen.`,
      });
      const others = inclination.pairs.filter(p => p.quiet && p !== best).map(p => fix(p.inclination, 1));
      const bestAt = iso(best.at);
      add(g, {
        label: 'Inklination',
        sensor: `${fix(Math.abs(best.inclination), 1)}° ${best.inclination >= 0 ? 'abwärts' : 'aufwärts'} (ruhigstes Paar${bestAt ? ` ${formatTime(bestAt, UTC)},${String(bestAt.getUTCMilliseconds()).padStart(3, '0')}` : ''}, |a| ${fix(best.accel, 3)} g, Gyroskop ${best.gyro !== null ? fix(best.gyro, 2) : '–'} rad/s)${others.length ? `, weitere ruhige Paare ${others.join('°, ')}°` : ''}`,
        reference: `${modelText}: ${fix(Math.abs(field.inclination), 2)}° ${field.inclination >= 0 ? 'abwärts' : 'aufwärts'}. Berechnet als Winkel zwischen Magnetfeld- und Beschleunigungsvektor (Lot) zeitgleicher Messungen minus 90°.`,
        comparison: `Abweichung ${fix(effective, 1)}°${signFlip ? ' (Vorzeichen plattformabhängig, Beträge verglichen)' : ''}. ${inclination.quiet} von ${inclination.pairs.length} Paaren ${inclination.quiet === 1 ? 'erfüllt' : 'erfüllen'} die Ruhebedingung, bewegte oder gestörte Paare sind erwartungsgemäß unbrauchbar.${inclinationLevel === 'stark' ? ' Für ein handgehaltenes Gerät sehr gut.' : ''}${Math.abs(field.inclination) > 30 ? ` Der Wert passt zur ${field.inclination >= 0 ? 'Nord' : 'Süd'}halbkugel in mittleren Breiten.` : ''}`,
        level: inclinationLevel,
      });
      const magPair = nearest(magSeries, Date.parse(best.at), THRESHOLDS.pairMaxDtMs);
      const accPair = nearest(accSeries, Date.parse(best.at), 1);
      if (magPair && accPair) {
        repro.push({ step: 'Inklination aus Sensoren', how: `Winkel zwischen a = (${fix(accPair.x, 4)} / ${fix(accPair.y, 4)} / ${fix(accPair.z, 4)}) g und B = (${fix(magPair.x, 3)} / ${fix(magPair.y, 3)} / ${fix(magPair.z, 3)}) µT: arccos(a·B / (|a|·|B|)) = ${fix(best.inclination + 90, 1)}°, Inklination = ${fix(best.inclination + 90, 1)}° − 90°`, result: `${fix(best.inclination, 1)}°` });
      }
    }
    // Deklination
    const compass = reading('compass');
    const trueHeading = num(compass?.trueHeading); const magHeading = num(compass?.magHeading);
    if (trueHeading === null || magHeading === null || trueHeading < 0 || magHeading < 0) {
      add(g, { label: 'Deklination', sensor: compass ? 'Kompass ohne geografische Richtung' : 'kein Kompass erfasst', reference: field ? `${modelText}: ${fix(Math.abs(field.declination), 2)}° ${field.declination >= 0 ? 'Ost' : 'West'}.` : '–', comparison: 'Ohne beide Kompassrichtungen keine Gerätedeklination.', level: 'offen' });
    } else if (!field) add(g, { label: 'Deklination', sensor: declinationText(trueHeading, magHeading), reference: noLocation, comparison: 'Ohne Ort kein Modellwert.', level: 'offen' });
    else {
      let deviceDeclination = trueHeading - magHeading;
      while (deviceDeclination > 180) deviceDeclination -= 360;
      while (deviceDeclination < -180) deviceDeclination += 360;
      const delta = Math.abs(deviceDeclination - field.declination);
      declinationLevel = delta <= THRESHOLDS.declinationOkDeg ? 'intern' : delta <= THRESHOLDS.declinationSuspiciousDeg ? 'auffaellig' : 'widerspruch';
      comparisons.push({
        key: 'deklination', label: 'Deklination', unit: '°', device: deviceDeclination, reference: field.declination,
        deviceText: `${fix(Math.abs(deviceDeclination), 2)}° ${deviceDeclination >= 0 ? 'Ost' : 'West'} (Kompass des Betriebssystems)`, referenceText: `${fix(Math.abs(field.declination), 2)}° ${field.declination >= 0 ? 'Ost' : 'West'} (WMM2025)`,
        deviation: `${fix(delta, 2)}°`, strong: 1, ok: THRESHOLDS.declinationOkDeg, level: declinationLevel,
        interpretation: declinationLevel === 'intern' ? 'Das Betriebssystem rechnet die Deklination selbst aus dem Weltmagnetmodell und dem GNSS-Ort. Der Wert ist deshalb kein unabhängiger Beleg, zeigt aber, dass das Gerät zur Aufnahmezeit diesen Ort kannte.'
          : declinationLevel === 'auffaellig' ? 'Die Gerätedeklination gehört zu einem anderen Ort oder einem veralteten Modell.' : 'Die Gerätedeklination gehört zu einem weit entfernten Ort. Das Gerät kannte den angegebenen Standort zur Aufnahmezeit nicht.',
      });
      add(g, {
        label: 'Deklination', sensor: declinationText(trueHeading, magHeading),
        reference: `${modelText}: ${fix(Math.abs(field.declination), 2)}° ${field.declination >= 0 ? 'Ost' : 'West'}.`,
        comparison: `Abweichung ${fix(delta, 2)}°. ${declinationLevel === 'intern' ? 'Passt. Das Betriebssystem rechnet den Wert selbst aus dem Weltmagnetmodell und dem GNSS-Ort, deshalb kein unabhängiger Beleg, aber Nachweis, dass das Gerät zur Aufnahmezeit diesen Ort kannte.' : declinationLevel === 'auffaellig' ? 'Das Betriebssystem hat die Deklination für einen anderen Ort oder mit veraltetem Modell gerechnet.' : 'Die Gerätedeklination gehört zu einem anderen Ort. Das Gerät kannte zur Aufnahmezeit nicht den angegebenen Standort.'}`,
        level: declinationLevel,
      });
    }
    // Störungen
    if (magMagnitudes.length) {
      const maxValue = Math.max(...magMagnitudes.map(s => /** @type {number} */ (s.value)));
      const phases = [...new Set(disturbedSamples.map(s => s.phase))].join(', ');
      const level = disturbedSamples.length ? 'auffaellig' : 'stimmig';
      add(g, {
        label: 'Gestörte Messungen',
        sensor: disturbedSamples.length ? `${disturbedSamples.length} von ${magMagnitudes.length} Messungen außerhalb 25 bis 65 µT (${phases}, bis ${fix(maxValue, 0)} µT)` : `alle ${magMagnitudes.length} Messungen im Erdfeldbereich (${fix(Math.min(...magMagnitudes.map(s => /** @type {number} */ (s.value))), 1)} bis ${fix(maxValue, 1)} µT)`,
        reference: field ? `Erdfeld am Ort ${fix(field.f / 1000, 1)} µT (WMM2025). Beträge außerhalb 25 bis 65 µT gelten als gestört.` : 'Erdfeld weltweit 25 bis 65 µT.',
        comparison: disturbedSamples.length
          ? `${readingDisturbed ? 'Auch die Messung zur Aufnahme ist gestört.' : 'Die Messung zur Aufnahme ist sauber.'} Störfelder entstehen durch Laptop, Metalltisch, Magnetverschluss oder Lautsprecher in Gerätenähe. Kein Widerspruch zum Ort, aber ein Hinweis, dass nur ruhige, störungsfreie Messungen zählen.`
          : 'Keine Störfelder, die Magnetometerwerte sind durchgehend verwertbar.',
        level,
      });
    }
    g.weight = fieldLevel === 'stark' && inclinationLevel === 'stark'
      ? `Beweiswert hoch. Betrag und Inklination sind zwei unabhängige Größen, die beide zum Modell passen.${field && Math.abs(field.inclination) > 30 ? ` Eine Inklination von ${fix(Math.abs(field.inclination), 0)}° schließt beispielsweise ${field.inclination >= 0 ? 'Südeuropa (unter 55°) und Skandinavien (über 72°)' : 'die Nordhalbkugel'} aus.` : ''}`
      : fieldLevel === 'offen' && inclinationLevel === 'offen' ? 'Beweiswert nicht bestimmbar. Ohne Ort oder ruhige Messpaare bleibt das Magnetfeld ungeprüft.'
        : declinationLevel === 'widerspruch' ? 'Beweiswert kritisch. Die Gerätedeklination passt nicht zum angegebenen Ort.'
          : 'Beweiswert mittel. Das Magnetometer arbeitet ohne GNSS. Abweichungen im Innenraum sind üblich, grobe Abweichungen nicht.';
  }

  // ---- 5 Licht, Sonne und Tageszeit ----
  let sunLevel = /** @type {Level} */ ('offen');
  let lightLevel = /** @type {Level} */ ('offen');
  let exposureLevel = /** @type {Level} */ ('offen');
  {
    const g = group('licht', 'Licht, Sonne und Tageszeit', '');
    const sunrise = (weather?.sunrise ? iso(weather.sunrise) : null) ?? sun?.sunrise ?? null;
    const sunset = (weather?.sunset ? iso(weather.sunset) : null) ?? sun?.sunset ?? null;
    const sunTimesSource = weather?.sunrise ? 'Open-Meteo' : 'berechnet';
    const daylight = sun ? sun.altitude > -6 : null;
    if (!sun || !captureTime) add(g, { label: 'Sonnenstand', sensor: captureTime ? `Gerätezeit ${utcTime(captureTime)}` : 'keine Gerätezeit', reference: noLocation, comparison: 'Ohne Ort und Zeit kein Sonnenstand.', level: 'offen' });
    else {
      let comparison;
      if (sunset && sunrise && sun.altitude > 0) {
        const toSunset = sunset.getTime() - captureTime.getTime();
        const fromSunrise = captureTime.getTime() - sunrise.getTime();
        comparison = toSunset < fromSunrise ? `Aufnahme ${durationText(toSunset)} vor Sonnenuntergang, Tageslicht erwartet.` : `Aufnahme ${durationText(fromSunrise)} nach Sonnenaufgang, Tageslicht erwartet.`;
      } else if (sun.altitude > -6) comparison = 'Aufnahme in der bürgerlichen Dämmerung, schwaches Tageslicht erwartet.';
      else if (sun.altitude > -18) comparison = 'Aufnahme in der Dämmerung oder Nacht, kaum Tageslicht erwartet.';
      else comparison = 'Aufnahme bei Nacht, kein Tageslicht erwartet.';
      if (light !== null) {
        const consistent = daylight ? light >= 50 || sun.altitude < 10 : light < 2000;
        sunLevel = consistent ? 'stimmig' : 'auffaellig';
        comparison += consistent ? ` Der Lichtsensor (${formatInt(Math.round(light))} lx) passt dazu.` : ` Der Lichtsensor (${formatInt(Math.round(light))} lx) passt nicht dazu: ${daylight ? 'bei Tageslicht ungewöhnlich dunkel (Sensor verdeckt oder fensterloser Raum)' : 'bei Nacht ungewöhnlich hell (Scheinwerfer oder Lampe direkt am Sensor)'}.`;
      } else comparison += ' Ohne Lichtsensor ist die Bildhelligkeit von Hand zu beurteilen.';
      add(g, {
        label: 'Sonnenstand', sensor: `Gerätezeit ${utcTime(captureTime)}`,
        reference: `Berechnet (NOAA-Algorithmus): Sonnenhöhe ${fix(sun.altitude, 1)}°, Azimut ${fix(sun.azimuth, 0)}° (${compassPoint(sun.azimuth)}).${sunrise && sunset ? ` Sonnenaufgang ${utcTime(sunrise)}, Untergang ${utcTime(sunset)} (${sunTimesSource}).` : ''}`,
        comparison, level: sunLevel,
      });
      repro.push({ step: 'Sonnenstand', how: `NOAA Solar Calculator für ${fix(coordinates?.latitude ?? 0, 5)}° N / ${fix(coordinates?.longitude ?? 0, 5)}° O, ${captureTime.toISOString().replace('.000Z', 'Z')}`, result: `Höhe ${fix(sun.altitude, 1)}°, Azimut ${fix(sun.azimuth, 0)}°` });
    }
    if (weather && weather.cloudCover !== null) {
      const cc = weather.cloudCover;
      add(g, {
        label: 'Bewölkung', sensor: 'Bildeindruck (nicht automatisch ausgewertet)',
        reference: `Open-Meteo ${weather.hour.slice(11)} UTC: Bewölkung ${formatMeasure(cc, 0)} %${weather.directRadiation !== null ? `, Direktstrahlung ${formatMeasure(weather.directRadiation, 0)} W/m²` : ''}${weather.diffuseRadiation !== null ? `, Diffusstrahlung ${formatMeasure(weather.diffuseRadiation, 0)} W/m²` : ''}${weather.precipitation !== null ? `, ${weather.precipitation > 0 ? `${fix(weather.precipitation, 1)} mm Niederschlag` : 'kein Niederschlag'}` : ''} (Modellwerte).`,
        comparison: `${cc >= 80 ? 'Bedeckt: diffuses Licht ohne harte Schatten erwartet' : cc <= 30 ? 'Weitgehend klar: harte Schatten und direkte Sonne erwartet' : 'Wechselnd bewölkt: Schatten möglich'}. Mit dem Foto von Hand abzugleichen. Der Schattenwurf setzt eine belegte Blickrichtung voraus (Gruppe 6).`,
        level: 'offen',
      });
    } else add(g, { label: 'Bewölkung', sensor: 'Bildeindruck (nicht automatisch ausgewertet)', reference: `Open-Meteo: ${queryError('Open-Meteo') ?? noLocation}.`, comparison: 'Keine Wetterdaten zum Abgleich.', level: 'offen' });
    if (light === null) add(g, { label: 'Beleuchtungsstärke', sensor: 'nicht erfasst', reference: 'Erfahrungswerte: Innenraum nahe Fenster bei bedecktem Himmel 500 bis 3.000 lx, draußen bedeckt 5.000 bis 20.000 lx, Kunstlicht im Café 100 bis 500 lx.', comparison: 'Kein Lichtsensor (iPhones stellen ihn Apps nicht bereit).', level: 'offen' });
    else {
      const previous = lightSeries.filter(s => num(s.illuminance) !== null && s.at !== reading('light')?.at);
      const prevText = previous.length ? `, zuvor ${previous.map(s => formatInt(Math.round(/** @type {number} */ (num(s.illuminance))))).join(' und ')} lx` : '';
      lightLevel = sunLevel === 'auffaellig' ? 'auffaellig' : 'stimmig';
      add(g, {
        label: 'Beleuchtungsstärke', sensor: `${formatInt(Math.round(light))} lx zur Aufnahme${prevText}`,
        reference: 'Erfahrungswerte: Innenraum nahe Fenster bei bedecktem Himmel 500 bis 3.000 lx, draußen bedeckt 5.000 bis 20.000 lx, Sonne 50.000 bis 100.000 lx, Kunstlicht 100 bis 500 lx, Nacht draußen unter 1 lx.',
        comparison: `Passt zu: ${illuminanceClass(light)}.${sun ? (lightLevel === 'stimmig' ? ` Mit Sonnenhöhe ${fix(sun.altitude, 1)}° vereinbar.` : ` Mit Sonnenhöhe ${fix(sun.altitude, 1)}° schwer vereinbar.`) : ''}`,
        level: lightLevel,
      });
    }
    const exposureTime = num(exif.exposureTime); const fNumber = num(exif.fNumber); const isoValue = num(exif.iso);
    if (exposureTime && fNumber && isoValue) {
      const ev = exposureValue(exposureTime, fNumber, isoValue);
      const lux = illuminanceFromExposure(ev);
      let comparison = `Kamera (Belichtungsautomatik) und Lichtsensor sind zwei getrennte Bauteile.`;
      if (light !== null) {
        const classes = Math.abs(Math.log2(Math.max(1, light) / lux.center));
        exposureLevel = classes <= THRESHOLDS.exposureClassLog2 ? 'intern' : 'auffaellig';
        const sensorEv = Math.log2(Math.max(1, light) / 2.5);
        comparisons.push({
          key: 'helligkeit', label: 'Helligkeit', unit: 'EV', device: sensorEv, reference: ev,
          deviceText: `${formatInt(Math.round(light))} lx Lichtsensor, entspricht EV ${fix(sensorEv, 1)}`, referenceText: `EV ${fix(ev, 1)} aus Belichtung ${exposureTime >= 1 ? `${fix(exposureTime, 1)} s` : `1/${Math.round(1 / exposureTime)} s`}, f/${formatMeasure(fNumber, 1)}, ISO ${formatInt(isoValue)}`,
          deviation: `${fix(classes, 1)} Lichtwerte`, strong: 1, ok: THRESHOLDS.exposureClassLog2, level: exposureLevel,
          interpretation: exposureLevel === 'intern' ? 'Lichtsensor und Kamera sind zwei getrennte Bauteile und messen dieselbe Helligkeitsklasse (ein Lichtwert entspricht einer Verdopplung). Das spricht dagegen, dass das Bild in einer anderen Lichtsituation entstand als die Sensorwerte.'
            : 'Kamera und Lichtsensor sahen verschiedene Helligkeiten: Die Kamera belichtete auf ein anderes Motiv, oder der Sensor war verdeckt.',
        });
        comparison = exposureLevel === 'intern' ? `Lichtsensor ${formatInt(Math.round(light))} lx: Kamera und Lichtsensor, zwei getrennte Bauteile, messen dieselbe Helligkeitsklasse.` : `Lichtsensor ${formatInt(Math.round(light))} lx liegt ${fix(classes, 1)} Lichtwerte neben der Belichtung: Kamera auf ein anderes Motiv belichtet oder Sensor verdeckt.`;
      } else comparison += ' Ohne Lichtsensor kein Gegenwert.';
      add(g, {
        label: 'Belichtung (EXIF)', sensor: `${exposureTime >= 1 ? `${fix(exposureTime, 1)} s` : `1/${Math.round(1 / exposureTime)} s`} · f/${formatMeasure(fNumber, 1)} · ISO ${formatInt(isoValue)}`,
        reference: `Lichtwert EV100 ≈ ${fix(ev, 1)}, entspricht grob ${formatInt(Math.round(lux.low / 100) * 100)} bis ${formatInt(Math.round(lux.high / 100) * 100)} lx Szenenbeleuchtung (Faustformel lx ≈ 2,5 · 2^EV).`,
        comparison, level: exposureLevel,
      });
      repro.push({ step: 'Lichtwert aus EXIF', how: `EV100 = log2(N² / t) − log2(ISO / 100) = log2(${fix(fNumber * fNumber, 2)} · ${fix(1 / exposureTime, 0)}) − log2(${fix(isoValue / 100, 2)})`, result: fix(ev, 1) });
    } else add(g, { label: 'Belichtung (EXIF)', sensor: 'keine Belichtungsdaten im EXIF', reference: '–', comparison: 'Lichtwert nicht berechenbar.', level: 'offen' });
    g.weight = sunLevel === 'stimmig' || exposureLevel === 'intern'
      ? 'Beweiswert mittel. Die Lichtwerte grenzen die Tageszeit nur grob ein, bestätigen aber unabhängig voneinander die Lichtsituation und sprechen gegen eine nächtliche Aufnahme mit nachträglich gesetzter Zeit.'
      : sunLevel === 'auffaellig' || exposureLevel === 'auffaellig' ? 'Beweiswert kritisch bis mittel. Mindestens ein Lichtwert passt nicht zur erwarteten Lichtsituation.'
        : 'Beweiswert gering. Ohne Lichtsensor oder Belichtungsdaten bleibt die Tageszeit nur rechnerisch bestimmt.';
  }

  // ---- 6 Gerät, Kamera und Bewegung ----
  let cameraLevel = /** @type {Level} */ ('offen');
  let rotationLevel = /** @type {Level} */ ('offen');
  const rotation = compassAgainstGyroscope(sensors);
  {
    const g = group('geraet', 'Gerät, Kamera und Bewegung', '');
    const exifModel = [exif.make, exif.model].filter(Boolean).join(' ').trim();
    const deviceModel = typeof device?.model === 'string' ? device.model : '';
    const photoInfo = analysis.photoInfo;
    const sensorParts = [];
    if (exifModel) sensorParts.push(`EXIF: ${exifModel}`);
    if (num(exif.fNumber)) sensorParts.push(`f/${formatMeasure(exif.fNumber, 1)}`);
    if (num(exif.focalLength)) sensorParts.push(`${formatMeasure(exif.focalLength, 2)} mm`);
    if (photoInfo?.width && photoInfo.height) sensorParts.push(`${formatInt(photoInfo.width)} × ${formatInt(photoInfo.height)} px`);
    if (!exifModel) add(g, { label: 'Kameramodul', sensor: sensorParts.join(' · ') || 'keine EXIF-Kameradaten', reference: deviceModel ? `Geräteangabe im Manifest: ${deviceModel}.` : 'Keine Geräteangabe im Manifest.', comparison: 'Ohne EXIF-Modell kein Abgleich.', level: 'offen' });
    else if (!deviceModel) add(g, { label: 'Kameramodul', sensor: sensorParts.join(' · '), reference: 'Keine Geräteangabe im Manifest.', comparison: 'Kein Gegenwert.', level: 'offen' });
    else {
      const normalize = (/** @type {string} */ s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const match = normalize(exifModel).includes(normalize(deviceModel)) || normalize(deviceModel).includes(normalize(String(exif.model ?? ''))) && String(exif.model ?? '').length >= 3;
      cameraLevel = match ? 'stimmig' : 'auffaellig';
      add(g, {
        label: 'Kameramodul', sensor: sensorParts.join(' · '), reference: `Geräteangabe im Manifest: ${deviceModel}.`,
        comparison: match ? 'EXIF-Modell und Geräteangabe stimmen überein. Blende und Brennweite lassen sich mit den Kameradaten des Modells vergleichen (von Hand).' : 'EXIF-Modell und Geräteangabe stimmen nicht überein: Bild stammt aus einer anderen Kamera oder das EXIF wurde verändert.',
        level: cameraLevel,
      });
    }
    if (accelMagnitude === null) add(g, { label: 'Beschleunigung', sensor: 'nicht erfasst', reference: 'Erdbeschleunigung 1,000 g bei ruhendem Gerät.', comparison: 'Kein Beschleunigungssensor erfasst.', level: 'offen' });
    else {
      const tilt = Math.acos(Math.min(1, Math.abs(num(acc?.z) ?? 0) / accelMagnitude)) / DEG;
      const level = quietAccel ? 'stimmig' : 'auffaellig';
      comparisons.push({
        key: 'ruhelage', label: 'Ruhelage', unit: 'g', device: accelMagnitude, reference: 1,
        deviceText: `|a| ${fix(accelMagnitude, 3)} g (Beschleunigungssensor)`, referenceText: '1,000 g Erdbeschleunigung bei ruhendem Gerät',
        deviation: `${fix(accelMagnitude - 1, 3)} g`, strong: 0.05, ok: 0.1, level,
        interpretation: quietAccel ? `Das Gerät war nahezu ruhig, das Display um ${fix(tilt, 0)}° aus der Horizontalen gekippt${android ? ' (Moment nach dem Auslösen)' : ''}. Nur so sind Inklination und Magnetfeld verwertbar.` : 'Das Gerät war in Bewegung. Inklination und Kompass sind in diesem Moment nicht belastbar.',
      });
      add(g, {
        label: 'Beschleunigung', sensor: `|a| ${fix(accelMagnitude, 3)} g zur Aufnahme${accMagnitudes.length > 1 ? ` (Reihe ${fix(Math.min(.../** @type {number[]} */ (accMagnitudes)), 2)} bis ${fix(Math.max(.../** @type {number[]} */ (accMagnitudes)), 2)} g)` : ''}`,
        reference: 'Erdbeschleunigung 1,000 g bei ruhendem Gerät.',
        comparison: `${quietAccel ? 'Gerät nahezu ruhig.' : 'Gerät in Bewegung (Handbewegung oder Stoß).'} Vektor (${fix(num(acc?.x) ?? 0, 2)} / ${fix(num(acc?.y) ?? 0, 2)} / ${fix(num(acc?.z) ?? 0, 2)} g): Display um ${fix(tilt, 0)}° aus der Horizontalen gekippt${android ? ', Moment nach dem Auslösen (siehe Lesehinweis zu Android)' : ''}.`,
        level,
      });
    }
    if (!rotation) add(g, { label: 'Kompass gegen Gyroskop', sensor: 'zu wenige Kompasswerte', reference: 'Gyroskop im selben Zeitraum.', comparison: 'Kein Abgleich möglich.', level: 'offen' });
    else {
      const from = iso(rotation.from); const to = iso(rotation.to);
      let comparison;
      if (rotation.gyroRate === null) { comparison = 'Kein Gyroskopwert im selben Zeitraum.'; rotationLevel = 'offen'; }
      else if (rotation.compassRate >= 0.3 && rotation.gyroRate >= 0.3 && rotation.compassRate / rotation.gyroRate <= 2.5 && rotation.gyroRate / rotation.compassRate <= 2.5) { comparison = 'Zwei getrennte Sensoren messen dieselbe Drehung (Vorzeichen ist Konventionssache). Spricht gegen erfundene Reihen.'; rotationLevel = 'intern'; }
      else if (rotation.compassRate < 0.3 && rotation.gyroRate < 0.3) { comparison = 'Beide Sensoren zeigen ein ruhig gehaltenes Gerät.'; rotationLevel = 'intern'; }
      else if ((rotation.compassRate >= 0.5 && rotation.gyroRate < 0.1) || (rotation.gyroRate >= 0.5 && rotation.compassRate < 0.1)) { comparison = 'Ein Sensor meldet eine deutliche Drehung, der andere nicht. Störfeld oder Kalibrierung des Kompasses prüfen.'; rotationLevel = 'auffaellig'; }
      else { comparison = 'Drehraten liegen auseinander, aber im Bereich von Kompassrauschen und Kalibrierung.'; rotationLevel = 'offen'; }
      if (rotation.gyroRate !== null) {
        comparisons.push({
          key: 'drehrate', label: 'Drehrate', unit: 'rad/s', device: rotation.compassRate, reference: rotation.gyroRate,
          deviceText: `${fix(rotation.compassRate, 2)} rad/s aus der Kompassreihe (${fix(Math.abs(rotation.headingChange), 0)}° in ${fix(rotation.seconds, 2)} s)`, referenceText: `${fix(rotation.gyroRate, 2)} rad/s Gyroskop im selben Zeitraum`,
          deviation: `${fix(rotation.compassRate - rotation.gyroRate, 2)} rad/s`, strong: Math.max(0.15, rotation.gyroRate * 0.5), ok: Math.max(0.3, rotation.gyroRate * 1.5), level: rotationLevel,
          interpretation: rotationLevel === 'intern' ? (rotation.compassRate >= 0.3 ? 'Zwei getrennte Sensoren sehen dieselbe Schwenkbewegung. Erfundene Reihen müssten diese Kopplung nachbilden.' : 'Beide Sensoren zeigen ein ruhig gehaltenes Gerät.')
            : rotationLevel === 'auffaellig' ? 'Ein Sensor meldet eine deutliche Drehung, der andere nicht. Störfeld oder Kalibrierung des Kompasses prüfen.' : 'Die Drehraten liegen auseinander, aber im Bereich von Kompassrauschen und Kalibrierung.',
        });
      }
      add(g, {
        label: 'Kompass gegen Gyroskop',
        sensor: `Richtung ändert sich um ${fix(Math.abs(rotation.headingChange), 0)}° in ${fix(rotation.seconds, 2)} s (${rotation.phase}${from && to ? `, ${formatTime(from, UTC)} bis ${formatTime(to, UTC)}` : ''}) = ${fix(rotation.compassRate, 2)} rad/s`,
        reference: rotation.gyroRate === null ? 'Kein Gyroskopwert im Zeitraum.' : `Gyroskop zur selben Zeit: mittlere Drehrate ${fix(rotation.gyroRate, 2)} rad/s (${rotation.gyroCount} Messungen).`,
        comparison, level: rotationLevel,
      });
    }
    const compass = reading('compass');
    const compassSeries = series(sensors, 'compass');
    if (compass) {
      const headings = compassSeries.map(s => num(s.trueHeading) ?? num(s.magHeading)).filter(v => v !== null && v >= 0);
      const current = num(compass.trueHeading) ?? num(compass.magHeading);
      const others = headings.filter(v => v !== current);
      const outlier = current !== null && others.length >= 3 && others.every(v => angularDistance(/** @type {number} */ (v), current) > 45);
      add(g, {
        label: 'Kompassrichtung', sensor: `${current !== null ? `${fix(current, 1)}°` : '–'}${num(compass.accuracy) !== null ? ` (Kalibrierung Stufe ${formatMeasure(compass.accuracy)})` : ''}${others.length ? `, Reihe ${fix(Math.min(.../** @type {number[]} */ (others)), 0)} bis ${fix(Math.max(.../** @type {number[]} */ (others)), 0)}°` : ''}`,
        reference: 'Keine Referenz für die Blickrichtung.',
        comparison: outlier ? 'Der Einzelwert fällt aus der Reihe, die Reihe zeigt eine Schwenkbewegung. Für die Blickrichtung nicht verwertbar.' : 'Blickrichtung nur als Geräteangabe, für Schattenabgleiche nicht belastbar.',
        level: 'offen',
      });
    }
    g.weight = 'Beweiswert mittel. Die Bewegungsdaten belegen keinen Ort, zeigen aber, ob sich das Gerät wie ein echtes, in der Hand gehaltenes Gerät verhält: Rauschen, Drehung, Störfeld, Pause während der Kamera.';
  }

  // ---- 7 Zeitanker ----
  let btcLevel = /** @type {Level} */ ('offen');
  let doiLevel = /** @type {Level} */ ('offen');
  let exifTimeLevel = /** @type {Level} */ ('offen');
  {
    const g = group('zeitanker', 'Zeitanker', '');
    const notQueried = online ? null : 'Kette nicht abgefragt (Prüfung ohne Onlineabgleich).';
    for (const key of /** @type {const} */ (['bitcoin', 'doichain'])) {
      const block = pre?.[key];
      const status = key === 'bitcoin' ? btcPre : doiPre;
      const label = key === 'bitcoin' ? 'Bitcoin-Vorabblock' : 'Doichain-Vorabblock';
      if (!block) { add(g, { label, sensor: 'kein Vorabblock im Paket', reference: '–', comparison: 'Ohne Vorabblock fehlt der Beleg, dass das Paket nicht vorbereitet wurde.', level: 'offen' }); continue; }
      const time = iso(block.headerTimeUtc);
      const sensor = `${formatInt(block.height)} · ${time ? utcTime(time) : '–'}, Hash ${shortHash(String(block.hash))}`;
      const source = key === 'bitcoin' ? 'blockstream.info' : 'Doichain-Knoten (doi-api.sendlabs.de)';
      let level = /** @type {Level} */ ('offen'); let reference; let comparison;
      if (!status) { reference = notQueried ?? 'Vorabblock nicht abgefragt.'; comparison = 'Nicht unabhängig bestätigt.'; }
      else if (status.status === 'matched') { level = 'stark'; reference = `${source}: Höhe ${formatInt(block.height)}, Zeit ${time ? utcDateTime(time) : '–'}, Hash identisch.`; comparison = `Paket kann frühestens um ${time ? utcTime(time) : '–'} entstanden sein.`; }
      else if (status.status === 'failed') { level = 'widerspruch'; reference = `${source}: ${status.details}`; comparison = 'Der im Paket genannte Block existiert so nicht auf der Kette.'; }
      else { reference = `${source}: ${status.details || 'nicht erreichbar'}.`; comparison = 'Nicht unabhängig bestätigt.'; }
      if (key === 'bitcoin') btcLevel = level;
      add(g, { label, sensor, reference, comparison, level });
      if (status?.status === 'matched') repro.push({ step: `${key === 'bitcoin' ? 'Bitcoin' : 'Doichain'}-Vorabblock`, how: key === 'bitcoin' ? `blockstream.info/api/block/${block.hash}` : `doi-api.sendlabs.de/mcp · get_block ${block.hash} (oder jeder Doichain-Knoten: getblock)`, result: `Höhe ${formatInt(block.height)}, ${time ? utcTime(time) : '–'}` });
    }
    const verification = /** @type {Record<string, any>} */ (analysis.verification ?? {});
    if (!online) add(g, { label: 'Doichain-Block (Versiegelung)', sensor: verification.blockHeight ? `laut Export Block ${formatInt(Number(verification.blockHeight))}` : 'laut Export noch offen', reference: notQueried ?? '', comparison: 'Nicht unabhängig bestätigt.', level: 'offen' });
    else if (anchor?.status === 'matched') {
      const inWindow = captureTime && sealedAt ? (!btcTime || captureTime >= btcTime) && captureTime <= sealedAt : null;
      doiLevel = inWindow === false ? 'auffaellig' : 'stark';
      if (captureTime && sealedAt && btcTime && btcLevel === 'stark') {
        const windowMin = (sealedAt.getTime() - btcTime.getTime()) / 60000;
        const deviceMin = (captureTime.getTime() - btcTime.getTime()) / 60000;
        comparisons.push({
          key: 'zeitfenster', label: 'Zeitfenster', unit: 'min', device: deviceMin, reference: windowMin / 2,
          deviceText: `Gerätezeit ${utcTime(captureTime)}, ${fix(deviceMin, 0)} min nach dem Bitcoin-Block`, referenceText: `Fenster ${utcTime(btcTime)} bis ${utcTime(sealedAt)} (${fix(windowMin, 0)} min, beide Ketten)`,
          deviation: inWindow ? 'im Fenster' : 'außerhalb', strong: windowMin / 2, ok: windowMin / 2, level: doiLevel,
          scale: { min: Math.min(0, deviceMin - 2), max: Math.max(windowMin, deviceMin + 2), minLabel: `Bitcoin-Block ${formatTime(btcTime, UTC)}`, maxLabel: `Doichain-Block ${formatTime(sealedAt, UTC)}`, referenceLabel: 'Fenster' },
          interpretation: inWindow ? `Die Gerätezeit liegt ${fix(deviceMin, 0)} Minuten nach dem Bitcoin-Vorabblock und ${fix(windowMin - deviceMin, 0)} Minuten vor dem Doichain-Block. Beide Blöcke sind öffentlich und unabhängig bestätigt, das Paket kann also nur in diesem Fenster entstanden sein.` : `Die Gerätezeit liegt außerhalb des von beiden Ketten belegten Fensters. Die Geräteuhr ging ${captureTime > sealedAt ? 'vor' : 'nach'}.`,
        });
      }
      add(g, {
        label: 'Doichain-Block (Versiegelung)', sensor: `${anchor.blockHeight !== undefined ? formatInt(anchor.blockHeight) : '–'} · ${sealedAt ? utcTime(sealedAt) : 'Blockzeit nicht gemeldet'}${anchor.txid ? `, Transaktion ${shortHash(anchor.txid)}` : ''}`,
        reference: `Doichain-Knoten: Höhe ${anchor.blockHeight !== undefined ? formatInt(anchor.blockHeight) : '–'}${sealedAt ? `, Zeit ${utcDateTime(sealedAt)}` : ''}, Hash identisch${anchor.confirmations ? `, ${formatInt(anchor.confirmations)} Bestätigungen` : ''}.`,
        comparison: sealedAt ? `Paket existierte spätestens um ${utcTime(sealedAt)}.${captureTime ? inWindow ? ` Gerätezeit ${utcTime(captureTime)} liegt im Fenster${btcTime ? ` von ${durationText(sealedAt.getTime() - btcTime.getTime())}` : ''}.` : ` Gerätezeit ${utcTime(captureTime)} liegt außerhalb des Fensters: Geräteuhr geht ${captureTime > sealedAt ? 'vor' : 'nach'}.` : ''}` : 'Blockzeit nicht gemeldet.',
        level: doiLevel,
      });
      if (anchor.blockHash) repro.push({ step: 'Doichain-Block', how: `doi-api.sendlabs.de/mcp · get_block ${anchor.blockHash} (oder jeder Doichain-Knoten: getblock)`, result: `${sealedAt ? utcTime(sealedAt) : '–'}${anchor.txid ? `, Transaktion ${shortHash(anchor.txid)} enthalten` : ''}` });
    } else {
      doiLevel = anchor?.status === 'failed' ? 'widerspruch' : 'offen';
      add(g, {
        label: 'Doichain-Block (Versiegelung)', sensor: anchor?.txid ? `Transaktion ${shortHash(anchor.txid)}` : 'noch kein Block',
        reference: `Doichain-Knoten: ${anchor?.status === 'pending' ? 'Einreichung noch unbestätigt' : anchor?.status === 'failed' ? (online.checks.find(c => c.name === 'Doichain-Transaktion')?.details ?? 'Widerspruch') : 'nicht erreichbar'}.`,
        comparison: doiLevel === 'widerspruch' ? 'Die Kettenabfrage widerspricht dem Paket.' : 'Noch kein spätester Zeitpunkt belegt.', level: doiLevel,
      });
    }
    const exifTime = typeof exif.dateTimeOriginal === 'string' ? exif.dateTimeOriginal : typeof exif.dateTime === 'string' ? exif.dateTime : null;
    const exifOffset = typeof exif.offsetTimeOriginal === 'string' ? exif.offsetTimeOriginal : null;
    if (exifTime && captureTime) {
      const parsed = parseExifTime(exifTime);
      if (parsed !== null) {
        let diffMs; let offsetText;
        if (exifOffset && /^[+-]\d\d:\d\d$/.test(exifOffset)) {
          const sign = exifOffset.startsWith('-') ? -1 : 1;
          const offsetMinutes = sign * (Number(exifOffset.slice(1, 3)) * 60 + Number(exifOffset.slice(4, 6)));
          diffMs = parsed - offsetMinutes * 60000 - captureTime.getTime();
          offsetText = `Zeitzone laut EXIF ${exifOffset}`;
        } else {
          // Ohne Zeitzone: beste Erklärung durch einen Versatz in Viertelstunden zwischen −14 und +14 Stunden
          let best = Infinity; let bestOffset = 0;
          for (let minutes = -14 * 60; minutes <= 14 * 60; minutes += 15) {
            const d = parsed - minutes * 60000 - captureTime.getTime();
            if (Math.abs(d) < Math.abs(best)) { best = d; bestOffset = minutes; }
          }
          diffMs = best;
          offsetText = `ohne Zeitzone im EXIF, als Ortszeit UTC${bestOffset >= 0 ? '+' : '−'}${Math.floor(Math.abs(bestOffset) / 60)}${Math.abs(bestOffset) % 60 ? `:${String(Math.abs(bestOffset) % 60).padStart(2, '0')}` : ''} gelesen`;
        }
        exifTimeLevel = Math.abs(diffMs) <= 5 * 60000 ? 'intern' : 'auffaellig';
        add(g, {
          label: 'Aufnahmezeit laut EXIF', sensor: `${exifTime}${exifOffset ? ` (${exifOffset})` : ''}`,
          reference: `Gerätezeit der App ${utcDateTime(captureTime)} (${offsetText}).`,
          comparison: exifTimeLevel === 'intern' ? `Kamera-App und DoiProof nennen dieselbe Zeit (Unterschied ${durationExact(diffMs)}${android ? ', Rückkehr aus der Kamera erfolgt nach dem Auslösen' : ''}).` : `Kamerauhr und App-Zeit liegen ${durationText(Math.abs(diffMs))} auseinander: Bild älter als die Paketerstellung oder Uhren verstellt.`,
          level: exifTimeLevel,
        });
      }
    } else add(g, { label: 'Aufnahmezeit laut EXIF', sensor: exifTime ?? 'keine EXIF-Zeit', reference: captureTime ? `Gerätezeit der App ${utcDateTime(captureTime)}.` : '–', comparison: 'Kein Abgleich möglich.', level: 'offen' });
    add(g, {
      label: 'GPS-Angaben im EXIF', sensor: exif.hasGps ? 'vorhanden, vom Prüfer nicht ausgelesen' : 'keine',
      reference: 'Könnten gegen den GNSS-Wert des Manifests geprüft werden.',
      comparison: exif.hasGps ? 'Der Prüfer liest EXIF-Koordinaten bewusst nicht aus (Datenschutz), deshalb kein Abgleich.' : 'Die Kamera-App hat keine Ortsangaben ins Bild geschrieben.', level: 'offen',
    });
    g.weight = btcLevel === 'stark' && doiLevel === 'stark'
      ? 'Beweiswert hoch. Beide Ketten sind öffentlich. Der Bitcoin-Vorabblock schließt eine Vorbereitung des Pakets aus, der Doichain-Block eine spätere Erstellung.'
      : btcLevel === 'widerspruch' || doiLevel === 'widerspruch' ? 'Beweiswert kritisch. Die Kettenabfrage widerspricht den Angaben im Paket.'
        : 'Beweiswert begrenzt. Ohne bestätigte Zeitanker ist das Zeitfenster der Aufnahme nicht unabhängig belegt.';
  }

  // ---- Zusammenfassung ----
  const all = groups.flatMap(g => g.findings);
  /** @type {Record<Level, number>} */
  const counts = { stark: 0, stimmig: 0, intern: 0, auffaellig: 0, offen: 0, widerspruch: 0 };
  for (const f of all) counts[f.level]++;
  const matched = counts.stark + counts.stimmig;
  const tone = counts.widerspruch ? 'failed' : counts.stark ? 'passed' : 'incomplete';
  const sentence = counts.widerspruch ? (counts.widerspruch === 1 ? 'Eine Angabe widerspricht den Referenzdaten.' : `${counts.widerspruch} Angaben widersprechen den Referenzdaten.`)
    : counts.stark ? 'Die Indizienlage stützt die Aufnahmedaten. Kein Wert widerspricht.'
      : matched ? 'Die prüfbaren Angaben passen zu den Referenzdaten. Kein Wert widerspricht.'
        : 'Es ließen sich keine Angaben gegen Referenzdaten prüfen.';
  const detail = `${matched} von ${all.length} versiegelten Angaben stimmen mit Referenzdaten überein, ${counts.stark} davon eng. ${counts.intern} ${counts.intern === 1 ? 'ist' : 'sind'} intern konsistent, ${counts.auffaellig} ${counts.auffaellig === 1 ? 'ist' : 'sind'} auffällig ohne Widerspruch, ${counts.offen} ${counts.offen === 1 ? 'ist' : 'sind'} nicht prüfbar${counts.widerspruch ? `, ${counts.widerspruch} ${counts.widerspruch === 1 ? 'widerspricht' : 'widersprechen'}` : ''}.`;

  /** @type {OverviewTile[]} */
  const overview = groups.map(g => {
    const levels = g.findings.map(f => f.level);
    const kind = levels.includes('widerspruch') ? 'failed' : levels.includes('auffaellig') && !levels.includes('stark') ? 'warning' : levels.includes('stark') ? 'proof' : levels.includes('stimmig') || levels.includes('intern') ? 'hint' : 'neutral';
    const state = kind === 'failed' ? 'Widerspruch' : kind === 'proof' ? 'bestätigt' : kind === 'hint' ? 'stimmig' : kind === 'warning' ? 'auffällig' : 'offen';
    const text = g.findings.filter(f => f.level !== 'offen').map(f => f.label).slice(0, 3).join(', ') || 'keine prüfbaren Werte';
    return { title: `${g.title.split(',')[0].split(' und ')[0]} ${state}`, kind, text: `${text}.` };
  });

  // ---- Hypothesen ----
  const place = references.place;
  const placeShort = place ? shortAddress(place) : coordinates ? `${formatCoordinate(coordinates.latitude, 'lat')} / ${formatCoordinate(coordinates.longitude, 'lon')}` : 'unbekannter Ort';
  const deviceText = device?.model ? String(device.model) : 'unbekanntes Gerät';
  const fromCamera = capture.source === 'camera';
  const strongLabels = all.filter(f => f.level === 'stark').map(f => f.label);
  const contradictions = all.filter(f => f.level === 'widerspruch').map(f => f.label);
  /** @type {Hypothesis[]} */
  const hypotheses = [];
  hypotheses.push({
    id: 'H0', title: `Aufnahme wie angegeben: ${captureTime ? utcDateTime(captureTime) : 'Zeit unbekannt'}, ${placeShort}, ${deviceText}, ${fromCamera ? 'Live-Kamera' : 'Bild aus der Galerie'}`,
    against: contradictions.length ? `${contradictions.join(', ')} ${contradictions.length === 1 ? 'widerspricht' : 'widersprechen'} den Referenzdaten.` : matched ? `Nichts. Alle ${matched} abgleichbaren Werte passen, ${counts.stark} davon eng.` : 'Nichts, aber auch nichts dafür: keine Angabe war gegen Referenzdaten prüfbar.',
    open: 'Wer fotografiert hat und ob das Motiv gestellt ist.',
    verdict: contradictions.length ? 'zweifelhaft' : counts.stark >= 3 ? 'sehr wahrscheinlich' : counts.stark >= 1 ? 'wahrscheinlich' : matched ? 'plausibel, schwach belegt' : 'nicht beurteilbar',
  });
  {
    const against = [];
    if (pressureLevel === 'stark' || pressureLevel === 'stimmig') against.push('Der Drucksensor arbeitet ohne GNSS und passt zur Wetterlage am Ort.');
    if (fieldLevel === 'stark' || inclinationLevel === 'stark') against.push('Das Magnetometer arbeitet ohne GNSS und passt zum Weltmagnetmodell am Ort.');
    if (declinationLevel === 'intern') against.push('Die Gerätedeklination zeigt, dass das Betriebssystem denselben Ort kannte.');
    if (location?.mocked === false) against.push('Das Betriebssystem meldet keinen simulierten Standort.');
    const contra = pressureLevel === 'widerspruch' || declinationLevel === 'widerspruch';
    hypotheses.push({
      id: 'H1', title: 'Ort gefälscht (GNSS-Spoofing oder Mock-Location)',
      against: against.join(' ') || 'Keine ortsgebundenen Sensorwerte prüfbar.',
      open: 'Ein Fälscher am selben Ort bräuchte kein Spoofing. Ein Fälscher anderswo müsste Druck, Magnetfeld und Motiv gleichzeitig treffen. Der Bildinhalt ist nicht automatisch geprüft.',
      verdict: contra ? 'möglich' : location?.mocked === true ? 'nicht ausgeschlossen (simulierter Standort gemeldet)' : against.length >= 2 ? 'unwahrscheinlich' : against.length === 1 ? 'eher unwahrscheinlich' : 'nicht beurteilbar',
    });
  }
  {
    const against = [];
    if (btcLevel === 'stark' && btcTime) against.push(`Der Bitcoin-Vorabblock bindet die Paketerstellung an ${utcTime(btcTime)} oder später.`);
    if (pressureLevel === 'stark') against.push('Der Luftdruck passt zur Stunde.');
    if (sunLevel === 'stimmig') against.push('Lichtsensor und Sonnenstand passen zur Tageszeit.');
    if (exposureLevel === 'intern') against.push('EXIF-Belichtung und Lichtsensor zeigen dieselbe Helligkeit.');
    if (exifTimeLevel === 'intern') against.push('Die Kamerauhr im EXIF nennt dieselbe Zeit.');
    hypotheses.push({
      id: 'H2', title: 'Zeit verschoben: älteres Foto, später versiegelt',
      against: against.join(' ') || 'Kein Zeitanker und keine Lichtwerte prüfbar.',
      open: 'Die Sensoren messen den Moment der Paketerstellung, nicht den Belichtungsmoment. Die Verknüpfung beider Momente beruht auf der Selbstauskunft „Kamera der App“ und auf der Helligkeits- und Zeitübereinstimmung.',
      verdict: exifTimeLevel === 'auffaellig' ? 'möglich (EXIF-Zeit weicht ab)' : against.length >= 3 ? 'unwahrscheinlich, nicht ausgeschlossen' : against.length ? 'nicht ausgeschlossen' : 'nicht beurteilbar',
    });
  }
  {
    const against = [];
    if (cameraLevel === 'stimmig') against.push('Das EXIF-Kameramodul passt zum gemeldeten Gerät.');
    if (exposureLevel === 'intern') against.push('Die Bildhelligkeit passt zum Lichtsensor.');
    if (exifTimeLevel === 'intern') against.push('Die EXIF-Zeit passt zur Gerätezeit.');
    if (fromCamera) against.push('Die App meldet die Live-Kamera.');
    hypotheses.push({
      id: 'H3', title: 'Fremdes oder bearbeitetes Bild aus der Galerie',
      against: against.join(' ') || 'Keine Kameradaten prüfbar.',
      open: 'Die Quellenangabe ist eine Selbstauskunft der App, keine Attestierung. Der Bildinhalt ist nicht automatisch mit dem Ort verglichen.',
      verdict: !fromCamera ? 'nicht ausgeschlossen (Bild aus Galerie gewählt)' : cameraLevel === 'auffaellig' ? 'möglich (Kameramodul passt nicht)' : against.length >= 3 ? 'unwahrscheinlich' : against.length ? 'eher unwahrscheinlich' : 'nicht beurteilbar',
    });
  }
  {
    const against = [];
    if (pressureStats && pressureStats.count > 1) against.push(`Die Reihen zeigen Rauschen (Luftdruck ${fix(pressureStats.max - pressureStats.min, 2)} hPa Spanne).`);
    if (rotationLevel === 'intern' && rotation && rotation.compassRate >= 0.3) against.push('Kompass und Gyroskop messen dieselbe Drehung.');
    if (disturbedSamples.length && !readingDisturbed) against.push('Ein reales Störfeld vor der Kamera verschwindet nach der Rückkehr.');
    if (android && window?.cameraOpenedAt && window?.cameraReturnedAt) against.push('Die Android-typische Sensorpause während der Kamera ist vorhanden.');
    if (pressureLevel === 'stark' || fieldLevel === 'stark') against.push('Die Werte müssten aus Wetter- und Magnetfeldquellen für genau diese Stunde und diesen Ort abgeleitet worden sein.');
    hypotheses.push({
      id: 'H4', title: 'Synthetische Sensorwerte durch manipulierte App',
      against: against.join(' ') || 'Keine Messreihen zur Beurteilung.',
      open: 'Ohne Geräte- und App-Attestierung (Play Integrity, App Attest) technisch nicht auszuschließen. Hoher Aufwand, der mit jedem weiteren Abgleich steigt.',
      verdict: against.length >= 2 ? 'möglich, aber aufwendig' : 'möglich',
    });
  }
  const assessment = contradictions.length
    ? `Die Indizienlage trägt die angegebene Aufnahme nicht: ${contradictions.join(', ')} ${contradictions.length === 1 ? 'passt' : 'passen'} nicht zu Ort oder Zeit. Die Kette belegt weiterhin, dass das Paket unverändert ist. Sie belegt nicht, dass seine Angaben stimmen.`
    : counts.stark
      ? `Die Indizienlage macht die angegebene Aufnahme ${counts.stark >= 3 ? 'sehr wahrscheinlich' : 'wahrscheinlich'}. Wer das Gegenteil behauptet, müsste erklären, warum ${listText(strongLabels)} gleichzeitig und unabhängig voneinander zu ${placeShort}${captureTime ? ` am ${formatDate(captureTime, UTC)} gegen ${formatTime(captureTime, UTC).slice(0, 5)} UTC` : ''} ${strongLabels.length === 1 ? 'passt' : 'passen'}. Die verbleibende Unsicherheit liegt nicht in den Messwerten, sondern in der fehlenden Attestierung von Gerät und App und in der Selbstauskunft zur Bildquelle.`
      : matched ? 'Die prüfbaren Angaben passen zu den Referenzdaten, aber kein Indiz ist für sich eng genug, um Ort und Zeit stark zu stützen. Weitere Sensoren oder ein Onlineabgleich der Zeitanker würden die Aussage schärfen.'
        : 'Für dieses Paket ließen sich keine Angaben gegen Referenzdaten prüfen (kein Standort, keine Sensorwerte oder keine Referenzdienste erreichbar). Die Prüfung trifft keine Aussage zur Plausibilität.';

  // ---- Stärkste Indizien und Auffälligkeiten in Klartext ----
  /** @type {string[]} */
  const highlights = [];
  const byKey = (/** @type {string} */ key) => comparisons.find(c => c.key === key);
  const pressureComparison = byKey('luftdruck');
  if (pressureComparison && pressureLevel === 'stark') highlights.push(`Luftdruck auf ${fix(Math.abs(pressureComparison.device - pressureComparison.reference), 1)} hPa genau. Sensor ${fix(pressureComparison.device, 2)} hPa, Referenz ${fix(pressureComparison.reference, 1)} hPa${weather?.pressureMsl !== null && weather && Math.abs(weather.pressureMsl - 1013.25) > 8 ? ` bei einer untypischen Wetterlage (${fix(weather.pressureMsl, 0)} hPa auf Meeresniveau)` : ''}.`);
  const fieldComparison = byKey('feldstaerke'); const inclinationComparison = byKey('inklination');
  if (fieldComparison && inclinationComparison && fieldLevel === 'stark' && inclinationLevel === 'stark') highlights.push(`Erdmagnetfeld auf ${fix(Math.abs((fieldComparison.device - fieldComparison.reference) / fieldComparison.reference * 100), 0)} % und ${fix(Math.abs(inclinationComparison.device - inclinationComparison.reference), 0)}° genau. Betrag ${fix(fieldComparison.device, 1)} gegen ${fix(fieldComparison.reference, 1)} µT, Inklination ${fix(Math.abs(inclinationComparison.device), 0)}° gegen ${fix(Math.abs(inclinationComparison.reference), 0)}°.`);
  else if (fieldComparison && fieldLevel === 'stark') highlights.push(`Magnetfeldstärke ${fix(fieldComparison.device, 1)} gegen ${fix(fieldComparison.reference, 1)} µT (WMM2025).`);
  else if (inclinationComparison && inclinationLevel === 'stark') highlights.push(`Inklination ${fix(Math.abs(inclinationComparison.device), 1)}° gegen ${fix(Math.abs(inclinationComparison.reference), 1)}° (WMM2025).`);
  if (btcLevel === 'stark' && doiLevel === 'stark' && btcTime && sealedAt) highlights.push(`Beide Zeitanker unabhängig bestätigt. Bitcoin-Block ${pre ? formatInt(pre.bitcoin.height) : ''} und Doichain-Block ${anchor?.blockHeight !== undefined ? formatInt(anchor.blockHeight) : ''} schließen die Aufnahme auf ${durationText(sealedAt.getTime() - btcTime.getTime())} ein${sunLevel === 'stimmig' ? ', Tageslicht und Sonnenstand passen in dieses Fenster' : ''}.`);
  const placeComparison = references.place;
  if (placeComparison && placeComparison.distanceM !== null && placeComparison.distanceM <= 50 && location?.mocked !== true) highlights.push(`Ort aufgelöst: Der GNSS-Punkt liegt ${formatMeasure(Math.round(placeComparison.distanceM))} m neben ${shortAddress(placeComparison)}. Ob das Foto diesen Ort zeigt, bleibt dem Betrachter überlassen.`);
  const qnhComparison = byKey('qnh');
  if (highlights.length < 4 && qnhComparison && baroLevel === 'stark') highlights.push(`Barometrische Höhe erklärt: ${qnhComparison.interpretation}`);
  if (highlights.length < 4 && exposureLevel === 'intern' && sunLevel === 'stimmig') highlights.push('Lichtsensor, Belichtung und Sonnenstand beschreiben dieselbe Lichtsituation.');
  /** @type {string[]} */
  const anomalies = all.filter(f => f.level === 'auffaellig' || f.level === 'widerspruch').map(f => `${f.label}: ${f.sensor}. ${f.comparison}`);

  // ---- Quellen und Reproduzierbarkeit ----
  const queriedDay = references.queriedAt ? formatDate(new Date(references.queriedAt), UTC) : '–';
  /** @type {SourceRow[]} */
  const sources = [];
  for (const q of references.queries) {
    const provides = q.name.startsWith('Open-Meteo Forecast') ? 'Stationsdruck, Druck auf Meeresniveau, Temperatur, Bewölkung, Strahlung, Niederschlag, Sonnenzeiten am Gitterpunkt (Modellanalyse, Vorhersagemodell)'
      : q.name.startsWith('Open-Meteo Archiv') ? 'Stationsdruck, Druck auf Meeresniveau, Temperatur, Bewölkung, Strahlung, Niederschlag, Sonnenzeiten am Gitterpunkt (Reanalyse, für Aufnahmen älter als 90 Tage)'
        : q.name.startsWith('Open-Meteo Elevation') ? 'Geländehöhe am Aufnahmeort (Copernicus-DEM, 90 m Raster)'
          : 'Adresse und nächstes Objekt zum GNSS-Punkt (OpenStreetMap)';
    sources.push({ source: q.name, provides, queried: q.status === 'ok' ? queriedDay : q.status === 'skipped' ? `nicht abgefragt (${q.detail})` : `fehlgeschlagen (${q.detail})` });
  }
  sources.push({ source: 'WMM2025 (NOAA NCEI und BGS)', provides: 'Totalintensität, Inklination, Deklination des Erdmagnetfelds für Ort und Datum, offline aus den eingebetteten Koeffizienten berechnet (Modellwert)', queried: coordinates ? 'berechnet' : 'nicht berechnet (kein Standort)' });
  sources.push({ source: 'blockstream.info API', provides: 'Zeit und Hash des Bitcoin-Vorabblocks', queried: btcPre ? (btcPre.status === 'matched' ? queriedDay : btcPre.status) : online ? 'kein Vorabblock' : 'nicht abgefragt' });
  sources.push({ source: 'Doichain-Knoten (doi-api.sendlabs.de)', provides: 'Zeit, Hash und Transaktionen des Doichain-Blocks und des Doichain-Vorabblocks', queried: online ? (online.checkedAtUtc ? formatDate(new Date(online.checkedAtUtc), UTC) : queriedDay) : 'nicht abgefragt' });
  sources.push({ source: 'Sonnenstandsformel (NOAA)', provides: 'Sonnenhöhe, Azimut, Auf- und Untergang zum Aufnahmezeitpunkt', queried: sun ? 'berechnet' : 'nicht berechnet' });
  sources.push({ source: 'Barometrische Höhenformel', provides: 'Druckreduktion zwischen Meeresniveau und Gelände mit der Modelltemperatur', queried: weather && pressure !== null ? 'berechnet' : 'nicht berechnet' });

  /** @type {string[]} */
  const notes = [
    'Referenzdaten von Open-Meteo sind Modell- und Reanalysewerte am Gitterpunkt, keine Stationsmessungen. Das WMM beschreibt das Hauptfeld ohne lokale Anomalien, die Geländehöhe stammt aus einem 90-m-Raster. Für ein Gutachten wären Stationsmessungen des nationalen Wetterdienstes und die Geoidundulation aus dem amtlichen Modell nachzuziehen.',
    'Die Abfragen laufen nach der Kettenprüfung. Der Bericht dokumentiert Abfragezeitpunkt, Adressen und Antworten, damit der Abgleich später wiederholt werden kann. Koordinaten werden auf vier Nachkommastellen gerundet (etwa 10 m) an Open-Meteo und Nominatim übertragen, beide Dienste sehen dabei auch die IP-Adresse des Prüfrechners.',
    'Dieser Berichtsteil enthält den Aufnahmeort und die Aufnahmezeit einer realen Person. Weitergabe nur mit deren Einverständnis.',
  ];
  if (android) notes.unshift('Android pausiert die Sensoren der App, solange die System-Kamera geöffnet ist. Die Werte „zur Aufnahme“ stammen deshalb von unmittelbar nach der Rückkehr aus der Kamera, also kurz nach dem Auslösen. Für Luftdruck, Magnetfeld und Licht ist das unerheblich. Der Beschleunigungsvektor beschreibt den Moment nach dem Foto, nicht den Belichtungsmoment.');

  return {
    generatedAtUtc: generatedAt.toISOString(), queriedAtUtc: references.queriedAt,
    captureTimeUtc: captureTime ? captureTime.toISOString() : null, coordinates, android,
    summary: { sentence, detail, counts, total: all.length, matched, tone },
    overview, groups, hypotheses, assessment,
    comparisons, highlights: highlights.slice(0, 4), anomalies,
    proves: contradictions.length
      ? 'Dass mindestens eine versiegelte Angabe nicht zu unabhängigen Referenzdaten für den angegebenen Ort und die angegebene Zeit passt. Die Unversehrtheit des Pakets bleibt davon unberührt.'
      : 'Dass die versiegelten Gerätewerte mit unabhängigen Referenzdaten für den angegebenen Ort und die angegebene Zeit übereinstimmen und dass keine Angabe diesen Referenzen widerspricht.',
    provesNot: 'Wer fotografiert hat, ob das Motiv echt ist, in welche Richtung die Kamera zeigte, und ob Gerät und App unverfälscht arbeiteten. Referenzdaten aus Modellen (Open-Meteo, WMM) sind Näherungen am Gitterpunkt, keine Stationsmessungen.',
    sources, repro, notes, references,
  };
}

// ---------- Texthilfen ----------

/** @param {number} pressure @param {ReturnType<typeof seriesStats>} stats */
function pressureText(pressure, stats) {
  return `${fix(pressure, 3)} hPa${stats && stats.count > 1 ? ` (Reihe ${fix(stats.min, 2)} bis ${fix(stats.max, 2)} hPa, n = ${stats.count})` : ''}`;
}

/** @param {number} trueHeading @param {number} magHeading */
function declinationText(trueHeading, magHeading) {
  let d = trueHeading - magHeading;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return `geografisch ${fix(trueHeading, 2)}° − magnetisch ${fix(magHeading, 2)}° = ${fix(Math.abs(d), 2)}° ${d >= 0 ? 'Ost' : 'West'}`;
}

/** @param {number} a @param {number} b */
function angularDistance(a, b) {
  const d = Math.abs(((a - b) % 360 + 540) % 360 - 180);
  return d;
}

/** @param {string} hash */
function shortHash(hash) {
  return hash.length > 12 ? `${hash.slice(0, 4)}…${hash.slice(-4)}` : hash;
}

/** @param {ReferenceData} references @param {string} name */
function urlOf(references, name) {
  return (references.queries.find(q => q.name.startsWith(name) && q.url)?.url ?? '–').replace(/^https:\/\//, '');
}

/** Kurzform der Adresse: die ersten drei Glieder der Nominatim-Anzeige. @param {PlaceReference} place */
export function shortAddress(place) {
  const parts = place.displayName.split(',').map(s => s.trim()).filter(Boolean);
  // Hausnummer und Straße zusammenziehen, wenn Nominatim sie getrennt liefert
  if (parts.length > 1 && /^\d+[a-z]?$/i.test(parts[0])) parts.splice(0, 2, `${parts[1]} ${parts[0]}`);
  const postcode = parts.find(p => /^\d{4,5}$/.test(p));
  const city = parts.length >= 5 ? parts[parts.length - 4] : parts[Math.min(1, parts.length - 1)];
  const out = [parts[0]];
  if (postcode || city) out.push([postcode, city].filter(Boolean).join(' '));
  return out.join(', ');
}

/** „1 Std. 34 Min.“ oder „12 Minuten“ @param {number} ms */
function durationText(ms) {
  const minutes = Math.round(Math.abs(ms) / 60000);
  if (minutes < 1) return 'unter einer Minute';
  if (minutes < 60) return `${minutes} Minute${minutes === 1 ? '' : 'n'}`;
  const hours = Math.floor(minutes / 60);
  return `${hours} Std. ${minutes % 60} Min.`;
}

/** Exakte Angabe in Sekunden oder Minuten. @param {number} ms */
function durationExact(ms) {
  const seconds = Math.round(Math.abs(ms) / 1000);
  return seconds < 120 ? `${seconds} s` : durationText(ms);
}

/** „a, b und c“ @param {string[]} items */
function listText(items) {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} und ${items[items.length - 1]}`;
}

/** EXIF-Zeit „JJJJ:MM:TT hh:mm:ss“ als Millisekunden, so gelesen als wäre sie UTC. @param {string} text */
function parseExifTime(text) {
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(text);
  if (!m) return null;
  const value = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]));
  return Number.isFinite(value) ? value : null;
}
