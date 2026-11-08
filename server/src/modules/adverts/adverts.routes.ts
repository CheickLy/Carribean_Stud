
import { Router } from 'express';
import { User } from '../../models/user.js';
import { createAdvert, listAdverts } from './adverts.service.js';


export const advertsRouter = Router();

advertsRouter.get('/', async (req, res, next) => {
  try {
    if (!req.session?.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await User.findByPk(req.session.userId);

    if (!user || user.isBanned || user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const adverts = await listAdverts();

    res.json(adverts);
  } catch (error) {
    next(error);
  }
});

advertsRouter.post('/', async (req, res, next) => {
  try {
    if (!req.session?.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await User.findByPk(req.session.userId);

    if (!user || user.isBanned || user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const {
      title,
      creative,
      destinationUrl,
      trigger,
      chipReward,
      eligibilityLimit,
      startsAt,
      endsAt,
      isActive,
    } = req.body ?? {};

    if (
      typeof title !== 'string' ||
      title.trim().length < 3 ||
      title.trim().length > 150 ||
      typeof creative !== 'string' ||
      !creative.trim() ||
      creative.length > 5000
    ) {
      res.status(400).json({ error: 'Valid title and creative are required' });
      return;
    }

    let url: URL;
    try {
      url = new URL(destinationUrl);
    } catch {
      res.status(400).json({ error: 'Valid HTTPS destination required' });
      return;
    }

    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      !['watch', 'click'].includes(trigger) ||
      !Number.isSafeInteger(chipReward) ||
      chipReward <= 0 ||
      !Number.isSafeInteger(eligibilityLimit) ||
      eligibilityLimit <= 0 ||
      typeof isActive !== 'boolean'
    ) {
      res.status(400).json({ error: 'Invalid advert settings' });
      return;
    }

    const start = new Date(startsAt);
    const end = new Date(endsAt);

    if (
      !startsAt ||
      !endsAt ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start >= end
    ) {
      res.status(400).json({ error: 'End date must be after start date' });
      return;
    }

    const advert = await createAdvert({
      title: title.trim(),
      creative: creative.trim(),
      destinationUrl: url.toString(),
      trigger,
      chipReward,
      eligibilityLimit,
      startsAt: start,
      endsAt: end,
      isActive,
    });

    res.status(201).json(advert);
  } catch (error) {
    next(error);
  }
});
