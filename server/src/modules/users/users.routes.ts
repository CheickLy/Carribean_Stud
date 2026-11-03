import { Router } from 'express';
import { User } from '../../models/user.js';
import {
  deleteUserAccount,
  listUsers,
  setUserAvatar,
  setUserBanned,
  supportedAvatars,
  updateUserAccount,
  UserAccountError,
  validAvatar,
} from './users.service.js';

export const usersRouter = Router();

usersRouter.get('/avatars', (_req, res) => {
  res.json({ avatars: supportedAvatars });
});

usersRouter.patch('/me/avatar', async (req, res, next) => {
  const userId = req.session?.userId;
  const { avatar } = req.body ?? {};

  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (typeof avatar !== 'string' || !validAvatar(avatar)) {
    res.status(400).json({ error: 'Choose a supported avatar' });
    return;
  }

  try {
    const user = await setUserAvatar(userId, avatar);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ message: 'Avatar updated', user });
  } catch (error) {
    next(error);
  }
});

usersRouter.use(async (req, res, next) => {
  try {
    const userId = req.session?.userId;
    if (!Number.isInteger(userId) || !userId || userId <= 0) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({ error: 'This account is disabled' });
      return;
    }

    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required.' });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
});

usersRouter.get('/', async (_req, res, next) => {
  try {
    const users = await listUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

function accountError(error: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }, next: (error: unknown) => void) {
  if (error instanceof UserAccountError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  next(error);
}

usersRouter.patch('/:userId', async (req, res, next) => {
  const actorId = req.session?.userId;
  const userId = Number(req.params.userId);
  const { username, email } = req.body ?? {};

  if (
    !actorId ||
    !Number.isSafeInteger(userId) ||
    userId <= 0 ||
    typeof username !== 'string' ||
    typeof email !== 'string'
  ) {
    res.status(400).json({ error: 'A user id, username, and email are required' });
    return;
  }

  try {
    const user = await updateUserAccount(actorId, userId, { username, email });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error) {
    accountError(error, res, next);
  }
});

usersRouter.delete('/:userId', async (req, res, next) => {
  const actorId = req.session?.userId;
  const userId = Number(req.params.userId);

  if (!actorId || !Number.isSafeInteger(userId) || userId <= 0) {
    res.status(400).json({ error: 'A user id is required' });
    return;
  }

  try {
    const removed = await deleteUserAccount(actorId, userId);
    if (!removed) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(204).end();
  } catch (error) {
    accountError(error, res, next);
  }
});

usersRouter.patch('/:userId/ban', async (req, res, next) => {
  const userId = Number(req.params.userId);
  const { isBanned } = req.body ?? {};

  if (
    !Number.isSafeInteger(userId) ||
    userId <= 0 ||
    typeof isBanned !== 'boolean'
  ) {
    res.status(400).json({ error: 'A user id and ban flag are required' });
    return;
  }

  try {
    const user = await setUserBanned(userId, isBanned);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});
