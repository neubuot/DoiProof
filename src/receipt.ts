import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ProofRecord } from './history';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character] ?? character);
}

function row(label: string, value?: string | number): string {
  if (value === undefined || value === '') return '';
  return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(String(value))}</td></tr>`;
}

export async function shareReceipt(record: ProofRecord): Promise<void> {
  const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;color:#172c2b;padding:36px}h1{color:#156a65}
.badge{display:inline-block;padding:6px 10px;border-radius:8px;background:#e5f2f0;font-weight:700}
table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:10px;border-bottom:1px solid #ccd8d5;text-align:left;vertical-align:top}
th{width:30%}td.hash{font-family:monospace;word-break:break-all}.note{margin-top:28px;color:#526562;font-size:12px;line-height:1.5}
</style></head><body>
<h1>DoiProof – Nachweisbeleg</h1><p class="badge">Status: ${escapeHtml(record.status)}</p>
<table>
${row('SHA-256', record.sha256).replace('<td>', '<td class="hash">')}
${row('Einreichung (UTC)', record.createdAt)}
${row('Gerätezeit der Aufnahme', record.capturedAt)}
${row('Quelle', record.source === 'camera' ? 'Kamera' : 'Fotobibliothek')}
${row('Transaktions-ID', record.txid).replace('<td>', '<td class="hash">')}
${row('Blockzeit (UTC)', record.blockTimeUtc)}
${row('Bestätigungen', record.confirmations)}
${row('Zuletzt geprüft', record.lastCheckedAt)}
</table>
<p class="note">Dieser Beleg dokumentiert die Antwort der Doichain-API. Der Hash belegt bei bestätigtem Kettenstatus, dass identische Dateibytes spätestens zum Blockzeitpunkt vorlagen. Er beweist nicht Urheberschaft, Echtheit des Motivs oder eine verlässliche Aufnahmezeit. Das Foto selbst ist nicht Bestandteil dieses PDF-Belegs.</p>
</body></html>`;
  const { uri } = await Print.printToFileAsync({ html });
  if (!await Sharing.isAvailableAsync()) throw new Error('Teilen ist auf diesem Gerät nicht verfügbar.');
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'DoiProof-Beleg teilen', UTI: 'com.adobe.pdf' });
}
