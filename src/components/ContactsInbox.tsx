"use client";

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
        <p>Apply for a role to get a hiring contact, then open the chat.</p>
      </section>
    </main>
  );
}
