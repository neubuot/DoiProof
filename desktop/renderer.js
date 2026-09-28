const $ = id => document.getElementById(id);
const ui = {
  select: $('select-button'), drop: $('drop-zone'), fileHint: $('file-hint'),
  filePath: $('file-path'), online: $('online-toggle'), verify: $('verify-button'),
  verifyLabel: $('verify-label'), result: $('result'), pill: $('result-pill'),
  chainTitle: $('chain-title'), chainDescription: $('chain-description'),
  chainDetails: $('chain-details'), hash: $('evidence-hash'),
  version: $('format-version'), time: $('verified-time'), save: $('save-button'),
  copy: $('copy-button'), alert: $('alert'),
};
let file = null;
let result = null;
let busy = false;

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
