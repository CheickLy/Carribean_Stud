import { Router } from 'express';
import { getConversation, sendMessage } from './messages.service.js';

export const messagesRouter = Router();

messagesRouter.use((req, res, next) => {
  const userId = req.session?.userId;
  if (!Number.isInteger(userId) || !userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  res.locals.userId = userId;
  next();
});

messagesRouter.get('/:friendId', async (req, res) => {
  const friendId = Number(req.params.friendId);
  if (!Number.isSafeInteger(friendId) || friendId <= 0) {
    res.status(400).json({ error: 'Invalid friend ID.' });
    return;
  }
  try {
    res.json(await getConversation(res.locals.userId, friendId));
  } catch (error) {
    res.status(403).json({ error: error instanceof Error ? error.message : 'Could not load messages.' });
  }
});

messagesRouter.post('/:friendId', async (req, res) => {
  const friendId = Number(req.params.friendId);
  const text = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!Number.isSafeInteger(friendId) || friendId <= 0 || !text || text.length > 500) {
    res.status(400).json({ error: 'Message must be between 1 and 500 characters.' });
    return;
  }
  try {
    res.status(201).json(await sendMessage(res.locals.userId, friendId, text));
  } catch (error) {
    res.status(403).json({ error: error instanceof Error ? error.message : 'Could not send message.' });
  }
});
