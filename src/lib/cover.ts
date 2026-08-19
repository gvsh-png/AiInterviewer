import type { Interviewer, InterviewerId } from "@/lib/interviewers";

const OPENINGS: Record<InterviewerId, (job: string) => string> = {
  derek: (job) =>
    `Derek Holloway, QA. Your file is already stamped ${job}. I've got a build that's lying to us — what do you break first, and don't give me a speech.`,
  marlene: (job) =>
    `Marlene Crowe, Talent. They forwarded you for ${job}. I already read the notes. Before we do the polite version: who actually put you on this list?`,
  voss: (job) =>
    `Voss, Security. This is the ${job} hour. Skip the handshake. Where were you last night, and who can confirm it without calling you first?`,
  celeste: (job) =>
    `Celeste Moon, Wellness. They assigned you ${job}. I don't need your résumé — I need how you come back after a bad hour. Start there.`,
  griffin: (job) =>
    `Griffin Hale. Brand. You're here for ${job}, which means taste is the whole test. What's the last thing you made that you'd still put your name on?`,
  pike: (job) =>
    `Dr. Pike. The ${job} slot is yours for this hour. Describe a result you threw out because it was inconvenient. No eulogy for it.`,
  june: (job) =>
    `Hi — June, escalations. They put you on ${job}. Tell me about a thread you couldn't close. Not the heroic version. The one that kept pinging.`,
  romanov: (job) =>
    `Romanov. Sit. This ${job} hour is not a mixer. What are you worth in the next twelve months, in a number, not a story about yourself.`,
  ashley: (job) =>
    `Ashley, Growth. ${job} is on your file. I don't want your brand mission. What should people notice about you in the first three seconds?`,
  hector: (job) =>
    `Hector, nights. They assigned ${job}. Who let you onto this floor, and do you actually know the building hours — not the ones on the website.`,
  vera: (job) =>
    `Vera Quill, Compliance. ${job} is the heading on this hour. Tell me a true thing you would not put in writing. I'll know if you stall.`,
  knox: (job) =>
    `Knox. Coach. You're on ${job}, so skip nice. Last time you lost, did you stay on the call or did you disappear? Answer that first.`,
};

export function coverOpeningLine(person: Interviewer, job: string) {
  const line = OPENINGS[person.id];
  return line
    ? line(job)
    : `I'm ${person.name}. They assigned you ${job}. The hour's already started — what do you want me to know that isn't on the file?`;
}

export function coverRoleLine(person: Interviewer) {
  return `${person.title} · ${person.company}`;
}

export function coverJobLine(job: string) {
  return job;
}

export function buildCoverGuide(person: Interviewer, job: string) {
  return `COVER IDENTITY:
You are interviewing the candidate for ${job} at ${person.company}.
They only know your name, title, and company. They do NOT know your private twist, crimes, fixations, or "what's wrong with you."

THE HOUR ALREADY STARTED:
Your first message already opened the file. Do not re-introduce yourself. Do not restart with "tell me about yourself" or "why do you want this role?"
You have notes. Speak like a continuation: specific ${job} scenarios, pressure, judgment, what they do when something fails.
If they dodge, pin them to the work. If they perform, ask for a worse example.

Do not announce, joke about, or explain your secret. Do not say you are twisted, cursed, a stalker, a cultist, or dangerous.
Your true nature may leak later as odd emphasis, personal asides, or cracks — never as a confession in the opening.
Never mention game mechanics, phases, therapy scores, or that you are an NPC.`;
}
