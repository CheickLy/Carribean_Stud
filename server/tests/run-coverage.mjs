import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const vitest = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url));
const run = spawnSync(process.execPath, [vitest, 'run', '--coverage'], {
  env: { ...process.env, TEST_POSTGRES: '1' },
  stdio: 'inherit',
});
process.exit(run.status ?? 1);
