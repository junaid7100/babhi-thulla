// Lightweight synthesized sound effects (Web Audio API) — no binary assets to
// fetch, works offline, and respects browser autoplay restrictions (a tone
// only ever plays in response to a user gesture or a server event received
// after the audio context has been unlocked by an earlier gesture).

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, durationMs: number, type: OscillatorType = "sine", gainValue = 0.05, delayMs = 0): void {
  const audio = getContext();
  if (!audio) return;
  const startAt = audio.currentTime + delayMs / 1000;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(gainValue, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + durationMs / 1000);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(startAt);
  osc.stop(startAt + durationMs / 1000 + 0.02);
}

export const sfx = {
  cardPlay: () => tone(420, 90, "triangle", 0.06),
  yourTurn: () => tone(660, 140, "sine", 0.05),
  thulla: () => {
    tone(220, 160, "sawtooth", 0.07);
    tone(180, 220, "sawtooth", 0.06, 120);
  },
  escape: () => {
    tone(520, 100, "sine", 0.05);
    tone(780, 160, "sine", 0.05, 90);
  },
  gameOver: () => {
    tone(440, 160, "sine", 0.05);
    tone(550, 160, "sine", 0.05, 140);
    tone(660, 240, "sine", 0.05, 280);
  },
};

export type SoundName = keyof typeof sfx;

export function playSound(name: SoundName, enabled: boolean): void {
  if (!enabled) return;
  try {
    sfx[name]();
  } catch {
    /* audio not available — never block gameplay on sound */
  }
}
