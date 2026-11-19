import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';

export class AdvertRewardClaim extends Model {
  declare claimId: number; declare sessionId: string; declare userId: number; declare advertId: number; declare reward: number;
}

AdvertRewardClaim.init({
  claimId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, sessionId: { type: DataTypes.UUID, allowNull: false, unique: true }, userId: { type: DataTypes.INTEGER, allowNull: false }, advertId: { type: DataTypes.INTEGER, allowNull: false }, reward: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'advert_reward_claims', underscored: true, timestamps: true, updatedAt: false });
