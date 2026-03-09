/**
 * generate-favicon.mjs
 *
 * Converts the AFENDA icon SVG to a multi-resolution favicon.ico
 * containing 16×16, 32×32, and 48×48 bitmaps.
 *
 * Usage:
 *   pnpm --filter @afenda/web generate:favicon
 *   — or —
 *   node scripts/generate-favicon.mjs
 *
 * Requires: sharp, png-to-ico
 *   pnpm --filter @afenda/web add -D sharp png-to-ico
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, "../src/app/icon.svg");
const outPath = resolve(__dirname, "../src/app/favicon.ico");

const svgBuffer = readFileSync(svgPath);
const sizes = [16, 32, 48];

async function generate() {
  const pngBuffers = await Promise.all(
    sizes.map((size) =>
      sharp(svgBuffer)
        .resize(size, size)
        .png({ quality: 100, effort: 10 })
        .toBuffer()
    )
  );

  const icoBuffer = await pngToIco(pngBuffers);
  writeFileSync(outPath, icoBuffer);

  console.log(`✓ favicon.ico generated → ${outPath}`);
  console.log(`  Sizes: ${sizes.map((s) => `${s}×${s}`).join(", ")}`);
}

generate().catch((err) => {
  console.error("✗ favicon generation failed:", err.message);
  process.exit(1);
});
