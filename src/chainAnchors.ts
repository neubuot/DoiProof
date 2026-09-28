import { getChainStatus } from './doichain';
import { BlockAnchor, PreCaptureAnchors } from './proofRecord';

const BTC_API = 'https://blockstream.info/api';
const HASH = /^[0-9a-f]{64}$/i;

function validBlock(chain: 'btc' | 'doi', hash: unknown, height: unknown, timeUtc: unknown, source: string): BlockAnchor {
  if (typeof hash !== 'string' || !HASH.test(hash) || !Number.isSafeInteger(height) || Number(height) < 0) {
    throw new Error(`Ungültige ${chain.toUpperCase()}-Blockantwort.`);
  }
  if (typeof timeUtc !== 'string' || !Number.isFinite(Date.parse(timeUtc))) {
    throw new Error(`Ungültige ${chain.toUpperCase()}-Blockzeit.`);
  }
  return {
    chain, hash: hash.toLowerCase(), height: Number(height), headerTimeUtc: timeUtc,
    observedAtDeviceUtc: new Date().toISOString(), source,
  };
}

export async function getDoichainAnchor(): Promise<BlockAnchor> {
  const status = await getChainStatus();
  if (status.synced !== true || status.fork_check_ok !== true) {
    throw new Error('Doichain-Node ist nicht synchron oder Fork-Prüfung fehlt.');
  }
  return validBlock('doi', status.best_block_hash, status.block_height,
    status.best_block_time_utc, 'https://doi-api.sendlabs.de/mcp:get_chain_status');
}

export async function getBitcoinAnchor(): Promise<BlockAnchor> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const tip = await fetch(`${BTC_API}/blocks/tip/hash`, { signal: controller.signal, cache: 'no-store' });
    if (!tip.ok) throw new Error(`Bitcoin-Blockdienst: HTTP ${tip.status}.`);
    const hash = (await tip.text()).trim();
    if (!HASH.test(hash)) throw new Error('Bitcoin-Blockdienst lieferte keinen gültigen Hash.');
    const detail = await fetch(`${BTC_API}/block/${hash}`, { signal: controller.signal, cache: 'no-store' });
    if (!detail.ok) throw new Error(`Bitcoin-Blockdienst: HTTP ${detail.status}.`);
    const block: unknown = await detail.json();
    if (!block || typeof block !== 'object') throw new Error('Bitcoin-Blockdetails fehlen.');
    const data = block as { id?: unknown; height?: unknown; timestamp?: unknown };
    if (data.id !== hash || typeof data.timestamp !== 'number' || !Number.isSafeInteger(data.timestamp)) {
      throw new Error('Bitcoin-Blockdetails passen nicht zum Block-Hash.');
    }
    return validBlock('btc', hash, data.height, new Date(data.timestamp * 1000).toISOString(),
      'https://blockstream.info/api');
  } finally {
    clearTimeout(timeout);
  }
}

export async function getPreCaptureAnchors(): Promise<PreCaptureAnchors> {
  const [bitcoin, doichain] = await Promise.all([getBitcoinAnchor(), getDoichainAnchor()]);
  return { bitcoin, doichain };
}

export function isValidPreCaptureAnchors(value: PreCaptureAnchors): boolean {
  return value.bitcoin.chain === 'btc' && value.doichain.chain === 'doi'
    && [value.bitcoin, value.doichain].every(block =>
      HASH.test(block.hash) && Number.isSafeInteger(block.height) && block.height >= 0
      && Number.isFinite(Date.parse(block.headerTimeUtc))
      && Number.isFinite(Date.parse(block.observedAtDeviceUtc)));
}
