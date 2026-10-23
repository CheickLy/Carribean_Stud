const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Copy .env.example to .env at the repo root.`);
  }
  return value;
}

const shared = {
  username: required('POSTGRES_USER'),
  password: required('POSTGRES_PASSWORD'),
  database: required('POSTGRES_DB'),
  host: 'localhost',
  port: Number(required('POSTGRES_PORT')),
  dialect: 'postgres',
};

module.exports = {
  development: shared,
  test: shared,
  production: shared,
};
