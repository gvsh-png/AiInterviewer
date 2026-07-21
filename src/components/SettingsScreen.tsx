"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import ContactsSidebar from "@/components/ContactsSidebar";
import MessengerNav from "@/components/MessengerNav";
import { clearAllConversations } from "@/lib/chatStorage";
import {
  getThemePreference,
  setThemePreference,
  subscribeToTheme,
  type ThemePreference,
} from "@/lib/preferences";

const THEME_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  detail: string;
}> = [
  {
    value: "system",
    label: "Device setting",
    detail: "Automatically follows your phone or computer.",
  },
  {
    value: "light",
    label: "Light",
    detail: "Always use the light appearance.",
  },
  {
    value: "dark",
    label: "Dark",
    detail: "Always use the dark appearance.",
  },
];

export default function SettingsScreen() {
  const [resetDone, setResetDone] = useState(false);
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemePreference,
    () => "system"
  );

  const chooseTheme = (next: ThemePreference) => {
    setThemePreference(next);
  };

  const resetProgress = () => {
    const confirmed = window.confirm(
      "Delete every conversation and reset all interview progress?"
    );
    if (!confirmed) return;
    clearAllConversations();
    setResetDone(true);
  };

  return (
    <main className="messenger-shell settings-shell">
      <ContactsSidebar compact />

      <section className="settings-panel">
        <header className="thread-header settings-header">
          <Link href="/" className="mobile-back" aria-label="Back to chats">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="m15 5-7 7 7 7" />
            </svg>
          </Link>
          <div>
            <h1>Settings</h1>
            <p>Appearance and conversation data</p>
          </div>
        </header>

        <div className="settings-content">
          <section className="settings-group">
            <h2>Appearance</h2>
            <p className="settings-description">
              Device setting is the default. Character accent colors remain
              unique in every chat.
            </p>
            <div className="theme-options">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`theme-option ${
                    theme === option.value ? "selected" : ""
                  }`}
                  onClick={() => chooseTheme(option.value)}
                >
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.detail}</small>
                  </span>
                  <span className="radio-mark" aria-hidden />
                </button>
              ))}
            </div>
          </section>

          <section className="settings-group danger-zone">
            <h2>Conversation data</h2>
            <p className="settings-description">
              Your chat history is stored only in this browser using local
              storage.
            </p>
            <button
              type="button"
              className="reset-button"
              onClick={resetProgress}
            >
              Reset all progress
            </button>
            {resetDone ? (
              <p className="reset-confirmation">All conversations were reset.</p>
            ) : null}
          </section>
        </div>

        <MessengerNav active="settings" />
      </section>
    </main>
  );
}
