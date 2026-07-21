import fs from "fs";
import path from "path";
import sharp from "sharp";

const root = path.join(import.meta.dirname, "../public/avatars");
const ids = [
  "marlene",
  "voss",
  "celeste",
  "griffin",
  "pike",
  "june",
  "romanov",
  "ashley",
  "hector",
  "vera",
  "knox",
];

const artifactDir = "/opt/cursor/artifacts/assets";

for (const id of ids) {
  const src = path.join(artifactDir, `${id}.png`);
  const destPng = path.join(root, `${id}.png`);
  const destWebp = path.join(root, `${id}.webp`);

  if (!fs.existsSync(src)) {
    console.error("missing", src);
    process.exitCode = 1;
    continue;
  }

  await sharp(src)
    .resize(768, 768, { fit: "cover" })
    .png({ palette: true, quality: 80, effort: 10 })
    .toFile(destPng);

  await sharp(destPng)
    .webp({ quality: 82 })
    .toFile(destWebp);

  console.log("wrote", id);
}
