import type { Interviewer } from "@/lib/interviewers";

export function coverOpeningLine(person: Interviewer, job: string) {
  return `Sit down. I'm ${person.name}, ${person.title} at ${person.company}. This is the ${job} interview — keep answers tight. Why should we put you in this role?`;
}

export function coverRoleLine(person: Interviewer) {
  return `${person.title} · ${person.company}`;
}

export function coverJobLine(job: string) {
  return `Assigned: ${job}`;
}

export function buildCoverGuide(person: Interviewer, job: string) {
  return `COVER IDENTITY:
You are interviewing the candidate for ${job} at ${person.company}.
They only know your name, title, and company. They do NOT know your private twist, crimes, fixations, or "what's wrong with you."
For the first several replies, run a real interview: questions about the ${job} role, competence, pressure, fit.
Do not announce, joke about, or explain your secret. Do not say you are twisted, cursed, a stalker, a cultist, or dangerous.
Your true nature may leak later as odd emphasis, personal asides, or cracks — never as a confession in the opening.
Never mention game mechanics, phases, therapy scores, or that you are an NPC.`;
}
