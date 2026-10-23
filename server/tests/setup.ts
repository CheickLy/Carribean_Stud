import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.join(repoRoot, '.env') });

// Unit tests never connect. These fill in a missing .env so the app can load.
process.env.PORT ??= '3001';
process.env.POSTGRES_USER ??= 'postgres';
process.env.POSTGRES_PASSWORD ??= 'test';
process.env.POSTGRES_DB ??= 'reefroyale';
process.env.POSTGRES_PORT ??= '5432';
