"use client";

import Link from "next/link";
import ContactsSidebar from "@/components/ContactsSidebar";
import MessengerNav from "@/components/MessengerNav";
import StoryDesk from "@/components/StoryDesk";

export default function StoryScreen() {
  return (
    <main className="messenger-shell story-shell">
      <ContactsSidebar />
      <section className="story-pane">
        <header className="thread-header">
          <Link href="/" className="mobile-back" aria-label="Back to chats">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="m15 5-7 7 7 7" />
            </svg>
          </Link>
          <div className="thread-person">
            <h1>Story</h1>
            <p>The building assigns who you meet</p>
          </div>
        </header>
        <StoryDesk />
        <MessengerNav active="story" />
      </section>
    </main>
  );
}
