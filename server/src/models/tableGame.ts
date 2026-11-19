import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';
import type { Table } from '../modules/shared-game/engine.js';

export class TableGame extends Model {
  declare lobbyId: number;
  declare state: Table;
}
TableGame.init({ lobbyId: { type: DataTypes.INTEGER, primaryKey: true }, state: { type: DataTypes.JSONB, allowNull: false } }, { sequelize, tableName: 'table_games', underscored: true, timestamps: false });
