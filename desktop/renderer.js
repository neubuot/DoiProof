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
  ui.reveal.disabled = value;
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
function showResult(report) {
  result = report;
  const online = report.online;
  ui.result.hidden = false;
  ui.hash.textContent = report.local.evidenceSha256;
  ui.version.textContent = 'MANIFEST ' + report.local.version.toUpperCase();
  ui.time.textContent = 'GEPRÜFT ' + new Date(report.generatedAtUtc).toLocaleString('de-DE');
  ui.chainDetails.replaceChildren();
  ui.chainDetails.hidden = !online;
  ui.pill.className = 'result-pill';
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
  platform: 'Betriebssystem', osVersion: 'OS-Version', appVersion: 'App-Version',
};
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
  const rows = flatten(data.manifest);
  ui.metadata.replaceChildren();
  for (const [path, value] of rows) {
    const row = document.createElement('div'); row.className = 'metadata-item';
    const title = document.createElement('strong'); title.textContent = path.map(key => labels[key] || key).join(' · ');
    const key = document.createElement('small'); key.textContent = path.join('.');
    const body = document.createElement('span'); body.textContent = value;
    row.append(title, key, body); ui.metadata.append(row);
  }
  ui.metadataCount.textContent = rows.length + ' Angaben';
  ui.manifestJson.textContent = JSON.stringify(data.manifest, null, 2);
  ui.evidence.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
ui.reveal.addEventListener('click', async () => {
  if (!result || !file || busy || details) return;
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
    const grid = await window.doiproof.mapTiles(loc.latitude, loc.longitude);
    if (details?.manifest.location !== loc) return;
    ui.mapGrid.replaceChildren();
    ui.mapGrid.style.left = grid.offsetX + 'px';
    ui.mapGrid.style.top = grid.offsetY + 'px';
    for (const tile of grid.tiles) {
      const image = document.createElement('img');
      image.src = tile.data; image.alt = '';
      image.style.left = tile.col * 256 + 'px';
      image.style.top = tile.row * 256 + 'px';
      ui.mapGrid.append(image);
    }
    ui.map.hidden = false;
    ui.mapButton.textContent = 'Karte geladen ✓';
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
ui.save.addEventListener('click', async () => {
  if (!result || busy) return;
  try {
    const path = await window.doiproof.saveReport(result);
    if (path) {
      step('step-report', 'done');
      say('Bericht gespeichert: ' + path, 'info');
    }
  } catch (error) { say('Bericht konnte nicht gespeichert werden: ' + error.message); }
});
ui.copy.addEventListener('click', async () => {
  if (!result) return;
  try { await window.doiproof.copyHash(result.local.evidenceSha256); say('Beweispaket-Hash kopiert.', 'info'); }
  catch (error) { say(error.message); }
});
