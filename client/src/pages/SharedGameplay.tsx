import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PlayingCard, faceCard } from './Gameplay';
import HandGuide from '../components/HandGuide';
import { decide, leaveTable, loadHistory, placeAnte, syncTable, TableRequestError, type SavedHand, type SharedTable } from '../services/sharedGame';
import '../styles/Gameplay.css';
import '../styles/SharedGameplay.css';

const format = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });
const net = (value: number) => `${value > 0 ? '+' : ''}${format(value)} chips`;
const positions = ['upper-left', 'lower-left', 'opposite', 'lower-right', 'upper-right'];

export default function SharedGameplay() {
  const { lobbyId = '' } = useParams();
  const [table, setTable] = useState<SharedTable | null>(null);
  const current = useRef<SharedTable | null>(null);
  const [ante, setAnte] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const leaving = useRef(false);
  const mounted = useRef(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(true);
  const [clock, setClock] = useState(Date.now());
  const clockOffset = useRef(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideExpanded, setGuideExpanded] = useState(false);
  const guideButton = useRef<HTMLButtonElement>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<SavedHand[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [historyBusy, setHistoryBusy] = useState(false);
  function receive(next: SharedTable) {
    current.current = next;
    clockOffset.current = next.serverNow - Date.now();
    setTable(next);
    setAnte(previous => previous === null ? next.minBet : previous);
    setConnected(true);
  }
  // Keep the poll callback current without restarting its interval on every render.
  const receiveRef = useRef(receive);
  receiveRef.current = receive;
  useEffect(() => {
    mounted.current = true;
    let active = true;
    async function refresh() {
      if (!active || pending.current || leaving.current) return;
      pending.current = true;
      try {
        const next = await syncTable(lobbyId);
        if (active) { receiveRef.current(next); setError(''); }
      } catch (cause) {
        if (active) { setConnected(false); setError(cause instanceof Error ? cause.message : 'Unable to load the table.'); }
      } finally { pending.current = false; }
    }
    void refresh();
    const poll = window.setInterval(() => void refresh(), 2000);
    const ticker = window.setInterval(() => setClock(Date.now()), 250);
    window.addEventListener('online', refresh);
    return () => { active = false; mounted.current = false; window.clearInterval(poll); window.clearInterval(ticker); window.removeEventListener('online', refresh); };
  }, [lobbyId]);
  const seconds = table?.deadline ? Math.max(0, Math.ceil((table.deadline - clock - clockOffset.current) / 1000)) : null;
  const self = table?.seats.find(seat => seat.isYou);
  const isBetting = table?.phase === 'betting' && self?.status === 'betting';
  const isDeciding = table?.phase === 'deciding' && table.own.ante && !table.own.action;
  async function action(operation: () => Promise<SharedTable>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try { const next = await operation(); if (mounted.current) receive(next); }
    catch (cause) {
      if (mounted.current) {
        setError(cause instanceof Error ? cause.message : 'Could not update the table.');
        if (!(cause instanceof TableRequestError) || cause.status >= 500) setConnected(false);
      }
    } finally { pending.current = false; if (mounted.current) setBusy(false); }
  }
  useEffect(() => {
    if (!historyOpen) return;
    let active = true;
    setHistoryBusy(true);
    setHistoryError('');
    void loadHistory(lobbyId).then(hands => { if (active) setHistory(hands); }).catch(cause => { if (active) setHistoryError(cause instanceof Error ? cause.message : 'Unable to load history.'); }).finally(() => { if (active) setHistoryBusy(false); });
    return () => { active = false; };
  }, [historyOpen, lobbyId, table?.roundId, table?.phase]);
  function closeGuide() { setGuideOpen(false); setGuideExpanded(false); guideButton.current?.focus(); }
  const ownResult = table?.own.result;
  const resultText = !table ? 'Loading shared table…' : table.phase === 'waiting' ? 'Waiting for a connected player with enough chips for the minimum ante and raise.'
    : table.phase === 'completed' ? ownResult ? `${ownResult.message.startsWith('Dealer does not qualify.') ? 'Dealer doesn’t qualify' : ownResult.message.replace(/[.!]$/, '')} · ${net(ownResult.net)}` : 'Hand finished. You will join the next hand.'
    : self?.status === 'waiting for next hand' || self?.status === 'missed betting' ? 'Your seat is reserved for the next hand.'
    : table.phase === 'betting' ? table.own.ante ? 'Ante placed. Waiting for the other players.' : 'Place your ante before betting closes.'
    : table.own.action ? 'Decision locked. Waiting for the other players.' : 'Raise twice your ante or fold before time runs out.';
  return <main className={`gameplay shared-gameplay${guideOpen ? ' gameplay-guide-open' : ''}${guideExpanded ? ' gameplay-guide-expanded' : ''}`}>
    <div className="gameplay-fit"><div className="gameplay-board">
      <Link className="gameplay-lobbies" to={`/lobbies/${lobbyId}`}>← Back to lobby</Link>
      <div className="gameplay-table-identity"><h1 title={table?.name}>{table?.name ?? 'Your table'}</h1><small>{table ? `${format(table.minBet)}–${format(table.maxBet)} chip ante · Starting chips ${format(table.startingChips)}` : 'Connecting…'}</small>
      {table && <p className="shared-round-clock" role="timer" aria-label="Round timer">Hand {table.roundNumber} · {table.phase === 'betting' ? 'Place antes' : table.phase === 'deciding' ? 'Decide' : table.phase === 'completed' ? 'Next hand' : 'Waiting'}{seconds !== null ? ` · ${seconds}s` : ''}</p>}
      </div>
      <div className="gameplay-tools">
        <button className="gameplay-settings-button" aria-expanded={historyOpen} aria-controls="table-history" onClick={() => setHistoryOpen(value => !value)}>History</button>
        <button ref={guideButton} className="gameplay-guide-button" aria-expanded={guideOpen} aria-controls="hand-guide" onClick={() => guideOpen ? closeGuide() : setGuideOpen(true)}>Hand rankings</button>
      </div>
      <p className="gameplay-wordmark">Reef Royale</p><p className="gameplay-table-caption">CARIBBEAN STUD · SHARED TABLE</p>
      {!connected && <p className="gameplay-connection gameplay-connection-reconnecting" role="status">Reconnecting… The server timer continues; an undecided hand folds at the deadline.</p>}
      {error && <p className="shared-game-error" role="alert">{error} <button onClick={() => { setError(''); void action(() => syncTable(lobbyId)); }}>Refresh table</button></p>}
      <div className="gameplay-rail" aria-hidden="true" /><div className="gameplay-inset" aria-hidden="true" />
      <div key={`dealer-${table?.roundId}`} className={`gameplay-dealer${table?.phase === 'deciding' ? ' gameplay-dealing' : ''}`} aria-label="Dealer hand">
        {table?.dealer.cards.map((card, index) => <PlayingCard key={card} {...faceCard(card)} index={index} reveal={table.phase === 'completed' && index > 0} />)}
        {table?.phase === 'deciding' && Array.from({ length: 4 }, (_, index) => <div className="gameplay-card gameplay-card-back" key={index} role="img" aria-label="Hidden dealer card"><span className="gameplay-card-pattern">♣</span></div>)}
        <p className="gameplay-hand-rank gameplay-dealer-rank">{table?.dealer.rank ? table.dealer.rank : table?.phase === 'deciding' ? 'Dealer · four cards hidden' : 'Dealer · waiting for antes'}</p>
      </div>
      <div className="gameplay-bet-spots" aria-hidden="true"><span>ANTE</span><span>RAISE</span></div>
      {!!table?.own.ante && <p className="gameplay-ante">{format(table.own.ante)}</p>}
      {table?.own.action === 'raise' && <p className="gameplay-raise-chip">{format(table.own.ante * 2)}</p>}
      <div className="gameplay-open-seats" aria-label="Other players">
        {positions.slice(0, (table?.maxPlayers ?? 6) - 1).map((position, index) => {
          const seat = table?.seats.filter(seat => !seat.isYou)[index];
          return <section key={position} className={`gameplay-open-seat shared-player-seat gameplay-open-seat-${position}`} aria-label={seat ? `${seat.name}, ${seat.status}` : 'Open seat'}><span className="gameplay-open-avatar" aria-hidden="true">{seat?.bot ? '♟' : seat?.name.slice(0, 1) ?? '♧'}</span><span><strong>{seat?.name ?? 'Open seat'}{seat?.bot ? ' · Bot' : ''}</strong><small>{seat ? `${format(seat.balance)} chips · ${seat.online ? seat.status : 'disconnected'}` : 'Waiting for a player'}</small>{seat && !seat.online && <small>{seat.status}</small>}</span></section>;
        })}
      </div>
      <div key={`player-${table?.roundId}`} className={`gameplay-player-hand${table?.phase === 'deciding' ? ' gameplay-dealing' : ''}`} aria-label="Your hand">
        {table?.own.cards.cards.map((card, index) => <PlayingCard key={card} {...faceCard(card)} index={index} />)}
        {table?.own.cards.rank && <p className="gameplay-hand-rank gameplay-player-rank">{table.own.cards.rank}</p>}
      </div>
      <section className="gameplay-seat" aria-label="Your seat"><span className="gameplay-avatar" aria-hidden="true">{self?.name.slice(0, 2).toUpperCase() ?? '…'}</span><span className="gameplay-identity"><strong>{self?.name ?? 'You'}{self ? ` · ${self.status}` : ''}</strong><small>{table ? `${format(table.balance)} table chips` : 'Loading balance…'}</small></span></section>
      <p className={`gameplay-result${ownResult && ownResult.net > 0 ? ' gameplay-payout-win' : ''}`} role="status">{resultText}</p>
      {ownResult && <details key={table?.roundId} className="gameplay-breakdown" aria-label="Payout breakdown"><summary>Details</summary><dl><div><dt>Ante</dt><dd>{net(ownResult.anteNet)}</dd></div><div><dt>Raise</dt><dd>{table?.own.action === 'fold' ? 'Not placed' : ownResult.raiseNet === 0 ? 'Returned' : net(ownResult.raiseNet)}</dd></div><div className="gameplay-breakdown-total"><dt>Net change</dt><dd>{net(ownResult.net)}</dd></div></dl></details>}
      <div className="gameplay-bets" aria-label="Bet controls">
        {isBetting && <><div className="gameplay-ante-presets" role="group" aria-label="Quick ante">{[...new Set([table!.minBet, 5, 10, 25, 50].filter(value => value >= table!.minBet && value <= table!.maxBet))].sort((a, b) => a - b).map(value => <button key={value} aria-label={`Set ante to ${value} chips`} aria-pressed={ante === value} disabled={busy || value * 3 > table!.balance} onClick={() => setAnte(value)}>{format(value)}</button>)}</div><label>Ante <input aria-label="Ante chips" type="number" step="0.01" min={table!.minBet} max={table!.maxBet} value={ante ?? ''} onChange={event => setAnte(Number(event.target.value))} /></label><button disabled={busy || !connected || !ante || ante < table!.minBet || ante > table!.maxBet || Math.round(ante * 100) * 3 > Math.round(table!.balance * 100) || seconds === 0} onClick={() => void action(() => placeAnte(lobbyId, table!.roundId!, ante!))}>Place ante</button></>}
        {!!isDeciding && <><button disabled={busy || !connected || seconds === 0} onClick={() => void action(() => decide(lobbyId, table!.roundId!, 'fold'))}>Fold</button><button className="gameplay-raise" disabled={busy || !connected || seconds === 0} onClick={() => void action(() => decide(lobbyId, table!.roundId!, 'raise'))}>Raise · {format(table!.own.ante * 2)} chips</button></>}
        {!isBetting && !isDeciding && <span className="shared-waiting">{table?.phase === 'completed' ? 'Next hand starts automatically' : 'Waiting for the table'}</span>}
      </div>
      <p className="gameplay-ante-help">{isBetting ? 'Keep 3× your ante available for the ante and raise. Antes lock when placed.' : 'The server controls the clock. Missed betting sits out; an unanswered decision folds automatically.'}</p>
    </div></div>
    <HandGuide currentRank={table?.own.cards.rank} open={guideOpen} onClose={closeGuide} expanded={guideExpanded} onToggleExpanded={() => setGuideExpanded(value => !value)} />
    {historyOpen && <aside className="shared-history" id="table-history" aria-label="Your hand history"><header><h2>Your hand history</h2><button aria-label="Close hand history" onClick={() => setHistoryOpen(false)}>×</button></header><p>Your last 20 saved hands at this table. Other players’ cards stay private.</p>{historyBusy && <p role="status">Loading hands…</p>}{historyError && <p role="alert">{historyError}</p>}{!historyBusy && !historyError && history.length === 0 && <p>No completed hands yet.</p>}<ol>{history.map(hand => <li key={hand.handId}><strong>Hand {hand.roundId} · {net(hand.net)}</strong><small>{hand.message}</small><span>Your cards: {hand.playerCards.join(' ')}</span><span>Dealer: {hand.dealerCards.join(' ')}</span><small>Ante {format(hand.ante)} · Raise {format(hand.raise)} · Returned {format(hand.returned)}</small></li>)}</ol></aside>}
  </main>;
}
