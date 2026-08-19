"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import { getInterviewer } from "@/lib/interviewers";
import {
  getContactsSnapshot,
  parseContactsSnapshot,
  subscribeToContacts,
  relativeTime,
} from "@/lib/contacts";
import {
  EMPTY_SNAPSHOT,
  currentRoundLabel,
  getCampaignSnapshot,
  parseCampaignSnapshot,
  subscribeToCampaign,
} from "@/lib/campaign";
import { coverJobLine } from "@/lib/cover";
import { verdictLabel } from "@/lib/verdict";
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
  const snapshot = useSyncExternalStore(
    subscribeToContacts,
    getContactsSnapshot,
    () => "[]"
  );
  const campaignRaw = useSyncExternalStore(
    subscribeToCampaign,
    getCampaignSnapshot,
    () => EMPTY_SNAPSHOT
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const contacts = useMemo(() => {
    const assigned = parseContactsSnapshot(snapshot);
    const normalizedQuery = query.trim().toLowerCase();
    return assigned.filter((contact) => {
      const person = getInterviewer(contact.interviewerId);
      if (!person) return false;
      if (!normalizedQuery) return true;
      return [
        person.name,
        person.title,
        person.company,
        contact.appliedJob,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [snapshot, query]);

  const campaign = parseCampaignSnapshot(campaignRaw);
  const assigned = parseContactsSnapshot(snapshot);
  const roundLabel = currentRoundLabel(campaign, assigned);

  return (
    <aside className={`contacts-panel ${compact ? "compact" : ""}`}>
      <header className="contacts-header">
        <div>
          <p className="app-kicker">PROBE</p>
          <h1>Chats</h1>
        </div>
        <div className="header-actions">
          <Link href="/file" className="icon-button" aria-label="File">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M4 7.5h16v12H4Z" />
              <path d="M8 7.5V5.5h8v2" />
            </svg>
          </Link>
          <Link href="/settings" className="icon-button" aria-label="Settings">
            <svg viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="12" r="3" />
              <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1A8 8 0 0 0 15 6l-.3-2.5h-4L10.4 6a8 8 0 0 0-1.7 1L6.5 6l-2 3.4L6.6 11a7 7 0 0 0 0 2l-2.1 1.5 2 3.4 2.3-1A8 8 0 0 0 10.4 18l.3 2.5h4L15 18a8 8 0 0 0 1.7-1l2.3 1 2-3.4-2.1-1.5a7 7 0 0 0 .1-1Z" />
            </svg>
          </Link>
        </div>
      </header>

      <Link href="/story" className="round-chip">
        {roundLabel}
      </Link>

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
        {contacts.map((contact) => {
          const person = getInterviewer(contact.interviewerId);
          if (!person) return null;
          return (
            <Link
              key={contact.interviewerId}
              href={`/interview/${contact.interviewerId}`}
              className={`contact-row ${selectedId === contact.interviewerId ? "selected" : ""}`}
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
                    {contact.updatedAt ? relativeTime(contact.updatedAt, now) : ""}
                  </time>
                </div>
                <div className="contact-preview-row">
                  <p>
                    {contact.verdict
                      ? `${verdictLabel(contact.verdict.decision)}${
                          contact.hourScore
                            ? contact.hourScore.passed
                              ? " · held"
                              : " · flagged"
                            : ""
                        }`
                      : contact.callbackPending
                        ? "Second pass"
                        : contact.preview || coverJobLine(contact.appliedJob)}
                  </p>
                  {contact.preview && !contact.verdict ? (
                    <span className="contact-dot" aria-label="Has conversation" />
                  ) : null}
                </div>
              </div>
            </Link>
          );
        })}

        {contacts.length === 0 ? (
          <div className="empty-contacts">
            <p>No one has messaged you yet.</p>
            <Link href="/story" className="start-chat-button">
              Continue the story
            </Link>
          </div>
        ) : null}
      </div>

      {!compact ? <MessengerNav active="chats" /> : null}
    </aside>
  );
}
