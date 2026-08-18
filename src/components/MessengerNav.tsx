"use client";

import Link from "next/link";

type MessengerNavProps = {
  active: "chats" | "settings";
};

export default function MessengerNav({ active }: MessengerNavProps) {
  return (
    <nav className="mobile-tabbar" aria-label="Primary navigation">
      <Link
        href="/"
        className={`tabbar-item ${active === "chats" ? "active" : ""}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M4 5.5h16v11H8l-4 3v-14Z" />
        </svg>
        <span>Chats</span>
      </Link>
      <Link
        href="/settings"
        className={`tabbar-item ${active === "settings" ? "active" : ""}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="3" />
          <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1A8 8 0 0 0 15 6l-.3-2.5h-4L10.4 6a8 8 0 0 0-1.7 1L6.5 6l-2 3.4L6.6 11a7 7 0 0 0 0 2l-2.1 1.5 2 3.4 2.3-1A8 8 0 0 0 10.4 18l.3 2.5h4L15 18a8 8 0 0 0 1.7-1l2.3 1 2-3.4-2.1-1.5a7 7 0 0 0 .1-1Z" />
        </svg>
        <span>Settings</span>
      </Link>
    </nav>
  );
}
