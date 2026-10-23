/**
 * JSON-RPC-Client für den Doichain-MCP-Dienst (Streamable HTTP). Wird von App und Prüfern genutzt.
 */
import { fetchWithTimeout } from './util.mjs';

export const MCP_URL = 'https://doi-api.sendlabs.de/mcp';
let requestId = 0;

/**
 * @param {Response | { ok: boolean, status?: number, headers?: any, json: () => Promise<any>, text?: () => Promise<string> }} response
 */
async function readEnvelope(response) {
  const type = typeof response.headers?.get === 'function' ? String(response.headers.get('content-type') ?? '') : '';
  if (type.includes('text/event-stream') && typeof response.text === 'function') {
    const text = await response.text();
    /** @type {any} */
    let last = null;
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith('data:')) continue;
      try {
        const parsed = JSON.parse(line.slice(5).trim());
        if (parsed && (parsed.result || parsed.error)) last = parsed;
      } catch { /* Keine JSON-Nutzlast. */ }
    }
    if (!last) throw new Error(`MCP-Antwort konnte nicht gelesen werden (HTTP ${response.status ?? '?'}).`);
    return last;
  }
  try {
    return await response.json();
  } catch {
    throw new Error(`MCP-Antwort konnte nicht gelesen werden (HTTP ${response.status ?? '?'}).`);
  }
}

/**
 * @template T
 * @param {string} name
 * @param {Record<string, unknown>} args
 * @param {{ apiKey?: string, timeoutMs?: number, fetchImpl?: typeof fetch, url?: string }} [options]
 * @returns {Promise<T>}
 */
export async function callTool(name, args, options = {}) {
  const apiKey = options.apiKey?.trim() ?? '';
  const response = await fetchWithTimeout(options.fetchImpl ?? globalThis.fetch, options.url ?? MCP_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': '2025-06-18',
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++requestId, method: 'tools/call', params: { name, arguments: args } }),
  }, options.timeoutMs ?? 20000);
  const envelope = await readEnvelope(response);
  const tool = envelope?.result;
  const text = tool?.content?.find((/** @type {{ text?: string }} */ item) => item.text)?.text;
  if (!response.ok || envelope?.error || tool?.isError || !tool) {
    throw new Error(envelope?.error?.message || text || `MCP-Fehler bei ${name} (HTTP ${response.status ?? '?'}).`);
  }
  if (tool.structuredContent) return tool.structuredContent;
  if (text) {
    try { return JSON.parse(text); } catch { /* Ältere Server antworten nur mit Text. */ }
  }
  throw new Error(`MCP-Antwort ohne auswertbare Daten bei ${name}.`);
}
