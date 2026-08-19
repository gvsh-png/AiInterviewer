import { NextRequest, NextResponse } from "next/server";
import {
  buildSystemPrompt,
  derivePhase,
  detectTherapyScoreDelta,
  type ChatMessage,
  type ConversationMeta,
} from "@/lib/personality";
import { getInterviewer } from "@/lib/interviewers";
import {
  buildPhotoSystemGuide,
  canSharePhoto,
  extractPhotoTag,
  generateInterviewerPhoto,
} from "@/lib/imageGen";
import { buildCoverGuide } from "@/lib/cover";
import {
  buildVerdictGuide,
  extractVerdict,
  forceCloseInterview,
  mustIssueVerdict,
} from "@/lib/verdict";
import {
  buildBuildingGuide,
  buildStanceGuide,
  getDirective,
  hourWindow,
  isStance,
  type SampleStats,
  type Stance,
} from "@/lib/gameplay";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody = {
  messages: ChatMessage[];
  meta?: Partial<ConversationMeta>;
  interviewerId?: string;
  appliedJob?: string;
  stance?: string;
  directiveId?: string;
  building?: Partial<SampleStats> & {
    callbackRound?: boolean;
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;
    const messages = body.messages ?? [];
    const apiKey = process.env.OPENROUTER_API_KEY;
    const interviewer = getInterviewer(body.interviewerId || "derek");
    const appliedJob = String(
      body.appliedJob || interviewer?.job || "this role"
    ).trim();

    if (!interviewer) {
      return NextResponse.json(
        { error: "Unknown interviewer" },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Missing OPENROUTER_API_KEY. Set it in Vercel project environment variables.",
        },
        { status: 401 }
      );
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const priorTurns = messages.filter((m) => m.role === "user").length;
    const prevTherapy = body.meta?.therapyScore ?? 0;
    const lastImageTurn = body.meta?.lastImageTurn ?? 0;
    const priorStances = Array.isArray(body.meta?.stances)
      ? body.meta.stances.filter(isStance)
      : [];
    const stance: Stance = isStance(String(body.stance || ""))
      ? (body.stance as Stance)
      : "work";
    const stances = [...priorStances, stance];
    const callbackRound = Boolean(
      body.meta?.callbackRound || body.building?.callbackRound
    );
    const round = Math.max(1, Number(body.building?.round) || 1);
    const total = Math.max(round, Number(body.building?.total) || 12);
    const lastHour = round >= total;
    const window = hourWindow(round, callbackRound, total);
    const therapyDelta = lastUser
      ? detectTherapyScoreDelta(lastUser.content)
      : 0;
    const softenBonus = stance === "soften" ? 1 : 0;
    const therapyScore = prevTherapy + therapyDelta + softenBonus;
    const turnCount = priorTurns;
    const phase = derivePhase(turnCount, therapyScore);
    const photoEvery = round >= 7 ? 6 : 10;
    const photoAllowed =
      !lastHour && canSharePhoto(turnCount, lastImageTurn, photoEvery);
    const wantsVerdict =
      mustIssueVerdict(turnCount, window.forceVerdict) ||
      (lastHour && turnCount >= window.minVerdict);
    const directive = getDirective(body.directiveId);
    const softenHeavy = stances.filter((item) => item === "soften").length >= 2;
    const workHeavy = stances.filter((item) => item === "work").length >= 2;
    const verdictOptions = {
      minTurn: window.minVerdict,
      forceTurn: window.forceVerdict,
      allowCallback: !callbackRound && !lastHour,
      preferPersonal: softenHeavy || therapyScore >= 4,
      preferClean: workHeavy && therapyScore < 3,
      lastHour,
    };

    const meta: ConversationMeta = {
      turnCount,
      therapyScore,
      phase,
      lastImageTurn,
      stances,
      callbackRound,
    };
    const sample: SampleStats = {
      round,
      total,
      hires: Number(body.building?.hires) || 0,
      rejects: Number(body.building?.rejects) || 0,
      obsessed: Number(body.building?.obsessed) || 0,
      callbacks: Number(body.building?.callbacks) || 0,
      cleanPasses: Number(body.building?.cleanPasses) || 0,
      flagged: Number(body.building?.flagged) || 0,
      midpoint: Boolean(body.building?.midpoint),
      badgeRequested: Boolean(body.building?.badgeRequested),
      hasNote: Boolean(body.building?.hasNote),
      throughlineEcho: String(body.building?.throughlineEcho || ""),
      nightTitle: String(body.building?.nightTitle || ""),
      premiseTitle: String(body.building?.premiseTitle || ""),
    };
    const system = buildSystemPrompt(
      interviewer.systemPrompt,
      meta,
      [
        buildCoverGuide(interviewer, appliedJob),
        buildBuildingGuide(sample, directive, appliedJob),
        buildStanceGuide(stance, appliedJob),
        buildPhotoSystemGuide(interviewer, photoAllowed),
        buildVerdictGuide(turnCount, appliedJob, verdictOptions),
      ].join("\n\n")
    );

    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

    const closedPayload = (forced: {
      reply: string;
      verdict: NonNullable<ReturnType<typeof extractVerdict>["verdict"]>;
    }) => {
      const closed = forced.verdict.decision !== "callback";
      return {
        reply: forced.reply,
        meta: {
          ...meta,
          lastImageTurn,
          callbackRound: !closed && forced.verdict.decision === "callback",
          verdict: closed ? forced.verdict : undefined,
        },
        image: null,
        verdict: forced.verdict,
      };
    };

    const upstream = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
          "X-Title": process.env.OPENROUTER_SITE_NAME || "Probe Interviewers",
        },
        body: JSON.stringify({
          model,
          temperature: wantsVerdict ? 0.6 : 0.9,
          max_tokens: wantsVerdict || photoAllowed ? 900 : 180,
          messages: [
            { role: "system", content: system },
            ...messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          ],
        }),
      }
    );

    if (!upstream.ok) {
      if (wantsVerdict) {
        return NextResponse.json(
          closedPayload(forceCloseInterview("", appliedJob, verdictOptions))
        );
      }
      const detail = await upstream.text();
      return NextResponse.json(
        {
          error: "OpenRouter request failed",
          detail: detail.slice(0, 500),
        },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();
    const rawReply =
      data?.choices?.[0]?.message?.content?.trim() ||
      "I asked you a question. Answer it.";

    const photoParsed = extractPhotoTag(rawReply);
    const forced = wantsVerdict
      ? forceCloseInterview(photoParsed.reply, appliedJob, verdictOptions)
      : extractVerdict(photoParsed.reply, appliedJob);
    const verdict = forced.verdict;
    const reply =
      forced.reply ||
      (verdict
        ? "That's enough. We'll send you something in writing."
        : photoParsed.reply || rawReply);

    if (wantsVerdict && verdict) {
      return NextResponse.json(
        closedPayload({ reply, verdict })
      );
    }

    let image: { dataUrl: string; caption: string } | null = null;
    let nextLastImageTurn = lastImageTurn;
    const photoPrompt = photoParsed.photoPrompt;

    if (photoAllowed && photoPrompt && !verdict) {
      nextLastImageTurn = turnCount;
      const generated = await generateInterviewerPhoto(
        apiKey,
        interviewer,
        photoPrompt
      );
      if (generated) {
        image = {
          dataUrl: generated.dataUrl,
          caption: "Shared photo",
        };
      }
    }

    const closed = verdict && verdict.decision !== "callback";

    return NextResponse.json({
      reply,
      meta: {
        ...meta,
        lastImageTurn: nextLastImageTurn,
        callbackRound:
          callbackRound || verdict?.decision === "callback",
        verdict: closed ? verdict : undefined,
      },
      image,
      verdict,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
