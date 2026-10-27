import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';

export class FriendMessage extends Model {
  declare messageId: number;
  declare senderId: number;
  declare recipientId: number;
  declare message: string;
  declare readAt: Date | null;
  declare createdAt: Date;
}

FriendMessage.init({
  messageId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  senderId: { type: DataTypes.INTEGER, allowNull: false },
  recipientId: { type: DataTypes.INTEGER, allowNull: false },
  message: { type: DataTypes.STRING(500), allowNull: false },
  readAt: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'friend_messages', underscored: true, timestamps: true, createdAt: 'createdAt', updatedAt: false });
