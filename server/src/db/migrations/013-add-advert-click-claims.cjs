const { Sequelize } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('advert_click_claims', {
      claim_id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'user_id' }, onDelete: 'CASCADE' },
      advert_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'adverts', key: 'advert_id' }, onDelete: 'CASCADE' },
      reward: { type: Sequelize.INTEGER, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addConstraint('advert_click_claims', { fields: ['user_id', 'advert_id'], type: 'unique', name: 'advert_click_claims_user_advert_unique' });
    await queryInterface.addIndex('advert_click_claims', ['user_id', 'advert_id']);
  },
  async down(queryInterface) { await queryInterface.dropTable('advert_click_claims'); },
};
