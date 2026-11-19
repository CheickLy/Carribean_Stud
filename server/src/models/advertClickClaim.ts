import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';

export class AdvertClickClaim extends Model<InferAttributes<AdvertClickClaim>, InferCreationAttributes<AdvertClickClaim>> {
  declare claimId: CreationOptional<number>;
  declare userId: number;
  declare advertId: number;
  declare reward: number;
  declare createdAt: CreationOptional<Date>;
}

AdvertClickClaim.init({
  claimId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  advertId: { type: DataTypes.INTEGER, allowNull: false },
  reward: { type: DataTypes.INTEGER, allowNull: false },
  createdAt: { type: DataTypes.DATE, allowNull: false },
}, { sequelize, tableName: 'advert_click_claims', underscored: true, timestamps: true, updatedAt: false });
