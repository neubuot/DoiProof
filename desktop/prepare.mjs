import { copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const source = new URL('../scripts/verify.mjs', import.meta.url);
const destination = new URL('./verify.mjs', import.meta.url);
await copyFile(fileURLToPath(source), fileURLToPath(destination));
process.stdout.write('Prüfkern für Desktop-App kopiert.\n');
