import { Op, UniqueConstraintError, type Transaction } from 'sequelize';
import { sequelize } from '../../db/sequelize.js';
import { GameHand } from '../../models/gameHand.js';
import { Lobby } from '../../models/lobby.js';
import { LobbyMember } from '../../models/lobbyMember.js';
import { User } from '../../models/user.js';

const usernamePattern = /^[a-zA-Z0-9_]{3,30}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class UserAccountError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

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

function publicUser(user: User) {
  return {
    userId: user.userId,
    username: user.username,
    email: user.email,
    role: user.role,
    topupCount: user.topupCount,
    isGuest: user.isGuest,
    isBanned: user.isBanned,
    balance: user.balance,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
}

export async function updateUserAccount(
  actorId: number,
  userId: number,
  input: { username: string; email: string },
) {
  if (actorId === userId) {
    throw new UserAccountError(403, 'You cannot edit your own account');
  }

  const user = await User.findByPk(userId);
  if (!user) return null;
  if (user.role === 'admin') {
    throw new UserAccountError(403, 'Admin accounts cannot be edited here');
  }

  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();
  if (!usernamePattern.test(username)) {
    throw new UserAccountError(
      400,
      'Username must be 3-30 characters and contain only letters, numbers, or underscores',
    );
  }
  if (!emailPattern.test(email)) {
    throw new UserAccountError(400, 'Enter a valid email address');
  }

  const taken = await User.findOne({
    where: {
      userId: { [Op.ne]: userId },
      [Op.or]: [{ username }, { email }],
    },
  });
  if (taken) {
    throw new UserAccountError(409, 'Username or email already registered');
  }

  try {
    await user.update({ username, email });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw new UserAccountError(409, 'Username or email already registered');
    }
    throw error;
  }

  user.username = username;
  user.email = email;
  return publicUser(user);
}

async function clearLoginSessions(userId: number, transaction: Transaction) {
  const [rows] = await sequelize.query('SELECT sid, data FROM "Sessions"', { transaction });
  const matches = (rows as { sid: string; data: string }[]).filter((row) => {
    try {
      const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      return data?.userId === userId;
    } catch {
      return false;
    }
  });
  if (matches.length === 0) return;
  await sequelize.query('DELETE FROM "Sessions" WHERE sid IN (:sids)', {
    replacements: { sids: matches.map((row) => row.sid) },
    transaction,
  });
}

export async function deleteUserAccount(actorId: number, userId: number) {
  if (actorId === userId) {
    throw new UserAccountError(403, 'You cannot delete your own account');
  }

  const user = await User.findByPk(userId);
  if (!user) return null;
  if (user.role === 'admin') {
    throw new UserAccountError(403, 'Admin accounts cannot be deleted here');
  }

  await sequelize.transaction(async (transaction) => {
    await GameHand.update(
      { playerLabel: 'Deleted player', userId: null },
      { where: { userId }, transaction },
    );

    const lobbies = await Lobby.findAll({ where: { hostId: userId }, transaction });
    for (const lobby of lobbies) {
      const member = await LobbyMember.findOne({
        where: { lobbyId: lobby.lobbyId, userId: { [Op.ne]: userId } },
        order: [['joinedAt', 'ASC']],
        transaction,
      });
      if (member) {
        await lobby.update({ hostId: member.userId }, { transaction });
      } else {
        await lobby.destroy({ transaction });
      }
    }

    await clearLoginSessions(userId, transaction);
    await user.destroy({ transaction });
  });

  return true;
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
