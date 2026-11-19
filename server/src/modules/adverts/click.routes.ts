import { Router } from 'express';
import { claimClick, getClickOffer } from './click.service.js';

export const clickRouter = Router();
clickRouter.use((req, res, next) => {
  const userId = req.session?.userId;
  if (!Number.isInteger(userId) || !userId) { res.status(401).json({ error: 'Not authenticated' }); return; }
  res.locals.userId = userId; next();
});

clickRouter.get('/offer', async (req, res, next) => {
  try { const offer = await getClickOffer(res.locals.userId); if (!offer) { res.status(404).json({ error: 'No eligible advertisements available' }); return; } res.json(offer); } catch (error) { next(error); }
});

clickRouter.post('/:advertId/claim', async (req, res, next) => {
  try {
    const advertId = Number(req.params.advertId);
    if (!Number.isSafeInteger(advertId) || advertId <= 0) { res.status(400).json({ error: 'Invalid advert ID' }); return; }
    res.json(await claimClick(res.locals.userId, advertId));
  } catch (error) { if (error instanceof Error) { res.status(400).json({ error: error.message }); return; } next(error); }
});
