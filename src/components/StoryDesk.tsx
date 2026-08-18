"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { getInterviewer } from "@/lib/interviewers";
import {
  assignRandomContact,
  getContactsSnapshot,
  parseContactsSnapshot,
  subscribeToContacts,
  unusedInterviewers,
} from "@/lib/contacts";
import {
  EMPTY_SNAPSHOT,
  activeContact,
  aftermathLine,
  briefingForRound,
  campaignJobs,
  completedContacts,
  epilogue,
  getCampaignSnapshot,
  jobHook,
  parseCampaignSnapshot,
  subscribeToCampaign,
  totalRounds,
  updateCampaign,
} from "@/lib/campaign";
import { coverJobLine } from "@/lib/cover";
import { verdictLabel } from "@/lib/verdict";
import PersonaAvatar from "@/components/PersonaAvatar";

function StoryFrame({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="story-desk">
      <div className="story-copy">
        <p className="app-kicker">{kicker}</p>
        <h2>{title}</h2>
        {children}
      </div>
    </section>
  );
}

export default function StoryDesk() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const campaignRaw = useSyncExternalStore(
    subscribeToCampaign,
    getCampaignSnapshot,
    () => EMPTY_SNAPSHOT
  );
  const contactsRaw = useSyncExternalStore(
    subscribeToContacts,
    getContactsSnapshot,
    () => "[]"
  );
  const campaign = useMemo(
    () => parseCampaignSnapshot(campaignRaw),
    [campaignRaw]
  );
  const contacts = useMemo(
    () => parseContactsSnapshot(contactsRaw),
    [contactsRaw]
  );

  const done = completedContacts(contacts);
  const current = activeContact(contacts);
  const remaining = unusedInterviewers().length;
  const nextRound = Math.min(totalRounds(), done.length + 1);
  const briefing = briefingForRound(nextRound);
  const jobs = campaignJobs();
  const currentPerson = current
    ? getInterviewer(current.interviewerId)
    : null;
  const last = done[0] ?? null;
  const lastPerson = last ? getInterviewer(last.interviewerId) : null;
  const ended = remaining === 0 && !current && done.length > 0;
  const ending = ended ? epilogue(contacts) : null;

  const dispatch = (job: string) => {
    if (busy) return;
    setBusy(true);
    const contact = assignRandomContact(job);
    updateCampaign({ introDone: true, playerJob: job });
    setBusy(false);
    if (contact) router.push(`/interview/${contact.interviewerId}`);
  };

  if (!campaign.introDone) {
    return (
      <StoryFrame kicker="PROBE" title="They found your name">
        <p>
          This is not a job board. It is a closed loop. You apply once. The
          building sends interviewers. They will not tell you what they are.
          You will sit through the hour anyway.
        </p>
        <p>
          Twelve contacts. One file. Letters at the end of each round. The
          chats are how they reach you.
        </p>
        <div className="story-actions">
          <button
            type="button"
            className="start-chat-button"
            onClick={() => updateCampaign({ introDone: true })}
          >
            I want in
          </button>
        </div>
      </StoryFrame>
    );
  }

  if (!campaign.playerJob) {
    return (
      <StoryFrame
        kicker="Application"
        title="What did you tell them you wanted?"
      >
        <p>
          Pick a cover. They may honor it. They may send you to whoever is
          free. Either way, this is the role on your file.
        </p>
        <div className="job-list">
          {jobs.map((job) => (
            <button
              key={job}
              type="button"
              className="job-choice"
              disabled={busy}
              onClick={() => dispatch(job)}
            >
              <strong>{job}</strong>
              <span>{jobHook(job)}</span>
            </button>
          ))}
        </div>
      </StoryFrame>
    );
  }

  if (ended && ending) {
    return (
      <StoryFrame kicker={ending.kicker} title={ending.title}>
        <p>{ending.body}</p>
        <p className="story-meta">
          {done.length} rounds · {campaign.playerJob}
        </p>
        <div className="story-actions">
          <Link href="/" className="start-chat-button">
            Back to chats
          </Link>
        </div>
      </StoryFrame>
    );
  }

  if (current && currentPerson) {
    return (
      <StoryFrame kicker={briefing.kicker} title={briefing.title}>
        <p>{briefing.body}</p>
        <div className="story-contact">
          <PersonaAvatar interviewer={currentPerson} size="md" />
          <div>
            <strong>{currentPerson.name}</strong>
            <span>{coverJobLine(current.appliedJob)}</span>
          </div>
        </div>
        <div className="story-actions">
          <Link
            href={`/interview/${current.interviewerId}`}
            className="start-chat-button"
          >
            Open the chat
          </Link>
        </div>
        <p className="story-meta">
          Round {done.length + 1} of {totalRounds()} · {campaign.playerJob}
        </p>
      </StoryFrame>
    );
  }

  if (last?.verdict && remaining > 0) {
    return (
      <StoryFrame
        kicker={`${lastPerson ? lastPerson.name : "Last round"} · ${verdictLabel(last.verdict.decision)}`}
        title={briefing.title}
      >
        <p>{aftermathLine(last.verdict.decision)}</p>
        <p>{briefing.body}</p>
        <div className="story-actions">
          <button
            type="button"
            className="start-chat-button"
            disabled={busy}
            onClick={() => dispatch(campaign.playerJob || last.appliedJob)}
          >
            Take the next interview
          </button>
        </div>
        <p className="story-meta">
          {done.length} down · {remaining} left
        </p>
      </StoryFrame>
    );
  }

  return (
    <StoryFrame kicker={briefing.kicker} title={briefing.title}>
      <p>{briefing.body}</p>
      <div className="story-actions">
        <button
          type="button"
          className="start-chat-button"
          disabled={busy}
          onClick={() => dispatch(campaign.playerJob || jobs[0]!)}
        >
          Receive the contact
        </button>
      </div>
    </StoryFrame>
  );
}
