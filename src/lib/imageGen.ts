const PHOTO_TAG_RE = /\[\[PHOTO:\s*([\s\S]*?)\]\]/i;

export function extractPhotoTag(raw: string): {
  reply: string;
  photoPrompt: string | null;
} {
  const match = raw.match(PHOTO_TAG_RE);
  if (!match) {
    return { reply: raw.trim(), photoPrompt: null };
  }

  const reply = raw.replace(PHOTO_TAG_RE, "").replace(/\n{3,}/g, "\n\n").trim();
  return { reply, photoPrompt: null };
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
