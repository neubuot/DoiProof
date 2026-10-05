import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import JSZip from 'jszip';
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import { canonicalJson } from './canonical.mjs';
import { bundleReadme } from './bundle.mjs';
import { fixedTimeZone, formatCoordinate, formatDecimal, formatDuration, formatInt, formatLongDate, reportNumber, zoneLabel } from './format.mjs';
import { readImageInfo } from './image.mjs';
import { callTool } from './mcp.mjs';
import { ianaTimeZone, loadFonts, nodeSha256 } from './node.mjs';
import { createPdfReport, pdfFileName, verifyPackage } from './pipeline.mjs';
import { buildReportModel } from './report-model.mjs';
import { SensorCollector, barometricAltitude, notRequestedSensors, seriesStats, validateSensors } from './sensors.mjs';
import { utf8Decode, utf8Encode } from './util.mjs';
import { analyzeBundle, checkOnline, localSummary } from './verify.mjs';
import { CAPTURE_MS, PRE_CAPTURE, SYNTHETIC_JPEG, buildBundle, fakeChain } from '../scripts/fixtures/fixture.mjs';
import { cli, FONT_DIR } from '../scripts/verify.mjs';

const BERLIN = ianaTimeZone('Europe/Berlin');
const NOW = new Date('2026-10-01T08:34:12Z');

test('v3 kanonisiert nach UTF-16-Code-Units (RFC 8785), v1/v2 bleiben bei localeCompare', () => {
  const value = { aa: 1, aB: 2, b: [1.5, 'ä', null] };
  assert.equal(canonicalJson(value, 'v3'), '{"aB":2,"aa":1,"b":[1.5,"ä",null]}');
  assert.equal(canonicalJson(value, 'v2'), '{"aa":1,"aB":2,"b":[1.5,"ä",null]}');
  assert.throws(() => canonicalJson({ x: Number.NaN }, 'v3'), /Nicht endliche Zahl/);
  assert.equal(canonicalJson({ x: undefined, y: 1 }, 'v3'), '{"y":1}');
});

test('UTF-8 wird ohne Plattform-APIs kodiert und streng dekodiert', () => {
  const text = 'Prüfbericht ✓ 😀 µ';
  assert.deepEqual(utf8Encode(text), new Uint8Array(Buffer.from(text, 'utf8')));
  assert.equal(utf8Decode(utf8Encode(text)), text);
  for (const bad of [[0xc0, 0xaf], [0xed, 0xa0, 0x80], [0xe2, 0x82], [0xff], [0xf4, 0x90, 0x80, 0x80]]) {
    assert.throws(() => utf8Decode(Uint8Array.from(bad)), /UTF-8/);
  }
});

test('deutsche Formate sind unabhängig von Intl und Gerätesprache', () => {
  assert.equal(formatInt(434177), '434.177');
  assert.equal(formatDecimal(-0.5, 2), '−0,50');
  assert.equal(formatCoordinate(-33.5, 'lat'), '33,50000° S');
  assert.equal(formatCoordinate(11, 'lon'), '11,00000° O');
  assert.equal(formatDuration(39.5 * 60000), '40 Minuten');
  assert.equal(formatDuration(30000), 'unter 1 Minute');
  assert.equal(reportNumber('3df25cfa586b5d03'), '3DF2 5CFA 586B');
  assert.equal(formatLongDate(new Date('2026-10-01T08:03:06Z'), BERLIN), '1. Oktober 2026, 10:03 Uhr');
  assert.equal(zoneLabel(new Date('2026-10-01T08:00:00Z'), BERLIN), 'MESZ');
  assert.equal(zoneLabel(new Date('2026-12-01T08:00:00Z'), BERLIN), 'MEZ');
  assert.equal(zoneLabel(new Date(), fixedTimeZone(-300, 'America/New_York')), 'UTC−5');
});

test('Bildanalyse liest Format, Abmessungen und EXIF-Ausrichtung begrenzt aus', async () => {
  const bytes = new Uint8Array(await readFile(SYNTHETIC_JPEG));
  const info = readImageInfo(bytes);
  assert.equal(info.type.label, 'JPEG');
  assert.equal(info.width, 480);
  assert.equal(info.height, 360);
  assert.equal(info.exif.orientation, 6);
  assert.equal(info.exif.make, 'DoiProof Test');
  assert.equal(info.exif.dateTimeOriginal, '2026:10:01 09:31:35');
  assert.equal(info.exif.hasGps, undefined);
  for (let cut = 0; cut < 400; cut += 7) assert.doesNotThrow(() => readImageInfo(bytes.subarray(0, cut)));
  assert.equal(readImageInfo(Uint8Array.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63])).type.label, 'HEIC');
});

test('Sensorerfassung trennt Phasen, begrenzt Reihen und wählt den Wert zur Aufnahme', () => {
  let now = 1_000_000;
  const collector = new SensorCollector({ now: () => now, platform: 'ios' });
  for (let i = 0; i < 25; i++) collector.add('accelerometer', { x: i, y: 0, z: 1 }, now + i * 200);
  collector.markCameraOpened(now + 5000);
  for (let i = 0; i < 15; i++) collector.add('accelerometer', { x: 100 + i, y: 0, z: 1 }, now + 5000 + i * 200);
  collector.markCameraReturned(now + 8000);
  for (let i = 0; i < 15; i++) collector.add('accelerometer', { x: 200 + i, y: 0, z: 1 }, now + 8100 + i * 200);
  collector.add('gyroscope', { x: Number.NaN, y: undefined, z: null });
  collector.setStatus('light', 'unavailable', 'Kein Lichtsensor auf diesem Gerät.');
  collector.setStatus('barometer', 'permission_denied', 'Bewegungs- und Fitnessdaten nicht freigegeben.');
  now += 12000;
  const block = collector.toManifest();
  const acc = block.accelerometer;
  assert.equal(acc.status, 'recorded');
  assert.equal(acc.received, 55);
  assert.equal(acc.series.length, 30);
  assert.equal(acc.series[0].x, 15);
  assert.equal(acc.series[10].x, 105);
  assert.equal(acc.series[29].x, 209);
  assert.equal(acc.reading.x, 200);
  assert.equal(block.gyroscope.status, 'no_data');
  assert.equal(block.light.status, 'unavailable');
  assert.equal(block.barometer.status, 'permission_denied');
  assert.match(block.barometer.reason, /nicht freigegeben/);
  assert.equal(validateSensors(block), null);
  assert.equal(validateSensors(notRequestedSensors()), null);
  assert.match(String(validateSensors({ ...block, light: { status: 'kaputt' } })), /Sensorstatus/);
  assert.match(String(validateSensors({ ...block, accelerometer: { ...acc, reading: { at: 'gestern', x: 1 } } })), /Einzelwert/);
  const { compass, ...withoutCompass } = block;
  assert.ok(compass);
  assert.match(String(validateSensors(withoutCompass)), /fehlt/);
  assert.deepEqual(seriesStats([{ at: '', x: 1 }, { at: '', x: 3 }], 'x'), { count: 2, min: 1, max: 3, mean: 2 });
  assert.equal(Math.round(barometricAltitude(1013.25)), 0);
});

test('Manifest v3 mit Sensoren wird vollständig geprüft; v1 und v2 bleiben prüfbar', async () => {
  for (const version of /** @type {const} */ (['v1', 'v2', 'v3'])) {
    const { zipBytes, evidence } = await buildBundle({ version });
    const analysis = await analyzeBundle(zipBytes, { sha256: nodeSha256 });
    assert.equal(analysis.ok, true, `${version}: ${analysis.error}`);
    assert.equal(analysis.version, version);
    assert.equal(analysis.hashes.evidenceSha256, evidence.evidenceSha256);
  }
  const { zipBytes } = await buildBundle({ version: 'v3' });
  const zip = await JSZip.loadAsync(zipBytes);
  assert.match(await zip.file('README.txt')?.async('string') ?? '', /RFC 8785/);
  assert.match(bundleReadme('v2'), /localeCompare/);
});

test('veränderte Sensorwerte, ungültiger Sensorblock und falsche Kanonisierung schlagen fehl', async () => {
  const original = await buildBundle({ version: 'v3' });
  const zip = await JSZip.loadAsync(original.zipBytes);
  const manifest = JSON.parse(await zip.file('manifest.json')?.async('string') ?? '{}');
  manifest.sensors.barometer.reading.pressure += 0.5;
  zip.file('manifest.json', `${canonicalJson(manifest, 'v3')}\n`);
  const tampered = await analyzeBundle(await zip.generateAsync({ type: 'uint8array' }), { sha256: nodeSha256 });
  assert.equal(tampered.ok, false);
  assert.equal(tampered.steps.photo, 'ok');
  assert.equal(tampered.steps.manifest, 'failed');
  assert.match(String(tampered.error), /Manifest-Hash/);

  const invalid = await buildBundle({ version: 'v3', modify: m => { m.sensors.light = { status: 'recorded' }; } });
  const result = await analyzeBundle(invalid.zipBytes, { sha256: nodeSha256 });
  assert.equal(result.ok, false);
  assert.match(String(result.error), /Einzelwert: light/);

  const legacyOrder = await buildBundle({ version: 'v3', modify: m => { m.extra = { aB: 1, aa: 2 }; } });
  const z2 = await JSZip.loadAsync(legacyOrder.zipBytes);
  z2.file('manifest.json', `${canonicalJson(legacyOrder.manifest, 'v2')}\n`);
  const order = await analyzeBundle(await z2.generateAsync({ type: 'uint8array' }), { sha256: nodeSha256 });
  assert.match(String(order.error), /nicht kanonisch/);
});

test('Dekomprimierung bricht an der echten Größe ab, auch wenn das ZIP kleinere Größen behauptet', async () => {
  const { zipBytes } = await buildBundle({ version: 'v3' });
  const zip = await JSZip.loadAsync(zipBytes);
  zip.file('verification.json', ' '.repeat(3 * 1024 * 1024));
  const bomb = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  // Behauptete Größe im zentralen Verzeichnis und im lokalen Kopf auf 10 Byte fälschen.
  const view = new DataView(bomb.buffer, bomb.byteOffset, bomb.byteLength);
  const name = 'verification.json';
  for (let i = 0; i < bomb.length - 46; i++) {
    const sig = view.getUint32(i, true);
    if (sig === 0x02014b50 && new TextDecoder().decode(bomb.subarray(i + 46, i + 46 + name.length)) === name) view.setUint32(i + 24, 10, true);
    if (sig === 0x04034b50 && new TextDecoder().decode(bomb.subarray(i + 30, i + 30 + name.length)) === name) view.setUint32(i + 22, 10, true);
  }
  const result = await analyzeBundle(bomb, { sha256: nodeSha256 });
  assert.equal(result.ok, false);
  assert.match(String(result.error), /Größenbegrenzung: verification\.json/);
});

test('beschädigte ZIP-Daten werden über CRC32 erkannt und kein ZIP ergibt einen Fehlbericht', async () => {
  const { zipBytes, photoBytes } = await buildBundle({ version: 'v3' });
  const zip = await JSZip.loadAsync(zipBytes);
  const stored = await zip.generateAsync({ type: 'uint8array', compression: 'STORE' });
  const probe = photoBytes.subarray(2000, 2032);
  let at = -1;
  for (let i = 0; i < stored.length - probe.length && at < 0; i++) if (probe.every((b, k) => stored[i + k] === b)) at = i;
  assert.ok(at > 0);
  const corrupt = stored.slice();
  corrupt[at + 5] ^= 0xff;
  const result = await analyzeBundle(corrupt, { sha256: nodeSha256 });
  assert.equal(result.ok, false);
  assert.match(String(result.error), /CRC32/);
  const notZip = await analyzeBundle(new TextEncoder().encode('kein zip'), { sha256: nodeSha256 });
  assert.equal(notZip.failedStep, 'zip');
  const model = buildReportModel({ analysis: notZip, fileName: 'x.zip', generatedAt: NOW, timeZone: BERLIN });
  assert.equal(model.outcome, 'failed');
  assert.equal(model.number, reportNumber(notZip.zip.sha256));
});

test('Online-Abgleich prüft Transaktion, Block und beide Vorabblöcke', async () => {
  const { zipBytes } = await buildBundle({ version: 'v3' });
  const analysis = await analyzeBundle(zipBytes, { sha256: nodeSha256 });
  const local = localSummary(analysis);
  const chain = fakeChain({ evidence: local.evidenceSha256 });
  const online = await checkOnline(local, { fetchImpl: chain.fetchImpl });
  assert.equal(online.status, 'matched');
  assert.equal(online.anchor.confirmations, 7);
  assert.equal(online.anchor.blockTimeUtc, '2026-10-01T08:03:06.000Z');
  assert.equal(online.preCapture?.bitcoin.status, 'matched');
  assert.equal(online.preCapture?.doichain.status, 'matched');
  assert.deepEqual(chain.calls.sort(), ['btc', 'check_proof', 'get_block', 'get_block', 'get_transaction'].sort());

  const pending = await checkOnline(local, { fetchImpl: fakeChain({ evidence: local.evidenceSha256, status: 'pending' }).fetchImpl });
  assert.equal(pending.status, 'incomplete');
  const wrongBtc = await checkOnline({ ...local, preCapture: { ...PRE_CAPTURE, bitcoin: { ...PRE_CAPTURE.bitcoin, height: 1 } } }, { fetchImpl: chain.fetchImpl });
  assert.equal(wrongBtc.status, 'failed');
  const offline = await checkOnline(local, { fetchImpl: /** @type {any} */ (async () => { throw new Error('offline'); }), timeoutMs: 50 });
  assert.equal(offline.status, 'incomplete');
  assert.equal(offline.anchor.status, 'unavailable');
});

test('MCP-Client liest auch Server-Sent-Events', async () => {
  /** @type {any} */
  const fetchImpl = async () => ({
    ok: true, status: 200,
    headers: { get: () => 'text/event-stream' },
    text: async () => 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"structuredContent":{"status":"pending"}}}\n\n',
  });
  assert.deepEqual(await callTool('check_proof', {}, { fetchImpl }), { status: 'pending' });
  /** @type {any} */
  const failing = async () => ({ ok: false, status: 429, json: async () => ({ error: { message: 'Kontingent erschöpft' } }) });
  await assert.rejects(callTool('anchor_proof', {}, { fetchImpl: failing }), /Kontingent erschöpft/);
});

test('Berichtsmodell: Ergebnis, Kacheln, QR und Anhang mit jeder Manifestangabe', async () => {
  const { zipBytes, manifest } = await buildBundle({ version: 'v3', modify: m => { m.extra = { note: 'Zusatzfeld' }; } });
  const { analysis, online } = await verifyPackage(zipBytes, { sha256: nodeSha256, online: true, fetchImpl: fakeChain({ evidence: '0'.repeat(64) }).fetchImpl });
  // Der Dienst meldet einen anderen Paket-Hash → Widerspruch
  assert.equal(online?.status, 'failed');
  const failed = buildReportModel({ analysis, online, fileName: 'p.zip', generatedAt: NOW, timeZone: BERLIN });
  assert.equal(failed.outcome, 'failed');
  assert.doesNotMatch(`${failed.banner.title} ${failed.banner.accent}`, /[Ee]cht/);

  const chain = fakeChain({ evidence: /** @type {string} */ (analysis.hashes.evidenceSha256) });
  const matched = await checkOnline(localSummary(analysis), { fetchImpl: chain.fetchImpl, now: () => NOW });
  const model = buildReportModel({ analysis, online: matched, fileName: 'p.zip', generatedAt: NOW, timeZone: BERLIN });
  assert.equal(model.outcome, 'passed');
  assert.equal(model.banner.title, 'Echt versiegelt');
  assert.equal(model.glance.length, 6);
  assert.equal(model.tiles.length, 6);
  assert.equal(model.tiles.filter(t => t.kind === 'proof').length, 4);
  assert.equal(model.timeline.accent, '40 Minuten');
  assert.equal(model.timeline.zone, 'Ortszeit MESZ');
  assert.equal(model.qr?.url, `https://verifile.it/#${analysis.hashes.evidenceSha256}`);
  assert.match(model.proves, /nicht vor 07:23:36 UTC erstellt/);
  const groups = model.appendix.groups.map(g => g.title);
  for (const title of ['Standort / GNSS', 'Bewegungssensoren', 'Magnetfeld / Kompass', 'Luftdruck', 'Licht', 'Kamera / EXIF', 'Gerät / App', 'Netz / Zeitanker']) assert.ok(groups.includes(title), title);
  const rest = model.appendix.groups.find(g => g.title === 'Weitere Angaben im Manifest');
  assert.deepEqual(rest?.rows.map(r => r.quantity), ['extra.note']);
  const light = model.appendix.groups.find(g => g.title === 'Licht')?.rows[0];
  assert.equal(light?.value, 'nicht erfasst');
  assert.match(String(light?.note), /nicht verfügbar – Kein Lichtsensor/);
  assert.equal(model.appendix.series.length, 5);
  assert.ok(manifest.sensors.accelerometer.series.length > 10);

  const offline = buildReportModel({ analysis, online: null, fileName: 'p.zip', generatedAt: NOW, timeZone: BERLIN, includeLocation: false, includePhoto: false });
  assert.equal(offline.outcome, 'incomplete');
  assert.equal(offline.photo, null);
  assert.doesNotMatch(JSON.stringify(offline), /48,00000|11,00000/);
  assert.match(offline.photoNote, /nicht eingebettet/);
});

test('v2-Anhang vermerkt fehlende Sensordaten ausdrücklich', async () => {
  const { zipBytes } = await buildBundle({ version: 'v2' });
  const analysis = await analyzeBundle(zipBytes, { sha256: nodeSha256 });
  const model = buildReportModel({ analysis, fileName: 'v2.zip', generatedAt: NOW, timeZone: BERLIN });
  const motion = model.appendix.groups.find(g => g.title === 'Bewegungssensoren');
  assert.match(String(motion?.rows[0].note), /Manifest v2 enthält keine Sensordaten/);
});

test('PDF-Bericht wird mit eingebetteten Schriften, Foto und Anhang erzeugt – auch bei Fehlern', async () => {
  const fonts = await loadFonts(FONT_DIR);
  const { zipBytes } = await buildBundle({ version: 'v3' });
  const { analysis } = await verifyPackage(zipBytes, { sha256: nodeSha256 });
  const { pdf, model } = await createPdfReport({ analysis, fileName: 'p.zip', fonts, generatedAt: NOW, timeZone: BERLIN, producer: 'Test' });
  const doc = await PDFDocument.load(pdf);
  assert.ok(doc.getPageCount() >= 4);
  assert.equal(doc.getTitle(), model.title);
  assert.equal(doc.getCreator(), 'Test');
  const names = doc.context.enumerateIndirectObjects()
    .map(([, object]) => (object instanceof PDFDict ? object.get(PDFName.of('FontName'))?.toString() ?? '' : ''))
    .filter(Boolean).join(' ');
  for (const font of ['Fraunces-SemiBold', 'Fraunces-Italic', 'IBMPlexSans-', 'IBMPlexSans-SmBld', 'IBMPlexMono-', 'IBMPlexMono-Medm']) assert.match(names, new RegExp(font));
  assert.match(new TextDecoder('latin1').decode(pdf), /\/Subtype \/Image/);
  assert.equal(pdfFileName(model.meta), `DoiProof-Pruefbericht-${analysis.hashes.evidenceSha256?.slice(0, 12)}.pdf`);

  const broken = await analyzeBundle(new Uint8Array(10), { sha256: nodeSha256 });
  const failedPdf = await createPdfReport({ analysis: broken, fileName: 'kaputt.zip', fonts, generatedAt: NOW, timeZone: BERLIN, producer: 'Test' });
  assert.equal(failedPdf.model.outcome, 'failed');
  assert.ok((await PDFDocument.load(failedPdf.pdf)).getPageCount() >= 3);
});

test('Kommandozeile schreibt PDF, verweigert Überschreiben und meldet Fehler mit Exitcode 1', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'doiproof-cli-'));
  try {
    const { zipBytes, evidence } = await buildBundle({ version: 'v3' });
    const zipPath = join(dir, 'paket.zip');
    const pdfPath = join(dir, 'bericht.pdf');
    await writeFile(zipPath, zipBytes);
    let output = '';
    const io = { stdout: (/** @type {string} */ text) => { output += text; }, now: () => NOW };
    assert.equal(await cli([zipPath, '--pdf', pdfPath, '--zeitzone', 'Europe/Berlin'], io), 0);
    assert.match(output, new RegExp(evidence.evidenceSha256));
    assert.ok((await readFile(pdfPath)).subarray(0, 5).toString() === '%PDF-');
    await assert.rejects(cli([zipPath, '--pdf', pdfPath], io), /existiert bereits/);
    const chain = fakeChain({ evidence: evidence.evidenceSha256 });
    assert.equal(await cli([zipPath, '--online', '--json'], { ...io, fetchImpl: chain.fetchImpl }), 0);
    assert.equal(await cli([zipPath, '--online'], { ...io, fetchImpl: fakeChain({ evidence: evidence.evidenceSha256, status: 'pending' }).fetchImpl }), 2);

    const badPath = join(dir, 'kaputt.zip');
    await writeFile(badPath, 'kein zip');
    const stderr = process.stderr.write;
    process.stderr.write = () => true;
    try {
      assert.equal(await cli([badPath, '--pdf', join(dir, 'fehler.pdf')], io), 1);
    } finally { process.stderr.write = stderr; }
    assert.ok((await readFile(join(dir, 'fehler.pdf'))).length > 1000);
    await assert.rejects(cli([zipPath, '--pdf', join(dir, 'x.txt')], io), /Endung \.pdf/);
    await assert.rejects(cli([zipPath, '--unbekannt'], io), /Unbekanntes Argument/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('Fixture-Zeitpunkte sind plausibel', () => {
  assert.ok(Date.parse(PRE_CAPTURE.bitcoin.headerTimeUtc) < CAPTURE_MS);
});
