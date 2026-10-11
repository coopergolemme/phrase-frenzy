// Zero-dependency audio synth and haptic feedback utility using Web Audio API

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

const MUTED_STORAGE_KEY = "phrase-frenzy:sound-muted";

let muted = readMuted();

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function isSoundMuted(): boolean {
  return muted;
}

export function setSoundMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTED_STORAGE_KEY, String(value));
  } catch {
    // Persisting is best-effort (private browsing, quota, etc.)
  }
}

/**
 * Creates/resumes the shared AudioContext. Call from a user gesture (e.g.
 * the tap that starts a turn) so iOS Safari lets later, non-gesture sounds
 * like the countdown ticks play.
 */
export function unlockAudio(): void {
  try {
    getAudioContext();
  } catch {
    // Ignore — sounds just won't play
  }
}

/** Schedules one enveloped oscillator note; `delay` is seconds from now. */
function playTone(
  frequency: number,
  duration: number,
  { type = "sine", volume = 0.25, delay = 0, endFrequency }: {
    type?: OscillatorType;
    volume?: number;
    delay?: number;
    endFrequency?: number;
  } = {}
): void {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (endFrequency) {
      osc.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    }

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.0001, start);
    gainNode.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  } catch (err) {
    console.warn("Audio Context playback failed", err);
  }
}

/** Bright rising two-note chime for a correct guess. */
export function playCorrectSound(): void {
  playTone(880, 0.12, { type: "triangle", volume: 0.3 });
  playTone(1320, 0.18, { type: "triangle", volume: 0.3, delay: 0.09 });
}

/** Short downward blip for a pass. */
export function playPassSound(): void {
  playTone(420, 0.18, { type: "square", volume: 0.12, endFrequency: 260 });
}

/** Countdown tick for the final seconds; `urgent` raises the pitch. */
export function playTickSound(urgent = false): void {
  playTone(urgent ? 1400 : 1000, 0.05, { type: "square", volume: urgent ? 0.14 : 0.09 });
}

/** Ascending three-note fanfare when a turn starts. */
export function playTurnStartSound(): void {
  playTone(523, 0.12, { type: "triangle", volume: 0.25 });
  playTone(659, 0.12, { type: "triangle", volume: 0.25, delay: 0.1 });
  playTone(784, 0.22, { type: "triangle", volume: 0.25, delay: 0.2 });
}

/**
 * Plays a retro game show buzzer sound effect using Web Audio API square/sawtooth oscillators.
 */
export function playBuzzerSound(): void {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.35; // seconds

    // Primary oscillator: low harsh tone
    const osc1 = ctx.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(140, now);
    osc1.frequency.exponentialRampToValueAtTime(110, now + duration);

    // Sub oscillator for discordance
    const osc2 = ctx.createOscillator();
    osc2.type = "square";
    osc2.frequency.setValueAtTime(185, now);
    osc2.frequency.exponentialRampToValueAtTime(145, now + duration);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  } catch (err) {
    console.warn("Audio Context playback failed", err);
  }
}

/**
 * Triggers device vibration pattern if supported.
 */
export function triggerHaptic(pattern: number | number[] = [150, 50, 150]): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore haptic errors on unsupported devices
  }
}
