import { NextRequest, NextResponse } from "next/server";
import {
  assembleShots,
  ensureOpeningNight,
  validateShots,
  type CutsceneContext,
  type CutsceneKind,
} from "@/lib/cutscenes";
import { runFromIds } from "@/lib/storySeed";

export const runtime = "nodejs";
export const maxDuration = 30;

type StoryBody = {
  kind?: CutsceneKind;
  seed?: string;
  premiseId?: string;
  nightId?: string;
  throughlineId?: string;
  round?: number;
  total?: number;
  person?: CutsceneContext["person"];
  lastVerdict?: CutsceneContext["lastVerdict"];
  lastName?: string;
  hires?: number;
  obsessed?: number;
  rejects?: number;
  endingTitle?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as StoryBody;
    const run = runFromIds(
      String(body.seed || "probe"),
      String(body.premiseId || ""),
      String(body.nightId || ""),
      String(body.throughlineId || "")
    );
    const ctx: CutsceneContext = {
      run,
      kind: body.kind || "prologue",
      round: Number(body.round) || 1,
      total: Number(body.total) || 12,
      person: body.person || null,
      lastVerdict: body.lastVerdict || null,
      lastName: body.lastName || null,
      hires: Number(body.hires) || 0,
      obsessed: Number(body.obsessed) || 0,
      rejects: Number(body.rejects) || 0,
      endingTitle: body.endingTitle || "",
    };
    const fallback = assembleShots(ctx);

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ shots: fallback, source: "local" });
    }

    const model =
      process.env.OPENROUTER_STORY_MODEL ||
      process.env.OPENROUTER_MODEL ||
      "openai/gpt-4o-mini";
    const stills =
      "building, hallway, door, file, letter, phone, chair, glass, desk, night, portrait";
    const system = `You write PROBE cutscenes: short cinematic shots for a late-night corporate horror interview game.
Return ONLY JSON: {"shots":[{"still":"...","kicker":"...","line":"..."}]}
still must be one of: ${stills}
Rules:
- 1-2 spoken sentences per line. No markdown. No lists.
- Never mention twists, crimes, stalking, cults, game mechanics, NPCs, or that this is a game.
- You may use cover names, titles, companies, and assigned jobs only.
- Keep the building ominous, specific, and continuous with the given night, premise, and through-line.
- Prologue: 5 shots. Arrive: 4 shots, last still must be portrait if a person is named. Aftermath: 3 shots. Midpoint: 4 shots. Ending: 5 shots.`;

    const user = JSON.stringify({
      kind: ctx.kind,
      premise: run.premise,
      night: run.night,
      throughline: run.throughline,
      round: ctx.round,
      total: ctx.total,
      person: ctx.person,
      lastVerdict: ctx.lastVerdict,
      lastName: ctx.lastName,
      hires: ctx.hires,
      obsessed: ctx.obsessed,
      rejects: ctx.rejects,
      endingTitle: ctx.endingTitle,
    });

    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
        temperature: 0.85,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!upstream.ok) {
      return NextResponse.json({ shots: fallback, source: "local" });
    }

    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content || "";
    let parsed: unknown = null;
    try {
      const jsonStart = content.indexOf("{");
      const jsonEnd = content.lastIndexOf("}");
      parsed =
        jsonStart >= 0
          ? JSON.parse(content.slice(jsonStart, jsonEnd + 1))
          : null;
    } catch {
      parsed = null;
    }
    const shots = ensureOpeningNight(
      ctx.kind,
      validateShots(parsed) || fallback
    );
    if (ctx.kind === "arrive" && ctx.person) {
      const last = shots[shots.length - 1];
      if (last) last.still = "portrait";
    }
    return NextResponse.json({ shots, source: "openrouter" });
  } catch {
    return NextResponse.json(
      { error: "Story request failed" },
      { status: 500 }
    );
  }
}
