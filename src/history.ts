import { File, Paths } from 'expo-file-system';
import { isProofRecord, ProofRecord } from './proofRecord';

export { canResend, isNotAnchored, isPending, proofToRecord, ProofRecord } from './proofRecord';

const historyFile = new File(Paths.document, 'doiproof-history.json');
const backupFile = new File(Paths.document, 'doiproof-history.backup.json');

async function readRecords(file: File): Promise<ProofRecord[]> {
  const parsed: unknown = JSON.parse(await file.text());
  if (!Array.isArray(parsed) || !parsed.every(isProofRecord)) throw new Error('Ungültiger Nachweisverlauf.');
  return parsed;
}

export async function loadHistory(): Promise<ProofRecord[]> {
  if (!historyFile.exists) return backupFile.exists ? readRecords(backupFile) : [];
  try {
    return await readRecords(historyFile);
  } catch {
    if (backupFile.exists) {
      try { return await readRecords(backupFile); } catch { /* Both copies are damaged. */ }
    }
  }
  throw new Error('Der lokale Nachweisverlauf konnte nicht gelesen werden. Bitte die App-Daten nicht löschen und das Beweispaket sichern.');
}

export async function saveHistory(records: ProofRecord[]): Promise<void> {
  if (historyFile.exists) {
    try {
      const previous = await historyFile.text();
      const parsed: unknown = JSON.parse(previous);
      if (Array.isArray(parsed) && parsed.every(isProofRecord)) backupFile.write(previous);
    } catch { /* Preserve the last good backup. */ }
  }
  historyFile.write(JSON.stringify(records, null, 2));
}

let queue: Promise<unknown> = Promise.resolve();

export function updateHistory(change: (records: ProofRecord[]) => ProofRecord[]): Promise<ProofRecord[]> {
  const operation = queue.then(async () => {
    const next = change(await loadHistory());
    await saveHistory(next);
    return next;
  });
  queue = operation.catch(() => undefined);
  return operation;
}
