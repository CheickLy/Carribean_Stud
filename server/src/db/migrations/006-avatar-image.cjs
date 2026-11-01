'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'avatar', {
      type: Sequelize.TEXT,
      allowNull: false,
      defaultValue: 'wave',
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query("UPDATE users SET avatar = 'wave' WHERE length(avatar) > 255");
    await queryInterface.changeColumn('users', 'avatar', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'wave',
    });
  },
};
