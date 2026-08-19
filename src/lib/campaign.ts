import { INTERVIEWERS } from "@/lib/interviewers";
import type { AssignedContact } from "@/lib/contacts";
import type { VerdictDecision } from "@/lib/verdict";

const STORAGE_VERSION = 3;
const KEY = `probe:campaign:v${STORAGE_VERSION}`;
export const CAMPAIGN_EVENT = "probe:campaign-changed";

export type CampaignChapter = "intro" | "meet" | "aftermath" | "ending";

export type CampaignState = {
  version: typeof STORAGE_VERSION;
  chapter: CampaignChapter;
  panel: number;
};

export type StoryPage = {
  kicker: string;
  title: string;
  beats: string[];
};

const EMPTY: CampaignState = {
  version: STORAGE_VERSION,
  chapter: "intro",
  panel: 0,
};

export const EMPTY_SNAPSHOT = JSON.stringify(EMPTY);

function page(kicker: string, title: string, beats: string[]): StoryPage {
  return { kicker, title, beats };
}

export const INTRO_PAGES: StoryPage[] = [
  page("PROBE", "They already have your name", [
    "This is not a job board. There is no listing and no department menu.",
    "A clerk you will never meet printed your name. That was the application.",
    "You do not pick the role. The building sends someone. You sit down.",
  ]),
  page("The loop", "Twelve hours. One file.", [
    "Each contact messages you first. Each hour ends with a letter.",
    "They will not tell you what they are. You answer anyway.",
    "After twelve, PROBE writes the ending. The chats are the only door.",
  ]),
];

export const ROUND_PAGES: StoryPage[] = [
  page("Round 1", "Your file was pulled", [
    "A name on a list was enough. Do not ask who recommended you.",
    "The first interviewer will message. The hour starts when they decide.",
  ]),
  page("Round 2", "They already talked", [
    "Your last conversation was forwarded. The next person has notes.",
    "They will not tell you what those notes say. Keep answers short.",
  ]),
  page("Round 3", "The building knows you", [
    "Badge printers are faster than offers. Someone new wants a private hour.",
    "The chair may still be warm. Do not mention it.",
  ]),
  page("Round 4", "No one is HR anymore", [
    "The tone changed. They still call it an interview.",
    "Titles on the door will not match titles in the chat. Sit anyway.",
  ]),
  page("Round 5", "The role is a rumor", [
    "They asked for you by a heading you never claimed.",
    "The assignment is already printed. Refusing is a different letter.",
  ]),
  page("Round 6", "Halfway is not safety", [
    "People who leave early do not get copies of their file.",
    "Speak as if the walls take minutes. They do.",
  ]),
  page("Round 7", "The notes got personal", [
    "Someone underlined things you did not say.",
    "Correct them if you can. Do not accuse the interviewer.",
  ]),
  page("Round 8", "The board is watching", [
    "This one has an audience you will never meet.",
    "Every pause is a line in a document you cannot see.",
  ]),
  page("Round 9", "You are being kept", [
    "Rejection and affection look the same on their stationery.",
    "Tomorrow is already blocked. You did not block it.",
  ]),
  page("Round 10", "Almost staff", [
    "The next contact thinks they already own your evenings.",
    "That is not a metaphor they will explain. Ask about the work only.",
  ]),
  page("Round 11", "One more door", [
    "If you run, the file still exists. If you enter, you may get a letter.",
    "Both are permanent. Sit. Pretend this is still about a job.",
  ]),
  page("Round 12", "Final contact", [
    "This is the last interviewer in the building tonight.",
    "After this, PROBE writes the ending. You do not.",
  ]),
];

export const AFTERMATH_PAGES: Record<VerdictDecision, StoryPage[]> = {
  hire: [
    page("Letter", "They stamped hired", [
      "Hired is not the same as free to leave. A badge pending is a hook.",
      "The next interviewer received the stamp anyway. Keep walking.",
    ]),
  ],
  reject: [
    page("Letter", "They stamped rejected", [
      "Your name did not leave the list. It moved down.",
      "A no is still an hour for someone else. You do not get a vote.",
    ]),
  ],
  callback: [
    page("Letter", "They want another hour", [
      "Callback. PROBE scheduled someone else first.",
      "Later is not a redo. Tonight continues.",
    ]),
  ],
  obsessed: [
    page("Letter", "The letter was not professional", [
      "The board kept it on file anyway. Do not answer after midnight.",
      "The next contact already read the unprofessional parts.",
    ]),
  ],
};

export const ENDING_PAGES = {
  kept: [
    page("Ending", "They kept you", [
      "Too many letters were personal. PROBE does not send you home.",
      "Check your inbox. Do not answer after midnight. The chats remain.",
    ]),
  ],
  staff: [
    page("Ending", "Staff adjacent", [
      "The board likes your numbers. Offers stacked.",
      "Your badge is still pending. That is a kind of yes. Keep the letters.",
    ]),
  ],
  sample: [
    page("Ending", "Sample closed", [
      "No hire. The printers stay quiet. You were useful as a measurement.",
      "A new name is already printed. The chats remain if they want another sample.",
    ]),
  ],
  mixed: [
    page("Ending", "Mixed file", [
      "Some doors opened. Some letters were cold. PROBE files you as unresolved.",
      "The chats remain if they want another hour.",
    ]),
  ],
} as const;

export type EndingKey = keyof typeof ENDING_PAGES;

function isBrowser() {
  return typeof window !== "undefined";
}

function notify() {
  window.dispatchEvent(new Event(CAMPAIGN_EVENT));
}

function isChapter(value: unknown): value is CampaignChapter {
  return (
    value === "intro" ||
    value === "meet" ||
    value === "aftermath" ||
    value === "ending"
  );
}

export function readCampaign(): CampaignState {
  if (!isBrowser()) return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as CampaignState;
    if (!parsed || parsed.version !== STORAGE_VERSION) return EMPTY;
    if (!isChapter(parsed.chapter)) return EMPTY;
    return {
      version: STORAGE_VERSION,
      chapter: parsed.chapter,
      panel: Math.max(0, Number(parsed.panel) || 0),
    };
  } catch {
    return EMPTY;
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
    if (!isChapter(parsed.chapter)) return EMPTY;
    return {
      version: STORAGE_VERSION,
      chapter: parsed.chapter,
      panel: Math.max(0, Number(parsed.panel) || 0),
    };
  } catch {
    return EMPTY;
  }
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
  if (contacts.length === 0) return "Continue the story";
  const done = completedContacts(contacts).length;
  const current = activeContact(contacts);
  const remaining = totalRounds() - contacts.length;
  const round = done + (current || remaining > 0 ? 1 : 0);
  return `Round ${round} of ${totalRounds()}`;
}

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

export function epilogue(contacts: AssignedContact[]) {
  const pages = ENDING_PAGES[endingKey(contacts)];
  const first = pages[0]!;
  return {
    kicker: first.kicker,
    title: first.title,
    body: first.beats.join(" "),
  };
}

export function roundPage(roundNumber: number) {
  const index = Math.min(
    ROUND_PAGES.length - 1,
    Math.max(0, roundNumber - 1)
  );
  return ROUND_PAGES[index]!;
}

export function briefingForRound(roundNumber: number) {
  const first = roundPage(roundNumber);
  return {
    kicker: first.kicker,
    title: first.title,
    body: first.beats.join(" "),
  };
}

export function meetPage(
  name: string,
  job: string,
  roundNumber: number
): StoryPage {
  const briefing = roundPage(roundNumber);
  return page(briefing.kicker, briefing.title, [
    ...briefing.beats,
    `${name} has the hour. The building assigned ${job}. They will message first.`,
  ]);
}

export function pagesForChapter(
  chapter: CampaignChapter,
  contacts: AssignedContact[]
): StoryPage[] {
  const done = completedContacts(contacts);
  const current = activeContact(contacts);
  const remaining = totalRounds() - contacts.length;
  const roundNumber = done.length + (current || remaining > 0 ? 1 : 0);

  switch (chapter) {
    case "intro":
      return INTRO_PAGES;
    case "meet":
      return current
        ? [meetPage(currentName(current), current.appliedJob, Math.max(1, roundNumber))]
        : [roundPage(Math.max(1, roundNumber))];
    case "aftermath": {
      const last = done[0];
      return last?.verdict
        ? AFTERMATH_PAGES[last.verdict.decision]
        : INTRO_PAGES;
    }
    case "ending":
      return [...ENDING_PAGES[endingKey(contacts)]];
  }
}

function currentName(contact: AssignedContact) {
  return (
    INTERVIEWERS.find((person) => person.id === contact.interviewerId)?.name ||
    "Someone"
  );
}

export function reconcileCampaign(contacts: AssignedContact[]) {
  if (!isBrowser()) return;
  const state = readCampaign();
  const current = activeContact(contacts);
  const done = completedContacts(contacts);
  const remaining = totalRounds() - contacts.length;

  if (current) {
    if (state.chapter !== "meet") {
      writeCampaign({ version: STORAGE_VERSION, chapter: "meet", panel: 0 });
    }
    return;
  }

  if (done.length > 0 && remaining > 0) {
    if (state.chapter !== "aftermath") {
      writeCampaign({
        version: STORAGE_VERSION,
        chapter: "aftermath",
        panel: 0,
      });
    }
    return;
  }

  if (campaignEnded(contacts)) {
    if (state.chapter === "meet") {
      writeCampaign({
        version: STORAGE_VERSION,
        chapter: "aftermath",
        panel: 0,
      });
      return;
    }
    if (state.chapter !== "ending" && state.chapter !== "aftermath") {
      writeCampaign({ version: STORAGE_VERSION, chapter: "ending", panel: 0 });
    }
    return;
  }

  if (contacts.length === 0 && state.chapter !== "intro") {
    writeCampaign({ version: STORAGE_VERSION, chapter: "intro", panel: 0 });
  }
}
