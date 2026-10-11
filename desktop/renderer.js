const $ = id => document.getElementById(id);
const ui = {
  select: $('select-button'), drop: $('drop-zone'), fileHint: $('file-hint'),
  filePath: $('file-path'), online: $('online-toggle'), verify: $('verify-button'),
  verifyLabel: $('verify-label'), result: $('result'), pill: $('result-pill'),
  chainTitle: $('chain-title'), chainDescription: $('chain-description'),
  chainDetails: $('chain-details'), hash: $('evidence-hash'),
  version: $('format-version'), time: $('verified-time'), save: $('save-button'),
  copy: $('copy-button'), alert: $('alert'),
  reveal: $('reveal-button'), evidence: $('evidence-content'), photo: $('photo-preview'),
  photoButton: $('photo-button'), photoPlaceholder: $('photo-placeholder'),
  photoCaption: $('photo-caption'), photoSize: $('photo-size'), photoDialog: $('photo-dialog'),
  photoLarge: $('photo-large'), photoClose: $('photo-close'),
  locationEmpty: $('location-empty'), locationContent: $('location-content'),
  coordinates: $('coordinates'), mapButton: $('map-button'), map: $('map'), mapGrid: $('map-grid'),
  metadata: $('metadata-list'), metadataCount: $('metadata-count'), manifestJson: $('manifest-json'),
  verificationJson: $('verification-json'), hashLabel: $('hash-label'),
  localCard: $('local-card'), localIcon: $('local-icon'), localTitle: $('local-title'),
  localDescription: $('local-description'), pdfPhoto: $('pdf-photo'), pdfLocation: $('pdf-location'), pdfMap: $('pdf-map'),
};
let file = null;
let result = null;
let busy = false;
let details = null;

function say(message, kind = 'error') {
  ui.alert.textContent = message;
  ui.alert.classList.toggle('info', kind === 'info');
  ui.alert.hidden = false;
}
function clearMessage() { ui.alert.hidden = true; ui.alert.textContent = ''; }
function step(id, state) {
  $(id).classList.remove('active', 'done');
  if (state) $(id).classList.add(state);
}
function resetResult() {
  result = null;
  details = null;
  ui.photoDialog.close?.();
  ui.photo.src = '';
  ui.photoLarge.src = '';
  ui.mapGrid.replaceChildren();
  ui.map.hidden = true;
  ui.pdfMap.checked = false;
  ui.evidence.hidden = true;
  ui.reveal.disabled = false;
  ui.reveal.textContent = 'Details anzeigen ↗';
  ui.result.hidden = true;
  step('step-local', '');
  step('step-chain', '');
  step('step-report', '');
}
function setBusy(value) {
  busy = value;
  ui.select.disabled = value;
  ui.verify.disabled = value || !file;
  ui.online.disabled = value;
  ui.save.disabled = value;
  ui.reveal.disabled = value || !result?.ok || !!details;
  ui.verifyLabel.textContent = value ? 'Prüfung läuft …' : 'Paket prüfen';
}
async function choose(path) {
  if (!path || busy) return;
  try {
    clearMessage();
    file = await window.doiproof.checkFile(path);
    resetResult();
    ui.fileHint.textContent = file.name + ' · ' + (file.bytes / (1024 * 1024)).toFixed(2) + ' MiB';
    ui.filePath.textContent = file.path;
    ui.filePath.hidden = false;
    ui.verify.disabled = false;
    step('step-file', 'done');
    step('step-local', 'active');
  } catch (error) { say(error.message); }
}
ui.select.addEventListener('click', async () => {
  try { await choose(await window.doiproof.selectZip()); }
  catch (error) { say(error.message); }
});
ui.drop.addEventListener('dragover', event => { event.preventDefault(); if (!busy) ui.drop.classList.add('dragging'); });
ui.drop.addEventListener('dragleave', () => ui.drop.classList.remove('dragging'));
ui.drop.addEventListener('drop', event => {
  event.preventDefault();
  ui.drop.classList.remove('dragging');
  if (busy) return;
  const dropped = event.dataTransfer.files[0];
  if (dropped) choose(window.doiproof.pathForFile(dropped));
});
document.addEventListener('dragover', event => event.preventDefault());
document.addEventListener('drop', event => event.preventDefault());
ui.online.addEventListener('change', () => {
  if (result) {
    resetResult();
    step('step-local', 'active');
    say('Prüfoption geändert. Bitte das Paket erneut prüfen.', 'info');
  }
});

const stateText = {
  matched: 'STIMMT ÜBEREIN',
  pending: 'AUSSTEHEND',
  failed: 'WIDERSPRUCH',
  unavailable: 'NICHT ERREICHBAR',
};
function addCheck(check) {
  const row = document.createElement('div');
  row.className = 'check-row';
  const name = document.createElement('span');
  name.className = 'check-name';
  name.textContent = check.name;
  const status = document.createElement('span');
  status.className = 'check-state ' + (check.status === 'matched' ? '' :
    check.status === 'failed' ? 'failed' : 'incomplete');
  status.textContent = stateText[check.status] || check.status;
  const detail = document.createElement('span');
  detail.className = 'check-detail';
  detail.textContent = check.details;
  row.append(name, status, detail);
  ui.chainDetails.append(row);
}
function showFailure(report) {
  ui.pill.textContent = 'PRÜFUNG FEHLGESCHLAGEN';
  ui.pill.classList.add('failed');
  ui.localCard.classList.add('failed');
  ui.localIcon.textContent = '×';
  ui.localTitle.textContent = 'Paket nicht unverändert';
  ui.localDescription.textContent = report.error || 'Die lokale Prüfung ist fehlgeschlagen.';
  ui.hashLabel.textContent = 'ZIP-DATEI SHA-256';
  ui.hash.textContent = report.zipSha256;
  ui.version.textContent = 'FEHLER BEI: ' + ({ zip: 'ZIP', structure: 'AUFBAU', photo: 'FOTO', manifest: 'MANIFEST', evidence: 'PAKET-HASH' }[report.failedStep] || 'PRÜFUNG');
  ui.chainTitle.textContent = 'Nicht abgefragt';
  ui.chainDescription.textContent = 'Ein verändertes Paket wird nicht online abgeglichen. Der PDF-Bericht dokumentiert den Fehler.';
  ui.reveal.disabled = true;
  step('step-chain', '');
}
function showResult(report) {
  result = report;
  const online = report.online;
  ui.result.hidden = false;
  ui.localCard.classList.remove('failed');
  ui.localIcon.textContent = '✓';
  ui.localTitle.textContent = 'Byteintegrität bestätigt';
  ui.localDescription.textContent = 'Bildbytes, kanonisches Manifest und Paket-Hash stimmen zusammen.';
  ui.hashLabel.textContent = 'BEWEISPAKET SHA-256';
  ui.time.textContent = 'GEPRÜFT ' + new Date(report.generatedAtUtc).toLocaleString('de-DE');
  ui.chainDetails.replaceChildren();
  ui.chainDetails.hidden = !online;
  ui.pill.className = 'result-pill';
  if (!report.ok) {
    showFailure(report);
    step('step-local', 'active');
    step('step-report', 'active');
    ui.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  ui.hash.textContent = report.local.evidenceSha256;
  ui.version.textContent = 'MANIFEST ' + report.local.version.toUpperCase();
  if (!online) {
    ui.pill.textContent = 'OFFLINE GEPRÜFT';
    ui.chainTitle.textContent = 'Nicht abgefragt';
    ui.chainDescription.textContent = 'Die lokale Prüfung benötigt keinen Netzwerkzugang.';
    step('step-chain', '');
  } else {
    const status = online.status;
    ui.pill.textContent = status === 'matched' ? 'KETTENABFRAGE ERFOLGREICH'
      : status === 'failed' ? 'WIDERSPRUCH GEFUNDEN' : 'ABFRAGE UNVOLLSTÄNDIG';
    if (status !== 'matched') ui.pill.classList.add(status);
    ui.chainTitle.textContent = status === 'matched' ? 'Abfragen stimmen überein'
      : status === 'failed' ? 'Widerspruch bei Kettenabfrage' : 'Noch nicht vollständig';
    ui.chainDescription.textContent = status === 'matched'
      ? 'Die angefragten Dienste bestätigen Transaktion und vorhandene Vorabblöcke.'
      : status === 'failed' ? 'Die Dienstantwort passt nicht zum Paket. Details unten prüfen.'
        : 'Ein Dienst war nicht erreichbar oder der Nachweis ist noch ausstehend.';
    for (const check of online.checks) addCheck(check);
    step('step-chain', status === 'matched' ? 'done' : 'active');
  }
  step('step-local', 'done');
  step('step-report', 'active');
  ui.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const labels = {
  schema: 'Format', createdAt: 'Manifest erstellt (Gerätezeit)', profile: 'Metadatenprofil',
  preCapture: 'Vorabblöcke', bitcoin: 'Bitcoin', doichain: 'Doichain', chain: 'Kette',
  hash: 'Block-Hash', height: 'Blockhöhe', headerTimeUtc: 'Blockzeit (UTC)',
  observedAtDeviceUtc: 'Abfragezeit (Gerät)', app: 'App', version: 'Version',
  sourceCommit: 'Quellcode-Commit', identification: 'Identifikation', photo: 'Foto',
  sha256: 'SHA-256', width: 'Breite (px)', heightPx: 'Höhe (px)', fileSize: 'Dateigröße (Byte)',
  mimeType: 'MIME-Typ', fileName: 'Dateiname', capture: 'Aufnahme', deviceTime: 'Aufnahmezeit (Gerät)',
  source: 'Quelle', location: 'Standort', latitude: 'Breitengrad', longitude: 'Längengrad',
  altitude: 'Höhe (m)', accuracy: 'Horizontale Genauigkeit (m)',
  altitudeAccuracy: 'Vertikale Genauigkeit (m)', heading: 'Richtung (°)', speed: 'Geschwindigkeit (m/s)',
  measuredAt: 'Standortmessung (UTC)', mocked: 'Als simuliert markiert', device: 'Gerät',
  platform: 'Betriebssystem', osVersion: 'OS-Version', appVersion: 'App-Version', model: 'Gerätemodell',
  status: 'Status', reason: 'Begründung', cameraOpenedAt: 'Kamera geöffnet (Gerät)',
  sensors: 'Sensoren', window: 'Messfenster', startedAt: 'Beginn (Gerät)', endedAt: 'Ende (Gerät)',
  intervalMs: 'Abtastintervall (ms)', accelerometer: 'Beschleunigungssensor', gyroscope: 'Gyroskop',
  magnetometer: 'Magnetometer', compass: 'Kompass', barometer: 'Barometer', light: 'Lichtsensor',
  units: 'Einheiten', received: 'Empfangene Messungen', reading: 'Einzelwert zur Aufnahme',
  series: 'Messreihe', at: 'Zeitpunkt (Gerät)', pressure: 'Luftdruck (hPa)', relativeAltitude: 'Relative Höhe (m)',
  illuminance: 'Beleuchtungsstärke (lx)', magHeading: 'Richtung magnetisch Nord (°)',
  trueHeading: 'Richtung geografisch Nord (°)', update: 'App-Update', channel: 'Kanal',
  runtimeVersion: 'Laufzeitversion', updateId: 'Update-ID', embedded: 'Eingebettetes Bundle',
};
function label(path, index) {
  const key = path[index];
  if (/^\d+$/.test(key)) return 'Nr. ' + (Number(key) + 1);
  if (key === 'accuracy' && path.includes('compass')) return 'Kalibrierung (0–3)';
  if (['x', 'y', 'z'].includes(key)) return key.toUpperCase();
  return labels[key] || key;
}
function flatten(value, path = [], output = []) {
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length) for (const [key, child] of entries) flatten(child, [...path, key], output);
    else output.push([path, Array.isArray(value) ? '[]' : '{}']);
  } else output.push([path, value === null ? 'Nicht erfasst' : typeof value === 'boolean' ? value ? 'Ja' : 'Nein' : String(value)]);
  return output;
}
function showDetails(data) {
  details = data;
  ui.evidence.hidden = false;
  ui.reveal.textContent = 'Details eingeblendet ✓';
  ui.reveal.disabled = true;
  ui.photoSize.textContent = (data.photoBytes / (1024 * 1024)).toFixed(2) + ' MiB';
  ui.photoCaption.textContent = data.photoFile + ' · SHA-256 im Paket geprüft. Anklicken zum Vergrößern.';
  ui.photo.src = data.photoPreview || '';
  ui.photo.hidden = !data.photoPreview;
  ui.photoButton.disabled = !data.photoPreview;
  ui.photoPlaceholder.textContent = data.previewReason || '';
  ui.photoPlaceholder.hidden = !!data.photoPreview;
  if (!data.photoPreview) ui.photoCaption.textContent = data.photoFile + ' · ' + data.previewReason;
  const loc = data.manifest.location;
  const hasCoords = Number.isFinite(loc?.latitude) && Number.isFinite(loc?.longitude)
    && Math.abs(loc.latitude) <= 90 && Math.abs(loc.longitude) <= 180;
  ui.locationEmpty.hidden = hasCoords;
  ui.locationContent.hidden = !hasCoords;
  if (hasCoords) ui.coordinates.textContent = `${loc.latitude.toFixed(6)}°, ${loc.longitude.toFixed(6)}°`;
  const rows = [...flatten(data.manifest, ['Manifest']), ...flatten(data.verification, ['Exportstatus'])];
  ui.metadata.replaceChildren();
  for (const [path, value] of rows) {
    const row = document.createElement('div'); row.className = 'metadata-item';
    const title = document.createElement('strong'); title.textContent = path.map((_, i) => label(path, i)).join(' · ');
    const key = document.createElement('small'); key.textContent = path.join('.');
    const body = document.createElement('span'); body.textContent = value;
    row.append(title, key, body); ui.metadata.append(row);
  }
  ui.metadataCount.textContent = rows.length + ' Angaben';
  ui.manifestJson.textContent = JSON.stringify(data.manifest, null, 2);
  ui.verificationJson.textContent = JSON.stringify(data.verification, null, 2);
  ui.evidence.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
ui.reveal.addEventListener('click', async () => {
  if (!result?.ok || !file || busy || details) return;
  const selected = result.local.evidenceSha256;
  ui.reveal.disabled = true;
  ui.reveal.textContent = 'Details werden geprüft …';
  try {
    const data = await window.doiproof.showDetails(file.path, selected);
    if (result?.local.evidenceSha256 === selected) showDetails(data);
  } catch (error) { say('Details konnten nicht geladen werden: ' + error.message); }
  finally { if (!details) { ui.reveal.disabled = false; ui.reveal.textContent = 'Details anzeigen ↗'; } }
});
ui.photoButton.addEventListener('click', () => {
  if (!details?.photoPreview) return;
  ui.photoLarge.src = details.photoPreview;
  ui.photoDialog.showModal();
});
ui.photoClose.addEventListener('click', () => ui.photoDialog.close());
ui.photoDialog.addEventListener('click', event => { if (event.target === ui.photoDialog) ui.photoDialog.close(); });
ui.mapButton.addEventListener('click', async () => {
  const loc = details?.manifest.location;
  if (!loc || !Number.isFinite(loc.latitude) || !Number.isFinite(loc.longitude)) return;
  ui.mapButton.disabled = true;
  ui.mapButton.textContent = 'Karte wird geladen …';
  try {
    const tiles = await window.doiproof.mapTiles(loc.latitude, loc.longitude);
    if (details?.manifest.location !== loc) return;
    ui.mapGrid.replaceChildren();
    ui.map.hidden = false;
    for (const tile of tiles) {
      const image = document.createElement('img');
      image.src = tile.data; image.alt = '';
      image.style.left = 'calc(50% + ' + tile.dx + 'px)';
      image.style.top = 'calc(50% + ' + tile.dy + 'px)';
      ui.mapGrid.append(image);
    }
    ui.mapButton.textContent = 'Karte geladen ✓';
    // Wer die Karte hier geladen hat, bekommt sie standardmäßig auch im PDF (Kacheln liegen im Cache).
    if (ui.pdfLocation.checked) ui.pdfMap.checked = true;
  } catch (error) {
    say('Karte nicht verfügbar: ' + error.message + '. Die Koordinaten bleiben oben sichtbar.');
    ui.mapButton.disabled = false; ui.mapButton.textContent = 'Karte erneut laden ↗';
  }
});
ui.verify.addEventListener('click', async () => {
  if (!file || busy) return;
  clearMessage();
  resetResult();
  setBusy(true);
  step('step-local', 'active');
  if (ui.online.checked) step('step-chain', 'active');
  try {
    showResult(await window.doiproof.verify(file.path, ui.online.checked));
  } catch (error) {
    say('Prüfung fehlgeschlagen: ' + error.message);
    step('step-local', 'active');
  } finally { setBusy(false); }
});
ui.pdfLocation.addEventListener('change', () => {
  ui.pdfMap.disabled = !ui.pdfLocation.checked;
  if (!ui.pdfLocation.checked) ui.pdfMap.checked = false;
});
let saving = false;
ui.save.addEventListener('click', async () => {
  if (!result || busy || saving) return;
  // Nur die Speicher-Schaltfläche sperren: Mit Karte dauert das Sichern länger, ein zweiter Klick
  // würde einen zweiten Dialog öffnen und die Kacheln erneut laden.
  saving = true;
  ui.save.disabled = true;
  const withMap = ui.pdfMap.checked && ui.pdfLocation.checked;
  if (withMap) say('Nach der Wahl des Speicherorts wird der Kartenausschnitt geladen und der Bericht erstellt …', 'info');
  try {
    const saved = await window.doiproof.saveReport({
      includePhoto: ui.pdfPhoto.checked, includeLocation: ui.pdfLocation.checked, includeMap: ui.pdfMap.checked,
    });
    if (!saved && withMap) clearMessage();
    if (saved) {
      step('step-report', 'done');
      const map = saved.map;
      const note = map?.state === 'unavailable' ? ' Kartenausschnitt nicht verfügbar: ' + (map.reason || 'Kartendienst nicht erreichbar.')
        : map?.state === 'no_location' ? ' Ohne Kartenausschnitt: kein gemessener Standort in einem bestandenen Paket.' : '';
      say('Bericht gespeichert: ' + saved.path + '.' + note, 'info');
    }
  } catch (error) { say('Bericht konnte nicht gespeichert werden: ' + error.message); }
  finally { saving = false; ui.save.disabled = busy; }
});
ui.copy.addEventListener('click', async () => {
  if (!result) return;
  try {
    await window.doiproof.copyHash(result.ok ? result.local.evidenceSha256 : result.zipSha256);
    say(result.ok ? 'Beweispaket-Hash kopiert.' : 'Hash der ZIP-Datei kopiert.', 'info');
  }
  catch (error) { say(error.message); }
});
