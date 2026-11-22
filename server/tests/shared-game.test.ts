import { describe, it, expect } from 'vitest';
import { advance, applyCommand, newRound, resultFor, tableView, cents, limits, type Settings, type Table } from '../src/modules/shared-game/engine.js';

const settings: Settings = { name: 'Shared table', min: 1000, max: 5000, starting: 100000, maxPlayers: 6, bots: false, allowBets: true, autoIncr: false, increase: 1000, every: 15 };
function table(): Table {
  return { seats: [1, 2].map(id => ({ id: `u${id}`, userId: id, name: `Player ${id}`, bot: false, balance: settings.starting, lastSeen: 1000, active: true })), round: null, handsPlayed: 0 };
}
function betBoth(t: Table) {
  newRound(t, settings, 9, 1000);
  for (const seat of t.seats) applyCommand(t, seat, { kind: 'ante', roundId: 9, amount: 10 }, 1100);
  advance(t, 1200);
}
describe('shared rounds', () => {
  it('uses one deck and dealer, and never sends opponents cards or unrevealed dealer cards', () => {
    const t = table();
    betBoth(t);
    const all = [...t.round!.dealer, ...t.round!.players.flatMap(player => player.cards)];
    expect(new Set(all).size).toBe(15);
    const alice = tableView(t, settings, 1, 1300);
    const bob = tableView(t, settings, 2, 1300);
    expect(alice.dealer.cards).toEqual(bob.dealer.cards);
    expect(alice.dealer.cards).toHaveLength(1);
    expect(alice.own.cards.cards).toEqual(t.round!.players[0].cards);
    expect(JSON.stringify(alice.seats)).not.toContain('cards');
    expect(alice.own.cards.cards).not.toEqual(bob.own.cards.cards);
    expect(alice.seats.map(seat => seat.seatNumber)).toEqual(bob.seats.map(seat => seat.seatNumber));
    expect(alice.seats.every(seat => seat.inRound && seat.cardCount === 5 && seat.net === null)).toBe(true);
    expect(alice.seats.every(seat => !('rank' in seat))).toBe(true);
  });
  it('hides player and dealer cards until betting closes', () => {
    const t = table(); newRound(t, settings, 9, 1000);
    applyCommand(t, t.seats[0], { kind: 'ante', roundId: 9, amount: 10 }, 1100);
    const view = tableView(t, settings, 1, 1200);
    expect(view.own.cards.cards).toEqual([]);
    expect(view.dealer.cards).toEqual([]);
  });
  it('locks antes, rejects stale rounds, and safely repeats identical requests', () => {
    const t = table(); newRound(t, settings, 9, 1000);
    const seat = t.seats[0];
    const command = { kind: 'ante' as const, roundId: 9, amount: 10 };
    applyCommand(t, seat, command, 1100); applyCommand(t, seat, command, 1200);
    expect(seat.balance).toBe(99000);
    expect(() => applyCommand(t, seat, { ...command, amount: 20 }, 1300)).toThrow('already placed');
    expect(() => applyCommand(t, seat, { ...command, roundId: 8 }, 1300)).toThrow('ended');
    expect(() => applyCommand(t, t.seats[1], { ...command, amount: 100 }, 1300)).toThrow('table limits');
  });
  it('settles only after everyone finishes and returns funds exactly once', () => {
    const t = table(); betBoth(t);
    applyCommand(t, t.seats[0], { kind: 'action', roundId: 9, action: 'raise' }, 1300);
    applyCommand(t, t.seats[0], { kind: 'action', roundId: 9, action: 'raise' }, 1300);
    expect(t.seats[0].balance).toBe(97000);
    expect(advance(t, 1400)).toBe(false);
    expect(tableView(t, settings, 1, 1400).dealer.cards).toHaveLength(1);
    applyCommand(t, t.seats[1], { kind: 'action', roundId: 9, action: 'fold' }, 1500);
    expect(advance(t, 1600)).toBe(true);
    const balance = t.seats[0].balance;
    expect(advance(t, 1700)).toBe(false);
    expect(t.seats[0].balance).toBe(balance);
    expect(t.handsPlayed).toBe(1);
    expect(tableView(t, settings, 1, 1700).dealer.cards).toHaveLength(5);
    expect(tableView(t, settings, 1, 1700).seats.every(seat => !('cards' in seat))).toBe(true);
  });
  it('times out betting, folds undecided hands, and does not reset expired deadlines after a restart', () => {
    const t = table(); newRound(t, settings, 9, 1000);
    applyCommand(t, t.seats[0], { kind: 'ante', roundId: 9, amount: 10 }, 1100);
    const restored = JSON.parse(JSON.stringify(t)) as Table;
    expect(advance(restored, 52000)).toBe(true);
    expect(restored.round!.phase).toBe('completed');
    expect(restored.round!.players[0].timedOut).toBe(true);
    expect(restored.round!.players[1].skipped).toBe(true);
    expect(restored.seats[0].balance).toBe(99000);
    expect(restored.seats[1].balance).toBe(100000);
  });
  it('keeps a mid-hand joiner waiting and marks stale presence disconnected', () => {
    const t = table(); betBoth(t);
    t.seats.push({ id: 'u3', userId: 3, name: 'New player', bot: false, balance: 100000, lastSeen: 1500, active: true });
    const view = tableView(t, settings, 3, 1700);
    expect(view.own.cards.cards).toEqual([]);
    expect(view.seats.find(seat => seat.isYou)?.status).toBe('waiting for next hand');
    expect(() => applyCommand(t, t.seats[2], { kind: 'action', roundId: 9, action: 'raise' }, 1700)).toThrow('waiting');
    expect(tableView(t, settings, 1, 20000).seats[0].online).toBe(false);
  });
  it('leaving folds only an undecided hand and preserves a locked raise', () => {
    const t = table(); betBoth(t);
    applyCommand(t, t.seats[0], { kind: 'action', roundId: 9, action: 'raise' }, 1300);
    applyCommand(t, t.seats[0], { kind: 'leave', roundId: 9 }, 1400);
    applyCommand(t, t.seats[1], { kind: 'leave', roundId: 9 }, 1400);
    advance(t, 1500);
    expect(t.round!.players[0].action).toBe('raise');
    expect(t.round!.players[1].action).toBe('fold');
    expect(t.seats.every(seat => !seat.active)).toBe(true);
  });
  it('honors disabled betting, bankroll requirements, and automatic increases', () => {
    const t = table();
    expect(newRound(t, { ...settings, allowBets: false }, 9, 1000)).toBeNull();
    t.seats.forEach(seat => seat.balance = 2999);
    expect(newRound(t, settings, 9, 1000)).toBeNull();
    expect(limits({ ...settings, autoIncr: true }, 30)).toEqual({ min: 3000, max: 7000 });
    expect(cents(10.25)).toBe(1025);
    expect(() => cents(10.251)).toThrow();
  });
  it('bots place minimum antes and finish decisions automatically', () => {
    const t = table();
    t.seats[1] = { ...t.seats[1], bot: true, userId: null };
    newRound(t, settings, 9, 1000);
    expect(t.round!.players[1].ante).toBe(1000);
    applyCommand(t, t.seats[0], { kind: 'ante', roundId: 9, amount: 10 }, 1100);
    advance(t, 1200);
    expect(t.round!.players[1].action).not.toBeNull();
    applyCommand(t, t.seats[0], { kind: 'action', roundId: 9, action: 'fold' }, 1300);
    expect(advance(t, 1400)).toBe(true);
  });
  it.each([
    [['AS','AH','QD','JC','9S'], 'raise', 97000],
    [['2C','3D','4H','8S','7C'], 'fold', 99000],
  ])('applies the bot policy and chip debit to %j', (cards, action, balance) => {
    const t = table();
    t.seats[1] = { ...t.seats[1], bot: true, userId: null };
    newRound(t, settings, 9, 1000);
    t.round!.players[1].cards = cards as string[];
    applyCommand(t, t.seats[0], { kind: 'ante', roundId: 9, amount: 10 }, 1100);
    advance(t, 1200);
    expect(t.round!.players[1].action).toBe(action);
    expect(t.seats[1].balance).toBe(balance);
  });
  it('rejects actions in the wrong phase, conflicting choices and raises without funds', () => {
    const t = table();
    expect(advance(t, 1000)).toBe(false);
    expect(() => applyCommand(t, t.seats[0], { kind: 'action', roundId: 9, action: 'raise' }, 1000)).toThrow('ended');
    newRound(t, settings, 9, 1000);
    expect(() => applyCommand(t, t.seats[0], { kind: 'action', roundId: 9, action: 'raise' }, 1100)).toThrow('not awaiting');
    applyCommand(t, t.seats[0], { kind: 'ante', roundId: 9, amount: 10 }, 1100);
    expect(() => applyCommand(t, t.seats[0], { kind: 'leave', roundId: 8 }, 1200)).toThrow('changed');
    applyCommand(t, t.seats[1], { kind: 'leave', roundId: 9 }, 1200);
    advance(t, 1300);
    t.seats[0].balance = 0;
    expect(() => applyCommand(t, t.seats[0], { kind: 'action', roundId: 9, action: 'raise' }, 1400)).toThrow('Not enough');
    applyCommand(t, t.seats[0], { kind: 'action', roundId: 9, action: 'fold' }, 1500);
    expect(() => applyCommand(t, t.seats[0], { kind: 'action', roundId: 9, action: 'raise' }, 1600)).toThrow('not awaiting');
  });
  it('shows waiting, out-of-chips, folded, raised, and completed states accurately', () => {
    const t = table();
    t.seats[1].active = false;
    expect(tableView(t, settings, 1, 1000).phase).toBe('waiting');
    expect(tableView(t, settings, 1, 1000).seats[1].status).toBe('sitting out');
    t.seats[0].balance = 0;
    expect(tableView(t, settings, 1, 1000).seats[0].status).toBe('out of chips');
    t.seats[0].balance = 100000; t.seats[1].active = true;
    betBoth(t);
    applyCommand(t, t.seats[0], { kind: 'action', roundId: 9, action: 'raise' }, 1300);
    expect(tableView(t, settings, 1, 1300).seats[0].status).toBe('raised');
    applyCommand(t, t.seats[1], { kind: 'action', roundId: 9, action: 'fold' }, 1400);
    expect(tableView(t, settings, 1, 1400).seats[1].status).toBe('folded');
    advance(t, 1500);
    const view = tableView(t, settings, 1, 1600);
    expect(view.own.result?.net).toBe(t.round!.players[0].result!.net / 100);
    expect(view.seats[0].status).toBe('finished');
    expect(view.seats[1].status).toBe('folded');
  });
  it('expires just betting, then expires only unanswered decisions', () => {
    const t = table(); newRound(t, settings, 9, 1000);
    applyCommand(t, t.seats[0], { kind: 'ante', roundId: 9, amount: 10 }, 1100);
    advance(t, 21000);
    expect(tableView(t, settings, 2, 21000).seats[1].status).toBe('missed betting');
    advance(t, 51000);
    const view = tableView(t, settings, 1, 51000);
    expect(view.seats[0].status).toBe('timed out · folded');
    expect(view.own.result?.message).toContain('Time expired');
    applyCommand(t, t.seats[0], { kind: 'heartbeat' }, 52000);
    expect(t.seats[0].lastSeen).toBe(52000);
    expect(() => cents({})).toThrow();
    expect(() => cents(Infinity)).toThrow();
  });
  it.each([
    [['2C','3D','4H','8S','7C'], ['AC','QD','JH','9C','6S'], 1000],
    [['AS','KS','QS','JS','10S'], ['2C','2D','4H','8S','7C'], 201000],
    [['AS','AH','QD','JC','9S'], ['AC','AD','QH','JS','9C'], 0],
    [['2C','3D','4H','8S','7C'], ['AS','AH','QD','JC','9S'], -3000],
  ])('calculates shared payout correctly for %j', (cards, dealer, expected) => {
    const result = resultFor({ id: 'u1', cards, ante: 1000, action: 'raise', skipped: false, timedOut: false }, dealer);
    expect(result.net).toBe(expected);
    expect(result.anteNet + result.raiseNet).toBe(result.net);
    expect(result.returned - 3000).toBe(result.net);
  });
});
