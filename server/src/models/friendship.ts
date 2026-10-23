import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';

export class Friendship extends Model {
  declare friendshipId: number;
  declare friendId: number;
  declare userId: number;
  declare status: string;
}

Friendship.init(
  {
    friendshipId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    friendId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'friendships',
    underscored: true,
    timestamps: false,
  },
);
