'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('adverts', 'video_url', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('adverts', 'required_watch_seconds', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.createTable('advert_watch_sessions', {
      session_id: { type: Sequelize.UUID, primaryKey: true },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'user_id' }, onDelete: 'CASCADE' },
      advert_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'adverts', key: 'advert_id' }, onDelete: 'CASCADE' },
      started_at: { type: Sequelize.DATE, allowNull: false }, expires_at: { type: Sequelize.DATE, allowNull: false },
      completed_at: { type: Sequelize.DATE, allowNull: true }, invalidated_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.createTable('advert_reward_claims', {
      claim_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      session_id: { type: Sequelize.UUID, allowNull: false, unique: true, references: { model: 'advert_watch_sessions', key: 'session_id' }, onDelete: 'CASCADE' },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'user_id' }, onDelete: 'CASCADE' },
      advert_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'adverts', key: 'advert_id' }, onDelete: 'CASCADE' },
      reward: { type: Sequelize.INTEGER, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('advert_reward_claims', ['user_id', 'advert_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('advert_reward_claims'); await queryInterface.dropTable('advert_watch_sessions');
    await queryInterface.removeColumn('adverts', 'required_watch_seconds'); await queryInterface.removeColumn('adverts', 'video_url');
  },
};
