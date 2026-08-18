"use client";

import { useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getInterviewer, themeStyle } from "@/lib/interviewers";
import {
  applyJobs,
  assignRandomContact,
  parseContactsSnapshot,
  getContactsSnapshot,
  relativeTime,
  subscribeToContacts,
  unusedInterviewers,
} from "@/lib/contacts";
import { coverJobLine } from "@/lib/cover";
import { verdictLabel } from "@/lib/verdict";
import PersonaAvatar from "@/components/PersonaAvatar";

export default function ContactsInbox() {
  const router = useRouter();
  const [pickingJob, setPickingJob] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const snapshot = useSyncExternalStore(
    subscribeToContacts,
    getContactsSnapshot,
    () => "[]"
  );
  const contacts = useMemo(() => parseContactsSnapshot(snapshot), [snapshot]);
  const jobs = applyJobs();
  const remaining = unusedInterviewers().length;

  const apply = (job: string) => {
    const contact = assignRandomContact(job);
    if (!contact) {
      setAssignError("No interviewers left. You already met everyone.");
      setPickingJob(false);
      return;
    }
    setPickingJob(false);
    setAssignError(null);
    router.push(`/interview/${contact.interviewerId}`);
  };

  return (
    <div className="room roster-room">
      <header className="topbar">
        <p className="mark">PROBE</p>
        <p className="roster-count">
          {contacts.length
            ? `${contacts.length} contact${contacts.length === 1 ? "" : "s"}`
            : "No contacts"}
        </p>
      </header>

      <section className="roster-hero">
        <p className="eyebrow">Inbox</p>
        <h1 className="brand roster-brand">PROBE</h1>
        <p className="lede">
          {contacts.length
            ? "Your interviewers will message you here. They will not tell you what they really are."
            : "You have no contacts yet. Apply for a role and someone will be assigned to interview you."}
        </p>
        <div className="cta-row">
          <button
            type="button"
            className="primary"
            onClick={() => {
              setAssignError(null);
              setPickingJob(true);
            }}
            disabled={remaining === 0}
          >
            Apply for a role
          </button>
        </div>
        {assignError ? <p className="error">{assignError}</p> : null}
      </section>

      {contacts.length > 0 ? (
        <section className="roster-grid">
          {contacts.map((contact) => {
            const person = getInterviewer(contact.interviewerId);
            if (!person) return null;
            return (
              <Link
                key={contact.interviewerId}
                href={`/interview/${contact.interviewerId}`}
                className="roster-card"
                style={themeStyle(person.theme) as CSSProperties}
              >
                <div className="roster-card-media">
                  <PersonaAvatar interviewer={person} size="card" />
                </div>
                <div className="roster-card-copy">
                  <p className="roster-job">{coverJobLine(contact.appliedJob)}</p>
                  <h2 className="roster-name">{person.name}</h2>
                  <p className="roster-title">
                    {person.title} · {person.company}
                  </p>
                  <p className="roster-tag">
                    {contact.verdict
                      ? verdictLabel(contact.verdict.decision)
                      : contact.preview || "New interview"}
                    {contact.updatedAt
                      ? ` · ${relativeTime(contact.updatedAt)}`
                      : ""}
                  </p>
                </div>
              </Link>
            );
          })}
        </section>
      ) : null}

      {pickingJob ? (
        <div
          className="job-modal-backdrop"
          role="presentation"
          onClick={() => setPickingJob(false)}
        >
          <div
            className="job-modal"
            role="dialog"
            aria-labelledby="job-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="eyebrow">Application</p>
            <h2 id="job-modal-title">What role do you want?</h2>
            <p className="lede">
              We’ll assign a hiring contact at random. You won’t be told what’s
              off about them.
            </p>
            <div className="job-list">
              {jobs.map((job) => (
                <button
                  key={job}
                  type="button"
                  className="job-choice"
                  onClick={() => apply(job)}
                >
                  {job}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="ghost"
              onClick={() => setPickingJob(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
