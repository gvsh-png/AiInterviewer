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

export async function generateOpenRouterImage(
  apiKey: string,
  prompt: string,
  aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" = "1:1"
): Promise<string | null> {
  const model =
    process.env.OPENROUTER_IMAGE_MODEL || "google/gemini-2.5-flash-image";
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer":
      process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
    "X-Title": process.env.OPENROUTER_SITE_NAME || "Probe Interviewers",
  };

  try {
    const upstream = await fetch("https://openrouter.ai/api/v1/images", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        prompt,
        aspect_ratio: aspectRatio,
        output_format: "jpeg",
      }),
    });

    if (upstream.ok) {
      const data = (await upstream.json()) as OpenRouterImageResponse;
      const parsed = parseImageResponse(data);
      if (parsed) return parsed;
    } else {
      const detail = await upstream.text();
      console.error("Image generation failed", upstream.status, detail.slice(0, 400));
    }
  } catch (err) {
    console.error("Image generation error", err);
  }

  try {
    const chat = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!chat.ok) return null;
    const data = (await chat.json()) as {
      choices?: Array<{
        message?: {
          images?: Array<{ image_url?: { url?: string } }>;
          content?: unknown;
        };
      }>;
    };
    const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (url) return url;
  } catch (err) {
    console.error("Image chat fallback error", err);
  }

  return null;
}

type OpenRouterImageResponse = {
  data?: Array<{
    b64_json?: string;
    media_type?: string;
    url?: string;
    image_url?: { url?: string };
  }>;
};

function parseImageResponse(data: OpenRouterImageResponse): string | null {
  const image = data.data?.[0];
  if (!image) return null;
  if (image.b64_json) {
    const mediaType = image.media_type || "image/jpeg";
    return `data:${mediaType};base64,${image.b64_json}`;
  }
  return image.url || image.image_url?.url || null;
}

export async function generateInterviewerPhoto(
  apiKey: string,
  interviewer: Interviewer,
  photoPrompt: string
): Promise<GeneratedPhoto | null> {
  const prompt = enrichImagePrompt(interviewer, photoPrompt);
  const dataUrl = await generateOpenRouterImage(apiKey, prompt, "1:1");
  if (!dataUrl) return null;
  return { dataUrl, prompt: photoPrompt };
}
