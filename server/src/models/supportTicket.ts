import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';

export class SupportTicket extends Model {
  declare ticketId: number;
  declare userId: number;
  declare subject: string;
  declare message: string;
  declare status: 'open' | 'in_progress' | 'resolved';
  declare resolutionNote: string | null;
  declare createdAt: Date;
  declare replyContact: string;
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
    resolutionNote: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    replyContact: {
      type: DataTypes.STRING(254),
      allowNull: true,
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
