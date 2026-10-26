'use strict';

/** Rename the poker deal table so it is not confused with the login store "Sessions". */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.renameTable('sessions', 'game_sessions');
  },

  async down(queryInterface) {
    await queryInterface.renameTable('game_sessions', 'sessions');
  },
};
