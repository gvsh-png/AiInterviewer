"use client";

import type { Interviewer } from "@/lib/interviewers";

type PersonaAvatarProps = {
  interviewer: Interviewer;
  size?: "sm" | "md" | "lg" | "hero" | "card";
  speaking?: boolean;
  listening?: boolean;
  className?: string;
};

export default function PersonaAvatar({
  interviewer,
  size = "md",
  speaking = false,
  listening = false,
  className = "",
}: PersonaAvatarProps) {
  const src = interviewer.avatarWebp || interviewer.avatar;
  return (
    <div
      className={`avatar size-${size} ${speaking ? "talking" : ""} ${listening ? "hearing" : ""} ${className}`.trim()}
      aria-label={interviewer.name}
    >
      <picture>
        {interviewer.avatarWebp ? (
          <source srcSet={interviewer.avatarWebp} type="image/webp" />
        ) : null}
        <img
          src={src}
          alt={`${interviewer.name}, ${interviewer.title}`}
          className="avatar-img"
          draggable={false}
        />
      </picture>
      <span className="pulse" aria-hidden />
      {speaking && <span className="speak-bars" aria-hidden />}
    </div>
  );
}
