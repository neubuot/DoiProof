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
  blockHeight?: number;
  blockHash?: string;
  confirmations?: number;
  verifyUrl?: string;
  lastCheckedAt: string;
  photoSha256?: string;
  manifestSha256?: string;
  evidenceProfile?: EvidenceProfile;
  manifest?: EvidenceManifest;
  localPhotoUri?: string;
};

export type EvidenceProfile = 'private' | 'location' | 'custom';

export type BlockAnchor = {
  chain: 'btc' | 'doi';
  height: number;
  hash: string;
  headerTimeUtc: string;
  observedAtDeviceUtc: string;
  source: string;
};

export type PreCaptureAnchors = { bitcoin: BlockAnchor; doichain: BlockAnchor };

export type EvidenceManifest = {
  schema: 'org.doichain.doiproof.evidence/v1' | 'org.doichain.doiproof.evidence/v2';
  createdAt: string;
  profile: EvidenceProfile;
  preCapture?: PreCaptureAnchors;
  app?: {
    version: string;
    sourceCommit?: string;
    identification: 'self-reported-unattested';
  };
  photo: {
    sha256: string;
    width?: number;
    height?: number;
    fileSize?: number;
    mimeType?: string;
    fileName?: string;
  };
  capture?: { deviceTime?: string; source: 'camera' | 'library' };
  location?: {
    latitude: number;
    longitude: number;
    altitude?: number | null;
    accuracy?: number | null;
    altitudeAccuracy?: number | null;
    heading?: number | null;
    speed?: number | null;
    measuredAt: string;
    mocked?: boolean;
  };
  device?: {
    platform: string;
    osVersion?: string | number;
    appVersion: string;
  };
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
    ...existing,
    id: existing?.id ?? `${now}-${sha256.slice(0, 12)}`,
    sha256,
    source: existing?.source ?? source,
    createdAt: existing?.createdAt ?? now,
    capturedAt: existing?.capturedAt ?? capturedAt,
    status: proof.status ?? existing?.status ?? 'pending',
    txid: proof.txid ?? existing?.txid,
    blockTimeUtc: proof.block_time_utc ?? existing?.blockTimeUtc,
    blockHeight: proof.block_height ?? existing?.blockHeight,
    blockHash: proof.block_hash ?? existing?.blockHash,
    confirmations: proof.confirmations ?? existing?.confirmations,
    verifyUrl: proof.verify_url ?? existing?.verifyUrl,
    lastCheckedAt: now,
  };
}

export function isPending(record: ProofRecord): boolean {
  return record.status !== 'local' && record.status !== 'confirmed' && record.status !== 'expired';
}

export function upsertRecord(records: ProofRecord[], record: ProofRecord): ProofRecord[] {
  return [record, ...records.filter(item => item.id !== record.id && item.sha256 !== record.sha256)]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
