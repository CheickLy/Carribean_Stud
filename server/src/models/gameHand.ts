import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';

export class GameHand extends Model {
  declare handId: number;
  declare sessionId: number;
  declare userId: number;
  declare playerCards: string | null;
  declare callBet: string | null;
  declare payout: string | null;
  declare outcome: string | null;
}

GameHand.init(
  {
    handId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    playerCards: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    callBet: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    payout: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    outcome: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'game_hands',
    underscored: true,
    timestamps: false,
  },
);
