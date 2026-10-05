import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/**
 * Übernimmt den gemeinsamen Prüf- und Berichtskern (core/) und die Berichtsschriften
 * unverändert in die Desktop-App. Kommandozeile, Windows-Prüfer und App nutzen so denselben Code.
 */
const root = new URL('../', import.meta.url);
const coreSource = new URL('core/', root);
const coreTarget = new URL('./core/', import.meta.url);
const fontSource = new URL('assets/fonts/', root);
const fontTarget = new URL('./fonts/', import.meta.url);

await rm(fileURLToPath(coreTarget), { recursive: true, force: true });
await rm(fileURLToPath(fontTarget), { recursive: true, force: true });
await rm(fileURLToPath(new URL('./verify.mjs', import.meta.url)), { force: true });
await mkdir(fileURLToPath(coreTarget), { recursive: true });
await mkdir(fileURLToPath(fontTarget), { recursive: true });
for (const name of await readdir(fileURLToPath(coreSource))) {
  if (name.endsWith('.mjs') && !name.endsWith('.test.mjs')) await copyFile(fileURLToPath(new URL(name, coreSource)), fileURLToPath(new URL(name, coreTarget)));
}
for (const name of await readdir(fileURLToPath(fontSource))) {
  if (/\.(ttf|txt|md)$/.test(name)) await copyFile(fileURLToPath(new URL(name, fontSource)), fileURLToPath(new URL(name, fontTarget)));
}
process.stdout.write('Prüf- und Berichtskern sowie Schriften für die Desktop-App kopiert.\n');
