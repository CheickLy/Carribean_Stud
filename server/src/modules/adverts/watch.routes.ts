import { Router } from 'express';
import { completeWatch, invalidateWatch, startWatch } from './watch.service.js';

export const watchRouter = Router();

watchRouter.use((req, res, next) => {
  const userId = req.session?.userId;
  if (!Number.isInteger(userId) || !userId) { res.status(401).json({ error: 'Not authenticated' }); return; }
  res.locals.userId = userId; next();
});

watchRouter.post('/start', async (req, res, next) => {
  try { const result = await startWatch(res.locals.userId); if (!result) { res.status(404).json({ error: 'No eligible advertisements available' }); return; } res.status(201).json(result); } catch (error) { next(error); }
});

watchRouter.post('/complete', async (req, res, next) => {
  try { if (typeof req.body?.sessionId !== 'string' || !req.body.sessionId) { res.status(400).json({ error: 'A watch session is required' }); return; } const result = await completeWatch(res.locals.userId, req.body.sessionId, req.body?.videoCompleted === true); res.json(result); } catch (error) { if (error instanceof Error) { res.status(400).json({ error: error.message }); return; } next(error); }
});

watchRouter.post('/exit', async (req, res, next) => {
  try { if (typeof req.body?.sessionId === 'string' && req.body.sessionId) await invalidateWatch(res.locals.userId, req.body.sessionId); res.status(204).end(); } catch (error) { next(error); }
});
