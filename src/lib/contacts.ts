import type { InterviewerId } from "@/lib/interviewers";
import { INTERVIEWERS } from "@/lib/interviewers";
import type { InterviewVerdict } from "@/lib/verdict";
import { pickDirective, type HourScore } from "@/lib/gameplay";

const STORAGE_VERSION = 1;
const KEY = `probe:contacts:v${STORAGE_VERSION}`;
export const CONTACTS_EVENT = "probe:contacts-changed";

export type AssignedContact = {
  interviewerId: InterviewerId;
  appliedJob: string;
  createdAt: number;
  preview?: string;
  updatedAt: number;
  verdict?: InterviewVerdict;
  directiveId?: string;
  hourScore?: HourScore;
  callbackPending?: boolean;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function notify() {
  window.dispatchEvent(new Event(CONTACTS_EVENT));
}

export function applyJobs() {
  const seen = new Set<string>();
  const jobs: string[] = [];
  for (const person of INTERVIEWERS) {
    if (seen.has(person.job)) continue;
    seen.add(person.job);
    jobs.push(person.job);
  }
  return jobs;
}

function isInterviewerId(id: string): id is InterviewerId {
  return INTERVIEWERS.some((person) => person.id === id);
}

export function readContacts(): AssignedContact[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AssignedContact[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        isInterviewerId(item.interviewerId) &&
        typeof item.appliedJob === "string" &&
        item.appliedJob.trim()
    );
  } catch {
    return [];
  }
}

function writeContacts(next: AssignedContact[]) {
  window.localStorage.setItem(KEY, JSON.stringify(next));
  notify();
}

export function getContact(interviewerId: string) {
  return readContacts().find((item) => item.interviewerId === interviewerId) ?? null;
}

export function assignedInterviewerIds() {
  return new Set(readContacts().map((item) => item.interviewerId));
}

export function unusedInterviewers() {
  const used = assignedInterviewerIds();
  return INTERVIEWERS.filter((person) => !used.has(person.id));
}

export function assignNextStoryContact(options?: {
  seed?: string;
}): AssignedContact | null {
  if (!isBrowser()) return null;
  const pool = unusedInterviewers();
  if (!pool.length) return null;
  const existing = readContacts();
  const pick = pool[Math.floor(Math.random() * pool.length)]!;
  const used = existing
    .map((item) => item.directiveId)
    .filter((id): id is string => Boolean(id));
  const directive = pickDirective(
    existing.length + 1,
    options?.seed || "probe",
    used
  );
  const contact: AssignedContact = {
    interviewerId: pick.id,
    appliedJob: pick.job,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    preview: "New interview",
    directiveId: directive.id,
  };
  writeContacts([contact, ...existing]);
  return contact;
}

export function updateContact(
  interviewerId: string,
  patch: Partial<AssignedContact>
) {
  if (!isBrowser()) return;
  const next = readContacts().map((item) =>
    item.interviewerId === interviewerId
      ? { ...item, ...patch, updatedAt: Date.now() }
      : item
  );
  writeContacts(next);
}

export function clearAllContacts() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(KEY);
  notify();
}

export function getContactsSnapshot() {
  if (!isBrowser()) return "[]";
  return window.localStorage.getItem(KEY) || "[]";
}

export function subscribeToContacts(onChange: () => void) {
  if (!isBrowser()) return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CONTACTS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CONTACTS_EVENT, onChange);
  };
}

export function parseContactsSnapshot(raw: string): AssignedContact[] {
  try {
    const parsed = JSON.parse(raw) as AssignedContact[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && isInterviewerId(item.interviewerId));
  } catch {
    return [];
  }
}

export function relativeTime(timestamp: number, now = Date.now()) {
  if (!timestamp) return "";
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 45) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
