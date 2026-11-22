const KEY = 'reefroyale.tutorial.v1';
export function tutorialProgress(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
export function saveTutorialProgress(value: 'completed' | 'dismissed') {
  try {
    if (value === 'dismissed' && tutorialProgress() === 'completed') return;
    localStorage.setItem(KEY, value);
  } catch { /* The tutorial still works without browser storage. */ }
}
