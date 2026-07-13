// Generate raster icons for the DAX Query Plan Viewer from the master SVG.
//
//   pnpm icons
//
// Source: public/favicon.svg (the plan-tree glyph on the indigo->teal badge).
// Outputs to public/icons:
//   - icon-32.png, icon-180.png (apple-touch), icon-192.png, icon-512.png
//   - icon-192-maskable.png, icon-512-maskable.png (art inset on a solid
//     background so the OS shape mask crops cleanly)
// and public/favicon.ico (16/32/48 multi-resolution).

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const source = join(root, 'public', 'favicon.svg');
const outDir = join(root, 'public', 'icons');
const publicDir = join(root, 'public');
const BACKGROUND = '#0b1220';

function renderPng(svg, size) {
  return sharp(svg, { density: Math.max(96, size * 2) })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function renderMaskable(svg, size) {
  const inner = Math.round(size * 0.8);
  const inset = Math.round((size - inner) / 2);
  const art = await sharp(svg, { density: Math.max(96, size * 2) })
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: BACKGROUND } })
    .composite([{ input: art, left: inset, top: inset }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const svg = await readFile(source);

  const flat = [
    ['icon-32.png', 32],
    ['icon-180.png', 180],
    ['icon-192.png', 192],
    ['icon-512.png', 512],
  ];
  for (const [name, size] of flat) {
    const buffer = await renderPng(svg, size);
    await writeFile(join(outDir, name), buffer);
    console.log(`wrote public/icons/${name} (${buffer.length} B)`);
  }

  for (const size of [192, 512]) {
    const buffer = await renderMaskable(svg, size);
    const name = `icon-${size}-maskable.png`;
    await writeFile(join(outDir, name), buffer);
    console.log(`wrote public/icons/${name} (${buffer.length} B)`);
  }

  const icoSources = await Promise.all([16, 32, 48].map((size) => renderPng(svg, size)));
  const ico = await pngToIco(icoSources);
  await writeFile(join(publicDir, 'favicon.ico'), ico);
  console.log(`wrote public/favicon.ico (${ico.length} B)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
