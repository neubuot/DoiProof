import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { PDFDocument } from 'pdf-lib';
import { decimalYear, geomagneticField, WMM2025 } from './geomag.mjs';
import { loadFonts, nodeSha256 } from './node.mjs';
import { createPdfReport, preparePlausibility, verifyPackage } from './pipeline.mjs';
import {
  ARCHIVE_AFTER_DAYS, compassAgainstGyroscope, compassPoint, evaluatePlausibility, exposureValue, illuminanceFromExposure,
  inclinationFromSensors, loadReferences, pressureToSeaLevel, reducePressureToHeight, referenceUrls, shortAddress, sunPosition, THRESHOLDS,
} from './plausibility.mjs';
import { reportText } from './report-text.mjs';
import { buildBundle, fakeChain, fakeReferences, recordedBundle, recordedManifest } from '../scripts/fixtures/fixture.mjs';
import { cli, FONT_DIR, parseArgs } from '../scripts/verify.mjs';

const CAPTURE = new Date('2026-10-14T14:53:38.420Z');
const INGOLSTADT = { latitude: 48.7619404, longitude: 11.4256019 };
const NOW = new Date('2026-10-24T08:00:00Z');
const AGENT = 'DoiProof-Pruefer/test (Kommandozeile) (+https://github.com/neubuot/DoiProof)';

/** Bestätigte Kette und aufgezeichnete Referenzantworten für das Paket a40a215c3abd. @param {(m: any) => void} [modify] */
async function recordedCase(modify) {
  const { zipBytes, evidence, manifest } = await recordedBundle(modify);
  const chain = fakeChain({ evidence: evidence.evidenceSha256, pre: manifest.preCapture, anchor: { height: 436204, time: '2026-10-14T14:59:20Z', confirmations: 41 } });
  const references = await fakeReferences({ chain: chain.fetchImpl });
  const { analysis, online } = await verifyPackage(zipBytes, { sha256: nodeSha256, online: true, fetchImpl: chain.fetchImpl, now: () => NOW });
  return { zipBytes, analysis, online, chain, references, manifest };
}

/** @param {import('./plausibility.mjs').PlausibilityResult} result @param {string} label */
function finding(result, label) {
  const found = result.groups.flatMap(g => g.findings).find(f => f.label === label);
  assert.ok(found, `Indiz „${label}“ fehlt`);
  return found;
}

test('WMM2025: offline berechnetes Erdmagnetfeld trifft die offiziellen NOAA-Testwerte', () => {
  // WMM2025_TEST_VALUES.txt (NOAA NCEI): Jahr, Höhe km, Breite, Länge, X, Y, Z, F in nT, Inklination und Deklination in Grad
  const rows = [
    [2025.0, 0, 80, 0, 6521.6, 145.9, 54791.5, 55178.5, 83.21, 1.28], [2025.0, 0, 0, 120, 39677.8, -109.6, -10580.2, 41064.3, -14.93, -0.16],
    [2025.0, 0, -80, 240, 6117.5, 15751.9, -52022.5, 54698.2, -72.00, 68.78], [2025.0, 100, 80, 0, 6216.0, 92.4, 52598.8, 52964.9, 83.26, 0.85],
    [2025.0, 100, 0, 120, 37688.6, -96.2, -10152.1, 39032.1, -15.08, -0.15], [2025.0, 100, -80, 240, 5907.6, 14780.3, -49540.7, 52035.0, -72.19, 68.21],
    [2027.5, 0, 80, 0, 6500.8, 294.5, 54869.4, 55253.9, 83.24, 2.59], [2027.5, 0, 0, 120, 39701.6, -167.4, -10381.8, 41036.9, -14.65, -0.24],
    [2027.5, 0, -80, 240, 6200.7, 15730.3, -51783.7, 54474.2, -71.92, 68.49], [2027.5, 100, 80, 0, 6196.7, 233.8, 52670.5, 53034.3, 83.29, 2.16],
    [2027.5, 100, 0, 120, 37711.5, -148.7, -9969.8, 39007.4, -14.81, -0.23], [2027.5, 100, -80, 240, 5984.0, 14760.1, -49317.7, 51825.7, -72.10, 67.93],
  ];
  for (const [year, altitude, lat, lon, x, y, z, f, inclination, declination] of rows) {
    const field = geomagneticField(lat, lon, altitude, year);
    assert.ok(Math.abs(field.x - x) < 0.5 && Math.abs(field.y - y) < 0.5 && Math.abs(field.z - z) < 0.5 && Math.abs(field.f - f) < 0.5, `${lat}/${lon} ${year}`);
    assert.ok(Math.abs(field.inclination - inclination) < 0.01 && Math.abs(field.declination - declination) < 0.01, `${lat}/${lon} ${year} Winkel`);
    assert.equal(field.withinValidity, true);
  }
  assert.equal(WMM2025.coefficients.length, 90);
  // Ingolstadt am 14.10.2026: BGS-Webdienst liefert 48.987 nT, I 64,96°, D 4,37° (Analysenotiz)
  const ingolstadt = geomagneticField(INGOLSTADT.latitude, INGOLSTADT.longitude, 0.37, decimalYear(CAPTURE));
  assert.ok(Math.abs(ingolstadt.f / 1000 - 48.99) < 0.02);
  assert.ok(Math.abs(ingolstadt.inclination - 64.96) < 0.02);
  assert.ok(Math.abs(ingolstadt.declination - 4.37) < 0.02);
  assert.ok(Math.abs(decimalYear(CAPTURE) - 2026.785) < 0.001);
  assert.throws(() => geomagneticField(91, 0, 0, 2026), /Koordinaten/);
});

test('Rechenkerne: Sonnenstand, Druckreduktion, Lichtwert, Himmelsrichtung', () => {
  const sun = sunPosition(CAPTURE, INGOLSTADT.latitude, INGOLSTADT.longitude);
  assert.ok(Math.abs(sun.altitude - 13.5) < 0.15, `Sonnenhöhe ${sun.altitude}`);
  assert.ok(Math.abs(sun.azimuth - 240) < 0.5, `Azimut ${sun.azimuth}`);
  assert.equal(compassPoint(sun.azimuth), 'WSW');
  assert.equal(sun.sunrise?.toISOString().slice(0, 16), '2026-10-14T05:33');
  assert.equal(sun.sunset?.toISOString().slice(0, 16), '2026-10-14T16:27');
  assert.ok(sunPosition(new Date('2026-10-14T23:00:00Z'), INGOLSTADT.latitude, INGOLSTADT.longitude).altitude < -40);
  // Polarnacht: kein Auf- und Untergang
  assert.equal(sunPosition(new Date('2026-12-21T12:00:00Z'), 78, 15).sunrise, null);
  assert.ok(Math.abs(reducePressureToHeight(1029.4, 373, 17.7) - 985.5) < 0.1);
  assert.ok(Math.abs(pressureToSeaLevel(985.378, 373, 17.7) - 1029.3) < 0.1);
  const ev = exposureValue(0.0111085, 2.2, 89);
  assert.ok(Math.abs(ev - 8.9) < 0.05, `EV ${ev}`);
  const lux = illuminanceFromExposure(ev);
  assert.ok(lux.center > 1000 && lux.center < 1500);
  assert.equal(compassPoint(0), 'N');
  assert.equal(compassPoint(359), 'N');
  assert.equal(compassPoint(112.5), 'OSO');
  assert.equal(shortAddress({ displayName: '3, Donaustraße, Altstadt Südwest, Mitte, Ingolstadt, Bayern, 85049, Deutschland', name: '', type: '', osmType: '', osmId: '', latitude: null, longitude: null, distanceM: null, licence: '' }), 'Donaustraße 3, 85049 Ingolstadt');
});

test('Sensorpaare: Inklination nur aus ruhigen, ungestörten Paaren, Kompass gegen Gyroskop', async () => {
  const { sensors } = await recordedManifest();
  const inclination = inclinationFromSensors(sensors);
  assert.equal(inclination.pairs.length, 11);
  assert.equal(inclination.quiet, 1);
  assert.ok(Math.abs((inclination.best?.inclination ?? 0) - 62.1) < 0.1, `Inklination ${inclination.best?.inclination}`);
  assert.equal(inclination.best?.at, '2026-10-14T14:53:38.401Z');
  // Vor der Kamera: Störfeld um 140 µT, nach der Rückkehr: Gerät bewegt (Gyroskop bis 1,5 rad/s)
  assert.equal(inclination.pairs.filter(pair => pair.disturbed).length, 4);
  assert.ok(inclination.pairs.filter(pair => pair.phase === 'nach Rückkehr').every(pair => !pair.quiet));
  const rotation = compassAgainstGyroscope(sensors);
  assert.equal(rotation?.phase, 'nach Rückkehr');
  assert.ok(Math.abs((rotation?.headingChange ?? 0) - 34.2) < 0.2);
  assert.ok(Math.abs((rotation?.compassRate ?? 0) - 1.11) < 0.02);
  assert.ok(Math.abs((rotation?.gyroRate ?? 0) - 0.67) < 0.02);
  assert.equal(inclinationFromSensors(null).best, null);
  assert.equal(compassAgainstGyroscope(null), null);
  assert.deepEqual([THRESHOLDS.accelMinG, THRESHOLDS.accelMaxG, THRESHOLDS.gyroMaxRadS, THRESHOLDS.magnetometerMinUt, THRESHOLDS.magnetometerMaxUt], [0.95, 1.05, 0.2, 25, 65]);
});

test('Referenzabfragen: gerundete Koordinaten, Archiv-API für alte Aufnahmen, User-Agent, Fehler je Dienst', async () => {
  const recent = referenceUrls(INGOLSTADT, CAPTURE, NOW);
  assert.equal(recent.weather.source, 'forecast');
  assert.match(recent.weather.url, /^https:\/\/api\.open-meteo\.com\/v1\/forecast\?latitude=48\.7619&longitude=11\.4256&hourly=surface_pressure,pressure_msl,temperature_2m,cloud_cover,direct_radiation,diffuse_radiation,precipitation&daily=sunrise,sunset&start_date=2026-10-14&end_date=2026-10-14&timezone=UTC$/);
  assert.equal(recent.elevation, 'https://api.open-meteo.com/v1/elevation?latitude=48.7619&longitude=11.4256');
  assert.equal(recent.place, 'https://nominatim.openstreetmap.org/reverse?lat=48.7619&lon=11.4256&format=jsonv2&zoom=18');
  const old = referenceUrls(INGOLSTADT, new Date(NOW.getTime() - (ARCHIVE_AFTER_DAYS + 1) * 86400000), NOW);
  assert.equal(old.weather.source, 'archive');
  assert.match(old.weather.url, /^https:\/\/archive-api\.open-meteo\.com\/v1\/archive\?/);

  const references = await fakeReferences();
  const data = await loadReferences({ coordinates: INGOLSTADT, captureTime: CAPTURE }, { fetchImpl: references.fetchImpl, userAgent: AGENT, now: () => NOW });
  assert.equal(data.queriedAt, NOW.toISOString());
  assert.deepEqual(data.queries.map(q => [q.name, q.status]), [['Open-Meteo Forecast-API', 'ok'], ['Open-Meteo Elevation', 'ok'], ['Nominatim', 'ok']]);
  assert.ok(references.calls.every(call => call.userAgent === AGENT));
  assert.equal(data.weather?.surfacePressure, 985.5);
  assert.equal(data.weather?.pressureMsl, 1029.4);
  assert.equal(data.weather?.hour, '2026-10-14T14:00');
  assert.equal(data.weather?.modelElevation, 373);
  assert.equal(data.elevation, 373);
  assert.equal(data.place?.osmId, '6339315016');
  assert.ok((data.place?.distanceM ?? 0) > 5 && (data.place?.distanceM ?? 0) < 10);

  const failing = await fakeReferences({ fail: ['place', 'weather'] });
  const partial = await loadReferences({ coordinates: INGOLSTADT, captureTime: CAPTURE }, { fetchImpl: failing.fetchImpl, userAgent: AGENT, now: () => NOW });
  assert.deepEqual(partial.queries.map(q => q.status), ['error', 'ok', 'error']);
  assert.match(partial.queries[0].detail, /HTTP 503/);
  assert.equal(partial.weather, null);
  assert.equal(partial.elevation, 373);

  const none = await loadReferences({ coordinates: null, captureTime: CAPTURE }, { fetchImpl: references.fetchImpl, userAgent: AGENT, now: () => NOW });
  assert.ok(none.queries.every(q => q.status === 'skipped'));
  assert.equal(references.calls.length, 3, 'ohne Standort keine Abfrage');
});

test('Bewertung des Pakets a40a215c3abd: Luftdruck, Magnetfeld, Inklination und Zeitanker stark, kein Widerspruch', async () => {
  const { analysis, online, references } = await recordedCase();
  const data = await loadReferences({ coordinates: INGOLSTADT, captureTime: CAPTURE }, { fetchImpl: references.fetchImpl, userAgent: AGENT, now: () => NOW });
  const result = evaluatePlausibility({ analysis, online, references: data, generatedAt: NOW });
  assert.deepEqual(result.groups.map(g => g.key), ['ort', 'hoehe', 'atmosphaere', 'magnetfeld', 'licht', 'geraet', 'zeitanker']);

  const pressure = finding(result, 'Luftdruck');
  assert.equal(pressure.level, 'stark');
  assert.match(pressure.sensor, /^985,378 hPa \(Reihe 985,36 bis 985,43 hPa, n = 8\)/);
  assert.match(pressure.reference, /Stationsdruck 985,5 hPa, auf Meeresniveau 1029,4 hPa, 17,7 °C/);
  assert.match(pressure.reference, /Modellwert am Gitterpunkt/);
  assert.match(pressure.comparison, /Abweichung −0,1 hPa/);
  assert.equal(finding(result, 'Barometrische Höhe').level, 'stark');
  assert.match(finding(result, 'Barometrische Höhe').reference, /QNH 1029,3 hPa, Open-Meteo 1029,4 hPa/);
  assert.equal(finding(result, 'Druckverlauf').level, 'stimmig');

  const field = finding(result, 'Feldstärke (Betrag)');
  assert.equal(field.level, 'stark');
  assert.match(field.sensor, /^48,23 µT zur Aufnahme/);
  assert.match(field.reference, /Totalintensität 48,99 µT/);
  const inclination = finding(result, 'Inklination');
  assert.equal(inclination.level, 'stark');
  assert.match(inclination.sensor, /^62,1° abwärts/);
  assert.match(inclination.reference, /64,96° abwärts/);
  assert.match(inclination.comparison, /Abweichung 2,9°/);
  const declination = finding(result, 'Deklination');
  assert.equal(declination.level, 'intern');
  assert.match(declination.sensor, /4,59° Ost/);
  assert.match(declination.reference, /4,37° Ost/);
  const disturbed = finding(result, 'Gestörte Messungen');
  assert.equal(disturbed.level, 'auffaellig');
  assert.match(disturbed.sensor, /^4 von 10 Messungen außerhalb 25 bis 65 µT \(vor Kamera, bis 140 µT\)/);

  const sun = finding(result, 'Sonnenstand');
  assert.equal(sun.level, 'stimmig');
  assert.match(sun.reference, /Sonnenhöhe 13,5°, Azimut 240° \(WSW\)\. Sonnenaufgang 05:32:00 UTC, Untergang 16:27:00 UTC \(Open-Meteo\)/);
  assert.match(sun.comparison, /1 Std\. 33 Min\. vor Sonnenuntergang/);
  assert.equal(finding(result, 'Beleuchtungsstärke').level, 'stimmig');
  assert.equal(finding(result, 'Bewölkung').level, 'offen');

  assert.equal(finding(result, 'GNSS-Position').level, 'stimmig');
  assert.match(finding(result, 'GNSS-Position').reference, /Donaustraße.*7 m vom gemeldeten Punkt/);
  assert.equal(finding(result, 'Höhe über Ellipsoid').level, 'stimmig');
  assert.match(finding(result, 'Höhe über Ellipsoid').comparison, /Abweichung 42,7 m/);
  assert.equal(finding(result, 'Beschleunigung').level, 'stimmig');
  assert.match(finding(result, 'Beschleunigung').comparison, /um 33° aus der Horizontalen/);
  assert.equal(finding(result, 'Kompass gegen Gyroskop').level, 'intern');
  assert.equal(finding(result, 'Kompassrichtung').level, 'offen');
  // Synthetisches Testbild: EXIF-Kamera und EXIF-Zeit passen nicht zum aufgezeichneten Gerät
  assert.equal(finding(result, 'Kameramodul').level, 'auffaellig');
  assert.equal(finding(result, 'Aufnahmezeit laut EXIF').level, 'auffaellig');

  assert.equal(finding(result, 'Bitcoin-Vorabblock').level, 'stark');
  assert.equal(finding(result, 'Doichain-Vorabblock').level, 'stark');
  const sealed = finding(result, 'Doichain-Block (Versiegelung)');
  assert.equal(sealed.level, 'stark');
  assert.match(sealed.comparison, /Gerätezeit 14:53:38 UTC liegt im Fenster von 16 Minuten/);
  assert.equal(finding(result, 'GPS-Angaben im EXIF').level, 'offen');

  assert.equal(result.summary.tone, 'passed');
  assert.equal(result.summary.counts.widerspruch, 0);
  assert.equal(result.summary.counts.stark, 7);
  assert.equal(result.summary.sentence, 'Die Indizienlage stützt die Aufnahmedaten. Kein Wert widerspricht.');
  assert.match(result.summary.detail, /7 davon eng/);
  assert.equal(result.hypotheses[0].verdict, 'sehr wahrscheinlich');
  assert.match(result.hypotheses[0].title, /Donaustraße 3, 85049 Ingolstadt, Google Pixel 9 Pro, Live-Kamera/);
  assert.equal(result.hypotheses[1].verdict, 'unwahrscheinlich');
  assert.equal(result.hypotheses[4].verdict, 'möglich, aber aufwendig');
  assert.equal(result.android, true);
  assert.ok(result.overview.some(tile => tile.title === 'Erdmagnetfeld bestätigt' && tile.kind === 'proof'));
  // Vergleichsdaten für die Skalen: Gerätewert, Referenzwert, Toleranzbänder, Einordnung
  assert.deepEqual(result.comparisons.map(c => c.key), ['hoehe', 'qnh', 'luftdruck', 'feldstaerke', 'inklination', 'deklination', 'helligkeit', 'ruhelage', 'drehrate', 'zeitfenster']);
  const pressureScale = result.comparisons.find(c => c.key === 'luftdruck');
  assert.ok(pressureScale && Math.abs(pressureScale.device - 985.378) < 0.001 && pressureScale.reference === 985.5 && pressureScale.level === 'stark');
  assert.match(pressureScale?.interpretation ?? '', /^Auf 0,1 hPa genau/);
  const fieldScale = result.comparisons.find(c => c.key === 'feldstaerke');
  assert.ok(fieldScale && Math.abs(fieldScale.device - 48.23) < 0.01 && Math.abs(fieldScale.reference - 48.99) < 0.01);
  const windowScale = result.comparisons.find(c => c.key === 'zeitfenster');
  assert.ok(windowScale && Math.abs(windowScale.device - 10) < 0.1 && Math.abs(windowScale.reference - 7.85) < 0.1, 'Gerätezeit 10 min nach dem Bitcoin-Block im 16-Minuten-Fenster');
  assert.ok(result.comparisons.every(c => !/;| – /.test(c.interpretation) && Number.isFinite(c.device) && Number.isFinite(c.reference) && c.strong > 0 && c.ok >= c.strong));
  assert.equal(result.highlights.length, 4);
  assert.match(result.highlights[0], /^Luftdruck auf 0,1 hPa genau\. Sensor 985,38 hPa, Referenz 985,5 hPa bei einer untypischen Wetterlage \(1029 hPa auf Meeresniveau\)\./);
  assert.match(result.highlights[1], /^Erdmagnetfeld auf 2 % und 3° genau\. Betrag 48,2 gegen 49,0 µT, Inklination 62° gegen 65°\./);
  assert.match(result.highlights[2], /^Beide Zeitanker unabhängig bestätigt\. Bitcoin-Block 971\.414 und Doichain-Block 436\.204 schließen die Aufnahme auf 16 Minuten ein, Tageslicht und Sonnenstand passen/);
  assert.match(result.highlights[3], /^Ort aufgelöst: Der GNSS-Punkt liegt 7 m neben Donaustraße 3, 85049 Ingolstadt/);
  assert.deepEqual(result.anomalies.map(text => text.split(':')[0]), ['Gestörte Messungen', 'Kameramodul', 'Aufnahmezeit laut EXIF']);
  assert.ok(result.repro.some(step => step.step === 'Inklination aus Sensoren' && step.result === '62,1°'));
  assert.ok(result.repro.some(step => step.step === 'Sonnenstand' && step.result === 'Höhe 13,5°, Azimut 240°'));
  assert.ok(result.sources.some(row => row.source.startsWith('WMM2025') && row.queried === 'berechnet'));
  const texts = [...result.notes, result.assessment, ...result.groups.flatMap(g => [g.weight, ...g.findings.flatMap(f => [f.sensor, f.reference, f.comparison])]), ...result.hypotheses.flatMap(h => [h.against, h.open])];
  assert.ok(texts.every(text => !/;| – | — /.test(text)), 'keine Strichpunkte oder Gedankenstriche in den Berichtstexten');

  const text = reportText({ generatedAtUtc: NOW.toISOString(), file: 'paket.zip', local: { version: 'v3' }, online, plausibility: result });
  assert.match(text, /## Plausibilität gegen Referenzdaten/);
  assert.match(text, /\*\*Luftdruck\*\* \[stark\]: Sensor 985,378 hPa/);
  assert.match(text, /### Sensorwerte gegen Referenzwerte\n\n- \*\*Höhe\*\* \[stimmig\]: Gerät 415,7 m/);
  assert.match(text, /Die stärksten Indizien:\n\n1\. Luftdruck auf 0,1 hPa genau/);
  assert.match(text, /H0 · Aufnahme wie angegeben/);
});

test('Bewertung: Widerspruch beim Luftdruck, gestörte Aufnahme, fehlende Dienste und Paket ohne Standort', async () => {
  const contradiction = await recordedCase(m => {
    m.sensors.barometer.reading.pressure = 940.1;
    m.sensors.barometer.series = m.sensors.barometer.series.map((/** @type {any} */ s) => ({ ...s, pressure: s.pressure - 45.3 }));
  });
  const data = await loadReferences({ coordinates: INGOLSTADT, captureTime: CAPTURE }, { fetchImpl: contradiction.references.fetchImpl, userAgent: AGENT, now: () => NOW });
  const result = evaluatePlausibility({ analysis: contradiction.analysis, online: contradiction.online, references: data, generatedAt: NOW });
  assert.equal(finding(result, 'Luftdruck').level, 'widerspruch');
  assert.equal(finding(result, 'Barometrische Höhe').level, 'auffaellig');
  assert.equal(result.summary.tone, 'failed');
  assert.equal(result.summary.sentence, 'Eine Angabe widerspricht den Referenzdaten.');
  assert.equal(result.hypotheses[0].verdict, 'zweifelhaft');
  assert.equal(result.hypotheses[1].verdict, 'möglich');
  assert.match(result.assessment, /trägt die angegebene Aufnahme nicht/);
  assert.equal(result.comparisons.find(c => c.key === 'luftdruck')?.level, 'widerspruch');
  assert.ok(result.anomalies.some(text => text.startsWith('Luftdruck: 940,100 hPa')));
  assert.ok(!result.highlights.some(text => text.startsWith('Luftdruck')));
  assert.ok(result.overview.some(tile => tile.kind === 'failed'));

  // Störfeld auch zur Aufnahme: Betrag nicht verwertbar, Inklination ohne ruhiges Paar
  const disturbed = await recordedCase(m => {
    m.sensors.magnetometer.reading = { ...m.sensors.magnetometer.reading, x: 90, y: -60, z: -80 };
    m.sensors.magnetometer.series = m.sensors.magnetometer.series.map((/** @type {any} */ s) => ({ ...s, x: 90, y: -60, z: -80 }));
  });
  const disturbedResult = evaluatePlausibility({ analysis: disturbed.analysis, online: disturbed.online, references: data, generatedAt: NOW });
  assert.equal(finding(disturbedResult, 'Feldstärke (Betrag)').level, 'auffaellig');
  assert.match(finding(disturbedResult, 'Feldstärke (Betrag)').comparison, /gestört/);
  assert.equal(finding(disturbedResult, 'Inklination').level, 'offen');
  assert.equal(disturbedResult.summary.tone, 'passed', 'Luftdruck und Zeitanker tragen weiterhin');

  // Dienste nicht erreichbar: Indizien offen, Abfragen protokolliert, kein Absturz
  const failing = await fakeReferences({ fail: ['weather', 'elevation', 'place'] });
  const empty = await loadReferences({ coordinates: INGOLSTADT, captureTime: CAPTURE }, { fetchImpl: failing.fetchImpl, userAgent: AGENT, now: () => NOW });
  const offline = evaluatePlausibility({ analysis: contradiction.analysis, online: null, references: empty, generatedAt: NOW });
  assert.equal(finding(offline, 'Luftdruck').level, 'offen');
  assert.match(finding(offline, 'Luftdruck').reference, /HTTP 503/);
  assert.equal(finding(offline, 'GNSS-Position').level, 'offen');
  assert.equal(finding(offline, 'Feldstärke (Betrag)').level, 'stark', 'WMM braucht keinen Dienst');
  assert.equal(finding(offline, 'Bitcoin-Vorabblock').level, 'offen');
  assert.match(finding(offline, 'Bitcoin-Vorabblock').reference, /nicht abgefragt/);
  assert.ok(offline.sources.some(row => row.source === 'Nominatim' && /fehlgeschlagen/.test(row.queried)));

  // Paket ohne Standort und ohne Sensoren: alles offen, Zusammenfassung ehrlich
  const { zipBytes } = await buildBundle({ version: 'v3', location: false, sensors: false });
  const { analysis } = await verifyPackage(zipBytes, { sha256: nodeSha256 });
  const none = evaluatePlausibility({ analysis, online: null, references: await loadReferences({ coordinates: null, captureTime: null }, { userAgent: AGENT, now: () => NOW }), generatedAt: NOW });
  // Nur die EXIF-Zeit des Testbilds passt zur Gerätezeit (intern), alles andere bleibt offen
  assert.ok(none.groups.flatMap(g => g.findings).every(f => f.level === 'offen' || (f.label === 'Aufnahmezeit laut EXIF' && f.level === 'intern')));
  assert.equal(none.summary.sentence, 'Es ließen sich keine Angaben gegen Referenzdaten prüfen.');
  assert.deepEqual(none.comparisons, []);
  assert.deepEqual(none.highlights, []);
  assert.equal(none.hypotheses[0].verdict, 'nicht beurteilbar');
});

test('Bericht: Anhang nur auf Wunsch, nur mit Standort und bestandenem Paket, Kettenabfrage wird nachgeholt', async () => {
  const { zipBytes, references, chain } = await recordedCase();
  const fonts = await loadFonts(FONT_DIR);
  const { analysis } = await verifyPackage(zipBytes, { sha256: nodeSha256 });
  const base = { analysis, fileName: 'paket.zip', fonts, generatedAt: NOW, producer: 'Test' };
  const loader = { fetchImpl: references.fetchImpl, userAgent: AGENT, now: () => NOW };

  const plain = await createPdfReport({ ...base, plausibilityLoader: loader });
  assert.equal(plain.plausibilityStatus.state, 'not_requested');
  assert.equal(plain.model.plausibility, null);
  assert.equal(references.calls.length, 0);

  const hidden = await createPdfReport({ ...base, includeLocation: false, includePlausibility: true, plausibilityLoader: loader });
  assert.equal(hidden.plausibilityStatus.state, 'location_hidden');
  assert.equal(references.calls.length, 0);

  // Ohne vorherige Kettenabfrage holt die Plausibilitätsprüfung sie nach; der Bericht wird damit „bestanden“
  const checked = await createPdfReport({ ...base, includePlausibility: true, plausibilityLoader: loader });
  assert.equal(checked.plausibilityStatus.state, 'included');
  assert.equal(references.calls.length, 3);
  assert.ok(chain.calls.includes('check_proof'));
  assert.equal(checked.online?.status, 'matched');
  assert.equal(checked.model.outcome, 'passed');
  assert.equal(checked.model.plausibility?.tone, 'passed');
  assert.equal(checked.model.plausibility?.title, 'Anhang: Plausibilität gegen Referenzdaten');
  assert.match(checked.model.plausibility?.timeline.note ?? '', /Sonnenaufgang 07:32, Sonnenuntergang 18:27 Uhr\. Wetterdaten für 14:00 bis 15:00 UTC/);
  const plainPages = (await PDFDocument.load(plain.pdf)).getPageCount();
  const checkedPages = (await PDFDocument.load(checked.pdf)).getPageCount();
  assert.ok(checkedPages >= plainPages + 6, `${checkedPages} Seiten gegenüber ${plainPages}`);

  // Manipuliertes Paket: keine Abfrage, Status not_passed
  const broken = { ...analysis, ok: false, steps: { ...analysis.steps, photo: /** @type {const} */ ('failed') } };
  const failed = await preparePlausibility({ analysis: broken, includePlausibility: true, plausibilityLoader: loader });
  assert.equal(failed.status.state, 'not_passed');
  assert.equal(references.calls.length, 3);

  // Fehlender Lader: verständliche Meldung statt Absturz
  const missing = await preparePlausibility({ analysis, includePlausibility: true });
  assert.equal(missing.status.state, 'unavailable');
  assert.match(missing.status.reason ?? '', /Referenzdienst/);
});

test('Kommandozeile: --plausibilitaet schließt --online ein, verträgt sich nicht mit --ohne-standort und schreibt den Anhang', async () => {
  const options = parseArgs(['paket.zip', '--plausibilitaet']);
  assert.equal(options.plausibility, true);
  assert.equal(options.online, true);
  assert.equal(parseArgs(['paket.zip']).plausibility, false);
  assert.throws(() => parseArgs(['paket.zip', '--plausibilitaet', '--ohne-standort']), /ohne-standort/);

  const dir = await mkdtemp(join(tmpdir(), 'doiproof-plausibilitaet-'));
  try {
    const { zipBytes, references } = await recordedCase();
    const path = join(dir, 'paket.zip');
    await writeFile(path, zipBytes);
    let stdout = ''; let stderr = '';
    const code = await cli([path, '--pdf', join(dir, 'bericht.pdf'), '--report', join(dir, 'bericht.md'), '--plausibilitaet', '--zeitzone', 'Europe/Berlin'],
      { fetchImpl: references.fetchImpl, now: () => NOW, stdout: text => { stdout += text; }, stderr: text => { stderr += text; } });
    assert.equal(code, 0);
    assert.match(stderr, /Plausibilität gegen Referenzdaten geprüft: Die Indizienlage stützt die Aufnahmedaten/);
    assert.match(stdout, /## Plausibilität gegen Referenzdaten/);
    assert.match(await readFile(join(dir, 'bericht.md'), 'utf8'), /\*\*Feldstärke \(Betrag\)\*\* \[stark\]: Sensor 48,23 µT/);
    assert.equal(references.calls.length, 3);
    assert.ok(references.calls.every(call => /^DoiProof-Pruefer\/\d+\.\d+\.\d+ \(Kommandozeile\) \(\+https:\/\/github\.com\/neubuot\/DoiProof\)$/.test(String(call.userAgent))));
    const pdf = await PDFDocument.load(await readFile(join(dir, 'bericht.pdf')));
    assert.ok(pdf.getPageCount() > 12);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
