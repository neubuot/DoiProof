/**
 * App-unabhängige Prüfung eines DoiProof-Beweispakets (ZIP). Gemeinsamer Kern für das
 * Kommandozeilenprogramm, den Windows-Prüfer und den Prüfer in der Handy-App.
 *
 * Online-Abfragen sind optional und informativ: Der MCP-Dienst wird auch von der App genutzt und
 * ist kein unabhängiger Full Node.
 */
import JSZip from 'jszip';
import { canonicalJson } from './canonical.mjs';
import { readImageInfo } from './image.mjs';
import { evidenceMessage, schemaVersion, validateManifest } from './manifest.mjs';
import { sensorOverview } from './sensors.mjs';
import { callTool } from './mcp.mjs';
import { HEX64, assert, concatBytes, fetchWithTimeout, isPlainObject, sha256Text, utf8Decode, utf8Encode } from './util.mjs';

export const BTC_API = 'https://blockstream.info/api';
export const LIMITS = { zip: 200 * 1024 * 1024, photo: 150 * 1024 * 1024, json: 1024 * 1024 };
export const LOCAL_STATEMENT = 'Byteintegrität des exportierten Pakets bestätigt; Inhalt, Aufnahmezeit, Herkunft und App-Identität nicht attestiert.';
export const ONLINE_SOURCE = 'Doichain-MCP-Dienst (auch von der App genutzt) und Blockstream; keine eigene Full-Node-Prüfung.';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** @param {Uint8Array} bytes */
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Entpackt einen Eintrag schrittweise und bricht ab, sobald die Grenze überschritten wird.
 * Die im ZIP angegebene Größe ist eine Behauptung des Pakets und schützt allein nicht vor
 * Dekomprimierungsbomben.
 * @param {any} entry
 * @param {number} max
 * @param {string} label
 * @returns {Promise<Uint8Array>}
 */
function readLimited(entry, max, label) {
  return new Promise((resolve, reject) => {
    /** @type {Uint8Array[]} */
    const chunks = [];
    let size = 0;
    let settled = false;
    const stream = entry.internalStream('uint8array');
    stream.on('data', (/** @type {Uint8Array} */ chunk) => {
      if (settled) return;
      size += chunk.length;
      if (size > max) {
        settled = true;
        stream.pause();
        reject(new Error(`ZIP-Eintrag überschreitet die Größenbegrenzung: ${label}`));
        return;
      }
      chunks.push(chunk);
    }).on('error', (/** @type {Error} */ error) => {
      if (!settled) { settled = true; reject(new Error(`ZIP-Eintrag beschädigt: ${label} (${error.message})`)); }
    }).on('end', () => {
      if (settled) return;
      settled = true;
      const bytes = concatBytes(chunks);
      const expected = entry._data?.crc32;
      if (typeof expected === 'number' && crc32(bytes) !== expected >>> 0) {
        reject(new Error(`ZIP-Eintrag beschädigt (CRC32 stimmt nicht): ${label}`));
      } else resolve(bytes);
    });
    stream.resume();
  });
}

/** @param {Uint8Array} bytes @param {string} label */
function parseJson(bytes, label) {
  const text = utf8Decode(bytes, label);
  try { return { value: JSON.parse(text), text }; }
  catch { throw new Error(`Ungültiges JSON: ${label}`); }
}

/**
 * @typedef {'ok'|'failed'|'skipped'} StepStatus
 * @typedef {{
 *   ok: boolean,
 *   error: string | null,
 *   failedStep: string | null,
 *   steps: Record<'zip'|'structure'|'photo'|'manifest'|'evidence', StepStatus>,
 *   zip: { size: number, sha256: string },
 *   version: 'v1'|'v2'|'v3'|null,
 *   photoFile: string | null,
 *   photoBytes: Uint8Array | null,
 *   photoInfo: ReturnType<typeof readImageInfo> | null,
 *   manifest: Record<string, any> | null,
 *   verification: Record<string, any> | null,
 *   hashes: { photoSha256: string | null, manifestSha256: string | null, evidenceSha256: string | null },
 *   claimed: { manifestPhotoSha256: string | null, photoSha256: string | null, manifestSha256: string | null, evidenceSha256: string | null },
 * }} BundleAnalysis
 */

/**
 * Vollständige Offline-Analyse. Wirft nicht bei inhaltlichen Fehlern, sondern beschreibt sie,
 * damit auch ein fehlgeschlagener Prüfbericht erzeugt werden kann.
 * @param {Uint8Array} zipBytes
 * @param {{ sha256: import('./util.mjs').Sha256 }} options
 * @returns {Promise<BundleAnalysis>}
 */
export async function analyzeBundle(zipBytes, { sha256 }) {
  /** @type {BundleAnalysis} */
  const result = {
    ok: false, error: null, failedStep: null,
    steps: { zip: 'skipped', structure: 'skipped', photo: 'skipped', manifest: 'skipped', evidence: 'skipped' },
    zip: { size: zipBytes.length, sha256: await sha256(zipBytes) },
    version: null, photoFile: null, photoBytes: null, photoInfo: null, manifest: null, verification: null,
    hashes: { photoSha256: null, manifestSha256: null, evidenceSha256: null },
    claimed: { manifestPhotoSha256: null, photoSha256: null, manifestSha256: null, evidenceSha256: null },
  };
  /** @param {'zip'|'structure'|'photo'|'manifest'|'evidence'} step @param {string} message */
  const fail = (step, message) => {
    result.steps[step] = 'failed';
    if (!result.error) { result.error = message; result.failedStep = step; }
  };

  /** @type {any} */
  let zip;
  /** @type {string[]} */
  let names = [];
  /** @type {string} */
  let photoName = '';
  try {
    assert(zipBytes.length <= LIMITS.zip, 'ZIP überschreitet die Größenbegrenzung (200 MiB).');
    zip = await JSZip.loadAsync(zipBytes);
    names = Object.keys(zip.files);
    assert(names.length <= 8, 'ZIP enthält zu viele Einträge.');
    result.steps.zip = 'ok';
  } catch (error) {
    fail('zip', error instanceof Error && error.message.includes('Größenbegrenzung') ? error.message
      : `Datei ist kein lesbares ZIP-Archiv${error instanceof Error ? ` (${error.message})` : ''}.`);
    return result;
  }

  /** @type {Uint8Array} */
  let photo;
  /** @type {string} */
  let manifestText;
  try {
    const photoNames = names.filter(name => /^original\.[a-zA-Z0-9]+$/.test(name));
    assert(photoNames.length === 1, 'Genau eine Datei original.<endung> ist erforderlich.');
    photoName = photoNames[0];
    const expected = new Set([photoName, 'manifest.json', 'verification.json', 'README.txt']);
    assert(names.every(name => expected.has(name) && !zip.files[name].dir
      && (!zip.files[name].unsafeOriginalName || zip.files[name].unsafeOriginalName === name)),
    'Unerwarteter oder unsicherer ZIP-Eintrag.');
    assert(zip.files['manifest.json'] && zip.files['verification.json'], 'manifest.json und verification.json sind erforderlich.');
    assert(names.every(name => (zip.files[name]._data?.uncompressedSize ?? 0) <= (name === photoName ? LIMITS.photo : LIMITS.json)),
      'ZIP-Eintrag überschreitet die Größenbegrenzung.');
    photo = await readLimited(zip.files[photoName], LIMITS.photo, photoName);
    const manifestJson = parseJson(await readLimited(zip.files['manifest.json'], LIMITS.json, 'manifest.json'), 'manifest.json');
    const verificationJson = parseJson(await readLimited(zip.files['verification.json'], LIMITS.json, 'verification.json'), 'verification.json');
    if (zip.files['README.txt']) await readLimited(zip.files['README.txt'], LIMITS.json, 'README.txt');
    assert(isPlainObject(manifestJson.value), 'Manifest ist kein Objekt.');
    assert(isPlainObject(verificationJson.value), 'Verifikationsdaten sind kein Objekt.');
    result.photoFile = photoName;
    result.photoBytes = photo;
    result.photoInfo = readImageInfo(photo);
    result.manifest = manifestJson.value;
    result.verification = verificationJson.value;
    manifestText = manifestJson.text;
    result.version = schemaVersion(manifestJson.value.schema);
    assert(result.version, 'Unbekannte Manifestversion.');
    result.steps.structure = 'ok';
  } catch (error) {
    fail('structure', error instanceof Error ? error.message : String(error));
    return result;
  }

  const manifest = /** @type {Record<string, any>} */ (result.manifest);
  const verification = /** @type {Record<string, any>} */ (result.verification);
  const version = /** @type {'v1'|'v2'|'v3'} */ (result.version);
  /** @param {unknown} value */
  const hex = value => (typeof value === 'string' && HEX64.test(value) ? value : null);
  result.claimed = {
    manifestPhotoSha256: hex(manifest.photo?.sha256),
    photoSha256: hex(verification.photoSha256),
    manifestSha256: hex(verification.manifestSha256),
    evidenceSha256: hex(verification.evidenceSha256),
  };

  const photoHash = await sha256(photo);
  result.hashes.photoSha256 = photoHash;
  if (!result.claimed.manifestPhotoSha256) fail('photo', 'Ungültiger oder fehlender Wert: manifest.photo.sha256');
  else if (!result.claimed.photoSha256) fail('photo', 'Ungültiger oder fehlender Wert: verification.photoSha256');
  else if (photoHash !== result.claimed.manifestPhotoSha256 || photoHash !== result.claimed.photoSha256) {
    fail('photo', 'Fotodatei und Foto-Hash stimmen nicht überein.');
  } else result.steps.photo = 'ok';

  /** @type {string | null} */
  let canonicalText = null;
  try { canonicalText = canonicalJson(manifest, version); } catch (error) {
    fail('manifest', error instanceof Error ? error.message : String(error));
  }
  if (canonicalText !== null) {
    const manifestHash = await sha256Text(sha256, canonicalText);
    result.hashes.manifestSha256 = manifestHash;
    const structureError = validateManifest(manifest, version);
    if (manifestText !== `${canonicalText}\n`) fail('manifest', 'manifest.json ist nicht kanonisch mit genau einem abschließenden LF.');
    else if (!result.claimed.manifestSha256) fail('manifest', 'Ungültiger oder fehlender Wert: verification.manifestSha256');
    else if (manifestHash !== result.claimed.manifestSha256) fail('manifest', 'Manifest-Hash stimmt nicht überein.');
    else if (structureError) fail('manifest', structureError);
    else result.steps.manifest = 'ok';

    const evidenceHash = await sha256(utf8Encode(evidenceMessage(version, photoHash, manifestHash)));
    result.hashes.evidenceSha256 = evidenceHash;
    if (!result.claimed.evidenceSha256) fail('evidence', 'Ungültiger oder fehlender Wert: verification.evidenceSha256');
    else if (evidenceHash !== result.claimed.evidenceSha256) fail('evidence', 'Beweispaket-Hash stimmt nicht überein.');
    else result.steps.evidence = 'ok';
  }
  result.ok = Object.values(result.steps).every(step => step === 'ok');
  return result;
}

/**
 * Kompakte Zusammenfassung ohne Foto, Standort oder übrige Manifestinhalte (für Text-/JSON-Berichte).
 * @param {BundleAnalysis} analysis
 */
export function localSummary(analysis) {
  const manifest = analysis.manifest ?? {};
  const verification = analysis.verification ?? {};
  return {
    version: /** @type {string} */ (analysis.version),
    photoFile: /** @type {string} */ (analysis.photoFile),
    photoSha256: /** @type {string} */ (analysis.hashes.photoSha256),
    manifestSha256: /** @type {string} */ (analysis.hashes.manifestSha256),
    evidenceSha256: /** @type {string} */ (analysis.hashes.evidenceSha256),
    zipSha256: analysis.zip.sha256,
    preCapture: manifest.preCapture ?? null,
    exportedStatus: verification.status ?? null,
    exportedTxid: verification.txid ?? null,
    sensors: analysis.version === 'v3' ? sensorOverview(manifest.sensors) : null,
    statement: LOCAL_STATEMENT,
  };
}

/**
 * Lokale Prüfung; wirft bei jedem Fehler (kompatibel zu früheren Versionen).
 * @param {Uint8Array} zipBytes
 * @param {{ sha256: import('./util.mjs').Sha256 }} options
 */
export async function verifyLocal(zipBytes, options) {
  const analysis = await analyzeBundle(zipBytes, options);
  if (!analysis.ok) throw new Error(analysis.error ?? 'Prüfung fehlgeschlagen.');
  return localSummary(analysis);
}

/**
 * @typedef {'matched'|'pending'|'failed'|'unavailable'} CheckStatus
 * @typedef {{
 *   status: 'matched'|'incomplete'|'failed',
 *   checks: { name: string, status: CheckStatus, details: string }[],
 *   source: string,
 *   checkedAtUtc: string,
 *   anchor: { status: CheckStatus, apiStatus?: string, txid?: string, blockHash?: string, blockHeight?: number, blockTimeUtc?: string, confirmations?: number },
 *   preCapture: null | Record<'bitcoin'|'doichain', { status: CheckStatus, details: string }>,
 * }} OnlineResult
 */

/**
 * Optionaler Online-Abgleich: Doichain-Transaktion und gegebenenfalls die Vorabblöcke.
 * @param {{ evidenceSha256: string, preCapture?: any }} local
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number, now?: () => Date }} [options]
 * @returns {Promise<OnlineResult>}
 */
export async function checkOnline(local, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? 15000;
  const mcpOptions = { fetchImpl, timeoutMs };
  /** @type {OnlineResult['checks']} */
  const checks = [];
  /** @type {OnlineResult['anchor']} */
  const anchor = { status: 'unavailable' };
  /** @param {string} name @param {CheckStatus} status @param {string} details */
  const add = (name, status, details) => { checks.push({ name, status, details }); return status; };
  try {
    /** @type {any} */
    const proof = await callTool('check_proof', { sha256: local.evidenceSha256 }, mcpOptions);
    anchor.apiStatus = String(proof.status);
    if (proof.sha256 && proof.sha256 !== local.evidenceSha256) {
      anchor.status = add('Doichain-Transaktion', 'failed', 'API antwortet mit einem anderen Paket-Hash.');
    } else if (proof.status === 'confirmed' || proof.status === 'expired') {
      if (!HEX64.test(proof.txid ?? '') || !Number.isSafeInteger(proof.block_height)) {
        anchor.status = add('Doichain-Transaktion', 'failed', 'Bestätigungsantwort ohne gültige Transaktions-ID oder Blockhöhe.');
      } else {
        anchor.txid = proof.txid;
        anchor.blockHeight = proof.block_height;
        /** @type {any} */
        const transaction = await callTool('get_transaction', { txid: proof.txid }, mcpOptions);
        if (transaction.txid !== proof.txid || !HEX64.test(transaction.block_hash ?? '') || (transaction.confirmations ?? 0) < 1) {
          anchor.status = add('Doichain-Transaktion', 'failed', 'Transaktion, Block-Hash oder Bestätigungen widersprüchlich.');
        } else {
          /** @type {any} */
          const block = await callTool('get_block', { block: transaction.block_hash }, mcpOptions);
          const matched = block.hash === transaction.block_hash && block.height === proof.block_height;
          anchor.blockHash = transaction.block_hash;
          anchor.confirmations = Number.isSafeInteger(block.confirmations) ? block.confirmations : transaction.confirmations;
          const time = typeof block.time_utc === 'string' ? block.time_utc : proof.block_time_utc;
          if (typeof time === 'string' && Number.isFinite(Date.parse(time))) anchor.blockTimeUtc = new Date(Date.parse(time)).toISOString();
          anchor.status = add('Doichain-Transaktion', matched ? 'matched' : 'failed',
            `Status ${proof.status}; Transaktion ${proof.txid}; Block ${transaction.block_hash}; Höhe ${proof.block_height}`);
        }
      }
    } else {
      anchor.status = add('Doichain-Transaktion', proof.status === 'pending' ? 'pending' : 'failed', `Aktueller API-Status: ${String(proof.status)}`);
    }
  } catch (error) {
    anchor.status = add('Doichain-Transaktion', 'unavailable', error instanceof Error ? error.message : String(error));
  }

  /** @type {OnlineResult['preCapture']} */
  let preCapture = null;
  const pre = local.preCapture;
  if (pre) {
    preCapture = { bitcoin: { status: 'unavailable', details: '' }, doichain: { status: 'unavailable', details: '' } };
    try {
      const response = await fetchWithTimeout(fetchImpl, `${BTC_API}/block/${pre.bitcoin.hash}`, {}, timeoutMs);
      assert(response.ok, `HTTP ${response.status} von Blockstream`);
      /** @type {any} */
      const block = await response.json();
      const ok = block.id === pre.bitcoin.hash && block.height === pre.bitcoin.height
        && Number.isSafeInteger(block.timestamp) && block.timestamp * 1000 === Date.parse(pre.bitcoin.headerTimeUtc);
      const details = `Block ${pre.bitcoin.hash}; Höhe ${pre.bitcoin.height}`;
      preCapture.bitcoin = { status: add('BTC-Vorabblock', ok ? 'matched' : 'failed', details), details };
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      preCapture.bitcoin = { status: add('BTC-Vorabblock', 'unavailable', details), details };
    }
    try {
      /** @type {any} */
      const block = await callTool('get_block', { block: pre.doichain.hash }, mcpOptions);
      const ok = block.hash === pre.doichain.hash && block.height === pre.doichain.height
        && Date.parse(block.time_utc) === Date.parse(pre.doichain.headerTimeUtc);
      const details = `Block ${pre.doichain.hash}; Höhe ${pre.doichain.height}`;
      preCapture.doichain = { status: add('DOI-Vorabblock', ok ? 'matched' : 'failed', details), details };
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      preCapture.doichain = { status: add('DOI-Vorabblock', 'unavailable', details), details };
    }
  }
  const failed = checks.some(check => check.status === 'failed');
  const incomplete = checks.some(check => check.status === 'pending' || check.status === 'unavailable');
  return {
    status: failed ? 'failed' : incomplete ? 'incomplete' : 'matched',
    checks, source: ONLINE_SOURCE,
    checkedAtUtc: (options.now?.() ?? new Date()).toISOString(),
    anchor, preCapture,
  };
}
