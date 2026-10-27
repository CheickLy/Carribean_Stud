import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';

export class PasswordResetToken extends Model {
  declare tokenId: number;
  declare userId: number;
  declare tokenHash: string;
  declare expiresAt: Date;
  declare usedAt: Date | null;
}

PasswordResetToken.init({
  tokenId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  usedAt: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'password_reset_tokens', underscored: true, timestamps: true, createdAt: 'createdAt', updatedAt: false });
