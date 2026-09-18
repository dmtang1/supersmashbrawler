import {
  CameraState,
  Fighter,
  FighterId,
  FighterStats,
  ItemKind,
  Particle,
  Projectile,
  Stage,
  SPRINT_STAMINA_MAX,
  WorldItem,
} from './types';
import { ITEM_DEFS } from './items';

/** Seeded 0–1 noise for stable watercolor washes (not Math.random each frame). */
function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function viewCover(
  camera: CameraState,
  canvasWidth: number,
  canvasHeight: number,
  pad = 320
) {
  const zoom = Math.max(camera.zoom, 0.01);
  const viewW = canvasWidth / zoom;
  const viewH = canvasHeight / zoom;
  return {
    originX: camera.x - viewW / 2 - pad,
    originY: camera.y - viewH / 2 - pad,
    coverW: viewW + pad * 2,
    coverH: viewH + pad * 2,
  };
}

type WashBlob = { x: number; y: number; r: number; color: string; a: number };

function fillSkyGradient(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  coverW: number,
  coverH: number,
  stops: Array<[number, string]>
) {
  const sky = ctx.createLinearGradient(0, originY, 0, originY + coverH);
  for (const [t, c] of stops) sky.addColorStop(t, c);
  ctx.fillStyle = sky;
  ctx.fillRect(originX, originY, coverW, coverH);
}

function paintWashes(ctx: CanvasRenderingContext2D, washes: WashBlob[]) {
  for (const w of washes) {
    const g = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, w.r);
    g.addColorStop(0, w.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = w.a;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function paintPaperSpeckles(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  coverW: number,
  coverH: number,
  dark: string,
  light: string
) {
  ctx.save();
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 140; i++) {
    const gx = originX + hash2(i, 11) * coverW;
    const gy = originY + hash2(i, 19) * coverH;
    const s = 1 + hash2(i, 23) * 2.5;
    ctx.fillStyle = hash2(i, 29) > 0.5 ? dark : light;
    ctx.fillRect(gx, gy, s, s);
  }
  ctx.restore();
}

function paintHillBand(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  coverW: number,
  coverH: number,
  baseY: number,
  amp: number,
  waves: number,
  phase: number,
  seed: number,
  color: string,
  alpha: number
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(originX, baseY);
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = originX + coverW * t;
    const y =
      baseY -
      40 +
      Math.sin(t * Math.PI * waves + phase) * amp +
      hash2(i, seed) * (amp * 0.7);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(originX + coverW, originY + coverH);
  ctx.lineTo(originX, originY + coverH);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function paintWorldVignette(
  ctx: CanvasRenderingContext2D,
  camera: CameraState,
  originX: number,
  originY: number,
  coverW: number,
  coverH: number,
  color: string
) {
  const vig = ctx.createRadialGradient(
    camera.x,
    camera.y,
    Math.min(coverW, coverH) * 0.2,
    camera.x,
    camera.y,
    Math.max(coverW, coverH) * 0.55
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, color);
  ctx.fillStyle = vig;
  ctx.fillRect(originX, originY, coverW, coverH);
}

/** Amber Colosseum — warm parchment washes + dusty hills. */
function paintAmberColosseum(
  ctx: CanvasRenderingContext2D,
  stage: Stage,
  camera: CameraState,
  canvasWidth: number,
  canvasHeight: number
) {
  const { originX, originY, coverW, coverH } = viewCover(camera, canvasWidth, canvasHeight);

  fillSkyGradient(ctx, originX, originY, coverW, coverH, [
    [0, stage.bgGradient[0]],
    [0.45, '#d4b8a0'],
    [0.72, '#b08978'],
    [1, stage.bgGradient[1]],
  ]);

  paintWashes(ctx, [
    { x: 200, y: 120, r: 280, color: '#e8c4a8', a: 0.35 },
    { x: 1100, y: 80, r: 320, color: '#c9a0b0', a: 0.28 },
    { x: 700, y: 200, r: 240, color: '#f0dcc8', a: 0.22 },
    { x: 100, y: 520, r: 360, color: '#8b6b5a', a: 0.3 },
    { x: 1200, y: 560, r: 340, color: '#6e4f5c', a: 0.28 },
    { x: 700, y: 640, r: 400, color: '#5c4038', a: 0.25 },
    { x: 400, y: 40, r: 180, color: '#f5e6d3', a: 0.2 },
    { x: 900, y: 300, r: 200, color: '#a87870', a: 0.18 },
  ]);

  paintHillBand(ctx, originX, originY, coverW, coverH, 420, 50, 2.2, 0, 3, '#7a5a4e', 0.35);
  paintHillBand(ctx, originX, originY, coverW, coverH, 500, 55, 1.6, 1, 7, '#5a3d48', 0.28);
  paintPaperSpeckles(ctx, originX, originY, coverW, coverH, '#3b2a22', '#f3e8d8');
  paintWorldVignette(ctx, camera, originX, originY, coverW, coverH, 'rgba(40, 24, 20, 0.28)');
}

/** Moonlit Tide Bridge — giant moon, indigo sky, silver sea. */
function paintMoonlitTide(
  ctx: CanvasRenderingContext2D,
  stage: Stage,
  camera: CameraState,
  canvasWidth: number,
  canvasHeight: number
) {
  const { originX, originY, coverW, coverH } = viewCover(camera, canvasWidth, canvasHeight);

  fillSkyGradient(ctx, originX, originY, coverW, coverH, [
    [0, '#243556'],
    [0.35, stage.bgGradient[0]],
    [0.7, '#152033'],
    [1, stage.bgGradient[1]],
  ]);

  // Soft night color blooms
  paintWashes(ctx, [
    { x: 700, y: 80, r: 420, color: '#3a4f7a', a: 0.4 },
    { x: 200, y: 180, r: 260, color: '#2a3a5c', a: 0.28 },
    { x: 1200, y: 160, r: 280, color: '#4a3a68', a: 0.22 },
    { x: 700, y: 620, r: 480, color: '#0a1424', a: 0.45 },
    { x: 100, y: 560, r: 300, color: '#1a3048', a: 0.25 },
    { x: 1300, y: 580, r: 320, color: '#162838', a: 0.25 },
  ]);

  // Giant watercolor moon
  const moonX = 980;
  const moonY = 160;
  const moonR = 110;
  const moonGlow = ctx.createRadialGradient(moonX, moonY, moonR * 0.4, moonX, moonY, moonR * 2.2);
  moonGlow.addColorStop(0, 'rgba(230, 236, 255, 0.35)');
  moonGlow.addColorStop(1, 'rgba(230, 236, 255, 0)');
  ctx.fillStyle = moonGlow;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR * 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e8eef8';
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(180, 190, 210, 0.35)';
  ctx.beginPath();
  ctx.arc(moonX - 28, moonY + 10, 22, 0, Math.PI * 2);
  ctx.arc(moonX + 18, moonY - 20, 14, 0, Math.PI * 2);
  ctx.arc(moonX + 35, moonY + 30, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#12161f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.stroke();

  // Stars
  ctx.save();
  for (let i = 0; i < 55; i++) {
    const sx = 80 + hash2(i, 2) * 1240;
    const sy = 40 + hash2(i, 5) * 320;
    const sr = 0.8 + hash2(i, 9) * 1.8;
    ctx.globalAlpha = 0.35 + hash2(i, 13) * 0.55;
    ctx.fillStyle = '#eef2ff';
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Distant sea horizon + soft wave bands
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#1a2e44';
  ctx.beginPath();
  ctx.moveTo(originX, 480);
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const x = originX + coverW * t;
    const y = 470 + Math.sin(t * Math.PI * 3 + 0.4) * 8;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(originX + coverW, originY + coverH);
  ctx.lineTo(originX, originY + coverH);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#8eb0c8';
  ctx.lineWidth = 2;
  for (let row = 0; row < 5; row++) {
    const y = 520 + row * 28;
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = originX + coverW * t;
      const yy = y + Math.sin(t * Math.PI * (2.5 + row * 0.4) + row) * (6 + row);
      if (i === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Moon reflection smear on water
  const refl = ctx.createLinearGradient(moonX, 500, moonX, 720);
  refl.addColorStop(0, 'rgba(210, 220, 240, 0.22)');
  refl.addColorStop(1, 'rgba(210, 220, 240, 0)');
  ctx.fillStyle = refl;
  ctx.beginPath();
  ctx.moveTo(moonX - 40, 500);
  ctx.lineTo(moonX + 40, 500);
  ctx.lineTo(moonX + 18, 720);
  ctx.lineTo(moonX - 18, 720);
  ctx.closePath();
  ctx.fill();

  paintPaperSpeckles(ctx, originX, originY, coverW, coverH, '#0a1018', '#d8e0f0');
  paintWorldVignette(ctx, camera, originX, originY, coverW, coverH, 'rgba(8, 12, 24, 0.38)');
}

/** Jade Hot Springs — misty bamboo grove over tea-green pools. */
function paintJadeHotSprings(
  ctx: CanvasRenderingContext2D,
  stage: Stage,
  camera: CameraState,
  canvasWidth: number,
  canvasHeight: number
) {
  const { originX, originY, coverW, coverH } = viewCover(camera, canvasWidth, canvasHeight);

  fillSkyGradient(ctx, originX, originY, coverW, coverH, [
    [0, '#d8e6d4'],
    [0.4, stage.bgGradient[0]],
    [0.7, '#7fa08a'],
    [1, stage.bgGradient[1]],
  ]);

  paintWashes(ctx, [
    { x: 300, y: 100, r: 300, color: '#e8f0e4', a: 0.35 },
    { x: 1000, y: 80, r: 280, color: '#b8d0bc', a: 0.3 },
    { x: 700, y: 220, r: 260, color: '#9cbc9e', a: 0.22 },
    { x: 150, y: 560, r: 340, color: '#3d5c48', a: 0.32 },
    { x: 1200, y: 540, r: 360, color: '#2a4538', a: 0.3 },
    { x: 700, y: 620, r: 400, color: '#1e3328', a: 0.28 },
    { x: 500, y: 480, r: 180, color: '#a8c8b0', a: 0.2 },
  ]);

  // Soft steam plumes rising from pools
  paintWashes(ctx, [
    { x: 280, y: 430, r: 90, color: '#f0f5f0', a: 0.28 },
    { x: 700, y: 450, r: 110, color: '#e8f0ea', a: 0.24 },
    { x: 1120, y: 430, r: 95, color: '#f0f5f0', a: 0.26 },
    { x: 500, y: 380, r: 70, color: '#ffffff', a: 0.12 },
    { x: 900, y: 390, r: 75, color: '#ffffff', a: 0.12 },
  ]);

  // Bamboo stalks (background silhouettes)
  ctx.save();
  for (let i = 0; i < 18; i++) {
    const bx = 40 + i * 78 + hash2(i, 1) * 30;
    const top = 80 + hash2(i, 4) * 120;
    const bot = 520 + hash2(i, 8) * 40;
    ctx.globalAlpha = 0.18 + hash2(i, 6) * 0.16;
    ctx.strokeStyle = '#1e3328';
    ctx.lineWidth = 6 + hash2(i, 10) * 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx, bot);
    ctx.quadraticCurveTo(bx + (hash2(i, 12) - 0.5) * 24, (top + bot) / 2, bx + 4, top);
    ctx.stroke();

    // Segment rings
    ctx.lineWidth = 2;
    ctx.globalAlpha *= 0.7;
    for (let s = 0; s < 4; s++) {
      const sy = top + ((bot - top) * (s + 1)) / 5;
      ctx.beginPath();
      ctx.moveTo(bx - 5, sy);
      ctx.lineTo(bx + 7, sy);
      ctx.stroke();
    }

    // Leaf flick
    if (hash2(i, 15) > 0.4) {
      ctx.beginPath();
      ctx.moveTo(bx + 2, top + 30);
      ctx.quadraticCurveTo(bx + 28, top + 10, bx + 40, top + 22);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Far ridge of mossy hills
  paintHillBand(ctx, originX, originY, coverW, coverH, 440, 45, 2.4, 0.5, 4, '#4a6b55', 0.32);
  paintHillBand(ctx, originX, originY, coverW, coverH, 520, 50, 1.8, 1.2, 9, '#2f4a3c', 0.28);

  // Pool ripples under the fight area
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = '#b8d8c4';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const cx = 350 + i * 220;
    const cy = 560 + (i % 2) * 16;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 70 + i * 8, 14, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  paintPaperSpeckles(ctx, originX, originY, coverW, coverH, '#1e3328', '#e8f0e4');
  paintWorldVignette(ctx, camera, originX, originY, coverW, coverH, 'rgba(24, 40, 30, 0.3)');
}

/** Lantern Skyfair — dusk market, hanging lanterns, warm night sky. */
function paintLanternSkyfair(
  ctx: CanvasRenderingContext2D,
  stage: Stage,
  camera: CameraState,
  canvasWidth: number,
  canvasHeight: number
) {
  const { originX, originY, coverW, coverH } = viewCover(camera, canvasWidth, canvasHeight);

  fillSkyGradient(ctx, originX, originY, coverW, coverH, [
    [0, '#1e1430'],
    [0.35, stage.bgGradient[0]],
    [0.65, '#5a2840'],
    [1, stage.bgGradient[1]],
  ]);

  paintWashes(ctx, [
    { x: 700, y: 60, r: 400, color: '#6a3a58', a: 0.35 },
    { x: 200, y: 140, r: 260, color: '#3a2048', a: 0.3 },
    { x: 1200, y: 120, r: 280, color: '#8a4050', a: 0.25 },
    { x: 700, y: 620, r: 420, color: '#2a1018', a: 0.4 },
    { x: 400, y: 300, r: 180, color: '#c07040', a: 0.15 },
  ]);

  // Distant rooftop silhouettes
  paintHillBand(ctx, originX, originY, coverW, coverH, 460, 35, 3.2, 0.2, 5, '#3a2038', 0.4);
  paintHillBand(ctx, originX, originY, coverW, coverH, 520, 28, 2.4, 1, 8, '#241428', 0.35);

  // Hanging lanterns
  ctx.save();
  for (let i = 0; i < 12; i++) {
    const lx = 120 + i * 110 + hash2(i, 2) * 40;
    const ly = 90 + hash2(i, 4) * 100;
    const hang = 40 + hash2(i, 6) * 50;

    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#1a120e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lx, ly - 20);
    ctx.lineTo(lx, ly + hang);
    ctx.stroke();

    const glow = ctx.createRadialGradient(lx, ly + hang + 12, 2, lx, ly + hang + 12, 36);
    glow.addColorStop(0, 'rgba(255, 180, 80, 0.55)');
    glow.addColorStop(1, 'rgba(255, 120, 40, 0)');
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lx, ly + hang + 12, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.95;
    ctx.fillStyle = i % 3 === 0 ? '#e85a4a' : i % 3 === 1 ? '#f0a040' : '#e8c050';
    ctx.beginPath();
    ctx.roundRect(lx - 8, ly + hang, 16, 22, 4);
    ctx.fill();
    ctx.strokeStyle = '#1a120e';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();

  paintPaperSpeckles(ctx, originX, originY, coverW, coverH, '#1a1018', '#f0d8b0');
  paintWorldVignette(ctx, camera, originX, originY, coverW, coverH, 'rgba(24, 10, 20, 0.35)');
}

/** Ivory Spire Hall — soft marble washes, stained-glass light shafts. */
function paintIvorySpire(
  ctx: CanvasRenderingContext2D,
  stage: Stage,
  camera: CameraState,
  canvasWidth: number,
  canvasHeight: number
) {
  const { originX, originY, coverW, coverH } = viewCover(camera, canvasWidth, canvasHeight);

  fillSkyGradient(ctx, originX, originY, coverW, coverH, [
    [0, '#f2ebe0'],
    [0.4, stage.bgGradient[0]],
    [0.75, '#9a88a8'],
    [1, stage.bgGradient[1]],
  ]);

  paintWashes(ctx, [
    { x: 700, y: 80, r: 360, color: '#fff8ee', a: 0.4 },
    { x: 200, y: 160, r: 260, color: '#d4c4e0', a: 0.28 },
    { x: 1200, y: 140, r: 280, color: '#c8b0d0', a: 0.26 },
    { x: 700, y: 600, r: 400, color: '#4a3a58', a: 0.3 },
    { x: 100, y: 500, r: 240, color: '#6a5a78', a: 0.22 },
    { x: 1300, y: 520, r: 250, color: '#5a4a68', a: 0.22 },
  ]);

  // Soft cathedral light shafts
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#fff6e0';
  for (let i = 0; i < 5; i++) {
    const x = 250 + i * 200;
    ctx.beginPath();
    ctx.moveTo(x, originY);
    ctx.lineTo(x + 50, originY);
    ctx.lineTo(x + 110, 520);
    ctx.lineTo(x - 40, 520);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Distant column silhouettes
  ctx.save();
  for (let i = 0; i < 8; i++) {
    const cx = 100 + i * 160;
    ctx.globalAlpha = 0.14 + hash2(i, 3) * 0.1;
    ctx.fillStyle = '#3a3048';
    ctx.fillRect(cx, 200 + hash2(i, 5) * 80, 28 + hash2(i, 7) * 16, 400);
    // Capital
    ctx.fillRect(cx - 8, 200 + hash2(i, 5) * 80, 44 + hash2(i, 7) * 16, 18);
  }
  ctx.restore();

  paintHillBand(ctx, originX, originY, coverW, coverH, 540, 20, 1.5, 0, 2, '#4a3c58', 0.25);
  paintPaperSpeckles(ctx, originX, originY, coverW, coverH, '#2a2030', '#f8f0e4');
  paintWorldVignette(ctx, camera, originX, originY, coverW, coverH, 'rgba(40, 30, 50, 0.28)');
}

/** Ember Ascent — volcanic crater, ash washes, glowing vents. */
function paintEmberAscent(
  ctx: CanvasRenderingContext2D,
  stage: Stage,
  camera: CameraState,
  canvasWidth: number,
  canvasHeight: number
) {
  const { originX, originY, coverW, coverH } = viewCover(camera, canvasWidth, canvasHeight);

  fillSkyGradient(ctx, originX, originY, coverW, coverH, [
    [0, '#f5c8a0'],
    [0.35, stage.bgGradient[0]],
    [0.65, '#a04830'],
    [1, stage.bgGradient[1]],
  ]);

  paintWashes(ctx, [
    { x: 700, y: 40, r: 380, color: '#ffe0b0', a: 0.35 },
    { x: 200, y: 180, r: 260, color: '#e09060', a: 0.28 },
    { x: 1200, y: 160, r: 280, color: '#c05040', a: 0.25 },
    { x: 700, y: 640, r: 440, color: '#2a1010', a: 0.45 },
    { x: 400, y: 520, r: 220, color: '#801818', a: 0.3 },
    { x: 1000, y: 540, r: 240, color: '#901010', a: 0.28 },
  ]);

  // Crater bowl rim
  paintHillBand(ctx, originX, originY, coverW, coverH, 400, 60, 1.8, 0.3, 4, '#6a3828', 0.4);
  paintHillBand(ctx, originX, originY, coverW, coverH, 480, 50, 2.2, 1.1, 6, '#4a2018', 0.35);

  // Magma glow in the bowl
  const magma = ctx.createRadialGradient(700, 620, 20, 700, 620, 220);
  magma.addColorStop(0, 'rgba(255, 160, 40, 0.45)');
  magma.addColorStop(0.5, 'rgba(220, 60, 20, 0.25)');
  magma.addColorStop(1, 'rgba(120, 20, 10, 0)');
  ctx.fillStyle = magma;
  ctx.beginPath();
  ctx.arc(700, 620, 220, 0, Math.PI * 2);
  ctx.fill();

  // Ash motes / embers
  ctx.save();
  for (let i = 0; i < 40; i++) {
    const ex = 200 + hash2(i, 11) * 1000;
    const ey = 80 + hash2(i, 13) * 500;
    ctx.globalAlpha = 0.25 + hash2(i, 17) * 0.4;
    ctx.fillStyle = hash2(i, 19) > 0.5 ? '#ff9040' : '#3a2018';
    ctx.beginPath();
    ctx.arc(ex, ey, 1 + hash2(i, 21) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  paintPaperSpeckles(ctx, originX, originY, coverW, coverH, '#2a100c', '#f0d0a0');
  paintWorldVignette(ctx, camera, originX, originY, coverW, coverH, 'rgba(40, 12, 8, 0.32)');
}

type PlatformStyle = {
  underside: [string, string, string];
  grain: string;
  rail: string;
  emblem: string;
};

const PLATFORM_STYLE: Record<Stage['theme'], PlatformStyle> = {
  battlefield: {
    underside: ['#6b4f3a', '#4a3428', '#2c1c16'],
    grain: 'rgba(60, 40, 28, 0.22)',
    rail: '#3d2a1c',
    emblem: 'rgba(26, 18, 14, 0.35)',
  },
  destination: {
    underside: ['#5a6474', '#3a4250', '#1c222c'],
    grain: 'rgba(30, 36, 48, 0.2)',
    rail: '#2a3140',
    emblem: 'rgba(18, 22, 31, 0.4)',
  },
  cyber: {
    underside: ['#5c4634', '#3d2e22', '#221810'],
    grain: 'rgba(40, 28, 18, 0.25)',
    rail: '#3a2818',
    emblem: 'rgba(26, 20, 14, 0.35)',
  },
  skyfair: {
    underside: ['#7a5538', '#523828', '#2a1a10'],
    grain: 'rgba(70, 40, 20, 0.22)',
    rail: '#4a3018',
    emblem: 'rgba(26, 18, 14, 0.4)',
  },
  spire: {
    underside: ['#8a8490', '#5a5460', '#2e2a34'],
    grain: 'rgba(40, 36, 48, 0.18)',
    rail: '#3a3440',
    emblem: 'rgba(30, 24, 36, 0.4)',
  },
  crater: {
    underside: ['#6a3828', '#4a2018', '#2a100c'],
    grain: 'rgba(80, 30, 16, 0.25)',
    rail: '#4a2010',
    emblem: 'rgba(26, 16, 12, 0.4)',
  },
};

function drawInkedSolidPlatform(
  ctx: CanvasRenderingContext2D,
  plat: Stage['platforms'][0],
  theme: Stage['theme']
) {
  const style = PLATFORM_STYLE[theme];
  const undersideHeight = 120;
  const baseGrad = ctx.createLinearGradient(0, plat.y, 0, plat.y + undersideHeight);
  baseGrad.addColorStop(0, style.underside[0]);
  baseGrad.addColorStop(0.55, style.underside[1]);
  baseGrad.addColorStop(1, style.underside[2]);
  ctx.fillStyle = baseGrad;

  ctx.beginPath();
  ctx.moveTo(plat.x, plat.y);
  ctx.lineTo(plat.x + plat.width, plat.y);
  ctx.lineTo(plat.x + plat.width - 90, plat.y + undersideHeight);
  ctx.lineTo(plat.x + 90, plat.y + undersideHeight);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = plat.borderColor || '#1a120e';
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.fillStyle = plat.color || '#c4a882';
  ctx.beginPath();
  ctx.roundRect(plat.x, plat.y, plat.width, plat.height, [8, 8, 3, 3]);
  ctx.fill();
  ctx.strokeStyle = plat.borderColor || '#1a120e';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  ctx.save();
  ctx.strokeStyle = style.grain;
  ctx.lineWidth = 1.2;
  for (let i = 1; i <= 4; i++) {
    const y = plat.y + (plat.height * i) / 5;
    ctx.beginPath();
    ctx.moveTo(plat.x + 16, y);
    ctx.lineTo(plat.x + plat.width - 16, y + (i % 2 === 0 ? 1.5 : -1));
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = plat.borderColor || '#1a120e';
  ctx.beginPath();
  ctx.arc(plat.x + 2, plat.y + 2, 3.5, 0, Math.PI * 2);
  ctx.arc(plat.x + plat.width - 2, plat.y + 2, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = style.emblem;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const midX = plat.x + plat.width / 2;
  if (theme === 'destination') {
    ctx.arc(midX, plat.y + 26, 14, 0.4, Math.PI * 1.6);
  } else if (theme === 'cyber') {
    ctx.arc(midX - 6, plat.y + 26, 8, 0, Math.PI * 2);
    ctx.arc(midX + 8, plat.y + 22, 6, 0, Math.PI * 2);
  } else if (theme === 'skyfair') {
    // Lantern diamond
    ctx.moveTo(midX, plat.y + 14);
    ctx.lineTo(midX + 10, plat.y + 26);
    ctx.lineTo(midX, plat.y + 38);
    ctx.lineTo(midX - 10, plat.y + 26);
    ctx.closePath();
  } else if (theme === 'spire') {
    // Spire arch
    ctx.moveTo(midX - 12, plat.y + 36);
    ctx.lineTo(midX - 12, plat.y + 24);
    ctx.quadraticCurveTo(midX, plat.y + 10, midX + 12, plat.y + 24);
    ctx.lineTo(midX + 12, plat.y + 36);
  } else if (theme === 'crater') {
    // Ember triangle
    ctx.moveTo(midX, plat.y + 14);
    ctx.lineTo(midX + 12, plat.y + 36);
    ctx.lineTo(midX - 12, plat.y + 36);
    ctx.closePath();
  } else {
    ctx.arc(midX, plat.y + 28, 18, 0, Math.PI * 2);
  }
  ctx.stroke();
}

function drawInkedSoftPlatform(
  ctx: CanvasRenderingContext2D,
  plat: Stage['platforms'][0],
  theme: Stage['theme']
) {
  const style = PLATFORM_STYLE[theme];
  ctx.fillStyle = plat.color || '#d2b48c';
  ctx.beginPath();
  ctx.roundRect(plat.x, plat.y, plat.width, plat.height, 5);
  ctx.fill();
  ctx.strokeStyle = plat.borderColor || '#1a120e';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.strokeStyle = style.rail;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(plat.x + 4, plat.y + 2);
  ctx.lineTo(plat.x + plat.width - 4, plat.y + 2);
  ctx.stroke();
}

export function renderStage(
  ctx: CanvasRenderingContext2D,
  stage: Stage,
  camera: CameraState,
  canvasWidth: number,
  canvasHeight: number
) {
  switch (stage.theme) {
    case 'destination':
      paintMoonlitTide(ctx, stage, camera, canvasWidth, canvasHeight);
      break;
    case 'cyber':
      paintJadeHotSprings(ctx, stage, camera, canvasWidth, canvasHeight);
      break;
    case 'skyfair':
      paintLanternSkyfair(ctx, stage, camera, canvasWidth, canvasHeight);
      break;
    case 'spire':
      paintIvorySpire(ctx, stage, camera, canvasWidth, canvasHeight);
      break;
    case 'crater':
      paintEmberAscent(ctx, stage, camera, canvasWidth, canvasHeight);
      break;
    default:
      paintAmberColosseum(ctx, stage, camera, canvasWidth, canvasHeight);
      break;
  }

  for (const plat of stage.platforms) {
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    if (plat.isDropThrough) drawInkedSoftPlatform(ctx, plat, stage.theme);
    else drawInkedSolidPlatform(ctx, plat, stage.theme);

    ctx.restore();
  }
}

export function renderFighter(
  ctx: CanvasRenderingContext2D,
  fighter: Fighter,
  animTick: number
) {
  if (fighter.stocks <= 0) return;

  // If in respawn halo platform
  if (fighter.respawnTimer > 0) {
    renderRespawnHalo(ctx, fighter);
    return;
  }

  // Ghost sprint trails
  if (fighter.trailPositions.length > 0) {
    for (let i = 0; i < fighter.trailPositions.length; i++) {
      const trail = fighter.trailPositions[i];
      ctx.save();
      ctx.globalAlpha = 0.25 - (i / fighter.trailPositions.length) * 0.2;
      drawFighterModel(ctx, trail.x, trail.y, fighter, animTick, true);
      ctx.restore();
    }
  }

  // Invincibility flicker
  if (fighter.invincibleFrames > 0 && Math.floor(fighter.invincibleFrames / 4) % 2 === 0) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    drawFighterModel(ctx, fighter.x, fighter.y, fighter, animTick, false);
    // Inked invincibility ring (no neon glow)
    ctx.strokeStyle = '#1a120e';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, fighter.height * 0.65, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#f0e0c8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, fighter.height * 0.65, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  drawFighterModel(ctx, fighter.x, fighter.y, fighter, animTick, false);
}

/**
 * Character-select portrait: same in-game model, framed with a pose that
 * shows each fighter's signature accessories (wings, horns, scarf, etc.).
 */
const PORTRAIT_LAYOUT: Record<
  FighterId,
  { worldW: number; worldH: number; offsetY: number }
> = {
  // Open glide wings are Zephyr's clearest silhouette
  zephyr: { worldW: 118, worldH: 92, offsetY: 6 },
  // Horns + headband ribbons need a little headroom
  brawler: { worldW: 78, worldH: 96, offsetY: 10 },
  // Back ice crystals + crown horns
  yeti: { worldW: 86, worldH: 100, offsetY: 8 },
  // Antennae + thruster pack
  striker: { worldW: 96, worldH: 98, offsetY: 8 },
  // Minotaur horns + pauldrons
  titan: { worldW: 90, worldH: 100, offsetY: 8 },
  // Flowing scarf + kitsune ears
  shinobi: { worldW: 100, worldH: 98, offsetY: 6 },
  // Sake gourd + monkey ears + sash
  monk: { worldW: 92, worldH: 100, offsetY: 8 },
  // Twin buns + skirt flaps
  lotus: { worldW: 88, worldH: 100, offsetY: 8 },
};

function createPortraitFighter(stats: FighterStats): Fighter {
  const fighter: Fighter = {
    playerIndex: 0,
    isCpu: false,
    stats,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    width: 44,
    height: 64,
    facing: 1,
    isGrounded: true,
    onDropThroughPlatform: false,
    dropThroughTimer: 0,
    doubleJumpsLeft: stats.doubleJumps,
    jumpReleased: true,
    isSprinting: false,
    sprintStamina: SPRINT_STAMINA_MAX,
    isCrouching: false,
    damagePercent: 0,
    stocks: 1,
    currentAction: 'idle',
    actionTimer: 0,
    attack: null,
    grab: { role: 'none', duration: 0, maxDuration: 0 },
    hitstun: 0,
    invincibleFrames: 0,
    respawnTimer: 0,
    ledgeHang: null,
    ledgeCooldownTimer: 0,
    trailPositions: [],
    bouncedOnGround: false,
    isGliding: false,
    frostbiteTimer: 0,
    burnTimer: 0,
    staticCharge: 0,
    shadowPhaseTimer: 0,
    hasSuperArmor: false,
    wingFlapTick: 0,
    tipsyCharge: 0,
    tipsyTimer: 0,
    lightningKickFlash: 0,
    superMeter: 0,
    freezeTimer: 0,
    superFlash: 0,
    heldWeapon: null,
  };

  // Showcase poses that read at thumbnail size
  switch (stats.id) {
    case 'zephyr':
      // Open glide wings — Zephyr's clearest silhouette
      fighter.isGrounded = false;
      fighter.isGliding = true;
      break;
    case 'striker':
      // Longer thruster jets + charged lightning arcs
      fighter.isSprinting = true;
      fighter.staticCharge = 100;
      break;
    case 'brawler':
      // Soft flame aura so horns/headband read as fire fighter
      fighter.burnTimer = 30;
      break;
    case 'monk':
      fighter.tipsyCharge = 100;
      break;
    case 'lotus':
      fighter.currentAction = 'kick';
      fighter.lightningKickFlash = 20;
      break;
    default:
      break;
  }

  return fighter;
}

export function renderFighterPortrait(
  ctx: CanvasRenderingContext2D,
  stats: FighterStats,
  width: number,
  height: number,
  animTick = 0
) {
  ctx.clearRect(0, 0, width, height);

  const layout = PORTRAIT_LAYOUT[stats.id] || PORTRAIT_LAYOUT.brawler;
  const scale = Math.min(width / layout.worldW, height / layout.worldH);

  // Soft parchment wash behind the silhouette
  const wash = ctx.createRadialGradient(
    width * 0.5,
    height * 0.55,
    2,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.55
  );
  wash.addColorStop(0, `${stats.color}44`);
  wash.addColorStop(1, 'rgba(232, 213, 196, 0)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(width / 2, height / 2 + layout.offsetY * scale);
  ctx.scale(scale, scale);

  const portraitFighter = createPortraitFighter(stats);
  drawFighterModel(ctx, 0, 0, portraitFighter, animTick, false);
  ctx.restore();
}

/** Proportions + face cues that make each fighter readable at match zoom. */
type FighterSilhouette = {
  legWidth: number;
  armWidth: number;
  fistR: number;
  shoeRx: number;
  shoeRy: number;
  headR: number;
  headYOffset: number;
  shadowW: number;
  /** Extra outward hip offset for stance. */
  hip: number;
  /** Standing leg length from hip (default ~20). */
  legLen: number;
  eyeX: number;
  eyeR: number;
  /** true only for Lyla — soft lashes / feminine face. */
  feminine: boolean;
  face: 'smile' | 'snarl' | 'smirk' | 'soft' | 'grin' | 'stoic';
};

function getFighterSilhouette(id: FighterId): FighterSilhouette {
  switch (id) {
    case 'zephyr':
      return {
        legWidth: 5.5, armWidth: 5.5, fistR: 5.2, shoeRx: 5, shoeRy: 3,
        headR: 10.5, headYOffset: -28, shadowW: 15, hip: 1, legLen: 24,
        eyeX: 4.5, eyeR: 2.9, feminine: false, face: 'smirk',
      };
    case 'brawler':
      return {
        legWidth: 10, armWidth: 9, fistR: 8.5, shoeRx: 8, shoeRy: 4.2,
        headR: 13.5, headYOffset: -24, shadowW: 24, hip: 2, legLen: 18,
        eyeX: 5.5, eyeR: 3.6, feminine: false, face: 'snarl',
      };
    case 'yeti':
      return {
        legWidth: 11, armWidth: 10, fistR: 9, shoeRx: 9, shoeRy: 4.5,
        headR: 14.5, headYOffset: -23, shadowW: 26, hip: 3, legLen: 16,
        eyeX: 5.5, eyeR: 3.4, feminine: false, face: 'stoic',
      };
    case 'striker':
      return {
        legWidth: 6, armWidth: 6, fistR: 5.5, shoeRx: 5.5, shoeRy: 3,
        headR: 11, headYOffset: -27, shadowW: 16, hip: 1, legLen: 22,
        eyeX: 5, eyeR: 2.8, feminine: false, face: 'smirk',
      };
    case 'titan':
      return {
        legWidth: 12, armWidth: 11, fistR: 9.5, shoeRx: 9.5, shoeRy: 5,
        headR: 14, headYOffset: -22, shadowW: 28, hip: 4, legLen: 17,
        eyeX: 5.5, eyeR: 3.5, feminine: false, face: 'stoic',
      };
    case 'shinobi':
      return {
        legWidth: 5.5, armWidth: 5.5, fistR: 5.5, shoeRx: 5, shoeRy: 3,
        headR: 11, headYOffset: -28, shadowW: 15, hip: 0, legLen: 23,
        eyeX: 5, eyeR: 3, feminine: false, face: 'smirk',
      };
    case 'monk':
      return {
        legWidth: 8, armWidth: 7.5, fistR: 7, shoeRx: 7, shoeRy: 4,
        headR: 13, headYOffset: -24, shadowW: 22, hip: 2, legLen: 16,
        eyeX: 5, eyeR: 3.3, feminine: false, face: 'grin',
      };
    case 'lotus':
      return {
        legWidth: 5, armWidth: 5, fistR: 5, shoeRx: 5.5, shoeRy: 3.2,
        headR: 11, headYOffset: -27, shadowW: 16, hip: 2, legLen: 24,
        eyeX: 5, eyeR: 3.5, feminine: true, face: 'soft',
      };
  }
}

function drawFighterTorsoShape(
  ctx: CanvasRenderingContext2D,
  id: FighterId,
  bodyY: number,
  mainColor: string,
  secColor: string,
  cel: (fill: string, path: () => void, line?: number) => void
) {
  const INK = '#1a120e';

  if (id === 'zephyr') {
    // Slim avian chest — narrow shoulders, long torso
    cel(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(-9, bodyY - 16);
      ctx.quadraticCurveTo(-11, bodyY - 2, -8, bodyY + 14);
      ctx.quadraticCurveTo(0, bodyY + 17, 8, bodyY + 14);
      ctx.quadraticCurveTo(11, bodyY - 2, 9, bodyY - 16);
      ctx.quadraticCurveTo(0, bodyY - 18, -9, bodyY - 16);
      ctx.closePath();
    }, 3);
    cel(secColor, () => {
      ctx.beginPath();
      ctx.roundRect(-7, bodyY + 6, 14, 4, 2);
    }, 2);
  } else if (id === 'brawler') {
    cel(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(-18, bodyY - 14);
      ctx.quadraticCurveTo(-20, bodyY - 2, -15, bodyY + 12);
      ctx.quadraticCurveTo(-6, bodyY + 18, 6, bodyY + 18);
      ctx.quadraticCurveTo(15, bodyY + 12, 20, bodyY - 2);
      ctx.quadraticCurveTo(18, bodyY - 14, 10, bodyY - 16);
      ctx.quadraticCurveTo(0, bodyY - 18, -10, bodyY - 16);
      ctx.closePath();
    }, 3);
    cel(secColor, () => {
      ctx.beginPath();
      ctx.roundRect(-14, bodyY + 4, 28, 8, 2);
    }, 2);
  } else if (id === 'yeti') {
    // Heavy frost pear — massive belly, thick trunk
    cel(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(-14, bodyY - 14);
      ctx.quadraticCurveTo(-22, bodyY + 2, -18, bodyY + 16);
      ctx.quadraticCurveTo(-4, bodyY + 22, 4, bodyY + 22);
      ctx.quadraticCurveTo(18, bodyY + 16, 22, bodyY + 2);
      ctx.quadraticCurveTo(14, bodyY - 14, 0, bodyY - 17);
      ctx.closePath();
    }, 3);
    cel(secColor, () => {
      ctx.beginPath();
      ctx.roundRect(-12, bodyY + 8, 24, 6, 2);
    }, 2);
  } else if (id === 'striker') {
    // Angular tech torso — trapezoid shoulders
    cel(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(-14, bodyY - 15);
      ctx.lineTo(14, bodyY - 15);
      ctx.lineTo(10, bodyY + 14);
      ctx.lineTo(-10, bodyY + 14);
      ctx.closePath();
    }, 3);
    cel(secColor, () => {
      ctx.beginPath();
      ctx.moveTo(-9, bodyY + 4);
      ctx.lineTo(9, bodyY + 4);
      ctx.lineTo(8, bodyY + 10);
      ctx.lineTo(-8, bodyY + 10);
      ctx.closePath();
    }, 2);
  } else if (id === 'titan') {
    // Juggernaut — huge square shoulders, short trunk
    cel(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(-22, bodyY - 12);
      ctx.lineTo(22, bodyY - 12);
      ctx.quadraticCurveTo(20, bodyY + 6, 14, bodyY + 16);
      ctx.lineTo(-14, bodyY + 16);
      ctx.quadraticCurveTo(-20, bodyY + 6, -22, bodyY - 12);
      ctx.closePath();
    }, 3);
    cel(secColor, () => {
      ctx.beginPath();
      ctx.roundRect(-12, bodyY + 6, 24, 7, 2);
    }, 2);
  } else if (id === 'shinobi') {
    // Lean male assassin — square shoulders, slim waist
    cel(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(-12, bodyY - 16);
      ctx.quadraticCurveTo(-13, bodyY - 4, -8, bodyY + 12);
      ctx.quadraticCurveTo(0, bodyY + 16, 8, bodyY + 12);
      ctx.quadraticCurveTo(13, bodyY - 4, 12, bodyY - 16);
      ctx.quadraticCurveTo(0, bodyY - 18, -12, bodyY - 16);
      ctx.closePath();
    }, 3);
    cel(secColor, () => {
      ctx.beginPath();
      ctx.roundRect(-7, bodyY + 5, 14, 5, 2);
    }, 2);
  } else if (id === 'monk') {
    // Pot-bellied monkey sage
    cel(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(-12, bodyY - 14);
      ctx.quadraticCurveTo(-18, bodyY + 2, -14, bodyY + 16);
      ctx.quadraticCurveTo(0, bodyY + 20, 14, bodyY + 16);
      ctx.quadraticCurveTo(18, bodyY + 2, 12, bodyY - 14);
      ctx.quadraticCurveTo(0, bodyY - 17, -12, bodyY - 14);
      ctx.closePath();
    }, 3);
    cel(secColor, () => {
      ctx.beginPath();
      ctx.roundRect(-11, bodyY + 6, 22, 6, 3);
    }, 2);
  } else if (id === 'lotus') {
    // Feminine hourglass — narrow shoulders, cinched waist, flared hips
    cel(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(-10, bodyY - 15);
      ctx.quadraticCurveTo(-11, bodyY - 6, -7, bodyY + 2);
      ctx.quadraticCurveTo(-14, bodyY + 10, -13, bodyY + 16);
      ctx.quadraticCurveTo(0, bodyY + 19, 13, bodyY + 16);
      ctx.quadraticCurveTo(14, bodyY + 10, 7, bodyY + 2);
      ctx.quadraticCurveTo(11, bodyY - 6, 10, bodyY - 15);
      ctx.quadraticCurveTo(0, bodyY - 17, -10, bodyY - 15);
      ctx.closePath();
    }, 3);
    // Soft sash bow at waist
    cel(secColor, () => {
      ctx.beginPath();
      ctx.roundRect(-6, bodyY + 1, 12, 5, 2);
    }, 2);
    ctx.fillStyle = secColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(6, bodyY + 3);
    ctx.quadraticCurveTo(14, bodyY - 2, 12, bodyY + 8);
    ctx.quadraticCurveTo(8, bodyY + 6, 6, bodyY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawFighterHeadShape(
  ctx: CanvasRenderingContext2D,
  id: FighterId,
  headY: number,
  headR: number,
  mainColor: string,
  cel: (fill: string, path: () => void, line?: number) => void
) {
  const INK = '#1a120e';

  if (id === 'zephyr') {
    // Slightly pointed avian chin
    cel(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(-headR + 1, headY - 2);
      ctx.quadraticCurveTo(-headR + 2, headY - headR, 0, headY - headR);
      ctx.quadraticCurveTo(headR - 2, headY - headR, headR, headY - 1);
      ctx.quadraticCurveTo(headR - 2, headY + 8, 2, headY + 11);
      ctx.quadraticCurveTo(-headR + 4, headY + 8, -headR + 1, headY - 2);
      ctx.closePath();
    }, 3);
  } else if (id === 'brawler') {
    cel(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(-headR + 2, headY - 4);
      ctx.quadraticCurveTo(-headR, headY - headR, 0, headY - headR - 1);
      ctx.quadraticCurveTo(headR, headY - headR, headR - 1, headY - 2);
      ctx.quadraticCurveTo(headR + 2, headY + 4, headR - 4, headY + 8);
      ctx.quadraticCurveTo(4, headY + 11, -2, headY + 10);
      ctx.quadraticCurveTo(-headR + 1, headY + 8, -headR + 2, headY - 4);
      ctx.closePath();
    }, 3);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(1, headY - 5);
    ctx.quadraticCurveTo(6, headY - 7, 11, headY - 4);
    ctx.stroke();
  } else if (id === 'yeti') {
    // Big round frost mug
    cel(mainColor, () => {
      ctx.beginPath();
      ctx.ellipse(0, headY + 1, headR, headR + 1.5, 0, 0, Math.PI * 2);
    }, 3);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, headY - 5);
    ctx.quadraticCurveTo(7, headY - 8, 12, headY - 3);
    ctx.stroke();
  } else if (id === 'striker') {
    // Angular helmet-like head
    cel(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(-headR + 1, headY - 4);
      ctx.lineTo(-headR + 3, headY - headR + 1);
      ctx.lineTo(headR - 3, headY - headR + 1);
      ctx.lineTo(headR, headY - 2);
      ctx.lineTo(headR - 3, headY + 9);
      ctx.lineTo(-headR + 3, headY + 9);
      ctx.closePath();
    }, 3);
  } else if (id === 'titan') {
    // Blocky minotaur skull
    cel(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(-headR + 1, headY - 6);
      ctx.quadraticCurveTo(-headR, headY - headR, 0, headY - headR + 1);
      ctx.quadraticCurveTo(headR, headY - headR, headR - 1, headY - 6);
      ctx.lineTo(headR - 2, headY + 8);
      ctx.lineTo(-headR + 2, headY + 8);
      ctx.closePath();
    }, 3);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-2, headY - 4);
    ctx.lineTo(11, headY - 6);
    ctx.stroke();
  } else if (id === 'shinobi') {
    // Tall lean male oval
    cel(mainColor, () => {
      ctx.beginPath();
      ctx.ellipse(0, headY, headR - 0.5, headR + 1, 0, 0, Math.PI * 2);
    }, 3);
  } else if (id === 'monk') {
    // Round monkey face (masculine goof)
    cel(mainColor, () => {
      ctx.beginPath();
      ctx.ellipse(0, headY + 1, headR + 0.5, headR, 0, 0, Math.PI * 2);
    }, 3);
    // Snout pad
    cel('#e8d5a0', () => {
      ctx.beginPath();
      ctx.ellipse(3, headY + 4, 6, 4.5, 0.1, 0, Math.PI * 2);
    }, 2);
  } else if (id === 'lotus') {
    // Soft feminine oval — smaller chin, fuller cheeks
    cel(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(-headR + 1, headY - 2);
      ctx.quadraticCurveTo(-headR, headY - headR + 1, 0, headY - headR);
      ctx.quadraticCurveTo(headR, headY - headR + 1, headR - 1, headY - 2);
      ctx.quadraticCurveTo(headR - 2, headY + 7, 2, headY + 10);
      ctx.quadraticCurveTo(-headR + 3, headY + 8, -headR + 1, headY - 2);
      ctx.closePath();
    }, 3);
  }
}

function drawFighterModel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fighter: Fighter,
  animTick: number,
  isTrail: boolean
) {
  const INK = '#1a120e';

  /** Rubber-hose limb: thick ink understroke + flat color. */
  const hose = (color: string, width: number, path: () => void) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = width + 3.5;
    path();
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    path();
    ctx.stroke();
  };

  /** Flat cel shape with thick ink outline. */
  const cel = (fill: string, path: () => void, line = 2.5) => {
    path();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = line;
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  ctx.save();
  ctx.translate(x, y);
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  // Hitstun tumble rotation
  if (fighter.hitstun > 0) {
    const tumbleAngle = fighter.vx * 0.05 + Math.sin(animTick * 0.3) * 0.2;
    ctx.rotate(tumbleAngle);
  }

  // Facing flip
  ctx.scale(fighter.facing, 1);

  const stats = fighter.stats;
  const sil = getFighterSilhouette(stats.id);
  const isCrouching = fighter.isCrouching;
  const isHit = fighter.hitstun > 0;
  const isSprinting = fighter.isSprinting;

  // Flat cel colors (flash white on hit)
  const mainColor = isHit ? '#f5efe6' : stats.color;
  const secColor = isHit ? '#e8a090' : stats.secondaryColor;

  // Shadow Phase Transparency for Shinobi
  if (fighter.shadowPhaseTimer && fighter.shadowPhaseTimer > 0) {
    ctx.globalAlpha = 0.45;
  }

  // Ground blob shadow (ink wash, not soft digital blur)
  if (!isTrail && fighter.isGrounded) {
    ctx.save();
    ctx.fillStyle = 'rgba(26, 18, 14, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, fighter.height / 2 + 2, sil.shadowW, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Smash-style gait: plant while idle; contralateral swing only while walking/sprinting.
  const isLocomoting =
    fighter.isGrounded &&
    !isCrouching &&
    (fighter.currentAction === 'walk' || fighter.currentAction === 'sprint');
  const gaitPhase = Math.sin(animTick * (isSprinting ? 0.48 : 0.28));
  const idleBreath = Math.sin(animTick * 0.09);
  // Stride stays under hip separation so feet never swap sides.
  const strideAmp = isSprinting ? 10 : 7;
  const armSwingAmp = isSprinting ? 9 : 6;
  const gait = isLocomoting ? gaitPhase : idleBreath * 0.12;
  const bodyY = isCrouching ? 10 : 0;
  const bodyLean = isSprinting ? 0.22 : fighter.currentAction === 'walk' ? 0.08 : 0;
  // Wider hips + outward plant = readable A-stance at rest
  const hipL = -8 - sil.hip;
  const hipR = 8 + sil.hip;
  const stanceOut = 3.5;
  const legLen = sil.legLen;
  const shoulderL = -10 - sil.hip * 0.5;
  const shoulderR = 10 + sil.hip * 0.5;
  const shoulderY = bodyY - 8;
  // gait > 0: left foot forward (+X), right foot back; arms opposite (left back, right forward)
  const footLX = hipL - stanceOut + gait * strideAmp;
  const footRX = hipR + stanceOut - gait * strideAmp;
  const footLY = legLen - (isLocomoting ? Math.max(0, -gait) * 3 : 0);
  const footRY = legLen - (isLocomoting ? Math.max(0, gait) * 3 : 0);
  const handLX = shoulderL - 1 - gait * armSwingAmp;
  const handRX = shoulderR + 1 + gait * armSwingAmp;
  const handY = bodyY + 10 + Math.abs(gait) * (isLocomoting ? 2 : 0);

  ctx.rotate(bodyLean);

  drawFighterAccessoriesBack(ctx, fighter, bodyY, animTick, isTrail);

  // --- Legs (rubber hose) ---
  const legYStart = bodyY + (stats.id === 'lotus' ? 14 : 12);
  const strokeLegs = (draw: () => void) => hose(secColor, sil.legWidth, draw);

  if (fighter.currentAction === 'super') {
    const spin = Math.sin(animTick * 0.55);
    strokeLegs(() => {
      ctx.beginPath();
      ctx.moveTo(hipL, legYStart);
      ctx.lineTo(-18 - spin * 8, legYStart + 10);
    });
    strokeLegs(() => {
      ctx.beginPath();
      ctx.moveTo(hipR, legYStart);
      ctx.lineTo(22 + spin * 10, legYStart - 6);
    });
  } else if (fighter.currentAction === 'kick') {
    const kickDir = fighter.attack?.direction;
    if (kickDir === 'down') {
      strokeLegs(() => {
        ctx.beginPath();
        ctx.moveTo(hipL, legYStart);
        ctx.lineTo(hipL - 2, legYStart + legLen + 4);
      });
      strokeLegs(() => {
        ctx.beginPath();
        ctx.moveTo(hipR, legYStart);
        ctx.lineTo(hipR + 4, legYStart + legLen + 10);
      });
    } else if (kickDir === 'up') {
      strokeLegs(() => {
        ctx.beginPath();
        ctx.moveTo(hipL, legYStart);
        ctx.lineTo(hipL - 2, legYStart + legLen - 2);
      });
      strokeLegs(() => {
        ctx.beginPath();
        ctx.moveTo(hipR, legYStart);
        ctx.lineTo(hipR + 8, legYStart - 28);
      });
    } else {
      strokeLegs(() => {
        ctx.beginPath();
        ctx.moveTo(hipL, legYStart);
        ctx.lineTo(hipL - 2, legYStart + legLen);
      });
      strokeLegs(() => {
        ctx.beginPath();
        ctx.moveTo(hipR, legYStart);
        ctx.lineTo(hipR + 18, legYStart + 4);
      });
    }
  } else if (fighter.currentAction === 'ledge_hang') {
    strokeLegs(() => {
      ctx.beginPath();
      ctx.moveTo(hipL, legYStart);
      ctx.lineTo(hipL - 2, legYStart + legLen + 2);
    });
    strokeLegs(() => {
      ctx.beginPath();
      ctx.moveTo(hipR, legYStart);
      ctx.lineTo(hipR + 2, legYStart + legLen + 4);
    });
  } else if (!fighter.isGrounded) {
    // Air: slight tuck, still A-stance (never crossed)
    strokeLegs(() => {
      ctx.beginPath();
      ctx.moveTo(hipL, legYStart);
      ctx.lineTo(hipL - 4, legYStart + legLen - 6);
    });
    strokeLegs(() => {
      ctx.beginPath();
      ctx.moveTo(hipR, legYStart);
      ctx.lineTo(hipR + 4, legYStart + legLen - 4);
    });
  } else if (isCrouching) {
    strokeLegs(() => {
      ctx.beginPath();
      ctx.moveTo(hipL, legYStart);
      ctx.lineTo(hipL - 6, legYStart + 12);
    });
    strokeLegs(() => {
      ctx.beginPath();
      ctx.moveTo(hipR, legYStart);
      ctx.lineTo(hipR + 6, legYStart + 12);
    });
  } else {
    strokeLegs(() => {
      ctx.beginPath();
      ctx.moveTo(hipL, legYStart);
      ctx.lineTo(footLX, legYStart + footLY);
    });
    strokeLegs(() => {
      ctx.beginPath();
      ctx.moveTo(hipR, legYStart);
      ctx.lineTo(footRX, legYStart + footRY);
    });
  }

  // Simple inked shoes
  const shoeAt = (sx: number, sy: number) => {
    cel(secColor, () => {
      ctx.beginPath();
      ctx.ellipse(sx, sy, sil.shoeRx, sil.shoeRy, 0, 0, Math.PI * 2);
    }, 2);
  };
  if (fighter.currentAction !== 'kick' && fighter.currentAction !== 'super') {
    if (!fighter.isGrounded) {
      shoeAt(hipL - 4, legYStart + legLen - 6);
      shoeAt(hipR + 4, legYStart + legLen - 4);
    } else if (isCrouching) {
      shoeAt(hipL - 6, legYStart + 12);
      shoeAt(hipR + 6, legYStart + 12);
    } else if (fighter.currentAction === 'ledge_hang') {
      shoeAt(hipL - 2, legYStart + legLen + 2);
      shoeAt(hipR + 2, legYStart + legLen + 4);
    } else {
      shoeAt(footLX, legYStart + footLY);
      shoeAt(footRX, legYStart + footRY);
    }
  }

  // Lyla: front skirt overlay so legs sit under the hem
  if (stats.id === 'lotus') {
    const flap = Math.sin(animTick * 0.28) * 2;
    cel(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(-12, bodyY + 12);
      ctx.quadraticCurveTo(-4, bodyY + 20 + flap, 0, bodyY + 22 + flap);
      ctx.quadraticCurveTo(4, bodyY + 20 - flap, 12, bodyY + 12);
      ctx.lineTo(7, bodyY + 4);
      ctx.lineTo(-7, bodyY + 4);
      ctx.closePath();
    }, 2);
  }

  // --- Torso + belt ---
  drawFighterTorsoShape(ctx, stats.id, bodyY, mainColor, secColor, cel);
  drawFighterChestEmblem(ctx, fighter, bodyY, secColor);

  // --- Head ---
  const headY = bodyY + sil.headYOffset;
  drawFighterHeadShape(ctx, stats.id, headY, sil.headR, mainColor, cel);
  drawFighterHeadAccessories(ctx, fighter, headY, animTick);

  // Pie-cut cartoon eyes
  const eyeY = headY - (sil.feminine ? 0.5 : 1);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(sil.eyeX, eyeY, sil.eyeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.moveTo(sil.eyeX, eyeY);
  ctx.arc(sil.eyeX, eyeY, sil.eyeR + 0.2, -0.55, 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f5efe6';
  ctx.beginPath();
  ctx.arc(sil.eyeX + 1.2, eyeY - 1.2, sil.feminine ? 1.1 : 0.9, 0, Math.PI * 2);
  ctx.fill();

  // Lashes (Lyla only)
  if (sil.feminine) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sil.eyeX + sil.eyeR - 0.5, eyeY - 1);
    ctx.quadraticCurveTo(sil.eyeX + sil.eyeR + 2, eyeY - 3, sil.eyeX + sil.eyeR + 1.5, eyeY - 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sil.eyeX + sil.eyeR - 1.5, eyeY - 2.5);
    ctx.lineTo(sil.eyeX + sil.eyeR + 0.5, eyeY - 4.5);
    ctx.stroke();
  }

  // Mouth by character
  ctx.strokeStyle = INK;
  ctx.lineWidth = sil.feminine ? 1.3 : 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (sil.face === 'snarl') {
    ctx.moveTo(2, headY + 5);
    ctx.quadraticCurveTo(6, headY + 8, 10, headY + 5);
  } else if (sil.face === 'smirk') {
    ctx.moveTo(2, headY + 5);
    ctx.quadraticCurveTo(6, headY + 7, 9, headY + 4);
  } else if (sil.face === 'grin') {
    ctx.arc(4, headY + 4, 4.5, 0.2, Math.PI - 0.1);
  } else if (sil.face === 'stoic') {
    ctx.moveTo(2, headY + 6);
    ctx.lineTo(9, headY + 6);
  } else if (sil.face === 'soft') {
    ctx.arc(4, headY + 5, 3.2, 0.25, Math.PI - 0.25);
  } else {
    ctx.arc(4, headY + 5, 3.5, 0.15, Math.PI - 0.15);
  }
  ctx.stroke();

  // Blush for Lyla
  if (sil.feminine) {
    ctx.fillStyle = 'rgba(240, 140, 160, 0.45)';
    ctx.beginPath();
    ctx.ellipse(sil.eyeX - 1, headY + 4, 3.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Arms ---
  const strokeArms = (color: string, draw: () => void) => hose(color, sil.armWidth, draw);
  const fist = (fx: number, fy: number, fill = secColor) => {
    cel(fill, () => {
      ctx.beginPath();
      ctx.arc(fx, fy, sil.fistR, 0, Math.PI * 2);
    }, 2.5);
  };

  if (fighter.currentAction === 'super') {
    const spin = Math.sin(animTick * 0.6);
    strokeArms(secColor, () => {
      ctx.beginPath();
      ctx.moveTo(shoulderR - 2, shoulderY);
      ctx.lineTo(28 + spin * 6, bodyY - 10);
    });
    strokeArms(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(shoulderL + 2, shoulderY + 2);
      ctx.lineTo(-20 - spin * 8, bodyY + 8);
    });
    fist(28 + spin * 6, bodyY - 10, mainColor);
  } else if (fighter.currentAction === 'punch') {
    const punchDir = fighter.attack?.direction;
    const weaponPose = getHeldWeaponPose(fighter, bodyY, animTick);
    if (weaponPose.meleeSwing) {
      // Arm tracks the swinging weapon hand
      strokeArms(mainColor, () => {
        ctx.beginPath();
        ctx.moveTo(shoulderR - 2, shoulderY);
        ctx.lineTo(weaponPose.handX - 2, weaponPose.handY + 2);
      });
      fist(weaponPose.handX - 2, weaponPose.handY + 2);
      strokeArms(mainColor, () => {
        ctx.beginPath();
        ctx.moveTo(shoulderL, shoulderY);
        ctx.lineTo(shoulderL - 4, handY + (weaponPose.phase === 'slash' ? 4 : 0));
      });
      fist(shoulderL - 4, handY + (weaponPose.phase === 'slash' ? 4 : 0));
    } else if (punchDir === 'up') {
      strokeArms(mainColor, () => {
        ctx.beginPath();
        ctx.moveTo(shoulderR - 2, shoulderY);
        ctx.lineTo(14, bodyY - 36);
      });
      fist(14, bodyY - 36);
      // rear arm hangs naturally
      strokeArms(mainColor, () => {
        ctx.beginPath();
        ctx.moveTo(shoulderL, shoulderY);
        ctx.lineTo(shoulderL - 2, handY);
      });
      fist(shoulderL - 2, handY);
    } else {
      strokeArms(mainColor, () => {
        ctx.beginPath();
        ctx.moveTo(shoulderR - 2, shoulderY);
        ctx.lineTo(26, bodyY - 4);
      });
      fist(26, bodyY - 4);
      strokeArms(mainColor, () => {
        ctx.beginPath();
        ctx.moveTo(shoulderL, shoulderY);
        ctx.lineTo(shoulderL - 4, handY);
      });
      fist(shoulderL - 4, handY);
    }
  } else if (fighter.currentAction === 'block') {
    // Guard: arms forward at sides of shield — not an X across the chest
    strokeArms(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(shoulderL, shoulderY);
      ctx.lineTo(8, bodyY + 2);
    });
    strokeArms(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(shoulderR, shoulderY);
      ctx.lineTo(16, bodyY - 4);
    });
    fist(8, bodyY + 2);
    fist(16, bodyY - 4);

    // Inked wooden shield disc (no neon bubble)
    ctx.save();
    cel('#e8d5b8', () => {
      ctx.beginPath();
      ctx.ellipse(18, bodyY - 2, 13, 20, 0, 0, Math.PI * 2);
    }, 3);
    ctx.strokeStyle = 'rgba(26, 18, 14, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(18, bodyY - 2, 7, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (fighter.currentAction === 'grab') {
    strokeArms('#c9a030', () => {
      ctx.beginPath();
      ctx.moveTo(shoulderR - 4, shoulderY);
      ctx.lineTo(22, bodyY - 8);
    });
    strokeArms('#c9a030', () => {
      ctx.beginPath();
      ctx.moveTo(shoulderR - 4, shoulderY + 6);
      ctx.lineTo(22, bodyY + 2);
    });
    fist(24, bodyY - 3, '#e8d080');
  } else if (fighter.currentAction.startsWith('throw_')) {
    strokeArms(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(shoulderR - 4, shoulderY);
      ctx.lineTo(18, bodyY - 18);
    });
  } else if (fighter.currentAction === 'ledge_hang') {
    strokeArms(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(shoulderL, shoulderY);
      ctx.lineTo(12, bodyY - 26);
    });
    strokeArms(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(shoulderR, shoulderY);
      ctx.lineTo(16, bodyY - 26);
    });
    fist(12, bodyY - 26);
    fist(16, bodyY - 26);
  } else if (fighter.grab.role === 'grabbed') {
    strokeArms(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(shoulderL, shoulderY);
      ctx.lineTo(shoulderL - 8, bodyY - 14);
    });
    strokeArms(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(shoulderR, shoulderY);
      ctx.lineTo(shoulderR + 4, bodyY - 10);
    });
  } else if (!fighter.isGrounded) {
    // Air: arms slightly out for balance
    strokeArms(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(shoulderL, shoulderY);
      ctx.lineTo(shoulderL - 6, bodyY + 4);
    });
    strokeArms(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(shoulderR, shoulderY);
      ctx.lineTo(shoulderR + 6, bodyY + 4);
    });
    fist(shoulderL - 6, bodyY + 4);
    fist(shoulderR + 6, bodyY + 4);
  } else {
    // Idle / walk / sprint: hang from shoulders, contralateral to legs, never cross
    strokeArms(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(shoulderL, shoulderY);
      ctx.lineTo(handLX, handY);
    });
    strokeArms(mainColor, () => {
      ctx.beginPath();
      ctx.moveTo(shoulderR, shoulderY);
      ctx.lineTo(handRX, handY);
    });
    fist(handLX, handY);
    fist(handRX, handY);
  }

  drawHeldWeapon(ctx, fighter, bodyY, animTick);
  drawFighterStatusEffects(ctx, fighter, bodyY, headY, animTick);

  ctx.restore();
}

/**
 * Render creature back accessories (Wings, Ice Crystals, Jet Thruster, Flowing Scarf, Pauldrons)
 */
function drawFighterAccessoriesBack(
  ctx: CanvasRenderingContext2D,
  fighter: Fighter,
  bodyY: number,
  animTick: number,
  isTrail: boolean
) {
  const INK = '#1a120e';
  const id = fighter.stats.id;
  const isSprinting = fighter.isSprinting;
  const isGrounded = fighter.isGrounded;

  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  if (id === 'zephyr') {
    // ==========================================
    // ZEPHYR DRAKE: ANIMATED WINGS & WIND TAIL
    // ==========================================
    ctx.save();
    
    // Wind Tail
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    const tailWiggle = Math.sin(animTick * 0.25) * 4;
    ctx.beginPath();
    ctx.moveTo(-6, bodyY + 12);
    ctx.quadraticCurveTo(-18, bodyY + 16, -26, bodyY + 22 + tailWiggle);
    ctx.stroke();
    ctx.strokeStyle = fighter.stats.color;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-6, bodyY + 12);
    ctx.quadraticCurveTo(-18, bodyY + 16, -26, bodyY + 22 + tailWiggle);
    ctx.stroke();

    // Tail feather plume
    ctx.fillStyle = fighter.stats.secondaryColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-26, bodyY + 22 + tailWiggle, 6, 3, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Wings
    if (fighter.isGliding) {
      ctx.fillStyle = fighter.stats.color;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-4, bodyY - 12);
      ctx.lineTo(-44, bodyY - 14 + Math.sin(animTick * 0.2) * 2);
      ctx.lineTo(-32, bodyY + 6);
      ctx.lineTo(-18, bodyY + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(4, bodyY - 12);
      ctx.lineTo(46, bodyY - 14 + Math.sin(animTick * 0.2) * 2);
      ctx.lineTo(34, bodyY + 6);
      ctx.lineTo(18, bodyY + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = fighter.stats.secondaryColor;
      ctx.beginPath();
      ctx.arc(-44, bodyY - 14 + Math.sin(animTick * 0.2) * 2, 3, 0, Math.PI * 2);
      ctx.arc(46, bodyY - 14 + Math.sin(animTick * 0.2) * 2, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (!isGrounded) {
      const flap = Math.sin(animTick * 0.45);
      const flapYOffset = flap * 14;

      ctx.fillStyle = fighter.stats.color;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(-6, bodyY - 10);
      ctx.quadraticCurveTo(-24, bodyY - 32 + flapYOffset, -38, bodyY - 26 + flapYOffset);
      ctx.lineTo(-28, bodyY - 4 + flapYOffset * 0.5);
      ctx.lineTo(-14, bodyY - 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = fighter.stats.secondaryColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-18, bodyY - 14 + flapYOffset * 0.5);
      ctx.lineTo(-34, bodyY - 22 + flapYOffset);
      ctx.stroke();
    } else {
      ctx.fillStyle = fighter.stats.color;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(-6, bodyY - 10);
      ctx.quadraticCurveTo(-20, bodyY - 6, -18, bodyY + 16);
      ctx.lineTo(-10, bodyY + 18);
      ctx.lineTo(-6, bodyY + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = fighter.stats.secondaryColor;
      ctx.beginPath();
      ctx.moveTo(-10, bodyY - 4);
      ctx.lineTo(-14, bodyY + 12);
      ctx.stroke();
    }

    ctx.restore();
  } else if (id === 'yeti') {
    // ==========================================
    // GLACIAL YETI: 3 BACK ICE CRYSTALS
    // ==========================================
    ctx.save();
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;

    // Top large ice spire
    ctx.fillStyle = '#9ab8c8';
    ctx.beginPath();
    ctx.moveTo(-8, bodyY - 12);
    ctx.lineTo(-28, bodyY - 34);
    ctx.lineTo(-24, bodyY - 22);
    ctx.lineTo(-8, bodyY - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central crystal highlight
    ctx.strokeStyle = '#e8f0f4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-8, bodyY - 10);
    ctx.lineTo(-27, bodyY - 32);
    ctx.stroke();

    // Middle ice spire
    ctx.fillStyle = '#6a8aa0';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-10, bodyY - 4);
    ctx.lineTo(-30, bodyY - 10);
    ctx.lineTo(-24, bodyY - 2);
    ctx.lineTo(-8, bodyY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Lower ice spire
    ctx.fillStyle = '#4a6a80';
    ctx.beginPath();
    ctx.moveTo(-8, bodyY + 4);
    ctx.lineTo(-24, bodyY + 14);
    ctx.lineTo(-16, bodyY + 18);
    ctx.lineTo(-6, bodyY + 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (!isTrail && Math.sin(animTick * 0.15) > 0.4) {
      ctx.fillStyle = '#f5efe6';
      ctx.beginPath();
      ctx.arc(-28, bodyY - 34, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  } else if (id === 'striker') {
    // ==========================================
    // STRIKER: INKED THRUSTER PACK
    // ==========================================
    ctx.save();
    ctx.fillStyle = '#3a4048';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-20, bodyY - 12, 10, 22, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#5a6068';
    ctx.beginPath();
    ctx.arc(-20, bodyY - 6, 3, 0, Math.PI * 2);
    ctx.arc(-20, bodyY + 4, 3, 0, Math.PI * 2);
    ctx.fill();

    // Flat cel exhaust plumes (no neon plasma)
    const thrustLen = (isSprinting ? 22 : 10) + Math.sin(animTick * 0.8) * 4;
    ctx.fillStyle = fighter.stats.secondaryColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-20, bodyY - 8);
    ctx.lineTo(-20 - thrustLen, bodyY - 6);
    ctx.lineTo(-20, bodyY - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-20, bodyY + 2);
    ctx.lineTo(-20 - thrustLen, bodyY + 4);
    ctx.lineTo(-20, bodyY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  } else if (id === 'shinobi') {
    // ==========================================
    // SHADOW SHINOBI: FLOWING DUAL-TAIL SCARF
    // ==========================================
    ctx.save();
    const wave1 = Math.sin(animTick * 0.28) * 6;
    const wave2 = Math.sin(animTick * 0.28 + 1.2) * 7;
    const speedTrail = Math.abs(fighter.vx) * 1.6;

    ctx.fillStyle = fighter.stats.secondaryColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;

    // Scarf Tail 1
    ctx.beginPath();
    ctx.moveTo(-2, bodyY - 16);
    ctx.quadraticCurveTo(-16 - speedTrail * 0.5, bodyY - 14 + wave1, -34 - speedTrail, bodyY - 18 + wave1);
    ctx.lineTo(-32 - speedTrail, bodyY - 12 + wave1);
    ctx.quadraticCurveTo(-14 - speedTrail * 0.5, bodyY - 10 + wave1, -2, bodyY - 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Scarf Tail 2 (lower, longer)
    ctx.fillStyle = fighter.stats.color;
    ctx.beginPath();
    ctx.moveTo(-2, bodyY - 14);
    ctx.quadraticCurveTo(-20 - speedTrail * 0.5, bodyY - 8 + wave2, -42 - speedTrail, bodyY - 10 + wave2);
    ctx.lineTo(-38 - speedTrail, bodyY - 4 + wave2);
    ctx.quadraticCurveTo(-18 - speedTrail * 0.5, bodyY - 4 + wave2, -2, bodyY - 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  } else if (id === 'brawler') {
    // ==========================================
    // BLAZE BRAWLER: HEADBAND TAILS & MAGMA PAULDRON
    // ==========================================
    ctx.save();
    const ribbonWave = Math.sin(animTick * 0.35) * 5;
    const speedLag = Math.abs(fighter.vx) * 1.4;

    // Red martial headband ribbons fluttering behind head
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-6, bodyY - 26);
    ctx.quadraticCurveTo(-18 - speedLag, bodyY - 26 + ribbonWave, -30 - speedLag, bodyY - 22 + ribbonWave);
    ctx.lineTo(-28 - speedLag, bodyY - 18 + ribbonWave);
    ctx.quadraticCurveTo(-16 - speedLag, bodyY - 22 + ribbonWave, -6, bodyY - 22);
    ctx.closePath();
    ctx.fill();

    // Spiked Magma Pauldron on back shoulder
    ctx.fillStyle = '#b91c1c';
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-13, bodyY - 10, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pauldron Spikes
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(-16, bodyY - 13);
    ctx.lineTo(-22, bodyY - 18);
    ctx.lineTo(-12, bodyY - 16);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  } else if (id === 'titan') {
    // ==========================================
    // GILDED TITAN: HEAVY GOLDEN PAULDRONS
    // ==========================================
    ctx.save();
    ctx.fillStyle = '#d97706';
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;

    // Heavy shoulder armor plate
    ctx.beginPath();
    ctx.roundRect(-18, bodyY - 14, 10, 14, 3);
    ctx.fill();
    ctx.stroke();

    // Rivet studs
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(-14, bodyY - 11, 1.8, 0, Math.PI * 2);
    ctx.arc(-14, bodyY - 5, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  } else if (id === 'monk') {
    // ==========================================
    // DRUNKEN MONK: SAKE GOURD + JADE SASH
    // ==========================================
    ctx.save();
    const sashWave = Math.sin(animTick * 0.3) * 4;
    const speedLag = Math.abs(fighter.vx) * 1.2;

    // Jade sash tails
    ctx.fillStyle = '#65a30d';
    ctx.beginPath();
    ctx.moveTo(-4, bodyY + 4);
    ctx.quadraticCurveTo(-14 - speedLag, bodyY + 10 + sashWave, -26 - speedLag, bodyY + 16 + sashWave);
    ctx.lineTo(-22 - speedLag, bodyY + 20 + sashWave);
    ctx.quadraticCurveTo(-12 - speedLag, bodyY + 12 + sashWave, -2, bodyY + 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#a3e635';
    ctx.beginPath();
    ctx.moveTo(-2, bodyY + 2);
    ctx.quadraticCurveTo(-10 - speedLag, bodyY + 14 + sashWave * 0.7, -20 - speedLag, bodyY + 22 + sashWave);
    ctx.lineTo(-16 - speedLag, bodyY + 24 + sashWave);
    ctx.quadraticCurveTo(-8 - speedLag, bodyY + 14, 0, bodyY + 6);
    ctx.closePath();
    ctx.fill();

    // Sake gourd on back
    ctx.fillStyle = '#854d0e';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(-16, bodyY - 2, 7, 10, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Gourd cork
    ctx.fillStyle = '#d6d3d1';
    ctx.beginPath();
    ctx.roundRect(-20, bodyY - 14, 5, 5, 1);
    ctx.fill();

    // Rope wrap
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-21, bodyY - 2);
    ctx.lineTo(-11, bodyY);
    ctx.stroke();

    ctx.restore();
  } else if (id === 'lotus') {
    // ==========================================
    // LOTUS LYLA: QIPAO SKIRT FLAPS (feminine hip flare)
    // ==========================================
    ctx.save();
    const flap = Math.sin(animTick * 0.28) * 3;
    const speedLag = Math.abs(fighter.vx) * 0.8;

    ctx.fillStyle = fighter.stats.color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;

    // Wide back skirt panel — part of feminine silhouette
    ctx.beginPath();
    ctx.moveTo(-10, bodyY + 12);
    ctx.quadraticCurveTo(-18 - speedLag, bodyY + 20 + flap, -14 - speedLag, bodyY + 30 + flap);
    ctx.lineTo(-2, bodyY + 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Front skirt panel with pink trim
    ctx.fillStyle = '#2a4a88';
    ctx.beginPath();
    ctx.moveTo(8, bodyY + 12);
    ctx.quadraticCurveTo(16 + speedLag * 0.4, bodyY + 20 - flap, 12 + speedLag * 0.3, bodyY + 30 - flap);
    ctx.lineTo(0, bodyY + 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = fighter.stats.secondaryColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(8, bodyY + 14);
    ctx.quadraticCurveTo(14, bodyY + 20 - flap, 11, bodyY + 28 - flap);
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * Render creature head accessories (Horns, Plumes, Cyber Antennae, Fox Ears)
 */
function drawFighterHeadAccessories(
  ctx: CanvasRenderingContext2D,
  fighter: Fighter,
  headY: number,
  animTick: number
) {
  const INK = '#1a120e';
  const id = fighter.stats.id;
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  if (id === 'zephyr') {
    // Aerodynamic feather sky crest plume pointing back
    ctx.save();
    ctx.fillStyle = fighter.stats.color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(2, headY - 10);
    ctx.quadraticCurveTo(-12, headY - 24, -20, headY - 18);
    ctx.lineTo(-12, headY - 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (id === 'brawler') {
    // Twin demon flame horns curving up
    ctx.save();
    ctx.fillStyle = fighter.stats.secondaryColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;

    // Front horn
    ctx.beginPath();
    ctx.moveTo(4, headY - 8);
    ctx.quadraticCurveTo(8, headY - 20, 14, headY - 22);
    ctx.lineTo(8, headY - 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Back horn
    ctx.beginPath();
    ctx.moveTo(-6, headY - 8);
    ctx.quadraticCurveTo(-8, headY - 19, -13, headY - 21);
    ctx.lineTo(-4, headY - 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (id === 'yeti') {
    // Frosted crystal ice horns
    ctx.save();
    ctx.fillStyle = '#e0f2fe';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;

    // Front ice horn
    ctx.beginPath();
    ctx.moveTo(3, headY - 8);
    ctx.lineTo(11, headY - 18);
    ctx.lineTo(6, headY - 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Back ice horn
    ctx.beginPath();
    ctx.moveTo(-6, headY - 8);
    ctx.lineTo(-12, headY - 17);
    ctx.lineTo(-4, headY - 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (id === 'striker') {
    // Dual angled cyber lightning antennae
    ctx.save();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.5;

    // Antenna 1
    ctx.beginPath();
    ctx.moveTo(3, headY - 9);
    ctx.lineTo(9, headY - 22);
    ctx.stroke();

    // Glowing tip 1
    ctx.fillStyle = '#67e8f9';
    ctx.beginPath();
    ctx.arc(9, headY - 22, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Antenna 2
    ctx.beginPath();
    ctx.moveTo(-5, headY - 9);
    ctx.lineTo(-9, headY - 20);
    ctx.stroke();

    // Glowing tip 2
    ctx.beginPath();
    ctx.arc(-9, headY - 20, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (id === 'shinobi') {
    // Pointed ninja fox/kitsune ears & metallic headband
    ctx.save();
    // Ears
    ctx.fillStyle = '#a855f7';
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 1.5;

    // Front ear
    ctx.beginPath();
    ctx.moveTo(3, headY - 9);
    ctx.lineTo(8, headY - 22);
    ctx.lineTo(11, headY - 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Back ear
    ctx.beginPath();
    ctx.moveTo(-9, headY - 9);
    ctx.lineTo(-8, headY - 21);
    ctx.lineTo(-3, headY - 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Metallic forehead plate
    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-5, headY - 8, 10, 4, 1);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (id === 'titan') {
    // Massive golden bull / minotaur horns
    ctx.save();
    ctx.fillStyle = '#eab308';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;

    // Front horn
    ctx.beginPath();
    ctx.moveTo(6, headY - 4);
    ctx.quadraticCurveTo(18, headY - 14, 16, headY - 24);
    ctx.lineTo(12, headY - 18);
    ctx.quadraticCurveTo(10, headY - 8, 4, headY - 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Back horn
    ctx.beginPath();
    ctx.moveTo(-6, headY - 4);
    ctx.quadraticCurveTo(-18, headY - 14, -16, headY - 24);
    ctx.lineTo(-12, headY - 18);
    ctx.quadraticCurveTo(-10, headY - 8, -4, headY - 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (id === 'monk') {
    // Round monkey ears + prayer bead band
    ctx.save();
    ctx.fillStyle = '#a16207';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.ellipse(10, headY - 2, 5, 6, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(-10, headY - 2, 5, 6, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner ear
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.ellipse(10, headY - 2, 2.5, 3, 0.15, 0, Math.PI * 2);
    ctx.ellipse(-10, headY - 2, 2.5, 3, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Prayer beads across forehead
    ctx.fillStyle = '#84cc16';
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(i * 3.2, headY - 7, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (id === 'lotus') {
    // Twin hair buns + bangs + earring — clearly feminine
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;

    // Hair mass / bangs fringe behind face edge
    ctx.beginPath();
    ctx.moveTo(-11, headY - 4);
    ctx.quadraticCurveTo(-8, headY - 14, 0, headY - 13);
    ctx.quadraticCurveTo(8, headY - 14, 11, headY - 4);
    ctx.quadraticCurveTo(6, headY - 8, 0, headY - 7);
    ctx.quadraticCurveTo(-6, headY - 8, -11, headY - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Twin odango buns
    ctx.beginPath();
    ctx.arc(10, headY - 13, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-10, headY - 13, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bun ties
    ctx.fillStyle = fighter.stats.secondaryColor;
    ctx.beginPath();
    ctx.arc(10, headY - 13, 2.2, 0, Math.PI * 2);
    ctx.arc(-10, headY - 13, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Side lock
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(9, headY + 2);
    ctx.quadraticCurveTo(14, headY + 8, 11, headY + 14);
    ctx.quadraticCurveTo(8, headY + 8, 7, headY + 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Forehead jewel
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, headY - 6, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Small earring
    ctx.fillStyle = fighter.stats.secondaryColor;
    ctx.beginPath();
    ctx.arc(11, headY + 6, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * Render creature chest emblem / reactor
 */
function drawFighterChestEmblem(
  ctx: CanvasRenderingContext2D,
  fighter: Fighter,
  bodyY: number,
  _secColor: string
) {
  const INK = '#1a120e';
  const id = fighter.stats.id;
  ctx.save();
  ctx.shadowBlur = 0;

  if (id === 'titan') {
    ctx.fillStyle = '#e8d080';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, bodyY - 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (id === 'striker') {
    ctx.fillStyle = fighter.stats.secondaryColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-3, bodyY - 5, 6, 8, 1.5);
    ctx.fill();
    ctx.stroke();
  } else if (id === 'yeti') {
    ctx.fillStyle = '#d8e4ec';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, bodyY - 3, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (id === 'zephyr') {
    ctx.fillStyle = fighter.stats.secondaryColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, bodyY - 6);
    ctx.lineTo(4, bodyY - 1);
    ctx.lineTo(0, bodyY + 2);
    ctx.lineTo(-4, bodyY - 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (id === 'shinobi') {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-6, bodyY - 8);
    ctx.lineTo(6, bodyY + 4);
    ctx.stroke();
    ctx.strokeStyle = fighter.stats.secondaryColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, bodyY - 8);
    ctx.lineTo(6, bodyY + 4);
    ctx.stroke();
  } else if (id === 'monk') {
    ctx.fillStyle = '#7a9a40';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, bodyY - 2, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (id === 'lotus') {
    ctx.fillStyle = fighter.stats.secondaryColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-7, bodyY + 2, 14, 4, 1);
    ctx.fill();
    ctx.stroke();
  } else if (id === 'brawler') {
    ctx.fillStyle = fighter.stats.secondaryColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, bodyY - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Render active creature special status effects (Frostbite slow, Burn fire, Static lightning, Super armor, Gliding)
 */
function drawFighterStatusEffects(
  ctx: CanvasRenderingContext2D,
  fighter: Fighter,
  bodyY: number,
  headY: number,
  animTick: number
) {
  ctx.save();

  // 1. FROSTBITE CHILL: Frosted icy blue sheen & snowflakes
  if (fighter.frostbiteTimer && fighter.frostbiteTimer > 0) {
    ctx.fillStyle = 'rgba(186, 230, 253, 0.35)';
    ctx.beginPath();
    ctx.roundRect(-14, bodyY - 16, 28, 48, 8);
    ctx.fill();

    // Floating ice crystals
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 3; i++) {
      const offsetX = Math.sin(animTick * 0.1 + i * 2) * 16;
      const offsetY = Math.cos(animTick * 0.15 + i * 1.5) * 20;
      ctx.fillRect(offsetX, bodyY + offsetY, 3, 3);
    }
  }

  // 1b. GLACIAL LOCK hard freeze
  if (fighter.freezeTimer && fighter.freezeTimer > 0) {
    ctx.fillStyle = 'rgba(224, 242, 254, 0.55)';
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.95)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-18, bodyY - 20, 36, 56, 8);
    ctx.fill();
    ctx.stroke();
  }

  // 1c. Super flash aura — ink ring, no glow bloom
  if (fighter.superFlash && fighter.superFlash > 0) {
    ctx.strokeStyle = '#1a120e';
    ctx.lineWidth = 4;
    ctx.globalAlpha = Math.min(1, fighter.superFlash / 20);
    ctx.beginPath();
    ctx.ellipse(0, bodyY, 26 + Math.sin(animTick * 0.4) * 4, 34, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = fighter.stats.secondaryColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, bodyY, 26 + Math.sin(animTick * 0.4) * 4, 34, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Ready super meter shimmer
  if ((fighter.superMeter ?? 0) >= 100 && fighter.currentAction !== 'super') {
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, headY - 18, 5 + Math.sin(animTick * 0.35) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 2. BURN FLAMES: Lingering fire embers
  if (fighter.burnTimer && fighter.burnTimer > 0) {
    ctx.fillStyle = Math.sin(animTick * 0.4) > 0 ? '#ef4444' : '#f97316';
    for (let i = 0; i < 3; i++) {
      const flameX = Math.sin(animTick * 0.2 + i * 1.8) * 12;
      const flameY = headY - 4 - ((animTick * 2 + i * 10) % 25);
      ctx.beginPath();
      ctx.arc(flameX, flameY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. STATIC OVERDRIVE 100%: Electric lightning arcs
  if (fighter.staticCharge && fighter.staticCharge >= 100) {
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const arcX1 = Math.sin(animTick * 0.5) * 14;
    ctx.moveTo(arcX1, headY);
    ctx.lineTo(arcX1 + 6, bodyY);
    ctx.lineTo(arcX1 - 4, bodyY + 16);
    ctx.stroke();

    ctx.strokeStyle = '#fef08a';
    ctx.beginPath();
    const arcX2 = -Math.sin(animTick * 0.6) * 14;
    ctx.moveTo(arcX2, headY - 4);
    ctx.lineTo(arcX2 - 6, bodyY);
    ctx.lineTo(arcX2 + 4, bodyY + 18);
    ctx.stroke();
  }

  // 4. SUPER ARMOR: inked bronze shield outline
  if (fighter.hasSuperArmor) {
    ctx.strokeStyle = '#1a120e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-16, bodyY - 18, 32, 54, 10);
    ctx.stroke();
    ctx.strokeStyle = '#c9a030';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-16, bodyY - 18, 32, 54, 10);
    ctx.stroke();
  }

  // 5. WING GLIDE: Swirling aerodynamic wind stream rings
  if (fighter.isGliding) {
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, bodyY + 14, 28, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 6. TIPSY CHARGE 100%: Amber swirl / sake glow
  if (fighter.tipsyCharge && fighter.tipsyCharge >= 100) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, bodyY, 18 + Math.sin(animTick * 0.4) * 3, 24, animTick * 0.08, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(163, 230, 53, 0.35)';
    ctx.beginPath();
    ctx.arc(Math.sin(animTick * 0.3) * 12, headY - 8, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 7. TIPSY STUMBLE on victim
  if (fighter.tipsyTimer && fighter.tipsyTimer > 0) {
    ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
    ctx.beginPath();
    ctx.roundRect(-14, bodyY - 16, 28, 48, 8);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    for (let i = 0; i < 3; i++) {
      const ox = Math.sin(animTick * 0.25 + i) * 14;
      const oy = Math.cos(animTick * 0.2 + i * 1.4) * 10;
      ctx.beginPath();
      ctx.arc(ox, bodyY + oy - 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 8. LIGHTNING KICK FLASH
  if (fighter.lightningKickFlash && fighter.lightningKickFlash > 0) {
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const kickX = 16 + Math.sin(animTick * 0.8) * 4;
    ctx.moveTo(kickX, bodyY + 4);
    ctx.lineTo(kickX + 10, bodyY + 14);
    ctx.lineTo(kickX - 2, bodyY + 22);
    ctx.stroke();
    ctx.strokeStyle = '#f9a8d4';
    ctx.beginPath();
    ctx.moveTo(kickX - 6, bodyY + 2);
    ctx.lineTo(kickX + 4, bodyY + 12);
    ctx.lineTo(kickX - 8, bodyY + 20);
    ctx.stroke();
  }

  ctx.restore();
}

function renderRespawnHalo(ctx: CanvasRenderingContext2D, fighter: Fighter) {
  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // Inked parchment respawn disc
  ctx.fillStyle = '#e8d5b8';
  ctx.strokeStyle = '#1a120e';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.ellipse(0, 30, 42, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(26, 18, 14, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 30, 28, 7, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Soft light wash descending
  ctx.fillStyle = 'rgba(240, 224, 200, 0.25)';
  ctx.beginPath();
  ctx.moveTo(-35, 30);
  ctx.lineTo(-15, -40);
  ctx.lineTo(15, -40);
  ctx.lineTo(35, 30);
  ctx.closePath();
  ctx.fill();

  drawFighterModel(ctx, 0, 0, fighter, 0, false);

  ctx.restore();
}

type WeaponSwingPhase = 'idle' | 'windup' | 'slash' | 'recover';

interface HeldWeaponPose {
  kind: ItemKind | null;
  handX: number;
  handY: number;
  angle: number;
  meleeSwing: boolean;
  phase: WeaponSwingPhase;
  slashT: number; // 0..1 through the active slash
  glowColor: string | null;
}

/** Frame-based weapon pose: idle bob, wind-up, slash arc, recovery. */
function getHeldWeaponPose(fighter: Fighter, bodyY: number, animTick: number): HeldWeaponPose {
  const attackKind = fighter.attack?.weaponKind;
  const attackDef = attackKind ? ITEM_DEFS[attackKind] : null;
  // Bombs leave the hand on throw; don't keep drawing them from attack.weaponKind
  const kind =
    fighter.heldWeapon?.kind ??
    (attackDef && attackDef.category !== 'throwable' ? attackKind! : null);

  const idle: HeldWeaponPose = {
    kind,
    handX: 16,
    handY: bodyY + 2,
    angle: -0.2 + Math.sin(animTick * 0.08) * 0.05,
    meleeSwing: false,
    phase: 'idle',
    slashT: 0,
    glowColor: kind ? ITEM_DEFS[kind].glowColor : null,
  };
  if (!kind) return idle;

  const atk = fighter.attack;
  const isMeleeSwing =
    fighter.currentAction === 'punch' &&
    !!atk?.weaponKind &&
    ITEM_DEFS[atk.weaponKind].category === 'melee';

  if (!isMeleeSwing || !atk) {
    // Guns / throw recovery: slight forward aim pose
    if (atk?.weaponKind && ITEM_DEFS[atk.weaponKind].category === 'ranged') {
      return {
        ...idle,
        kind,
        handX: 24,
        handY: bodyY - 2,
        angle: 0.05,
        glowColor: ITEM_DEFS[kind].glowColor,
      };
    }
    return { ...idle, kind, glowColor: ITEM_DEFS[kind].glowColor };
  }

  const dir = atk.direction ?? 'forward';
  const total = Math.max(1, atk.totalFrames);
  const startup = atk.startupFrames;
  const activeEnd = atk.startupFrames + atk.activeFrames;
  const frame = atk.frame;

  let phase: WeaponSwingPhase;
  let u: number; // 0..1 within phase
  if (frame < startup) {
    phase = 'windup';
    u = startup <= 0 ? 1 : frame / startup;
  } else if (frame < activeEnd) {
    phase = 'slash';
    u = atk.activeFrames <= 0 ? 1 : (frame - startup) / atk.activeFrames;
  } else {
    phase = 'recover';
    const recoverLen = Math.max(1, total - activeEnd);
    u = Math.min(1, (frame - activeEnd) / recoverLen);
  }

  // Ease helpers
  const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
  const easeIn = (t: number) => t * t;

  let handX: number;
  let handY: number;
  let angle: number;
  let slashT = 0;

  if (dir === 'up') {
    // Cock low → slash upward
    if (phase === 'windup') {
      handX = 14 + u * 4;
      handY = bodyY + 6 - u * 4;
      angle = 0.6 - u * 0.3;
    } else if (phase === 'slash') {
      slashT = easeOut(u);
      handX = 18 + slashT * 6;
      handY = bodyY + 2 - slashT * 42;
      angle = 0.3 - slashT * 1.7;
    } else {
      handX = 24 - u * 8;
      handY = bodyY - 40 + u * 42;
      angle = -1.4 + u * 1.2;
    }
  } else if (dir === 'down') {
    // Raise high → smash down
    if (phase === 'windup') {
      handX = 16 + u * 6;
      handY = bodyY - 8 - u * 22;
      angle = -0.4 - u * 0.8;
    } else if (phase === 'slash') {
      slashT = easeOut(u);
      handX = 22 + slashT * 8;
      handY = bodyY - 30 + slashT * 46;
      angle = -1.2 + slashT * 2.4;
    } else {
      handX = 30 - u * 14;
      handY = bodyY + 16 - u * 14;
      angle = 1.2 - u * 1.4;
    }
  } else {
    // Forward slash: wind back → whip through a wide arc
    if (phase === 'windup') {
      const w = easeIn(u);
      handX = 14 - w * 6;
      handY = bodyY - 2 - w * 14;
      angle = -0.2 - w * 1.1; // cocked up/back
    } else if (phase === 'slash') {
      slashT = easeOut(u);
      handX = 10 + slashT * 28;
      handY = bodyY - 16 + slashT * 22;
      angle = -1.3 + slashT * 2.35; // arc down through horizontal
    } else {
      const r = easeOut(u);
      handX = 38 - r * 22;
      handY = bodyY + 6 - r * 4;
      angle = 1.05 - r * 1.25;
    }
  }

  return {
    kind,
    handX,
    handY,
    angle,
    meleeSwing: true,
    phase,
    slashT,
    glowColor: ITEM_DEFS[kind].glowColor,
  };
}

function drawHeldWeapon(
  ctx: CanvasRenderingContext2D,
  fighter: Fighter,
  bodyY: number,
  animTick: number
) {
  const pose = getHeldWeaponPose(fighter, bodyY, animTick);
  if (!pose.kind) return;

  // Motion trail / slash arc while the weapon is cutting
  if (pose.meleeSwing && pose.phase === 'slash' && pose.slashT > 0.05) {
    const dir = fighter.attack?.direction ?? 'forward';
    ctx.save();
    ctx.strokeStyle = pose.glowColor || '#f8fafc';
    ctx.globalAlpha = 0.35 * (1 - pose.slashT * 0.5);
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (dir === 'up') {
      ctx.arc(pose.handX - 4, bodyY - 8, 28, 0.8, 0.8 - pose.slashT * 1.6, true);
    } else if (dir === 'down') {
      ctx.arc(pose.handX - 6, bodyY - 6, 30, -1.2, -1.2 + pose.slashT * 2.2, false);
    } else {
      ctx.arc(8, bodyY - 4, 32, -1.4, -1.4 + pose.slashT * 2.2, false);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(pose.handX, pose.handY);
  ctx.rotate(pose.angle);
  if (pose.meleeSwing && pose.phase === 'slash') {
    ctx.shadowColor = pose.glowColor || '#ffffff';
    ctx.shadowBlur = 10 + pose.slashT * 8;
  }
  drawItemGlyph(ctx, pose.kind, pose.meleeSwing && pose.phase === 'slash' ? 1.12 : 1.05);
  ctx.restore();
}

export function renderWorldItems(ctx: CanvasRenderingContext2D, items: WorldItem[], animTick: number) {
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    if (item.lifetime < 180 && Math.floor(item.lifetime / 8) % 2 === 0) continue;
    const def = ITEM_DEFS[item.kind];
    const bobY = Math.sin(item.bob * 0.12) * 4;
    const x = item.x;
    const y = item.y + bobY;

    ctx.save();
    // Landing shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(item.x, item.y + 14, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Capsule glow
    ctx.shadowColor = def.glowColor;
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = def.glowColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - 16, y - 22, 32, 34, 10);
    ctx.fill();
    ctx.stroke();

    // Inner shine
    ctx.shadowBlur = 0;
    ctx.fillStyle = `${def.glowColor}33`;
    ctx.beginPath();
    ctx.roundRect(x - 12, y - 18, 24, 12, 6);
    ctx.fill();

    ctx.translate(x, y - 4);
    drawItemGlyph(ctx, item.kind, 0.92);
    ctx.restore();

    // Name tag
    ctx.save();
    ctx.font = '900 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = def.glowColor;
    ctx.strokeText(def.name, x, y - 28 - (idx % 2) * 11);
    ctx.fillText(def.name, x, y - 28 - (idx % 2) * 11);
    ctx.restore();

    // Pulse ring
    if (animTick % 40 < 18) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = def.glowColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 20 + (animTick % 40) * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

export function renderProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[]) {
  for (const proj of projectiles) {
    ctx.save();
    ctx.translate(proj.x, proj.y);
    ctx.shadowColor = proj.color;
    ctx.shadowBlur = 12;

    if (proj.kind === 'laser') {
      const len = 22;
      ctx.rotate(Math.atan2(proj.vy, proj.vx));
      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.roundRect(-len / 2, -3, len, 6, 3);
      ctx.fill();
      ctx.fillStyle = '#ecfdf5';
      ctx.beginPath();
      ctx.roundRect(-len / 2 + 4, -1.5, len - 8, 3, 2);
      ctx.fill();
    } else if (proj.kind === 'bomb') {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fb7185';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(3, -8, 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-1.5, -1.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawItemGlyph(ctx: CanvasRenderingContext2D, kind: ItemKind, scale: number) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (kind) {
    case 'blaster': {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-2, -4, 16, 7);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-8, -2, 8, 9);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(14, -0.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'raygun': {
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.roundRect(-6, -5, 12, 10, 3);
      ctx.fill();
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(4, -3, 14, 5);
      ctx.fillStyle = '#bbf7d0';
      ctx.beginPath();
      ctx.arc(18, -0.5, 2.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'sword': {
      ctx.strokeStyle = '#94a3b8';
      ctx.fillStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(0, -18);
      ctx.lineTo(4, -14);
      ctx.lineTo(4, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-5, 6, 14, 4);
      ctx.fillRect(-1.5, 8, 5, 8);
      break;
    }
    case 'beam_sword': {
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 12;
      const blade = ctx.createLinearGradient(0, 12, 0, -22);
      blade.addColorStop(0, '#22d3ee');
      blade.addColorStop(1, '#ecfeff');
      ctx.fillStyle = blade;
      ctx.beginPath();
      ctx.roundRect(-2.5, -22, 5, 28, 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0e7490';
      ctx.fillRect(-5, 6, 10, 4);
      ctx.fillRect(-2, 8, 4, 7);
      break;
    }
    case 'hammer': {
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-2, -4, 4, 18);
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-10, -14, 20, 12, 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'bat': {
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-2, 12);
      ctx.lineTo(4, -18);
      ctx.stroke();
      ctx.strokeStyle = '#fcd34d';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(2, -8);
      ctx.lineTo(5, -18);
      ctx.stroke();
      break;
    }
    case 'bomb': {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fb7185';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(4, -5);
      ctx.quadraticCurveTo(8, -12, 6, -16);
      ctx.stroke();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(6, -16, 2.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

export function renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;

    if (p.alpha <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);

    if (p.type === 'spark') {
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'shockwave' || p.type === 'ring') {
      p.size += 3;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.type === 'smoke') {
      p.size += 0.4;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'text' && p.text) {
      ctx.font = '900 16px system-ui, sans-serif';
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillText(p.text, p.x, p.y);
    }

    ctx.restore();
  }
}

// Offscreen blast radar circles (like Smash Bros magnifying glass when fighters fly far away)
export function renderOffscreenIndicators(
  ctx: CanvasRenderingContext2D,
  fighters: Fighter[],
  stage: Stage,
  camera: CameraState,
  canvasWidth: number,
  canvasHeight: number
) {
  for (const fighter of fighters) {
    if (fighter.stocks <= 0 || fighter.respawnTimer > 0) continue;

    // Convert world coordinate to screen coordinate
    const screenX = (fighter.x - camera.x) * camera.zoom + canvasWidth / 2;
    const screenY = (fighter.y - camera.y) * camera.zoom + canvasHeight / 2;

    const margin = 35;
    const isOffscreen =
      screenX < margin || screenX > canvasWidth - margin || screenY < margin || screenY > canvasHeight - margin;

    if (isOffscreen) {
      const clampedX = Math.max(margin, Math.min(canvasWidth - margin, screenX));
      const clampedY = Math.max(margin, Math.min(canvasHeight - margin, screenY));

      ctx.save();
      ctx.shadowColor = fighter.stats.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = fighter.stats.color;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.arc(clampedX, clampedY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Mini text inside
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`P${fighter.playerIndex + 1}`, clampedX, clampedY - 4);

      ctx.font = '900 10px system-ui, sans-serif';
      ctx.fillStyle = fighter.damagePercent > 100 ? '#ef4444' : '#f59e0b';
      ctx.fillText(`${Math.floor(fighter.damagePercent)}%`, clampedX, clampedY + 8);

      ctx.restore();
    }
  }
}
