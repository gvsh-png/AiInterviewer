import type { Interviewer } from "@/lib/interviewers";

export type GeneratedPhoto = {
  dataUrl: string;
  prompt: string;
  caption?: string;
};

const PHOTO_TAG_RE = /\[\[PHOTO:\s*([\s\S]*?)\]\]/i;

export function extractPhotoTag(raw: string): {
  reply: string;
  photoPrompt: string | null;
} {
  const match = raw.match(PHOTO_TAG_RE);
  if (!match) {
    return { reply: raw.trim(), photoPrompt: null };
  }

  const photoPrompt = match[1]?.trim() || null;
  const reply = raw.replace(PHOTO_TAG_RE, "").replace(/\n{3,}/g, "\n\n").trim();
  return { reply, photoPrompt };
}

export function canSharePhoto(
  turnCount: number,
  lastImageTurn: number,
  everyN = 10
): boolean {
  if (turnCount < everyN) return false;
  return turnCount - lastImageTurn >= everyN;
}

export function buildPhotoSystemGuide(
  interviewer: Interviewer,
  allowed: boolean
): string {
  if (!allowed) {
    return `PHOTO RULE: Do not include any [[PHOTO:...]] tags in this reply.`;
  }

  return `PHOTO RULE: You may share ONE personal photo if it fits this moment.
If you share a photo, append exactly one tag on its own final line:
[[PHOTO: detailed English visual description of the photo]]
The spoken reply must still make sense without the tag. Never mention the tag, markdown, or "generating an image."
The photo should feel like a candid phone/camera still tied to YOUR story right now.
Stay in character. Suggested photo territory for you: ${interviewer.photoScenes}
Visual look to keep consistent: ${interviewer.lookDescription}
Prefer emotionally loaded, slightly unsettling realism over spectacle.`;
}

export function enrichImagePrompt(
  interviewer: Interviewer,
  photoPrompt: string
): string {
  return [
    "Photorealistic candid photograph, moody documentary lighting, slightly grainy phone photo aesthetic.",
    `Subject identity: ${interviewer.lookDescription}`,
    `Character context: ${interviewer.name}, ${interviewer.title}.`,
    `Scene: ${photoPrompt}`,
    "No text overlays, no logos, no watermarks, no cartoon style.",
  ].join(" ");
}

export async function generateInterviewerPhoto(
  apiKey: string,
  interviewer: Interviewer,
  photoPrompt: string
): Promise<GeneratedPhoto | null> {
  const model =
    process.env.OPENROUTER_IMAGE_MODEL || "google/gemini-2.5-flash-image";
  const prompt = enrichImagePrompt(interviewer, photoPrompt);

  try {
    const upstream = await fetch("https://openrouter.ai/api/v1/images", {
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
        prompt,
        aspect_ratio: "1:1",
        output_format: "jpeg",
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error("Image generation failed", upstream.status, detail.slice(0, 400));
      return null;
    }

    const data = (await upstream.json()) as {
      data?: Array<{ b64_json?: string; media_type?: string }>;
    };
    const image = data.data?.[0];
    const b64 = image?.b64_json;
    if (!b64) return null;

    const mediaType = image.media_type || "image/jpeg";
    return {
      dataUrl: `data:${mediaType};base64,${b64}`,
      prompt: photoPrompt,
    };
  } catch (err) {
    console.error("Image generation error", err);
    return null;
  }
}
