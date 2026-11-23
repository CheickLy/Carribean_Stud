const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) { await queryInterface.addColumn('lobbies', 'starting_bots', { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }); },
  async down(queryInterface) { await queryInterface.removeColumn('lobbies', 'starting_bots'); },
};
