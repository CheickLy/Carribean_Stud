
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('adverts', {
      advert_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      creative: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      destination_url: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      trigger: {
        type: Sequelize.ENUM('watch', 'click'),
        allowNull: false,
      },
      chip_reward: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      eligibility_limit: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      starts_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      ends_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('adverts');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_adverts_trigger";'
    );
  },
};
