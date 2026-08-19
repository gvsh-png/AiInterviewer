"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { getInterviewer } from "@/lib/interviewers";
import {
  assignNextStoryContact,
  getContactsSnapshot,
  parseContactsSnapshot,
  subscribeToContacts,
  unusedInterviewers,
} from "@/lib/contacts";
import {
  EMPTY_SNAPSHOT,
  activeContact,
  completedContacts,
  getCampaignSnapshot,
  meetPage,
  pagesForChapter,
  parseCampaignSnapshot,
  reconcileCampaign,
  subscribeToCampaign,
  totalRounds,
  updateCampaign,
} from "@/lib/campaign";
import { coverJobLine, coverRoleLine } from "@/lib/cover";
import PersonaAvatar from "@/components/PersonaAvatar";

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

  useEffect(() => {
    reconcileCampaign(contacts);
  }, [contacts, campaignRaw]);

  const done = completedContacts(contacts);
  const current = activeContact(contacts);
  const remaining = unusedInterviewers().length;
  const currentPerson = current
    ? getInterviewer(current.interviewerId)
    : null;
  const last = done[0] ?? null;
  const lastPerson = last ? getInterviewer(last.interviewerId) : null;
  const roundNumber = Math.min(
    totalRounds(),
    done.length + (current ? 1 : remaining > 0 ? 1 : 0)
  );

  const pages =
    campaign.chapter === "meet" && currentPerson && current
      ? [meetPage(currentPerson.name, current.appliedJob, roundNumber)]
      : pagesForChapter(campaign.chapter, contacts);

  const panel = Math.min(campaign.panel, Math.max(0, pages.length - 1));
  const page = pages[panel]!;
  const isLast = panel >= pages.length - 1;
  const person =
    campaign.chapter === "meet"
      ? currentPerson
      : campaign.chapter === "aftermath"
        ? lastPerson
        : null;

  const continueLabel = () => {
    if (!isLast) return "Continue";
    switch (campaign.chapter) {
      case "intro":
        return "I'm in";
      case "meet":
        return "Open chat";
      case "aftermath":
        return remaining > 0 ? "Next interview" : "See the ending";
      case "ending":
        return "Back to chats";
    }
  };

  const goBack = () => {
    if (panel <= 0) return;
    updateCampaign({ panel: panel - 1 });
  };

  const advance = () => {
    if (busy) return;
    if (!isLast) {
      updateCampaign({ panel: panel + 1 });
      return;
    }

    if (campaign.chapter === "intro") {
      setBusy(true);
      assignNextStoryContact();
      updateCampaign({ chapter: "meet", panel: 0 });
      setBusy(false);
      return;
    }

    if (campaign.chapter === "meet") {
      if (current) router.push(`/interview/${current.interviewerId}`);
      return;
    }

    if (campaign.chapter === "aftermath") {
      if (remaining > 0) {
        setBusy(true);
        assignNextStoryContact();
        updateCampaign({ chapter: "meet", panel: 0 });
        setBusy(false);
        return;
      }
      updateCampaign({ chapter: "ending", panel: 0 });
      return;
    }

    router.push("/");
  };

  return (
    <section className="story-desk">
      <div className="story-copy">
        <p className="app-kicker">{page.kicker}</p>
        <h2>{page.title}</h2>
        {page.beats.map((beat, index) => (
          <p key={`${index}-${beat.slice(0, 24)}`} className="story-beat">
            {beat}
          </p>
        ))}

        {person && current && campaign.chapter === "meet" ? (
          <div className="story-contact">
            <PersonaAvatar interviewer={person} size="md" />
            <div>
              <strong>{person.name}</strong>
              <span>
                {coverRoleLine(person)} · {coverJobLine(current.appliedJob)}
              </span>
            </div>
          </div>
        ) : null}

        {person && last && campaign.chapter === "aftermath" ? (
          <div className="story-contact">
            <PersonaAvatar interviewer={person} size="md" />
            <div>
              <strong>{person.name}</strong>
              <span>Letter is in the chat</span>
            </div>
          </div>
        ) : null}

        {pages.length > 1 ? (
          <div className="story-dots" aria-hidden>
            {pages.map((item, index) => (
              <span
                key={`${item.title}-${index}`}
                className={index === panel ? "on" : ""}
              />
            ))}
          </div>
        ) : null}

        <div className="story-controls">
          {pages.length > 1 ? (
            <button
              type="button"
              className="text-button"
              onClick={goBack}
              disabled={panel <= 0}
            >
              Back
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="start-chat-button"
            onClick={advance}
            disabled={busy}
          >
            {continueLabel()}
          </button>
        </div>
      </div>
    </section>
  );
}
