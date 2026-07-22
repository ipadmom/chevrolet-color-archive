#!/usr/bin/env node

import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = path.join(root, "tmp", "commons-gap-audit", "stage-audit.json");
const outputDir = path.join(root, "tmp", "commons-gap-audit", "review-sheets");
const columns = 4;
const rows = 3;
const cellWidth = 440;
const imageHeight = 260;
const labelHeight = 78;
const cellHeight = imageHeight + labelHeight;

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function clipped(value, length) {
  const text = String(value);
  return text.length <= length ? text : `${text.slice(0, length - 1)}…`;
}

async function cell(candidate, index) {
  const input = path.resolve(root, candidate.local_path);
  const image = await sharp(input, { animated: false })
    .rotate()
    .resize({
      width: cellWidth,
      height: imageHeight,
      fit: "contain",
      background: "#e5e7eb",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
  const label = Buffer.from(`<svg width="${cellWidth}" height="${labelHeight}">
    <rect width="100%" height="100%" fill="#111827"/>
    <text x="12" y="24" fill="#f9fafb" font-family="Arial" font-size="18" font-weight="700">${escapeXml(`${index + 1}. ${candidate.model_id} [${candidate.decision}]`)}</text>
    <text x="12" y="49" fill="#d1d5db" font-family="Arial" font-size="15">${escapeXml(clipped(candidate.original_filename, 54))}</text>
    <text x="12" y="69" fill="#9ca3af" font-family="Arial" font-size="13">${escapeXml(`${candidate.width}x${candidate.height}  ${candidate.license}`)}</text>
  </svg>`);
  return sharp({
    create: {
      width: cellWidth,
      height: cellHeight,
      channels: 3,
      background: "#111827",
    },
  })
    .composite([
      { input: image, top: 0, left: 0 },
      { input: label, top: imageHeight, left: 0 },
    ])
    .png()
    .toBuffer();
}

const report = JSON.parse(await readFile(reportPath, "utf8"));
const candidates = report.candidates ?? [];
await mkdir(outputDir, { recursive: true });
const cells = await Promise.all(candidates.map(cell));
const sheetPaths = [];
for (let offset = 0; offset < cells.length; offset += columns * rows) {
  const slice = cells.slice(offset, offset + columns * rows);
  const sheet = sharp({
    create: {
      width: columns * cellWidth,
      height: rows * cellHeight,
      channels: 3,
      background: "#374151",
    },
  });
  const output = path.join(
    outputDir,
    `commons-gap-review-${String(offset / (columns * rows) + 1).padStart(2, "0")}.png`,
  );
  await sheet
    .composite(
      slice.map((input, index) => ({
        input,
        left: (index % columns) * cellWidth,
        top: Math.floor(index / columns) * cellHeight,
      })),
    )
    .png()
    .toFile(output);
  sheetPaths.push(path.relative(root, output).replaceAll(path.sep, "/"));
}
console.log(JSON.stringify({ candidate_count: candidates.length, sheet_paths: sheetPaths }, null, 2));
