import { Router } from 'express';
import { GameError } from './engine.js';
import { handHistory, sharedTable, type TableCommand } from './service.js';

export const sharedGameRouter = Router();
sharedGameRouter.all('/:lobbyId/game/:operation', async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId || !Number.isSafeInteger(userId)) { res.status(401).json({ error: 'Authentication required.' }); return; }
  const lobbyId = Number(req.params.lobbyId);
  if (!Number.isSafeInteger(lobbyId) || lobbyId <= 0) { res.status(400).json({ error: 'Invalid table ID.' }); return; }
  res.setHeader('Cache-Control', 'no-store');
  const operation = req.params.operation;
  try {
    if (operation === 'history' && req.method === 'GET') { res.json(await handHistory(lobbyId, userId)); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Use POST for table actions.' }); return; }
    const { roundId, ante, action, requestId } = req.body ?? {};
    let command: TableCommand;
    if (operation === 'state') command = { kind: 'heartbeat' };
    else if (operation === 'bots') {
      if (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(requestId)) throw new GameError(400, 'A valid bot request ID is required.');
      command = { kind: 'add-bot', requestId };
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
