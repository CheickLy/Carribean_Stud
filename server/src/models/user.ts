import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';

export class User extends Model {
  declare userId: number;
  declare username: string;
  declare email: string;
  declare passwordHash: string;
  declare role: string;
  declare topupCount: number;
  declare isGuest: boolean;
  declare isBanned: boolean;
  declare balance: string;
  declare createdAt: Date;
}

User.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    topupCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isGuest: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isBanned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    balance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'users',
    underscored: true,
    timestamps: true,
    updatedAt: false,
  },
);
