import { Fighter, InputState, Stage, WorldItem, SUPER_METER_MAX } from './types';
import { ITEM_DEFS } from './items';

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
    const fireChance = cpuLevel <= 3 ? 0.35 : 0.55 + cpuLevel * 0.04;
    if (dist < 220 && Math.random() < fireChance) {
      input.special = true;
      if (player.x > cpu.x) input.right = true;
      else input.left = true;
      return input;
    }
  }

  // If CPU is currently hanging on the platform ledge:
  if (cpu.ledgeHang) {
    // Hang briefly for 10-25 frames then recover back onto stage
    if (cpu.actionTimer > (cpuLevel <= 2 ? 25 : 12)) {
      const rand = Math.random();
      const distToPlayer = Math.hypot(player.x - cpu.x, player.y - cpu.y);
      if (distToPlayer < 90 && rand < 0.45) {
        // Player is camping near the ledge: Ledge Attack or Jump over!
        if (rand < 0.25) input.punch = true;
        else input.up = true;
      } else if (rand < 0.65) {
        // Ledge Climb up onto platform
        if (cpu.ledgeHang.side === 'left') input.right = true;
        else input.left = true;
      } else {
        // Ledge Jump
        input.up = true;
      }
    }
    return input;
  }

  // If CPU is currently grabbing the player:
  if (cpu.grab.role === 'grabber') {
    // Pick a directional throw!
    const rand = Math.random();
    // If near left edge:
    if (cpu.x < 550) {
      if (cpu.facing === -1) input.left = true; // throw into blast zone!
      else input.right = true;
    } else if (cpu.x > 850) {
      if (cpu.facing === 1) input.right = true;
      else input.left = true;
    } else if (rand < 0.28) {
      input.up = true; // Up throw
    } else if (rand < 0.55) {
      input.down = true; // Down throw (bounce off!)
    } else if (rand < 0.8) {
      if (cpu.facing === 1) input.right = true;
      else input.left = true;
    } else {
      if (cpu.facing === 1) input.left = true; // Back throw
      else input.right = true;
    }
    return input;
  }

  // If CPU is grabbed: mash inputs to escape!
  if (cpu.grab.role === 'grabbed') {
    if (Math.random() < 0.5) input.punch = true;
    if (Math.random() < 0.5) input.kick = true;
    return input;
  }

  const dx = player.x - cpu.x;
  const dy = player.y - cpu.y;
  const dist = Math.hypot(dx, dy);

  // Recovery Logic: If CPU is off the main stage and falling!
  const mainStage = stage.platforms[0];
  const isOffStage = cpu.x < mainStage.x - 20 || cpu.x > mainStage.x + mainStage.width + 20;

  if (isOffStage || cpu.y > mainStage.y + 40) {
    // Steer towards center of stage
    const centerStageX = mainStage.x + mainStage.width / 2;
    if (cpu.x < centerStageX) {
      input.right = true;
    } else {
      input.left = true;
    }

    // Jump if falling
    if (cpu.vy > 1.5 && (cpu.doubleJumpsLeft > 0 || cpu.isGrounded)) {
      input.up = true;
    }
    return input;
  }

  // Chase nearby item crates when unarmed
  if (!cpu.heldWeapon && worldItems.length > 0 && cpuLevel >= 1) {
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
    const seekRange = cpuLevel <= 2 ? 220 : 340;
    if (nearest && nearestDist < seekRange && (nearestDist < dist - 20 || dist > 110)) {
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

  // Use held guns / bombs at range instead of rushing in
  if (cpu.heldWeapon) {
    const def = ITEM_DEFS[cpu.heldWeapon.kind];
    if (def.category === 'ranged' && dist < 420) {
      if (dx > 12) input.right = true;
      else if (dx < -12) input.left = true;
      if (Math.abs(dy) < 70 && dist > 55 && Math.random() < (cpuLevel <= 2 ? 0.28 : 0.5)) {
        input.punch = true;
      }
      return input;
    }
    if (def.category === 'throwable' && dist < 210 && Math.abs(dy) < 90) {
      if (dx > 8) input.right = true;
      else if (dx < -8) input.left = true;
      if (dist > 40 && Math.random() < 0.4) input.punch = true;
      return input;
    }
  }

  // Guard against incoming punches / kicks when close
  if (
    cpu.isGrounded &&
    player.attack &&
    (player.attack.type === 'punch' || player.attack.type === 'kick') &&
    dist < 90 &&
    cpuLevel >= 2
  ) {
    const blockChance = cpuLevel <= 3 ? 0.28 : 0.35 + (cpuLevel / 9) * 0.45;
    if (Math.random() < blockChance) {
      input.block = true;
      if (dx > 4) input.right = true;
      else if (dx < -4) input.left = true;
      return input;
    }
  }

  // Reaction threshold based on CPU Level (1 to 9)
  // Level 1: very relaxed, idle pauses, beginner friendly so player can easily practice
  // Level 3: normal casual
  // Level 9: tournament master
  const reactionChance = cpuLevel === 1 ? 0.18 : cpuLevel === 2 ? 0.32 : 0.35 + (cpuLevel / 9) * 0.58;
  if (Math.random() > reactionChance) {
    return input;
  }

  // Approach / spacing — stop short of body overlap so CPU doesn't nest inside the player
  const approachDist = cpuLevel <= 2 ? 80 : 60;
  const minSpacing = (cpu.width + player.width) * 0.35;
  if (Math.abs(dx) > approachDist) {
    if (dx > 0) {
      input.right = true;
    } else {
      input.left = true;
    }
    // Sprint if far and high enough level (Lv 4+)
    if (Math.abs(dx) > 150 && cpuLevel >= 4) {
      input.sprint = true;
    }
  } else if (Math.abs(dx) < minSpacing && Math.abs(dy) < 50) {
    // Too close: step back to create space instead of sitting inside the opponent
    if (dx > 0) {
      input.left = true;
    } else if (dx < 0) {
      input.right = true;
    }
  }

  // Jump up to higher platform or to reach airborne player
  if (dy < -60 && Math.abs(dx) < 120 && (cpu.isGrounded || cpu.doubleJumpsLeft > 0)) {
    if (cpuLevel >= 2 || Math.random() < 0.3) {
      input.up = true;
    }
  }

  // Drop through platform if player is lower
  if (dy > 60 && cpu.onDropThroughPlatform && (cpuLevel >= 3 || Math.random() < 0.25)) {
    input.down = true;
  }

  // Attack selection when in range
  if (dist < (cpu.heldWeapon ? 95 : cpuLevel <= 2 ? 65 : 85)) {
    const actionRoll = Math.random();
    const holdingMelee = !!cpu.heldWeapon && ITEM_DEFS[cpu.heldWeapon.kind].category === 'melee';

    // At Level 1, CPU is very polite: mostly idles, rarely attacks or grabs
    if (cpuLevel === 1) {
      if (actionRoll < 0.08 && cpu.attack === null && !cpu.heldWeapon) {
        input.grab = true;
      } else if (actionRoll < 0.35 || holdingMelee) {
        input.punch = true;
      } else if (actionRoll < 0.42) {
        input.kick = true;
      }
      // Otherwise stands or repositions, giving player time to hit
    } else if (cpuLevel === 2) {
      if (actionRoll < 0.15 && cpu.attack === null && !cpu.heldWeapon) {
        input.grab = true;
      } else if (actionRoll < 0.55 || holdingMelee) {
        input.punch = true;
      } else if (actionRoll < 0.7) {
        input.kick = true;
      }
    } else {
      // Normal / Advanced CPU
      const grabChance = holdingMelee ? 0 : cpuLevel >= 6 ? 0.42 : 0.32;
      if (actionRoll < grabChance && cpu.attack === null) {
        input.grab = true;
      } else if (actionRoll < 0.72 || holdingMelee) {
        input.punch = true;
        if (Math.abs(dy) > 30 && dy < 0) {
          input.up = true; // Up punch
        }
      } else {
        input.kick = true;
        if (!cpu.isGrounded && dy > 20) {
          input.down = true; // Dive kick / stomp
        } else if (dy < -20) {
          input.up = true; // Flip kick
        }
      }
    }
  }

  return input;
}
