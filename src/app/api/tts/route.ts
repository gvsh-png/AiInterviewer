import { NextRequest, NextResponse } from "next/server";
import { getInterviewer } from "@/lib/interviewers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENROUTER_API_KEY" },
        { status: 401 }
      );
    }

    const body = (await req.json()) as {
      text?: string;
      interviewerId?: string;
      model?: string;
      voice?: string;
      speed?: number;
    };
    const text = String(body.text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const interviewer = getInterviewer(body.interviewerId || "derek");
    const model =
      body.model ||
      interviewer?.voice.model ||
      process.env.OPENROUTER_TTS_MODEL ||
      "hexgrad/kokoro-82m";
    const voice =
      body.voice ||
      interviewer?.voice.voice ||
      process.env.OPENROUTER_TTS_VOICE ||
      "am_onyx";
    const speed =
      body.speed ??
      interviewer?.voice.speed ??
      1;

    const payload: Record<string, unknown> = {
      model,
      input: text.slice(0, 4000),
      voice,
      response_format: "mp3",
      speed,
    };

    const upstream = await fetch("https://openrouter.ai/api/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_SITE_NAME || "Probe Interviewers",
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      return NextResponse.json(
        {
          error: "TTS request failed",
          detail: detail.slice(0, 500),
        },
        { status: upstream.status }
      );
    }

    const audio = await upstream.arrayBuffer();
    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
