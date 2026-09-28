#!/usr/bin/env node
/**
 * App-independent verification of a DoiProof export. Online lookups are optional and
 * informational: the MCP API is also used by the app and is not an independent node.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import JSZip from 'jszip';

const MCP = 'https://doi-api.sendlabs.de/mcp';
const BTC = 'https://blockstream.info/api';
const HEX = /^[0-9a-f]{64}$/;
const MAX_ZIP = 200 * 1024 * 1024;
const MAX_PHOTO = 150 * 1024 * 1024;
const MAX_JSON = 1024 * 1024;
const sha = data => createHash('sha256').update(data).digest('hex');

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value).filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
function assert(ok, message) { if (!ok) throw new Error(message); }
function field(value, label) {
  assert(typeof value === 'string' && HEX.test(value), `Ungültiger oder fehlender Wert: ${label}`);
  return value;
}
async function limited(entry, max, label) {
  assert(entry && !entry.dir && entry._data?.uncompressedSize <= max, `Fehlender oder zu großer ZIP-Eintrag: ${label}`);
  const bytes = await entry.async('nodebuffer');
  assert(bytes.length <= max, `ZIP-Eintrag zu groß: ${label}`);
  return bytes;
}
function parseJson(bytes, label) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  try { return [JSON.parse(text), text]; }
  catch { throw new Error(`Ungültiges JSON: ${label}`); }
}

export async function verifyLocal(zipBytes) {
  assert(zipBytes.length <= MAX_ZIP, 'ZIP überschreitet die Größenbegrenzung (200 MiB).');
  // Inspect declared sizes before CRC verification, which decompresses every entry.
  const zip = await JSZip.loadAsync(zipBytes);
  const names = Object.keys(zip.files);
  const photoNames = names.filter(name => /^original\.[a-zA-Z0-9]+$/.test(name));
  assert(photoNames.length === 1, 'Genau eine Datei original.<endung> ist erforderlich.');
  const expected = new Set([photoNames[0], 'manifest.json', 'verification.json', 'README.txt']);
  assert(names.every(name => expected.has(name) && !zip.files[name].dir
    && (!zip.files[name].unsafeOriginalName || zip.files[name].unsafeOriginalName === name)),
    'Unerwarteter oder unsicherer ZIP-Eintrag.');
  assert(names.every(name => zip.files[name]._data?.uncompressedSize <=
    (name === photoNames[0] ? MAX_PHOTO : MAX_JSON)), 'ZIP-Eintrag überschreitet die Größenbegrenzung.');
  await JSZip.loadAsync(zipBytes, { checkCRC32: true });
  const photo = await limited(zip.files[photoNames[0]], MAX_PHOTO, photoNames[0]);
  const [manifest, manifestText] = parseJson(await limited(zip.files['manifest.json'], MAX_JSON, 'manifest.json'), 'manifest.json');
  const [verification] = parseJson(await limited(zip.files['verification.json'], MAX_JSON, 'verification.json'), 'verification.json');
  assert(manifest && typeof manifest === 'object' && !Array.isArray(manifest), 'Manifest ist kein Objekt.');
  assert(verification && typeof verification === 'object' && !Array.isArray(verification), 'Verifikationsdaten sind kein Objekt.');
  const version = /^org\.doichain\.doiproof\.evidence\/(v[12])$/.exec(manifest.schema)?.[1];
  assert(version, 'Unbekannte Manifestversion.');
  const canonicalText = canonical(manifest);
  assert(manifestText === `${canonicalText}\n`, 'manifest.json ist nicht kanonisch mit genau einem abschließenden LF.');
  const photoHash = sha(photo);
  const manifestHash = sha(Buffer.from(canonicalText, 'utf8'));
  field(manifest.photo?.sha256, 'manifest.photo.sha256');
  field(verification.photoSha256, 'verification.photoSha256');
  field(verification.manifestSha256, 'verification.manifestSha256');
  field(verification.evidenceSha256, 'verification.evidenceSha256');
  assert(photoHash === manifest.photo.sha256 && photoHash === verification.photoSha256,
    'Fotodatei und Foto-Hash stimmen nicht überein.');
  assert(manifestHash === verification.manifestSha256, 'Manifest-Hash stimmt nicht überein.');
  const evidenceHash = sha(Buffer.from(`DoiProof:${version}\nphoto:${photoHash}\nmanifest:${manifestHash}`, 'utf8'));
  assert(evidenceHash === verification.evidenceSha256, 'Beweispaket-Hash stimmt nicht überein.');
  const pre = manifest.preCapture;
  if (pre !== undefined) {
    assert(manifest.capture?.source === 'camera' && pre?.bitcoin && pre?.doichain,
      'Vorabblöcke erfordern Kameraquelle und beide Blockreferenzen.');
    for (const [key, chain] of [['bitcoin', 'btc'], ['doichain', 'doi']]) {
      const block = pre[key];
      assert(block.chain === chain && HEX.test(block.hash)
        && Number.isSafeInteger(block.height) && block.height >= 0
        && !Number.isNaN(Date.parse(block.headerTimeUtc))
        && !Number.isNaN(Date.parse(block.observedAtDeviceUtc)),
      `Ungültiger Vorabblock: ${key}`);
    }
  }
  return {
    version, photoFile: photoNames[0], photoSha256: photoHash, manifestSha256: manifestHash,
    evidenceSha256: evidenceHash, preCapture: pre ?? null,
    exportedStatus: verification.status ?? null,
    exportedTxid: verification.txid ?? null,
    statement: 'Byteintegrität des exportierten Pakets bestätigt; Inhalt, Aufnahmezeit, Herkunft und App-Identität nicht attestiert.',
  };
}

async function fetchTimeout(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(12000) });
  assert(response.ok, `HTTP ${response.status} von ${url}`);
  return response;
}
async function mcp(name, args) {
  const response = await fetchTimeout(MCP, {
    method: 'POST', headers: { Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json', 'MCP-Protocol-Version': '2025-06-18' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
  });
  const envelope = await response.json();
  const result = envelope.result;
  assert(!envelope.error && result && !result.isError, `MCP-Fehler bei ${name}`);
  if (result.structuredContent) return result.structuredContent;
  const text = result.content?.find(item => item.text)?.text;
  assert(text, `Leere MCP-Antwort bei ${name}`);
  return JSON.parse(text);
}
async function online(local) {
  const checks = [];
  let failed = false;
  let incomplete = false;
  const add = (name, status, details) => {
    checks.push({ name, status, details });
    if (status === 'failed') failed = true;
    if (status === 'unavailable' || status === 'pending') incomplete = true;
  };
  try {
    const proof = await mcp('check_proof', { sha256: local.evidenceSha256 });
    if (proof.sha256 && proof.sha256 !== local.evidenceSha256) {
      add('Doichain-Transaktion', 'failed', 'API antwortet mit einem anderen Paket-Hash.');
    } else if (proof.status === 'confirmed' || proof.status === 'expired') {
      if (!HEX.test(proof.txid ?? '') || !Number.isSafeInteger(proof.block_height)) {
        add('Doichain-Transaktion', 'failed', 'Bestätigungsantwort ohne gültige Transaktions-ID oder Blockhöhe.');
      } else {
        const transaction = await mcp('get_transaction', { txid: proof.txid });
        if (transaction.txid !== proof.txid || !HEX.test(transaction.block_hash ?? '')
          || (transaction.confirmations ?? 0) < 1) {
          add('Doichain-Transaktion', 'failed', 'Transaktion, Block-Hash oder Bestätigungen widersprüchlich.');
        } else {
          const block = await mcp('get_block', { block: transaction.block_hash });
          add('Doichain-Transaktion',
            block.hash === transaction.block_hash && block.height === proof.block_height ? 'matched' : 'failed',
            `Status ${proof.status}; Transaktion ${proof.txid}; Block ${transaction.block_hash}; Höhe ${proof.block_height}`);
        }
      }
    } else {
      add('Doichain-Transaktion', proof.status === 'pending' ? 'pending' : 'failed',
        `Aktueller API-Status: ${String(proof.status)}`);
    }
  } catch (error) { add('Doichain-Transaktion', 'unavailable', String(error.message)); }
  if (local.preCapture) {
    const pre = local.preCapture;
    try {
      const block = await (await fetchTimeout(`${BTC}/block/${pre.bitcoin.hash}`)).json();
      add('BTC-Vorabblock',
        block.id === pre.bitcoin.hash && block.height === pre.bitcoin.height
          && new Date(block.timestamp * 1000).toISOString() === pre.bitcoin.headerTimeUtc ? 'matched' : 'failed',
        `Block ${pre.bitcoin.hash}; Höhe ${pre.bitcoin.height}`);
    } catch (error) { add('BTC-Vorabblock', 'unavailable', String(error.message)); }
    try {
      const block = await mcp('get_block', { block: pre.doichain.hash });
      add('DOI-Vorabblock',
        block.hash === pre.doichain.hash && block.height === pre.doichain.height
          && block.time_utc === pre.doichain.headerTimeUtc ? 'matched' : 'failed',
        `Block ${pre.doichain.hash}; Höhe ${pre.doichain.height}`);
    } catch (error) { add('DOI-Vorabblock', 'unavailable', String(error.message)); }
  }
  return { checks, status: failed ? 'failed' : incomplete ? 'incomplete' : 'matched',
    source: 'Doichain-MCP-Dienst (auch von der App genutzt) und Blockstream; keine eigene Full-Node-Prüfung.' };
}

export async function verifyBundle(path, withOnline = false) {
  const local = await verifyLocal(await readFile(path));
  return { generatedAtUtc: new Date().toISOString(), file: resolve(path), local,
    online: withOnline ? await online(local) : null };
}

function reportText(report) {
  const rows = [
    '# DoiProof-Prüfbericht', '', `Erstellt (UTC): ${report.generatedAtUtc}`,
    `ZIP: ${report.file}`, '',
    '## Lokale Prüfung', '',
    'Ergebnis: **Byteintegrität der Datei und der Hashbindung bestätigt.**', '',
    `Format: ${report.local.version}`,
    `Foto SHA-256: ${report.local.photoSha256}`,
    `Manifest SHA-256: ${report.local.manifestSha256}`,
    `Beweispaket SHA-256: ${report.local.evidenceSha256}`, '',
    'Ein ZIP oder dessen Begleitdaten können nachträglich erstellt worden sein. Die lokale Prüfung bestätigt weder Bildinhalt noch Aufnahmezeit, Person, Ort oder ausführenden App-Code.',
    '',
    '## Online-Abfragen', '',
  ];
  if (report.online) {
    rows.push(`Ergebnis: **${report.online.status}**`, '',
      ...report.online.checks.map(item => `- ${item.name}: ${item.status} — ${item.details}`),
      '', report.online.source);
  } else rows.push('Nicht durchgeführt (offline).');
  rows.push('', 'Geräte-Abfragezeiten und App-Version im Manifest sind Selbstauskünfte; Vorabblöcke belegen nicht den Auslösezeitpunkt. Eine API-Antwort ersetzt keine eigene Kettenprüfung.', '');
  return rows.join('\n');
}

async function cli(args) {
  let path; let reportPath; let asJson = false; let withOnline = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--online') withOnline = true;
    else if (args[i] === '--json') asJson = true;
    else if (args[i] === '--report') reportPath = args[++i];
    else if (!args[i].startsWith('-') && !path) path = args[i];
    else throw new Error(`Unbekanntes Argument: ${args[i]}`);
  }
  assert(path && (!reportPath || typeof reportPath === 'string'),
    'Aufruf: npm run verify -- <paket.zip> [--online] [--json] [--report bericht.md]');
  const result = await verifyBundle(path, withOnline);
  const human = reportText(result);
  if (reportPath) await writeFile(reportPath, reportPath.endsWith('.json')
    ? JSON.stringify(result, null, 2) + '\n' : human, { flag: 'wx' });
  process.stdout.write(asJson ? JSON.stringify(result, null, 2) + '\n' : human);
  if (result.online?.status === 'failed') process.exitCode = 1;
  if (result.online?.status === 'incomplete') process.exitCode = 2;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  cli(process.argv.slice(2)).catch(error => {
    process.stderr.write(`DoiProof-Prüfung fehlgeschlagen: ${error.message}\n`);
    process.exitCode = 1;
  });
}
