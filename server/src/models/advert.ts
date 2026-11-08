
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';

export class Advert extends Model {
  declare advertId: number;
  declare title: string;
  declare creative: string;
  declare destinationUrl: string;
  declare trigger: 'watch' | 'click';
  declare chipReward: number;
  declare eligibilityLimit: number;
  declare startsAt: Date;
  declare endsAt: Date;
  declare isActive: boolean;
  declare createdAt: Date;
}

Advert.init(
  {
    advertId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    creative: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    destinationUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    trigger: {
      type: DataTypes.ENUM('watch', 'click'),
      allowNull: false,
    },
    chipReward: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    eligibilityLimit: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    startsAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endsAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'adverts',
    underscored: true,
    timestamps: true,
    updatedAt: false,
  }
);
