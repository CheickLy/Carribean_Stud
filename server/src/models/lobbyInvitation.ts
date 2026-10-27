import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db/sequelize.js";

export class LobbyInvitation extends Model {
  declare invitationId: number;
  declare lobbyId: number;
  declare senderId: number;
  declare recipientId: number;
  declare status: "pending" | "accepted" | "declined";
  declare createdAt: Date;
}

LobbyInvitation.init(
  {
    invitationId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "invitation_id",
    },
    lobbyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "lobby_id",
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "sender_id",
    },
    recipientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "recipient_id",
    },
    status: {
      type: DataTypes.ENUM("pending", "accepted", "declined"),
      allowNull: false,
      defaultValue: "pending",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
  },
  {
    sequelize,
    tableName: "lobby_invitations",
    timestamps: false,
    underscored: true,
  }
);