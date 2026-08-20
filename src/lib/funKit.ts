export const FUN_EVENT = "probe:fun";
export const FUN_PREFS_KEY = "probe:fun-prefs";
export const FUN_STATE_KEY = "probe:fun-state";
export const FUN_PREFS_EVENT = "probe:fun-prefs-changed";
export const FUN_STATE_EVENT = "probe:fun-state-changed";

export type FunFeature = {
  id: string;
  title: string;
  detail: string;
};

export const FUN_FEATURES: FunFeature[] = [
  { id: "tab-tick", title: "Tab tick", detail: "The nav ticks like a desk stamp." },
  { id: "send-whoosh", title: "Send whoosh", detail: "Messages leave the composer on a paper rush." },
  { id: "file-drawer", title: "File drawer", detail: "Opening File slides a wooden drawer." },
  { id: "memo-stamp", title: "Memo stamp", detail: "Signing an hour inks a wet stamp." },
  { id: "stance-tick", title: "Stance tick", detail: "Work, probe, and soften click like type keys." },
  { id: "bubble-pop", title: "Bubble pop", detail: "New lines land with a soft paper pop." },
  { id: "search-clack", title: "Search clack", detail: "The chat search types on a metal comb." },
  { id: "login-clack", title: "Login clack", detail: "The staff door password clacks per glyph." },
  { id: "toggle-click", title: "Toggle click", detail: "Appearance choices snap like a breaker." },
  { id: "pencil-scratch", title: "Pencil scratch", detail: "Night notes scratch as you write." },
  { id: "elevator-ding", title: "Elevator ding", detail: "Moving hours rings a distant ding." },
  { id: "door-close", title: "Door close", detail: "A letter slams the hour shut." },
  { id: "paper-tear", title: "Paper tear", detail: "Resets and skips tear a page." },
  { id: "glass-tap", title: "Glass tap", detail: "The extra chair answers a knuckle." },
  { id: "badge-chime", title: "Badge chime", detail: "Asking for a badge rings a small chime." },
  { id: "rain-hush", title: "Rain hush", detail: "Horror hours pick up glass rain." },
  { id: "ink-trail", title: "Ink trail", detail: "The pointer leaves a short ink wake." },
  { id: "desk-dust", title: "Desk dust", detail: "File motes drift over the cabinet." },
  { id: "glass-rain", title: "Glass rain", detail: "Rain threads down the hour glass." },
  { id: "warm-lamp", title: "Warm lamp", detail: "Warm scores flicker a desk lamp." },
  { id: "extra-chair", title: "Extra chair", detail: "An empty chair waits in the inbox." },
  { id: "logo-glitch", title: "Logo glitch", detail: "PROBE snags when you hover the kicker." },
  { id: "tab-ink", title: "Tab ink", detail: "The active tab fills with sulfur ink." },
  { id: "header-sheen", title: "Header sheen", detail: "Thread headers catch a glass sheen." },
  { id: "paper-scroll", title: "Paper scroll", detail: "Scrollbars are cut paper edges." },
  { id: "highlighter", title: "Highlighter", detail: "Selected text marks sulfur highlighter." },
  { id: "coffee-ring", title: "Coffee ring", detail: "Late hours leave a cup stain." },
  { id: "glass-smudge", title: "Glass smudge", detail: "Red alert fogs a fingerprint." },
  { id: "night-tint", title: "Night tint", detail: "Story tints to the chapter's hour." },
  { id: "home-dust", title: "Home dust", detail: "Chats collect slow paper dust." },
  { id: "scan-alive", title: "Scan alive", detail: "A live scanline keeps the desk copied." },
  { id: "grain-alive", title: "Grain alive", detail: "Film grain sits on every pane." },
  { id: "page-curl", title: "Page curl", detail: "File pages curl at the corner." },
  { id: "polaroid-tilt", title: "Polaroid tilt", detail: "Dumped photos sit like tilted prints." },
  { id: "hand-caption", title: "Hand caption", detail: "Photo captions look written, not set." },
  { id: "fold-mark", title: "Fold mark", detail: "Long bubbles keep a paper fold." },
  { id: "contact-press", title: "Contact press", detail: "Rows dent when you press them." },
  { id: "avatar-blink", title: "Avatar blink", detail: "Portraits blink on a slow count." },
  { id: "unread-pulse", title: "Unread pulse", detail: "Open threads breathe a live dot." },
  { id: "send-armed", title: "Send armed", detail: "A ready send pulses sulfur." },
  { id: "mic-bars", title: "Mic bars", detail: "Listening draws a live level." },
  { id: "whisper-send", title: "Whisper send", detail: "Hold send to file a quieter line." },
  { id: "pin-clip", title: "Pin clip", detail: "Double-tap a line to paperclip it." },
  { id: "polaroid-peek", title: "Polaroid peek", detail: "Hold a portrait to lift a print." },
  { id: "crumple-swipe", title: "Crumple swipe", detail: "Swipe your line to crumple, then undo." },
  { id: "flashlight", title: "Flashlight", detail: "Double-tap the header to torch the glass." },
  { id: "shake-dust", title: "Shake dust", detail: "Shake the phone to knock dust loose." },
  { id: "note-swipe", title: "Note swipe", detail: "Pull the composer to flash the night note." },
  { id: "bubble-fly", title: "Bubble fly", detail: "Your lines fly in from the composer." },
  { id: "stance-tint", title: "Stance tint", detail: "Bubbles pick up the stance ink." },
  { id: "leak-jitter", title: "Leak jitter", detail: "Their lines shiver when the hour leaks." },
  { id: "error-stamp", title: "Error stamp", detail: "Broken sends land as a red stamp." },
  { id: "retry-shake", title: "Retry shake", detail: "Reset rattles like dice in a cup." },
  { id: "search-caret", title: "Search caret", detail: "Search keeps a typewriter caret." },
  { id: "theme-wipe", title: "Theme wipe", detail: "Light and dark wipe like a plate change." },
  { id: "nav-haptic", title: "Nav haptic", detail: "Tabs tap your palm." },
  { id: "tap-haptic", title: "Tap haptic", detail: "Desk buttons give a short buzz." },
  { id: "reduce-motion", title: "Reduce motion", detail: "The desk stills if you asked it to." },
  { id: "ink-ripple", title: "Ink ripple", detail: "Presses bloom a sulfur ripple." },
  { id: "card-lift", title: "Card lift", detail: "Memos and letters lift off the blotter." },
  { id: "desk-knock", title: "Desk knock", detail: "Knock PROBE three times." },
  { id: "chair-toy", title: "Chair toy", detail: "The extra chair has a line if you sit with it." },
  { id: "stamp-album", title: "Stamp album", detail: "Letters collect in a File album." },
  { id: "desk-award", title: "Desk award", detail: "Tiny toasts when the night notices you." },
  { id: "night-streak", title: "Night streak", detail: "Returning nights tick a quiet streak." },
  { id: "gold-clip", title: "Gold clip", detail: "The first filed line wears a gold clip." },
  { id: "floor-number", title: "Floor number", detail: "A live floor mark sits in the corner." },
  { id: "memo-ticker", title: "Memo ticker", detail: "Tonight's memo crawls the blotter." },
  { id: "sticky-tab", title: "Sticky tab", detail: "The composer keeps a yellow tab." },
  { id: "foley-tests", title: "Foley tests", detail: "Settings lets you audition desk sounds." },
  { id: "haptics-pref", title: "Haptics pref", detail: "You can quiet the palm." },
  { id: "foley-pref", title: "Foley pref", detail: "You can mute the desk without muting them." },
  { id: "toys-pref", title: "Toys pref", detail: "Dust, rain, and the chair can sit out." },
  { id: "pin-file", title: "Pin file", detail: "Clipped lines appear under File." },
  { id: "copy-badge", title: "Copy badge", detail: "The live copy serial stays on the hour." },
  { id: "night-clock", title: "Night clock", detail: "A small clock tracks the sitting." },
  { id: "hire-confetti", title: "Hire confetti", detail: "A hire rains stamps." },
  { id: "reject-redact", title: "Reject redact", detail: "A reject draws black bars." },
  { id: "heart-stamp", title: "Heart stamp", detail: "A personal letter keeps a heart stamp." },
  { id: "callback-ring", title: "Callback ring", detail: "A second pass wears a ringing badge." },
  { id: "login-redact", title: "Login redact", detail: "The password fills as redacted bars." },
  { id: "login-knock", title: "Login knock", detail: "A rhythm on the staff door is noticed." },
  { id: "login-unlock", title: "Login unlock", detail: "A good password opens with a plate wipe." },
  { id: "story-tear", title: "Story tear", detail: "Skipping a shot tears the still." },
  { id: "story-lamp", title: "Story lamp", detail: "Story stills breathe a lamp." },
  { id: "hour-drawers", title: "Hour drawers", detail: "Building hours sit in sliding drawers." },
  { id: "memo-flip", title: "Memo flip", detail: "Memos flip like index cards." },
  { id: "wet-ink", title: "Wet ink", detail: "A fresh signature stays wet." },
  { id: "music-vu", title: "Music VU", detail: "Settings shows a live music needle." },
  { id: "logout-slam", title: "Logout slam", detail: "Leaving slams a folder." },
  { id: "paper-plane", title: "Paper plane", detail: "An empty inbox folds a plane." },
  { id: "glass-remembers", title: "Glass remembers", detail: "Idle contacts say the glass kept them." },
  { id: "chip-pulse", title: "Chip pulse", detail: "The story chip pulses if a scene waits." },
  { id: "ink-dries", title: "Ink dries", detail: "Saved notes fade from wet to filed." },
  { id: "pen-cursor", title: "Pen cursor", detail: "The note field uses a pen caret." },
  { id: "lights-out", title: "Lights out", detail: "The last question kills the overheads." },
  { id: "late-coffee", title: "Late coffee", detail: "Question three sets a cup down." },
  { id: "sticky-brief", title: "Sticky brief", detail: "The hour brief gets a sticky tab." },
  { id: "letter-type", title: "Letter type", detail: "Ending copy types onto the page." },
  { id: "ticker-tape", title: "Ticker tape", detail: "Three hires dump a tape of copies." },
];

export type FunPrefs = {
  foley: boolean;
  haptics: boolean;
  toys: boolean;
};

export type FunPin = {
  id: string;
  text: string;
  name: string;
  at: number;
};

export type FunState = {
  pins: FunPin[];
  stamps: string[];
  awards: string[];
  knocks: number;
  chairLines: number;
  streakDay: string;
  streakCount: number;
  seenNight: string;
};

export const DEFAULT_FUN_PREFS: FunPrefs = {
  foley: true,
  haptics: true,
  toys: true,
};

export const EMPTY_FUN_STATE: FunState = {
  pins: [],
  stamps: [],
  awards: [],
  knocks: 0,
  chairLines: 0,
  streakDay: "",
  streakCount: 0,
  seenNight: "",
};

export function funFeatureIds() {
  return FUN_FEATURES.map((item) => item.id);
}

export function getFunPrefs(): FunPrefs {
  if (typeof window === "undefined") return DEFAULT_FUN_PREFS;
  try {
    const raw = window.localStorage.getItem(FUN_PREFS_KEY);
    if (!raw) return DEFAULT_FUN_PREFS;
    const parsed = JSON.parse(raw) as Partial<FunPrefs>;
    return {
      foley: parsed.foley !== false,
      haptics: parsed.haptics !== false,
      toys: parsed.toys !== false,
    };
  } catch {
    return DEFAULT_FUN_PREFS;
  }
}

export function setFunPrefs(patch: Partial<FunPrefs>) {
  if (typeof window === "undefined") return;
  const next = { ...getFunPrefs(), ...patch };
  window.localStorage.setItem(FUN_PREFS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(FUN_PREFS_EVENT));
}

export function subscribeToFunPrefs(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(FUN_PREFS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(FUN_PREFS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function getFunState(): FunState {
  if (typeof window === "undefined") return EMPTY_FUN_STATE;
  try {
    const raw = window.localStorage.getItem(FUN_STATE_KEY);
    if (!raw) return { ...EMPTY_FUN_STATE };
    const parsed = JSON.parse(raw) as Partial<FunState>;
    return {
      pins: Array.isArray(parsed.pins) ? parsed.pins.slice(0, 12) : [],
      stamps: Array.isArray(parsed.stamps) ? parsed.stamps.slice(0, 24) : [],
      awards: Array.isArray(parsed.awards) ? parsed.awards.slice(0, 24) : [],
      knocks: Number(parsed.knocks) || 0,
      chairLines: Number(parsed.chairLines) || 0,
      streakDay: String(parsed.streakDay || ""),
      streakCount: Number(parsed.streakCount) || 0,
      seenNight: String(parsed.seenNight || ""),
    };
  } catch {
    return { ...EMPTY_FUN_STATE };
  }
}

function writeFunState(next: FunState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FUN_STATE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(FUN_STATE_EVENT));
}

export function subscribeToFunState(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(FUN_STATE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(FUN_STATE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function touchNightStreak() {
  const state = getFunState();
  const today = todayKey();
  if (state.streakDay === today) return state;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streakCount =
    state.streakDay === yesterday ? state.streakCount + 1 : 1;
  const next = { ...state, streakDay: today, streakCount, seenNight: today };
  writeFunState(next);
  if (streakCount >= 2) grantAward("night-streak");
  return next;
}

export function pinLine(pin: FunPin) {
  const state = getFunState();
  if (state.pins.some((item) => item.id === pin.id)) {
    writeFunState({
      ...state,
      pins: state.pins.filter((item) => item.id !== pin.id),
    });
    return;
  }
  writeFunState({ ...state, pins: [pin, ...state.pins].slice(0, 12) });
  grantAward("pin-clip");
}

export function collectStamp(id: string) {
  const state = getFunState();
  if (state.stamps.includes(id)) return;
  writeFunState({ ...state, stamps: [...state.stamps, id].slice(0, 24) });
}

export function grantAward(id: string) {
  const state = getFunState();
  if (state.awards.includes(id)) return;
  writeFunState({ ...state, awards: [...state.awards, id].slice(0, 24) });
  emitFun({ id: "desk-award", text: awardLine(id) });
}

export function bumpKnocks() {
  const state = getFunState();
  const knocks = state.knocks + 1;
  writeFunState({ ...state, knocks });
  if (knocks >= 3) grantAward("desk-knock");
  return knocks;
}

export function bumpChair() {
  const state = getFunState();
  const chairLines = state.chairLines + 1;
  writeFunState({ ...state, chairLines });
  grantAward("chair-toy");
  return chairLines;
}

export function awardLine(id: string) {
  switch (id) {
    case "night-streak":
      return "The glass kept your nights in a row.";
    case "pin-clip":
      return "A line is clipped to the file.";
    case "desk-knock":
      return "They heard the knock.";
    case "chair-toy":
      return "The extra chair noticed you.";
    case "badge-chime":
      return "The badge request is on paper.";
    case "ticker-tape":
      return "Three hires. The tape is running.";
    case "gold-clip":
      return "First line of the hour, clipped gold.";
    default:
      return "The desk filed that.";
  }
}

export const CHAIR_LINES = [
  "It is listening. It is not for you.",
  "The extra chair is occupied. You just cannot see by whom.",
  "Do not offer it coffee. It already has a cup.",
  "If it scrapes, keep typing.",
];

export type FunBurst = {
  id: string;
  x?: number;
  y?: number;
  text?: string;
  mood?: string;
};

export function emitFun(burst: FunBurst) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FUN_EVENT, { detail: burst }));
}

export function motionOk() {
  if (typeof window === "undefined") return true;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function tapHaptic(pattern: number | number[] = 12) {
  if (typeof navigator === "undefined") return;
  if (!getFunPrefs().haptics) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* no haptic */
  }
}

export function playFun(id: string, burst: Partial<FunBurst> = {}) {
  emitFun({ id, ...burst });
}

export function deskClick(id: string) {
  playFun(id);
  tapHaptic(id === "tab-tick" || id === "nav-haptic" ? [8, 18, 8] : 12);
}

export function funRipple(event: { currentTarget: EventTarget; clientX: number; clientY: number }) {
  const node = event.currentTarget as HTMLElement;
  if (!node?.classList) return;
  node.classList.add("fun-rippling");
  playFun("ink-ripple", { x: event.clientX, y: event.clientY });
  window.setTimeout(() => node.classList.remove("fun-rippling"), 420);
}
