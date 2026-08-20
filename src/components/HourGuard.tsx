"use client";

import { Component, type ReactNode } from "react";

export default class HourGuard extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    /* the hour must still show a way back */
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="messenger-shell thread-shell hour-recover">
          <section className="chat-thread">
            <div className="new-chat-state">
              <h2>The hour jammed</h2>
              <p>Reload the desk. Your file is still on the glass.</p>
              <button
                type="button"
                className="start-chat-button"
                onClick={() => window.location.reload()}
              >
                Reload the hour
              </button>
            </div>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
