import { Router } from 'express';
import { listUsers, setUserBanned } from './users.service.js';

export const usersRouter = Router();

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
