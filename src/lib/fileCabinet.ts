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
    body: "You are expected on the floor when a contact messages. The desk does not take department requests. Leave notes only in this file.",
  },
  {
    id: "forward",
    after: 1,
    kicker: "Memo",
    title: "Hours are forwarded",
    body: "Completed interviews are copied upstairs. Do not ask who reads them. Sign the hour in this file if you sat through it.",
  },
  {
    id: "watch",
    after: 3,
    kicker: "Memo",
    title: "The board is copied live",
    body: "Three hours is enough for a pattern. Keep answers short. Personal letters still go in the drawer.",
  },
  {
    id: "halfway",
    after: 6,
    kicker: "Memo",
    title: "Halfway is a measurement",
    body: "People who leave early do not get copies. Badge requests before six hires are stamped pending. That is not a no. It is also not a yes.",
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
