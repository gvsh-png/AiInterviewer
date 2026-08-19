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

export const MIN_VERDICT_TURN = 6;
export const FORCE_VERDICT_TURN = 8;

const VERDICT_RE = /\[\[VERDICT:\s*(hire|reject|callback|obsessed)\s*\]\]/i;
const LETTER_RE = /\[\[LETTER:\s*([\s\S]*?)\]\]/i;

export function isVerdictDecision(value: string): value is VerdictDecision {
  return (VERDICT_DECISIONS as readonly string[]).includes(value);
}

export function extractVerdict(raw: string): {
  reply: string;
  verdict: InterviewVerdict | null;
} {
  const verdictMatch = raw.match(VERDICT_RE);
  const letterMatch = raw.match(LETTER_RE);
  const decision = verdictMatch?.[1]?.toLowerCase();
  const letter = letterMatch?.[1]?.trim() || "";

  let reply = raw.replace(VERDICT_RE, "").replace(LETTER_RE, "");
  reply = reply.replace(/\n{3,}/g, "\n\n").trim();

  if (!decision || !isVerdictDecision(decision) || !letter) {
    return { reply, verdict: null };
  }

  return { reply, verdict: { decision, letter } };
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
  }
) {
  const minTurn = options?.minTurn ?? MIN_VERDICT_TURN;
  const forceTurn = options?.forceTurn ?? FORCE_VERDICT_TURN;
  if (!shouldRequestVerdict(turnCount, minTurn)) {
    return `VERDICT RULE: Do not include [[VERDICT:...]] or [[LETTER:...]] tags. Keep interviewing for ${appliedJob}.`;
  }

  const force = mustIssueVerdict(turnCount, forceTurn)
    ? `You MUST end the interview this turn.`
    : `If you have enough signal, you MAY end the interview this turn. Otherwise ask one last sharp question.`;
  const allowed = options?.allowCallback === false
    ? "hire|reject|obsessed"
    : "hire|reject|callback|obsessed";
  const lean = options?.preferPersonal
    ? "Lean toward obsessed if they kept meeting you as a person. A clean hire should feel undeserved."
    : options?.preferClean
      ? "Lean toward hire or reject. Do not write a personal letter unless they clearly invited it."
      : "Pick the stamp the hour actually earned.";
  const callbackRule =
    options?.allowCallback === false
      ? "Do not use callback. The second pass already happened. Stamp hire, reject, or obsessed."
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
