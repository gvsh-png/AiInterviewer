"use client";

import Link from "next/link";
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
  type PanelArt,
  type StoryPage,
} from "@/lib/campaign";
import PersonaAvatar from "@/components/PersonaAvatar";
import MessengerNav from "@/components/MessengerNav";

function StoryArt({ art }: { art: PanelArt }) {
  return <div className={`story-art art-${art}`} aria-hidden />;
}

function StoryStrip({
  page,
  person,
}: {
  page: StoryPage;
  person?: ReturnType<typeof getInterviewer>;
}) {
  const [wide, left, right] = page.frames;
  return (
    <div className="story-strip">
      <article className="story-frame wide">
        {person ? (
          <div className="story-art art-portrait">
            <PersonaAvatar interviewer={person} size="lg" />
          </div>
        ) : (
          <StoryArt art={wide.art} />
        )}
        <p className="story-caption">{wide.text}</p>
      </article>
      <div className="story-strip-lower">
        <article className="story-frame">
          <StoryArt art={left.art} />
          <p className="story-caption">{left.text}</p>
        </article>
        <article className="story-frame">
          <StoryArt art={right.art} />
          <p className="story-caption">{right.text}</p>
        </article>
      </div>
    </div>
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

  const pages =
    campaign.chapter === "meet" && currentPerson && current
      ? [meetPage(currentPerson.name, current.appliedJob)]
      : pagesForChapter(campaign.chapter, contacts);

  const panel = Math.min(campaign.panel, Math.max(0, pages.length - 1));
  const page = pages[panel]!;
  const isLast = panel >= pages.length - 1;
  const portraitPerson =
    campaign.chapter === "meet"
      ? currentPerson
      : campaign.chapter === "aftermath"
        ? lastPerson
        : undefined;

  const totalStoryPages =
    campaign.chapter === "intro"
      ? pages.length
      : campaign.chapter === "ending"
        ? pages.length
        : pages.length;
  const progressLabel = `${panel + 1} / ${totalStoryPages}`;
  const roundHint =
    campaign.chapter === "intro"
      ? "Prologue"
      : campaign.chapter === "ending"
        ? "Ending"
        : `Round ${Math.min(totalRounds(), done.length + (current ? 1 : remaining > 0 ? 1 : 0))} of ${totalRounds()}`;

  const continueLabel = () => {
    if (!isLast) return "Continue";
    switch (campaign.chapter) {
      case "intro":
        return "Begin";
      case "briefing":
        return "See who they sent";
      case "meet":
        return "Open the chat";
      case "aftermath":
        return remaining > 0 ? "The next hour" : "Read the ending";
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
      updateCampaign({ chapter: "briefing", panel: 0 });
      setBusy(false);
      return;
    }

    if (campaign.chapter === "briefing") {
      updateCampaign({ chapter: "meet", panel: 0 });
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
        updateCampaign({ chapter: "briefing", panel: 0 });
        setBusy(false);
        return;
      }
      updateCampaign({ chapter: "ending", panel: 0 });
      return;
    }

    router.push("/");
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("button, a, input, textarea")
      ) {
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        advance();
      } else if (event.key === "Backspace" || event.key === "ArrowLeft") {
        event.preventDefault();
        goBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <main className="story-mode">
      <header className="story-topbar">
        <Link href="/" className="story-top-link">
          Chats
        </Link>
        <div className="story-top-title">
          <p className="app-kicker">PROBE</p>
          <h1>Story</h1>
        </div>
        <p className="story-progress">{progressLabel}</p>
      </header>

      <section className="story-board">
        <p className="story-round-hint">{roundHint}</p>
        <p className="app-kicker">{page.kicker}</p>
        <h2>{page.title}</h2>
        <StoryStrip page={page} person={portraitPerson || undefined} />
        <div className="story-dots" aria-hidden>
          {pages.map((item, index) => (
            <span
              key={`${item.title}-${index}`}
              className={index === panel ? "on" : ""}
            />
          ))}
        </div>
      </section>

      <div className="story-controls">
        <button
          type="button"
          className="text-button"
          onClick={goBack}
          disabled={panel <= 0}
        >
          Back
        </button>
        <button
          type="button"
          className="start-chat-button"
          onClick={advance}
          disabled={busy}
        >
          {continueLabel()}
        </button>
      </div>

      <MessengerNav active="story" />
    </main>
  );
}
