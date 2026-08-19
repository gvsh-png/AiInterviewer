"use client";

import { useState, useSyncExternalStore } from "react";
import {
  EMPTY_FILE_SNAPSHOT,
  getFileSnapshot,
  getNote,
  parseFileSnapshot,
  subscribeToFile,
  upsertNote,
  type FileNote,
} from "@/lib/fileCabinet";

export default function NightNote({
  interviewerId,
  compact = false,
}: {
  interviewerId: FileNote["interviewerId"];
  compact?: boolean;
}) {
  const snapshot = useSyncExternalStore(
    subscribeToFile,
    getFileSnapshot,
    () => EMPTY_FILE_SNAPSHOT
  );
  const stored = getNote(parseFileSnapshot(snapshot), interviewerId);
  const [draft, setDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const text = draft ?? stored?.text ?? "";

  const save = () => {
    upsertNote(interviewerId, text);
    setDraft(null);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  };

  return (
    <div className={`night-note ${compact ? "compact" : ""}`}>
      <label>
        <span className="sr-only">Night note</span>
        <textarea
          value={text}
          onChange={(event) => {
            setDraft(event.target.value);
            setSaved(false);
          }}
          placeholder="They cannot see this. The building might."
          rows={compact ? 4 : 5}
        />
      </label>
      <div className="night-note-actions">
        <button type="button" className="text-button" onClick={save}>
          Save to file
        </button>
        {saved ? <p className="reset-confirmation">Filed.</p> : null}
      </div>
    </div>
  );
}
