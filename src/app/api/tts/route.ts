import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DEREK_VOICE_INSTRUCTIONS = [
  "Speak as a middle-aged American man.",
  "Deep, grounded, natural male voice — slightly gravelly, never high or thin.",
  "Conversational and human, not robotic or announcer-like.",
  "Strict, impatient Senior QA lead energy: dry, clipped, a little world-weary.",
  "Keep a steady low register. No smile in the voice unless the line is sarcastic.",
].join(" ");

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENROUTER_API_KEY" },
        { status: 401 }
      );
    }

    const body = (await req.json()) as { text?: string };
    const text = String(body.text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    // Natural American male defaults (Deepgram Aura 2 · Orion).
    const model = process.env.OPENROUTER_TTS_MODEL || "deepgram/aura-2";
    const voice = process.env.OPENROUTER_TTS_VOICE || "aura-2-orion-en";

    const payload: Record<string, unknown> = {
      model,
      input: text.slice(0, 4000),
      voice,
      response_format: "mp3",
      speed: 0.95,
    };

    // Tone instructions only apply to OpenAI TTS models.
    if (/openai\//i.test(model)) {
      payload.provider = {
        options: {
          openai: {
            instructions: DEREK_VOICE_INSTRUCTIONS,
          },
        },
      };
    }

    const upstream = await fetch("https://openrouter.ai/api/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_SITE_NAME || "Derek Interviewer",
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
