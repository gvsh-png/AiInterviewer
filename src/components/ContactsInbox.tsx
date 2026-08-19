"use client";

import ContactsSidebar from "@/components/ContactsSidebar";
import StoryDesk from "@/components/StoryDesk";

export default function ContactsInbox() {
  return (
    <main className="messenger-shell inbox-shell">
      <ContactsSidebar />
      <section className="story-pane inbox-story">
        <StoryDesk />
      </section>
    </main>
  );
}
