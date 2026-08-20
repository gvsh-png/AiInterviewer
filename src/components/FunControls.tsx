"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_FUN_PREFS,
  getFunPrefs,
  playFun,
  setFunPrefs,
  subscribeToFunPrefs,
  tapHaptic,
} from "@/lib/funKit";

const FOLEY_SAMPLES = [
  { id: "tab-tick", label: "Tab tick" },
  { id: "file-drawer", label: "Drawer" },
  { id: "elevator-ding", label: "Ding" },
] as const;

export default function FunControls() {
  const prefs = useSyncExternalStore(
    subscribeToFunPrefs,
    getFunPrefs,
    () => DEFAULT_FUN_PREFS
  );

  return (
    <>
      <section className="settings-group" data-fun="foley-pref">
        <h2>Desk life</h2>
        <p className="settings-description">
          Same paper, same sulfur. These only change how the desk talks back.
        </p>
        <div className="theme-options">
          <button
            type="button"
            className={`theme-option ${prefs.foley ? "selected" : ""}`}
            data-fun="foley-pref"
            onClick={() => {
              playFun("toggle-click");
              tapHaptic();
              setFunPrefs({ foley: !prefs.foley });
            }}
          >
            <span>
              <strong>Desk foley</strong>
              <small>Ticks, drawers, dings. Their voice stays.</small>
            </span>
            <span className="radio-mark" aria-hidden />
          </button>
          <button
            type="button"
            className={`theme-option ${prefs.haptics ? "selected" : ""}`}
            data-fun="haptics-pref"
            onClick={() => {
              playFun("toggle-click");
              tapHaptic();
              setFunPrefs({ haptics: !prefs.haptics });
            }}
          >
            <span>
              <strong>Palm taps</strong>
              <small>Short buzzes on tabs and stamps.</small>
            </span>
            <span className="radio-mark" aria-hidden />
          </button>
          <button
            type="button"
            className={`theme-option ${prefs.toys ? "selected" : ""}`}
            data-fun="toys-pref"
            onClick={() => {
              playFun("toggle-click");
              tapHaptic();
              setFunPrefs({ toys: !prefs.toys });
            }}
          >
            <span>
              <strong>Desk toys</strong>
              <small>Dust, rain, the extra chair, ink trail.</small>
            </span>
            <span className="radio-mark" aria-hidden />
          </button>
        </div>
      </section>
      <section className="settings-group" data-fun="foley-tests">
        <h2>Audition the desk</h2>
        <p className="settings-description">
          Three sounds. Same room. No extra menu.
        </p>
        <div className="fun-test-row" data-fun="foley-tests">
          {FOLEY_SAMPLES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              className="text-button"
              onClick={() => {
                playFun(sample.id);
                tapHaptic();
              }}
            >
              {sample.label}
            </button>
          ))}
        </div>
        <div className="fun-vu-wrap" data-fun="music-vu">
          <span>Score needle</span>
          <i />
        </div>
      </section>
    </>
  );
}
