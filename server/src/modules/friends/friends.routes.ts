import { Router } from 'express';
import {
  sendFriendRequest,
  getFriends,
  getPendingRequests,
  respondToFriendRequest,
  removeFriendship,
} from './friends.service.js';

export const friendsRouter = Router();

friendsRouter.use((req, res, next) => {
  const userId = req.session?.userId;
  if (!Number.isInteger(userId) || !userId || userId <= 0) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  res.locals.userId = userId;
  next();
});


friendsRouter.post('/requests', async (req, res) => {
  const { username } = req.body ?? {};

  if (typeof username !== 'string' || !username.trim()) {
    res.status(400).json({ error: 'Valid username is required.' });
    return;
  }

  try {
    const result = await sendFriendRequest(res.locals.userId, username);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Request failed.',
    });
  }
});


friendsRouter.get('/requests', async (_req, res) => {
  try {
    res.json(await getPendingRequests(res.locals.userId));
  } catch {
    res.status(500).json({ error: 'Failed to retrieve requests.' });
  }
});


friendsRouter.get('/', async (_req, res) => {
  try {
    res.json(await getFriends(res.locals.userId));
  } catch {
    res.status(500).json({ error: 'Failed to retrieve friends.' });
  }
});


friendsRouter.patch('/requests/:id', async (req, res) => {
  const friendshipId = Number(req.params.id);
  const { action } = req.body ?? {};

  if (
    !Number.isSafeInteger(friendshipId) ||
    friendshipId <= 0 ||
    (action !== 'accept' && action !== 'reject')
  ) {
    res.status(400).json({ error: 'Invalid request ID or action.' });
    return;
  }

  try {
    res.json(
      await respondToFriendRequest(
        res.locals.userId,
        friendshipId,
        action
      )
    );
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Request failed.',
    });
  }
});


friendsRouter.delete('/:id', async (req, res) => {
  const friendshipId = Number(req.params.id);

  if (!Number.isSafeInteger(friendshipId) || friendshipId <= 0) {
    res.status(400).json({ error: 'Invalid friendship ID.' });
    return;
  }

  try {
    res.json(await removeFriendship(res.locals.userId, friendshipId));
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Request failed.',
    });
  }
});
