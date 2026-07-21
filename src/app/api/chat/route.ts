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

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody = {
  messages: ChatMessage[];
  meta?: Partial<ConversationMeta>;
  interviewerId?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;
    const messages = body.messages ?? [];
    const apiKey = process.env.OPENROUTER_API_KEY;
    const interviewer = getInterviewer(body.interviewerId || "derek");

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

    const meta: ConversationMeta = {
      turnCount,
      therapyScore,
      phase,
      lastImageTurn,
    };
    const system = buildSystemPrompt(
      interviewer.systemPrompt,
      meta,
      buildPhotoSystemGuide(interviewer, photoAllowed)
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
          max_tokens: photoAllowed ? 260 : 180,
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

    const { reply, photoPrompt } = extractPhotoTag(rawReply);
    let image: { dataUrl: string; caption: string } | null = null;
    let nextLastImageTurn = lastImageTurn;

    if (photoAllowed && photoPrompt) {
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
      reply: reply || rawReply,
      meta: {
        ...meta,
        lastImageTurn: nextLastImageTurn,
      },
      image,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
