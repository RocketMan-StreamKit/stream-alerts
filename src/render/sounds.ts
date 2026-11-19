/**
 * Built-in alert sounds synthesized with Web Audio (no audio files shipped) and
 * playback of URL sounds.
 */

/** Shared audio context (created lazily). */
let ctx: AudioContext | null = null;

/**
 * Returns the shared audio context, resuming it when suspended.
 * @returns Audio context.
 * @example const ac = audio();
 */
const audio = () => {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  return ctx;
};

/**
 * Plays one enveloped oscillator note.
 * @param out Destination node.
 * @param type Oscillator wave.
 * @param freq Start frequency, Hz.
 * @param at Start time offset, s.
 * @param dur Note length, s.
 * @param gain Peak gain.
 * @param endFreq Optional end frequency for a sweep.
 * @example tone(out, 'sine', 880, 0, 0.4, 0.5);
 */
const tone = (
  out: AudioNode,
  type: OscillatorType,
  freq: number,
  at: number,
  dur: number,
  gain: number,
  endFreq?: number
) => {
  const ac = audio();
  const t0 = ac.currentTime + at;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(out);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
};

/**
 * Plays a filtered noise burst.
 * @param out Destination node.
 * @param at Start offset, s.
 * @param dur Length, s.
 * @param gain Peak gain.
 * @param from Band-pass start frequency, Hz.
 * @param to Band-pass end frequency, Hz.
 * @example noise(out, 0, 0.5, 0.4, 300, 3000);
 */
const noise = (
  out: AudioNode,
  at: number,
  dur: number,
  gain: number,
  from: number,
  to: number
) => {
  const ac = audio();
  const t0 = ac.currentTime + at;
  const buffer = ac.createBuffer(
    1,
    Math.ceil(ac.sampleRate * dur),
    ac.sampleRate
  );
  const ch = buffer.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(from, t0);
  filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(out);
  src.start(t0);
};

/** Note frequencies used by the presets. */
const N = {
  C5: 523.25,
  E5: 659.25,
  G5: 783.99,
  A5: 880,
  B5: 987.77,
  C6: 1046.5,
  E6: 1318.51,
  G6: 1567.98,
};

/**
 * Sound presets: each schedules notes on `out`.
 * @example PRESETS.coin(out);
 */
const PRESETS: Record<string, (out: AudioNode) => void> = {
  chime: out => {
    tone(out, 'sine', N.A5, 0, 0.9, 0.5);
    tone(out, 'sine', N.E6, 0.12, 1.1, 0.4);
  },
  coin: out => {
    tone(out, 'square', N.B5, 0, 0.09, 0.25);
    tone(out, 'square', N.E6, 0.08, 0.5, 0.25);
  },
  fanfare: out => {
    [N.C5, N.E5, N.G5].forEach((f, i) =>
      tone(out, 'triangle', f, i * 0.13, 0.2, 0.45)
    );
    tone(out, 'triangle', N.C6, 0.39, 0.9, 0.5);
    tone(out, 'triangle', N.G5, 0.39, 0.9, 0.25);
  },
  levelup: out => {
    [N.C5, N.E5, N.G5, N.C6, N.E6, N.G6].forEach((f, i) =>
      tone(out, 'square', f, i * 0.07, 0.16, 0.18)
    );
    tone(out, 'square', N.C6 * 2, 0.42, 0.5, 0.15);
  },
  bell: out => {
    tone(out, 'sine', 660, 0, 2.2, 0.5);
    tone(out, 'sine', 1320, 0, 1.4, 0.2);
    tone(out, 'sine', 1980, 0, 0.8, 0.1);
  },
  pop: out => {
    tone(out, 'sine', 300, 0, 0.14, 0.7, 900);
  },
  sparkle: out => {
    for (let i = 0; i < 10; i++)
      tone(out, 'sine', 1500 + Math.random() * 2500, i * 0.06, 0.25, 0.15);
  },
  whoosh: out => {
    noise(out, 0, 0.7, 0.6, 200, 4000);
  },
  drumroll: out => {
    let t = 0;
    for (let i = 0; i < 18; i++) {
      noise(out, t, 0.08, 0.35, 900, 700);
      t += Math.max(0.035, 0.11 - i * 0.005);
    }
    noise(out, t, 1.1, 0.7, 4000, 2500);
    tone(out, 'sine', 80, t, 0.4, 0.8, 45);
  },
};

/**
 * Plays an alert sound.
 * @param src `builtin:{id}` or a URL (empty = silence).
 * @param volume 0..1.
 * @returns Stop function.
 * @example const stop = playSound('builtin:coin', 0.7);
 */
export const playSound = (src: string, volume: number): (() => void) => {
  if (!src || volume <= 0) return () => undefined;
  if (src.startsWith('builtin:')) {
    const preset = PRESETS[src.slice(8)];
    if (!preset) return () => undefined;
    try {
      const ac = audio();
      const out = ac.createGain();
      out.gain.value = Math.min(1, volume);
      out.connect(ac.destination);
      preset(out);
      return () => {
        try {
          out.disconnect();
        } catch {
          // already disconnected
        }
      };
    } catch {
      return () => undefined;
    }
  }
  const el = new Audio(src);
  el.volume = Math.min(1, volume);
  void el.play().catch(() => undefined);
  return () => {
    el.pause();
    el.src = '';
  };
};
