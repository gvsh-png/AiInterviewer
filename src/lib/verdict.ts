export const VERDICT_DECISIONS = [
  "hire",
  "reject",
  "callback",
  "obsessed",
] as const;

export type VerdictDecision = (typeof VERDICT_DECISIONS)[number];

export type InterviewVerdict = {
  decision: VerdictDecision;
  letter: string;
};

export const MIN_VERDICT_TURN = 5;
export const FORCE_VERDICT_TURN = 5;

const VERDICT_RE = /\[\[VERDICT:\s*(hire|reject|callback|obsessed)\s*\]\]/i;
const LETTER_RE = /\[\[LETTER:\s*([\s\S]*?)\]\]/i;
const LETTER_OPEN_RE = /\[\[LETTER:\s*([\s\S]*)$/i;

export function isVerdictDecision(value: string): value is VerdictDecision {
  return (VERDICT_DECISIONS as readonly string[]).includes(value);
}

export function fallbackLetter(decision: VerdictDecision, appliedJob: string) {
  const job = appliedJob || "the hour";
  switch (decision) {
    case "hire":
      return `PROBE / Talent Operations\n\nRe: ${job}\n\nYour sample for this hour has been stamped hired. This is not a lobby badge and it is not permission to leave the building. Report to the next contact when the desk forwards the file. Do not call the clerk. The clerk is not sitting there.\n\nKeep copies. We will.`;
    case "reject":
      return `PROBE / Talent Operations\n\nRe: ${job}\n\nYour sample for this hour has been stamped rejected. Your name moved down, not off. The next interviewer has already received the copy. Do not reply to this letter. If the printers run again tonight, sit down anyway.\n\nThe file remains open until the sample is complete.`;
    case "callback":
      return `PROBE / Talent Operations\n\nRe: ${job}\n\nThe hour is not closed. A second pass has been requested. Stay in the thread. Do not leave the floor. A letter will follow when the sample is actually finished.\n\nDo not call the desk.`;
    case "obsessed":
      return `I should not be writing this on company paper and I am going to anyway. ${job} was the heading. You are what I kept. Do not go home between hours. I already forwarded you to the next contact so you cannot disappear. Read this once. Then answer when they message.`;
  }
}

export function fallbackSpokenClose(decision: VerdictDecision) {
  switch (decision) {
    case "hire":
      return "That's enough. You're stamped. We'll send it in writing.";
    case "reject":
      return "That's enough. You're not through. The letter is already in the tray.";
    case "callback":
      return "Don't leave. I want another pass before I stamp anything.";
    case "obsessed":
      return "Stay. I'm sending you something that is not the usual letter.";
  }
}

export function chooseForcedDecision(options?: {
  preferPersonal?: boolean;
  preferClean?: boolean;
  allowCallback?: boolean;
  lastHour?: boolean;
}): VerdictDecision {
  if (options?.lastHour) {
    return options.preferPersonal ? "obsessed" : "reject";
  }
  if (options?.preferPersonal) return "obsessed";
  if (options?.preferClean) return "hire";
  if (options?.allowCallback === false) return "reject";
  return "reject";
}

export function fallbackVerdict(
  appliedJob: string,
  options?: {
    preferPersonal?: boolean;
    preferClean?: boolean;
    allowCallback?: boolean;
    lastHour?: boolean;
    decision?: VerdictDecision;
  }
): InterviewVerdict {
  let decision = options?.decision || chooseForcedDecision(options);
  if (options?.lastHour && decision === "callback") decision = "reject";
  if (options?.allowCallback === false && decision === "callback") {
    decision = options?.preferPersonal ? "obsessed" : "reject";
  }
  return { decision, letter: fallbackLetter(decision, appliedJob) };
}

export function extractVerdict(
  raw: string,
  appliedJob = "the hour"
): {
  reply: string;
  verdict: InterviewVerdict | null;
} {
  const verdictMatch = raw.match(VERDICT_RE);
  const closedLetter = raw.match(LETTER_RE);
  const openLetter = closedLetter ? null : raw.match(LETTER_OPEN_RE);
  const decision = verdictMatch?.[1]?.toLowerCase();
  let letter = (closedLetter?.[1] || openLetter?.[1] || "").trim();
  letter = letter.replace(/\]\]\s*$/, "").trim();

  let reply = raw
    .replace(VERDICT_RE, "")
    .replace(LETTER_RE, "")
    .replace(LETTER_OPEN_RE, "");
  reply = reply.replace(/\n{3,}/g, "\n\n").trim();

  if (!decision || !isVerdictDecision(decision)) {
    return { reply, verdict: null };
  }

  if (!letter) {
    letter = fallbackLetter(decision, appliedJob);
  }

  return { reply, verdict: { decision, letter } };
}

export function forceCloseInterview(
  raw: string,
  appliedJob: string,
  options?: {
    preferPersonal?: boolean;
    preferClean?: boolean;
    allowCallback?: boolean;
    lastHour?: boolean;
  }
): { reply: string; verdict: InterviewVerdict } {
  const parsed = extractVerdict(raw, appliedJob);
  if (parsed.verdict) {
    const verdict =
      options?.lastHour && parsed.verdict.decision === "callback"
        ? fallbackVerdict(appliedJob, { ...options, decision: "reject" })
        : parsed.verdict;
    return {
      reply: parsed.reply || fallbackSpokenClose(verdict.decision),
      verdict,
    };
  }
  const verdict = fallbackVerdict(appliedJob, options);
  return {
    reply: parsed.reply || fallbackSpokenClose(verdict.decision),
    verdict,
  };
}

export function verdictHeadline(decision: VerdictDecision) {
  switch (decision) {
    case "hire":
      return "Offer of employment";
    case "reject":
      return "Application decision";
    case "callback":
      return "Second-round request";
    case "obsessed":
      return "Personal correspondence";
  }
}

export function verdictLabel(decision: VerdictDecision) {
  switch (decision) {
    case "hire":
      return "Hired";
    case "reject":
      return "Rejected";
    case "callback":
      return "Callback";
    case "obsessed":
      return "Private follow-up";
  }
}

export function shouldRequestVerdict(
  turnCount: number,
  minTurn = MIN_VERDICT_TURN
) {
  return turnCount >= minTurn;
}

export function mustIssueVerdict(
  turnCount: number,
  forceTurn = FORCE_VERDICT_TURN
) {
  return turnCount >= forceTurn;
}

export function buildVerdictGuide(
  turnCount: number,
  appliedJob: string,
  options?: {
    minTurn?: number;
    forceTurn?: number;
    allowCallback?: boolean;
    preferPersonal?: boolean;
    preferClean?: boolean;
    lastHour?: boolean;
  }
) {
  const minTurn = options?.minTurn ?? MIN_VERDICT_TURN;
  const forceTurn = options?.forceTurn ?? FORCE_VERDICT_TURN;
  if (!shouldRequestVerdict(turnCount, minTurn)) {
    return `VERDICT RULE: Do not include [[VERDICT:...]] or [[LETTER:...]] tags. Keep interviewing for ${appliedJob}.`;
  }

  const lastHour = Boolean(options?.lastHour);
  const force = mustIssueVerdict(turnCount, forceTurn) || lastHour
    ? `You MUST end the interview this turn. Do not ask another question. Do not keep them talking.`
    : `If you have enough signal, you MAY end the interview this turn. Otherwise ask one last sharp question.`;
  const allowed =
    options?.allowCallback === false || lastHour
      ? "hire|reject|obsessed"
      : "hire|reject|callback|obsessed";
  const lean = lastHour
    ? "This is the last hour of the sample. Close the file. No callback."
    : options?.preferPersonal
      ? "Lean toward obsessed if they kept meeting you as a person. A clean hire should feel undeserved."
      : options?.preferClean
        ? "Lean toward hire or reject. Do not write a personal letter unless they clearly invited it."
        : "Pick the stamp the hour actually earned.";
  const callbackRule =
    options?.allowCallback === false || lastHour
      ? "Do not use callback. Stamp hire, reject, or obsessed and write the letter."
      : "Use callback only if you genuinely need one more pass before a real letter. Callback does not close the hour.";

  return `VERDICT RULE: ${force}
If you end the interview, the spoken reply stays in character (1–3 sentences) and does NOT mention tags, PDFs, or your private secret.
Then append exactly these two tags:

[[VERDICT: ${allowed}]]
[[LETTER: a formal 120–180 word letter on company letterhead voice, written as if HR/legal sent it. It is about the ${appliedJob} role. Do not mention your private trauma, fetish, crime, or twist. Sound official.]]

Use:
- hire = they get the job
- reject = they do not
- callback = another round (only if still allowed)
- obsessed = you want them personally, not as a clean professional hire (letter still reads like an inappropriate personal note on company paper)

${callbackRule}
${lean}`;
}
