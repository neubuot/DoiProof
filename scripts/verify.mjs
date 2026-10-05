#!/usr/bin/env node
/**
 * App-unabhängige Prüfung eines DoiProof-Beweispakets auf der Kommandozeile.
 * Der Prüf- und Berichtskern liegt in core/ und wird unverändert auch vom Windows-Prüfer und
 * von der Handy-App verwendet. Online-Abfragen sind optional und informativ: Der MCP-Dienst wird
 * auch von der App genutzt und ist kein unabhängiger Full Node.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { systemTimeZone } from '../core/format.mjs';
import { ianaTimeZone, loadFonts, nodeSha256 } from '../core/node.mjs';
import { createPdfReport, verifyPackage, VERSION } from '../core/pipeline.mjs';
import { reportText } from '../core/report-text.mjs';
import { checkOnline, verifyLocal as coreVerifyLocal } from '../core/verify.mjs';

export { reportText, VERSION };
export const FONT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'fonts');
/** Schreibt nur neue Dateien; vorhandene Berichte bleiben unverändert. @param {string} path @param {string | Uint8Array} data */
async function writeNew(path, data) {
  try { await writeFile(path, data, { flag: 'wx' }); }
  catch (error) {
    if (/** @type {any} */ (error)?.code === 'EEXIST') throw new Error(`Datei existiert bereits und wird nicht überschrieben: ${path}`);
    throw error;
  }
}
const USAGE = 'Aufruf: npm run verify -- <paket.zip> [--online] [--json] [--report bericht.md|bericht.json] [--pdf bericht.pdf] [--ohne-foto] [--ohne-standort] [--zeitzone Europe/Berlin]';

/** Lokale Prüfung (wirft bei jedem Fehler). @param {Uint8Array} zipBytes */
export function verifyLocal(zipBytes) {
  return coreVerifyLocal(zipBytes, { sha256: nodeSha256 });
}

/**
 * Prüft eine ZIP-Datei. Kompatibel zu früheren Versionen: wirft bei lokalem Fehler.
 * @param {string} path
 * @param {boolean} [withOnline]
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function verifyBundle(path, withOnline = false, options = {}) {
  const local = await verifyLocal(new Uint8Array(await readFile(path)));
  return {
    generatedAtUtc: new Date().toISOString(), file: resolve(path), local,
    online: withOnline ? await checkOnline(local, { fetchImpl: options.fetchImpl }) : null,
  };
}

/** @param {string[]} args */
export function parseArgs(args) {
  /** @type {{ path?: string, reportPath?: string, pdfPath?: string, json: boolean, online: boolean, includePhoto: boolean, includeLocation: boolean, timeZone?: string }} */
  const options = { json: false, online: false, includePhoto: true, includeLocation: true };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = () => {
      const next = args[++i];
      if (!next || next.startsWith('--')) throw new Error(`Wert fehlt für ${arg}. ${USAGE}`);
      return next;
    };
    if (arg === '--online') options.online = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--report') options.reportPath = value();
    else if (arg === '--pdf') options.pdfPath = value();
    else if (arg === '--ohne-foto') options.includePhoto = false;
    else if (arg === '--ohne-standort') options.includeLocation = false;
    else if (arg === '--zeitzone') options.timeZone = value();
    else if (!arg.startsWith('-') && !options.path) options.path = arg;
    else throw new Error(`Unbekanntes Argument: ${arg}. ${USAGE}`);
  }
  if (!options.path) throw new Error(USAGE);
  if (options.pdfPath && !options.pdfPath.toLowerCase().endsWith('.pdf')) throw new Error('Der PDF-Bericht braucht die Endung .pdf.');
  return options;
}

/**
 * @param {string[]} args
 * @param {{ fetchImpl?: typeof fetch, now?: () => Date, stdout?: (text: string) => void }} [io]
 * @returns {Promise<number>} Exitcode: 0 in Ordnung, 1 Fehler/Widerspruch, 2 Onlineprüfung unvollständig
 */
export async function cli(args, io = {}) {
  const out = io.stdout ?? (text => process.stdout.write(text));
  const options = parseArgs(args);
  const path = /** @type {string} */ (options.path);
  const zipBytes = new Uint8Array(await readFile(path));
  const now = io.now ?? (() => new Date());
  const timeZone = options.timeZone ? ianaTimeZone(options.timeZone) : systemTimeZone();
  const { analysis, local, online } = await verifyPackage(zipBytes, { sha256: nodeSha256, online: options.online, fetchImpl: io.fetchImpl, now });

  if (options.pdfPath) {
    const { pdf } = await createPdfReport({
      analysis, online, fileName: basename(path), fonts: await loadFonts(FONT_DIR), generatedAt: now(), timeZone,
      includePhoto: options.includePhoto, includeLocation: options.includeLocation,
      producer: `DoiProof-Prüfer ${VERSION} (Kommandozeile)`,
    });
    await writeNew(options.pdfPath, pdf);
  }
  if (!local) {
    process.stderr.write(`DoiProof-Prüfung fehlgeschlagen: ${analysis.error}\n`);
    if (options.pdfPath) process.stderr.write(`PDF-Bericht mit negativem Ergebnis gespeichert: ${options.pdfPath}\n`);
    return 1;
  }
  const result = { generatedAtUtc: now().toISOString(), file: resolve(path), local, online };
  const human = reportText(result);
  if (options.reportPath) {
    await writeNew(options.reportPath, options.reportPath.endsWith('.json') ? `${JSON.stringify(result, null, 2)}\n` : human);
  }
  out(options.json ? `${JSON.stringify(result, null, 2)}\n` : human);
  if (options.pdfPath && !options.json) out(`PDF-Bericht gespeichert: ${options.pdfPath}\n`);
  if (online?.status === 'failed') return 1;
  if (online?.status === 'incomplete') return 2;
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  cli(process.argv.slice(2)).then(code => { process.exitCode = code; }, error => {
    process.stderr.write(`DoiProof-Prüfung fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
