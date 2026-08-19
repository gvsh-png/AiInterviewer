"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import ContactsSidebar from "@/components/ContactsSidebar";
import MessengerNav from "@/components/MessengerNav";
import StoryDesk from "@/components/StoryDesk";
import {
  EMPTY_SNAPSHOT,
  currentRoundLabel,
  getCampaignSnapshot,
  parseCampaignSnapshot,
  subscribeToCampaign,
} from "@/lib/campaign";
import {
  getContactsSnapshot,
  parseContactsSnapshot,
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
  const subtitle = useMemo(() => {
    const campaign = parseCampaignSnapshot(campaignRaw);
    const contacts = parseContactsSnapshot(contactsRaw);
    return currentRoundLabel(campaign, contacts);
  }, [campaignRaw, contactsRaw]);

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
