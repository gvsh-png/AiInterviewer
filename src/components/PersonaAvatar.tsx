"use client";

import { useState } from "react";
import type { Interviewer } from "@/lib/interviewers";
import { playFun } from "@/lib/funKit";

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
  const [peek, setPeek] = useState(false);
  const hold = () => {
    setPeek(true);
    playFun("polaroid-peek");
  };

  return (
    <div
      className={`avatar size-${size} fun-blink ${speaking ? "talking" : ""} ${listening ? "hearing" : ""} ${peek ? "fun-peek" : ""} ${className}`.trim()}
      aria-label={interviewer.name}
      data-fun="avatar-blink"
      onPointerDown={hold}
      onPointerUp={() => setPeek(false)}
      onPointerLeave={() => setPeek(false)}
    >
      <picture>
        {interviewer.avatarWebp ? (
          <source srcSet={interviewer.avatarWebp} type="image/webp" />
        ) : null}
        <img
          src={src}
          alt={interviewer.name}
          className="avatar-img"
          draggable={false}
        />
      </picture>
      <span className="pulse" aria-hidden />
      {speaking && <span className="speak-bars" aria-hidden />}
      {peek ? (
        <span className="fun-polaroid" data-fun="polaroid-peek">
          {interviewer.name.split(" ")[0]}
        </span>
      ) : null}
    </div>
  );
}
