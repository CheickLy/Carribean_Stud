import { User } from '../../models/user.js';

export const supportedAvatars = [
  'wave',
  'turtle',
  'dolphin',
  'octopus',
  'shark',
  'crab',
  'penguin',
  'seal',
  'whale',
  'jellyfish',
] as const;

export function validAvatar(avatar: string) {
  if (supportedAvatars.includes(avatar as (typeof supportedAvatars)[number])) return true;
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(avatar);
  if (!match || avatar.length > 140_000) return false;
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length < 12 || bytes.length > 100_000 || bytes.toString('base64') !== match[2]) return false;
  return match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
    : match[1] === 'jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
}

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
  if (!validAvatar(avatar)) {
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
