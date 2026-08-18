import { INTERVIEWERS } from "@/lib/interviewers";
import { applyJobs, type AssignedContact } from "@/lib/contacts";
import type { VerdictDecision } from "@/lib/verdict";

const STORAGE_VERSION = 1;
const KEY = `probe:campaign:v${STORAGE_VERSION}`;
export const CAMPAIGN_EVENT = "probe:campaign-changed";

export type CampaignState = {
  version: typeof STORAGE_VERSION;
  introDone: boolean;
  playerJob: string | null;
};

const EMPTY: CampaignState = {
  version: STORAGE_VERSION,
  introDone: false,
  playerJob: null,
};

export const EMPTY_SNAPSHOT = JSON.stringify(EMPTY);

export const JOB_HOOKS: Record<string, string> = {
  "Game Testing": "They need someone who can ruin a build before the public does.",
  "Corporate HR": "They want a person who can sit in a room and not look away.",
  "Corporate Security": "Access is a privilege. They will ask where you sleep.",
  "People Wellness": "Care is the product. Belonging is the price.",
  "Brand & Design": "Taste is a weapon. They will ask who the work belongs to.",
  "Biotech Research": "The sample size is you. Stay polite.",
  "Customer Support": "Tickets never close. Neither do the people who work them.",
  "Private Equity": "They hunt value. They will measure you for it.",
  "Social Media": "Attention is intimate. They already watched you apply.",
  "Facilities & Ops": "The building has hours. Some of them are only for staff.",
  "Legal Compliance": "The record will be perfect. Your memory does not have to be.",
  "Esports Coaching": "They do not want nice. They want someone who can take a 2am call.",
};

export const ROUND_BRIEFINGS = [
  {
    kicker: "Round 1",
    title: "Your file was pulled",
    body: "PROBE does not post jobs. A name on a list is enough. Sit still. The first interviewer will message you. Do not ask who recommended you.",
  },
  {
    kicker: "Round 2",
    title: "They already talked",
    body: "Your last conversation was forwarded. The next person has notes. They will not tell you what those notes say.",
  },
  {
    kicker: "Round 3",
    title: "The building knows you",
    body: "Badge printers are faster than offers. Someone new wants a private hour. Keep your answers short.",
  },
  {
    kicker: "Round 4",
    title: "No one is HR anymore",
    body: "The tone changed. They still call it an interview. You will still sit down.",
  },
  {
    kicker: "Round 5",
    title: "Your specialty is a rumor",
    body: "They asked for you by the role you claimed. They may not honor it. Go anyway.",
  },
  {
    kicker: "Round 6",
    title: "Halfway is not safety",
    body: "People who leave early do not get letters. People who stay get worse rooms.",
  },
  {
    kicker: "Round 7",
    title: "The notes got personal",
    body: "Someone underlined things you did not say. Correct them if you can. Do not accuse the interviewer.",
  },
  {
    kicker: "Round 8",
    title: "The board is watching live",
    body: "This one has an audience you will never meet. Speak as if the walls take minutes.",
  },
  {
    kicker: "Round 9",
    title: "You are being kept",
    body: "Rejection and affection look the same on their stationery. Finish the hour.",
  },
  {
    kicker: "Round 10",
    title: "Almost staff",
    body: "The next contact thinks they already own your evenings. That is not a metaphor they will explain.",
  },
  {
    kicker: "Round 11",
    title: "One more door",
    body: "If you run, the file still exists. If you enter, you may get a letter. Both are permanent.",
  },
  {
    kicker: "Round 12",
    title: "Final contact",
    body: "This is the last interviewer in the building tonight. After this, PROBE writes the ending. You do not.",
  },
];

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
    return {
      version: STORAGE_VERSION,
      introDone: Boolean(parsed.introDone),
      playerJob:
        typeof parsed.playerJob === "string" && parsed.playerJob.trim()
          ? parsed.playerJob
          : null,
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
    return {
      version: STORAGE_VERSION,
      introDone: Boolean(parsed.introDone),
      playerJob: parsed.playerJob || null,
    };
  } catch {
    return EMPTY;
  }
}

export function jobHook(job: string) {
  return JOB_HOOKS[job] || "They have a chair with your name on the calendar.";
}

export function briefingForRound(roundNumber: number) {
  const index = Math.min(
    ROUND_BRIEFINGS.length - 1,
    Math.max(0, roundNumber - 1)
  );
  return ROUND_BRIEFINGS[index]!;
}

export function totalRounds() {
  return INTERVIEWERS.length;
}

export function campaignJobs() {
  return applyJobs();
}

export function completedContacts(contacts: AssignedContact[]) {
  return contacts.filter((item) => item.verdict);
}

export function activeContact(contacts: AssignedContact[]) {
  return contacts.find((item) => !item.verdict) ?? null;
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
  if (!campaign.playerJob) return "The story assigns your contacts";
  const done = completedContacts(contacts).length;
  const current = activeContact(contacts);
  const remaining = totalRounds() - contacts.length;
  if (!current && remaining <= 0 && done > 0) {
    return `Ending · ${campaign.playerJob}`;
  }
  const round = done + (current || remaining > 0 ? 1 : 0);
  return `Round ${round} of ${totalRounds()} · ${campaign.playerJob}`;
}

export function epilogue(contacts: AssignedContact[]) {
  const hires = completedContacts(contacts).filter(
    (item) => item.verdict?.decision === "hire"
  ).length;
  const obsessed = completedContacts(contacts).filter(
    (item) => item.verdict?.decision === "obsessed"
  ).length;

  if (obsessed >= 3) {
    return {
      kicker: "Ending",
      title: "They kept you",
      body: "Too many letters were personal. PROBE does not send you home. Check your inbox. Do not answer after midnight.",
    };
  }
  if (hires >= 6) {
    return {
      kicker: "Ending",
      title: "Staff adjacent",
      body: "The board likes your numbers. Offers stacked. The building still has your badge pending. That is a kind of yes.",
    };
  }
  if (hires === 0) {
    return {
      kicker: "Ending",
      title: "Sample closed",
      body: "No hire. The printers stay quiet. Your file is complete. You were useful as a measurement.",
    };
  }
  return {
    kicker: "Ending",
    title: "Mixed file",
    body: "Some doors opened. Some letters were cold. PROBE files you as unresolved. The chats remain if they want another hour.",
  };
}
