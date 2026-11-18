import { Router } from 'express';
import { gameView, startRound, settleRound, expireDisconnectedRound, keepConnected } from './round.js';

export const gameRouter = Router();
gameRouter.use((req, res, next) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  req.session.practiceGame ??= { balance: 2450 };
  expireDisconnectedRound(req.session.practiceGame);
  res.setHeader('Cache-Control', 'no-store');
  next();
});
gameRouter.get('/state', (req, res) => res.json(gameView(req.session.practiceGame!)));
gameRouter.post('/heartbeat', (req, res) => {
  const game = req.session.practiceGame!;
  keepConnected(game);
  if (typeof req.body?.path === 'string' && /^\/lobbies\/[1-9]\d*\/game$/.test(req.body.path)) game.activePath = req.body.path;
  res.json(gameView(game));
});
gameRouter.post('/deal', (req, res) => {
  try {
    startRound(req.session.practiceGame!, req.body.ante);
    res.json(gameView(req.session.practiceGame!));
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});
gameRouter.post('/action', (req, res) => {
  try {
    settleRound(req.session.practiceGame!, req.body.action);
    res.json(gameView(req.session.practiceGame!));
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});
gameRouter.post('/reset', (req, res) => {
  const game = req.session.practiceGame!;
  if ((game.round && !game.round.settled) || game.balance >= 3) {
    res.status(400).json({ error: 'Finish your hand and use your remaining points before resetting.' });
    return;
  }
  req.session.practiceGame = { balance: 2450 };
  res.json(gameView(req.session.practiceGame));
});
