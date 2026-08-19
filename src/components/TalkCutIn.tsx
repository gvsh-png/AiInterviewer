"use client";

import { stillSrc } from "@/lib/cutscenes";
import { talkCutVideo, type LiveDirection, type TalkCut } from "@/lib/talkCuts";

export default function TalkCutIn({
  cut,
  direction,
}: {
  cut: TalkCut;
  direction?: LiveDirection | null;
}) {
  const videoUrl = talkCutVideo(cut);

  return (
    <aside className="talk-cut" aria-live="polite">
      <div className={`cutscene-still still-${cut.still} has-photo talk-still`}>
        {videoUrl ? (
          <video
            className="cutscene-photo"
            src={videoUrl}
            poster={stillSrc(cut.still)}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- baked talk-cut plates */}
            <img
              className="cutscene-photo generated"
              src={stillSrc(cut.still)}
              alt=""
              draggable={false}
            />
          </>
        )}
      </div>
      <div className="talk-cut-copy">
        <p className="app-kicker">{cut.kicker}</p>
        <h3>{cut.line}</h3>
        {direction ? (
          <p>
            {direction.title}. {direction.body}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
