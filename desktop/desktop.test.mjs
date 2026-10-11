import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, writeFile, mkdtemp, rm, appendFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { evidenceDetails } from './details.mjs';
import { VIEWER_MAP_SIZE, mapView } from './core/map.mjs';
import { createDesktopPdf, defaultReportName, markdownReport, verifyForDesktop, VERSION } from './report.mjs';
import { buildBundle, fakeChain, fakeTileServer } from '../scripts/fixtures/fixture.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('Desktop nutzt exakt den gemeinsamen Kern und dieselben Schriften wie CLI und App', async () => {
  const names = (await readdir(new URL('../core/', import.meta.url))).filter(name => name.endsWith('.mjs') && !name.endsWith('.test.mjs'));
  assert.ok(names.includes('report-pdf.mjs') && names.includes('verify.mjs'));
  for (const name of names) {
    assert.equal(sha(await readFile(new URL(`./core/${name}`, import.meta.url))), sha(await readFile(new URL(`../core/${name}`, import.meta.url))), name);
  }
  for (const name of (await readdir(new URL('../assets/fonts/', import.meta.url))).filter(n => n.endsWith('.ttf'))) {
    assert.equal(sha(await readFile(new URL(`./fonts/${name}`, import.meta.url))), sha(await readFile(new URL(`../assets/fonts/${name}`, import.meta.url))), name);
  }
  const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.version, VERSION);
  assert.ok(pkg.build.files.includes('core/**/*.mjs') && pkg.build.files.includes('fonts/**/*'));
});

test('Prüfung, Online-Abgleich und PDF-Bericht im Hauptprozess (Manifest v3)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'doiproof-desktop-'));
  try {
    const { zipBytes, evidence } = await buildBundle({ version: 'v3' });
    const path = join(dir, 'paket.zip');
    await writeFile(path, zipBytes);
    const chain = fakeChain({ evidence: evidence.evidenceSha256 });
    const { full, summary } = await verifyForDesktop(path, true, { fetchImpl: chain.fetchImpl });
    assert.equal(summary.ok, true);
    assert.equal(summary.online?.status, 'matched');
    assert.equal(summary.local?.evidenceSha256, evidence.evidenceSha256);
    assert.equal('manifest' in summary, false, 'Die Oberfläche erhält keine Manifestinhalte');
    assert.match(markdownReport(summary), /Sensoren im Manifest: 5 erfasst/);
    assert.equal(defaultReportName(full), `DoiProof-Pruefbericht-${evidence.evidenceSha256.slice(0, 12)}.pdf`);
    const { pdf, model } = await createDesktopPdf(full, { includeLocation: false });
    assert.equal(new TextDecoder().decode(pdf.subarray(0, 5)), '%PDF-');
    assert.equal(model.outcome, 'passed');
    assert.match(model.producer, /Windows/);
    // „Karte im PDF“: Kacheln über den Lader des Hauptprozesses, ohne Standort keine Abfrage
    const tiles = fakeTileServer();
    const loader = { fetchImpl: tiles.fetchImpl, userAgent: 'DoiProof-Pruefer/test (+https://github.com/neubuot/DoiProof)' };
    assert.equal((await createDesktopPdf(full, { includeLocation: false, includeMap: true, mapLoader: loader })).mapStatus.state, 'location_hidden');
    assert.equal(tiles.calls.length, 0);
    const withMap = await createDesktopPdf(full, { includeMap: true, mapLoader: loader });
    assert.equal(withMap.mapStatus.state, 'included');
    assert.equal(withMap.model.locationMap?.tiles?.length, tiles.calls.length);
    await appendFile(path, 'x');
    await assert.rejects(createDesktopPdf(full), /seit der Prüfung geändert/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('Fehlgeschlagene Prüfung liefert PDF, aber keinen Markdown-Kurzbericht', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'doiproof-desktop-'));
  try {
    const { zipBytes } = await buildBundle({ version: 'v3' });
    const zip = await JSZip.loadAsync(zipBytes);
    zip.file('original.jpg', 'manipuliert');
    const path = join(dir, 'manipuliert.zip');
    await writeFile(path, await zip.generateAsync({ type: 'uint8array' }));
    const { full, summary } = await verifyForDesktop(path, true);
    assert.equal(summary.ok, false);
    assert.equal(summary.failedStep, 'photo');
    assert.equal(summary.online, null);
    assert.throws(() => markdownReport(summary), /PDF-Bericht/);
    const { model } = await createDesktopPdf(full);
    assert.equal(model.outcome, 'failed');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('Details sind an das geprüfte ZIP gebunden und enthalten das vollständige Manifest', async () => {
  const { zipBytes, manifest, evidence } = await buildBundle({ version: 'v3' });
  const details = await evidenceDetails(zipBytes, evidence.evidenceSha256);
  assert.deepEqual(details.manifest, manifest);
  assert.equal(details.verification.evidenceSha256, evidence.evidenceSha256);
  assert.match(details.photoPreview, /^data:image\/jpeg;base64,/);
  assert.equal(details.manifest.sensors.accelerometer.status, 'recorded');
  await assert.rejects(evidenceDetails(zipBytes, '0'.repeat(64)), /seit der Prüfung geändert/);
  const v2 = await buildBundle({ version: 'v2' });
  assert.equal((await evidenceDetails(v2.zipBytes, v2.evidence.evidenceSha256)).manifest.schema, 'org.doichain.doiproof.evidence/v2');
});

test('Kartenansicht lädt einen lückenlosen Ausschnitt um die Koordinate und weist ungültige Koordinaten ab', async () => {
  const view = mapView(48.19, 16.37, VIEWER_MAP_SIZE);
  assert.ok(view.tiles.length >= 6 && view.tiles.length <= 12);
  assert.ok(view.tiles.every(tile => tile.x >= 0 && tile.x < 16384 && tile.y >= 0 && tile.y < 16384));
  // Jede Kartenbreite bis 768 px ist bei der Mitte als Bezugspunkt abgedeckt
  for (const x of [0, 383.9, 767.9]) for (const y of [0, 339.9]) {
    assert.equal(view.tiles.filter(t => x >= t.left && x < t.left + 256 && y >= t.top && y < t.top + 256).length, 1);
  }
  assert.throws(() => mapView(91, 16.37, VIEWER_MAP_SIZE), /gültigen Koordinaten/);
  const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
  assert.ok(!pkg.build.files.includes('map.mjs'), 'desktop/map.mjs ist im gemeinsamen Kern aufgegangen');
});
