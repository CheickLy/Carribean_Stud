import { Router } from 'express';
import { User } from '../../models/user.js';
import { listTickets, ticketStatuses, updateTicket } from './support.service.js';

export const supportRouter = Router();

supportRouter.use(async (req, res, next) => {
  if (!req.session?.userId) { res.status(401).json({ error: 'Not authenticated' }); return; }
  try {
    const user = await User.findByPk(req.session.userId);
    if (!user || user.isBanned || user.role !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return; }
    next();
  } catch (error) { next(error); }
});

supportRouter.get('/', async (_req, res, next) => {
  try { res.json(await listTickets()); }
  catch (error) { next(error); }
});

supportRouter.patch('/:ticketId', async (req, res, next) => {
  const ticketId = Number(req.params.ticketId);
  const { status, resolutionNote } = req.body ?? {};
  if (!Number.isSafeInteger(ticketId) || ticketId <= 0 ||
      typeof status !== 'string' || !ticketStatuses.includes(status as (typeof ticketStatuses)[number]) ||
      (resolutionNote !== null && typeof resolutionNote !== 'string') ||
      (typeof resolutionNote === 'string' && resolutionNote.length > 2000)) {
    res.status(400).json({ error: 'Valid status and resolution note are required' });
    return;
  }
  try {
    const ticket = await updateTicket(ticketId, status as (typeof ticketStatuses)[number], resolutionNote?.trim() || null);
    if (!ticket) { res.status(404).json({ error: 'Ticket not found' }); return; }
    res.json(ticket);
  } catch (error) { next(error); }
});
