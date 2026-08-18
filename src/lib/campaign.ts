import { INTERVIEWERS } from "@/lib/interviewers";
import type { AssignedContact } from "@/lib/contacts";
import type { VerdictDecision } from "@/lib/verdict";

const STORAGE_VERSION = 2;
const KEY = `probe:campaign:v${STORAGE_VERSION}`;
export const CAMPAIGN_EVENT = "probe:campaign-changed";

export type CampaignChapter =
  | "intro"
  | "briefing"
  | "meet"
  | "aftermath"
  | "ending";

export type CampaignState = {
  version: typeof STORAGE_VERSION;
  chapter: CampaignChapter;
  panel: number;
};

export type PanelArt =
  | "building"
  | "file"
  | "chair"
  | "door"
  | "phone"
  | "stamp"
  | "list"
  | "clock"
  | "badge"
  | "letter"
  | "windows"
  | "hallway";

export type StoryFrame = {
  art: PanelArt;
  text: string;
};

export type StoryPage = {
  kicker: string;
  title: string;
  frames: [StoryFrame, StoryFrame, StoryFrame];
};

const EMPTY: CampaignState = {
  version: STORAGE_VERSION,
  chapter: "intro",
  panel: 0,
};

export const EMPTY_SNAPSHOT = JSON.stringify(EMPTY);

function page(
  kicker: string,
  title: string,
  frames: [StoryFrame, StoryFrame, StoryFrame]
): StoryPage {
  return { kicker, title, frames };
}

export const INTRO_PAGES: StoryPage[] = [
  page("PROBE", "The building does not advertise", [
    { art: "building", text: "No listing. No lobby music. The glass just says PROBE." },
    { art: "list", text: "A clerk you will never meet printed your name at 4:12." },
    { art: "chair", text: "They saved you a chair. That is not the same as an invitation." },
  ]),
  page("Intake", "You do not pick the job", [
    { art: "file", text: "There is no application. Departments are not a menu." },
    { art: "door", text: "Whoever is free gets the hour. You sit down anyway." },
    { art: "stamp", text: "Asking for a role by name gets a note on the file. Do not ask." },
  ]),
  page("The loop", "Twelve contacts. One file.", [
    { art: "phone", text: "People will message you. Not all at once. Not by your request." },
    { art: "clock", text: "Each hour ends with a letter. Keep it. They already copied it." },
    { art: "badge", text: "The chats are the only door they will open tonight." },
  ]),
  page("Rule", "Sit through the hour", [
    { art: "hallway", text: "The building assigns the contact. The contact assigns the role." },
    { art: "windows", text: "You will not be told what they are. You will still answer." },
    { art: "letter", text: "After twelve, PROBE writes the ending. You do not." },
  ]),
];

export const ROUND_PAGES: StoryPage[][] = [
  [
    page("Round 1", "Your file was pulled", [
      { art: "list", text: "PROBE does not post jobs. A name on a list is enough." },
      { art: "phone", text: "The first interviewer will message you. Do not ask who recommended you." },
      { art: "chair", text: "Sit still. The hour starts when they decide it starts." },
    ]),
    page("Round 1", "They are already in the building", [
      { art: "hallway", text: "Badge lights are on for someone who is not you." },
      { art: "file", text: "Your cover is whatever they typed. You did not type it." },
      { art: "door", text: "The first door is the kindest one. That is not a comfort." },
    ]),
  ],
  [
    page("Round 2", "They already talked", [
      { art: "file", text: "Your last conversation was forwarded. The next person has notes." },
      { art: "windows", text: "They will not tell you what those notes say." },
      { art: "phone", text: "A second contact is already typing. Keep your answers short." },
    ]),
    page("Round 2", "The copy arrived first", [
      { art: "letter", text: "Someone underlined a sentence you do not remember saying." },
      { art: "clock", text: "The calendar shows you as available. You were not asked." },
      { art: "door", text: "Go in. Correcting the file is later. If it is allowed." },
    ]),
  ],
  [
    page("Round 3", "The building knows you", [
      { art: "badge", text: "Badge printers are faster than offers." },
      { art: "hallway", text: "Someone new wants a private hour. Keep walking." },
      { art: "chair", text: "The chair is still warm. Do not mention it." },
    ]),
    page("Round 3", "A worse room", [
      { art: "windows", text: "The glass does not show the street from this floor." },
      { art: "stamp", text: "Your name is already on a second stamp. Unused. Waiting." },
      { art: "phone", text: "They will call it an interview. It is still an hour." },
    ]),
  ],
  [
    page("Round 4", "No one is HR anymore", [
      { art: "building", text: "The tone changed. They still call it an interview." },
      { art: "door", text: "You will still sit down. The door still closes." },
      { art: "list", text: "Titles on the door do not match titles in the chat." },
    ]),
    page("Round 4", "The hour is the product", [
      { art: "clock", text: "They measure how long you stay after it gets strange." },
      { art: "file", text: "Do not ask to speak to a manager. There is only the next contact." },
      { art: "chair", text: "Sit. The building is listening in a way that takes minutes." },
    ]),
  ],
  [
    page("Round 5", "Your specialty is a rumor", [
      { art: "stamp", text: "They asked for you by a role you never claimed." },
      { art: "file", text: "They may not honor it. The assignment is already printed." },
      { art: "door", text: "Go anyway. Refusing is a different kind of letter." },
    ]),
    page("Round 5", "Halfway is a rumor too", [
      { art: "hallway", text: "People who leave early do not get copies of their file." },
      { art: "phone", text: "The next interviewer already used your first name." },
      { art: "windows", text: "Keep your answers short. The glass keeps everything else." },
    ]),
  ],
  [
    page("Round 6", "Halfway is not safety", [
      { art: "clock", text: "Six hours in. The printers have not slowed down." },
      { art: "letter", text: "People who stay get worse rooms and better stationery." },
      { art: "badge", text: "A badge pending is not a badge. Do not celebrate." },
    ]),
    page("Round 6", "The board has a live feed", [
      { art: "windows", text: "Someone is watching a screen that is only your mouth." },
      { art: "file", text: "Speak as if the walls take minutes. They do." },
      { art: "door", text: "The sixth door does not lock. That is not a kindness." },
    ]),
  ],
  [
    page("Round 7", "The notes got personal", [
      { art: "file", text: "Someone underlined things you did not say." },
      { art: "stamp", text: "Correct them if you can. Do not accuse the interviewer." },
      { art: "phone", text: "The next contact likes when you notice the underlines." },
    ]),
    page("Round 7", "A private hour", [
      { art: "chair", text: "They dimmed the room. They still want a hire decision." },
      { art: "letter", text: "Affection and rejection use the same letterhead tonight." },
      { art: "hallway", text: "Finish the hour. The hallway only goes one way." },
    ]),
  ],
  [
    page("Round 8", "The board is watching live", [
      { art: "windows", text: "This one has an audience you will never meet." },
      { art: "clock", text: "They asked for fewer jokes and more silence." },
      { art: "badge", text: "Staff adjacent is a phrase they use when they are hungry." },
    ]),
    page("Round 8", "Minutes", [
      { art: "file", text: "Every pause is a line in a document you cannot see." },
      { art: "door", text: "If you run, the file still exists." },
      { art: "phone", text: "If you enter, you may get a letter. Both are permanent." },
    ]),
  ],
  [
    page("Round 9", "You are being kept", [
      { art: "letter", text: "Rejection and affection look the same on their stationery." },
      { art: "chair", text: "Finish the hour. Leaving early is a different stamp." },
      { art: "list", text: "Your name moved from applicants to a list with no header." },
    ]),
    page("Round 9", "The calendar owns you", [
      { art: "clock", text: "Tomorrow is already blocked. You did not block it." },
      { art: "phone", text: "They will say it is standard. It is not." },
      { art: "building", text: "The building likes people who stay for round nine." },
    ]),
  ],
  [
    page("Round 10", "Almost staff", [
      { art: "badge", text: "The next contact thinks they already own your evenings." },
      { art: "door", text: "That is not a metaphor they will explain." },
      { art: "file", text: "Ask about the role if you must. Do not ask about the evenings." },
    ]),
    page("Round 10", "A longer hour", [
      { art: "hallway", text: "The rooms got smaller. The letters got longer." },
      { art: "stamp", text: "Hired still means you come back. Rejected still means you come back." },
      { art: "windows", text: "Two more doors. The glass is darker on purpose." },
    ]),
  ],
  [
    page("Round 11", "One more door", [
      { art: "door", text: "If you run, the file still exists." },
      { art: "letter", text: "If you enter, you may get a letter. Both are permanent." },
      { art: "list", text: "There is one unused name left on the night's roster." },
    ]),
    page("Round 11", "The printers wait", [
      { art: "stamp", text: "They loaded a last tray of paper. It is not optional." },
      { art: "chair", text: "Sit. Pretend this is still about a job." },
      { art: "phone", text: "The last interviewer but one is already in the thread." },
    ]),
  ],
  [
    page("Round 12", "Final contact", [
      { art: "building", text: "This is the last interviewer in the building tonight." },
      { art: "clock", text: "After this, PROBE writes the ending. You do not." },
      { art: "letter", text: "Keep the letter. The chats remain if they want another hour." },
    ]),
    page("Round 12", "Close the loop", [
      { art: "file", text: "Twelve names. One of them is still waiting to stamp you." },
      { art: "hallway", text: "There is no lobby on the way out. There never was." },
      { art: "badge", text: "Finish the hour. Then read what the board decided you are." },
    ]),
  ],
];

export const AFTERMATH_PAGES: Record<VerdictDecision, StoryPage[]> = {
  hire: [
    page("Letter", "They stamped HIRED", [
      { art: "stamp", text: "Hired is not the same as free to leave." },
      { art: "badge", text: "A badge pending is a hook. They will use it." },
      { art: "door", text: "The next interviewer received the stamp anyway." },
    ]),
    page("Forwarded", "Your yes is already circulating", [
      { art: "file", text: "They copied the letter to a floor you will never see." },
      { art: "phone", text: "Someone liked the way you stayed. That is a problem." },
      { art: "hallway", text: "Keep walking. The building is not done with you." },
    ]),
  ],
  reject: [
    page("Letter", "They stamped REJECTED", [
      { art: "stamp", text: "Rejected. The next interviewer received the stamp anyway." },
      { art: "list", text: "Your name did not leave the list. It moved down." },
      { art: "door", text: "A no is still an hour for someone else." },
    ]),
    page("Forwarded", "The no is useful", [
      { art: "file", text: "They keep rejects who were interesting. You were interesting." },
      { art: "clock", text: "The calendar did not clear. It filled." },
      { art: "phone", text: "A new contact is being assigned. You do not get a vote." },
    ]),
  ],
  callback: [
    page("Letter", "They want another hour", [
      { art: "clock", text: "Callback. PROBE scheduled someone else first." },
      { art: "phone", text: "They said later. Later is a different person." },
      { art: "chair", text: "The chair stays. You do not get to pick who sits across it." },
    ]),
    page("Forwarded", "Later is a trap", [
      { art: "file", text: "A callback is a bookmark. They will return to the page." },
      { art: "door", text: "Tonight continues. The next door is not a redo." },
      { art: "letter", text: "Keep the letter. It is not a rain check. It is a leash." },
    ]),
  ],
  obsessed: [
    page("Letter", "The letter was not professional", [
      { art: "letter", text: "The board kept it on file anyway." },
      { art: "phone", text: "Do not answer after midnight. They will still type." },
      { art: "windows", text: "Someone watched the hour twice. You only sat through it once." },
    ]),
    page("Forwarded", "They attached a photo of the stationery", [
      { art: "file", text: "Personal letters get a red tab. Red tabs get more hours." },
      { art: "badge", text: "They talk about keeping you like a supply order." },
      { art: "hallway", text: "The next contact already read the unprofessional parts." },
    ]),
  ],
};

export const ENDING_PAGES = {
  kept: [
    page("Ending", "They kept you", [
      { art: "letter", text: "Too many letters were personal." },
      { art: "building", text: "PROBE does not send you home." },
      { art: "phone", text: "Check your inbox. Do not answer after midnight." },
    ]),
    page("Ending", "The file stays open", [
      { art: "badge", text: "Staff adjacent. Owned. The words got mixed." },
      { art: "windows", text: "The glass still says PROBE. It is looking in now." },
      { art: "chair", text: "The chats remain. That is the whole trick." },
    ]),
  ],
  staff: [
    page("Ending", "Staff adjacent", [
      { art: "stamp", text: "The board likes your numbers. Offers stacked." },
      { art: "badge", text: "The building still has your badge pending. That is a kind of yes." },
      { art: "door", text: "You can leave. The calendar does not believe you." },
    ]),
    page("Ending", "A kind of yes", [
      { art: "file", text: "Hired more than once is not freedom. It is a pattern." },
      { art: "clock", text: "They will call it onboarding if you come back." },
      { art: "letter", text: "Keep the letters. They already have copies." },
    ]),
  ],
  sample: [
    page("Ending", "Sample closed", [
      { art: "stamp", text: "No hire. The printers stay quiet." },
      { art: "file", text: "Your file is complete. You were useful as a measurement." },
      { art: "building", text: "The glass does not show you on the way out." },
    ]),
    page("Ending", "The list without you", [
      { art: "list", text: "A new name is already printed at 4:12." },
      { art: "chair", text: "The chair is empty. It will not stay empty." },
      { art: "letter", text: "The chats remain if they want another sample." },
    ]),
  ],
  mixed: [
    page("Ending", "Mixed file", [
      { art: "file", text: "Some doors opened. Some letters were cold." },
      { art: "stamp", text: "PROBE files you as unresolved." },
      { art: "phone", text: "The chats remain if they want another hour." },
    ]),
    page("Ending", "Unresolved", [
      { art: "hallway", text: "You can walk the hallway. It still only goes one way." },
      { art: "windows", text: "The building does not owe you a clean ending." },
      { art: "badge", text: "Pending. Rejected. Kept. All of it is still on the desk." },
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

function isChapter(value: unknown): value is CampaignChapter {
  return (
    value === "intro" ||
    value === "briefing" ||
    value === "meet" ||
    value === "aftermath" ||
    value === "ending"
  );
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
      return "They stamped HIRED. That is not the same as free to leave.";
    case "reject":
      return "They stamped REJECTED. The next interviewer received the stamp anyway.";
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
  if (contacts.length === 0) return "Story mode";
  const done = completedContacts(contacts).length;
  const current = activeContact(contacts);
  const remaining = totalRounds() - contacts.length;
  const round = done + (current || remaining > 0 ? 1 : 0);
  return `Round ${round} of ${totalRounds()}`;
}

export function endingKey(contacts: AssignedContact[]): EndingKey {
  const done = completedContacts(contacts);
  const hires = done.filter((item) => item.verdict?.decision === "hire").length;
  const obsessed = done.filter((item) => item.verdict?.decision === "obsessed").length;
  if (obsessed >= 3) return "kept";
  if (hires >= 6) return "staff";
  if (hires === 0) return "sample";
  return "mixed";
}

export function epilogue(contacts: AssignedContact[]) {
  const pages = ENDING_PAGES[endingKey(contacts)];
  const last = pages[pages.length - 1]!;
  return {
    kicker: last.kicker,
    title: pages[0]!.title,
    body: pages[0]!.frames.map((frame) => frame.text).join(" "),
  };
}

export function roundPages(roundNumber: number) {
  const index = Math.min(
    ROUND_PAGES.length - 1,
    Math.max(0, roundNumber - 1)
  );
  return ROUND_PAGES[index]!;
}

export function briefingForRound(roundNumber: number) {
  const first = roundPages(roundNumber)[0]!;
  return {
    kicker: first.kicker,
    title: first.title,
    body: first.frames.map((frame) => frame.text).join(" "),
  };
}

export function meetPage(name: string, job: string): StoryPage {
  return page("Assigned", "They did not ask what you wanted", [
    { art: "phone", text: `${name} has the hour. You did not book it.` },
    { art: "file", text: `The building assigned ${job}. There is no other option.` },
    { art: "chair", text: "They will message first. Do not call the desk." },
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
    case "briefing":
      return roundPages(Math.max(1, roundNumber));
    case "meet":
      return current
        ? [meetPage(currentName(current), current.appliedJob)]
        : roundPages(Math.max(1, roundNumber));
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
    if (state.chapter !== "briefing" && state.chapter !== "meet") {
      writeCampaign({ version: STORAGE_VERSION, chapter: "meet", panel: 0 });
    }
    return;
  }

  if (done.length > 0 && remaining > 0) {
    if (state.chapter !== "aftermath" && state.chapter !== "briefing") {
      writeCampaign({
        version: STORAGE_VERSION,
        chapter: "aftermath",
        panel: 0,
      });
    }
    return;
  }

  if (campaignEnded(contacts)) {
    if (state.chapter === "meet" || state.chapter === "briefing") {
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
