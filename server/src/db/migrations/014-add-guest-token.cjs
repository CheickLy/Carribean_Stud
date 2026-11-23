const { Sequelize } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.addColumn('users', 'guest_token_hash', { type: Sequelize.STRING(64), allowNull: true });
    await queryInterface.addIndex('users', ['guest_token_hash'], { unique: true, name: 'users_guest_token_hash_unique' });
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('users', 'users_guest_token_hash_unique');
    await queryInterface.removeColumn('users', 'guest_token_hash');
  },
};
