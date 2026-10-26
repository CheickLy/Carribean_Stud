"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    
    async up(queryInterface, Sequelize) {
        //Max players is 6
        await queryInterface.addColumn('lobbies', 'max_players', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 6
        });
        //Starting balance is 200
        await queryInterface.addColumn('lobbies', 'starting_money', {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 200
        });
        // Allows bots to be enabled in the lobby
        await queryInterface.addColumn("lobbies", "bots_enabled", {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
        });
        // Amount to increase the minimum bet
        await queryInterface.addColumn("lobbies", "increase_amount", {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 10,
    });
    // Number of hands after which the minimum bet increases
    await queryInterface.addColumn("lobbies", "increase_every_hands", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 15,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("lobbies", "increase_every_hands");
    await queryInterface.removeColumn("lobbies", "increase_amount");
    await queryInterface.removeColumn("lobbies", "bots_enabled");
    await queryInterface.removeColumn("lobbies", "starting_money");
    await queryInterface.removeColumn("lobbies", "max_players");
  },
};
    