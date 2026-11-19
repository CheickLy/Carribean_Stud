import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';

export class AdvertWatchSession extends Model {
  declare sessionId: string; declare userId: number; declare advertId: number;
  declare startedAt: Date; declare expiresAt: Date; declare completedAt: Date | null; declare invalidatedAt: Date | null;
}

AdvertWatchSession.init({
  sessionId: { type: DataTypes.UUID, primaryKey: true }, userId: { type: DataTypes.INTEGER, allowNull: false }, advertId: { type: DataTypes.INTEGER, allowNull: false },
  startedAt: { type: DataTypes.DATE, allowNull: false }, expiresAt: { type: DataTypes.DATE, allowNull: false }, completedAt: { type: DataTypes.DATE, allowNull: true }, invalidatedAt: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'advert_watch_sessions', underscored: true, timestamps: true, updatedAt: false });
