import { Sequelize } from 'sequelize';
import { env } from '../config/env.js';

const databaseName =
  process.env.NODE_ENV === 'test'
    ? 'reefroyale_test'
    : env.postgresDb;

export const sequelize = new Sequelize(
  databaseName,
  env.postgresUser,
  env.postgresPassword,
  {
    host: 'localhost',
    port: env.postgresPort,
    dialect: 'postgres',
    logging: false,
  }
);
