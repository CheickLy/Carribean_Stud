"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      "support_tickets",
      "reply_contact",
      {
        type: Sequelize.STRING(254),
        allowNull: true,
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      "support_tickets",
      "reply_contact"
    );
  },
};