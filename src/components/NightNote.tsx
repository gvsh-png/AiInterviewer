"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import {
  EMPTY_FILE_SNAPSHOT,
  getFileSnapshot,
  getNote,
  parseFileSnapshot,
  subscribeToFile,
  upsertNote,
  type FileNote,
} from "@/lib/fileCabinet";
import { playFun } from "@/lib/funKit";

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
  const lastScratch = useRef(0);
  const text = draft ?? stored?.text ?? "";

  const save = () => {
    upsertNote(interviewerId, text);
    setDraft(null);
    setSaved(true);
    playFun("ink-dries");
    window.setTimeout(() => setSaved(false), 1400);
  };

  return (
    <div className={`night-note ${compact ? "compact" : ""} ${saved ? "fun-drying" : ""}`} data-fun="ink-dries">
      <label>
        <span className="sr-only">Night note</span>
        <textarea
          value={text}
          className="fun-pen"
          data-fun="pen-cursor"
          onChange={(event) => {
            setDraft(event.target.value);
            setSaved(false);
            if (Date.now() - lastScratch.current > 80) {
              lastScratch.current = Date.now();
              playFun("pencil-scratch");
            }
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
