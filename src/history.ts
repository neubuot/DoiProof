import { File, Paths } from 'expo-file-system';
import { isProofRecord, ProofRecord } from './proofRecord';

export { isPending, proofToRecord, ProofRecord } from './proofRecord';

const historyFile = new File(Paths.document, 'doiproof-history.json');

export async function loadHistory(): Promise<ProofRecord[]> {
  if (!historyFile.exists) return [];
  try {
    const parsed: unknown = JSON.parse(await historyFile.text());
    return Array.isArray(parsed) ? parsed.filter(isProofRecord) : [];
  } catch {
    return [];
  }
}

export async function saveHistory(records: ProofRecord[]): Promise<void> {
  historyFile.write(JSON.stringify(records, null, 2));
}
