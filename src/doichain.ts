export const API_URL = 'https://doi-api.sendlabs.de';

export type Proof = {
  hash: string;
  name?: string;
  exists?: boolean;
  pending?: boolean;
  status?: string;
  txid?: string;
  block_time_iso?: string;
  [key: string]: unknown;
};

const HASH_PATTERN = /^[a-f0-9]{64}$/;

async function responseJson(response: Response): Promise<Proof> {
  let body: Record<string, unknown>;
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new Error(`API-Antwort konnte nicht gelesen werden (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    const error = body.error as { message?: string } | undefined;
    throw new Error(error?.message || `API-Fehler (HTTP ${response.status}).`);
  }
  return body as Proof;
}

export async function verifyProof(hash: string): Promise<Proof> {
  if (!HASH_PATTERN.test(hash)) throw new Error('Ungültiger SHA-256-Hash.');
  const response = await fetch(`${API_URL}/v1/poe/${hash}`);
  return responseJson(response);
}

export async function createProof(hash: string, apiKey: string, note?: string): Promise<Proof> {
  if (!HASH_PATTERN.test(hash)) throw new Error('Ungültiger SHA-256-Hash.');
  if (!apiKey.trim()) throw new Error('Ein PoE- oder Write-Schlüssel ist erforderlich.');
  const response = await fetch(`${API_URL}/v1/poe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey.trim() },
    body: JSON.stringify({ hash, ...(note ? { note: note.slice(0, 160) } : {}) })
  });
  return responseJson(response);
}
