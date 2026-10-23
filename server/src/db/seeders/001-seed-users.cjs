'use strict';

// Local seed accounts for development. Each password_hash is a bcrypt hash
// of the shared seed password Password123!. These are not production credentials.

const adminPasswordHash = '$2b$10$ghB34WUA2r.KZkICJ9Re9.6LcKz0RXVq8OVQgXfqtnnENQ0qZyfty';
const marinaPasswordHash = '$2b$10$TlpBNpog1rx07phMwp5rJOkQ2U62RiE0AdS2JdYE5uiwm1slLrTke';
const julianPasswordHash = '$2b$10$kmlV4/5MCmraoKZLSSsNbeOZjydQjnXcRbvew0V8y/WFV6KPh99Pa';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('users', [
      {
        username: 'reefadmin',
        email: 'admin@example.com',
        password_hash: adminPasswordHash,
        role: 'admin',
        topup_count: 0,
        is_guest: false,
        is_banned: false,
        balance: 0,
        created_at: new Date('2026-09-01T15:00:00.000Z'),
      },
      {
        username: 'marina',
        email: 'marina@example.com',
        password_hash: marinaPasswordHash,
        role: 'player',
        topup_count: 4,
        is_guest: false,
        is_banned: false,
        balance: 250,
        created_at: new Date('2026-09-15T18:30:00.000Z'),
      },
      {
        username: 'julian',
        email: 'julian@example.com',
        password_hash: julianPasswordHash,
        role: 'player',
        topup_count: 1,
        is_guest: false,
        is_banned: false,
        balance: 80,
        created_at: new Date('2026-10-02T21:10:00.000Z'),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', {
      email: ['admin@example.com', 'marina@example.com', 'julian@example.com'],
    });
  },
};
