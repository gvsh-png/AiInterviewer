"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { INTERVIEWERS } from "@/lib/interviewers";
import {
  getConversationIndexSnapshot,
  parseConversationIndex,
  relativeTime,
  subscribeToConversationIndex,
} from "@/lib/chatStorage";
import PersonaAvatar from "@/components/PersonaAvatar";
import MessengerNav from "@/components/MessengerNav";

type ContactsSidebarProps = {
  selectedId?: string;
  compact?: boolean;
};

export default function ContactsSidebar({
  selectedId,
  compact = false,
}: ContactsSidebarProps) {
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const indexRaw = useSyncExternalStore(
    subscribeToConversationIndex,
    getConversationIndexSnapshot,
    () => "[]"
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const contacts = useMemo(() => {
    const index = parseConversationIndex(indexRaw);
    const summaryMap = new Map(index.map((item) => [item.interviewerId, item]));
    const orderMap = new Map(index.map((item, position) => [item.interviewerId, position]));
    const normalizedQuery = query.trim().toLowerCase();

    return INTERVIEWERS.filter((person) => {
      if (!normalizedQuery) return true;
      return [
        person.name,
        person.job,
        person.title,
        person.company,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    })
      .map((person, originalPosition) => ({
        person,
        summary: summaryMap.get(person.id),
        originalPosition,
      }))
      .sort((a, b) => {
        const aRank = orderMap.get(a.person.id);
        const bRank = orderMap.get(b.person.id);
        if (aRank !== undefined && bRank !== undefined) return aRank - bRank;
        if (aRank !== undefined) return -1;
        if (bRank !== undefined) return 1;
        return a.originalPosition - b.originalPosition;
      });
  }, [indexRaw, query]);

  return (
    <aside className={`contacts-panel ${compact ? "compact" : ""}`}>
      <header className="contacts-header">
        <div>
          <p className="app-kicker">PROBE</p>
          <h1>Chats</h1>
        </div>
        <Link href="/settings" className="icon-button" aria-label="Settings">
          <svg viewBox="0 0 24 24" aria-hidden>
            <circle cx="12" cy="12" r="3" />
            <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1A8 8 0 0 0 15 6l-.3-2.5h-4L10.4 6a8 8 0 0 0-1.7 1L6.5 6l-2 3.4L6.6 11a7 7 0 0 0 0 2l-2.1 1.5 2 3.4 2.3-1A8 8 0 0 0 10.4 18l.3 2.5h4L15 18a8 8 0 0 0 1.7-1l2.3 1 2-3.4-2.1-1.5a7 7 0 0 0 .1-1Z" />
          </svg>
        </Link>
      </header>

      <label className="chat-search">
        <svg viewBox="0 0 24 24" aria-hidden>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m15.5 15.5 5 5" />
        </svg>
        <span className="sr-only">Search chats</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          type="search"
        />
      </label>

      <div className="contacts-list" role="list">
        {contacts.map(({ person, summary }) => (
          <Link
            key={person.id}
            href={`/interview/${person.id}`}
            className={`contact-row ${selectedId === person.id ? "selected" : ""}`}
            style={
              {
                "--contact-accent": person.theme.sulfur,
                "--contact-soft": person.theme.moss,
              } as CSSProperties
            }
            role="listitem"
          >
            <PersonaAvatar interviewer={person} size="md" />
            <div className="contact-main">
              <div className="contact-title-row">
                <strong>{person.name}</strong>
                <time>
                  {summary?.updatedAt
                    ? relativeTime(summary.updatedAt, now)
                    : ""}
                </time>
              </div>
              <div className="contact-preview-row">
                <p>{summary?.preview || person.job}</p>
                {summary?.hasHistory ? (
                  <span className="contact-dot" aria-label="Has conversation" />
                ) : null}
              </div>
            </div>
          </Link>
        ))}

        {contacts.length === 0 ? (
          <p className="empty-search">No contacts found.</p>
        ) : null}
      </div>

      {!compact ? <MessengerNav active="chats" /> : null}
    </aside>
  );
}
