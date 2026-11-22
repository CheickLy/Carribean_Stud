import { useEffect, useRef, useState } from 'react';
import { Link, useBlocker, useParams } from 'react-router-dom';
import { PlayingCard, faceCard, handLabel } from './Gameplay';
import HandGuide from '../components/HandGuide';
import useTablePreferences from '../components/useTablePreferences';
import { removeBot, transferHost, addBot, decide, leaveTable, loadHistory, placeAnte, syncTable, TableRequestError, type SavedHand, type SharedTable } from '../services/sharedGame';
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
  const pollRequest = useRef<Promise<SharedTable> | null>(null);
  const leaving = useRef(false);
  const mounted = useRef(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(true);
  const [recoveryNotice, setRecoveryNotice] = useState('');
  const disconnected = useRef(false);
  const [clock, setClock] = useState(Date.now());
  const clockOffset = useRef(0);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideExpanded, setGuideExpanded] = useState(false);
  const guideButton = useRef<HTMLButtonElement>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<SavedHand[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [historyBusy, setHistoryBusy] = useState(false);
  const { preferences, setPreferences, prepareSound, playSound } = useTablePreferences();
  const signature = useRef('');
  const botRequest = useRef<string | null>(null);
  const [botNotice, setBotNotice] = useState('');
  useEffect(() => setBotNotice(''), [table?.roundId]);
  function receive(next: SharedTable) {
    const nextSignature = `${next.roundId}:${next.phase}`;
    if (signature.current && signature.current !== nextSignature) {
      if (next.phase === 'deciding') playSound('deal');
      if (next.phase === 'completed') playSound((next.own.result?.net ?? 0) > 0 ? 'win' : 'settle');
    }
    signature.current = nextSignature;
    current.current = next;
    clockOffset.current = next.serverNow - Date.now();
    setTable(next);
    setAnte(previous => previous === null ? next.minBet : previous);
    if (disconnected.current) setRecoveryNotice('Reconnected. Your seat and current hand are restored from the server.');
    disconnected.current = false;
    setConnected(true);
  }
  // Keep the poll callback current without restarting its interval on every render.
  const receiveRef = useRef(receive);
  receiveRef.current = receive;
  useEffect(() => {
    mounted.current = true;
    let active = true;
    async function refresh() {
      if (!active || pending.current || leaving.current || pollRequest.current) return;
      const request = syncTable(lobbyId);
      pollRequest.current = request;
      try {
        const next = await request;
        if (active) { receiveRef.current(next); setError(''); }
      } catch (cause) {
        if (active) { disconnected.current = true; setConnected(false); setError(cause instanceof Error ? cause.message : 'Unable to load the table.'); }
      } finally { if (pollRequest.current === request) pollRequest.current = null; }
    }
    void refresh();
    const poll = window.setInterval(() => void refresh(), 2000);
    const ticker = window.setInterval(() => setClock(Date.now()), 250);
    const offline = () => { disconnected.current = true; setConnected(false); setRecoveryNotice(''); };
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('offline', offline);
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('online', refresh);
    return () => { active = false; mounted.current = false; window.clearInterval(poll); window.clearInterval(ticker); window.removeEventListener('online', refresh); window.removeEventListener('offline', offline); document.removeEventListener('visibilitychange', visible); };
  }, [lobbyId]);
  const seconds = table?.deadline ? Math.max(0, Math.ceil((table.deadline - clock - clockOffset.current) / 1000)) : null;
  const self = table?.seats.find(seat => seat.isYou);
  const hasHand = Boolean(table?.own.ante && table.phase !== 'completed');
  const isBetting = table?.phase === 'betting' && self?.status === 'betting';
  const isDeciding = table?.phase === 'deciding' && table.own.ante && !table.own.action;
  const blocked = useBlocker(({ currentLocation, nextLocation }) => Boolean(current.current) && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocked.state !== 'blocked' || leaving.current) return;
    if (pending.current) { setError('Please wait for the table update, then try leaving again.'); blocked.reset(); return; }
    const state = current.current!;
    if (state.own.ante && state.phase !== 'completed') {
      const warning = state.own.action === 'raise'
        ? 'Your raise is already locked. Leaving will not cancel it. Your result will be saved when the hand finishes.'
        : state.own.action === 'fold' ? 'Your hand is already folded. Your result will be saved when the hand finishes.'
        : `Leaving will fold your hand and lose your ${format(state.own.ante)} chip ante. No raise will be placed.`;
      if (!window.confirm(`Leave table?\n\n${warning}\n\nChoose Cancel to stay.`)) { blocked.reset(); return; }
    }
    leaving.current = true;
    pending.current = true;
    setBusy(true);
    void (async () => {
      await pollRequest.current?.catch(() => {});
      await leaveTable(lobbyId, state.roundId);
      blocked.proceed();
    })().catch(cause => {
      setError(cause instanceof Error ? cause.message : 'Could not leave the table.');
      blocked.reset();
    }).finally(() => { leaving.current = false; pending.current = false; if (mounted.current) setBusy(false); });
  }, [blocked, lobbyId]);
  useEffect(() => {
    if (!hasHand && !busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasHand, busy]);
  async function action(operation: () => Promise<SharedTable>) {
    if (pending.current || leaving.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    prepareSound();
    try {
      // Finish an in-flight heartbeat before submitting the player's intent.
      // Polling must never silently consume an ante, raise, fold or bot click.
      await pollRequest.current?.catch(() => {});
      if (!mounted.current) return;
      const next = await operation();
      if (mounted.current) { receive(next); setError(''); }
    }
    catch (cause) {
      if (mounted.current) {
        setError(cause instanceof Error ? cause.message : 'Could not update the table.');
        if (!(cause instanceof TableRequestError) || cause.status >= 500) { disconnected.current = true; setConnected(false); setRecoveryNotice(''); }
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
  const humanCount = table?.seats.filter(seat => !seat.bot).length ?? 0;
  const botCount = table?.seats.filter(seat => seat.bot).length ?? 0;
  const others = table?.seats.filter(seat => !seat.isYou).sort((left, right) => Number(right.inRound) - Number(left.inRound) || left.seatNumber - right.seatNumber) ?? [];
  const resultText = !table ? 'Loading shared table…' : table.phase === 'waiting' ? 'Waiting for a connected player with enough chips for the minimum ante and raise.'
    : table.phase === 'completed' ? ownResult ? `${ownResult.message.startsWith('Dealer does not qualify.') ? 'Dealer doesn’t qualify' : ownResult.message.replace(/[.!]$/, '')} · ${net(ownResult.net)}` : 'Hand finished. You will join the next hand.'
    : self?.status === 'out of chips' ? `You need ${format(table.minBet * 3)} table chips to cover the minimum ante and raise.`
    : self?.inRound === false || self?.status === 'waiting for next hand' || self?.status === 'missed betting' ? 'Your seat is reserved for the next hand.'
    : table.phase === 'betting' ? table.own.ante ? 'Ante placed. Waiting for the other players.' : 'Place your ante before betting closes.'
    : table.own.action ? 'Decision locked. Waiting for the other players.' : 'Raise twice your ante or fold before time runs out.';
  return <main className={`gameplay shared-gameplay${guideOpen ? ' gameplay-guide-open' : ''}${guideExpanded ? ' gameplay-guide-expanded' : ''}${preferences.reducedMotion ? ' gameplay-reduced-motion' : ''}${preferences.fastDeal ? ' gameplay-fast-deal' : ''}`}>
    <div className="gameplay-fit"><div className="gameplay-board">
      <Link className="gameplay-lobbies" to={`/lobbies/${lobbyId}`}>← Back to lobby</Link>
      <div className="gameplay-table-identity"><h1 title={table?.name}>{table?.name ?? 'Your table'}</h1><small>{table ? `${format(table.minBet)}–${format(table.maxBet)} chip ante · Starting chips ${format(table.startingChips)}` : 'Connecting…'}</small>
      {table && <p className="shared-round-clock" role="timer" aria-label="Round timer">Hand {table.roundNumber} · {table.phase === 'betting' ? 'Place antes' : table.phase === 'deciding' ? 'Decide' : table.phase === 'completed' ? 'Next hand' : 'Waiting'}{seconds !== null ? ` · ${seconds}s` : ''}</p>}
      {table && <details className="shared-roster"><summary>{humanCount} {humanCount === 1 ? 'player' : 'players'} · {botCount} {botCount === 1 ? 'bot' : 'bots'}</summary><ul aria-label="Table roster">{table.seats.map(seat => <li key={seat.id}><strong>Seat {seat.seatNumber} · {seat.name}{seat.isYou ? ' (You)' : seat.bot ? ' (Bot)' : ''}{seat.isHost ? ' · Host' : ''}</strong><span>{seat.online ? seat.status : `Disconnected · ${seat.status}`} · {format(seat.balance)} chips</span></li>)}</ul></details>}
      </div>
      <div className="gameplay-tools">
        <button className="gameplay-settings-button" aria-expanded={optionsOpen} aria-controls="table-options" onClick={() => setOptionsOpen(value => !value)}>Options</button>
        <button className="gameplay-settings-button" aria-expanded={historyOpen} aria-controls="table-history" onClick={() => setHistoryOpen(value => !value)}>History</button>
        <button ref={guideButton} className="gameplay-guide-button" aria-expanded={guideOpen} aria-controls="hand-guide" onClick={() => guideOpen ? closeGuide() : setGuideOpen(true)}>Rules &amp; hands</button>
      </div>
      {optionsOpen && <section className="gameplay-preferences" id="table-options" aria-label="Table options"><header><strong>Table options</strong><button aria-label="Close table options" onClick={() => setOptionsOpen(false)}>×</button></header>
        <label><input type="checkbox" checked={preferences.sound} onChange={event => setPreferences(value => ({ ...value, sound: event.target.checked }))} />Sound effects</label>
        <label><input type="checkbox" checked={preferences.reducedMotion} onChange={event => setPreferences(value => ({ ...value, reducedMotion: event.target.checked }))} />Reduce motion</label>
        <label><input type="checkbox" checked={preferences.fastDeal} onChange={event => setPreferences(value => ({ ...value, fastDeal: event.target.checked }))} />Faster dealing</label><p>Saved on this device. System reduced motion is respected.</p>
        <div className="shared-bot-options"><strong>Players &amp; bots</strong><p>{!table ? 'Loading table controls…' : !table.botsEnabled ? 'Bots are disabled for this lobby.' : !table.isHost ? 'Only the host can add bots.' : table.canAddBot ? 'Add one bot to an open seat. It joins the next hand.' : 'All seats are reserved. No room for another bot.'}</p>
          {table?.botsEnabled && table.isHost && <button type="button" disabled={!table.canAddBot || busy || !connected} onClick={() => {
            botRequest.current ??= crypto.randomUUID();
            void action(() => addBot(lobbyId, botRequest.current!).then(next => { botRequest.current = null; setBotNotice('Bot added. It will join the next hand.'); return next; }));
          }}>{busy ? 'Adding…' : 'Add bot'}</button>}
          {table?.isHost && <ul className="shared-host-controls" aria-label="Host controls">{table.seats.filter(seat => seat.bot || (!seat.isYou && seat.online && seat.status !== 'sitting out')).map(seat => <li key={seat.id}><span>{seat.name}</span><button type="button" disabled={busy || !connected || seat.removalPending} onClick={() => {
            if (seat.bot) void action(() => removeBot(lobbyId, seat.id).then(next => { setBotNotice('Bot removal saved. Any current hand will finish before its seat is freed.'); return next; }));
            else if (window.confirm(`Make ${seat.name} the host? You will hand over the host controls.`)) void action(() => transferHost(lobbyId, seat.id).then(next => { setBotNotice(`Hosting transferred to ${seat.name}.`); return next; }));
          }} aria-label={seat.bot ? `Remove ${seat.name}` : `Make ${seat.name} host`}>{seat.removalPending ? 'Leaving after hand' : seat.bot ? 'Remove bot' : 'Make host'}</button></li>)}</ul>}
          <p>Hosting passes to another connected player when the host leaves or stays disconnected for 15 seconds.</p>
          {botNotice && <p role="status">{botNotice}</p>}
        </div><div className="shared-bot-options"><Link to="/tutorial" state={{ lobbyId }}>How to play →</Link><p>Play a guided practice hand. Leaving an active hand still requires confirmation.</p></div></section>}
      <p className="gameplay-wordmark">Reef Royale</p><p className="gameplay-table-caption">CARIBBEAN STUD · SHARED TABLE</p>
      {!connected && <p className="gameplay-connection gameplay-connection-reconnecting" role="status">Reconnecting… The server timer continues; an undecided hand folds at the deadline.</p>}
      {connected && recoveryNotice && <p className="gameplay-connection gameplay-connection-restored" role="status">{recoveryNotice}</p>}
      {error && <p className="shared-game-error" role="alert">{error} <button onClick={() => { setError(''); void action(() => syncTable(lobbyId)); }}>Refresh table</button></p>}
      <div className="gameplay-rail" aria-hidden="true" /><div className="gameplay-inset" aria-hidden="true" />
      <div key={`dealer-${table?.roundId}`} className={`gameplay-dealer${table?.phase === 'deciding' ? ' gameplay-dealing' : ''}`} aria-label="Dealer hand">
        {table?.dealer.cards.map((card, index) => <PlayingCard key={card} {...faceCard(card)} index={index} reveal={table.phase === 'completed' && index > 0} />)}
        {table?.phase === 'deciding' && Array.from({ length: 4 }, (_, index) => <div className="gameplay-card gameplay-card-back" key={index} role="img" aria-label="Hidden dealer card"><span className="gameplay-card-pattern">♣</span></div>)}
        <p className="gameplay-hand-rank gameplay-dealer-rank">{table?.dealer.rank ? handLabel('Dealer', table.dealer.rank, table.dealer.cards) : table?.phase === 'deciding' ? 'Dealer · four cards hidden' : 'Dealer · waiting for antes'}</p>
      </div>
      <div className="gameplay-bet-spots" aria-hidden="true"><span>ANTE</span><span>RAISE</span></div>
      {!!table?.own.ante && <p className="gameplay-ante">{format(table.own.ante)}</p>}
      {table?.own.action === 'raise' && <p className="gameplay-raise-chip">{format(table.own.ante * 2)}</p>}
      <div className="gameplay-open-seats" aria-label="Other players">
        {positions.slice(0, (table?.maxPlayers ?? 6) - 1).map((position, index) => {
          const seat = others[index];
          if (!seat) return null;
          return <section key={seat.id} className={`gameplay-open-seat shared-player-seat gameplay-open-seat-${position}`} aria-label={`${seat.name}, ${seat.status}`}><span className="gameplay-open-avatar" aria-hidden="true">{seat.bot ? '♟' : seat.name.slice(0, 1)}</span><span><strong>{seat.name}{seat.bot ? ' · Bot' : seat.isHost ? ' · Host' : ''}</strong><small title={`${format(seat.balance)} chips · ${seat.online ? seat.status : 'disconnected'}`}>{format(seat.balance)} chips · {seat.removalPending ? 'leaving after hand' : seat.online ? seat.status : 'disconnected'}</small>
            {seat.cardCount > 0 && <span className="shared-private-cards" role="img" aria-label={`${seat.name} has ${seat.cardCount} private cards`}>{Array.from({ length: seat.cardCount }, (_, card) => <i key={card} aria-hidden="true">♣</i>)}</span>}
            {seat.net !== null && seat.net !== undefined ? <small className="shared-player-result">Hand result · {net(seat.net)}</small> : (seat.ante > 0 || !seat.online) && <small>{!seat.online ? `${seat.status}${seat.ante ? ' · ' : ''}` : ''}{seat.ante > 0 ? `Ante ${format(seat.ante)}` : ''}</small>}
          </span></section>;
        })}
      </div>
      <div key={`player-${table?.roundId}`} className={`gameplay-player-hand${table?.phase === 'deciding' ? ' gameplay-dealing' : ''}`} aria-label="Your hand">
        {table?.own.cards.cards.map((card, index) => <PlayingCard key={card} {...faceCard(card)} index={index} />)}
        {table?.own.cards.rank && <p className="gameplay-hand-rank gameplay-player-rank">{handLabel('You', table.own.cards.rank, table.own.cards.cards)}</p>}
      </div>
      <section className="gameplay-seat" aria-label="Your seat"><span className="gameplay-identity"><span className="gameplay-player-name">{self?.name ?? 'You'}{self ? ` · ${self.status}` : ''}</span><strong className="gameplay-player-balance">{table ? format(table.balance) : '—'} <span>chips</span></strong><span className="game-sr-only">{table ? `${format(table.balance)} table chips` : 'Loading balance…'}</span></span></section>
      <p className={`gameplay-result${ownResult && ownResult.net > 0 ? ' gameplay-payout-win' : ''}`} role="status">{resultText}</p>
      {ownResult && <details key={table?.roundId} className="gameplay-breakdown" aria-label="Payout breakdown"><summary>Details</summary><dl><div><dt>Ante</dt><dd>{net(ownResult.anteNet)}</dd></div><div><dt>Raise</dt><dd>{table?.own.action === 'fold' ? 'Not placed' : ownResult.raiseNet === 0 ? 'Returned' : net(ownResult.raiseNet)}</dd></div><div className="gameplay-breakdown-total"><dt>Net change</dt><dd>{net(ownResult.net)}</dd></div></dl></details>}
      <div className="gameplay-bets" aria-label="Bet controls">
        {isBetting && <><div className="gameplay-ante-presets" role="group" aria-label="Quick ante">{[...new Set([table!.minBet, 5, 10, 25, 50].filter(value => value >= table!.minBet && value <= table!.maxBet))].sort((a, b) => a - b).map(value => <button key={value} aria-label={`Set ante to ${value} chips`} aria-pressed={ante === value} disabled={busy || value * 3 > table!.balance} onClick={() => setAnte(value)}>{format(value)}</button>)}</div><label>Ante <input aria-label="Ante chips" type="number" step="0.01" min={table!.minBet} max={table!.maxBet} value={ante ?? ''} onChange={event => setAnte(Number(event.target.value))} /></label><button disabled={busy || !connected || !ante || ante < table!.minBet || ante > table!.maxBet || Math.round(ante * 100) * 3 > Math.round(table!.balance * 100) || seconds === 0} onClick={() => void action(() => placeAnte(lobbyId, table!.roundId!, ante!))}>Place ante</button></>}
        {!!isDeciding && <><button disabled={busy || !connected || seconds === 0} onClick={() => void action(() => decide(lobbyId, table!.roundId!, 'fold'))}>Fold</button><button className="gameplay-raise" disabled={busy || !connected || seconds === 0} onClick={() => void action(() => decide(lobbyId, table!.roundId!, 'raise'))}>Raise · {format(table!.own.ante * 2)} chips</button></>}
        {!isBetting && !isDeciding && <span className="shared-waiting">{self?.status === 'waiting for next hand' || self?.inRound === false ? 'You’re seated—joining the next hand.' : table?.phase === 'completed' ? 'Next hand starts automatically' : 'Waiting for the table'}</span>}
      </div>
      <p className="gameplay-ante-help">{isBetting ? 'Keep 3× your ante available for the ante and raise. Antes lock when placed.' : 'The server controls the clock. Missed betting sits out; an unanswered decision folds automatically.'}</p>
    </div></div>
    <HandGuide currentRank={table?.own.cards.rank} open={guideOpen} onClose={closeGuide} expanded={guideExpanded} onToggleExpanded={() => setGuideExpanded(value => !value)} />
    {historyOpen && <aside className="shared-history" id="table-history" aria-label="Your hand history"><header><h2>Your hand history</h2><button aria-label="Close hand history" onClick={() => setHistoryOpen(false)}>×</button></header><p>Your last 20 saved hands at this table. Other players’ cards stay private.</p>{historyBusy && <p role="status">Loading hands…</p>}{historyError && <p role="alert">{historyError}</p>}{!historyBusy && !historyError && history.length === 0 && <p>No completed hands yet.</p>}<ol>{history.map(hand => <li key={hand.handId}><strong>Hand {hand.roundId} · {net(hand.net)}</strong><small>{hand.message}</small><span>Your cards: {hand.playerCards.join(' ')}</span><span>Dealer: {hand.dealerCards.join(' ')}</span><small>Ante {format(hand.ante)} · Raise {format(hand.raise)} · Returned {format(hand.returned)}</small></li>)}</ol></aside>}
  </main>;
}
