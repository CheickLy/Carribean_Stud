import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db/sequelize.js";

export class LobbyMember extends Model {
    declare lobbyMemberId: number;
    declare lobbyId: number;
   declare userId: number;
    declare joinedAt: Date;
}

LobbyMember.init(
    {
        lobbyMemberId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: "membership_id",
        },
        lobbyId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "lobby_id",
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "user_id",
        },
        joinedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: "joined_at",
        },
    },
    {
        sequelize,
        tableName: "lobby_members",
        timestamps: false,
        underscored: true,
        indexes: [
            {
                unique: true,
                fields: ["lobby_id", "user_id"],
            },
        ],
    }
);