"use client";

import type { HitPop, PaperScrap } from "@/lib/hits";

export default function HitLayer({
  hits,
  scraps,
}: {
  hits: HitPop[];
  scraps: PaperScrap[];
}) {
  return (
    <div className="hit-layer" aria-hidden>
      <div className="fx-grain" />
      <div className="fx-scan" />
      {hits.map((hit, index) => (
        <div
          key={hit.id}
          className={`hit-pop hit-${hit.kind}`}
          style={{ marginTop: `${index * 3.1}rem` }}
        >
          <strong>{hit.label}</strong>
          {hit.sub ? <span>{hit.sub}</span> : null}
        </div>
      ))}
      {scraps.map((scrap) => (
        <i
          key={scrap.id}
          className="paper-scrap"
          style={{
            left: scrap.left,
            animationDelay: scrap.delay,
            ["--scrap-rot" as string]: scrap.rot,
          }}
        >
          {scrap.label}
        </i>
      ))}
    </div>
  );
}
