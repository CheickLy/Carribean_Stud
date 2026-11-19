'use strict';
module.exports = {
  async up(q, S) {
    await q.sequelize.transaction(async transaction => {
      await q.createTable('table_games', {
        lobby_id: { type: S.INTEGER, primaryKey: true, references: { model: 'lobbies', key: 'lobby_id' }, onDelete: 'CASCADE' },
        state: { type: S.JSONB, allowNull: false },
      }, { transaction });
      await q.addColumn('game_hands', 'ante_bet', { type: S.DECIMAL(12, 2), allowNull: true }, { transaction });
      await q.addColumn('game_hands', 'net_change', { type: S.DECIMAL(12, 2), allowNull: true }, { transaction });
      // Legacy rows can contain duplicates; uniqueness applies to shared-game history.
      await q.sequelize.query('CREATE UNIQUE INDEX shared_hand_once ON game_hands(session_id, user_id) WHERE ante_bet IS NOT NULL AND user_id IS NOT NULL', { transaction });
    });
  },
  async down(q) {
    await q.sequelize.transaction(async transaction => {
      await q.sequelize.query('DROP INDEX IF EXISTS shared_hand_once', { transaction });
      await q.removeColumn('game_hands', 'net_change', { transaction });
      await q.removeColumn('game_hands', 'ante_bet', { transaction });
      await q.dropTable('table_games', { transaction });
    });
  },
};
