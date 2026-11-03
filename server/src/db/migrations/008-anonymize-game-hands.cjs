'use strict';

/** Keep a hand after its player row is removed. The label replaces the username. */

async function foreignKeyName(queryInterface) {
  const [rows] = await queryInterface.sequelize.query(`
    SELECT con.conname AS name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY (con.conkey)
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'game_hands'
      AND att.attname = 'user_id'
      AND con.contype = 'f'
  `);
  return rows[0]?.name ?? null;
}

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE game_hands ADD COLUMN IF NOT EXISTS player_label VARCHAR(255)',
    );
    const name = await foreignKeyName(queryInterface);
    if (name) {
      await queryInterface.sequelize.query(
        `ALTER TABLE game_hands DROP CONSTRAINT "${name}"`,
      );
    }
    await queryInterface.sequelize.query(
      'ALTER TABLE game_hands ALTER COLUMN user_id DROP NOT NULL',
    );
    await queryInterface.sequelize.query(`
      ALTER TABLE game_hands
      ADD CONSTRAINT game_hands_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users (user_id)
      ON UPDATE CASCADE ON DELETE SET NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE game_hands DROP CONSTRAINT IF EXISTS game_hands_user_id_fkey',
    );
    await queryInterface.sequelize.query('DELETE FROM game_hands WHERE user_id IS NULL');
    await queryInterface.sequelize.query(
      'ALTER TABLE game_hands ALTER COLUMN user_id SET NOT NULL',
    );
    await queryInterface.sequelize.query(`
      ALTER TABLE game_hands
      ADD CONSTRAINT game_hands_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users (user_id)
      ON UPDATE CASCADE ON DELETE CASCADE
    `);
    await queryInterface.removeColumn('game_hands', 'player_label');
  },
};
