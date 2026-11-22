import { it } from 'vitest';

it.skipIf(process.env.TEST_POSTGRES !== '1')('multiplayer story through real login sessions and table HTTP routes', async () => {
  await import('./multiplayer.postgres.mjs');
}, 20000);
