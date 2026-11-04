'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('lobby_members', 'waiting_for_session_id', {
      type: Sequelize.INTEGER, allowNull: true,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('lobby_members', 'waiting_for_session_id');
  },
};
