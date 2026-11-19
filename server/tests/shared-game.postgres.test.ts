import { it } from 'vitest';

// Opt-in because normal unit tests must work without a PostgreSQL server.
it.skipIf(process.env.TEST_POSTGRES !== '1')('shared PostgreSQL persistence, privacy, concurrency and autonomous clock', async () => {
  await import('./shared-game.postgres.mjs');
}, 20000);
