import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { STILL_KINDS, stillPrompt } from "../src/lib/cutscenes.ts";
import { generateOpenRouterImage } from "../src/lib/imageGen.ts";

const outDir = path.join(import.meta.dirname, "../public/stills");
const force = process.argv.includes("--force");

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error("OPENROUTER_API_KEY is required");
  process.exit(1);
}

await mkdir(outDir, { recursive: true });

for (const still of STILL_KINDS) {
  const dest = path.join(outDir, `${still}.jpg`);
  if (!force) {
    try {
      await access(dest);
      console.log("skip", still);
      continue;
    } catch {
      /* generate */
    }
  }

  const prompt = stillPrompt({
    still,
    kicker: "PROBE",
    line: "Late night in the building. No readable signs.",
  });
  const image = await generateOpenRouterImage(apiKey, prompt, "16:9");
  if (!image) {
    console.error("failed", still);
    process.exitCode = 1;
    continue;
  }

  const bytes = image.startsWith("data:")
    ? Buffer.from(image.split(",")[1] || "", "base64")
    : Buffer.from(await (await fetch(image)).arrayBuffer());
  await writeFile(dest, bytes);
  console.log("wrote", dest);
}
