const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('table_messages', {
      message_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      lobby_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'lobbies', key: 'lobby_id' }, onDelete: 'CASCADE' },
      user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'user_id' }, onDelete: 'CASCADE' },
      body: { type: DataTypes.STRING(300), allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await queryInterface.addIndex('table_messages', ['lobby_id', 'message_id']);
  },
  async down(queryInterface) { await queryInterface.dropTable('table_messages'); },
};
