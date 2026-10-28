"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Existing tables have no recorded creation time; their IDs break ties.
    await queryInterface.addColumn("lobbies", "created_at", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn("NOW"),
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("lobbies", "created_at");
  },
};
