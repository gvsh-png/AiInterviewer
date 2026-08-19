import type { InterviewerId } from "@/lib/interviewers";
import type { NightMood } from "@/lib/storySeed";

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
    volume: 0.07,
  },
  paper: {
    freqs: [49, 73.4, 98],
    noise: 0.06,
    filter: 880,
    lfo: 0.11,
    volume: 0.065,
  },
  glass: {
    freqs: [61.7, 123.4],
    noise: 0.045,
    filter: 1200,
    lfo: 0.09,
    volume: 0.06,
  },
  storm: {
    freqs: [36.7, 73.4],
    noise: 0.09,
    filter: 320,
    lfo: 0.05,
    volume: 0.075,
  },
  empty: {
    freqs: [41.2, 82.4],
    noise: 0.02,
    filter: 260,
    lfo: 0.04,
    volume: 0.055,
  },
  overtime: {
    freqs: [46.2, 92.5, 138.6],
    noise: 0.035,
    filter: 540,
    lfo: 0.08,
    volume: 0.06,
  },
};

export const PERSON_PATCHES: Record<InterviewerId, Patch> = {
  derek: {
    freqs: [49, 61.74, 98],
    noise: 0.055,
    filter: 340,
    lfo: 0.048,
    volume: 0.042,
    wave: "triangle",
  },
  marlene: {
    freqs: [65.41, 98, 130.81],
    noise: 0.028,
    filter: 760,
    lfo: 0.11,
    volume: 0.038,
    wave: "sine",
  },
  voss: {
    freqs: [38.89, 77.78, 103.83],
    noise: 0.07,
    filter: 280,
    lfo: 0.035,
    volume: 0.044,
    wave: "sawtooth",
  },
  celeste: {
    freqs: [52, 78, 156],
    noise: 0.022,
    filter: 920,
    lfo: 0.08,
    volume: 0.036,
    wave: "sine",
  },
  griffin: {
    freqs: [58.27, 87.31, 116.54],
    noise: 0.03,
    filter: 640,
    lfo: 0.09,
    volume: 0.04,
    wave: "triangle",
  },
  pike: {
    freqs: [43.65, 87.31],
    noise: 0.018,
    filter: 410,
    lfo: 0.03,
    volume: 0.035,
    wave: "sine",
  },
  june: {
    freqs: [69.3, 103.83, 138.59],
    noise: 0.04,
    filter: 1100,
    lfo: 0.14,
    volume: 0.037,
    wave: "triangle",
  },
  romanov: {
    freqs: [36.71, 55, 73.42],
    noise: 0.05,
    filter: 300,
    lfo: 0.045,
    volume: 0.043,
    wave: "sawtooth",
  },
  ashley: {
    freqs: [73.42, 110, 146.83],
    noise: 0.033,
    filter: 980,
    lfo: 0.12,
    volume: 0.038,
    wave: "sine",
  },
  hector: {
    freqs: [41.2, 82.41, 123.47],
    noise: 0.06,
    filter: 360,
    lfo: 0.05,
    volume: 0.04,
    wave: "triangle",
  },
  vera: {
    freqs: [48.99, 97.99],
    noise: 0.025,
    filter: 520,
    lfo: 0.06,
    volume: 0.036,
    wave: "sine",
  },
  knox: {
    freqs: [55, 82.41, 164.81],
    noise: 0.048,
    filter: 470,
    lfo: 0.1,
    volume: 0.041,
    wave: "triangle",
  },
};

type Handle = {
  ctx: AudioContext;
  master: GainNode;
  nodes: AudioNode[];
};

let handle: Handle | null = null;
let muted = false;
let currentKey = "";
let currentVolume = 0.06;

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
}

export function startNightScore(mood: NightMood) {
  return startScore(`night:${mood}`, NIGHT_PATCHES[mood]);
}

export function startPersonScore(id: InterviewerId) {
  return startScore(`person:${id}`, PERSON_PATCHES[id]);
}

async function startScore(key: string, patch: Patch) {
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
  const wave = patch.wave || "sine";

  for (const freq of patch.freqs) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = wave;
    osc.frequency.value = freq;
    filter.type = "lowpass";
    filter.frequency.value = patch.filter;
    gain.gain.value = 0.22 / patch.freqs.length;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = patch.lfo;
    lfoGain.gain.value = freq * 0.01;
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
  noiseFilter.frequency.value = patch.filter * 0.7;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = patch.noise;
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(master);
  noise.start();
  nodes.push(noise, noiseFilter, noiseGain);

  handle = { ctx, master, nodes };
  currentKey = key;
  currentVolume = patch.volume;
  const target = muted ? 0 : patch.volume;
  master.gain.linearRampToValueAtTime(target, ctx.currentTime + 1.4);
}

export function stopNightScore() {
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
