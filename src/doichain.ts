export const MCP_URL = 'https://doi-api.sendlabs.de/mcp';

export type Proof = {
  sha256: string;
  status: string;
  anchored?: boolean;
  already_anchored?: boolean;
  txid?: string;
  block_time_utc?: string;
  block_height?: number;
  block_hash?: string;
  confirmations?: number;
  verify_url?: string;
  [key: string]: unknown;
};

export type ChainStatus = {
  block_height: number;
  best_block_hash: string;
  best_block_time_utc: string;
  synced: boolean;
  fork_check_ok: boolean;
};

export type DoichainBlock = { height: number; hash: string; time_utc: string; confirmations: number };
type DoichainTransaction = { txid?: string; block_hash?: string; confirmations?: number };

export type Quota = {
  unlimited: boolean;
  remaining_for_this_ip?: number;
  remaining_all_users?: number;
  limit_per_ip_per_day?: number;
  day_utc?: string;
  resets?: string;
};

const HASH_PATTERN = /^[a-f0-9]{64}$/;
let requestId = 0;

async function callTool<T>(name: string, args: Record<string, unknown>, apiKey = ''): Promise<T> {
  const response = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': '2025-06-18',
      ...(apiKey.trim() ? { 'X-API-Key': apiKey.trim() } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++requestId, method: 'tools/call', params: { name, arguments: args } }),
  });
  let envelope: {
    error?: { message?: string };
    result?: { structuredContent?: T; content?: Array<{ text?: string }>; isError?: boolean };
  };
  try {
    envelope = await response.json();
  } catch {
    throw new Error(`MCP-Antwort konnte nicht gelesen werden (HTTP ${response.status}).`);
  }
  const tool = envelope.result;
  const text = tool?.content?.find(item => item.text)?.text;
  if (!response.ok || envelope.error || tool?.isError || !tool) {
    throw new Error(envelope.error?.message || text || `MCP-Fehler (HTTP ${response.status}).`);
  }
  if (tool.structuredContent) return tool.structuredContent;
  if (text) {
    try { return JSON.parse(text) as T; } catch { /* Older MCP servers may return only text. */ }
  }
  throw new Error('MCP-Antwort enthält keine auswertbaren Daten.');
}

export async function getQuota(apiKey = ''): Promise<Quota> {
  return callTool<Quota>('get_anchoring_quota', {}, apiKey);
}

export async function getChainStatus(): Promise<ChainStatus> {
  return callTool<ChainStatus>('get_chain_status', {});
}

export async function getBlock(block: number | string): Promise<DoichainBlock> {
  return callTool<DoichainBlock>('get_block', { block });
}

/** The proof response supplies a height; fetch the actual transaction to bind its block hash. */
export async function withConfirmedBlock(proof: Proof): Promise<Proof> {
  if ((proof.status !== 'confirmed' && proof.status !== 'expired') || !proof.txid
    || !Number.isSafeInteger(proof.block_height)) return proof;
  try {
    const transaction = await callTool<DoichainTransaction>('get_transaction', { txid: proof.txid });
    if (transaction.txid && transaction.txid !== proof.txid) return proof;
    if (!transaction.block_hash || !HASH_PATTERN.test(transaction.block_hash)
      || (transaction.confirmations ?? 0) < 1) return proof;
    const block = await getBlock(transaction.block_hash);
    if (block.hash !== transaction.block_hash || block.height !== proof.block_height) return proof;
    return { ...proof, block_hash: block.hash };
  } catch {
    // Do not convert a confirmed proof into an error when the supplemental lookup is unavailable.
    return proof;
  }
}

export async function verifyProof(hash: string): Promise<Proof> {
  if (!HASH_PATTERN.test(hash)) throw new Error('Ungültiger SHA-256-Hash.');
  return callTool<Proof>('check_proof', { sha256: hash });
}

export async function createProof(hash: string, apiKey = '', note?: string): Promise<Proof> {
  if (!HASH_PATTERN.test(hash)) throw new Error('Ungültiger SHA-256-Hash.');
  return callTool<Proof>('anchor_proof', {
    sha256: hash,
    ...(note ? { note: note.slice(0, 160) } : {}),
  }, apiKey);
}
