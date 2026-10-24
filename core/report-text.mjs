/**
 * Lesbarer Kurzbericht (Markdown). Enthält Pfad, Prüfzeit, Hashwerte und Dienststatus,
 * aber kein Foto, keine Koordinaten und keine Sensorwerte. Einzige Ausnahme ist der auf Wunsch
 * angehängte Abschnitt der Plausibilitätsprüfung, der Ort und Sensorwerte gegen Referenzdaten stellt.
 */

import { LEVEL_TEXT } from './plausibility-levels.mjs';

/**
 * Abschnitt „Plausibilität gegen Referenzdaten“ als Markdown. Anders als der übrige Kurzbericht
 * nennt er Ort und Sensorwerte, weil die Prüfung genau diese Angaben mit Referenzen vergleicht.
 * @param {import('./plausibility.mjs').PlausibilityResult} result
 */
export function plausibilityText(result) {
  const rows = ['## Plausibilität gegen Referenzdaten', '',
    `Ergebnis: **${result.summary.sentence}** ${result.summary.detail}`, '',
    'Hinweis: Dieser Abschnitt enthält Aufnahmeort und Sensorwerte. Alle Referenzwerte sind Modell- oder Näherungswerte (Open-Meteo, WMM2025, OpenStreetMap), keine Stationsmessungen.', ''];
  for (const group of result.groups) {
    rows.push(`### ${group.title}`, '');
    for (const finding of group.findings) {
      rows.push(`- **${finding.label}** [${LEVEL_TEXT[finding.level]}]: Sensor ${finding.sensor}. Referenz: ${finding.reference} Abgleich: ${finding.comparison}`);
    }
    if (group.weight) rows.push('', `${group.weight}`);
    rows.push('');
  }
  rows.push('### Gesamtwürdigung', '');
  for (const h of result.hypotheses) rows.push(`- **${h.id} · ${h.title}**: ${h.verdict}. Dagegen spricht: ${h.against} Offen bleibt: ${h.open}`);
  rows.push('', result.assessment, '', '### Reproduzierbarkeit', '',
    `Referenzdaten abgefragt (UTC): ${result.queriedAtUtc ?? 'nicht abgefragt'}`, '');
  for (const step of result.repro) rows.push(`- ${step.step}: ${step.how} → ${step.result}`);
  rows.push('');
  for (const note of result.notes) rows.push(`> ${note}`);
  return rows;
}

/**
 * @param {{ generatedAtUtc: string, file: string, local: Record<string, any>, online: import('./verify.mjs').OnlineResult | null, plausibility?: import('./plausibility.mjs').PlausibilityResult | null }} report
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
  if (report.plausibility) rows.push(...plausibilityText(report.plausibility), '');
  return rows.join('\n');
}
