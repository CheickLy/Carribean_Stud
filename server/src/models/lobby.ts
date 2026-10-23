import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';

export class Lobby extends Model {
  declare lobbyId: number;
  declare hostId: number;
  declare name: string;
  declare isPrivate: boolean;
  declare passcode: string | null;
  declare minBet: string;
  declare maxBet: string;
  declare allowBets: boolean;
  declare isActive: boolean;
  declare autoIncr: boolean;
}

Lobby.init(
  {
    lobbyId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    hostId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    passcode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    minBet: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    maxBet: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    allowBets: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    autoIncr: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'lobbies',
    underscored: true,
    timestamps: false,
  },
);
