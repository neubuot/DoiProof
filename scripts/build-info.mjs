#!/usr/bin/env node
/**
 * Schreibt den Quellcode-Commit in src/buildInfo.json, damit EAS-Builds und EAS-Updates ihn als
 * (nicht attestierte) Selbstauskunft ins Manifest übernehmen. Läuft auf EAS als
 * „eas-build-post-install“ und in GitHub Actions vor „eas update“.
 */
import { writeFileSync } from 'node:fs';

const commit = process.env.EAS_BUILD_GIT_COMMIT_HASH || process.env.GITHUB_SHA || process.env.EXPO_PUBLIC_SOURCE_COMMIT || '';
const sourceCommit = /^[0-9a-f]{40}$/.test(commit) ? commit : null;
writeFileSync(new URL('../src/buildInfo.json', import.meta.url), `${JSON.stringify({ sourceCommit })}\n`);
process.stdout.write(`Build-Info: Commit ${sourceCommit ?? 'unbekannt'}\n`);
