import type { ChatMessage, ConversationMeta } from "@/lib/personality";

const STORAGE_VERSION = 1;
const INDEX_KEY = `probe:chats:index:v${STORAGE_VERSION}`;
const CHAT_PREFIX = `probe:chat:v${STORAGE_VERSION}:`;
export const CHAT_STORAGE_EVENT = "probe:chats-changed";

export type ConversationLine = {
  id: string;
  role: "them" | "you";
  text: string;
  imageUrl?: string;
  imageCaption?: string;
};

export type StoredConversation = {
  version: typeof STORAGE_VERSION;
  interviewerId: string;
  started: boolean;
  lines: ConversationLine[];
  messages: ChatMessage[];
  meta: ConversationMeta;
  updatedAt: number;
};

export type ConversationSummary = {
  interviewerId: string;
  preview: string;
  updatedAt: number;
  hasHistory: boolean;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function chatKey(interviewerId: string) {
  return `${CHAT_PREFIX}${interviewerId}`;
}

function notify() {
  window.dispatchEvent(new Event(CHAT_STORAGE_EVENT));
}

function readIndex(): ConversationSummary[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIndex(next: ConversationSummary[]) {
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(next));
}

function summarize(conversation: StoredConversation): ConversationSummary {
  const lastLine = conversation.lines.at(-1);
  return {
    interviewerId: conversation.interviewerId,
    preview: lastLine?.text.trim() || "Start a conversation",
    updatedAt: conversation.updatedAt,
    hasHistory: conversation.lines.length > 0,
  };
}

function updateIndex(conversation: StoredConversation) {
  const summary = summarize(conversation);
  const next = readIndex().filter(
    (item) => item.interviewerId !== conversation.interviewerId
  );
  next.push(summary);
  next.sort((a, b) => b.updatedAt - a.updatedAt);
  writeIndex(next);
}

function withoutLargeImages(
  conversation: StoredConversation
): StoredConversation {
  return {
    ...conversation,
    lines: conversation.lines.map((line) => ({
      ...line,
      imageUrl: line.imageUrl?.startsWith("data:") ? undefined : line.imageUrl,
    })),
  };
}

export function loadConversation(
  interviewerId: string
): StoredConversation | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(chatKey(interviewerId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConversation;
    if (
      parsed.version !== STORAGE_VERSION ||
      parsed.interviewerId !== interviewerId ||
      !Array.isArray(parsed.lines) ||
      !Array.isArray(parsed.messages)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveConversation(conversation: StoredConversation) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(
      chatKey(conversation.interviewerId),
      JSON.stringify(conversation)
    );
  } catch {
    // Generated base64 photos can exceed localStorage quotas. Preserve the
    // complete text history and cadence metadata if that happens.
    try {
      window.localStorage.setItem(
        chatKey(conversation.interviewerId),
        JSON.stringify(withoutLargeImages(conversation))
      );
    } catch {
      return;
    }
  }

  try {
    updateIndex(conversation);
  } catch {
    /* Conversation storage succeeded; the index is best-effort. */
  }
  notify();
}

export function clearConversation(interviewerId: string) {
  if (!isBrowser()) return;
  window.localStorage.removeItem(chatKey(interviewerId));
  writeIndex(
    readIndex().filter((item) => item.interviewerId !== interviewerId)
  );
  notify();
}

export function clearAllConversations() {
  if (!isBrowser()) return;
  for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(CHAT_PREFIX)) {
      window.localStorage.removeItem(key);
    }
  }
  window.localStorage.removeItem(INDEX_KEY);
  notify();
}

export function getConversationIndexSnapshot() {
  if (!isBrowser()) return "[]";
  return window.localStorage.getItem(INDEX_KEY) || "[]";
}

export function subscribeToConversationIndex(onChange: () => void) {
  if (!isBrowser()) return () => {};
  const storageListener = (event: StorageEvent) => {
    if (event.key === INDEX_KEY || event.key?.startsWith(CHAT_PREFIX)) {
      onChange();
    }
  };
  window.addEventListener("storage", storageListener);
  window.addEventListener(CHAT_STORAGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", storageListener);
    window.removeEventListener(CHAT_STORAGE_EVENT, onChange);
  };
}

export function parseConversationIndex(
  raw: string
): ConversationSummary[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
