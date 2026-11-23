import { Router } from 'express';
import { Op } from 'sequelize';
import { GameHand } from '../../models/gameHand.js';
import { Session } from '../../models/session.js';
import { Lobby } from '../../models/lobby.js';
import { User } from '../../models/user.js';

export const recordRouter = Router();

recordRouter.use(async (req, res, next) => {
  try {
    const userId = req.session?.userId;
    if (!userId) { res.status(401).json({ error: 'Sign in to see your record.' }); return; }
    const user = await User.findByPk(userId);
    if (!user || user.isBanned) { res.status(403).json({ error: 'This account cannot view game records.' }); return; }
    res.setHeader('Cache-Control', 'no-store');
    next();
  } catch (error) { next(error); }
});

function result(net: number) { return net > 0 ? 'Win' : net < 0 ? 'Loss' : 'Tie'; }
function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value; }

recordRouter.get('/stats', async (req, res, next) => {
  try {
    const hands = await GameHand.findAll({ where: { userId: req.session.userId!, anteBet: { [Op.ne]: null } }, attributes: ['netChange', 'callBet'] });
    const nets = hands.map(hand => Number(hand.netChange));
    const wins = nets.filter(net => net > 0).length;
    const losses = nets.filter(net => net < 0).length;
    const ties = nets.filter(net => net === 0).length;
    res.json({ hands: hands.length, wins, losses, ties, winRate: hands.length ? Math.round(wins / hands.length * 100) : 0,
      net: Number(nets.reduce((sum, net) => sum + net, 0).toFixed(2)),
      raised: hands.filter(hand => Number(hand.callBet) > 0).length,
      folded: hands.filter(hand => Number(hand.callBet) === 0).length });
  } catch (error) { next(error); }
});

recordRouter.get('/history', async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const sessionId = req.query.sessionId === undefined ? null : Number(req.query.sessionId);
    const from = typeof req.query.from === 'string' ? req.query.from : '';
    const to = typeof req.query.to === 'string' ? req.query.to : '';
    if (!Number.isSafeInteger(page) || page < 1 || (sessionId !== null && (!Number.isSafeInteger(sessionId) || sessionId < 1)) ||
        (from && !validDate(from)) || (to && !validDate(to)) || (from && to && from > to)) {
      res.status(400).json({ error: 'Choose a valid page, session and date range.' }); return;
    }
    const sessions = await Session.findAll({ where: {
      ...(sessionId ? { sessionId } : {}),
      ...((from || to) ? { createdAt: { ...(from ? { [Op.gte]: new Date(`${from}T00:00:00Z`) } : {}), ...(to ? { [Op.lt]: new Date(Date.parse(`${to}T00:00:00Z`) + 86400000) } : {}) } } : {}),
    }, attributes: ['sessionId', 'lobbyId', 'createdAt'] });
    const sessionIds = sessions.map(session => session.sessionId);
    if (!sessionIds.length) { res.json({ page, total: 0, pages: 0, hands: [], sessions: [] }); return; }
    const where = { userId: req.session.userId!, anteBet: { [Op.ne]: null }, sessionId: { [Op.in]: sessionIds } };
    const total = await GameHand.count({ where });
    const hands = await GameHand.findAll({ where, order: [['handId', 'DESC']], limit: 10, offset: (page - 1) * 10 });
    const lobbyIds = [...new Set(sessions.map(session => session.lobbyId))];
    const lobbies = await Lobby.findAll({ where: { lobbyId: { [Op.in]: lobbyIds } }, attributes: ['lobbyId', 'name'] });
    const sessionById = new Map(sessions.map(session => [session.sessionId, session]));
    const lobbyById = new Map(lobbies.map(lobby => [lobby.lobbyId, lobby.name]));
    res.json({ page, total, pages: Math.ceil(total / 10),
      hands: hands.map(hand => { const session = sessionById.get(hand.sessionId)!; const net = Number(hand.netChange); return {
        id: hand.handId, sessionId: hand.sessionId, date: session.createdAt, table: lobbyById.get(session.lobbyId) ?? `Table ${session.lobbyId}`,
        ante: Number(hand.anteBet), choice: Number(hand.callBet) > 0 ? 'Raise' : 'Fold', hand: hand.playerCards ?? '', result: result(net), net,
      }; }),
      sessions: [...new Map(sessions.filter(session => hands.some(hand => hand.sessionId === session.sessionId)).map(session => [session.sessionId, { id: session.sessionId, table: lobbyById.get(session.lobbyId) ?? `Table ${session.lobbyId}` }])).values()],
    });
  } catch (error) { next(error); }
});
