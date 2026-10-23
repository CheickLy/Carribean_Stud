import { Sequelize } from 'sequelize';
import { env } from '../config/env.js';

export const sequelize = new Sequelize(env.postgresDb, env.postgresUser, env.postgresPassword, {
  host: 'localhost',
  port: env.postgresPort,
  dialect: 'postgres',
  logging: false,
});
