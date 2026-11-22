import { useState } from 'react';
import { Link } from 'react-router-dom';
import { saveTutorialProgress, tutorialProgress } from '../services/tutorialProgress';

export default function TutorialInvite() {
  const [visible, setVisible] = useState(() => !tutorialProgress());
  if (!visible) return null;
  return <aside className="tutorial-invite" aria-label="Learn to play">
    <div><strong>New to Caribbean Stud?</strong><p>Play two guided hands at your own pace. Your table chips stay untouched.</p></div>
    <Link to="/tutorial">Try the tutorial →</Link>
    <button type="button" aria-label="Dismiss tutorial suggestion" onClick={() => { saveTutorialProgress('dismissed'); setVisible(false); }}>×</button>
  </aside>;
}
