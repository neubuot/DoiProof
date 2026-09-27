import { Proof } from './doichain';

export type ProofRecord = {
  id: string;
  sha256: string;
  source: 'camera' | 'library';
  createdAt: string;
  capturedAt?: string;
  status: string;
  txid?: string;
  blockTimeUtc?: string;
  confirmations?: number;
  verifyUrl?: string;
  lastCheckedAt: string;
};

export function isProofRecord(value: unknown): value is ProofRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<ProofRecord>;
  return typeof record.id === 'string'
    && /^[a-f0-9]{64}$/.test(record.sha256 ?? '')
    && typeof record.createdAt === 'string'
    && typeof record.status === 'string';
}

export function proofToRecord(
  sha256: string,
  source: ProofRecord['source'],
  proof: Proof,
  capturedAt?: string,
  existing?: ProofRecord,
  now = new Date().toISOString(),
): ProofRecord {
  return {
    id: existing?.id ?? `${now}-${sha256.slice(0, 12)}`,
    sha256,
    source: existing?.source ?? source,
    createdAt: existing?.createdAt ?? now,
    capturedAt: existing?.capturedAt ?? capturedAt,
    status: proof.status ?? existing?.status ?? 'pending',
    txid: proof.txid ?? existing?.txid,
    blockTimeUtc: proof.block_time_utc ?? existing?.blockTimeUtc,
    confirmations: proof.confirmations ?? existing?.confirmations,
    verifyUrl: proof.verify_url ?? existing?.verifyUrl,
    lastCheckedAt: now,
  };
}

export function isPending(record: ProofRecord): boolean {
  return record.status !== 'confirmed' && record.status !== 'expired';
}
