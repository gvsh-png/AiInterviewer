import type { InterviewerId } from "@/lib/interviewers";

const STORAGE_VERSION = 1;
const KEY = `probe:file:v${STORAGE_VERSION}`;
export const FILE_EVENT = "probe:file-changed";

export type FileNote = {
  interviewerId: InterviewerId | "desk";
  text: string;
  updatedAt: number;
};

export type FileState = {
  version: typeof STORAGE_VERSION;
  notes: FileNote[];
  signedHours: string[];
  badgeRequested: boolean;
};

export type BuildingMemo = {
  id: string;
  after: number;
  kicker: string;
  title: string;
  body: string;
};

const EMPTY: FileState = {
  version: STORAGE_VERSION,
  notes: [],
  signedHours: [],
  badgeRequested: false,
};

export const EMPTY_FILE_SNAPSHOT = JSON.stringify(EMPTY);

export const BUILDING_MEMOS: BuildingMemo[] = [
  {
    id: "intake",
    after: 0,
    kicker: "Memo",
    title: "Intake is not optional",
    body: "You are expected on the floor when a contact messages. Each hour has a brief in this file. Leave notes only here.",
  },
  {
    id: "forward",
    after: 1,
    kicker: "Memo",
    title: "Hours are forwarded",
    body: "Completed interviews are copied upstairs. The brief is scored when the letter lands. Sign the hour if you sat through it.",
  },
  {
    id: "watch",
    after: 3,
    kicker: "Memo",
    title: "The board is copied live",
    body: "Three hours is enough for a pattern. Keep answers short. Soft hours still go in the drawer.",
  },
  {
    id: "halfway",
    after: 6,
    kicker: "Memo",
    title: "Halfway is a measurement",
    body: "People who leave early do not get copies. Later hours are shorter. Badge requests before three clean hours or three hires are stamped pending.",
  },
  {
    id: "keep",
    after: 9,
    kicker: "Memo",
    title: "Retention",
    body: "If the letters got personal, do not answer after midnight. The chats remain. So does this file.",
  },
  {
    id: "close",
    after: 12,
    kicker: "Memo",
    title: "Sample complete",
    body: "The printers have what they need. Read the ending in Story. The file stays if they want another hour.",
  },
];

export const SAMPLE_MEMOS: Array<BuildingMemo & { id: string }> = [
  {
    id: "sample-clean",
    after: 0,
    kicker: "Stamp",
    title: "The sample is behaving",
    body: "Four clean hours. Upstairs noticed. Do not get comfortable. Clean is a measurement, not a kindness.",
  },
  {
    id: "sample-attached",
    after: 0,
    kicker: "Stamp",
    title: "Personal stationery",
    body: "Two personal letters is a pattern. Do not answer them after the hour closes. The board kept both copies.",
  },
  {
    id: "sample-probe",
    after: 0,
    kicker: "Stamp",
    title: "Unwritten risks",
    body: "You keep asking for what is not on paper. The desk will not stop you. It will also not protect you.",
  },
  {
    id: "sample-cold",
    after: 0,
    kicker: "Stamp",
    title: "Cold sample",
    body: "Nobody hired you and the briefs are still landing. That is allowed. It is also being counted.",
  },
];

function isBrowser() {
  return typeof window !== "undefined";
}

function notify() {
  window.dispatchEvent(new Event(FILE_EVENT));
}

export function readFileState(): FileState {
  if (!isBrowser()) return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as FileState;
    if (!parsed || parsed.version !== STORAGE_VERSION) return EMPTY;
    return {
      version: STORAGE_VERSION,
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      signedHours: Array.isArray(parsed.signedHours)
        ? parsed.signedHours.map(String)
        : [],
      badgeRequested: Boolean(parsed.badgeRequested),
    };
  } catch {
    return EMPTY;
  }
}

export function writeFileState(next: FileState) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  notify();
}

export function clearFileCabinet() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(KEY);
  notify();
}

export function getFileSnapshot() {
  if (!isBrowser()) return EMPTY_FILE_SNAPSHOT;
  return window.localStorage.getItem(KEY) || EMPTY_FILE_SNAPSHOT;
}

export function subscribeToFile(onChange: () => void) {
  if (!isBrowser()) return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(FILE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(FILE_EVENT, onChange);
  };
}

export function parseFileSnapshot(raw: string): FileState {
  try {
    const parsed = JSON.parse(raw) as FileState;
    if (!parsed || parsed.version !== STORAGE_VERSION) return EMPTY;
    return {
      version: STORAGE_VERSION,
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      signedHours: Array.isArray(parsed.signedHours)
        ? parsed.signedHours.map(String)
        : [],
      badgeRequested: Boolean(parsed.badgeRequested),
    };
  } catch {
    return EMPTY;
  }
}

export function getNote(state: FileState, interviewerId: string) {
  return state.notes.find((item) => item.interviewerId === interviewerId) ?? null;
}

export function upsertNote(interviewerId: FileNote["interviewerId"], text: string) {
  const state = readFileState();
  const trimmed = text.trim();
  const notes = state.notes.filter((item) => item.interviewerId !== interviewerId);
  if (trimmed) {
    notes.unshift({
      interviewerId,
      text: trimmed,
      updatedAt: Date.now(),
    });
  }
  writeFileState({ ...state, notes });
}

export function signHour(interviewerId: string) {
  const state = readFileState();
  if (state.signedHours.includes(interviewerId)) return;
  writeFileState({
    ...state,
    signedHours: [...state.signedHours, interviewerId],
  });
}

export function requestBadge() {
  const state = readFileState();
  if (state.badgeRequested) return;
  writeFileState({ ...state, badgeRequested: true });
}

export function unlockedMemos(completedCount: number) {
  return BUILDING_MEMOS.filter((memo) => completedCount >= memo.after);
}

export function unlockedSampleMemos(input: {
  cleanPasses: number;
  obsessed: number;
  probePasses: number;
  hires: number;
  rejects: number;
}) {
  const next: BuildingMemo[] = [];
  if (input.cleanPasses >= 4) {
    const memo = SAMPLE_MEMOS.find((item) => item.id === "sample-clean");
    if (memo) next.push(memo);
  }
  if (input.obsessed >= 2) {
    const memo = SAMPLE_MEMOS.find((item) => item.id === "sample-attached");
    if (memo) next.push(memo);
  }
  if (input.probePasses >= 2) {
    const memo = SAMPLE_MEMOS.find((item) => item.id === "sample-probe");
    if (memo) next.push(memo);
  }
  if (input.hires === 0 && input.rejects >= 3) {
    const memo = SAMPLE_MEMOS.find((item) => item.id === "sample-cold");
    if (memo) next.push(memo);
  }
  return next;
}
