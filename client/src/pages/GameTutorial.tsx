import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PlayingCard, faceCard, handLabel } from './Gameplay';
import HandGuide from '../components/HandGuide';
import useTablePreferences from '../components/useTablePreferences';
import { saveTutorialProgress } from '../services/tutorialProgress';
import '../styles/Gameplay.css';
import '../styles/GameTutorial.css';

type Step = 'ante' | 'inspect' | 'decide' | 'result' | 'complete';
type Choice = 'raise' | 'fold';
const lessons = [
  { title: 'Your first hand', player: ['KS', 'KH', '9D', '6C', '2S'], dealer: ['QC', 'QD', 'AS', '8H', '4C'], playerRank: 'pair', dealerRank: 'pair', qualifies: true },
  { title: 'When the dealer does not qualify', player: ['KD', 'JH', '9S', '7C', '2D'], dealer: ['AD', 'QH', 'JS', '9C', '3D'], playerRank: 'high card', dealerRank: 'high card', qualifies: false },
];
const steps = ['Place an ante', 'Read the cards', 'Raise or fold', 'Review the result'];
const format = (value: number) => value.toLocaleString();
const signed = (value: number) => `${value > 0 ? '+' : ''}${format(value)} chips`;

export default function GameTutorial() {
  const location = useLocation();
  const lobbyId = typeof location.state?.lobbyId === 'string' && /^[1-9]\d*$/.test(location.state.lobbyId) ? location.state.lobbyId : null;
  const backTo = lobbyId ? `/lobbies/${lobbyId}` : '/lobbies';
  const [lessonIndex, setLessonIndex] = useState(0);
  const [step, setStep] = useState<Step>('ante');
  const [ante, setAnte] = useState(10);
  const [balance, setBalance] = useState(200);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [identified, setIdentified] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideExpanded, setGuideExpanded] = useState(false);
  const guideButton = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const feedbackMessage = useRef<HTMLParagraphElement>(null);
  const { preferences } = useTablePreferences();
  const lesson = lessons[lessonIndex];
  const dealt = step !== 'ante';
  const settled = step === 'result' || step === 'complete';
  const stepIndex = step === 'ante' ? 0 : step === 'inspect' ? 1 : step === 'decide' ? 2 : 3;
  const net = choice === 'fold' ? -ante : lesson.qualifies ? ante * 3 : ante;
  const anteNet = choice === 'fold' ? -ante : ante;
  const raiseNet = choice === 'fold' || !lesson.qualifies ? 0 : ante * 2;
  const returned = choice === 'fold' ? 0 : lesson.qualifies ? ante * 6 : ante * 4;
  useEffect(() => { heading.current?.focus(); setFeedback(''); }, [step, lessonIndex]);
  useEffect(() => { if (feedback) feedbackMessage.current?.focus(); }, [feedback]);

  function placeAnte() {
    if (step !== 'ante') return;
    setBalance(previous => previous - ante);
    setStep('inspect');
  }
  function inspect(card: string) {
    if (step !== 'inspect') return;
    if (lessonIndex === 0 && !card.startsWith('K')) {
      setFeedback('Look for matching ranks. Try selecting one of your two kings.');
      return;
    }
    setIdentified(true);
    setFeedback(lessonIndex === 0 ? 'Exactly—two kings make one pair. The other three cards are kickers, used if matching pairs tie.' : 'An ace is only one card. We cannot tell whether the dealer qualifies until all five cards are revealed.');
  }
  function decide(action: Choice) {
    if (step !== 'decide') return;
    setChoice(action);
    if (action === 'raise') setBalance(previous => previous - ante * 2 + (lesson.qualifies ? ante * 6 : ante * 4));
    setStep('result');
  }
  function nextLesson() {
    if (step !== 'result') return;
    setLessonIndex(1); setStep('ante'); setChoice(null); setIdentified(false);
  }
  function restart() {
    setLessonIndex(0); setStep('ante'); setBalance(200); setAnte(10); setChoice(null); setIdentified(false); setFeedback('');
  }
  const title = step === 'complete' ? 'You’re ready for the table' : steps[stepIndex];
  return <main className={`tutorial-page${preferences.reducedMotion ? ' gameplay-reduced-motion' : ''}${preferences.fastDeal ? ' gameplay-fast-deal' : ''}`}>
    <header className="tutorial-header"><Link to={backTo} onClick={() => saveTutorialProgress('dismissed')}>← {lobbyId ? 'Back to lobby' : 'Back to tables'}</Link><span className="tutorial-brand">Reef Royale</span><button ref={guideButton} type="button" aria-expanded={guideOpen} aria-controls="hand-guide" onClick={() => setGuideOpen(value => !value)}>Rules &amp; hands</button></header>
    <div className="tutorial-intro"><div><p className="tutorial-eyebrow">PLAY-ALONG TUTORIAL · NO TIMER</p><h1>Learn Caribbean Stud</h1><p>Two scripted hands. You make the moves. Only tutorial chips are used.</p></div><span className="tutorial-balance" aria-label="Tutorial balance"><strong>{format(balance)}</strong> tutorial chips</span></div>
    <div className="tutorial-layout">
      <section className="tutorial-table" aria-label="Tutorial table">
        <div className={`tutorial-hand${step === 'inspect' && lessonIndex === 1 ? ' tutorial-focus' : ''}`} aria-label="Dealer hand">
          <p>{settled ? handLabel('Dealer', lesson.dealerRank, lesson.dealer) : 'Dealer · one card visible after the deal'}</p>
          <div className="tutorial-cards">
            {dealt ? lesson.dealer.slice(0, settled ? 5 : 1).map((card, index) => step === 'inspect' && lessonIndex === 1
              ? <button type="button" className="tutorial-card-button" aria-label={`Inspect dealer ${faceCard(card).name}`} key={card} onClick={() => inspect(card)}><PlayingCard {...faceCard(card)} /></button>
              : <PlayingCard key={card} {...faceCard(card)} index={index} reveal={settled && index > 0} />) : <span className="tutorial-card-placeholder">Dealer’s hand</span>}
            {dealt && !settled && Array.from({ length: 4 }, (_, index) => <div className="gameplay-card gameplay-card-back" key={index} role="img" aria-label="Hidden dealer card"><span className="gameplay-card-pattern">♣</span></div>)}
          </div>
        </div>
        <div className="tutorial-bet-spots" aria-label="Bets placed"><span>ANTE<strong>{dealt ? ante : '—'}</strong></span><span>RAISE<strong>{choice === 'raise' ? ante * 2 : '—'}</strong></span></div>
        <div className={`tutorial-hand${step === 'inspect' && lessonIndex === 0 ? ' tutorial-focus' : ''}`} aria-label="Your hand">
          <p>{dealt ? handLabel('You', lesson.playerRank, lesson.player) : 'Your cards arrive after you place an ante'}</p>
          <div className="tutorial-cards">{dealt ? lesson.player.map(card => step === 'inspect' && lessonIndex === 0
            ? <button type="button" className={`tutorial-card-button${identified && card.startsWith('K') ? ' tutorial-card-found' : ''}`} key={card} aria-label={`Select ${faceCard(card).name}`} onClick={() => inspect(card)}><PlayingCard {...faceCard(card)} /></button>
            : <PlayingCard key={card} {...faceCard(card)} />) : <span className="tutorial-card-placeholder">Place your ante to deal</span>}</div>
        </div>
        <p className="tutorial-table-note">Practice only · Your account and live table balances are unchanged.</p>
      </section>
      <section className="tutorial-coach" aria-labelledby="tutorial-step-title">
        <p className="tutorial-eyebrow">{step === 'complete' ? 'TUTORIAL COMPLETE' : `HAND ${lessonIndex + 1} OF 2 · ${lesson.title}`}</p>
        <ol className="tutorial-progress" aria-label="Tutorial steps">{steps.map((label, index) => <li key={label} aria-current={step !== 'complete' && index === stepIndex ? 'step' : undefined} className={index <= stepIndex ? 'is-active' : ''}><span>{index + 1}</span><span className="tutorial-sr">{label}</span></li>)}</ol>
        <h2 id="tutorial-step-title" tabIndex={-1} ref={heading}>{title}</h2>
        {step === 'ante' && <>
          <p>An ante is your opening bet. Choose an amount, then place it to receive your cards.</p>
          <p>You need <strong>3× your ante</strong> available: the ante now, plus a possible raise of twice that amount.</p>
          <div className="tutorial-ante-options" role="group" aria-label="Choose tutorial ante">{[5, 10, 25].map(value => <button type="button" key={value} aria-pressed={ante === value} onClick={() => setAnte(value)}>{value}</button>)}</div>
          <p className="tutorial-cost">Ante {ante} + possible raise {ante * 2} = {ante * 3} tutorial chips.</p>
          <button className="tutorial-primary" type="button" onClick={placeAnte}>Place ante · {ante} chips</button>
        </>}
        {step === 'inspect' && <>
          <p>{lessonIndex === 0 ? 'You have two kings. Select either king in your hand to identify the pair.' : 'Select the dealer’s visible ace. Four dealer cards are still hidden.'}</p>
          {feedback && <p className="tutorial-feedback" role="status" tabIndex={-1} ref={feedbackMessage}>{feedback}</p>}
          <button className="tutorial-primary" type="button" disabled={!identified} onClick={() => setStep('decide')}>Compare my options</button>
        </>}
        {step === 'decide' && <>
          <p><strong>Raise {ante * 2} chips</strong> to challenge the dealer. This is added to your {ante}-chip ante.</p>
          <p><strong>Fold</strong> to give up the hand and lose only your {ante}-chip ante.</p>
          <p>Try either option. These hands are scripted for learning, not a strategy guarantee.</p>
          <div className="tutorial-decisions"><button type="button" onClick={() => decide('fold')}>Fold</button><button className="tutorial-primary" type="button" onClick={() => decide('raise')}>Raise · {ante * 2} chips</button></div>
        </>}
        {step === 'result' && <>
          <p className="tutorial-result">{choice === 'fold' ? 'You folded' : lesson.qualifies ? 'You win' : 'Dealer doesn’t qualify'} · {signed(net)}</p>
          <p>{lesson.qualifies ? 'The dealer’s pair of queens qualifies. Your pair of kings is higher. A winning ante pays 1:1, and a winning pair pays 1:1 on the raise.' : 'The dealer has ace-high, but no king and no pair. The dealer needs ace-king or better to qualify—even though this ace-high hand beats your king-high hand.'}</p>
          {choice === 'fold' ? <p>You gave up your ante. {lesson.qualifies ? 'If you had raised in this example, your pair would have won.' : 'If you had raised in this example, your ante would have won and your raise would have been returned.'} You can restart to try the other choice.</p> : !lesson.qualifies && <p>Your ante wins {ante} chips; your {ante * 2}-chip raise is returned without a profit.</p>}
          <dl className="tutorial-payout" aria-label="Tutorial payout breakdown"><div><dt>Ante profit/loss</dt><dd>{signed(anteNet)}</dd></div><div><dt>Raise profit/loss</dt><dd>{choice === 'fold' ? 'Not placed' : signed(raiseNet)}</dd></div><div><dt>Chips returned, including stake</dt><dd>{returned}</dd></div><div><dt>Net change</dt><dd>{signed(net)}</dd></div></dl>
          {lessonIndex === 0 ? <button className="tutorial-primary" type="button" onClick={nextLesson}>Try dealer qualification →</button> : <button className="tutorial-primary" type="button" onClick={() => { saveTutorialProgress('completed'); setStep('complete'); }}>Finish tutorial</button>}
        </>}
        {step === 'complete' && <>
          <p>You’ve placed an ante, read the cards, chosen raise or fold, and seen how dealer qualification changes a payout.</p>
          <p>In live play, the table has shared timers and missed decisions fold automatically. Matching hands push: both bets are returned.</p>
          <Link className="tutorial-primary" to={backTo}>{lobbyId ? 'Return to lobby' : 'Explore the tables'} →</Link>
        </>}
        <div className="tutorial-secondary"><button type="button" onClick={restart}>Restart tutorial</button>{step !== 'complete' && <Link to={backTo} onClick={() => saveTutorialProgress('dismissed')}>Skip tutorial</Link>}</div>
      </section>
    </div>
    <HandGuide open={guideOpen} currentRank={dealt ? lesson.playerRank : null} onClose={() => { setGuideOpen(false); setGuideExpanded(false); guideButton.current?.focus(); }} expanded={guideExpanded} onToggleExpanded={() => setGuideExpanded(value => !value)} />
  </main>;
}
