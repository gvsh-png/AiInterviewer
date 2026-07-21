"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { INTERVIEWERS } from "@/lib/interviewers";
import PersonaAvatar from "@/components/PersonaAvatar";

export default function InterviewerRoster() {
  return (
    <div className="room roster-room">
      <div className="grain" aria-hidden />
      <div className="blinds" aria-hidden />

      <header className="topbar">
        <p className="mark">PROBE</p>
        <p className="roster-count">{INTERVIEWERS.length} interviewers</p>
      </header>

      <section className="roster-hero">
        <p className="eyebrow">Twisted intake board</p>
        <h1 className="brand roster-brand">PICK YOUR FATE</h1>
        <p className="lede">
          Twelve interviewers. Twelve jobs. Every one of them wrong in a
          different way. Choose who sits across from you.
        </p>
      </section>

      <section className="roster-grid">
        {INTERVIEWERS.map((person) => (
          <Link
            key={person.id}
            href={`/interview/${person.id}`}
            className="roster-card"
            style={
              {
                "--ink": person.theme.ink,
                "--paper": person.theme.paper,
                "--moss": person.theme.moss,
                "--moss-deep": person.theme.mossDeep,
                "--sulfur": person.theme.sulfur,
                "--sulfur-hot": person.theme.sulfurHot,
                "--ash": person.theme.ash,
                "--card-gradient": person.theme.gradient,
              } as CSSProperties
            }
          >
            <div className="roster-card-media">
              <PersonaAvatar interviewer={person} size="card" />
            </div>
            <div className="roster-card-copy">
              <p className="roster-job">{person.job}</p>
              <h2 className="roster-name">{person.name}</h2>
              <p className="roster-title">{person.title}</p>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
