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
  mustIssueVerdict,
} from "@/lib/verdict";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody = {
  messages: ChatMessage[];
  meta?: Partial<ConversationMeta>;
  interviewerId?: string;
  appliedJob?: string;
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
    const therapyDelta = lastUser
      ? detectTherapyScoreDelta(lastUser.content)
      : 0;
    const therapyScore = prevTherapy + therapyDelta;
    const turnCount = priorTurns;
    const phase = derivePhase(turnCount, therapyScore);
    const photoAllowed = canSharePhoto(turnCount, lastImageTurn, 10);
    const wantsVerdict = mustIssueVerdict(turnCount);

    const meta: ConversationMeta = {
      turnCount,
      therapyScore,
      phase,
      lastImageTurn,
    };
    const system = buildSystemPrompt(
      interviewer.systemPrompt,
      meta,
      [
        buildCoverGuide(interviewer, appliedJob),
        buildPhotoSystemGuide(interviewer, photoAllowed),
        buildVerdictGuide(turnCount, appliedJob),
      ].join("\n\n")
    );

    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

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
          temperature: 0.9,
          max_tokens: wantsVerdict || photoAllowed ? 520 : 180,
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
    const verdictParsed = extractVerdict(photoParsed.reply);
    const reply =
      verdictParsed.reply ||
      (verdictParsed.verdict
        ? "That's enough. We'll send you something in writing."
        : photoParsed.reply || rawReply);
    let image: { dataUrl: string; caption: string } | null = null;
    let nextLastImageTurn = lastImageTurn;
    const photoPrompt = photoParsed.photoPrompt;

    if (photoAllowed && photoPrompt && !verdictParsed.verdict) {
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

    return NextResponse.json({
      reply,
      meta: {
        ...meta,
        lastImageTurn: nextLastImageTurn,
        verdict: verdictParsed.verdict || undefined,
      },
      image,
      verdict: verdictParsed.verdict,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
