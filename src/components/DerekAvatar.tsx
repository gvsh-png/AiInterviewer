"use client";

type DerekAvatarProps = {
  size?: "sm" | "md" | "lg" | "hero";
  speaking?: boolean;
  listening?: boolean;
  className?: string;
};

export default function DerekAvatar({
  size = "md",
  speaking = false,
  listening = false,
  className = "",
}: DerekAvatarProps) {
  return (
    <div
      className={`avatar size-${size} ${speaking ? "talking" : ""} ${listening ? "hearing" : ""} ${className}`.trim()}
      aria-label="Derek Holloway"
    >
      <picture>
        <source srcSet="/derek-avatar.webp" type="image/webp" />
        <img
          src="/derek-avatar.png"
          alt="Derek Holloway, Senior QA Lead"
          className="avatar-img"
          draggable={false}
        />
      </picture>
      <span className="pulse" aria-hidden />
      {speaking && <span className="speak-bars" aria-hidden />}
    </div>
  );
}
