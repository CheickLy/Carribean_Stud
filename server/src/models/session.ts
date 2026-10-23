import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';

export class Session extends Model {
  declare sessionId: number;
  declare lobbyId: number;
  declare dealerCards: string | null;
  declare status: string;
  declare createdAt: Date;
  declare communityCards: string | null;
}

Session.init(
  {
    sessionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lobbyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    dealerCards: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    communityCards: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'sessions',
    underscored: true,
    timestamps: true,
    updatedAt: false,
  },
);
