import { INTERVIEWERS } from "@/lib/interviewers";
import type { AssignedContact } from "@/lib/contacts";
import type { VerdictDecision } from "@/lib/verdict";
import {
  recapTitle,
  type CutsceneKind,
  type Shot,
} from "@/lib/cutscenes";
import {
  createSeed,
  rollStoryRun,
  runFromIds,
  type StoryRun,
} from "@/lib/storySeed";

const STORAGE_VERSION = 4;
const KEY = `probe:campaign:v${STORAGE_VERSION}`;
export const CAMPAIGN_EVENT = "probe:campaign-changed";

export type CampaignChapter =
  | "intro"
  | "arrive"
  | "aftermath"
  | "midpoint"
  | "ending";

export type RecapEntry = {
  id: string;
  kind: CutsceneKind;
  title: string;
  round: number;
  shots: Shot[];
};

export type CampaignState = {
  version: typeof STORAGE_VERSION;
  chapter: CampaignChapter;
  panel: number;
  seed: string;
  premiseId: string;
  nightId: string;
  throughlineId: string;
  cutsceneDone: boolean;
  midpointSeen: boolean;
  recap: RecapEntry[];
  shotCache: Record<string, Shot[]>;
};

function emptyCampaign(): CampaignState {
  const run = rollStoryRun(createSeed());
  return {
    version: STORAGE_VERSION,
    chapter: "intro",
    panel: 0,
    seed: run.seed,
    premiseId: run.premise.id,
    nightId: run.night.id,
    throughlineId: run.throughline.id,
    cutsceneDone: false,
    midpointSeen: false,
    recap: [],
    shotCache: {},
  };
}

const EMPTY: CampaignState = {
  version: STORAGE_VERSION,
  chapter: "intro",
  panel: 0,
  seed: "",
  premiseId: "",
  nightId: "",
  throughlineId: "",
  cutsceneDone: false,
  midpointSeen: false,
  recap: [],
  shotCache: {},
};

export const EMPTY_SNAPSHOT = JSON.stringify(EMPTY);

function isBrowser() {
  return typeof window !== "undefined";
}

function notify() {
  window.dispatchEvent(new Event(CAMPAIGN_EVENT));
}

function isChapter(value: unknown): value is CampaignChapter {
  return (
    value === "intro" ||
    value === "arrive" ||
    value === "aftermath" ||
    value === "midpoint" ||
    value === "ending"
  );
}

function normalize(parsed: CampaignState): CampaignState {
  if (!parsed.seed || !parsed.premiseId) {
    return emptyCampaign();
  }
  return {
    version: STORAGE_VERSION,
    chapter: isChapter(parsed.chapter) ? parsed.chapter : "intro",
    panel: Math.max(0, Number(parsed.panel) || 0),
    seed: parsed.seed,
    premiseId: parsed.premiseId,
    nightId: parsed.nightId,
    throughlineId: parsed.throughlineId,
    cutsceneDone: Boolean(parsed.cutsceneDone),
    midpointSeen: Boolean(parsed.midpointSeen),
    recap: Array.isArray(parsed.recap) ? parsed.recap : [],
    shotCache:
      parsed.shotCache && typeof parsed.shotCache === "object"
        ? parsed.shotCache
        : {},
  };
}

export function readCampaign(): CampaignState {
  if (!isBrowser()) return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const rolled = emptyCampaign();
      window.localStorage.setItem(KEY, JSON.stringify(rolled));
      notify();
      return rolled;
    }
    const parsed = JSON.parse(raw) as CampaignState;
    if (!parsed || parsed.version !== STORAGE_VERSION) {
      const rolled = emptyCampaign();
      window.localStorage.setItem(KEY, JSON.stringify(rolled));
      notify();
      return rolled;
    }
    return normalize(parsed);
  } catch {
    const rolled = emptyCampaign();
    window.localStorage.setItem(KEY, JSON.stringify(rolled));
    notify();
    return rolled;
  }
}

export function writeCampaign(next: CampaignState) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  notify();
}

export function updateCampaign(patch: Partial<CampaignState>) {
  writeCampaign({ ...readCampaign(), ...patch, version: STORAGE_VERSION });
}

export function clearCampaign() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(KEY);
  notify();
}

export function getCampaignSnapshot() {
  if (!isBrowser()) return EMPTY_SNAPSHOT;
  return window.localStorage.getItem(KEY) || EMPTY_SNAPSHOT;
}

export function subscribeToCampaign(onChange: () => void) {
  if (!isBrowser()) return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CAMPAIGN_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CAMPAIGN_EVENT, onChange);
  };
}

export function parseCampaignSnapshot(raw: string): CampaignState {
  try {
    const parsed = JSON.parse(raw) as CampaignState;
    if (!parsed || parsed.version !== STORAGE_VERSION) return EMPTY;
    if (!parsed.seed) return EMPTY;
    return normalize(parsed);
  } catch {
    return EMPTY;
  }
}

export function campaignRun(state: CampaignState): StoryRun | null {
  if (!state.seed || !state.premiseId) return null;
  return runFromIds(
    state.seed,
    state.premiseId,
    state.nightId,
    state.throughlineId
  );
}

export function cacheShots(key: string, shots: Shot[]) {
  const state = readCampaign();
  writeCampaign({
    ...state,
    shotCache: { ...state.shotCache, [key]: shots },
  });
}

export function rememberCutscene(entry: RecapEntry) {
  const state = readCampaign();
  const recap = state.recap.filter((item) => item.id !== entry.id);
  recap.push(entry);
  writeCampaign({ ...state, recap, cutsceneDone: true, panel: 0 });
}

export function chapterToKind(chapter: CampaignChapter): CutsceneKind {
  if (chapter === "intro") return "prologue";
  if (chapter === "arrive") return "arrive";
  if (chapter === "aftermath") return "aftermath";
  if (chapter === "midpoint") return "midpoint";
  return "ending";
}

export function recapFromChapter(
  chapter: CampaignChapter,
  round: number,
  shots: Shot[]
): RecapEntry {
  const kind = chapterToKind(chapter);
  return {
    id: `${kind}-${round}`,
    kind,
    title: recapTitle(kind, round),
    round,
    shots,
  };
}

export function totalRounds() {
  return INTERVIEWERS.length;
}

export function completedContacts(contacts: AssignedContact[]) {
  return contacts.filter((item) => item.verdict);
}

export function activeContact(contacts: AssignedContact[]) {
  return contacts.find((item) => !item.verdict) ?? null;
}

export function campaignEnded(contacts: AssignedContact[]) {
  return (
    completedContacts(contacts).length >= totalRounds() &&
    !activeContact(contacts)
  );
}

export function aftermathLine(decision: VerdictDecision) {
  switch (decision) {
    case "hire":
      return "They stamped hired. That is not the same as free to leave.";
    case "reject":
      return "They stamped rejected. The next interviewer received the stamp anyway.";
    case "callback":
      return "They want another hour. PROBE scheduled someone else first.";
    case "obsessed":
      return "The letter was not professional. The board kept it on file.";
  }
}

export function currentRoundLabel(
  campaign: CampaignState,
  contacts: AssignedContact[]
) {
  if (campaignEnded(contacts) || campaign.chapter === "ending") return "Ending";
  if (!campaign.seed) return "The night has not started";
  if (contacts.length === 0) return campaign.cutsceneDone ? "Continue" : "Prologue";
  const done = completedContacts(contacts).length;
  const current = activeContact(contacts);
  const remaining = totalRounds() - contacts.length;
  const round = done + (current || remaining > 0 ? 1 : 0);
  if (!campaign.cutsceneDone) return `Cutscene · Hour ${round}`;
  return `Hour ${round} of ${totalRounds()}`;
}

export type EndingKey = "kept" | "staff" | "sample" | "mixed";

export function endingKey(contacts: AssignedContact[]): EndingKey {
  const done = completedContacts(contacts);
  const hires = done.filter((item) => item.verdict?.decision === "hire").length;
  const obsessed = done.filter(
    (item) => item.verdict?.decision === "obsessed"
  ).length;
  if (obsessed >= 3) return "kept";
  if (hires >= 6) return "staff";
  if (hires === 0) return "sample";
  return "mixed";
}

export function endingTitle(contacts: AssignedContact[]) {
  switch (endingKey(contacts)) {
    case "kept":
      return "They kept you";
    case "staff":
      return "Staff adjacent";
    case "sample":
      return "Sample closed";
    case "mixed":
      return "Mixed file";
  }
}

export function epilogue(contacts: AssignedContact[]) {
  return {
    kicker: "Ending",
    title: endingTitle(contacts),
    body: aftermathLine("callback"),
  };
}

export function reconcileCampaign(contacts: AssignedContact[]) {
  if (!isBrowser()) return;
  const state = readCampaign();
  const current = activeContact(contacts);
  const done = completedContacts(contacts);
  const remaining = totalRounds() - contacts.length;

  if (current) {
    if (state.chapter !== "arrive") {
      writeCampaign({
        ...state,
        chapter: "arrive",
        panel: 0,
        cutsceneDone: false,
      });
    }
    return;
  }

  if (state.chapter === "midpoint" && !state.midpointSeen) {
    return;
  }

  if (done.length > 0 && remaining > 0) {
    if (state.chapter !== "aftermath" && state.chapter !== "midpoint") {
      writeCampaign({
        ...state,
        chapter: "aftermath",
        panel: 0,
        cutsceneDone: false,
      });
    }
    return;
  }

  if (campaignEnded(contacts)) {
    if (state.chapter === "arrive") {
      writeCampaign({
        ...state,
        chapter: "aftermath",
        panel: 0,
        cutsceneDone: false,
      });
      return;
    }
    if (state.chapter !== "ending" && state.chapter !== "aftermath") {
      writeCampaign({
        ...state,
        chapter: "ending",
        panel: 0,
        cutsceneDone: false,
      });
    }
    return;
  }

  if (contacts.length === 0 && state.chapter !== "intro") {
    writeCampaign({
      ...state,
      chapter: "intro",
      panel: 0,
      cutsceneDone: false,
    });
  }
}
