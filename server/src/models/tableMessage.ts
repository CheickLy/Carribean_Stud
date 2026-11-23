import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';

export class TableMessage extends Model {
  declare messageId: number;
  declare lobbyId: number;
  declare userId: number;
  declare body: string;
  declare createdAt: Date;
}

TableMessage.init({
  messageId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  lobbyId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  body: { type: DataTypes.STRING(300), allowNull: false },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { sequelize, tableName: 'table_messages', underscored: true, timestamps: false });
