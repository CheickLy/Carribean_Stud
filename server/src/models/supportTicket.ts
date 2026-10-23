import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';

export class SupportTicket extends Model {
  declare ticketId: number;
  declare userId: number;
  declare subject: string;
  declare message: string;
  declare status: string;
  declare createdAt: Date;
}

SupportTicket.init(
  {
    ticketId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'support_tickets',
    underscored: true,
    timestamps: true,
    updatedAt: false,
  },
);
