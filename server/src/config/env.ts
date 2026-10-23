/** Loads the repo-root .env and exposes the variables the server requires. */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
dotenv.config({ path: path.join(repoRoot, '.env') });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Copy .env.example to .env at the repo root.`);
  }
  return value;
}

export const env = {
  port: Number(required('PORT')),
  postgresUser: required('POSTGRES_USER'),
  postgresPassword: required('POSTGRES_PASSWORD'),
  postgresDb: required('POSTGRES_DB'),
  postgresPort: Number(required('POSTGRES_PORT')),
};
