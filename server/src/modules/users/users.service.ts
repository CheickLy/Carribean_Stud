import { User } from '../../models/user.js';

const publicAttributes = [
  'userId',
  'username',
  'email',
  'role',
  'topupCount',
  'isGuest',
  'isBanned',
  'balance',
  'createdAt',
] as const;

export async function listUsers() {
  const users = await User.findAll({
    attributes: [...publicAttributes],
    order: [['userId', 'ASC']],
  });

  return users.map((user) => user.get({ plain: true }));
}

export async function setUserBanned(userId: number, isBanned: boolean) {
  const user = await User.findByPk(userId);

  if (!user) return null;

  await user.update({ isBanned });

  return User.findByPk(userId, {
    attributes: [...publicAttributes],
  }).then((updated) => updated?.get({ plain: true }) ?? null);
}
