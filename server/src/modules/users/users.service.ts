import { User } from '../../models/user.js';

export async function listUsers() {
  const users = await User.findAll({
    attributes: [
      'userId',
      'username',
      'email',
      'role',
      'topupCount',
      'isGuest',
      'isBanned',
      'balance',
      'createdAt',
    ],
    order: [['userId', 'ASC']],
  });

  return users.map((user) => user.get({ plain: true }));
}
