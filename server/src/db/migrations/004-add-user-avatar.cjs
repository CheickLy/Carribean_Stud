'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'avatar', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'wave',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'avatar');
  },
};
