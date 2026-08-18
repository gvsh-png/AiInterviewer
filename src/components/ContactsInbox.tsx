"use client";

import Link from "next/link";
import ContactsSidebar from "@/components/ContactsSidebar";

export default function ContactsInbox() {
  return (
    <main className="messenger-shell inbox-shell">
      <ContactsSidebar />
      <section className="desktop-empty-chat">
        <div className="empty-chat-icon" aria-hidden>
          <svg viewBox="0 0 24 24">
            <path d="M4 5.5h16v11H8l-4 3v-14Z" />
          </svg>
        </div>
        <h2>Your conversations</h2>
        <p>Open story mode. PROBE assigns the contact and the job.</p>
        <Link href="/story" className="start-chat-button">
          Open story mode
        </Link>
      </section>
    </main>
  );
}
