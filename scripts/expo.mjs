import { execFileSync, spawn } from 'node:child_process';
import { resolve } from 'node:path';

let sourceCommit = '';
try {
  sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8', timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
} catch {
  // Downloaded ZIPs do not carry Git history. The manifest must then omit the commit.
}
const child = spawn(process.execPath, [resolve('node_modules/expo/bin/cli'), ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ...(sourceCommit && /^[0-9a-f]{40}$/.test(sourceCommit) ? { EXPO_PUBLIC_SOURCE_COMMIT: sourceCommit } : {}),
  },
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
