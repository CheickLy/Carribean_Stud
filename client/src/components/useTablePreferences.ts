import { useEffect, useRef, useState } from "react";

type Preferences = { sound: boolean; reducedMotion: boolean; fastDeal: boolean };
const KEY = "reefroyale.tablePreferences";

export default function useTablePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(() => {
    const defaults = { sound: false, reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false, fastDeal: false };
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, typeof saved?.[key] === "boolean" ? saved[key] : value])) as Preferences;
    } catch { return defaults; }
  });
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(preferences)); } catch { /* Preferences still work when storage is unavailable. */ }
  }, [preferences]);
  useEffect(() => () => { void audio.current?.close().catch(() => {}); }, []);
  function prepareSound() {
    if (!preferences.sound || !window.AudioContext) return;
    try {
      audio.current ??= new AudioContext();
      void audio.current.resume().catch(() => {});
    } catch { /* Audio support must never prevent a game action. */ }
  }
  function playSound(kind: "deal" | "win" | "settle") {
    const context = audio.current;
    if (!preferences.sound || !context || context.state !== "running") return;
    try {
      const tone = context.createOscillator();
      const volume = context.createGain();
      tone.type = "sine";
      tone.frequency.setValueAtTime(kind === "win" ? 660 : kind === "deal" ? 440 : 220, context.currentTime);
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
