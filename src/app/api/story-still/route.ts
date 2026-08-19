import { NextRequest, NextResponse } from "next/server";
import { generateOpenRouterImage } from "@/lib/imageGen";
import { isStillKind, stillPrompt, type StillKind } from "@/lib/cutscenes";

export const runtime = "nodejs";
export const maxDuration = 60;

type StillBody = {
  still?: string;
  line?: string;
  kicker?: string;
  night?: string;
  premise?: string;
  throughline?: string;
  personName?: string;
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing key" }, { status: 401 });
    }

    const body = (await req.json()) as StillBody;
    const still = String(body.still || "");
    if (!isStillKind(still)) {
      return NextResponse.json({ error: "Unknown still" }, { status: 400 });
    }

    const prompt = stillPrompt({
      still: still as StillKind,
      line: String(body.line || "").slice(0, 280),
      kicker: String(body.kicker || "PROBE").slice(0, 48),
      night: String(body.night || "").slice(0, 160),
      premise: String(body.premise || "").slice(0, 160),
      throughline: String(body.throughline || "").slice(0, 200),
      personName: String(body.personName || "").slice(0, 80),
    });

    const image = await generateOpenRouterImage(apiKey, prompt, "16:9");
    if (!image) {
      return NextResponse.json({ error: "Still failed" }, { status: 502 });
    }
    return NextResponse.json({ image });
  } catch {
    return NextResponse.json({ error: "Still request failed" }, { status: 500 });
  }
}
