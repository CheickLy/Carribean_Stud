import { useEffect, useRef, useState } from "react";

export type TableTheme = 'light' | 'dark';
type Preferences = { sound: boolean; reducedMotion: boolean; fastDeal: boolean; theme: TableTheme };
const KEY = "reefroyale.tablePreferences";

export default function useTablePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(() => {
    const defaults: Preferences = { sound: false, reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false, fastDeal: false, theme: 'light' };
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      return {
        sound: typeof saved?.sound === 'boolean' ? saved.sound : defaults.sound,
        reducedMotion: typeof saved?.reducedMotion === 'boolean' ? saved.reducedMotion : defaults.reducedMotion,
        fastDeal: typeof saved?.fastDeal === 'boolean' ? saved.fastDeal : defaults.fastDeal,
        theme: saved?.theme === 'dark' ? 'dark' : 'light',
      };
    } catch { return defaults; }
  });
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(preferences)); } catch { /* Preferences still work when storage is unavailable. */ }
  }, [preferences]);
  useEffect(() => () => { void audio.current?.close().catch(() => {}); }, []);
  function prepareSound(enabling = false) {
    if ((!preferences.sound && !enabling) || !window.AudioContext) return;
    try {
      audio.current ??= new AudioContext();
      void audio.current.resume().catch(() => {});
    } catch { /* Audio support must never prevent a game action. */ }
  }
  function playSound(kind: "deal" | "win" | "settle" | "turn") {
    const context = audio.current;
    if (!preferences.sound || !context || context.state !== "running") return;
    try {
      const tone = context.createOscillator();
      const volume = context.createGain();
      tone.type = "sine";
      tone.frequency.setValueAtTime(kind === "turn" ? 550 : kind === "win" ? 660 : kind === "deal" ? 440 : 220, context.currentTime);
      volume.gain.setValueAtTime(0.035, context.currentTime);
      volume.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.15);
      tone.connect(volume).connect(context.destination);
      tone.start();
      tone.stop(context.currentTime + 0.16);
      tone.onended = () => { tone.disconnect(); volume.disconnect(); };
    } catch { /* Continue silently if audio becomes unavailable. */ }
  }
  return { preferences, setPreferences, prepareSound, playSound };
}
