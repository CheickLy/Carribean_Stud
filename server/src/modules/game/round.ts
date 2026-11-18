import { dealTable } from './deal.js';
import { Hand, type HandRankName } from './hand.js';

export const PAYOUTS: Record<HandRankName, number> = {
  'high card': 1, pair: 1, 'two pair': 2, 'three of a kind': 3,
  straight: 4, flush: 5, 'full house': 7, 'four of a kind': 20,
  'straight flush': 50, 'royal flush': 100,
};
export type PracticeGame = {
  balance: number;
  round?: ReturnType<typeof dealTable> & { ante: number; settled: boolean; message?: string; net?: number };
};
export function startRound(game: PracticeGame, ante: number) {
  if (game.round && !game.round.settled) throw new Error('Finish your current hand first.');
  if (!Number.isSafeInteger(ante) || ante < 1 || ante > 100 || ante * 3 > game.balance) {
    throw new Error('Choose an ante from 1 to 100 and keep enough points for a raise.');
  }
  game.balance -= ante;
  game.round = { ...dealTable(), ante, settled: false };
}
export function settleRound(game: PracticeGame, action: string) {
  const round = game.round;
  if (!round || round.settled) throw new Error('No active hand. Deal a new hand first.');
  if (action !== 'fold' && action !== 'raise') throw new Error('Choose fold or raise.');
  const { ante } = round;
  let returned = 0;
  let stake = ante;
  if (action === 'fold') {
    round.message = 'You folded.';
  } else {
    if (game.balance < ante * 2) throw new Error('Not enough points to raise.');
    game.balance -= ante * 2;
    stake = ante * 3;
    const dealer = Hand.fromTexts(round.dealer.cards);
    const player = Hand.fromTexts(round.player.cards);
    const rank = dealer.rank();
    const qualifies = rank.strength > 0 || (rank.tieBreakers[0] === 14 && rank.tieBreakers[1] === 13);
    const comparison = player.compare(dealer);
    if (!qualifies) {
      returned = ante * 4;
      round.message = 'Dealer does not qualify. Ante wins; raise returned.';
    } else if (comparison > 0) {
      returned = ante * 4 + ante * 2 * PAYOUTS[player.rank().name];
      round.message = 'You win!';
    } else if (comparison === 0) {
      returned = stake;
      round.message = 'Push. All bets returned.';
    } else {
      round.message = 'Dealer wins.';
    }
  }
  game.balance += returned;
  round.net = returned - stake;
  round.settled = true;
}
export function gameView(game: PracticeGame) {
  const round = game.round;
  return {
    balance: game.balance,
    round: round ? { ...round, dealer: round.settled ? round.dealer : { cards: [round.dealer.cards[0]], rank: null } } : null,
  };
}
