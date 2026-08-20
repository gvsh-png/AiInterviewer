import type { InterviewerId } from "@/lib/interviewers";
import type { NightMood } from "@/lib/storySeed";
import { MOOD_RECIPES, type ScoreMood } from "@/lib/scoreMood";

type Wave = OscillatorType;

type Patch = {
  freqs: number[];
  noise: number;
  filter: number;
  lfo: number;
  volume: number;
  wave?: Wave;
};

const NIGHT_PATCHES: Record<NightMood, Patch> = {
  watched: {
    freqs: [55, 82.4, 110],
    noise: 0.03,
    filter: 420,
    lfo: 0.07,
    volume: 0.09,
  },
  paper: {
    freqs: [49, 73.4, 98],
    noise: 0.06,
    filter: 880,
    lfo: 0.11,
    volume: 0.085,
  },
  glass: {
    freqs: [61.7, 123.4],
    noise: 0.045,
    filter: 1200,
    lfo: 0.09,
    volume: 0.08,
  },
  storm: {
    freqs: [36.7, 73.4],
    noise: 0.09,
    filter: 320,
    lfo: 0.05,
    volume: 0.095,
  },
  empty: {
    freqs: [41.2, 82.4],
    noise: 0.02,
    filter: 260,
    lfo: 0.04,
    volume: 0.075,
  },
  overtime: {
    freqs: [46.2, 92.5, 138.6],
    noise: 0.035,
    filter: 540,
    lfo: 0.08,
    volume: 0.08,
  },
};

export const PERSON_PATCHES: Record<InterviewerId, Patch> = {
  derek: {
    freqs: [49, 61.74, 98],
    noise: 0.06,
    filter: 340,
    lfo: 0.048,
    volume: 0.1,
    wave: "triangle",
  },
  marlene: {
    freqs: [65.41, 98, 130.81],
    noise: 0.032,
    filter: 760,
    lfo: 0.11,
    volume: 0.092,
    wave: "sine",
  },
  voss: {
    freqs: [38.89, 77.78, 103.83],
    noise: 0.08,
    filter: 280,
    lfo: 0.035,
    volume: 0.11,
    wave: "sawtooth",
  },
  celeste: {
    freqs: [52, 78, 156],
    noise: 0.026,
    filter: 920,
    lfo: 0.08,
    volume: 0.088,
    wave: "sine",
  },
  griffin: {
    freqs: [58.27, 87.31, 116.54],
    noise: 0.034,
    filter: 640,
    lfo: 0.09,
    volume: 0.096,
    wave: "triangle",
  },
  pike: {
    freqs: [43.65, 87.31],
    noise: 0.022,
    filter: 410,
    lfo: 0.03,
    volume: 0.086,
    wave: "sine",
  },
  june: {
    freqs: [69.3, 103.83, 138.59],
    noise: 0.045,
    filter: 1100,
    lfo: 0.14,
    volume: 0.09,
    wave: "triangle",
  },
  romanov: {
    freqs: [36.71, 55, 73.42],
    noise: 0.058,
    filter: 300,
    lfo: 0.045,
    volume: 0.105,
    wave: "sawtooth",
  },
  ashley: {
    freqs: [73.42, 110, 146.83],
    noise: 0.038,
    filter: 980,
    lfo: 0.12,
    volume: 0.09,
    wave: "sine",
  },
  hector: {
    freqs: [41.2, 82.41, 123.47],
    noise: 0.068,
    filter: 360,
    lfo: 0.05,
    volume: 0.098,
    wave: "triangle",
  },
  vera: {
    freqs: [48.99, 97.99],
    noise: 0.03,
    filter: 520,
    lfo: 0.06,
    volume: 0.088,
    wave: "sine",
  },
  knox: {
    freqs: [55, 82.41, 164.81],
    noise: 0.055,
    filter: 470,
    lfo: 0.1,
    volume: 0.1,
    wave: "triangle",
  },
};

type Handle = {
  ctx: AudioContext;
  master: GainNode;
  nodes: AudioNode[];
  melody: OscillatorNode | null;
  stepTimer: number | null;
  baseFreq: number;
};

let handle: Handle | null = null;
let muted = false;
let currentKey = "";
let currentVolume = 0.1;
let pendingPerson: InterviewerId | null = null;
let beatTimer: number | null = null;
let beatBpm = 72;
let fxCtx: AudioContext | null = null;
let ringNodes: AudioNode[] = [];

export function musicMuted() {
  return muted;
}

export function setMusicMuted(next: boolean) {
  muted = next;
  if (handle) {
    handle.master.gain.setTargetAtTime(
      next ? 0 : currentVolume,
      handle.ctx.currentTime,
      0.08
    );
  }
  if (next && beatTimer) {
    window.clearInterval(beatTimer);
    beatTimer = null;
  } else if (!next && handle) {
    setScoreBpm(beatBpm);
  }
}

export function startNightScore(mood: NightMood) {
  pendingPerson = null;
  const scoreMood =
    mood === "paper" ? "tense" : mood === "empty" || mood === "overtime" ? "late" : "horror";
  return startScore(`night:${mood}`, NIGHT_PATCHES[mood], scoreMood);
}

export function startPersonScore(id: InterviewerId, mood?: ScoreMood) {
  pendingPerson = id;
  const patch = PERSON_PATCHES[id];
  const key = mood ? `person:${id}:${mood}` : `person:${id}`;
  return startScore(key, patch, mood);
}

export async function unlockScore() {
  if (typeof window === "undefined") return;
  if (fxCtx?.state === "suspended") {
    try {
      await fxCtx.resume();
    } catch {
      /* hits still try later */
    }
  }
  if (!handle) {
    if (pendingPerson) await startPersonScore(pendingPerson);
    return;
  }
  if (handle.ctx.state === "suspended") {
    try {
      await handle.ctx.resume();
    } catch {
      return;
    }
  }
  if (!muted) {
    handle.master.gain.setTargetAtTime(
      currentVolume,
      handle.ctx.currentTime,
      0.08
    );
  }
}

export function setScoreBpm(bpm: number) {
  beatBpm = Math.max(52, Math.min(168, Math.round(bpm)));
  if (beatTimer) {
    window.clearInterval(beatTimer);
    beatTimer = null;
  }
  if (!handle || muted) return;
  pulseHeart();
  beatTimer = window.setInterval(() => pulseHeart(), Math.round(60000 / beatBpm));
}

function pulseHeart() {
  if (!handle || muted) return;
  const ctx = handle.ctx;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 88 + beatBpm * 0.12;
  gain.gain.value = 0.0001;
  osc.connect(gain);
  gain.connect(handle.master);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.09, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  osc.start(t);
  osc.stop(t + 0.12);
}

export function playShockSting() {
  if (!handle || muted) return;
  const ctx = handle.ctx;
  const t = ctx.currentTime;
  for (const freq of [110, 146.8, 185, 233]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(handle.master);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    osc.start(t);
    osc.stop(t + 0.75);
  }
}

export function duckNightScore(on: boolean) {
  if (!handle || muted) return;
  handle.master.gain.setTargetAtTime(
    on ? currentVolume * 0.1 : currentVolume,
    handle.ctx.currentTime,
    0.16
  );
}

export function stopDeskRing() {
  for (const node of ringNodes) {
    try {
      if ("stop" in node && typeof (node as OscillatorNode).stop === "function") {
        (node as OscillatorNode).stop();
      }
      node.disconnect();
    } catch {
      /* already closed */
    }
  }
  ringNodes = [];
}

export function playDeskRing() {
  stopDeskRing();
  void (async () => {
    if (muted) return;
    const ctx = await getFxCtx();
    if (!ctx) return;
    const master = ctx.createGain();
    master.gain.value = 0.11;
    master.connect(ctx.destination);
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = "sine";
    o2.type = "sine";
    o1.frequency.value = 440;
    o2.frequency.value = 480;
    const gate = ctx.createGain();
    gate.gain.value = 0;
    o1.connect(gate);
    o2.connect(gate);
    gate.connect(master);
    o1.start();
    o2.start();
    const now = ctx.currentTime;
    for (let i = 0; i < 36; i += 1) {
      const t = now + i * 0.72;
      gate.gain.setValueAtTime(0.0001, t);
      gate.gain.exponentialRampToValueAtTime(1, t + 0.018);
      gate.gain.setValueAtTime(1, t + 0.4);
      gate.gain.exponentialRampToValueAtTime(0.0001, t + 0.46);
    }
    ringNodes = [o1, o2, gate, master];
  })();
}

export function playCallAnswer() {
  void (async () => {
    if (muted) return;
    const ctx = await getFxCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    blip(ctx, 180, "square", t, 0.04, 0.06);
    blip(ctx, 720, "sine", t + 0.05, 0.12, 0.05);
  })();
}

export function playPaperDump() {
  void (async () => {
    if (muted) return;
    const ctx = await getFxCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1800;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    noise.start(t);
    noise.stop(t + 0.35);
    blip(ctx, 90, "triangle", t, 0.18, 0.1);
    blip(ctx, 140, "square", t + 0.04, 0.08, 0.05);
  })();
}

type FxKind = "work" | "probe" | "soften" | "combo" | "stamp" | "alert" | "send";

function audioCtor() {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext ||
    null
  );
}

async function getFxCtx() {
  const Ctor = audioCtor();
  if (!Ctor) return null;
  if (!fxCtx) fxCtx = new Ctor();
  if (fxCtx.state === "suspended") {
    try {
      await fxCtx.resume();
    } catch {
      return null;
    }
  }
  return fxCtx;
}

function blip(
  ctx: AudioContext,
  freq: number,
  type: OscillatorType,
  when: number,
  dur: number,
  vol: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = type;
  osc.frequency.value = freq;
  filter.type = "lowpass";
  filter.frequency.value = Math.max(900, freq * 6);
  gain.gain.value = 0.0001;
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(vol, when + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

export function playHitTone(kind: FxKind, combo = 1) {
  void (async () => {
    if (muted) return;
    const ctx = await getFxCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const heat = 1 + Math.min(3, combo) * 0.12;
    if (kind === "send") {
      blip(ctx, 620, "square", t, 0.05, 0.05);
      blip(ctx, 1240, "square", t + 0.04, 0.06, 0.04);
      return;
    }
    if (kind === "work") {
      blip(ctx, 196, "triangle", t, 0.09, 0.08 * heat);
      blip(ctx, 392, "triangle", t + 0.07, 0.11, 0.07 * heat);
      return;
    }
    if (kind === "probe") {
      blip(ctx, 880, "square", t, 0.08, 0.07 * heat);
      blip(ctx, 1320, "sine", t + 0.06, 0.16, 0.06 * heat);
      return;
    }
    if (kind === "soften") {
      blip(ctx, 220, "sine", t, 0.18, 0.07 * heat);
      blip(ctx, 277, "sine", t + 0.04, 0.2, 0.05 * heat);
      return;
    }
    if (kind === "combo") {
      blip(ctx, 392, "square", t, 0.07, 0.07 * heat);
      blip(ctx, 494, "square", t + 0.07, 0.07, 0.07 * heat);
      blip(ctx, 587, "square", t + 0.14, 0.12, 0.08 * heat);
      return;
    }
    if (kind === "alert") {
      blip(ctx, 148, "sawtooth", t, 0.16, 0.09);
      blip(ctx, 185, "sawtooth", t + 0.08, 0.2, 0.08);
      return;
    }
    blip(ctx, 90, "sawtooth", t, 0.18, 0.12);
    blip(ctx, 180, "triangle", t + 0.05, 0.22, 0.08);
    blip(ctx, 540, "square", t + 0.12, 0.1, 0.05);
  })();
}

async function startScore(key: string, patch: Patch, mood?: ScoreMood) {
  if (typeof window === "undefined") return;
  if (currentKey === key && handle) {
    if (!muted) {
      handle.master.gain.setTargetAtTime(
        patch.volume,
        handle.ctx.currentTime,
        0.2
      );
    }
    currentVolume = patch.volume;
    return;
  }
  stopNightScore();
  const AudioCtx =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  const nodes: AudioNode[] = [master];
  const recipe = mood ? MOOD_RECIPES[mood] : null;
  const wave = recipe?.wave || patch.wave || "sine";
  const filterHz = recipe?.filter || patch.filter;

  for (const freq of patch.freqs) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = wave;
    osc.frequency.value = freq;
    filter.type = "lowpass";
    filter.frequency.value = filterHz;
    gain.gain.value = 0.24 / patch.freqs.length;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = patch.lfo;
    lfoGain.gain.value = freq * 0.012;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start();
    lfo.start();
    nodes.push(osc, gain, filter, lfo, lfoGain);
  }

  const bufferSize = 2 * ctx.sampleRate;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.value = filterHz * 0.7;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = recipe?.noise ?? patch.noise;
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(master);
  noise.start();
  nodes.push(noise, noiseFilter, noiseGain);

  const baseFreq = patch.freqs[0] || 55;
  let melody: OscillatorNode | null = null;
  let stepTimer: number | null = null;
  if (recipe) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = recipe.wave;
    osc.frequency.value = baseFreq * 2;
    filter.type = "lowpass";
    filter.frequency.value = recipe.filter;
    gain.gain.value = recipe.melodyVol;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start();
    nodes.push(osc, gain, filter);
    melody = osc;
    let step = 0;
    stepTimer = window.setInterval(() => {
      if (!handle || handle.melody !== osc) return;
      step = (step + 1) % recipe.steps.length;
      const freq = baseFreq * 2 * Math.pow(2, recipe.steps[step]! / 12);
      try {
        osc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.04);
      } catch {
        /* closed */
      }
    }, recipe.stepMs);

    const pulse = ctx.createOscillator();
    const pulseGain = ctx.createGain();
    pulse.type = mood === "upbeat" ? "square" : "sine";
    pulse.frequency.value = 980;
    pulseGain.gain.value = 0;
    pulse.connect(pulseGain);
    pulseGain.connect(master);
    pulse.start();
    nodes.push(pulse, pulseGain);
    const pulseLfo = ctx.createOscillator();
    const pulseDepth = ctx.createGain();
    pulseLfo.frequency.value = recipe.pulseHz;
    pulseDepth.gain.value = mood === "upbeat" ? 0.035 : 0.02;
    pulseLfo.connect(pulseDepth);
    pulseDepth.connect(pulseGain.gain);
    pulseLfo.start();
    nodes.push(pulseLfo, pulseDepth);
  }

  handle = { ctx, master, nodes, melody, stepTimer, baseFreq };
  currentKey = key;
  currentVolume = patch.volume;
  const target = muted ? 0 : patch.volume;
  master.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.55);
  setScoreBpm(beatBpm);
}

export function stopNightScore() {
  if (handle?.stepTimer) {
    window.clearInterval(handle.stepTimer);
    handle.stepTimer = null;
  }
  if (beatTimer) {
    window.clearInterval(beatTimer);
    beatTimer = null;
  }
  if (!handle) return;
  const current = handle;
  try {
    current.master.gain.setTargetAtTime(0, current.ctx.currentTime, 0.12);
  } catch {
    /* closing */
  }
  window.setTimeout(() => {
    for (const node of current.nodes) {
      try {
        if ("stop" in node && typeof node.stop === "function") node.stop();
        node.disconnect();
      } catch {
        /* already closed */
      }
    }
    void current.ctx.close();
  }, 400);
  if (handle === current) {
    handle = null;
    currentKey = "";
  }
}
