import { Fighter, InputState, Stage, WorldItem, SUPER_METER_MAX } from './types';
import { ITEM_DEFS } from './items';

/**
 * CPU difficulty profiles (levels 1–9).
 * UI presets: Easy=1, Normal=3, Hard=6, Master=9
 * Bands: Easy 1–2 | Normal 3–5 | Hard 6–7 | Master 8–9
 */
interface CpuProfile {
  /** Fraction of frames the CPU acts on approach/attack (0–1). */
  reaction: number;
  /** Chance to drift toward stage when offstage. */
  recoverSteer: number;
  /** Chance to jump while falling offstage. */
  recoverJump: number;
  /** Chance to panic the wrong way when recovery fails. */
  recoverMistake: number;
  /** Frames to wait on ledge before get-up. */
  ledgeHangDelay: number;
  /** Chance to drop off ledge (self-destruct). */
  ledgeDrop: number;
  /** Chance to ledge-attack when player is nearby. */
  ledgeAttack: number;
  /** Chance to throw toward blast zone when near edge. */
  smartEdgeThrow: number;
  /** Per-frame mash chance while grabbed. */
  grabMash: number;
  /** Chance to block an incoming punch/kick. */
  block: number;
  /** Chance to dump super when in range. */
  superFire: number;
  /** Max distance to chase items. */
  itemSeekRange: number;
  /** Chance to fire ranged / throw held item. */
  weaponUse: number;
  /** Stop approaching when this close (higher = shy). */
  approachDist: number;
  /** Attack engagement range (unarmed). */
  attackRange: number;
  /** Whether CPU sprints when far. */
  canSprint: boolean;
  /** Chance to chase airborne opponent with jump. */
  chaseJump: number;
  /** Chance to drop through platform after opponent. */
  dropThrough: number;
  /** Idle wander chance on skipped reaction frames. */
  wander: number;
  /** Attack mix when in range: grab / punch / kick thresholds. */
  grabWeight: number;
  punchWeight: number;
  kickWeight: number;
  /** Use directional attacks (up/down punch/kick). */
  directionalAttacks: boolean;
}

const CPU_PROFILES: Record<number, CpuProfile> = {
  // Easy — soft punching bag; lots of openings
  1: {
    reaction: 0.07,
    recoverSteer: 0.4,
    recoverJump: 0.18,
    recoverMistake: 0.4,
    ledgeHangDelay: 50,
    ledgeDrop: 0.22,
    ledgeAttack: 0,
    smartEdgeThrow: 0.05,
    grabMash: 0.06,
    block: 0,
    superFire: 0.03,
    itemSeekRange: 0,
    weaponUse: 0.08,
    approachDist: 120,
    attackRange: 48,
    canSprint: false,
    chaseJump: 0.1,
    dropThrough: 0.05,
    wander: 0.14,
    grabWeight: 0.03,
    punchWeight: 0.2,
    kickWeight: 0.06,
    directionalAttacks: false,
  },
  2: {
    reaction: 0.14,
    recoverSteer: 0.55,
    recoverJump: 0.32,
    recoverMistake: 0.28,
    ledgeHangDelay: 38,
    ledgeDrop: 0.14,
    ledgeAttack: 0.05,
    smartEdgeThrow: 0.12,
    grabMash: 0.12,
    block: 0.04,
    superFire: 0.06,
    itemSeekRange: 120,
    weaponUse: 0.14,
    approachDist: 100,
    attackRange: 55,
    canSprint: false,
    chaseJump: 0.18,
    dropThrough: 0.08,
    wander: 0.1,
    grabWeight: 0.06,
    punchWeight: 0.32,
    kickWeight: 0.1,
    directionalAttacks: false,
  },
  // Normal — fair casual opponent
  3: {
    reaction: 0.26,
    recoverSteer: 0.72,
    recoverJump: 0.5,
    recoverMistake: 0.12,
    ledgeHangDelay: 26,
    ledgeDrop: 0.06,
    ledgeAttack: 0.18,
    smartEdgeThrow: 0.3,
    grabMash: 0.22,
    block: 0.12,
    superFire: 0.14,
    itemSeekRange: 200,
    weaponUse: 0.26,
    approachDist: 80,
    attackRange: 68,
    canSprint: false,
    chaseJump: 0.35,
    dropThrough: 0.18,
    wander: 0.04,
    grabWeight: 0.14,
    punchWeight: 0.42,
    kickWeight: 0.16,
    directionalAttacks: false,
  },
  4: {
    reaction: 0.36,
    recoverSteer: 0.82,
    recoverJump: 0.62,
    recoverMistake: 0.06,
    ledgeHangDelay: 20,
    ledgeDrop: 0.03,
    ledgeAttack: 0.28,
    smartEdgeThrow: 0.45,
    grabMash: 0.3,
    block: 0.2,
    superFire: 0.22,
    itemSeekRange: 250,
    weaponUse: 0.34,
    approachDist: 70,
    attackRange: 74,
    canSprint: false,
    chaseJump: 0.48,
    dropThrough: 0.28,
    wander: 0.02,
    grabWeight: 0.2,
    punchWeight: 0.45,
    kickWeight: 0.18,
    directionalAttacks: true,
  },
  5: {
    reaction: 0.48,
    recoverSteer: 0.9,
    recoverJump: 0.74,
    recoverMistake: 0.03,
    ledgeHangDelay: 16,
    ledgeDrop: 0.015,
    ledgeAttack: 0.38,
    smartEdgeThrow: 0.58,
    grabMash: 0.38,
    block: 0.3,
    superFire: 0.32,
    itemSeekRange: 290,
    weaponUse: 0.42,
    approachDist: 62,
    attackRange: 80,
    canSprint: true,
    chaseJump: 0.6,
    dropThrough: 0.4,
    wander: 0,
    grabWeight: 0.26,
    punchWeight: 0.44,
    kickWeight: 0.2,
    directionalAttacks: true,
  },
  // Hard — aggressive pressure
  6: {
    reaction: 0.62,
    recoverSteer: 0.95,
    recoverJump: 0.84,
    recoverMistake: 0.01,
    ledgeHangDelay: 12,
    ledgeDrop: 0,
    ledgeAttack: 0.5,
    smartEdgeThrow: 0.72,
    grabMash: 0.48,
    block: 0.42,
    superFire: 0.45,
    itemSeekRange: 330,
    weaponUse: 0.52,
    approachDist: 55,
    attackRange: 86,
    canSprint: true,
    chaseJump: 0.72,
    dropThrough: 0.55,
    wander: 0,
    grabWeight: 0.32,
    punchWeight: 0.4,
    kickWeight: 0.22,
    directionalAttacks: true,
  },
  7: {
    reaction: 0.74,
    recoverSteer: 0.97,
    recoverJump: 0.9,
    recoverMistake: 0,
    ledgeHangDelay: 10,
    ledgeDrop: 0,
    ledgeAttack: 0.58,
    smartEdgeThrow: 0.82,
    grabMash: 0.55,
    block: 0.52,
    superFire: 0.55,
    itemSeekRange: 360,
    weaponUse: 0.6,
    approachDist: 52,
    attackRange: 90,
    canSprint: true,
    chaseJump: 0.82,
    dropThrough: 0.65,
    wander: 0,
    grabWeight: 0.36,
    punchWeight: 0.38,
    kickWeight: 0.22,
    directionalAttacks: true,
  },
  // Master — tournament pressure
  8: {
    reaction: 0.86,
    recoverSteer: 0.99,
    recoverJump: 0.95,
    recoverMistake: 0,
    ledgeHangDelay: 8,
    ledgeDrop: 0,
    ledgeAttack: 0.68,
    smartEdgeThrow: 0.92,
    grabMash: 0.65,
    block: 0.62,
    superFire: 0.68,
    itemSeekRange: 400,
    weaponUse: 0.7,
    approachDist: 48,
    attackRange: 95,
    canSprint: true,
    chaseJump: 0.9,
    dropThrough: 0.78,
    wander: 0,
    grabWeight: 0.4,
    punchWeight: 0.36,
    kickWeight: 0.22,
    directionalAttacks: true,
  },
  9: {
    reaction: 0.94,
    recoverSteer: 1,
    recoverJump: 0.98,
    recoverMistake: 0,
    ledgeHangDelay: 6,
    ledgeDrop: 0,
    ledgeAttack: 0.78,
    smartEdgeThrow: 0.98,
    grabMash: 0.75,
    block: 0.72,
    superFire: 0.8,
    itemSeekRange: 440,
    weaponUse: 0.78,
    approachDist: 45,
    attackRange: 100,
    canSprint: true,
    chaseJump: 0.96,
    dropThrough: 0.88,
    wander: 0,
    grabWeight: 0.44,
    punchWeight: 0.34,
    kickWeight: 0.2,
    directionalAttacks: true,
  },
};

function getProfile(cpuLevel: number): CpuProfile {
  const level = Math.max(1, Math.min(9, Math.round(cpuLevel)));
  return CPU_PROFILES[level];
}

export function calculateCpuInput(
  cpu: Fighter,
  player: Fighter,
  stage: Stage,
  cpuLevel: number, // 1 to 9
  worldItems: WorldItem[] = []
): InputState {
  const input: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    punch: false,
    kick: false,
    grab: false,
    block: false,
    sprint: false,
    special: false,
  };

  if (cpu.stocks <= 0 || cpu.respawnTimer > 0) {
    return input;
  }

  const p = getProfile(cpuLevel);

  // Fire unique super when meter is ready and opponent is in range
  if (
    (cpu.superMeter ?? 0) >= SUPER_METER_MAX &&
    cpu.attack === null &&
    cpu.hitstun <= 0 &&
    cpu.grab.role === 'none' &&
    !cpu.ledgeHang &&
    !(cpu.freezeTimer && cpu.freezeTimer > 0)
  ) {
    const dist = Math.hypot(player.x - cpu.x, player.y - cpu.y);
    if (dist < 220 && Math.random() < p.superFire) {
      input.special = true;
      if (player.x > cpu.x) input.right = true;
      else input.left = true;
      return input;
    }
  }

  // Ledge hang / get-up
  if (cpu.ledgeHang) {
    if (cpu.actionTimer > p.ledgeHangDelay) {
      if (p.ledgeDrop > 0 && Math.random() < p.ledgeDrop) {
        if (cpu.ledgeHang.side === 'left') input.left = true;
        else input.right = true;
        return input;
      }
      const rand = Math.random();
      const distToPlayer = Math.hypot(player.x - cpu.x, player.y - cpu.y);
      if (distToPlayer < 90 && Math.random() < p.ledgeAttack) {
        if (rand < 0.45) input.punch = true;
        else input.up = true;
      } else if (rand < 0.65) {
        if (cpu.ledgeHang.side === 'left') input.right = true;
        else input.left = true;
      } else {
        input.up = true;
      }
    }
    return input;
  }

  // Throw while grabbing
  if (cpu.grab.role === 'grabber') {
    const rand = Math.random();
    const nearLeft = cpu.x < 550;
    const nearRight = cpu.x > 850;
    if ((nearLeft || nearRight) && Math.random() < p.smartEdgeThrow) {
      if (nearLeft) {
        if (cpu.facing === -1) input.left = true;
        else input.right = true;
      } else {
        if (cpu.facing === 1) input.right = true;
        else input.left = true;
      }
    } else if (rand < 0.28) {
      input.up = true;
    } else if (rand < 0.55) {
      input.down = true;
    } else if (rand < 0.8) {
      if (cpu.facing === 1) input.right = true;
      else input.left = true;
    } else {
      if (cpu.facing === 1) input.left = true;
      else input.right = true;
    }
    return input;
  }

  // Mash out of grab
  if (cpu.grab.role === 'grabbed') {
    if (Math.random() < p.grabMash) input.punch = true;
    if (Math.random() < p.grabMash) input.kick = true;
    return input;
  }

  const dx = player.x - cpu.x;
  const dy = player.y - cpu.y;
  const dist = Math.hypot(dx, dy);

  // Recovery when offstage / below
  const mainStage = stage.platforms[0];
  const isOffStage = cpu.x < mainStage.x - 20 || cpu.x > mainStage.x + mainStage.width + 20;

  if (isOffStage || cpu.y > mainStage.y + 40) {
    const centerStageX = mainStage.x + mainStage.width / 2;
    if (Math.random() < p.recoverSteer) {
      if (cpu.x < centerStageX) input.right = true;
      else input.left = true;
    } else if (p.recoverMistake > 0 && Math.random() < p.recoverMistake) {
      if (cpu.x < centerStageX) input.left = true;
      else input.right = true;
    }

    if (
      cpu.vy > 1.5 &&
      (cpu.doubleJumpsLeft > 0 || cpu.isGrounded) &&
      Math.random() < p.recoverJump
    ) {
      input.up = true;
    }
    return input;
  }

  // Chase items when unarmed
  if (!cpu.heldWeapon && worldItems.length > 0 && p.itemSeekRange > 0) {
    let nearest: WorldItem | null = null;
    let nearestDist = Infinity;
    for (const item of worldItems) {
      if (item.pickupLock > 0) continue;
      const itemDist = Math.hypot(item.x - cpu.x, item.y - cpu.y);
      if (itemDist < nearestDist) {
        nearest = item;
        nearestDist = itemDist;
      }
    }
    if (nearest && nearestDist < p.itemSeekRange && (nearestDist < dist - 20 || dist > 110)) {
      if (nearest.x > cpu.x + 8) input.right = true;
      else if (nearest.x < cpu.x - 8) input.left = true;
      if (nearest.y < cpu.y - 40 && (cpu.isGrounded || cpu.doubleJumpsLeft > 0)) {
        input.up = true;
      }
      if (nearest.y > cpu.y + 50 && cpu.onDropThroughPlatform) {
        input.down = true;
      }
      return input;
    }
  }

  // Use held ranged / throwable
  if (cpu.heldWeapon) {
    const def = ITEM_DEFS[cpu.heldWeapon.kind];
    if (def.category === 'ranged' && dist < 420) {
      if (dx > 12) input.right = true;
      else if (dx < -12) input.left = true;
      if (Math.abs(dy) < 70 && dist > 55 && Math.random() < p.weaponUse) {
        input.punch = true;
      }
      return input;
    }
    if (def.category === 'throwable' && dist < 210 && Math.abs(dy) < 90) {
      if (dx > 8) input.right = true;
      else if (dx < -8) input.left = true;
      if (dist > 40 && Math.random() < p.weaponUse) input.punch = true;
      return input;
    }
  }

  // Block incoming attacks
  if (
    cpu.isGrounded &&
    player.attack &&
    (player.attack.type === 'punch' || player.attack.type === 'kick') &&
    dist < 90 &&
    p.block > 0
  ) {
    if (Math.random() < p.block) {
      input.block = true;
      if (dx > 4) input.right = true;
      else if (dx < -4) input.left = true;
      return input;
    }
  }

  // Reaction gate for approach / attack
  if (Math.random() > p.reaction) {
    if (p.wander > 0 && Math.random() < p.wander) {
      if (Math.random() < 0.5) input.left = true;
      else input.right = true;
    }
    return input;
  }

  // Approach / spacing
  const minSpacing = (cpu.width + player.width) * 0.35;
  if (Math.abs(dx) > p.approachDist) {
    if (dx > 0) input.right = true;
    else input.left = true;
    if (p.canSprint && Math.abs(dx) > 150) {
      input.sprint = true;
    }
  } else if (Math.abs(dx) < minSpacing && Math.abs(dy) < 50) {
    if (dx > 0) input.left = true;
    else if (dx < 0) input.right = true;
  }

  // Vertical chase
  if (dy < -60 && Math.abs(dx) < 120 && (cpu.isGrounded || cpu.doubleJumpsLeft > 0)) {
    if (Math.random() < p.chaseJump) input.up = true;
  }
  if (dy > 60 && cpu.onDropThroughPlatform && Math.random() < p.dropThrough) {
    input.down = true;
  }

  // Attack selection
  const attackRange = cpu.heldWeapon ? Math.max(p.attackRange, 95) : p.attackRange;
  if (dist < attackRange) {
    const actionRoll = Math.random();
    const holdingMelee = !!cpu.heldWeapon && ITEM_DEFS[cpu.heldWeapon.kind].category === 'melee';
    const grabCut = holdingMelee ? 0 : p.grabWeight;
    const punchCut = grabCut + p.punchWeight;
    const kickCut = punchCut + p.kickWeight;

    if (actionRoll < grabCut && cpu.attack === null) {
      input.grab = true;
    } else if (actionRoll < punchCut || holdingMelee) {
      input.punch = true;
      if (p.directionalAttacks && Math.abs(dy) > 30 && dy < 0) {
        input.up = true;
      }
    } else if (actionRoll < kickCut) {
      input.kick = true;
      if (p.directionalAttacks) {
        if (!cpu.isGrounded && dy > 20) input.down = true;
        else if (dy < -20) input.up = true;
      }
    }
    // else: whiff / idle — intentional openings on lower difficulties
  }

  return input;
}
