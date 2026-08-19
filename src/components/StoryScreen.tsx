"use client";

import Link from "next/link";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import ContactsSidebar from "@/components/ContactsSidebar";
import MessengerNav from "@/components/MessengerNav";
import StoryDesk from "@/components/StoryDesk";
import {
  EMPTY_SNAPSHOT,
  currentRoundLabel,
  getCampaignSnapshot,
  parseCampaignSnapshot,
  readCampaign,
  reconcileCampaign,
  subscribeToCampaign,
} from "@/lib/campaign";
import {
  getContactsSnapshot,
  parseContactsSnapshot,
  readContacts,
  subscribeToContacts,
} from "@/lib/contacts";

export default function StoryScreen() {
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
  const subtitle = currentRoundLabel(campaign, contacts);
  const playing = Boolean(campaign.seed) && !campaign.cutsceneDone;

  useEffect(() => {
    readCampaign();
    reconcileCampaign(readContacts());
  }, []);

  if (playing) {
    return <StoryDesk playHere />;
  }

  return (
    <main className="messenger-shell story-shell">
      <ContactsSidebar compact />
      <section className="story-pane">
        <header className="thread-header">
          <Link href="/" className="mobile-back" aria-label="Back to chats">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="m15 5-7 7 7 7" />
            </svg>
          </Link>
          <div className="thread-person">
            <h1>Story</h1>
            <p>{subtitle}</p>
          </div>
        </header>
        <StoryDesk />
        <MessengerNav active="story" />
      </section>
    </main>
  );
}
