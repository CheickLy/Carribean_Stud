import { randomInt } from 'node:crypto';
import { RANKS } from '../game/card.js';
import { Hand } from '../game/hand.js';
import { PAYOUTS } from '../game/round.js';

export const BET_MS = 20_000;
export const DECISION_MS = 30_000;
export const RESULT_MS = 7_000;
export const OFFLINE_MS = 15_000;
export type Settings = { name: string; min: number; max: number; starting: number; maxPlayers: number; bots: boolean; allowBets: boolean; autoIncr: boolean; increase: number; every: number };
export type Seat = { id: string; userId: number | null; name: string; bot: boolean; balance: number; lastSeen: number; active: boolean };
export type RoundPlayer = { id: string; cards: string[]; ante: number; action: 'raise' | 'fold' | null; skipped: boolean; timedOut: boolean; result?: Result };
export type Result = { anteNet: number; raiseNet: number; returned: number; net: number; message: string };
export type Round = { id: number; number: number; phase: 'betting' | 'deciding' | 'completed'; deadline: number; dealer: string[]; players: RoundPlayer[]; min: number; max: number };
export type Table = { seats: Seat[]; round: Round | null; handsPlayed: number; botCount?: number; botRequests?: string[]; pendingBotRemovals?: string[]; nextBotNumber?: number };
export class GameError extends Error { constructor(public status: number, message: string) { super(message); } }
export const money = (cents: number) => cents / 100;
export function cents(value: unknown): number {
  const amount = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
  const scaled = Math.round(amount * 100);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(scaled) || Math.abs(amount * 100 - scaled) > 0.00001) throw new GameError(400, 'Use a valid chip amount with at most two decimal places.');
  return scaled;
}
export function limits(settings: Settings, hands: number) {
  const increment = settings.autoIncr ? Math.floor(hands / settings.every) * settings.increase : 0;
  return { min: settings.min + increment, max: settings.max + increment };
}
function shuffledDeck() {
  const cards = RANKS.flatMap(rank => ['C', 'D', 'H', 'S'].map(suit => `${rank}${suit}`));
  for (let i = cards.length - 1; i > 0; i--) { const j = randomInt(i + 1); [cards[i], cards[j]] = [cards[j], cards[i]]; }
  return cards;
}
export function newRound(table: Table, settings: Settings, id: number, now: number): Round | null {
  const { min, max } = limits(settings, table.handsPlayed);
  if (!settings.allowBets || !table.seats.some(seat => !seat.bot && seat.active && now - seat.lastSeen < OFFLINE_MS && seat.balance >= min * 3)) return null;
  const seats = table.seats.filter(seat => seat.active && (seat.bot || now - seat.lastSeen < OFFLINE_MS) && seat.balance >= min * 3);
  const deck = shuffledDeck();
  const round: Round = { id, number: table.handsPlayed + 1, min, max, phase: 'betting', deadline: now + BET_MS, dealer: deck.splice(0, 5), players: seats.map(seat => ({ id: seat.id, cards: [], ante: 0, action: null, skipped: false, timedOut: false })) };
  // Cards stay hidden until betting closes; every player shares this deck.
  for (const player of round.players) {
    player.cards = deck.splice(0, 5);
    const seat = table.seats.find(seat => seat.id === player.id)!;
    if (seat.bot) { player.ante = min; seat.balance -= min; }
  }
  table.round = round;
  return round;
}
export function resultFor(player: RoundPlayer, dealerCards: string[]): Result {
  const ante = player.ante;
  if (player.action !== 'raise') return { anteNet: -ante, raiseNet: 0, returned: 0, net: -ante, message: player.timedOut ? 'Time expired. Automatically folded.' : 'You folded.' };
  const dealer = Hand.fromTexts(dealerCards);
  const hand = Hand.fromTexts(player.cards);
  const rank = dealer.rank();
  if (rank.strength === 0 && !(rank.tieBreakers[0] === 14 && rank.tieBreakers[1] === 13)) return { anteNet: ante, raiseNet: 0, returned: ante * 4, net: ante, message: 'Dealer does not qualify. Ante wins; raise returned.' };
  const comparison = hand.compare(dealer);
  if (comparison === 0) return { anteNet: 0, raiseNet: 0, returned: ante * 3, net: 0, message: 'Push. All bets returned.' };
  if (comparison < 0) return { anteNet: -ante, raiseNet: -ante * 2, returned: 0, net: -ante * 3, message: 'Dealer wins.' };
  const raiseNet = ante * 2 * PAYOUTS[hand.rank().name];
  return { anteNet: ante, raiseNet, returned: ante * 4 + raiseNet, net: ante + raiseNet, message: 'You win!' };
}
export function advance(table: Table, now: number): boolean {
  const round = table.round;
  if (!round || round.phase === 'completed') return false;
  if (round.phase === 'betting' && (now >= round.deadline || round.players.every(player => player.ante > 0 || player.skipped))) {
    const expiredAt = round.deadline;
    for (const player of round.players) if (!player.ante) { player.skipped = true; player.timedOut = now >= expiredAt; }
    round.phase = 'deciding';
    round.deadline = (now >= expiredAt ? expiredAt : now) + DECISION_MS;
    for (const player of round.players) {
      const seat = table.seats.find(seat => seat.id === player.id)!;
      if (seat.bot && player.ante && !player.action) {
        player.action = Hand.fromTexts(player.cards).rank().strength > 0 ? 'raise' : 'fold';
        if (player.action === 'raise') seat.balance -= player.ante * 2;
      }
    }
  }
  if (round.phase === 'deciding') {
    if (now >= round.deadline) for (const player of round.players) if (player.ante && !player.action) { player.action = 'fold'; player.timedOut = true; }
    if (round.players.every(player => player.skipped || player.action)) {
      for (const player of round.players) if (player.ante) {
        player.result = resultFor(player, round.dealer);
        table.seats.find(seat => seat.id === player.id)!.balance += player.result.returned;
      }
      round.phase = 'completed';
      round.deadline = now + RESULT_MS;
      table.handsPlayed++;
      return true;
    }
  }
  return false;
}
export type Command = { kind: 'heartbeat' } | { kind: 'ante'; roundId: number; amount: unknown } | { kind: 'action'; roundId: number; action: 'fold' | 'raise' } | { kind: 'leave'; roundId: number | null };
export function applyCommand(table: Table, seat: Seat, command: Command, now: number) {
  const round = table.round;
  if (command.kind === 'heartbeat') { seat.lastSeen = now; seat.active = true; return; }
  if (command.kind === 'leave') {
    if (round && round.phase !== 'completed' && command.roundId !== round.id) throw new GameError(409, 'The hand changed. Refresh before leaving.');
    const player = round?.players.find(player => player.id === seat.id);
    if (player && !player.action && round?.phase !== 'completed') { if (player.ante) player.action = 'fold'; else player.skipped = true; }
    seat.active = false;
    return;
  }
  if (!round || command.roundId !== round.id) throw new GameError(409, 'This hand has ended. Refresh the table.');
  const player = round.players.find(player => player.id === seat.id);
  if (!player || player.skipped) throw new GameError(409, 'You are waiting for the next hand.');
  if (command.kind === 'ante') {
    const amount = cents(command.amount);
    if (player.ante === amount && amount > 0) return; // Safe retries, including after settlement.
    if (round.phase !== 'betting' || player.ante) throw new GameError(409, 'Betting has closed or your ante is already placed.');
    if (amount < round.min || amount > round.max || seat.balance < amount * 3) throw new GameError(400, 'Choose an ante within the table limits and keep enough chips for a raise.');
    player.ante = amount;
    seat.balance -= amount;
  } else {
    if (player.action === command.action) return;
    if (round.phase !== 'deciding' || player.action || !player.ante) throw new GameError(409, 'This hand is not awaiting your decision.');
    if (command.action === 'raise') { if (seat.balance < player.ante * 2) throw new GameError(400, 'Not enough chips to raise.'); seat.balance -= player.ante * 2; }
    player.action = command.action;
  }
  seat.lastSeen = now;
}
export function tableView(table: Table, settings: Settings, userId: number, now: number) {
  const round = table.round;
  const own = table.seats.find(seat => seat.userId === userId)!;
  const player = round?.players.find(player => player.id === own.id);
  const complete = round?.phase === 'completed';
  const ranks = (cards: string[]) => ({ cards, rank: Hand.fromTexts(cards).rank().name });
  const result = player?.result;
  return {
    name: settings.name, serverNow: now, maxPlayers: settings.maxPlayers, balance: money(own.balance), minBet: money(round?.min ?? limits(settings, table.handsPlayed).min), maxBet: money(round?.max ?? limits(settings, table.handsPlayed).max), startingChips: money(settings.starting), botsEnabled: settings.bots,
    roundId: round?.id ?? null, roundNumber: round?.number ?? 0, phase: round?.phase ?? 'waiting', deadline: round?.deadline ?? null,
    dealer: round && round.phase !== 'betting' ? complete ? ranks(round.dealer) : { cards: [round.dealer[0]], rank: null } : { cards: [], rank: null },
    own: { id: own.id, ante: money(player?.ante ?? 0), action: player?.action ?? null, cards: player && player.ante && round?.phase !== 'betting' ? ranks(player.cards) : { cards: [], rank: null }, result: result ? { ...result, anteNet: money(result.anteNet), raiseNet: money(result.raiseNet), returned: money(result.returned), net: money(result.net) } : null },
    seats: table.seats.map((seat, index) => {
      const participant = round?.players.find(player => player.id === seat.id);
      const online = seat.bot || (seat.active && now - seat.lastSeen < OFFLINE_MS);
      let status = !seat.active ? 'sitting out' : seat.balance < (round?.min ?? settings.min) * 3 && !participant?.ante ? 'out of chips' : 'waiting for next hand';
      if (participant && !participant.skipped) status = complete ? participant.action === 'fold' ? 'folded' : 'finished' : participant.action === 'fold' ? 'folded' : participant.action === 'raise' ? 'raised' : round?.phase === 'betting' ? participant.ante ? 'ante placed' : 'betting' : 'deciding';
      if (participant?.timedOut) status = participant.ante ? 'timed out · folded' : 'missed betting';
      return { id: seat.id, seatNumber: index + 1, name: seat.name, bot: seat.bot, balance: money(seat.balance), online, status, ante: money(participant?.ante ?? 0), isYou: seat.id === own.id,
        inRound: Boolean(participant && !participant.skipped), cardCount: participant?.ante && round?.phase !== 'betting' ? 5 : 0, net: complete && participant?.result ? money(participant.result.net) : null };
    }),
    // Opponents' card identities and hand ranks are never included.
  };
}
