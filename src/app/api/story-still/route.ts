import { NextRequest, NextResponse } from "next/server";
import { generateOpenRouterImage } from "@/lib/imageGen";
import { isStillKind, stillPrompt, stillSrc, type StillKind } from "@/lib/cutscenes";
import { NIGHTS } from "@/lib/storySeed";

export const runtime = "nodejs";
export const maxDuration = 45;

type Body = {
  still?: string;
  nightId?: string;
  night?: string;
  premise?: string;
  throughline?: string;
  kicker?: string;
  line?: string;
  personName?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const still = isStillKind(String(body.still || ""))
      ? (body.still as StillKind)
      : "night";
    const fallback = stillSrc(still);
    const night = NIGHTS.find((item) => item.id === body.nightId);
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ src: fallback, source: "baked" });
    }

    const prompt = stillPrompt({
      still,
      kicker: String(body.kicker || night?.kicker || "PROBE"),
      line: String(body.line || night?.hook || "The glass does not advertise."),
      night: [night?.title, night?.visual, body.night].filter(Boolean).join(". "),
      premise: String(body.premise || ""),
      throughline: String(body.throughline || ""),
      personName: String(body.personName || ""),
    });
    const image = await generateOpenRouterImage(apiKey, prompt, "16:9");
    if (!image) {
      return NextResponse.json({ src: fallback, source: "baked" });
    }
    return NextResponse.json({ src: image, source: "openrouter" });
  } catch {
    return NextResponse.json(
      { src: "/stills/night.jpg", source: "baked" },
      { status: 200 }
    );
  }
}
