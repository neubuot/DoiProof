/**
 * Lesbarer Kurzbericht (Markdown). Enthält Pfad, Prüfzeit, Hashwerte und Dienststatus,
 * aber kein Foto, keine Koordinaten und keine Sensorwerte.
 */

/**
 * @param {{ generatedAtUtc: string, file: string, local: Record<string, any>, online: import('./verify.mjs').OnlineResult | null }} report
 */
export function reportText(report) {
  const rows = [
    '# DoiProof-Prüfbericht', '', `Erstellt (UTC): ${report.generatedAtUtc}`,
    `ZIP: ${report.file}`, '',
    '## Lokale Prüfung', '',
    'Ergebnis: **Byteintegrität der Datei und der Hashbindung bestätigt.**', '',
    `Format: ${report.local.version}`,
    `Foto SHA-256: ${report.local.photoSha256}`,
    `Manifest SHA-256: ${report.local.manifestSha256}`,
    `Beweispaket SHA-256: ${report.local.evidenceSha256}`,
  ];
  if (report.local.zipSha256) rows.push(`ZIP-Datei SHA-256: ${report.local.zipSha256}`);
  if (report.local.sensors) {
    rows.push(`Sensoren im Manifest: ${report.local.sensors.recorded.length} erfasst (${report.local.sensors.recorded.join(', ') || 'keine'}), nicht erfasst: ${report.local.sensors.missing.join(', ') || 'keine'}`);
  }
  rows.push('',
    'Ein ZIP oder dessen Begleitdaten können nachträglich erstellt worden sein. Die lokale Prüfung bestätigt weder Bildinhalt noch Aufnahmezeit, Person, Ort oder ausführenden App-Code.',
    '',
    '## Online-Abfragen', '');
  if (report.online) {
    rows.push(`Ergebnis: **${report.online.status}**`, '',
      ...report.online.checks.map(item => `- ${item.name}: ${item.status} — ${item.details}`),
      '', report.online.source);
  } else rows.push('Nicht durchgeführt (offline).');
  rows.push('', 'Geräte-Abfragezeiten, Sensorwerte und App-Version im Manifest sind Selbstauskünfte; Vorabblöcke belegen nicht den Auslösezeitpunkt. Eine API-Antwort ersetzt keine eigene Kettenprüfung.', '');
  return rows.join('\n');
}
