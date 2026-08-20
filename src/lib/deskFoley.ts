import { getFunPrefs, motionOk } from "@/lib/funKit";
import { musicMuted } from "@/lib/nightScore";

type FoleyKind =
  | "tab-tick"
  | "send-whoosh"
  | "file-drawer"
  | "memo-stamp"
  | "stance-tick"
  | "bubble-pop"
  | "search-clack"
  | "login-clack"
  | "toggle-click"
  | "pencil-scratch"
  | "elevator-ding"
  | "door-close"
  | "paper-tear"
  | "glass-tap"
  | "badge-chime"
  | "rain-hush"
  | "nav-haptic"
  | "logout-slam"
  | "story-tear"
  | "wet-ink";

let fxCtx: AudioContext | null = null;

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

function tone(
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
  filter.frequency.value = Math.max(700, freq * 5);
  gain.gain.value = 0.0001;
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(vol, when + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

function noiseBurst(ctx: AudioContext, when: number, dur: number, vol: number, freq: number) {
  const noise = ctx.createBufferSource();
  const buffer = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * dur), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(vol, when + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  noise.start(when);
  noise.stop(when + dur + 0.02);
}

export function playFoley(kind: FoleyKind | string) {
  if (!getFunPrefs().foley) return;
  if (musicMuted() && kind === "rain-hush") return;
  void (async () => {
    const ctx = await getFxCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    switch (kind) {
      case "tab-tick":
        tone(ctx, 880, "square", t, 0.04, 0.04);
        tone(ctx, 1320, "square", t + 0.03, 0.05, 0.03);
        return;
      case "send-whoosh":
        noiseBurst(ctx, t, 0.16, 0.08, 1400);
        tone(ctx, 420, "triangle", t, 0.12, 0.05);
        return;
      case "file-drawer":
        noiseBurst(ctx, t, 0.28, 0.1, 420);
        tone(ctx, 90, "triangle", t + 0.04, 0.18, 0.07);
        return;
      case "memo-stamp":
      case "wet-ink":
        tone(ctx, 140, "square", t, 0.08, 0.08);
        noiseBurst(ctx, t + 0.02, 0.12, 0.09, 900);
        return;
      case "stance-tick":
        tone(ctx, 640, "square", t, 0.04, 0.045);
        return;
      case "bubble-pop":
        tone(ctx, 520, "sine", t, 0.06, 0.05);
        tone(ctx, 880, "sine", t + 0.03, 0.07, 0.03);
        return;
      case "search-clack":
      case "login-clack":
        tone(ctx, 210 + Math.random() * 90, "square", t, 0.03, 0.035);
        return;
      case "toggle-click":
        tone(ctx, 480, "square", t, 0.05, 0.05);
        tone(ctx, 240, "triangle", t + 0.04, 0.08, 0.04);
        return;
      case "pencil-scratch":
        noiseBurst(ctx, t, 0.07, 0.05, 2200);
        return;
      case "elevator-ding":
        tone(ctx, 784, "sine", t, 0.22, 0.07);
        tone(ctx, 1175, "sine", t + 0.12, 0.28, 0.05);
        return;
      case "door-close":
      case "logout-slam":
        tone(ctx, 70, "triangle", t, 0.16, 0.1);
        noiseBurst(ctx, t, 0.14, 0.08, 280);
        return;
      case "paper-tear":
      case "story-tear":
        noiseBurst(ctx, t, 0.22, 0.11, 1800);
        noiseBurst(ctx, t + 0.08, 0.16, 0.07, 1100);
        return;
      case "glass-tap":
        tone(ctx, 1480, "sine", t, 0.09, 0.06);
        tone(ctx, 920, "triangle", t + 0.04, 0.1, 0.04);
        return;
      case "badge-chime":
        tone(ctx, 659, "sine", t, 0.16, 0.06);
        tone(ctx, 880, "sine", t + 0.1, 0.22, 0.05);
        return;
      case "rain-hush":
        if (!motionOk()) return;
        noiseBurst(ctx, t, 0.4, 0.03, 3200);
        return;
      case "nav-haptic":
        tone(ctx, 190, "square", t, 0.03, 0.03);
        return;
      default:
        tone(ctx, 400, "triangle", t, 0.05, 0.03);
    }
  })();
}
