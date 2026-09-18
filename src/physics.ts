import { sound } from './audio';
import { ITEM_DEFS, tossHeldWeapon, useHeldWeapon } from './items';
import {
  AttackState,
  Fighter,
  FighterId,
  InputState,
  ItemWorld,
  Particle,
  Stage,
  PERCENT_KO_THRESHOLD,
  SPRINT_STAMINA_MAX,
  SUPER_METER_MAX,
  SUPER_METER_GAIN_DEALT,
  SUPER_METER_GAIN_TAKEN,
  SUPER_METER_PASSIVE_PER_FRAME,
  SUPER_METER_PUMMEL_DEALT,
  SUPER_METER_PUMMEL_TAKEN,
  SUPER_METER_ON_KO_KEEP,
} from './types';

export const GRAVITY = 0.65;
export const TERMINAL_VELOCITY = 18;
export const GROUND_FRICTION = 0.82;
export const AIR_DRAG = 0.96;

/** Global launch scale. 1.0 is the original curve; lower values keep hits snappy without early KOs. */
const KNOCKBACK_SCALE = 0.62;

/** ~4.8s of continuous sprint at 60fps, then a short wait before you can dash again. */
const SPRINT_STAMINA_DRAIN = 0.35;
const SPRINT_STAMINA_REGEN = 0.38;
const SPRINT_RESTART_MIN = 12;

/** Smash-style launch: every 1% of damage adds `growth` speed. Heavier fighters resist more. */
function knockbackFromPercent(base: number, growth: number, percent: number, weight: number): number {
  return ((base + percent * growth) / weight) * KNOCKBACK_SCALE;
}

function updateSprintStamina(fighter: Fighter, wantsSprint: boolean) {
  const stamina = fighter.sprintStamina ?? SPRINT_STAMINA_MAX;
  const canKeepSprinting = stamina > 0;
  const canStartSprinting = stamina >= SPRINT_RESTART_MIN;
  fighter.isSprinting = wantsSprint && (fighter.isSprinting ? canKeepSprinting : canStartSprinting);

  if (fighter.isSprinting) {
    fighter.sprintStamina = Math.max(0, stamina - SPRINT_STAMINA_DRAIN);
  } else {
    fighter.sprintStamina = Math.min(SPRINT_STAMINA_MAX, stamina + SPRINT_STAMINA_REGEN);
  }
}

export function createInitialFighter(
  playerIndex: number,
  isCpu: boolean,
  stats: any,
  spawnPoint: { x: number; y: number },
  facing: 1 | -1
): Fighter {
  return {
    playerIndex,
    isCpu,
    stats,
    x: spawnPoint.x,
    y: spawnPoint.y,
    vx: 0,
    vy: 0,
    width: 44,
    height: 64,
    facing,
    isGrounded: false,
    onDropThroughPlatform: false,
    dropThroughTimer: 0,
    doubleJumpsLeft: stats.doubleJumps,
    jumpReleased: true,
    isSprinting: false,
    sprintStamina: SPRINT_STAMINA_MAX,
    isCrouching: false,
    damagePercent: 0,
    stocks: 3,
    currentAction: 'idle',
    actionTimer: 0,
    attack: null,
    grab: { role: 'none', duration: 0, maxDuration: 0 },
    hitstun: 0,
    invincibleFrames: 120, // 2s at 60fps
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
}

export function updateFighterPhysics(
  fighter: Fighter,
  opponent: Fighter,
  input: InputState,
  stage: Stage,
  particles: Particle[],
  addScreenShake: (intensity: number, frames: number) => void,
  itemWorld: ItemWorld
): { koOccurred: boolean } {
  if (fighter.stocks <= 0) {
    return { koOccurred: false };
  }

  // Handle Respawning
  if (fighter.respawnTimer > 0) {
    fighter.respawnTimer--;
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.isSprinting = false;
    fighter.sprintStamina = SPRINT_STAMINA_MAX;
    fighter.currentAction = 'respawning';
    if (fighter.respawnTimer === 0) {
      fighter.invincibleFrames = 120;
      fighter.currentAction = 'idle';
    }
    return { koOccurred: false };
  }

  if (tryPercentKo(fighter, particles, addScreenShake, opponent)) {
    return { koOccurred: true };
  }

  if (fighter.invincibleFrames > 0) {
    fighter.invincibleFrames--;
  }

  if (fighter.dropThroughTimer > 0) {
    fighter.dropThroughTimer--;
  }

  if (fighter.ledgeCooldownTimer && fighter.ledgeCooldownTimer > 0) {
    fighter.ledgeCooldownTimer--;
  }

  // Decrement Creature Status Timers
  if (fighter.frostbiteTimer && fighter.frostbiteTimer > 0) {
    fighter.frostbiteTimer--;
    if (fighter.frostbiteTimer % 20 === 0) {
      particles.push({
        x: fighter.x + (Math.random() - 0.5) * 20,
        y: fighter.y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -1,
        color: '#bae6fd',
        size: 3,
        alpha: 0.8,
        decay: 0.05,
        type: 'spark',
      });
    }
  }

  if (fighter.burnTimer && fighter.burnTimer > 0) {
    fighter.burnTimer--;
    // Burn tick damage every 35 frames (~0.6s)
    if (fighter.burnTimer % 35 === 0) {
      fighter.damagePercent += 1;
      particles.push({
        x: fighter.x + (Math.random() - 0.5) * 16,
        y: fighter.y - 12,
        vx: (Math.random() - 0.5) * 2,
        vy: -2.5,
        color: '#f97316',
        size: 4.5,
        alpha: 0.9,
        decay: 0.05,
        type: 'spark',
      });
      if (tryPercentKo(fighter, particles, addScreenShake, opponent)) {
        return { koOccurred: true };
      }
    }
  }

  if (fighter.shadowPhaseTimer && fighter.shadowPhaseTimer > 0) {
    fighter.shadowPhaseTimer--;
  }

  if (fighter.lightningKickFlash && fighter.lightningKickFlash > 0) {
    fighter.lightningKickFlash--;
  }

  if (fighter.superFlash && fighter.superFlash > 0) {
    fighter.superFlash--;
  }

  // Soft meter floor so stalling matches still reach READY eventually
  gainSuperMeter(fighter, SUPER_METER_PASSIVE_PER_FRAME);

  // Drunken stumble: tipsy victims wobble and briefly lose control
  if (fighter.tipsyTimer && fighter.tipsyTimer > 0) {
    fighter.tipsyTimer--;
    if (fighter.hitstun <= 0 && fighter.grab.role === 'none' && !fighter.ledgeHang) {
      fighter.vx += Math.sin(fighter.tipsyTimer * 0.55) * 1.35;
      if (fighter.tipsyTimer % 28 === 0) {
        fighter.facing = (fighter.facing === 1 ? -1 : 1) as 1 | -1;
        particles.push({
          x: fighter.x,
          y: fighter.y - 24,
          vx: (Math.random() - 0.5) * 2,
          vy: -1.5,
          color: '#fde047',
          size: 5,
          alpha: 0.9,
          decay: 0.06,
          type: 'spark',
        });
      }
    }
  }

  // Titan Super Armor status during startup of attacks (and entire Titan Crush)
  if (fighter.stats.id === 'titan') {
    const crushActive = fighter.attack?.type === 'super';
    if (
      crushActive ||
      (fighter.attack && fighter.attack.frame < fighter.attack.startupFrames + 8)
    ) {
      fighter.hasSuperArmor = true;
    } else {
      fighter.hasSuperArmor = false;
    }
  }

  // Glacial Lock: hard freeze — no inputs, locked in place
  if (fighter.freezeTimer && fighter.freezeTimer > 0) {
    fighter.freezeTimer--;
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.currentAction = 'hitstun';
    fighter.attack = null;
    if (fighter.freezeTimer % 12 === 0) {
      particles.push({
        x: fighter.x + (Math.random() - 0.5) * 18,
        y: fighter.y + (Math.random() - 0.5) * 28,
        vx: 0,
        vy: -0.6,
        color: '#e0f2fe',
        size: 4,
        alpha: 0.95,
        decay: 0.04,
        type: 'spark',
      });
    }
    // Pin position (skip gravity) so ice lock doesn't drift
    return checkBlastZone(fighter, opponent, stage, particles, addScreenShake);
  }

  const sprintLocked =
    !!fighter.ledgeHang ||
    fighter.hitstun > 0 ||
    !!fighter.attack ||
    fighter.grab.role !== 'none' ||
    fighter.currentAction === 'block';
  updateSprintStamina(
    fighter,
    !sprintLocked &&
      input.sprint &&
      (input.left || input.right) &&
      fighter.isGrounded &&
      !fighter.isCrouching
  );

  // Handle Ledge Hang (holding onto the platform edge)
  if (fighter.ledgeHang) {
    if (fighter.hitstun > 0) {
      // Knocked off ledge
      fighter.ledgeHang = null;
      fighter.currentAction = 'hitstun';
      applyPhysics(fighter, stage, particles, addScreenShake);
      return checkBlastZone(fighter, opponent, stage, particles, addScreenShake);
    }

    fighter.currentAction = 'ledge_hang';
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.actionTimer++;
    fighter.ledgeHang.timer++;

    const { platformX, platformY, platformWidth, side } = fighter.ledgeHang;

    // Pin fighter to the ledge lip
    fighter.x = side === 'left' ? platformX - 18 : platformX + platformWidth + 18;
    fighter.y = platformY + 24;
    fighter.facing = (side === 'left' ? 1 : -1) as 1 | -1;

    // Ledge Recovery Options:
    // 1. Towards stage -> Climb up onto platform
    const wantsClimb = (side === 'left' && input.right) || (side === 'right' && input.left);
    // 2. Up -> Jump vault up onto stage
    const wantsJump = input.up;
    // 3. Attack (Punch or Kick) -> Get-up attack sweeping onto stage
    const wantsAttack = input.punch || input.kick;
    // 4. Down or away -> Drop from ledge
    const wantsDrop = input.down || (side === 'left' && input.left) || (side === 'right' && input.right);

    // Auto-timeout after 4 seconds (stalling deterrent)
    if (fighter.ledgeHang.timer > 240) {
      fighter.ledgeHang = null;
      fighter.ledgeCooldownTimer = 40;
      fighter.currentAction = 'fall';
      fighter.vy = 2;
      return checkBlastZone(fighter, opponent, stage, particles, addScreenShake);
    }

    // Execute Climb Up
    if (wantsClimb) {
      fighter.ledgeHang = null;
      fighter.ledgeCooldownTimer = 35;
      fighter.x = side === 'left' ? platformX + 32 : platformX + platformWidth - 32;
      fighter.y = platformY - fighter.height / 2;
      fighter.vx = 0;
      fighter.vy = 0;
      fighter.isGrounded = true;
      fighter.currentAction = 'idle';
      fighter.doubleJumpsLeft = fighter.stats.doubleJumps;
      fighter.invincibleFrames = 15;
      sound.playJump(false);
      createJumpDust(fighter.x, fighter.y + fighter.height / 2, particles);
      createHitText(fighter.x, fighter.y - 30, 'CLIMBED UP', '#38bdf8', particles);
      return { koOccurred: false };
    }

    // Execute Ledge Jump
    if (wantsJump) {
      fighter.ledgeHang = null;
      fighter.ledgeCooldownTimer = 30;
      fighter.x = side === 'left' ? platformX + 16 : platformX + platformWidth - 16;
      fighter.y = platformY - fighter.height / 2 - 5;
      fighter.vx = side === 'left' ? 4 : -4;
      fighter.vy = -fighter.stats.jumpForce * 1.05;
      fighter.isGrounded = false;
      fighter.currentAction = 'jump';
      fighter.doubleJumpsLeft = fighter.stats.doubleJumps;
      fighter.jumpReleased = false;
      sound.playJump(false);
      createDoubleJumpRing(fighter.x, fighter.y, fighter.stats.color, particles);
      createHitText(fighter.x, fighter.y - 30, 'LEDGE JUMP', '#fbbf24', particles);
      return { koOccurred: false };
    }

    // Execute Ledge Attack
    if (wantsAttack) {
      fighter.ledgeHang = null;
      fighter.ledgeCooldownTimer = 40;
      fighter.x = side === 'left' ? platformX + 32 : platformX + platformWidth - 32;
      fighter.y = platformY - fighter.height / 2;
      fighter.isGrounded = true;
      fighter.doubleJumpsLeft = fighter.stats.doubleJumps;
      fighter.invincibleFrames = 18;
      if (input.kick) {
        startKick(fighter, input);
      } else {
        startPunch(fighter, input, itemWorld, particles, addScreenShake);
      }
      createHitText(fighter.x, fighter.y - 30, 'LEDGE ATTACK', '#ef4444', particles);
      return checkBlastZone(fighter, opponent, stage, particles, addScreenShake);
    }

    // Execute Ledge Drop
    if (wantsDrop) {
      fighter.ledgeHang = null;
      fighter.ledgeCooldownTimer = 25;
      fighter.currentAction = 'fall';
      fighter.vx = side === 'left' ? -2 : 2;
      fighter.vy = 2;
      return checkBlastZone(fighter, opponent, stage, particles, addScreenShake);
    }

    return { koOccurred: false };
  }

  // Update Action Trail
  if (Math.abs(fighter.vx) > 8 || Math.abs(fighter.vy) > 10 || fighter.isSprinting) {
    fighter.trailPositions.unshift({ x: fighter.x, y: fighter.y, alpha: 0.6 });
    if (fighter.trailPositions.length > 5) {
      fighter.trailPositions.pop();
    }
  } else if (fighter.trailPositions.length > 0) {
    fighter.trailPositions.pop();
  }

  // Handle Being Grabbed
  if (fighter.grab.role === 'grabbed') {
    fighter.currentAction = 'grabbed';
    fighter.vx = 0;
    fighter.vy = 0;
    // Position held right in front of opponent
    fighter.x = opponent.x + opponent.facing * 34;
    fighter.y = opponent.y;
    fighter.facing = (opponent.facing * -1) as 1 | -1;

    // Timer countdown + mash breakout (punch/kick/grab inputs shorten the hold)
    fighter.grab.duration--;
    if (input.punch || input.kick || input.grab) {
      fighter.grab.duration -= 4;
    }
    opponent.grab.duration = fighter.grab.duration;
    if (fighter.grab.duration <= 0) {
      // Break free!
      fighter.grab = { role: 'none', duration: 0, maxDuration: 0 };
      opponent.grab = { role: 'none', duration: 0, maxDuration: 0 };
      opponent.attack = null;
      fighter.vx = -opponent.facing * 5;
      opponent.vx = opponent.facing * -4;
      addScreenShake(3, 8);
      createBreakSparks(fighter.x, fighter.y, particles);
    }
    return { koOccurred: false };
  }

  // Handle Hitstun
  if (fighter.hitstun > 0) {
    fighter.hitstun--;
    fighter.currentAction = 'hitstun';
    applyPhysics(fighter, stage, particles, addScreenShake);
    if (checkLedgeGrab(fighter, opponent, stage, particles)) {
      return { koOccurred: false };
    }
    return checkBlastZone(fighter, opponent, stage, particles, addScreenShake);
  }

  // Handle Being Grabber (Holding Opponent)
  if (fighter.grab.role === 'grabber') {
    fighter.currentAction = 'grab';
    if (fighter.isGrounded) {
      fighter.vx = 0;
    } else {
      fighter.vx *= AIR_DRAG;
    }

    // Apply regular physics and gravity so holding in mid-air does not freeze
    applyPhysics(fighter, stage, particles, addScreenShake);

    // Keep grabbed opponent locked in front of grabber as they move / fall
    opponent.x = fighter.x + fighter.facing * 34;
    opponent.y = fighter.y;

    // Check for Directional Throw inputs
    const heldDirection = getThrowDirection(input, fighter.facing);

    if (heldDirection) {
      executeThrow(fighter, opponent, heldDirection, particles, addScreenShake);
      return { koOccurred: false };
    }

    // Pummel check (Space or Kick while grabbing)
    if ((input.punch || input.kick) && fighter.actionTimer % 20 === 0) {
      opponent.damagePercent += 3;
      gainSuperMeter(fighter, SUPER_METER_PUMMEL_DEALT);
      gainSuperMeter(opponent, SUPER_METER_PUMMEL_TAKEN);
      sound.playAttack(fighter.stats.id, input.kick ? 'kick' : 'punch');
      createHitSparks(opponent.x, opponent.y, '#f59e0b', particles, 5);
      addScreenShake(2, 5);
      if (tryPercentKo(opponent, particles, addScreenShake, fighter)) {
        fighter.actionTimer++;
        return { koOccurred: true };
      }
    }

    fighter.actionTimer++;
    return checkBlastZone(fighter, opponent, stage, particles, addScreenShake);
  }

  // Handle Attacks (punch, kick, whiffed grab, directional throws, supers)
  if (fighter.attack) {
    fighter.attack.frame++;
    const atk = fighter.attack;

    if (atk.type === 'super') {
      updateSuperAttack(fighter, opponent, atk, stage, particles, addScreenShake);
    }

    // Active hit frames (Lyla lightning kicks / supers re-check on intervals)
    if (atk.frame >= atk.startupFrames && atk.frame < atk.startupFrames + atk.activeFrames) {
      const frameInActive = atk.frame - atk.startupFrames;
      const isLotusKick = fighter.stats.id === 'lotus' && atk.type === 'kick';
      const isMultiSuper =
        atk.type === 'super' &&
        (fighter.stats.id === 'lotus' || fighter.stats.id === 'monk' || fighter.stats.id === 'zephyr');
      if (isLotusKick || isMultiSuper) {
        const interval = fighter.stats.id === 'lotus' && atk.type === 'super' ? 4 : isLotusKick ? 5 : 6;
        if (frameInActive % interval === 0) {
          atk.hitLanded = false;
          checkAttackHit(fighter, opponent, atk, particles, addScreenShake);
        }
      } else if (!atk.hitLanded) {
        checkAttackHit(fighter, opponent, atk, particles, addScreenShake);
      }
    }

    // Attack finished
    if (atk.frame >= atk.totalFrames) {
      fighter.attack = null;
      fighter.currentAction = fighter.isGrounded ? 'idle' : 'fall';
      if (fighter.stats.id === 'titan') fighter.hasSuperArmor = false;
    }

    // Normal friction on ground, air drift and momentum in air
    if (fighter.isGrounded) {
      fighter.vx *= GROUND_FRICTION;
    } else {
      // In air: maintain aerial momentum and allow responsive air steering
      if (input.left) {
        fighter.vx = Math.max(fighter.vx - 0.35, -fighter.stats.walkSpeed);
      } else if (input.right) {
        fighter.vx = Math.min(fighter.vx + 0.35, fighter.stats.walkSpeed);
      } else {
        fighter.vx *= AIR_DRAG;
      }
      // Allow fast-fall during airborne attacks
      if (input.down && fighter.vy > 0) {
        fighter.vy = Math.min(fighter.vy + 1.2, TERMINAL_VELOCITY);
      }
    }

    // Apply regular gravity, position translation (x += vx, y += vy), and platform collisions
    applyLedgeMagnetism(fighter, stage);
    applyPhysics(fighter, stage, particles, addScreenShake);
    if (checkLedgeGrab(fighter, opponent, stage, particles)) {
      return { koOccurred: false };
    }
    return checkBlastZone(fighter, opponent, stage, particles, addScreenShake);
  }

  // --- Normal Movement & Action Inputs ---

  // Apply subtle ledge magnetism if airborne offstage near ledge
  applyLedgeMagnetism(fighter, stage);

  // Check if airborne fighter snaps to platform ledge before inputs
  if (checkLedgeGrab(fighter, opponent, stage, particles)) {
    return { koOccurred: false };
  }

  // Crouch / Drop-through
  if (input.down && fighter.isGrounded) {
    fighter.isCrouching = true;
    if (fighter.onDropThroughPlatform && input.down) {
      fighter.dropThroughTimer = 18; // ignore platform collision briefly to drop through
      fighter.y += 4;
      fighter.isGrounded = false;
    }
  } else {
    fighter.isCrouching = false;
  }

  // Horizontal movement
  const frostMult = fighter.frostbiteTimer && fighter.frostbiteTimer > 0 ? 0.6 : 1;
  const isBlocking = input.block && !fighter.ledgeHang;
  const blockMult = isBlocking ? 0.28 : 1;
  const targetSpeed =
    (fighter.isSprinting ? fighter.stats.sprintSpeed : fighter.stats.walkSpeed) * frostMult * blockMult;

  if (input.left) {
    fighter.vx = -targetSpeed;
    fighter.facing = -1;
    if (fighter.isGrounded && !isBlocking) {
      fighter.currentAction = fighter.isSprinting ? 'sprint' : 'walk';
    }
  } else if (input.right) {
    fighter.vx = targetSpeed;
    fighter.facing = 1;
    if (fighter.isGrounded && !isBlocking) {
      fighter.currentAction = fighter.isSprinting ? 'sprint' : 'walk';
    }
  } else {
    fighter.vx *= fighter.isGrounded ? GROUND_FRICTION : AIR_DRAG;
    if (fighter.isGrounded && !fighter.isCrouching && !isBlocking) {
      fighter.currentAction = 'idle';
    }
  }

  // Neon Striker: Kinetic Movement charges Static Overdrive
  if (fighter.stats.id === 'striker' && (input.left || input.right)) {
    fighter.staticCharge = Math.min(
      100,
      (fighter.staticCharge || 0) + (fighter.isSprinting ? 1.4 : 0.7)
    );
  }

  // Drunken Monk: Moving builds Tipsy Charge + drunken sway wobble
  if (fighter.stats.id === 'monk' && (input.left || input.right)) {
    fighter.tipsyCharge = Math.min(
      100,
      (fighter.tipsyCharge || 0) + (fighter.isSprinting ? 1.5 : 0.85)
    );
    if (fighter.isGrounded && fighter.hitstun <= 0) {
      fighter.vx += Math.sin((fighter.tipsyCharge || 0) * 0.18) * 0.55;
    }
  }

  // Shadow Shinobi: Sprint initiates Shadow Phase Evasion
  if (fighter.stats.id === 'shinobi' && fighter.isSprinting) {
    if (!fighter.shadowPhaseTimer || fighter.shadowPhaseTimer <= 0) {
      fighter.shadowPhaseTimer = 22;
      sound.playShadowPhase();
      createShadowPhaseSmoke(fighter.x, fighter.y, particles);
    }
  }

  // Jumping
  if (!input.up) {
    fighter.jumpReleased = true;
  }

  if (input.up) {
    if (fighter.isGrounded) {
      fighter.vy = -fighter.stats.jumpForce;
      fighter.isGrounded = false;
      fighter.jumpReleased = false;
      fighter.currentAction = 'jump';
      sound.playJump(false);
      createJumpDust(fighter.x, fighter.y + fighter.height / 2, particles);
    } else if (fighter.jumpReleased && fighter.doubleJumpsLeft > 0) {
      fighter.vy = -fighter.stats.jumpForce * 1.22;
      fighter.doubleJumpsLeft--;
      fighter.jumpReleased = false;
      fighter.currentAction = 'jump';
      sound.playJump(true);
      createDoubleJumpRing(fighter.x, fighter.y, fighter.stats.color, particles);
    }
  }

  // Zephyr Drake: Wing Gliding Mechanics
  if (fighter.stats.id === 'zephyr') {
    if (!fighter.isGrounded) {
      if (input.up || input.sprint) {
        fighter.isGliding = true;
        // Gliding physics: very slow gentle descent + forward aerodynamic momentum
        fighter.vy = Math.min(fighter.vy * 0.74, 1.4);
        fighter.vx += fighter.facing * 0.42;
        if (fighter.wingFlapTick === undefined || fighter.wingFlapTick % 26 === 0) {
          sound.playGlide();
        }
        fighter.wingFlapTick = (fighter.wingFlapTick || 0) + 1;
        if (Math.random() < 0.3) {
          particles.push({
            x: fighter.x - fighter.facing * 20,
            y: fighter.y + (Math.random() - 0.5) * 16,
            vx: -fighter.facing * 3,
            vy: (Math.random() - 0.5) * 1.5,
            color: '#bae6fd',
            size: 4,
            alpha: 0.8,
            decay: 0.05,
            type: 'smoke',
          });
        }
      } else {
        fighter.isGliding = false;
      }
    } else {
      fighter.isGliding = false;
      fighter.wingFlapTick = 0;
    }
  }

  // Fast Fall
  if (input.down && !fighter.isGrounded && fighter.vy > 0) {
    fighter.vy = Math.min(fighter.vy + 1.2, TERMINAL_VELOCITY);
  }

  // Hold B to block punches/kicks in air or on ground (grabs still break through)
  const guarding = input.block && !fighter.ledgeHang;
  if (guarding) {
    fighter.currentAction = 'block';
    fighter.isSprinting = false;
  } else if (input.special && (fighter.superMeter ?? 0) >= SUPER_METER_MAX) {
    startSuper(fighter, opponent, stage, particles, addScreenShake);
  } else if (input.grab) {
    if (fighter.heldWeapon) {
      tossHeldWeapon(fighter, itemWorld, particles);
      fighter.attack = {
        type: 'grab',
        frame: 0,
        totalFrames: 14,
        startupFrames: 0,
        activeFrames: 0,
        hitLanded: true,
      };
      fighter.currentAction = 'punch';
    } else {
      startGrab(fighter, opponent, input, particles, addScreenShake);
    }
  } else if (input.punch) {
    startPunch(fighter, input, itemWorld, particles, addScreenShake);
  } else if (input.kick) {
    startKick(fighter, input);
  }

  // Apply Gravity & Movement
  applyPhysics(fighter, stage, particles, addScreenShake);

  if (checkLedgeGrab(fighter, opponent, stage, particles)) {
    return { koOccurred: false };
  }

  // Check Blast Zone
  return checkBlastZone(fighter, opponent, stage, particles, addScreenShake);
}

function getThrowDirection(input: InputState, facing: 1 | -1): 'up' | 'down' | 'forward' | 'back' | null {
  if (input.up) return 'up';
  if (input.down) return 'down';
  if (facing === 1) {
    if (input.right) return 'forward';
    if (input.left) return 'back';
  } else {
    if (input.left) return 'forward';
    if (input.right) return 'back';
  }
  return null;
}

function startGrab(
  fighter: Fighter,
  opponent: Fighter,
  input: InputState,
  particles: Particle[],
  addScreenShake: (intensity: number, frames: number) => void
) {
  sound.playGrab();
  fighter.attack = {
    type: 'grab',
    frame: 0,
    totalFrames: 24,
    startupFrames: 4,
    activeFrames: 8,
    hitLanded: false,
  };
  fighter.currentAction = 'grab';

  // Check Grab Range
  const grabReach = 65;
  const inHorizontalRange =
    fighter.facing === 1
      ? opponent.x >= fighter.x && opponent.x <= fighter.x + grabReach
      : opponent.x <= fighter.x && opponent.x >= fighter.x - grabReach;

  const inVerticalRange = Math.abs(fighter.y - opponent.y) < 40;

  if (inHorizontalRange && inVerticalRange && opponent.invincibleFrames === 0 && opponent.grab.role === 'none') {
    // Grab Succeeded!
    fighter.grab = {
      role: 'grabber',
      targetIndex: opponent.playerIndex,
      duration: Math.max(90, Math.floor(90 + opponent.damagePercent * 0.8)),
      maxDuration: Math.max(90, Math.floor(90 + opponent.damagePercent * 0.8)),
    };
    opponent.grab = {
      role: 'grabbed',
      targetIndex: fighter.playerIndex,
      duration: fighter.grab.duration,
      maxDuration: fighter.grab.duration,
    };
    opponent.hitstun = 0;
    opponent.attack = null;
    fighter.attack.hitLanded = true;
    addScreenShake(3, 8);
    createGrabRings(opponent.x, opponent.y, particles);

    // If direction was already held during grab initiation, immediately throw!
    const immediateDir = getThrowDirection(input, fighter.facing);
    if (immediateDir) {
      executeThrow(fighter, opponent, immediateDir, particles, addScreenShake);
    }
  }
}

export function executeThrow(
  fighter: Fighter,
  opponent: Fighter,
  direction: 'up' | 'down' | 'forward' | 'back',
  particles: Particle[],
  addScreenShake: (intensity: number, frames: number) => void
) {
  sound.playThrow(direction);

  // Release grab states
  fighter.grab = { role: 'none', duration: 0, maxDuration: 0 };
  opponent.grab = { role: 'none', duration: 0, maxDuration: 0 };

  // Base and scaling calculations based on opponent's damage %
  const dmg = fighter.stats.throwDamage;
  opponent.damagePercent += dmg;
  gainSuperMeter(fighter, dmg * SUPER_METER_GAIN_DEALT);
  gainSuperMeter(opponent, dmg * SUPER_METER_GAIN_TAKEN);
  const pct = opponent.damagePercent;
  const wt = opponent.stats.weight;

  let baseVx = 0;
  let baseVy = 0;

  if (direction === 'forward') {
    fighter.currentAction = 'throw_fwd';
    fighter.attack = {
      type: 'throw_fwd',
      frame: 0,
      totalFrames: 22,
      startupFrames: 0,
      activeFrames: 10,
      hitLanded: true,
    };
    baseVx = fighter.facing * knockbackFromPercent(11, 0.24, pct, wt);
    baseVy = -knockbackFromPercent(5, 0.1, pct, wt);
    createThrowTrail(fighter.x, fighter.y, fighter.facing, 'fwd', particles);
  } else if (direction === 'back') {
    // "toss them the other way"
    fighter.currentAction = 'throw_back';
    fighter.attack = {
      type: 'throw_back',
      frame: 0,
      totalFrames: 24,
      startupFrames: 0,
      activeFrames: 12,
      hitLanded: true,
    };
    // Flip facing after throwing behind
    baseVx = -fighter.facing * knockbackFromPercent(13, 0.26, pct, wt);
    baseVy = -knockbackFromPercent(6, 0.11, pct, wt);
    fighter.facing = (fighter.facing * -1) as 1 | -1;
    createThrowTrail(fighter.x, fighter.y, fighter.facing, 'back', particles);
  } else if (direction === 'up') {
    // "toss them up"
    fighter.currentAction = 'throw_up';
    fighter.attack = {
      type: 'throw_up',
      frame: 0,
      totalFrames: 22,
      startupFrames: 0,
      activeFrames: 10,
      hitLanded: true,
    };
    baseVx = fighter.facing * knockbackFromPercent(1.5, 0.04, pct, wt);
    baseVy = -knockbackFromPercent(14, 0.28, pct, wt);
    createThrowTrail(fighter.x, fighter.y, 0, 'up', particles);
  } else if (direction === 'down') {
    // "toss them down and they'll bounce off"
    fighter.currentAction = 'throw_down';
    fighter.attack = {
      type: 'throw_down',
      frame: 0,
      totalFrames: 26,
      startupFrames: 0,
      activeFrames: 14,
      hitLanded: true,
    };

    // Slam opponent straight down hard
    baseVx = fighter.facing * knockbackFromPercent(1.5, 0.04, pct, wt);
    baseVy = knockbackFromPercent(16, 0.2, pct, wt);
    opponent.bouncedOnGround = false; // will bounce upon contacting stage floor!
    createThrowTrail(fighter.x, fighter.y, 0, 'down', particles);
  }

  opponent.vx = baseVx;
  opponent.vy = baseVy;
  opponent.hitstun = Math.floor(18 + pct * 0.22);
  opponent.currentAction = 'hitstun';

  addScreenShake(direction === 'down' ? 6 : 5, 12);
  createHitText(opponent.x, opponent.y - 30, `${direction.toUpperCase()} THROW!`, '#38bdf8', particles);

  // Titan Heavy Slam bonus & Earthquake Tremor
  if (fighter.stats.id === 'titan') {
    opponent.damagePercent += 4;
    if (direction === 'down') {
      sound.playQuake();
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      createEarthquakeTremor(fighter.x, fighter.y, {} as Stage, opponent, particles, addScreenShake);
    }
  }

  opponent.isGrounded = false;
  tryPercentKo(opponent, particles, addScreenShake, fighter);
}

function startPunch(
  fighter: Fighter,
  input: InputState,
  itemWorld: ItemWorld,
  particles: Particle[],
  addScreenShake: (intensity: number, frames: number) => void
) {
  if (fighter.heldWeapon) {
    useHeldWeapon(fighter, input, itemWorld, particles, addScreenShake);
    return;
  }

  sound.playAttack(fighter.stats.id, 'punch');
  const isMoving = Math.abs(fighter.vx) > 2;
  const isUp = input.up;

  fighter.attack = {
    type: 'punch',
    frame: 0,
    totalFrames: 18,
    startupFrames: 3,
    activeFrames: 6,
    hitLanded: false,
    direction: isUp ? 'up' : isMoving ? 'forward' : 'neutral',
  };
  fighter.currentAction = 'punch';
  if (isMoving && fighter.isGrounded) {
    fighter.vx += fighter.facing * 3; // slight forward dash lunging punch
  }
}

function startKick(fighter: Fighter, input: InputState) {
  sound.playAttack(fighter.stats.id, 'kick');
  const isUp = input.up;
  const isDown = input.down && !fighter.isGrounded;
  const isLotus = fighter.stats.id === 'lotus';

  fighter.attack = {
    type: 'kick',
    frame: 0,
    totalFrames: isLotus ? 28 : 24,
    startupFrames: isLotus ? 3 : 5,
    activeFrames: isLotus ? 16 : 8,
    hitLanded: false,
    hitTargets: [],
    direction: isDown ? 'down' : isUp ? 'up' : 'forward',
  };
  fighter.currentAction = 'kick';
  if (isDown) {
    fighter.vy = 12; // Dive kick / stomp
  }
}

function gainSuperMeter(fighter: Fighter, amount: number) {
  if (fighter.stocks <= 0 || fighter.respawnTimer > 0) return;
  if (fighter.attack?.type === 'super') return;
  fighter.superMeter = Math.min(SUPER_METER_MAX, (fighter.superMeter ?? 0) + amount);
}

function startSuper(
  fighter: Fighter,
  opponent: Fighter,
  stage: Stage,
  particles: Particle[],
  addScreenShake: (intensity: number, frames: number) => void
) {
  if ((fighter.superMeter ?? 0) < SUPER_METER_MAX) return;
  if (fighter.attack || fighter.hitstun > 0 || fighter.grab.role !== 'none' || fighter.ledgeHang) {
    return;
  }

  fighter.superMeter = 0;
  fighter.superFlash = 40;
  const id = fighter.stats.id;
  const name = fighter.stats.superMove.name;
  sound.playSuper(id);
  createHitText(fighter.x, fighter.y - 50, name.toUpperCase() + '!', fighter.stats.secondaryColor, particles);
  addScreenShake(5, 10);

  switch (id) {
    case 'zephyr': {
      // Tempest Dive — rise then cyclone dive
      fighter.isGrounded = false;
      fighter.vy = -15;
      fighter.vx = fighter.facing * 2;
      fighter.isGliding = false;
      fighter.attack = {
        type: 'super',
        frame: 0,
        totalFrames: 52,
        startupFrames: 10,
        activeFrames: 32,
        hitLanded: false,
        hitTargets: [],
        direction: 'down',
        superHitCount: 0,
      };
      break;
    }
    case 'brawler': {
      // Inferno Meteor — fireball dive
      fighter.isGrounded = false;
      fighter.vy = -6;
      fighter.vx = fighter.facing * 5;
      fighter.attack = {
        type: 'super',
        frame: 0,
        totalFrames: 44,
        startupFrames: 6,
        activeFrames: 28,
        hitLanded: false,
        hitTargets: [],
        direction: 'down',
        superHitCount: 0,
      };
      break;
    }
    case 'yeti': {
      // Glacial Lock — ground slam freeze
      fighter.attack = {
        type: 'super',
        frame: 0,
        totalFrames: 36,
        startupFrames: 8,
        activeFrames: 12,
        hitLanded: false,
        hitTargets: [],
        direction: 'down',
        superHitCount: 0,
      };
      if (fighter.isGrounded) {
        fighter.vy = -4;
      } else {
        fighter.vy = 14;
      }
      break;
    }
    case 'striker': {
      // Thunder Rail — lightning dash across stage
      fighter.invincibleFrames = Math.max(fighter.invincibleFrames, 22);
      fighter.vx = fighter.facing * 32;
      fighter.vy = 0;
      fighter.attack = {
        type: 'super',
        frame: 0,
        totalFrames: 28,
        startupFrames: 2,
        activeFrames: 18,
        hitLanded: false,
        hitTargets: [],
        direction: 'forward',
        superHitCount: 0,
      };
      createLightningBurst(fighter.x, fighter.y, particles);
      break;
    }
    case 'titan': {
      // Titan Crush — armored charge into spike
      fighter.hasSuperArmor = true;
      fighter.vx = fighter.facing * 14;
      fighter.attack = {
        type: 'super',
        frame: 0,
        totalFrames: 40,
        startupFrames: 4,
        activeFrames: 22,
        hitLanded: false,
        hitTargets: [],
        direction: 'forward',
        superHitCount: 0,
      };
      break;
    }
    case 'shinobi': {
      // Void Ambush — vanish and reappear behind foe
      createShadowPhaseSmoke(fighter.x, fighter.y, particles);
      const behind = opponent.x - opponent.facing * 48;
      fighter.x = behind;
      fighter.y = opponent.y;
      fighter.facing = opponent.facing;
      fighter.vx = 0;
      fighter.vy = 0;
      fighter.invincibleFrames = Math.max(fighter.invincibleFrames, 14);
      createShadowPhaseSmoke(fighter.x, fighter.y, particles);
      fighter.attack = {
        type: 'super',
        frame: 0,
        totalFrames: 30,
        startupFrames: 4,
        activeFrames: 12,
        hitLanded: false,
        hitTargets: [],
        direction: 'forward',
        superHitCount: 0,
      };
      break;
    }
    case 'monk': {
      // Drunken Whirlwind — multi-hit spin
      fighter.tipsyCharge = 100;
      fighter.attack = {
        type: 'super',
        frame: 0,
        totalFrames: 48,
        startupFrames: 4,
        activeFrames: 36,
        hitLanded: false,
        hitTargets: [],
        direction: 'forward',
        superHitCount: 0,
      };
      break;
    }
    case 'lotus': {
      // Thousand Lotus Kicks — kick storm into rising finisher
      fighter.attack = {
        type: 'super',
        frame: 0,
        totalFrames: 56,
        startupFrames: 3,
        activeFrames: 44,
        hitLanded: false,
        hitTargets: [],
        direction: 'forward',
        superHitCount: 0,
      };
      break;
    }
    default:
      fighter.superMeter = SUPER_METER_MAX;
      return;
  }

      fighter.currentAction = 'super';
}

function updateSuperAttack(
  fighter: Fighter,
  opponent: Fighter,
  atk: AttackState,
  stage: Stage,
  particles: Particle[],
  addScreenShake: (intensity: number, frames: number) => void
) {
  const id = fighter.stats.id;

  switch (id) {
    case 'zephyr': {
      if (atk.frame < atk.startupFrames) {
        fighter.vy = Math.min(fighter.vy, -8);
        if (Math.random() < 0.4) {
          particles.push({
            x: fighter.x - fighter.facing * 16,
            y: fighter.y,
            vx: -fighter.facing * 2,
            vy: 1,
            color: '#bae6fd',
            size: 5,
            alpha: 0.85,
            decay: 0.06,
            type: 'smoke',
          });
        }
      } else {
        fighter.vy = Math.max(fighter.vy, 13);
        fighter.vx = fighter.facing * 5;
        // Vacuum pull
        const dist = Math.hypot(opponent.x - fighter.x, opponent.y - fighter.y);
        if (dist < 140 && opponent.invincibleFrames <= 0 && opponent.grab.role === 'none') {
          opponent.vx += (fighter.x - opponent.x) * 0.09;
          opponent.vy += (fighter.y - opponent.y) * 0.07;
        }
        if (Math.random() < 0.5) {
          createWindGust(fighter.x, fighter.y, fighter.facing, particles);
        }
      }
      break;
    }
    case 'brawler': {
      if (atk.frame >= atk.startupFrames) {
        fighter.vy = Math.max(fighter.vy, 15);
        fighter.vx = fighter.facing * 7;
        if (Math.random() < 0.55) {
          particles.push({
            x: fighter.x,
            y: fighter.y,
            vx: (Math.random() - 0.5) * 4,
            vy: -Math.random() * 4,
            color: Math.random() > 0.5 ? '#ef4444' : '#f97316',
            size: 5 + Math.random() * 4,
            alpha: 1,
            decay: 0.07,
            type: 'spark',
          });
        }
        // Detonate on landing once
        if (fighter.isGrounded && (atk.superHitCount ?? 0) === 0) {
          atk.superHitCount = 1;
          createFireExplosion(fighter.x, fighter.y, particles, addScreenShake);
          sound.playFireBurst();
          const dist = Math.hypot(opponent.x - fighter.x, opponent.y - fighter.y);
          if (dist < 110 && opponent.invincibleFrames <= 0) {
            atk.hitLanded = false;
            checkAttackHit(fighter, opponent, atk, particles, addScreenShake);
          }
        }
      }
      break;
    }
    case 'yeti': {
      if (atk.frame === atk.startupFrames) {
        fighter.vy = 16;
        sound.playFreeze();
        createIceSpikes(fighter.x, fighter.y + 20, fighter.facing, particles, addScreenShake);
        addScreenShake(8, 14);
      }
      break;
    }
    case 'striker': {
      if (atk.frame <= atk.startupFrames + atk.activeFrames) {
        fighter.vx = fighter.facing * 28;
        fighter.vy = 0;
        // Clamp inside blast zone soft bounds
        const minX = stage.blastZone.left + 80;
        const maxX = stage.blastZone.right - 80;
        if (fighter.x < minX) {
          fighter.x = minX;
          fighter.vx = 0;
        }
        if (fighter.x > maxX) {
          fighter.x = maxX;
          fighter.vx = 0;
        }
        if (atk.frame % 3 === 0) {
          particles.push({
            x: fighter.x - fighter.facing * 20,
            y: fighter.y + (Math.random() - 0.5) * 20,
            vx: -fighter.facing * 6,
            vy: (Math.random() - 0.5) * 3,
            color: '#67e8f9',
            size: 4,
            alpha: 1,
            decay: 0.08,
            type: 'lightning',
          });
        }
      }
      break;
    }
    case 'titan': {
      if (!atk.hitLanded) {
        fighter.vx = fighter.facing * 12;
        fighter.hasSuperArmor = true;
      } else {
        fighter.vx *= 0.85;
      }
      break;
    }
    case 'shinobi': {
      // Stay glued near backstab angle briefly
      if (atk.frame < atk.startupFrames + 6) {
        fighter.x = opponent.x - opponent.facing * 44;
        fighter.y = opponent.y;
        fighter.facing = opponent.facing;
      }
      break;
    }
    case 'monk': {
      fighter.vx = fighter.facing * (fighter.isGrounded ? 3.5 : 2.5);
      fighter.facing = (Math.floor(atk.frame / 6) % 2 === 0 ? 1 : -1) as 1 | -1;
      if (atk.frame % 6 === 0) {
        createMonkeySpinBurst(fighter.x, fighter.y, fighter.facing, particles);
      }
      // Soften own knockback while spinning
      if (fighter.hitstun > 0) {
        fighter.vx *= 0.5;
        fighter.vy *= 0.5;
      }
      break;
    }
    case 'lotus': {
      fighter.vx = fighter.facing * 2.2;
      // Final rising finisher in last third of active window
      const activeEnd = atk.startupFrames + atk.activeFrames;
      if (atk.frame > activeEnd - 12) {
        atk.direction = 'up';
        fighter.vy = -8;
      }
      if (atk.frame % 4 === 0) {
        createLightningKickSparks(fighter.x + fighter.facing * 20, fighter.y, fighter.facing, particles);
      }
      break;
    }
    default:
      break;
  }
}

function isFacingBlock(defender: Fighter, threatX: number): boolean {
  if (defender.currentAction !== 'block') return false;
  const towardThreat: 1 | -1 = threatX >= defender.x ? 1 : -1;
  return defender.facing === towardThreat;
}

function resolveBlockedHit(
  attacker: Fighter,
  defender: Fighter,
  particles: Particle[],
  addScreenShake: (intensity: number, frames: number) => void
) {
  sound.playBlock();
  defender.vx = attacker.facing * -1.2;
  attacker.vx = attacker.facing * -2.4;
  addScreenShake(2, 5);
  createBreakSparks(defender.x + defender.facing * 18, defender.y - 4, particles);
  createHitText(defender.x, defender.y - 32, 'BLOCK!', '#38bdf8', particles);
}

function checkAttackHit(
  attacker: Fighter,
  defender: Fighter,
  atk: AttackState,
  particles: Particle[],
  addScreenShake: (intensity: number, frames: number) => void
) {
  if (defender.invincibleFrames > 0 || defender.grab.role === 'grabbed') return;

  const weaponDef = atk.weaponKind ? ITEM_DEFS[atk.weaponKind] : null;
  const isWeapon = !!weaponDef && weaponDef.category === 'melee';
  const isSuper = atk.type === 'super';

  // Hitbox detection (supers get a wider reach)
  const reach = isSuper
    ? attacker.stats.id === 'striker'
      ? 70
      : attacker.stats.id === 'yeti'
        ? 95
        : 62
    : isWeapon
      ? weaponDef.reach
      : atk.type === 'kick'
        ? 50
        : 48;
  const hitYOffset = atk.direction === 'up' ? -40 : atk.direction === 'down' ? 40 : 0;
  const hitXOffset = atk.direction === 'up' || atk.direction === 'down' ? 0 : attacker.facing * reach;

  const hitbox = {
    x: attacker.x + hitXOffset,
    y: attacker.y + hitYOffset,
    radius: isSuper ? 38 : isWeapon ? weaponDef.hitRadius : 30,
  };

  const dist = Math.hypot(hitbox.x - defender.x, hitbox.y - defender.y);

  if (dist < hitbox.radius + defender.width / 2) {
    atk.hitLanded = true;
    defender.freezeTimer = 0;

    // Punches, kicks, and weapon swings are blocked; grabs/supers still connect through guard
    const isBlockable = atk.type === 'punch' || atk.type === 'kick';
    if (isBlockable && isFacingBlock(defender, attacker.x)) {
      resolveBlockedHit(attacker, defender, particles, addScreenShake);
      return;
    }

    const isKick = atk.type === 'kick';
    if (!atk.hitTargets) atk.hitTargets = [];
    const isFollowUpHit = atk.hitTargets.includes(defender.playerIndex);
    if (!isFollowUpHit) atk.hitTargets.push(defender.playerIndex);
    atk.superHitCount = (atk.superHitCount ?? 0) + 1;

    let baseDamage = isSuper
      ? getSuperHitDamage(attacker.stats.id, atk.superHitCount ?? 1)
      : isWeapon
        ? weaponDef.damage
        : isKick
          ? attacker.stats.kickDamage
          : attacker.stats.punchDamage;
    // Lyla lightning kick follow-ups chip for a fraction of full kick damage
    if (isFollowUpHit && attacker.stats.id === 'lotus' && isKick) {
      baseDamage = Math.max(2, Math.ceil(baseDamage * 0.32));
    }
    defender.damagePercent += baseDamage;
    gainSuperMeter(attacker, baseDamage * SUPER_METER_GAIN_DEALT);
    gainSuperMeter(defender, baseDamage * SUPER_METER_GAIN_TAKEN);

    const pct = defender.damagePercent;
    const wt = defender.stats.weight;

    let launchVx = 0;
    let launchVy = 0;

    if (isSuper) {
      const launch = getSuperLaunch(attacker, defender, atk, pct, wt);
      launchVx = launch.vx;
      launchVy = launch.vy;
    } else if (atk.direction === 'up') {
      launchVx = attacker.facing * knockbackFromPercent(isWeapon ? 2.5 : 2, isWeapon ? 0.06 : 0.05, pct, wt);
      launchVy = -knockbackFromPercent(
        isWeapon ? weaponDef.knockbackBase : isKick ? 11 : 9,
        isWeapon ? weaponDef.knockbackGrowth : isKick ? 0.26 : 0.22,
        pct,
        wt
      );
    } else if (atk.direction === 'down') {
      // Meteor stomp or dive — stronger send at high percents
      launchVx = attacker.facing * knockbackFromPercent(2.5, 0.06, pct, wt);
      launchVy = knockbackFromPercent(
        isWeapon ? weaponDef.knockbackBase * 0.85 : isKick ? 12 : 10,
        isWeapon ? weaponDef.knockbackGrowth : isKick ? 0.2 : 0.16,
        pct,
        wt
      );
      defender.bouncedOnGround = false;
    } else {
      launchVx = attacker.facing * knockbackFromPercent(
        isWeapon ? weaponDef.knockbackBase : isKick ? 8 : 6,
        isWeapon ? weaponDef.knockbackGrowth : isKick ? 0.26 : 0.2,
        pct,
        wt
      );
      launchVy = -knockbackFromPercent(
        isWeapon ? weaponDef.knockbackBase * 0.35 : isKick ? 5 : 4,
        isWeapon ? weaponDef.knockbackGrowth * 0.45 : isKick ? 0.12 : 0.09,
        pct,
        wt
      );
    }

    defender.vx = launchVx;
    defender.vy = launchVy;
    defender.hitstun = Math.floor((isSuper ? 22 : 16) + pct * (isSuper ? 0.28 : 0.2));
    defender.currentAction = 'hitstun';

    const shakeVal = Math.min(14, Math.floor((isSuper ? 6 : 4) + pct * 0.06));
    addScreenShake(shakeVal, Math.floor(8 + pct * 0.08));

    if (isSuper) {
      createHitSparks(defender.x, defender.y, attacker.stats.secondaryColor, particles, 18);
      createHitText(
        defender.x,
        defender.y - 42,
        attacker.stats.superMove.name.toUpperCase() + '!',
        attacker.stats.secondaryColor,
        particles
      );
    } else if (isWeapon) {
      createHitSparks(defender.x, defender.y, weaponDef.glowColor, particles, 16);
      createHitText(defender.x, defender.y - 42, weaponDef.name.toUpperCase(), weaponDef.glowColor, particles);
    } else if (isKick) {
      sound.playAttack(attacker.stats.id, 'kick');
      createHitSparks(defender.x, defender.y, '#f43f5e', particles, 14);
    } else {
      sound.playAttack(attacker.stats.id, 'punch');
      createHitSparks(defender.x, defender.y, '#fbbf24', particles, 8);
    }

    createHitText(
      defender.x,
      defender.y - 25,
      `${baseDamage}%`,
      isSuper
        ? attacker.stats.color
        : isWeapon
          ? weaponDef.color
          : isKick
            ? '#ef4444'
            : '#f59e0b',
      particles
    );

    // ==================================================
    // CREATURE SPECIAL ABILITIES ON HIT RESOLUTION
    // ==================================================
    const aId = attacker.stats.id;
    const dId = defender.stats.id;

    // 1. Gilded Titan: Super Armor Absorption for Defender
    if (dId === 'titan' && defender.hasSuperArmor && !isSuper) {
      defender.hitstun = 0;
      defender.vx *= 0.15;
      defender.vy = 0;
      createHitText(defender.x, defender.y - 45, 'SUPER ARMOR!', '#fbbf24', particles);
      createHitSparks(defender.x, defender.y, '#fbbf24', particles, 8);
    }

    if (isSuper) {
      applySuperHitEffects(attacker, defender, atk, particles, addScreenShake);
    } else {
    // 2. Zephyr Drake: Gale Wind Gust
    if (aId === 'zephyr') {
      defender.vx += attacker.facing * 3.2;
      createWindGust(defender.x, defender.y, attacker.facing, particles);
      createHitText(defender.x, defender.y - 45, 'WIND GUST!', '#38bdf8', particles);
      sound.playGlide();
    }

    // 3. Blaze Brawler: Ignite Burn Over Time & Explosive Stomp
    if (aId === 'brawler') {
      defender.burnTimer = 150;
      sound.playFireBurst();
      createHitText(defender.x, defender.y - 45, 'IGNITE!', '#f97316', particles);
      if (atk.direction === 'down') {
        createFireExplosion(defender.x, defender.y, particles, addScreenShake);
      }
    }

    // 4. Glacial Yeti: Frostbite 3-Second Speed Slow
    if (aId === 'yeti') {
      defender.frostbiteTimer = 180;
      sound.playFreeze();
      createIceSpikes(defender.x, defender.y, attacker.facing, particles, addScreenShake);
      createHitText(defender.x, defender.y - 45, 'FROSTBITE SLOW!', '#38bdf8', particles);
    }

    // 5. Neon Striker: Static Overdrive Chain Lightning Discharge
    if (aId === 'striker') {
      if (attacker.staticCharge && attacker.staticCharge >= 100) {
        attacker.staticCharge = 0;
        defender.damagePercent += 6;
        defender.hitstun += 18;
        sound.playLightning();
        createLightningBurst(defender.x, defender.y, particles);
        createHitText(defender.x, defender.y - 45, 'STATIC DISCHARGE!', '#67e8f9', particles);
        addScreenShake(7, 12);
      }
    }

    // 6. Shadow Shinobi: Critical Backstab Strike
    if (aId === 'shinobi') {
      const isBackstab = defender.facing === attacker.facing;
      if (isBackstab) {
        defender.damagePercent += 5;
        defender.vx *= 1.45;
        sound.playShadowPhase();
        createShadowPhaseSmoke(defender.x, defender.y, particles);
        createHitText(defender.x, defender.y - 45, 'BACKSTAB CRIT!', '#ec4899', particles);
        addScreenShake(6, 10);
      }
    }

    // 7. Gilded Titan: Earthquake Tremor on Down Attack
    if (aId === 'titan' && atk.direction === 'down') {
      sound.playQuake();
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      createEarthquakeTremor(attacker.x, attacker.y, {} as Stage, defender, particles, addScreenShake);
    }

    // 8. Drunken Monk: Tipsy Charge Monkey Spin + stumble
    if (aId === 'monk') {
      defender.tipsyTimer = Math.max(defender.tipsyTimer || 0, 120);
      if (attacker.tipsyCharge && attacker.tipsyCharge >= 100) {
        attacker.tipsyCharge = 0;
        defender.damagePercent += 5;
        defender.vx *= 1.35;
        defender.vy -= 3.5;
        defender.hitstun += 10;
        sound.playMonkeySpin();
        createMonkeySpinBurst(defender.x, defender.y, attacker.facing, particles);
        createHitText(defender.x, defender.y - 45, 'MONKEY SPIN!', '#facc15', particles);
        addScreenShake(6, 12);
      } else {
        createHitText(defender.x, defender.y - 45, 'TIPSY!', '#a3e635', particles);
      }
    }

    // 9. Lotus Lyla: Lightning Kick Barrage
    if (aId === 'lotus' && isKick) {
      attacker.lightningKickFlash = 10;
      defender.hitstun += isFollowUpHit ? 4 : 6;
      if (isFollowUpHit) {
        defender.vx *= 0.55;
        defender.vy *= 0.7;
      }
      sound.playLightningKick();
      createLightningKickSparks(defender.x, defender.y, attacker.facing, particles);
      createHitText(
        defender.x,
        defender.y - 45,
        isFollowUpHit ? 'LIGHTNING HIT!' : 'LIGHTNING KICK!',
        '#60a5fa',
        particles
      );
    }

    // Drunken sway softens knockback when Aaron is well charged
    if (dId === 'monk' && defender.tipsyCharge && defender.tipsyCharge >= 50) {
      defender.vx *= 0.62;
      defender.vy *= 0.7;
      createHitText(defender.x, defender.y - 58, 'DRUNKEN SWAY!', '#84cc16', particles);
    }
    } // end non-super specials

    if (tryPercentKo(defender, particles, addScreenShake, attacker)) {
      return;
    }

    if (defender.hitstun > 0) {
      defender.isGrounded = false;
    }
  }
}

function getSuperHitDamage(id: FighterId, hitCount: number): number {
  switch (id) {
    case 'zephyr':
      return hitCount === 1 ? 14 : 6;
    case 'brawler':
      return 18;
    case 'yeti':
      return 12;
    case 'striker':
      return 16;
    case 'titan':
      return 20;
    case 'shinobi':
      return 22;
    case 'monk':
      return hitCount <= 1 ? 5 : 4;
    case 'lotus':
      return hitCount <= 1 ? 4 : hitCount >= 8 ? 12 : 3;
    default:
      return 12;
  }
}

function getSuperLaunch(
  attacker: Fighter,
  defender: Fighter,
  atk: AttackState,
  pct: number,
  wt: number
): { vx: number; vy: number } {
  const id = attacker.stats.id;
  switch (id) {
    case 'zephyr':
      return {
        vx: attacker.facing * knockbackFromPercent(12, 0.28, pct, wt),
        vy: -knockbackFromPercent(10, 0.22, pct, wt),
      };
    case 'brawler':
      return {
        vx: attacker.facing * knockbackFromPercent(10, 0.24, pct, wt),
        vy: -knockbackFromPercent(9, 0.2, pct, wt),
      };
    case 'yeti':
      // Lock in place — freeze handles stun
      return { vx: 0, vy: 0 };
    case 'striker':
      return {
        vx: attacker.facing * knockbackFromPercent(14, 0.3, pct, wt),
        vy: -knockbackFromPercent(6, 0.14, pct, wt),
      };
    case 'titan':
      return {
        vx: attacker.facing * knockbackFromPercent(4, 0.08, pct, wt),
        vy: knockbackFromPercent(18, 0.22, pct, wt),
      };
    case 'shinobi':
      return {
        vx: attacker.facing * knockbackFromPercent(13, 0.32, pct, wt),
        vy: -knockbackFromPercent(8, 0.18, pct, wt),
      };
    case 'monk':
      return {
        vx: attacker.facing * knockbackFromPercent(5, 0.12, pct, wt) * (atk.superHitCount && atk.superHitCount > 4 ? 1.6 : 0.7),
        vy: -knockbackFromPercent(4, 0.1, pct, wt),
      };
    case 'lotus':
      if (atk.direction === 'up') {
        return {
          vx: attacker.facing * knockbackFromPercent(3, 0.08, pct, wt),
          vy: -knockbackFromPercent(16, 0.3, pct, wt),
        };
      }
      return {
        vx: attacker.facing * knockbackFromPercent(3, 0.06, pct, wt),
        vy: -knockbackFromPercent(2, 0.04, pct, wt),
      };
    default:
      return {
        vx: attacker.facing * knockbackFromPercent(8, 0.2, pct, wt),
        vy: -knockbackFromPercent(6, 0.14, pct, wt),
      };
  }
}

function applySuperHitEffects(
  attacker: Fighter,
  defender: Fighter,
  atk: AttackState,
  particles: Particle[],
  addScreenShake: (intensity: number, frames: number) => void
) {
  const id = attacker.stats.id;
  switch (id) {
    case 'zephyr':
      defender.vx += attacker.facing * 5;
      createWindGust(defender.x, defender.y, attacker.facing, particles);
      sound.playGlide();
      break;
    case 'brawler':
      defender.burnTimer = 210;
      createFireExplosion(defender.x, defender.y, particles, addScreenShake);
      sound.playFireBurst();
      break;
    case 'yeti':
      defender.freezeTimer = 96; // ~1.6s hard freeze
      defender.frostbiteTimer = 200;
      defender.hitstun = 0;
      defender.vx = 0;
      defender.vy = 0;
      defender.currentAction = 'hitstun';
      createIceSpikes(defender.x, defender.y, attacker.facing, particles, addScreenShake);
      sound.playFreeze();
      createHitText(defender.x, defender.y - 55, 'GLACIAL LOCK!', '#e0f2fe', particles);
      addScreenShake(9, 16);
      break;
    case 'striker':
      defender.hitstun += 20;
      createLightningBurst(defender.x, defender.y, particles);
      sound.playLightning();
      createHitText(defender.x, defender.y - 55, 'THUNDER RAIL!', '#67e8f9', particles);
      break;
    case 'titan':
      defender.bouncedOnGround = false;
      sound.playQuake();
      createEarthquakeTremor(attacker.x, attacker.y, {} as Stage, defender, particles, addScreenShake);
      createHitText(defender.x, defender.y - 55, 'TITAN CRUSH!', '#fbbf24', particles);
      // End charge early after connect
      if (attacker.attack) {
        attacker.attack.frame = Math.max(attacker.attack.frame, attacker.attack.totalFrames - 8);
      }
      break;
    case 'shinobi':
      defender.damagePercent += 8;
      defender.vx *= 1.55;
      createShadowPhaseSmoke(defender.x, defender.y, particles);
      sound.playShadowPhase();
      createHitText(defender.x, defender.y - 55, 'VOID AMBUSH!', '#ec4899', particles);
      addScreenShake(8, 14);
      break;
    case 'monk':
      defender.tipsyTimer = Math.max(defender.tipsyTimer || 0, 160);
      createMonkeySpinBurst(defender.x, defender.y, attacker.facing, particles);
      sound.playMonkeySpin();
      if ((atk.superHitCount ?? 0) >= 5) {
        createHitText(defender.x, defender.y - 55, 'WHIRLWIND!', '#facc15', particles);
      }
      break;
    case 'lotus':
      attacker.lightningKickFlash = 12;
      defender.hitstun += atk.direction === 'up' ? 14 : 5;
      createLightningKickSparks(defender.x, defender.y, attacker.facing, particles);
      sound.playLightningKick();
      if (atk.direction === 'up') {
        createHitText(defender.x, defender.y - 55, 'LOTUS FINISHER!', '#f472b6', particles);
        addScreenShake(8, 14);
      }
      break;
    default:
      break;
  }
}

// Proactive recovery assist: subtle magnetism toward ledge when falling offstage TO THE SIDE or UNDER
export function applyLedgeMagnetism(fighter: Fighter, stage: Stage) {
  if (
    fighter.isGrounded ||
    fighter.ledgeHang ||
    fighter.grab.role !== 'none' ||
    (fighter.ledgeCooldownTimer !== undefined && fighter.ledgeCooldownTimer > 0) ||
    fighter.currentAction === 'respawning'
  ) {
    return;
  }

  for (const plat of stage.platforms) {
    if (plat.isDropThrough) continue;

    const platLeft = plat.x;
    const platRight = plat.x + plat.width;
    const platTop = plat.y;

    // Left Ledge magnetism: only when already close off-stage (dLeftX <= -6) and level/below ledge
    const dLeftX = fighter.x - platLeft;
    const dLeftY = fighter.y - platTop;
    if (dLeftX >= -200 && dLeftX <= -6 && dLeftY >= -14 && dLeftY <= 195) {
      if (fighter.vx < 4.0) {
        fighter.vx += 0.45;
      }
      if (dLeftY > 20 && fighter.vy > 0.5) {
        fighter.vy = Math.max(fighter.vy - 0.45, -4);
      }
    }

    // Right Ledge magnetism: only when already close off-stage (dRightX >= 6) and level/below ledge
    const dRightX = fighter.x - platRight;
    const dRightY = fighter.y - platTop;
    if (dRightX <= 200 && dRightX >= 6 && dRightY >= -14 && dRightY <= 195) {
      if (fighter.vx > -4.0) {
        fighter.vx -= 0.45;
      }
      if (dRightY > 20 && fighter.vy > 0.5) {
        fighter.vy = Math.max(fighter.vy - 0.45, -4);
      }
    }
  }
}

export function checkLedgeGrab(
  fighter: Fighter,
  opponent: Fighter,
  stage: Stage,
  particles: Particle[]
): boolean {
  if (
    fighter.isGrounded ||
    fighter.hitstun > 15 || // Allow snapping if hitstun is ending or tumbling
    fighter.grab.role !== 'none' ||
    fighter.ledgeHang ||
    (fighter.ledgeCooldownTimer !== undefined && fighter.ledgeCooldownTimer > 0) ||
    fighter.currentAction === 'respawning'
  ) {
    return false;
  }

  for (const plat of stage.platforms) {
    if (plat.isDropThrough) continue; // Only solid platforms

    const platLeft = plat.x;
    const platRight = plat.x + plat.width;
    const platTop = plat.y;

    // --- Left Ledge corner: (platLeft, platTop) ---
    const distLeftX = fighter.x - platLeft;
    const distLeftY = fighter.y - platTop;

    // Never grab if fighter is on top of the stage surface (inward and above)
    const isOnStageSurfaceLeft = distLeftX > 2 && distLeftY < 12;

    // Grab from farther out than the original snap (85/130) so recovery can reach the lip.
    // 1) TO THE SIDE (offstage left)
    // 2) UNDER the corner
    const isToSideLeft = distLeftX >= -100 && distLeftX <= 2 && distLeftY >= -16 && distLeftY <= 150;
    const isUnderLeft = distLeftY >= 6 && distLeftY <= 150 && distLeftX >= -58 && distLeftX <= 24;

    if (!isOnStageSurfaceLeft && (isToSideLeft || isUnderLeft)) {
      fighter.hitstun = 0;

      // Ledge trump: if opponent is on this same left ledge, knock them off
      if (
        opponent.ledgeHang &&
        opponent.ledgeHang.platformX === platLeft &&
        opponent.ledgeHang.side === 'left'
      ) {
        opponent.ledgeHang = null;
        opponent.ledgeCooldownTimer = 40;
        opponent.currentAction = 'fall';
        opponent.vx = -4;
        opponent.vy = 1;
      }

      fighter.ledgeHang = {
        platformX: platLeft,
        platformY: platTop,
        platformWidth: plat.width,
        side: 'left',
        timer: 0,
      };
      fighter.currentAction = 'ledge_hang';
      fighter.actionTimer = 0;
      fighter.vx = 0;
      fighter.vy = 0;
      fighter.attack = null;
      fighter.isGrounded = false;
      fighter.doubleJumpsLeft = fighter.stats.doubleJumps; // Restores all double jumps!
      fighter.invincibleFrames = 60; // 1 full second of invincibility
      fighter.x = platLeft - 18;
      fighter.y = platTop + 24;
      fighter.facing = 1;

      sound.playLedgeGrab();
      createGrabRings(platLeft, platTop, particles);
      createHitText(platLeft, platTop - 25, 'LEDGE SNAP!', '#38bdf8', particles);
      return true;
    }

    // --- Right Ledge corner: (platRight, platTop) ---
    const distRightX = fighter.x - platRight;
    const distRightY = fighter.y - platTop;

    // Never grab if fighter is on top of the stage surface (inward and above)
    const isOnStageSurfaceRight = distRightX < -2 && distRightY < 12;

    // Grab when close to the lip (forgiving, but not a long-range snap):
    // 1) TO THE SIDE (offstage right)
    // 2) UNDER the corner, still near the lip
    const isToSideRight = distRightX >= -2 && distRightX <= 52 && distRightY >= -12 && distRightY <= 68;
    const isUnderRight = distRightY >= 6 && distRightY <= 68 && distRightX >= -12 && distRightX <= 28;

    if (!isOnStageSurfaceRight && (isToSideRight || isUnderRight)) {
      fighter.hitstun = 0;

      // Ledge trump: if opponent is on this same right ledge, knock them off
      if (
        opponent.ledgeHang &&
        opponent.ledgeHang.platformX === platLeft &&
        opponent.ledgeHang.side === 'right'
      ) {
        opponent.ledgeHang = null;
        opponent.ledgeCooldownTimer = 40;
        opponent.currentAction = 'fall';
        opponent.vx = 4;
        opponent.vy = 1;
      }

      fighter.ledgeHang = {
        platformX: platLeft,
        platformY: platTop,
        platformWidth: plat.width,
        side: 'right',
        timer: 0,
      };
      fighter.currentAction = 'ledge_hang';
      fighter.actionTimer = 0;
      fighter.vx = 0;
      fighter.vy = 0;
      fighter.attack = null;
      fighter.isGrounded = false;
      fighter.doubleJumpsLeft = fighter.stats.doubleJumps; // Restores all double jumps!
      fighter.invincibleFrames = 60; // 1 full second of invincibility
      fighter.x = platRight + 18;
      fighter.y = platTop + 24;
      fighter.facing = -1;

      sound.playLedgeGrab();
      createGrabRings(platRight, platTop, particles);
      createHitText(platRight, platTop - 25, 'LEDGE SNAP!', '#38bdf8', particles);
      return true;
    }
  }

  return false;
}

function applyPhysics(
  fighter: Fighter,
  stage: Stage,
  particles: Particle[],
  addScreenShake: (intensity: number, frames: number) => void
) {
  if (!fighter.isGrounded) {
    fighter.vy += GRAVITY;
    fighter.vy = Math.min(fighter.vy, TERMINAL_VELOCITY);
  }

  fighter.x += fighter.vx;
  fighter.y += fighter.vy;

  resolvePlatformCollisions(fighter, stage, particles, addScreenShake);
}

function resolvePlatformCollisions(
  fighter: Fighter,
  stage: Stage,
  particles: Particle[],
  addScreenShake: (intensity: number, frames: number) => void
) {
  fighter.isGrounded = false;
  fighter.onDropThroughPlatform = false;

  const feetY = fighter.y + fighter.height / 2;
  const prevFeetY = feetY - fighter.vy;

  for (const plat of stage.platforms) {
    const platLeft = plat.x;
    const platRight = plat.x + plat.width;
    const platTop = plat.y;
    const platBottom = plat.y + plat.height;

    // Horizontal overlap check
    const withinHorizontal =
      fighter.x + fighter.width / 2 > platLeft && fighter.x - fighter.width / 2 < platRight;

    if (!withinHorizontal) continue;

    if (plat.isDropThrough) {
      // Pass-through platform (can jump through from underneath, land on top)
      if (fighter.dropThroughTimer > 0) continue;

      if (fighter.vy >= 0 && prevFeetY <= platTop + 8 && feetY >= platTop) {
        // Land on top
        handlePlatformLanding(fighter, platTop, true, particles, addScreenShake);
        return;
      }
    } else {
      // Solid Platform
      if (fighter.vy >= 0 && prevFeetY <= platTop + 14 && feetY >= platTop) {
        handlePlatformLanding(fighter, platTop, false, particles, addScreenShake);
        return;
      }
      // Wall and ceiling collisions for solid platform
      if (fighter.y < platBottom && fighter.y > platTop) {
        if (fighter.x < platLeft && fighter.vx > 0) {
          fighter.x = platLeft - fighter.width / 2;
          fighter.vx = 0;
        } else if (fighter.x > platRight && fighter.vx < 0) {
          fighter.x = platRight + fighter.width / 2;
          fighter.vx = 0;
        }
      }
      if (fighter.vy < 0 && fighter.y - fighter.height / 2 <= platBottom && fighter.y > platBottom - 16) {
        fighter.y = platBottom + fighter.height / 2;
        fighter.vy = 0;
      }
    }
  }
}

/**
 * Soft body collision between fighters. Prevents nesting / "stuck following"
 * when players walk into each other. Skipped during grabs, ledge hangs, and respawn.
 *
 * Smash-style: only separate on X. Vertical solid collision made one fighter
 * perch on the other with vy zeroed every frame — they looked stuck on top.
 */
export function resolveFighterCollision(a: Fighter, b: Fighter, stage: Stage) {
  if (a.stocks <= 0 || b.stocks <= 0) return;
  if (a.respawnTimer > 0 || b.respawnTimer > 0) return;
  if (a.grab.role !== 'none' || b.grab.role !== 'none') return;
  if (a.ledgeHang || b.ledgeHang) return;

  // Slightly smaller than full sprite so grabs/attacks still connect at close range
  const scale = 0.7;
  const halfW = (a.width * scale + b.width * scale) / 2;
  const halfH = (a.height * scale + b.height * scale) / 2;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const overlapX = halfW - Math.abs(dx);
  const overlapY = halfH - Math.abs(dy);

  if (overlapX <= 0 || overlapY <= 0) return;

  const weightA = a.stats.weight || 1;
  const weightB = b.stats.weight || 1;
  const totalWeight = weightA + weightB;
  const pushA = weightB / totalWeight;
  const pushB = weightA / totalWeight;

  // Always push apart horizontally. If nearly centered on top of each other
  // (tiny dx), pick a slide-off side from velocity / facing so they don't nest.
  let dir = Math.sign(dx);
  if (dir === 0) {
    const relVx = a.vx - b.vx;
    if (Math.abs(relVx) > 0.5) dir = relVx >= 0 ? -1 : 1;
    else dir = a.facing || 1;
  }

  // Stacked: deeper X shove so the upper fighter slides off instead of perching
  const stacked = Math.abs(dy) > a.height * 0.28;
  const sep = overlapX + (stacked ? 2.5 : 0.5);

  a.x -= dir * sep * pushA;
  b.x += dir * sep * pushB;

  // Cancel only inward walk velocity when side-by-side — never touch vy, and
  // don't kill horizontal speed while sliding off a stack (that caused the stick).
  if (!stacked && a.hitstun === 0 && b.hitstun === 0) {
    if (dir > 0) {
      if (a.vx > 0) a.vx = 0;
      if (b.vx < 0) b.vx = 0;
    } else {
      if (a.vx < 0) a.vx = 0;
      if (b.vx > 0) b.vx = 0;
    }
  } else if (stacked && a.hitstun === 0 && b.hitstun === 0) {
    // Nudge the upper fighter off so gravity can finish separating them
    const upper = a.y < b.y ? a : b;
    const lower = a.y < b.y ? b : a;
    const slideDir = upper.x >= lower.x ? 1 : -1;
    upper.vx += slideDir * 1.8;
    if (upper.vy > 0) upper.vy *= 0.85;
  }

  // Re-snap to platforms so a shove can't bury feet into the stage
  resolvePlatformCollisions(a, stage, [], () => {});
  resolvePlatformCollisions(b, stage, [], () => {});
}

function handlePlatformLanding(
  fighter: Fighter,
  platTop: number,
  isDropThrough: boolean,
  particles: Particle[],
  addScreenShake: (intensity: number, frames: number) => void
) {
  // Check Ground Bounce requirement: "toss them down and they'll bounce off"
  if (fighter.vy > 8 && (fighter.hitstun > 0 || fighter.bouncedOnGround === false)) {
    // High velocity downward impact -> BOUNCE OFF!
    sound.playGroundBounce();
    fighter.y = platTop - fighter.height / 2;
    // Violent bounce upward!
    fighter.vy = -fighter.vy * 0.72;
    fighter.vx *= 0.85;
    fighter.bouncedOnGround = true;
    fighter.isGrounded = false;
    addScreenShake(8, 14);
    createBounceShockwave(fighter.x, platTop, particles);
    createHitText(fighter.x, platTop - 20, 'BOUNCE!', '#38bdf8', particles);
    return;
  }

  // Normal Landing
  fighter.y = platTop - fighter.height / 2;
  fighter.vy = 0;
  fighter.isGrounded = true;
  fighter.onDropThroughPlatform = isDropThrough;
  fighter.doubleJumpsLeft = fighter.stats.doubleJumps;
  fighter.bouncedOnGround = true;

  if (fighter.currentAction === 'jump' || fighter.currentAction === 'fall') {
    fighter.currentAction = 'idle';
  }
}

function tryPercentKo(
  fighter: Fighter,
  particles: Particle[],
  addScreenShake: (intensity: number, frames: number) => void,
  opponent?: Fighter
): boolean {
  if (fighter.stocks <= 0 || fighter.respawnTimer > 0) return false;
  if (fighter.damagePercent < PERCENT_KO_THRESHOLD) return false;
  eliminateFighter(fighter, particles, addScreenShake, 'percent', opponent);
  return true;
}

function eliminateFighter(
  fighter: Fighter,
  particles: Particle[],
  addScreenShake: (intensity: number, frames: number) => void,
  kind: 'blast' | 'percent',
  opponent?: Fighter
) {
  sound.playKoExplosion();

  if (kind === 'percent') {
    addScreenShake(22, 32);
    createPercentExplosion(fighter.x, fighter.y, fighter.stats.color, particles);
  } else {
    addScreenShake(15, 25);
    createKoBlast(fighter.x, fighter.y, fighter.stats.color, particles);
  }

  if (opponent && opponent.grab.role !== 'none') {
    opponent.grab = { role: 'none', duration: 0, maxDuration: 0 };
    opponent.attack = null;
  }

  fighter.stocks--;
  fighter.damagePercent = 0;
  fighter.vx = 0;
  fighter.vy = 0;
  fighter.hitstun = 0;
  fighter.attack = null;
  fighter.grab = { role: 'none', duration: 0, maxDuration: 0 };
  fighter.ledgeHang = null;
  fighter.burnTimer = 0;
  fighter.frostbiteTimer = 0;
  fighter.tipsyTimer = 0;
  fighter.lightningKickFlash = 0;
  fighter.freezeTimer = 0;
  fighter.superFlash = 0;
  fighter.superMeter = Math.min(fighter.superMeter ?? 0, SUPER_METER_ON_KO_KEEP);
  fighter.isSprinting = false;
  fighter.sprintStamina = SPRINT_STAMINA_MAX;
  fighter.isGrounded = false;
  fighter.currentAction = fighter.stocks > 0 ? 'respawning' : 'idle';

  if (fighter.stocks > 0) {
    fighter.respawnTimer = 60;
    fighter.x = 700;
    fighter.y = 200;
    fighter.bouncedOnGround = true;
  }
}

function checkBlastZone(
  fighter: Fighter,
  opponent: Fighter,
  stage: Stage,
  particles: Particle[],
  addScreenShake: (intensity: number, frames: number) => void
): { koOccurred: boolean } {
  if (tryPercentKo(fighter, particles, addScreenShake, opponent)) {
    return { koOccurred: true };
  }

  const b = stage.blastZone;
  const isOut = fighter.x < b.left || fighter.x > b.right || fighter.y < b.top || fighter.y > b.bottom;

  if (isOut && fighter.respawnTimer === 0) {
    eliminateFighter(fighter, particles, addScreenShake, 'blast', opponent);
    return { koOccurred: true };
  }

  return { koOccurred: false };
}

// Particle Generation Helpers
function createHitSparks(x: number, y: number, color: string, particles: Particle[], count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 8;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      size: 4 + Math.random() * 5,
      alpha: 1,
      decay: 0.04 + Math.random() * 0.03,
      type: 'spark',
    });
  }
}

function createHitText(x: number, y: number, text: string, color: string, particles: Particle[]) {
  particles.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 1.5,
    vy: -2,
    color,
    size: 18,
    alpha: 1,
    decay: 0.025,
    type: 'text',
    text,
  });
}

function createBounceShockwave(x: number, y: number, particles: Particle[]) {
  particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    color: '#38bdf8',
    size: 20,
    alpha: 1,
    decay: 0.05,
    type: 'shockwave',
  });
  // Dust ring
  for (let i = 0; i < 12; i++) {
    const dir = i % 2 === 0 ? 1 : -1;
    particles.push({
      x,
      y,
      vx: dir * (3 + Math.random() * 5),
      vy: -1 - Math.random() * 3,
      color: '#94a3b8',
      size: 5 + Math.random() * 4,
      alpha: 0.8,
      decay: 0.04,
      type: 'smoke',
    });
  }
}

function createKoBlast(x: number, y: number, color: string, particles: Particle[]) {
  // Massive explosion shockwave
  particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    color: '#ffffff',
    size: 30,
    alpha: 1,
    decay: 0.02,
    type: 'shockwave',
  });
  particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    color,
    size: 50,
    alpha: 1,
    decay: 0.025,
    type: 'ring',
  });
  // Lightning sparks
  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2;
    const speed = 7 + Math.random() * 10;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: i % 2 === 0 ? color : '#ffffff',
      size: 6 + Math.random() * 6,
      alpha: 1,
      decay: 0.02 + Math.random() * 0.02,
      type: 'spark',
    });
  }
}

function createPercentExplosion(x: number, y: number, color: string, particles: Particle[]) {
  createKoBlast(x, y, color, particles);
  particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    color: '#fb923c',
    size: 90,
    alpha: 1,
    decay: 0.03,
    type: 'shockwave',
  });
  particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    color: '#facc15',
    size: 70,
    alpha: 1,
    decay: 0.028,
    type: 'ring',
  });
  for (let i = 0; i < 40; i++) {
    const angle = (i / 40) * Math.PI * 2;
    const speed = 8 + Math.random() * 14;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: i % 3 === 0 ? '#f97316' : i % 3 === 1 ? '#facc15' : '#ffffff',
      size: 7 + Math.random() * 8,
      alpha: 1,
      decay: 0.018 + Math.random() * 0.02,
      type: 'spark',
    });
  }
  createHitText(x, y - 40, 'BOOM!', '#fff7ed', particles);
}

function createJumpDust(x: number, y: number, particles: Particle[]) {
  for (let i = 0; i < 6; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y,
      vx: (Math.random() - 0.5) * 3,
      vy: -0.5 - Math.random() * 1.5,
      color: '#cbd5e1',
      size: 4 + Math.random() * 3,
      alpha: 0.7,
      decay: 0.05,
      type: 'smoke',
    });
  }
}

function createDoubleJumpRing(x: number, y: number, color: string, particles: Particle[]) {
  particles.push({
    x,
    y: y + 20,
    vx: 0,
    vy: 0,
    color,
    size: 15,
    alpha: 0.9,
    decay: 0.06,
    type: 'ring',
  });
}

function createGrabRings(x: number, y: number, particles: Particle[]) {
  particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    color: '#eab308',
    size: 24,
    alpha: 1,
    decay: 0.07,
    type: 'ring',
  });
}

function createBreakSparks(x: number, y: number, particles: Particle[]) {
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * 4,
      vy: Math.sin(angle) * 4,
      color: '#93c5fd',
      size: 4,
      alpha: 1,
      decay: 0.06,
      type: 'spark',
    });
  }
}

function createThrowTrail(x: number, y: number, facing: number, dir: string, particles: Particle[]) {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: facing * (dir === 'fwd' ? 4 : dir === 'back' ? -4 : 0),
      vy: dir === 'up' ? -5 : dir === 'down' ? 5 : 0,
      color: '#60a5fa',
      size: 5 + Math.random() * 4,
      alpha: 0.8,
      decay: 0.05,
      type: 'smoke',
    });
  }
}

export function createWindGust(x: number, y: number, facing: number, particles: Particle[]) {
  // Aerial swirling wind rings
  particles.push({
    x,
    y,
    vx: facing * 6,
    vy: 0,
    color: '#38bdf8',
    size: 26,
    alpha: 0.9,
    decay: 0.05,
    type: 'ring',
  });
  // Wind streamline wisps
  for (let i = 0; i < 9; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 15,
      y: y + (Math.random() - 0.5) * 30,
      vx: facing * (5 + Math.random() * 6),
      vy: (Math.random() - 0.5) * 3,
      color: i % 2 === 0 ? '#bae6fd' : '#e0f2fe',
      size: 4 + Math.random() * 4,
      alpha: 0.85,
      decay: 0.04,
      type: 'smoke',
    });
  }
}

export function createFireExplosion(
  x: number,
  y: number,
  particles: Particle[],
  addScreenShake: (intensity: number, frames: number) => void
) {
  addScreenShake(7, 10);
  particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    color: '#f97316',
    size: 32,
    alpha: 1,
    decay: 0.05,
    type: 'shockwave',
  });
  for (let i = 0; i < 18; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 7;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      color: i % 3 === 0 ? '#ef4444' : i % 3 === 1 ? '#f97316' : '#fef08a',
      size: 5 + Math.random() * 5,
      alpha: 1,
      decay: 0.035,
      type: 'spark',
    });
  }
}

export function createIceSpikes(
  x: number,
  y: number,
  facing: number,
  particles: Particle[],
  addScreenShake: (intensity: number, frames: number) => void
) {
  addScreenShake(5, 8);
  for (let i = 0; i < 14; i++) {
    particles.push({
      x: x + facing * (i * 4),
      y: y + 20 + (Math.random() - 0.5) * 10,
      vx: facing * (1 + Math.random() * 3),
      vy: -3 - Math.random() * 5,
      color: i % 2 === 0 ? '#38bdf8' : '#e0f2fe',
      size: 5 + Math.random() * 5,
      alpha: 1,
      decay: 0.035,
      type: 'spark',
    });
  }
}

export function createLightningBurst(x: number, y: number, particles: Particle[]) {
  particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    color: '#67e8f9',
    size: 28,
    alpha: 1,
    decay: 0.06,
    type: 'ring',
  });
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const speed = 6 + Math.random() * 8;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: i % 2 === 0 ? '#67e8f9' : '#fef08a',
      size: 5 + Math.random() * 4,
      alpha: 1,
      decay: 0.04,
      type: 'spark',
    });
  }
}

export function createShadowPhaseSmoke(x: number, y: number, particles: Particle[]) {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 30,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      color: i % 2 === 0 ? '#a855f7' : '#ec4899',
      size: 6 + Math.random() * 6,
      alpha: 0.8,
      decay: 0.04,
      type: 'smoke',
    });
  }
}

export function createEarthquakeTremor(
  x: number,
  y: number,
  stage: Stage,
  opponent: Fighter,
  particles: Particle[],
  addScreenShake: (intensity: number, frames: number) => void
) {
  addScreenShake(8, 14);
  particles.push({
    x,
    y: y + 25,
    vx: 0,
    vy: 0,
    color: '#fbbf24',
    size: 40,
    alpha: 1,
    decay: 0.04,
    type: 'shockwave',
  });

  // Rock debris flying left and right along ground
  for (let i = -6; i <= 6; i++) {
    if (i === 0) continue;
    particles.push({
      x: x + i * 16,
      y: y + 28,
      vx: Math.sign(i) * (2 + Math.random() * 5),
      vy: -2 - Math.random() * 6,
      color: '#d97706',
      size: 6 + Math.random() * 4,
      alpha: 1,
      decay: 0.035,
      type: 'spark',
    });
  }

  // Pop grounded opponent into air if on same horizontal ground platform!
  if (opponent.isGrounded && Math.abs(opponent.y - y) < 35 && Math.abs(opponent.x - x) < 220) {
    opponent.damagePercent += 5;
    opponent.isGrounded = false;
    opponent.vy = -knockbackFromPercent(8, 0.18, opponent.damagePercent, opponent.stats.weight);
    opponent.hitstun = Math.floor(16 + opponent.damagePercent * 0.18);
    opponent.currentAction = 'hitstun';
    createHitText(opponent.x, opponent.y - 30, 'TREMOR!', '#f59e0b', particles);
    tryPercentKo(opponent, particles, addScreenShake);
  }
}

export function createMonkeySpinBurst(
  x: number,
  y: number,
  facing: number,
  particles: Particle[]
) {
  particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    color: '#facc15',
    size: 30,
    alpha: 0.95,
    decay: 0.055,
    type: 'ring',
  });
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    const speed = 5 + Math.random() * 6;
    particles.push({
      x: x + Math.cos(angle) * 6,
      y: y + Math.sin(angle) * 6,
      vx: Math.cos(angle) * speed + facing * 2,
      vy: Math.sin(angle) * speed - 1,
      color: i % 2 === 0 ? '#84cc16' : '#fde047',
      size: 4 + Math.random() * 4,
      alpha: 1,
      decay: 0.04,
      type: 'spark',
    });
  }
}

export function createLightningKickSparks(
  x: number,
  y: number,
  facing: number,
  particles: Particle[]
) {
  particles.push({
    x: x + facing * 8,
    y,
    vx: facing * 4,
    vy: 0,
    color: '#93c5fd',
    size: 18,
    alpha: 0.9,
    decay: 0.08,
    type: 'ring',
  });
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: x + facing * (4 + Math.random() * 12),
      y: y + (Math.random() - 0.5) * 28,
      vx: facing * (3 + Math.random() * 5),
      vy: (Math.random() - 0.5) * 4,
      color: i % 2 === 0 ? '#60a5fa' : '#f9a8d4',
      size: 3 + Math.random() * 3,
      alpha: 1,
      decay: 0.05,
      type: 'lightning',
    });
  }
}
