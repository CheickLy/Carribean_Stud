import { User } from '../../models/user.js';

export const supportedAvatars = [
  'wave',
  'turtle',
  'dolphin',
  'octopus',
  'shark',
  'crab',
] as const;

const publicAttributes = [
  'userId',
  'username',
  'email',
  'role',
  'topupCount',
  'isGuest',
  'isBanned',
  'balance',
  'avatar',
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

export async function setUserAvatar(userId: number, avatar: string) {
  if (!supportedAvatars.includes(avatar as (typeof supportedAvatars)[number])) {
    return null;
  }

  const user = await User.findByPk(userId);
  if (!user) return undefined;

  await user.update({ avatar });

  return {
    userId: user.userId,
    username: user.username,
    avatar,
  };
}
