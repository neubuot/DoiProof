#!/usr/bin/env node
/**
 * Ergänzt die GitHub-Release-Notes um den Android-Abschnitt mit dem Expo-Downloadlink.
 * Ein vorhandener Abschnitt wird ersetzt (idempotent bei erneutem Lauf).
 *
 * Aufruf: node scripts/release-notes.mjs <notes.md> --version 1.0.0 --build-url <url> --apk-url <url> [--commit <sha>] [--repo-url <url>]
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const START = '<!-- doiproof-android:start -->';
export const END = '<!-- doiproof-android:end -->';

/** @param {string} value @param {string} label */
function httpsUrl(value, label) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`Ungültige URL für ${label}.`); }
  if (url.protocol !== 'https:' || !/(^|\.)expo\.dev$/.test(url.hostname)) throw new Error(`${label} muss auf expo.dev zeigen.`);
  return url.toString();
}

/** @param {{ version: string, buildUrl: string, apkUrl: string, commit?: string, repoUrl?: string }} input */
export function androidSection({ version, buildUrl, apkUrl, commit, repoUrl = 'https://github.com/neubuot/DoiProof' }) {
  if (!/^\d+\.\d+\.\d+([-+][0-9A-Za-z.-]+)?$/.test(version)) throw new Error('Ungültige Versionsnummer.');
  const build = httpsUrl(buildUrl, 'Build-Seite');
  const apk = httpsUrl(apkUrl, 'APK-Download');
  return [
    START,
    `## Android-App ${version} (APK für Tester)`,
    '',
    `- **Download (signiertes APK):** [DoiProof ${version} herunterladen](${apk})`,
    `- **Expo-Build-Seite mit QR-Code zur Installation:** ${build}`,
    `- Gebaut mit EAS Build, Profil \`preview\`, interne Verteilung, Update-Kanal \`preview\`${commit && /^[0-9a-f]{40}$/.test(commit) ? `, Commit \`${commit.slice(0, 12)}\`` : ''}.`,
    `- Installation und Updates: siehe [Anleitung für Tester](${repoUrl}/blob/main/docs/TESTER.md).`,
    END,
  ].join('\n');
}

/** @param {string} body @param {string} section */
export function mergeSection(body, section) {
  const start = body.indexOf(START);
  const end = body.indexOf(END);
  if (start >= 0 && end > start) return `${body.slice(0, start)}${section}${body.slice(end + END.length)}`;
  return `${body.trimEnd()}\n\n${section}\n`;
}

/** @param {string[]} args */
async function cli(args) {
  const [file, ...rest] = args;
  /** @type {Record<string, string>} */
  const options = {};
  for (let i = 0; i < rest.length; i += 2) {
    if (!rest[i]?.startsWith('--') || rest[i + 1] === undefined) throw new Error(`Unvollständiges Argument: ${rest[i]}`);
    options[rest[i].slice(2)] = rest[i + 1];
  }
  if (!file) throw new Error('Aufruf: node scripts/release-notes.mjs <notes.md> --version … --build-url … --apk-url … [--commit …]');
  const body = await readFile(file, 'utf8');
  process.stdout.write(mergeSection(body, androidSection({
    version: options.version, buildUrl: options['build-url'], apkUrl: options['apk-url'], commit: options.commit, repoUrl: options['repo-url'],
  })));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  cli(process.argv.slice(2)).catch(error => {
    process.stderr.write(`Release-Notes konnten nicht ergänzt werden: ${error.message}\n`);
    process.exitCode = 1;
  });
}
