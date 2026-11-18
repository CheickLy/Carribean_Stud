import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { gameRouter } from '../src/modules/game/game.routes.js';
import { gameView, settleRound, startRound, type PracticeGame } from '../src/modules/game/round.js';
import { Hand } from '../src/modules/game/hand.js';
function game(player: string[], dealer: string[]): PracticeGame {
  return { balance: 2440, round: {
    player: { cards: player, rank: Hand.fromTexts(player).rank().name },
    dealer: { cards: dealer, rank: Hand.fromTexts(dealer).rank().name },
    ante: 10, settled: false,
  } };
}
const pair = ['AS', 'AH', 'QD', 'JC', '9S'];
const low = ['2C', '3D', '4H', '8S', '7C'];
describe('practice round settlement', () => {
  it('reserves the ante, hides the dealer and prevents replacing an active round', () => {
    const state: PracticeGame = { balance: 2450 };
    startRound(state, 10);
    expect(state.balance).toBe(2440);
    expect(gameView(state).round?.dealer.cards).toHaveLength(1);
    expect(gameView(state).round?.dealer.rank).toBeNull();
    expect(() => startRound(state, 10)).toThrow('Finish');
  });
  it.each([0, -1, 1.5, 101, NaN])('rejects invalid ante %s', ante => {
    expect(() => startRound({ balance: 2450 }, ante)).toThrow();
  });
  it('requires enough balance for both bets', () => {
    expect(() => startRound({ balance: 29 }, 10)).toThrow();
  });
  it('fold loses only the ante and cannot settle again', () => {
    const state = game(pair, low);
    settleRound(state, 'fold');
    expect(state.balance).toBe(2440);
    expect(state.round?.net).toBe(-10);
    expect(gameView(state).round?.dealer.cards).toHaveLength(5);
    expect(() => settleRound(state, 'raise')).toThrow('No active');
  });
  it('nonqualifying dealer returns raise and pays ante even when player is weaker', () => {
    const state = game(low, ['AC', 'QD', 'JH', '9C', '6S']);
    settleRound(state, 'raise');
    expect(state.balance).toBe(2460);
    expect(state.round?.net).toBe(10);
  });
  it('ace king qualifies and a stronger pair wins even-money raise', () => {
    const state = game(pair, ['AC', 'KD', 'JH', '9C', '6S']);
    settleRound(state, 'raise');
    expect(state.balance).toBe(2480);
    expect(state.round?.net).toBe(30);
  });
  it('dealer win loses both bets', () => {
    const state = game(low, pair);
    settleRound(state, 'raise');
    expect(state.balance).toBe(2420);
    expect(state.round?.net).toBe(-30);
  });
  it('equal hands return both bets', () => {
    const state = game(pair, ['AC', 'AD', 'QH', 'JS', '9C']);
    settleRound(state, 'raise');
    expect(state.balance).toBe(2450);
    expect(state.round?.net).toBe(0);
  });
  it.each([
    [['AS','KS','QS','JS','10S'], 2010],
    [['9H','8H','7H','6H','5H'], 1010],
    [['9H','9S','9D','9C','5H'], 410],
    [['9H','9S','9D','5C','5H'], 150],
    [['AH','JH','9H','5H','2H'], 110],
    [['9H','8S','7D','6C','5H'], 90],
    [['9H','9S','9D','6C','5H'], 70],
    [['9H','9S','6D','6C','5H'], 50],
  ])('pays winning hand %j correctly', (cards, net) => {
    const state = game(cards as string[], ['2S','2D','3C','4D','7S']);
    settleRound(state, 'raise');
    expect(state.round?.net).toBe(net);
    expect(state.balance).toBe(2450 + Number(net));
  });
});
describe('game API', () => {
  function app(userId?: number) {
    const state = { userId };
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => { req.session = state as typeof req.session; next(); });
    app.use('/api/game', gameRouter);
    return app;
  }
  it('requires authentication', async () => {
    expect((await request(app()).get('/api/game/state')).status).toBe(401);
  });
  it('plays successive rounds without exposing hidden cards or accepting repeated actions', async () => {
    const server = app(7);
    expect((await request(server).get('/api/game/state')).body.balance).toBe(2450);
    const dealt = await request(server).post('/api/game/deal').send({ ante: 10 });
    expect(dealt.body.round.dealer.cards).toHaveLength(1);
    expect((await request(server).post('/api/game/deal').send({ ante: 10 })).status).toBe(400);
    expect((await request(server).post('/api/game/action').send({ action: 'cheat' })).status).toBe(400);
    const folded = await request(server).post('/api/game/action').send({ action: 'fold' });
    expect(folded.body.balance).toBe(2440);
    expect(folded.body.round.dealer.cards).toHaveLength(5);
    expect((await request(server).post('/api/game/action').send({ action: 'raise' })).status).toBe(400);
    expect((await request(server).post('/api/game/deal').send({ ante: 5 })).status).toBe(200);
  });
});
