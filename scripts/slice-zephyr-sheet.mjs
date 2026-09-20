/**
 * Slice a 4×4 James sheet (1024×1024, labeled cells) into zephyr anim PNGs.
 * Usage: node scripts/slice-zephyr-sheet.mjs [path/to/sheet.png]
 */
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const SRC = process.argv[2] || process.env.ZEPHYR_SHEET;
if (!SRC || !fs.existsSync(SRC)) {
  console.error('Pass sheet path: node scripts/slice-zephyr-sheet.mjs path/to/sheet.png');
  process.exit(1);
}

const ANIM = 'public/sprites/zephyr/anim';
const ROOT = 'public/sprites/zephyr';
const LABELS = [
  'idle','walk','sprint','jump',
  'fall','crouch','punch','kick',
  'block','grab','throw','hitstun',
  'ledge_hang','ledge_climb','super','respawn',
];
const CELL = 256;
const LABEL_H = 40;
const FRAME = 128;
const PIVOT_Y = 96;

function makeTransparent(data) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = (r + g + b) / 3;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (lum < 18) data[i + 3] = 0;
    else if (lum < 42 && chroma < 14) {
      data[i + 3] = Math.min(data[i + 3], Math.round(((lum - 18) / 24) * 255));
    }
  }
}

fs.mkdirSync(ANIM, { recursive: true });

for (let idx = 0; idx < LABELS.length; idx++) {
  const col = idx % 4;
  const row = Math.floor(idx / 4);
  const label = LABELS[idx];
  const { data, info } = await sharp(SRC)
    .extract({ left: col * CELL, top: row * CELL, width: CELL, height: CELL - LABEL_H })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  makeTransparent(data);
  const trimmed = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 10 })
    .png()
    .toBuffer();
  const meta = await sharp(trimmed).metadata();
  const scale = Math.min((FRAME - 6) / meta.width, (PIVOT_Y - 2) / meta.height);
  const nw = Math.max(1, Math.round(meta.width * scale));
  const nh = Math.max(1, Math.round(meta.height * scale));
  const left = Math.round((FRAME - nw) / 2);
  const top = Math.round(PIVOT_Y - nh);
  await sharp({
    create: { width: FRAME, height: FRAME, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{
      input: await sharp(trimmed).resize(nw, nh).png().toBuffer(),
      left: Math.max(0, Math.min(FRAME - nw, left)),
      top: Math.max(0, Math.min(FRAME - nh, top)),
    }])
    .png()
    .toFile(path.join(ANIM, `${label}.png`));
  console.log(label);
}

await sharp(path.join(ANIM, 'idle.png')).resize(256, 256).png().toFile(path.join(ROOT, 'portrait.png'));
await sharp(path.join(ANIM, 'idle.png')).resize(64, 64).png().toFile(path.join(ROOT, 'hud.png'));
await sharp(path.join(ANIM, 'jump.png')).toFile(path.join(ANIM, 'glide.png'));
console.log('ok');
