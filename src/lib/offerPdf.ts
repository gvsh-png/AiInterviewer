import type { Interviewer } from "@/lib/interviewers";
import {
  verdictHeadline,
  type InterviewVerdict,
} from "@/lib/verdict";

function escapePdf(text: string) {
  return text
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll("\r", "");
}

function toWinAnsi(text: string) {
  return text
    .replaceAll("—", "-")
    .replaceAll("–", "-")
    .replaceAll("’", "'")
    .replaceAll("‘", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("…", "...")
    .replace(/[^\x09\x20-\x7E]/g, " ");
}

function wrapLine(text: string, maxChars: number) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function wrapParagraphs(text: string, maxChars: number) {
  const blocks = text.split(/\n+/);
  const lines: string[] = [];
  for (const block of blocks) {
    lines.push(...wrapLine(block.trim(), maxChars));
    lines.push("");
  }
  if (lines.at(-1) === "") lines.pop();
  return lines;
}

export function buildVerdictPdf(options: {
  interviewer: Interviewer;
  appliedJob: string;
  verdict: InterviewVerdict;
}) {
  const { interviewer, appliedJob, verdict } = options;
  const date = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const headline = verdictHeadline(verdict.decision);
  const bodyLines = [
    interviewer.company.toUpperCase(),
    "Office of Hiring",
    "",
    date,
    "",
    `Re: ${appliedJob} — ${headline}`,
    "",
    ...wrapParagraphs(toWinAnsi(verdict.letter), 86),
    "",
    "Sincerely,",
    interviewer.name,
    interviewer.title,
    interviewer.company,
  ];

  const leading = 14;
  const startY = 720;
  const ops: string[] = [
    "BT",
    "/F1 11 Tf",
    `${leading} TL`,
    `54 ${startY} Td`,
  ];

  bodyLines.forEach((line, index) => {
    if (index === 0) {
      ops.push("/F1 18 Tf");
      ops.push(`(${escapePdf(toWinAnsi(line))}) Tj`);
      ops.push("T*");
      ops.push("/F1 11 Tf");
    } else {
      ops.push(`(${escapePdf(toWinAnsi(line))}) Tj`);
      ops.push("T*");
    }
  });
  ops.push("ET");

  const stream = ops.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>",
  ];

  let offset = 0;
  const header = "%PDF-1.4\n";
  offset += header.length;
  const xref = [0];
  const chunks = [header];
  objects.forEach((body, index) => {
    const obj = `${index + 1} 0 obj\n${body}\nendobj\n`;
    xref.push(offset);
    chunks.push(obj);
    offset += obj.length;
  });
  const xrefStart = offset;
  const xrefTable = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...xref.slice(1).map((value) => `${String(value).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefStart),
    "%%EOF",
  ].join("\n");
  chunks.push(xrefTable);
  return new Blob(chunks, { type: "application/pdf" });
}

export function verdictPdfFilename(company: string, job: string) {
  const slug = `${company}-${job}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "decision"}-letter.pdf`;
}

export function downloadVerdictPdf(options: {
  interviewer: Interviewer;
  appliedJob: string;
  verdict: InterviewVerdict;
}) {
  const blob = buildVerdictPdf(options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = verdictPdfFilename(
    options.interviewer.company,
    options.appliedJob
  );
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
