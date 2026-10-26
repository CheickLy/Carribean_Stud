import { Router } from 'express';
import { User } from '../../models/user.js';
import { listUsers, setUserBanned } from './users.service.js';

export const usersRouter = Router();

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
