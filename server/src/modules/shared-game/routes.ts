import { Router } from 'express';
import { GameError } from './engine.js';
import { handHistory, sharedTable, spectateTable, type TableCommand } from './service.js';
import { TableMessage } from '../../models/tableMessage.js';
import { User } from '../../models/user.js';

export const sharedGameRouter = Router();
sharedGameRouter.post('/:lobbyId/game/spectate', async (req, res, next) => {
  const lobbyId = Number(req.params.lobbyId);
  const passcode = req.body?.passcode;
  if (!Number.isSafeInteger(lobbyId) || lobbyId <= 0 || (passcode !== undefined && (typeof passcode !== 'string' || passcode.length > 72))) { res.status(400).json({ error: 'Use a valid table ID and password.' }); return; }
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await spectateTable(lobbyId, req.session?.userId ?? null, passcode));
  } catch (error) {
    if (error instanceof GameError) { res.status(error.status).json({ error: error.message }); return; }
    next(error);
  }
});
sharedGameRouter.all('/:lobbyId/game/:operation', async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId || !Number.isSafeInteger(userId)) { res.status(401).json({ error: 'Authentication required.' }); return; }
  const lobbyId = Number(req.params.lobbyId);
  if (!Number.isSafeInteger(lobbyId) || lobbyId <= 0) { res.status(400).json({ error: 'Invalid table ID.' }); return; }
  res.setHeader('Cache-Control', 'no-store');
  const operation = req.params.operation;
  try {
    if (operation === 'chat') {
      const table = await sharedTable(lobbyId, userId);
      const seat = table?.seats.find(seat => seat.isYou);
      if (!seat || !seat.online) throw new GameError(403, 'Reconnect to your seat before using table chat.');
      if (req.method === 'POST') {
        const body = req.body?.message;
        if (typeof body !== 'string' || !body.trim() || body.trim().length > 300) throw new GameError(400, 'Write a message of 1 to 300 characters.');
        await TableMessage.create({ lobbyId, userId, body: body.trim() });
      } else if (req.method !== 'GET') { res.status(405).json({ error: 'Use GET or POST for chat.' }); return; }
      const messages = (await TableMessage.findAll({ where: { lobbyId }, order: [['messageId', 'DESC']], limit: 50 })).reverse();
      const users = await User.findAll({ where: { userId: messages.map(message => message.userId) }, attributes: ['userId', 'username', 'isGuest'] });
      const names = new Map(users.map(user => [user.userId, user.isGuest ? 'Guest' : user.username]));
      res.json(messages.map(message => ({ id: message.messageId, userId: message.userId, name: names.get(message.userId) ?? 'Player', message: message.body, createdAt: message.createdAt })));
      return;
    }
    if (operation === 'history' && req.method === 'GET') { res.json(await handHistory(lobbyId, userId)); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Use POST for table actions.' }); return; }
    const { roundId, ante, action, requestId, seatId } = req.body ?? {};
    let command: TableCommand;
    if (operation === 'state') command = { kind: 'heartbeat' };
    else if (operation === 'bots') {
      if (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(requestId)) throw new GameError(400, 'A valid bot request ID is required.');
      command = { kind: 'add-bot', requestId };
    }
    else if (operation === 'remove-bot' || operation === 'transfer-host') {
      if (typeof seatId !== 'string' || !/^(bot|u)[1-9][0-9]*$/.test(seatId) || (operation === 'remove-bot' && !seatId.startsWith('bot'))) throw new GameError(400, 'A valid player seat is required.');
      command = { kind: operation, seatId };
    }
    else if (!Number.isSafeInteger(roundId) && !(operation === 'leave' && roundId === null)) throw new GameError(400, 'A valid round ID is required.');
    else if (operation === 'ante') command = { kind: 'ante', roundId, amount: ante };
    else if (operation === 'action' && (action === 'fold' || action === 'raise')) command = { kind: 'action', roundId, action };
    else if (operation === 'leave') command = { kind: 'leave', roundId };
    else throw new GameError(400, 'Invalid table action.');
    res.json(await sharedTable(lobbyId, userId, command));
  } catch (error) {
    if (error instanceof GameError) { res.status(error.status).json({ error: error.message }); return; }
    next(error);
  }
});
