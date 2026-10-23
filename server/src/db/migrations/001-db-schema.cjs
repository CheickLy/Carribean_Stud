/** Initial database schema using ERD in 'Docs/Caribean_Stud_CS482.pdf' */

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      user_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      role: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      topup_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_guest: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_banned: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      balance: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.createTable('lobbies', {
      lobby_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      host_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      is_private: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      passcode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      min_bet: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      max_bet: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      allow_bets: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      auto_incr: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    });

    await queryInterface.createTable('sessions', {
      session_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      lobby_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'lobbies', key: 'lobby_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      dealer_cards: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      community_cards: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
    });

    await queryInterface.createTable('friendships', {
      friendship_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      friend_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
      },
    });

    await queryInterface.createTable('game_hands', {
      hand_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      session_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sessions', key: 'session_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      player_cards: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      call_bet: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      payout: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      outcome: {
        type: Sequelize.STRING,
        allowNull: true,
      },
    });

    await queryInterface.createTable('support_tickets', {
      ticket_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      subject: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('game_hands');
    await queryInterface.dropTable('support_tickets');
    await queryInterface.dropTable('friendships');
    await queryInterface.dropTable('sessions');
    await queryInterface.dropTable('lobbies');
    await queryInterface.dropTable('users');
  },
};
