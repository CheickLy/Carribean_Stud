import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { vi } from 'vitest';

// Exercise real session middleware without connecting to PostgreSQL.
vi.mock('connect-session-sequelize', async () => {
  const { MemoryStore } = await import('express-session');
  return {
    default: () => class extends MemoryStore {
      async sync() {}
    },
  };
});

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.join(repoRoot, '.env') });

// Unit tests never connect. These fill in a missing .env so the app can load.
process.env.PORT ??= '3001';
process.env.POSTGRES_USER ??= 'postgres';
process.env.POSTGRES_PASSWORD ??= 'test';
process.env.POSTGRES_DB ??= 'reefroyale';
process.env.POSTGRES_PORT ??= '5432';
process.env.SESSION_SECRET ??= 'test-only-session-secret';
