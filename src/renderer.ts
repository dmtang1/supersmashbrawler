import { CameraState, Fighter, ItemKind, Particle, Projectile, Stage, WorldItem } from './types';
import { ITEM_DEFS } from './items';

export function renderStage(
  ctx: CanvasRenderingContext2D,
  stage: Stage,
  width: number,
  height: number
) {
  // Background Gradient
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, stage.bgGradient[0]);
  grad.addColorStop(1, stage.bgGradient[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Background Ambience / Cyber Grid / Stars
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1;

  // Grid lines
  const gridSize = 60;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  // Platforms
  for (const plat of stage.platforms) {
    ctx.save();

    if (plat.isDropThrough) {
      // Soft / Pass-through floating platform
      ctx.fillStyle = plat.color || '#334155';
      ctx.beginPath();
      ctx.roundRect(plat.x, plat.y, plat.width, plat.height, 4);
      ctx.fill();

      // Top glowing energy rail
      ctx.strokeStyle = plat.borderColor || '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = plat.borderColor || '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(plat.x + 2, plat.y + 1);
      ctx.lineTo(plat.x + plat.width - 2, plat.y + 1);
      ctx.stroke();
    } else {
      // Main Solid Stage Island
      // Floating underside bevel / rock base
      const undersideHeight = 120;
      const baseGrad = ctx.createLinearGradient(0, plat.y, 0, plat.y + undersideHeight);
      baseGrad.addColorStop(0, '#0f172a');
      baseGrad.addColorStop(1, '#020617');
      ctx.fillStyle = baseGrad;

      ctx.beginPath();
      ctx.moveTo(plat.x, plat.y);
      ctx.lineTo(plat.x + plat.width, plat.y);
      ctx.lineTo(plat.x + plat.width - 90, plat.y + undersideHeight);
      ctx.lineTo(plat.x + 90, plat.y + undersideHeight);
      ctx.closePath();
      ctx.fill();

      // Main stage top slab
      ctx.fillStyle = plat.color || '#1e293b';
      ctx.beginPath();
      ctx.roundRect(plat.x, plat.y, plat.width, plat.height, [6, 6, 2, 2]);
      ctx.fill();

      // Stage edge neon glow borders
      ctx.strokeStyle = plat.borderColor || '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = plat.borderColor || '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.stroke();

      // Ledge Snap Sweetspot Anchors (Glowing corner pips at left & right edges)
      ctx.fillStyle = plat.borderColor || '#38bdf8';
      ctx.shadowColor = plat.borderColor || '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(plat.x + 1, plat.y + 1, 4.5, 0, Math.PI * 2);
      ctx.arc(plat.x + plat.width - 1, plat.y + 1, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Stage center decorative emblem
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.beginPath();
      ctx.arc(plat.x + plat.width / 2, plat.y + 28, 22, 0, Math.PI * 2);
      ctx.fill();
    }

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
    // Glowing invincibility shield
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, fighter.height * 0.65, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  drawFighterModel(ctx, fighter.x, fighter.y, fighter, animTick, false);
}

function drawFighterModel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fighter: Fighter,
  animTick: number,
  isTrail: boolean
) {
  ctx.save();
  ctx.translate(x, y);

  // Hitstun tumble rotation
  if (fighter.hitstun > 0) {
    const tumbleAngle = (fighter.vx * 0.05) + Math.sin(animTick * 0.3) * 0.2;
    ctx.rotate(tumbleAngle);
  }

  // Facing flip
  ctx.scale(fighter.facing, 1);

  const stats = fighter.stats;
  const isCrouching = fighter.isCrouching;
  const isHit = fighter.hitstun > 0;
  const isSprinting = fighter.isSprinting;

  // Base Colors
  const mainColor = isHit ? '#ffffff' : stats.color;
  const secColor = isHit ? '#fca5a5' : stats.secondaryColor;

  // Shadow Phase Transparency for Shinobi
  if (fighter.shadowPhaseTimer && fighter.shadowPhaseTimer > 0) {
    ctx.globalAlpha = 0.45;
  }

  // 1. Shadow underneath
  if (!isTrail && fighter.isGrounded) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, fighter.height / 2 + 2, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Poses and limb angles
  const walkCycle = Math.sin(animTick * (isSprinting ? 0.45 : 0.25));
  const bodyY = isCrouching ? 10 : 0;
  const bodyLean = isSprinting ? 0.25 : (fighter.currentAction === 'walk' ? 0.1 : 0);

  ctx.rotate(bodyLean);

  // 1.5 Back Accessories (Wings, Ice Crystals, Jet Thruster, Scarf, Pauldrons)
  drawFighterAccessoriesBack(ctx, fighter, bodyY, animTick, isTrail);

  // 2. Legs
  ctx.strokeStyle = secColor;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';

  const legYStart = bodyY + 12;
  if (fighter.currentAction === 'kick') {
    // Dynamic kicking pose
    const kickDir = fighter.attack?.direction;
    if (kickDir === 'down') {
      // Stomp down
      ctx.beginPath();
      ctx.moveTo(-6, legYStart);
      ctx.lineTo(-4, legYStart + 24);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(6, legYStart);
      ctx.lineTo(10, legYStart + 30);
      ctx.stroke();
    } else if (kickDir === 'up') {
      // Flip kick straight up
      ctx.beginPath();
      ctx.moveTo(-6, legYStart);
      ctx.lineTo(-8, legYStart + 18);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(6, legYStart);
      ctx.lineTo(16, legYStart - 28);
      ctx.stroke();
    } else {
      // Extended roundhouse kick forward
      ctx.beginPath();
      ctx.moveTo(-6, legYStart);
      ctx.lineTo(-8, legYStart + 20);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(6, legYStart);
      ctx.lineTo(26, legYStart + 4);
      ctx.stroke();
    }
  } else if (fighter.currentAction === 'ledge_hang') {
    // Hanging relaxed legs
    ctx.beginPath();
    ctx.moveTo(-4, legYStart);
    ctx.lineTo(-5, legYStart + 22);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(4, legYStart);
    ctx.lineTo(3, legYStart + 24);
    ctx.stroke();
  } else if (!fighter.isGrounded) {
    // Air pose
    ctx.beginPath();
    ctx.moveTo(-6, legYStart);
    ctx.lineTo(-12, legYStart + 16);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(6, legYStart);
    ctx.lineTo(8, legYStart + 18);
    ctx.stroke();
  } else if (isCrouching) {
    // Crouch legs
    ctx.beginPath();
    ctx.moveTo(-8, legYStart);
    ctx.lineTo(-14, legYStart + 12);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(6, legYStart);
    ctx.lineTo(12, legYStart + 12);
    ctx.stroke();
  } else {
    // Walk / sprint legs
    ctx.beginPath();
    ctx.moveTo(-6, legYStart);
    ctx.lineTo(-6 - walkCycle * 14, legYStart + 20);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(6, legYStart);
    ctx.lineTo(6 + walkCycle * 14, legYStart + 20);
    ctx.stroke();
  }

  // 3. Torso
  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.roundRect(-12, bodyY - 14, 24, 28, 6);
  ctx.fill();

  // Belt / Chest Armor Accent & Creature Specific Core
  ctx.fillStyle = secColor;
  ctx.beginPath();
  ctx.roundRect(-10, bodyY + 6, 20, 5, 2);
  ctx.fill();
  drawFighterChestEmblem(ctx, fighter, bodyY, secColor);

  // 4. Head
  const headY = bodyY - 26;
  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.arc(0, headY, 11, 0, Math.PI * 2);
  ctx.fill();

  // Head Accessories (Horns, Wings Plume, Fox Ears, Antennae, Ice Horns)
  drawFighterHeadAccessories(ctx, fighter, headY, animTick);

  // Glowing Eye Visor
  ctx.fillStyle = isHit ? '#ef4444' : '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.roundRect(1, headY - 3, 8, 4, 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // 5. Arms & Hands / Attack Visuals
  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 6;

  if (fighter.currentAction === 'punch') {
    const punchDir = fighter.attack?.direction;
    if (punchDir === 'up') {
      // Uppercut
      ctx.beginPath();
      ctx.moveTo(4, bodyY - 6);
      ctx.lineTo(14, bodyY - 36);
      ctx.stroke();
      // Fist
      ctx.fillStyle = secColor;
      ctx.beginPath();
      ctx.arc(14, bodyY - 36, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Forward smash punch
      ctx.beginPath();
      ctx.moveTo(4, bodyY - 6);
      ctx.lineTo(26, bodyY - 6);
      ctx.stroke();
      // Glove
      ctx.fillStyle = secColor;
      ctx.beginPath();
      ctx.arc(26, bodyY - 6, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (fighter.currentAction === 'grab') {
    // Both arms extended forward grabbing
    ctx.strokeStyle = '#eab308';
    ctx.beginPath();
    ctx.moveTo(2, bodyY - 8);
    ctx.lineTo(22, bodyY - 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(2, bodyY + 2);
    ctx.lineTo(22, bodyY + 2);
    ctx.stroke();

    // Grab electric lock
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(24, bodyY - 3, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (fighter.currentAction.startsWith('throw_')) {
    // Throwing motion
    ctx.beginPath();
    ctx.moveTo(0, bodyY - 6);
    ctx.lineTo(18, bodyY - 18);
    ctx.stroke();
  } else if (fighter.currentAction === 'ledge_hang') {
    // Both arms reaching up and forward gripping the platform edge corner
    ctx.beginPath();
    ctx.moveTo(-2, bodyY - 6);
    ctx.lineTo(12, bodyY - 26);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(6, bodyY - 6);
    ctx.lineTo(16, bodyY - 26);
    ctx.stroke();

    // Hands gripping edge
    ctx.fillStyle = secColor;
    ctx.beginPath();
    ctx.arc(12, bodyY - 26, 4, 0, Math.PI * 2);
    ctx.arc(16, bodyY - 26, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (fighter.grab.role === 'grabbed') {
    // Struggling held pose
    ctx.beginPath();
    ctx.moveTo(-6, bodyY - 6);
    ctx.lineTo(-16, bodyY - 14);
    ctx.stroke();
  } else {
    // Normal / idle arms
    ctx.beginPath();
    ctx.moveTo(-4, bodyY - 6);
    ctx.lineTo(-4 - walkCycle * 8, bodyY + 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(6, bodyY - 6);
    ctx.lineTo(8 + walkCycle * 8, bodyY + 8);
    ctx.stroke();
  }

  drawHeldWeapon(ctx, fighter, bodyY, animTick);

  // 6. Creature Status Effects & Visual Auras
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
  const id = fighter.stats.id;
  const isSprinting = fighter.isSprinting;
  const isGrounded = fighter.isGrounded;

  if (id === 'zephyr') {
    // ==========================================
    // ZEPHYR DRAKE: ANIMATED WINGS & WIND TAIL
    // ==========================================
    ctx.save();
    
    // Wind Tail
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    const tailWiggle = Math.sin(animTick * 0.25) * 4;
    ctx.beginPath();
    ctx.moveTo(-6, bodyY + 12);
    ctx.quadraticCurveTo(-18, bodyY + 16, -26, bodyY + 22 + tailWiggle);
    ctx.stroke();

    // Tail feather plume
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.ellipse(-26, bodyY + 22 + tailWiggle, 6, 3, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Wings
    if (fighter.isGliding) {
      // 1. OUTSTRETCHED HORIZONTAL GLIDING WINGS
      // Back Wing
      ctx.fillStyle = 'rgba(14, 165, 233, 0.75)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-4, bodyY - 12);
      ctx.lineTo(-44, bodyY - 14 + Math.sin(animTick * 0.2) * 2);
      ctx.lineTo(-32, bodyY + 6);
      ctx.lineTo(-18, bodyY + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Front Wing
      ctx.beginPath();
      ctx.moveTo(4, bodyY - 12);
      ctx.lineTo(46, bodyY - 14 + Math.sin(animTick * 0.2) * 2);
      ctx.lineTo(34, bodyY + 6);
      ctx.lineTo(18, bodyY + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing Wingtip feathers
      ctx.fillStyle = '#bae6fd';
      ctx.beginPath();
      ctx.arc(-44, bodyY - 14 + Math.sin(animTick * 0.2) * 2, 3, 0, Math.PI * 2);
      ctx.arc(46, bodyY - 14 + Math.sin(animTick * 0.2) * 2, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (!isGrounded) {
      // 2. ANIMATED FLAPPING WINGS (Airborne / Jumping)
      const flap = Math.sin(animTick * 0.45);
      const flapYOffset = flap * 14;

      ctx.fillStyle = 'rgba(14, 165, 233, 0.85)';
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 2.5;

      // Left/Back Wing flapping
      ctx.beginPath();
      ctx.moveTo(-6, bodyY - 10);
      ctx.quadraticCurveTo(-24, bodyY - 32 + flapYOffset, -38, bodyY - 26 + flapYOffset);
      ctx.lineTo(-28, bodyY - 4 + flapYOffset * 0.5);
      ctx.lineTo(-14, bodyY - 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Primary feather ridges
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-18, bodyY - 14 + flapYOffset * 0.5);
      ctx.lineTo(-34, bodyY - 22 + flapYOffset);
      ctx.stroke();
    } else {
      // 3. NEATLY FOLDED WINGS (Grounded / Walking)
      ctx.fillStyle = 'rgba(2, 132, 199, 0.85)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(-6, bodyY - 10);
      ctx.quadraticCurveTo(-20, bodyY - 6, -18, bodyY + 16);
      ctx.lineTo(-10, bodyY + 18);
      ctx.lineTo(-6, bodyY + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Layered feather line
      ctx.strokeStyle = '#7dd3fc';
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
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'miter';

    // Top large ice spire
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.moveTo(-8, bodyY - 12);
    ctx.lineTo(-28, bodyY - 34);
    ctx.lineTo(-24, bodyY - 22);
    ctx.lineTo(-8, bodyY - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central crystal highlight
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-8, bodyY - 10);
    ctx.lineTo(-27, bodyY - 32);
    ctx.stroke();

    // Middle ice spire
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#bae6fd';
    ctx.beginPath();
    ctx.moveTo(-10, bodyY - 4);
    ctx.lineTo(-30, bodyY - 10);
    ctx.lineTo(-24, bodyY - 2);
    ctx.lineTo(-8, bodyY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Lower ice spire
    ctx.fillStyle = '#0369a1';
    ctx.strokeStyle = '#7dd3fc';
    ctx.beginPath();
    ctx.moveTo(-8, bodyY + 4);
    ctx.lineTo(-24, bodyY + 14);
    ctx.lineTo(-16, bodyY + 18);
    ctx.lineTo(-6, bodyY + 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glistening diamond glint on top crystal
    if (!isTrail && Math.sin(animTick * 0.15) > 0.4) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-28, bodyY - 34, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  } else if (id === 'striker') {
    // ==========================================
    // NEON STRIKER: CYBER JET THRUSTER PACK
    // ==========================================
    ctx.save();
    // Metal Pack Housing
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-20, bodyY - 12, 10, 22, 3);
    ctx.fill();
    ctx.stroke();

    // Dual Nozzles
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(-20, bodyY - 6, 3, 0, Math.PI * 2);
    ctx.arc(-20, bodyY + 4, 3, 0, Math.PI * 2);
    ctx.fill();

    // Blue/Cyan Plasma Flame Exhaust
    const thrustLen = (isSprinting ? 22 : 10) + Math.sin(animTick * 0.8) * 4;
    const grad = ctx.createLinearGradient(-20, 0, -20 - thrustLen, 0);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#06b6d4');
    grad.addColorStop(1, 'rgba(59, 130, 246, 0)');

    ctx.fillStyle = grad;
    // Top flame jet
    ctx.beginPath();
    ctx.moveTo(-20, bodyY - 8);
    ctx.lineTo(-20 - thrustLen, bodyY - 6);
    ctx.lineTo(-20, bodyY - 4);
    ctx.closePath();
    ctx.fill();

    // Bottom flame jet
    ctx.beginPath();
    ctx.moveTo(-20, bodyY + 2);
    ctx.lineTo(-20 - thrustLen, bodyY + 4);
    ctx.lineTo(-20, bodyY + 6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  } else if (id === 'shinobi') {
    // ==========================================
    // SHADOW SHINOBI: FLOWING DUAL-TAIL SCARF
    // ==========================================
    ctx.save();
    const wave1 = Math.sin(animTick * 0.28) * 6;
    const wave2 = Math.sin(animTick * 0.28 + 1.2) * 7;
    const speedTrail = Math.abs(fighter.vx) * 1.6;

    ctx.fillStyle = '#ec4899';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.5;

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
    ctx.fillStyle = '#c026d3';
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
  const id = fighter.stats.id;

  if (id === 'zephyr') {
    // Aerodynamic feather sky crest plume pointing back
    ctx.save();
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 1.5;
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
    ctx.fillStyle = '#f97316';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;

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
  }
}

/**
 * Render creature chest emblem / reactor
 */
function drawFighterChestEmblem(
  ctx: CanvasRenderingContext2D,
  fighter: Fighter,
  bodyY: number,
  secColor: string
) {
  const id = fighter.stats.id;
  ctx.save();

  if (id === 'titan') {
    // Glowing golden runic chest reactor
    ctx.fillStyle = '#fef08a';
    ctx.shadowColor = '#eab308';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, bodyY - 2, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'striker') {
    // Glowing cyan tech battery
    ctx.fillStyle = '#67e8f9';
    ctx.beginPath();
    ctx.roundRect(-3, bodyY - 5, 6, 8, 1.5);
    ctx.fill();
  } else if (id === 'yeti') {
    // Frosted chest plate
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.ellipse(0, bodyY - 3, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'zephyr') {
    // Aerodynamic feathered sky badge
    ctx.fillStyle = '#bae6fd';
    ctx.beginPath();
    ctx.moveTo(0, bodyY - 6);
    ctx.lineTo(4, bodyY - 1);
    ctx.lineTo(0, bodyY + 2);
    ctx.lineTo(-4, bodyY - 1);
    ctx.closePath();
    ctx.fill();
  } else if (id === 'shinobi') {
    // Ninja sash kunai handle
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-6, bodyY - 8);
    ctx.lineTo(6, bodyY + 4);
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

  // 4. SUPER ARMOR: Golden radiant shield outline
  if (fighter.hasSuperArmor) {
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#eab308';
    ctx.shadowBlur = 12;
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

  ctx.restore();
}

function renderRespawnHalo(ctx: CanvasRenderingContext2D, fighter: Fighter) {
  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // Glowing Halo Respawn Platform
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.ellipse(0, 30, 42, 12, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Light beam descending
  ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
  ctx.beginPath();
  ctx.moveTo(-35, 30);
  ctx.lineTo(-15, -40);
  ctx.lineTo(15, -40);
  ctx.lineTo(35, 30);
  ctx.closePath();
  ctx.fill();

  // Draw Fighter hovering
  drawFighterModel(ctx, 0, 0, fighter, 0, false);

  ctx.restore();
}

function drawHeldWeapon(
  ctx: CanvasRenderingContext2D,
  fighter: Fighter,
  bodyY: number,
  animTick: number
) {
  const kind = fighter.heldWeapon?.kind || fighter.attack?.weaponKind;
  if (!kind) return;

  const swinging = fighter.currentAction === 'punch' && !!fighter.attack?.weaponKind;
  const handX = swinging ? 28 : 16;
  const handY = swinging ? bodyY - 8 : bodyY + 2;
  ctx.save();
  ctx.translate(handX, handY);
  if (swinging) {
    const dir = fighter.attack?.direction;
    if (dir === 'up') ctx.rotate(-0.9);
    else if (dir === 'down') ctx.rotate(1.1);
    else ctx.rotate(-0.35);
  } else {
    ctx.rotate(-0.2 + Math.sin(animTick * 0.08) * 0.05);
  }
  drawItemGlyph(ctx, kind, 1.05);
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
