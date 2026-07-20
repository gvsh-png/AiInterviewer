#!/usr/bin/env node
/**
 * Generates distinct stylized SVG portrait avatars for each interviewer.
 */
const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "../public/avatars");
fs.mkdirSync(outDir, { recursive: true });

const portraits = [
  {
    id: "marlene",
    bg: ["#2a1522", "#5a2d45"],
    skin: "#d4a894",
    hair: "#1a0e14",
    lips: "#a03050",
    eyes: "#3a1828",
    accent: "#c45a8a",
    hairPath:
      "M30 78 C28 40, 55 18, 100 22 C145 18, 172 40, 170 78 C160 48, 130 38, 100 40 C70 38, 40 48, 30 78 Z",
    extra: `<rect x="118" y="92" width="22" height="3" rx="1" fill="#c45a8a" opacity="0.85"/>`,
  },
  {
    id: "voss",
    bg: ["#121820", "#2a3544"],
    skin: "#c4a890",
    hair: "#2a3038",
    lips: "#8a6050",
    eyes: "#4a6070",
    accent: "#6a8aaa",
    hairPath:
      "M38 70 C40 35, 60 28, 100 28 C140 28, 160 35, 162 70 L155 55 C140 42, 120 40, 100 40 C80 40, 60 42, 45 55 Z",
    extra: `<path d="M70 118 L100 122 L130 118" stroke="#6a8aaa" stroke-width="2" fill="none" opacity="0.5"/>`,
  },
  {
    id: "celeste",
    bg: ["#1c1630", "#4a3a6a"],
    skin: "#e8c8b8",
    hair: "#e8e0f0",
    lips: "#b07090",
    eyes: "#6a50a0",
    accent: "#9a7ad0",
    hairPath:
      "M25 90 C20 30, 50 10, 100 14 C150 10, 180 30, 175 95 C165 50, 140 35, 100 38 C60 35, 35 50, 25 90 Z",
    extra: `<circle cx="100" cy="58" r="9" fill="none" stroke="#9a7ad0" stroke-width="1.5" opacity="0.7"/>`,
  },
  {
    id: "griffin",
    bg: ["#181818", "#3a3a3a"],
    skin: "#c8a888",
    hair: "#1a1510",
    lips: "#8a5040",
    eyes: "#3a3028",
    accent: "#e8a020",
    hairPath:
      "M35 75 C30 35, 55 15, 95 20 C110 8, 130 18, 145 25 C165 35, 170 55, 165 78 C150 45, 125 40, 100 42 C75 40, 50 48, 35 75 Z",
    extra: `<path d="M55 78 Q100 70 145 78" stroke="#e8a020" stroke-width="1.5" fill="none" opacity="0.4"/>`,
  },
  {
    id: "pike",
    bg: ["#102020", "#2a4848"],
    skin: "#d0b8a8",
    hair: "#4a4040",
    lips: "#9a6058",
    eyes: "#2a5050",
    accent: "#3cb8a8",
    hairPath:
      "M42 72 C45 32, 65 24, 100 24 C135 24, 155 32, 158 72 L150 48 C135 36, 115 34, 100 34 C85 34, 65 36, 50 48 Z",
    extra: `<rect x="86" y="48" width="28" height="2" fill="#3cb8a8" opacity="0.6"/>`,
  },
  {
    id: "june",
    bg: ["#1e1c14", "#4a4630"],
    skin: "#e0c4a8",
    hair: "#c8a040",
    lips: "#c07060",
    eyes: "#5a4830",
    accent: "#c8b050",
    hairPath:
      "M28 85 C25 40, 55 15, 100 18 C148 14, 175 42, 172 88 C155 45, 130 36, 100 38 C70 36, 42 48, 28 85 Z",
    extra: `<circle cx="148" cy="100" r="4" fill="#c8b050" opacity="0.8"/>`,
  },
  {
    id: "romanov",
    bg: ["#1a0e0c", "#5a2820"],
    skin: "#b89880",
    hair: "#2a1810",
    lips: "#7a4030",
    eyes: "#4a2820",
    accent: "#b05030",
    hairPath:
      "M36 68 C40 30, 65 22, 100 22 C135 22, 160 30, 164 68 C155 42, 130 38, 100 38 C70 38, 45 42, 36 68 Z",
    extra: `<path d="M60 55 L70 50 M130 50 L140 55" stroke="#b05030" stroke-width="2" opacity="0.5"/>`,
  },
  {
    id: "ashley",
    bg: ["#1a1020", "#5a3060"],
    skin: "#e0b8a8",
    hair: "#301828",
    lips: "#d05090",
    eyes: "#602048",
    accent: "#e060c0",
    hairPath:
      "M22 100 C18 35, 50 12, 100 16 C150 10, 185 38, 178 110 C160 50, 135 34, 100 36 C65 34, 38 55, 22 100 Z",
    extra: `<circle cx="132" cy="108" r="5" fill="#e060c0"/><circle cx="132" cy="108" r="2" fill="#fff" opacity="0.5"/>`,
  },
  {
    id: "hector",
    bg: ["#141a14", "#3a4838"],
    skin: "#c8b090",
    hair: "#3a3830",
    lips: "#8a7060",
    eyes: "#405040",
    accent: "#8aaa60",
    hairPath:
      "M40 72 C42 38, 62 30, 100 30 C138 30, 158 38, 160 72 C148 50, 125 46, 100 46 C75 46, 52 50, 40 72 Z",
    extra: `<rect x="72" y="95" width="56" height="18" rx="2" fill="#2a3028" opacity="0.5"/>`,
  },
  {
    id: "vera",
    bg: ["#12141c", "#2e3448"],
    skin: "#d8c0b0",
    hair: "#1a1c28",
    lips: "#8a5060",
    eyes: "#303858",
    accent: "#7080c0",
    hairPath:
      "M34 80 C32 35, 58 18, 100 20 C142 18, 168 35, 166 80 C155 45, 130 38, 100 40 C70 38, 45 45, 34 80 Z",
    extra: `<path d="M78 88 L90 88 M110 88 L122 88" stroke="#7080c0" stroke-width="1.5" opacity="0.7"/>`,
  },
  {
    id: "knox",
    bg: ["#100e18", "#2a2040"],
    skin: "#c4a080",
    hair: "#1a1020",
    lips: "#8a4038",
    eyes: "#ff4040",
    accent: "#ff4040",
    hairPath:
      "M32 78 C28 32, 55 12, 100 16 C148 10, 175 35, 168 82 C150 42, 125 36, 100 38 C75 36, 48 45, 32 78 Z",
    extra: `<path d="M88 125 Q100 132 112 125" stroke="#ff4040" stroke-width="2" fill="none" opacity="0.6"/>`,
  },
];

function svgFor(p) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="768" height="768">
  <defs>
    <radialGradient id="bg" cx="50%" cy="35%" r="70%">
      <stop offset="0%" stop-color="${p.bg[1]}"/>
      <stop offset="100%" stop-color="${p.bg[0]}"/>
    </radialGradient>
    <radialGradient id="skin" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="${p.skin}"/>
      <stop offset="100%" stop-color="${p.skin}" stop-opacity="0.85"/>
    </radialGradient>
  </defs>
  <rect width="200" height="200" fill="url(#bg)"/>
  <ellipse cx="100" cy="210" rx="70" ry="40" fill="${p.accent}" opacity="0.15"/>
  <!-- neck -->
  <path d="M78 145 L85 175 L115 175 L122 145 Z" fill="${p.skin}" opacity="0.9"/>
  <!-- shoulders -->
  <path d="M20 200 C40 155, 70 150, 100 152 C130 150, 160 155, 180 200 Z" fill="${p.accent}" opacity="0.35"/>
  <path d="M30 200 C48 162, 75 156, 100 158 C125 156, 152 162, 170 200 Z" fill="${p.bg[1]}" opacity="0.9"/>
  <!-- head -->
  <ellipse cx="100" cy="100" rx="48" ry="56" fill="url(#skin)"/>
  <!-- hair -->
  <path d="${p.hairPath}" fill="${p.hair}"/>
  <!-- eyes -->
  <ellipse cx="78" cy="98" rx="6" ry="7" fill="#fff" opacity="0.9"/>
  <ellipse cx="122" cy="98" rx="6" ry="7" fill="#fff" opacity="0.9"/>
  <ellipse cx="79" cy="99" rx="3.2" ry="3.8" fill="${p.eyes}"/>
  <ellipse cx="123" cy="99" rx="3.2" ry="3.8" fill="${p.eyes}"/>
  <circle cx="80" cy="97.5" r="1.1" fill="#fff"/>
  <circle cx="124" cy="97.5" r="1.1" fill="#fff"/>
  <!-- brows -->
  <path d="M68 88 Q78 84 88 88" stroke="${p.hair}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <path d="M112 88 Q122 84 132 88" stroke="${p.hair}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <!-- nose -->
  <path d="M100 102 L96 118 Q100 121 104 118 Z" fill="${p.skin}" stroke="${p.lips}" stroke-width="0.6" opacity="0.7"/>
  <!-- mouth -->
  <path d="M86 130 Q100 138 114 130" stroke="${p.lips}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  ${p.extra || ""}
  <circle cx="100" cy="100" r="98" fill="none" stroke="${p.accent}" stroke-width="2" opacity="0.25"/>
</svg>`;
}

for (const p of portraits) {
  const file = path.join(outDir, `${p.id}.svg`);
  fs.writeFileSync(file, svgFor(p));
  console.log("wrote", file);
}
console.log("done");
