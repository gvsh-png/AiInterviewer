import { NextRequest, NextResponse } from "next/server";
import { isStillKind, stillSrc, type StillKind } from "@/lib/cutscenes";

export const runtime = "nodejs";

type Body = {
  still?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const still = isStillKind(String(body.still || ""))
      ? (body.still as StillKind)
      : "night";
    return NextResponse.json({ src: stillSrc(still), source: "baked" });
  } catch {
    return NextResponse.json(
      { src: "/stills/night.jpg", source: "baked" },
      { status: 200 }
    );
  }
}
