import type { NightMood } from "@/lib/storySeed";

type Patch = {
  freqs: number[];
  noise: number;
  filter: number;
  lfo: number;
  volume: number;
};

const PATCHES: Record<NightMood, Patch> = {
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

type Handle = {
  ctx: AudioContext;
  master: GainNode;
  nodes: AudioNode[];
  timer?: number;
};

let handle: Handle | null = null;
let muted = false;
let currentMood: NightMood | null = null;

export function musicMuted() {
  return muted;
}

export function setMusicMuted(next: boolean) {
  muted = next;
  if (handle) {
    handle.master.gain.setTargetAtTime(
      next ? 0 : PATCHES[currentMood || "watched"].volume,
      handle.ctx.currentTime,
      0.08
    );
  }
}

export async function startNightScore(mood: NightMood) {
  if (typeof window === "undefined") return;
  if (currentMood === mood && handle) {
    if (!muted) {
      handle.master.gain.setTargetAtTime(
        PATCHES[mood].volume,
        handle.ctx.currentTime,
        0.2
      );
    }
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
  const patch = PATCHES[mood];
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  const nodes: AudioNode[] = [master];

  for (const freq of patch.freqs) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = "sine";
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
  currentMood = mood;
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
    currentMood = null;
  }
}
