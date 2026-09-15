import { sound } from './audio';
import {
  Fighter,
  InputState,
  ItemCategory,
  ItemKind,
  ItemWorld,
  Particle,
  Projectile,
  Stage,
  WorldItem,
} from './types';

const ITEM_GRAVITY = 0.5;
const ITEM_TERMINAL = 14;
const KNOCKBACK_SCALE = 0.62;
const MAX_WORLD_ITEMS = 1;
const ITEM_LIFETIME = 20 * 60; // 20s at 60fps
export const FIRST_ITEM_DELAY = 480; // first crate ~8s into the match
export const ITEM_SPAWN_MIN = 1080; // 18s
export const ITEM_SPAWN_MAX = 1680; // 28s

export interface ItemDef {
  kind: ItemKind;
  name: string;
  category: ItemCategory;
  uses: number;
  damage: number;
  knockbackBase: number;
  knockbackGrowth: number;
  reach: number;
  hitRadius: number;
  projectileSpeed: number;
  color: string;
  glowColor: string;
  startupFrames: number;
  activeFrames: number;
  totalFrames: number;
}

export const ITEM_DEFS: Record<ItemKind, ItemDef> = {
  blaster: {
    kind: 'blaster',
    name: 'Blaster',
    category: 'ranged',
    uses: 8,
    damage: 8,
    knockbackBase: 5.5,
    knockbackGrowth: 0.16,
    reach: 0,
    hitRadius: 6,
    projectileSpeed: 12,
    color: '#94a3b8',
    glowColor: '#e2e8f0',
    startupFrames: 0,
    activeFrames: 0,
    totalFrames: 12,
  },
  raygun: {
    kind: 'raygun',
    name: 'Ray Gun',
    category: 'ranged',
    uses: 12,
    damage: 5,
    knockbackBase: 3.5,
    knockbackGrowth: 0.1,
    reach: 0,
    hitRadius: 5,
    projectileSpeed: 16,
    color: '#4ade80',
    glowColor: '#bbf7d0',
    startupFrames: 0,
    activeFrames: 0,
    totalFrames: 8,
  },
  sword: {
    kind: 'sword',
    name: 'Steel Sword',
    category: 'melee',
    uses: 10,
    damage: 12,
    knockbackBase: 7,
    knockbackGrowth: 0.2,
    reach: 78,
    hitRadius: 36,
    projectileSpeed: 0,
    color: '#cbd5e1',
    glowColor: '#f8fafc',
    startupFrames: 4,
    activeFrames: 8,
    totalFrames: 22,
  },
  beam_sword: {
    kind: 'beam_sword',
    name: 'Beam Sword',
    category: 'melee',
    uses: 8,
    damage: 11,
    knockbackBase: 6.5,
    knockbackGrowth: 0.18,
    reach: 92,
    hitRadius: 40,
    projectileSpeed: 0,
    color: '#22d3ee',
    glowColor: '#a5f3fc',
    startupFrames: 3,
    activeFrames: 9,
    totalFrames: 20,
  },
  hammer: {
    kind: 'hammer',
    name: 'Hammer',
    category: 'melee',
    uses: 4,
    damage: 20,
    knockbackBase: 12,
    knockbackGrowth: 0.28,
    reach: 70,
    hitRadius: 44,
    projectileSpeed: 0,
    color: '#f59e0b',
    glowColor: '#fde68a',
    startupFrames: 10,
    activeFrames: 8,
    totalFrames: 34,
  },
  bat: {
    kind: 'bat',
    name: 'Home-Run Bat',
    category: 'melee',
    uses: 5,
    damage: 16,
    knockbackBase: 14,
    knockbackGrowth: 0.32,
    reach: 74,
    hitRadius: 34,
    projectileSpeed: 0,
    color: '#d97706',
    glowColor: '#fcd34d',
    startupFrames: 8,
    activeFrames: 6,
    totalFrames: 28,
  },
  bomb: {
    kind: 'bomb',
    name: 'Bomb',
    category: 'throwable',
    uses: 1,
    damage: 18,
    knockbackBase: 10,
    knockbackGrowth: 0.22,
    reach: 0,
    hitRadius: 78,
    projectileSpeed: 9,
    color: '#1e293b',
    glowColor: '#fb7185',
    startupFrames: 0,
    activeFrames: 0,
    totalFrames: 16,
  },
};

const SPAWN_TABLE: ItemKind[] = [
  'blaster',
  'blaster',
  'blaster',
  'raygun',
  'raygun',
  'sword',
  'sword',
  'sword',
  'beam_sword',
  'beam_sword',
  'hammer',
  'hammer',
  'bat',
  'bat',
  'bomb',
  'bomb',
];

let nextItemId = 1;
let nextProjId = 1;

export function createEmptyItemWorld(): ItemWorld {
  return { items: [], projectiles: [] };
}

export function randomSpawnDelay(): number {
  return ITEM_SPAWN_MIN + Math.floor(Math.random() * (ITEM_SPAWN_MAX - ITEM_SPAWN_MIN));
}

export function spawnRandomItem(world: ItemWorld, stage: Stage, particles: Particle[]): WorldItem | null {
  if (world.items.length >= MAX_WORLD_ITEMS) return null;

  const shuffled = [...stage.platforms].sort(() => Math.random() - 0.5);
  let spawnX = shuffled[0].x + shuffled[0].width / 2;
  let spawnY = shuffled[0].y - 180;
  let placed = false;

  for (const plat of shuffled) {
    const margin = 32;
    const span = Math.max(12, plat.width - margin * 2);
    for (let attempt = 0; attempt < 8; attempt++) {
      const tx = plat.x + margin + Math.random() * span;
      const tooClose = world.items.some(
        (it) => Math.abs(it.x - tx) < 58 && Math.abs((it.y + 12) - plat.y) < 90
      );
      if (!tooClose) {
        spawnX = tx;
        spawnY = plat.y - 160 - Math.random() * 50;
        placed = true;
        break;
      }
    }
    if (placed) break;
  }

  const kind = SPAWN_TABLE[Math.floor(Math.random() * SPAWN_TABLE.length)];
  const def = ITEM_DEFS[kind];
  const item: WorldItem = {
    id: nextItemId++,
    kind,
    x: spawnX,
    y: spawnY,
    vx: (Math.random() - 0.5) * 1.4,
    vy: 0.6,
    isGrounded: false,
    lifetime: ITEM_LIFETIME,
    bob: 0,
    pickupLock: 8,
  };

  world.items.push(item);
  sound.playItemSpawn();
  pushText(item.x, item.y - 24, `${def.name.toUpperCase()}!`, def.glowColor, particles);
  burst(item.x, item.y, def.glowColor, particles, 10);
  return item;
}

export function updateWorldItems(world: ItemWorld, stage: Stage, particles: Particle[]) {
  for (let i = world.items.length - 1; i >= 0; i--) {
    const item = world.items[i];
    item.lifetime--;
    item.bob++;
    if (item.pickupLock > 0) item.pickupLock--;

    if (item.lifetime <= 0 || item.y > stage.blastZone.bottom + 40) {
      burst(item.x, item.y, ITEM_DEFS[item.kind].glowColor, particles, 8);
      world.items.splice(i, 1);
      continue;
    }

    if (!item.isGrounded) {
      item.vy = Math.min(item.vy + ITEM_GRAVITY, ITEM_TERMINAL);
    } else {
      item.vx *= 0.86;
      if (Math.abs(item.vx) < 0.05) item.vx = 0;
    }

    item.x += item.vx;
    item.y += item.vy;
    landItemOnPlatforms(item, stage);

    if (item.lifetime < 180 && item.lifetime % 18 === 0) {
      particles.push({
        x: item.x + (Math.random() - 0.5) * 10,
        y: item.y - 8,
        vx: 0,
        vy: -0.6,
        color: ITEM_DEFS[item.kind].glowColor,
        size: 3,
        alpha: 0.8,
        decay: 0.06,
        type: 'spark',
      });
    }
  }
}

export function tryPickupItems(world: ItemWorld, fighters: Fighter[], particles: Particle[]) {
  for (const fighter of fighters) {
    if (!canPickup(fighter)) continue;

    for (let i = world.items.length - 1; i >= 0; i--) {
      const item = world.items[i];
      if (item.pickupLock > 0) continue;

      const dist = Math.hypot(fighter.x - item.x, fighter.y - item.y);
      if (dist > 38) continue;

      if (fighter.heldWeapon) {
        dropHeldWeapon(fighter, world, particles, -fighter.facing * 5, -3);
      }

      const def = ITEM_DEFS[item.kind];
      fighter.heldWeapon = { kind: item.kind, usesLeft: def.uses };
      world.items.splice(i, 1);
      sound.playItemPickup();
      pushText(fighter.x, fighter.y - 42, def.name.toUpperCase(), def.glowColor, particles);
      burst(fighter.x, fighter.y - 8, def.glowColor, particles, 12);
      break;
    }
  }
}

export function dropEliminatedWeapons(fighters: Fighter[], world: ItemWorld, particles: Particle[]) {
  for (const fighter of fighters) {
    if (!fighter.heldWeapon) continue;
    if (fighter.stocks > 0 && fighter.respawnTimer <= 0 && fighter.currentAction !== 'respawning') continue;
    dropHeldWeapon(fighter, world, particles, (Math.random() - 0.5) * 8, -7);
  }
}

export function dropHeldWeapon(
  fighter: Fighter,
  world: ItemWorld,
  particles: Particle[],
  tossVx = 0,
  tossVy = -2
) {
  const held = fighter.heldWeapon;
  if (!held) return;

  world.items.push({
    id: nextItemId++,
    kind: held.kind,
    x: fighter.x + fighter.facing * 18,
    y: fighter.y,
    vx: tossVx,
    vy: tossVy,
    isGrounded: false,
    lifetime: Math.floor(ITEM_LIFETIME * 0.7),
    bob: 0,
    pickupLock: 22,
  });
  fighter.heldWeapon = null;
  burst(fighter.x, fighter.y, ITEM_DEFS[held.kind].glowColor, particles, 6);
}

export function tossHeldWeapon(fighter: Fighter, world: ItemWorld, particles: Particle[]) {
  if (!fighter.heldWeapon) return;
  const def = ITEM_DEFS[fighter.heldWeapon.kind];

  if (def.category === 'throwable') {
    throwBomb(fighter, def, world, particles);
    fighter.heldWeapon = null;
    sound.playBombThrow();
    return;
  }

  dropHeldWeapon(fighter, world, particles, fighter.facing * 9.5, -5.5);
  sound.playItemPickup();
  pushText(fighter.x, fighter.y - 34, 'TOSSED', '#94a3b8', particles);
}

export function useHeldWeapon(
  fighter: Fighter,
  input: InputState,
  world: ItemWorld,
  particles: Particle[],
  addScreenShake: (intensity: number, frames: number) => void
) {
  const held = fighter.heldWeapon;
  if (!held) return;
  const def = ITEM_DEFS[held.kind];

  if (def.category === 'ranged') {
    fireGun(fighter, def, world, particles);
    fighter.attack = {
      type: 'punch',
      frame: 0,
      totalFrames: def.totalFrames,
      startupFrames: 0,
      activeFrames: 0,
      hitLanded: true,
      weaponKind: def.kind,
      direction: 'forward',
    };
    fighter.currentAction = 'punch';
    fighter.vx -= fighter.facing * 0.9;
  } else if (def.category === 'throwable') {
    throwBomb(fighter, def, world, particles);
    fighter.attack = {
      type: 'punch',
      frame: 0,
      totalFrames: def.totalFrames,
      startupFrames: 0,
      activeFrames: 0,
      hitLanded: true,
      weaponKind: def.kind,
      direction: 'forward',
    };
    fighter.currentAction = 'punch';
    fighter.heldWeapon = null;
    return;
  } else {
    const isUp = input.up;
    const isDown = input.down && !fighter.isGrounded;
    fighter.attack = {
      type: 'punch',
      frame: 0,
      totalFrames: def.totalFrames,
      startupFrames: def.startupFrames,
      activeFrames: def.activeFrames,
      hitLanded: false,
      weaponKind: def.kind,
      direction: isDown ? 'down' : isUp ? 'up' : 'forward',
    };
    fighter.currentAction = 'punch';
    sound.playWeaponSwing(def.kind);
    if (def.kind === 'hammer') addScreenShake(3, 6);
  }

  held.usesLeft -= 1;
  if (held.usesLeft <= 0) {
    sound.playItemBreak();
    pushText(fighter.x, fighter.y - 38, 'BROKE!', '#94a3b8', particles);
    burst(fighter.x, fighter.y, def.glowColor, particles, 10);
    fighter.heldWeapon = null;
  }
}

export function updateProjectiles(
  world: ItemWorld,
  fighters: Fighter[],
  stage: Stage,
  particles: Particle[],
  addScreenShake: (intensity: number, frames: number) => void
) {
  for (let i = world.projectiles.length - 1; i >= 0; i--) {
    const proj = world.projectiles[i];
    proj.lifetime--;
    if (proj.ownerIgnoreFrames > 0) proj.ownerIgnoreFrames--;

    if (proj.kind === 'bomb') {
      proj.vy = Math.min(proj.vy + ITEM_GRAVITY, ITEM_TERMINAL);
    }

    proj.x += proj.vx;
    proj.y += proj.vy;

    const out =
      proj.x < stage.blastZone.left - 40 ||
      proj.x > stage.blastZone.right + 40 ||
      proj.y < stage.blastZone.top - 40 ||
      proj.y > stage.blastZone.bottom + 40;

    if (out || proj.lifetime <= 0) {
      if (proj.kind === 'bomb') {
        explodeBomb(proj, fighters, world, particles, addScreenShake);
      }
      world.projectiles.splice(i, 1);
      continue;
    }

    if (proj.kind === 'bomb') {
      bounceBomb(proj, stage);
      particles.push({
        x: proj.x + (Math.random() - 0.5) * 4,
        y: proj.y - 10,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -1.4,
        color: '#f97316',
        size: 2.5,
        alpha: 0.9,
        decay: 0.08,
        type: 'spark',
      });
    } else if (proj.lifetime % 2 === 0) {
      particles.push({
        x: proj.x,
        y: proj.y,
        vx: -proj.vx * 0.08,
        vy: (Math.random() - 0.5) * 0.8,
        color: proj.color,
        size: proj.kind === 'laser' ? 3 : 2.4,
        alpha: 0.7,
        decay: 0.12,
        type: 'spark',
      });
    }

    let consumed = false;
    for (const fighter of fighters) {
      if (!canBeHitByProjectile(fighter, proj)) continue;
      const dist = Math.hypot(proj.x - fighter.x, proj.y - fighter.y);
      const radius = proj.kind === 'bomb' ? 22 : proj.radius + fighter.width / 2;
      if (dist < radius) {
        if (proj.kind === 'bomb') {
          explodeBomb(proj, fighters, world, particles, addScreenShake);
        } else {
          applyProjectileHit(fighter, proj, proj.vx >= 0 ? 1 : -1, particles, addScreenShake);
        }
        consumed = true;
        break;
      }
    }

    if (consumed) {
      world.projectiles.splice(i, 1);
    }
  }
}

function fireGun(fighter: Fighter, def: ItemDef, world: ItemWorld, particles: Particle[]) {
  const isLaser = def.kind === 'raygun';
  world.projectiles.push({
    id: nextProjId++,
    kind: isLaser ? 'laser' : 'bullet',
    ownerIndex: fighter.playerIndex,
    x: fighter.x + fighter.facing * 30,
    y: fighter.y - 4,
    vx: fighter.facing * def.projectileSpeed,
    vy: 0,
    damage: def.damage,
    knockbackBase: def.knockbackBase,
    knockbackGrowth: def.knockbackGrowth,
    radius: def.hitRadius,
    lifetime: isLaser ? 48 : 70,
    color: def.color,
    ownerIgnoreFrames: 5,
    bounces: 0,
  });
  if (isLaser) sound.playLaser();
  else sound.playGunshot();
  burst(fighter.x + fighter.facing * 28, fighter.y - 4, def.glowColor, particles, 6);
}

function throwBomb(fighter: Fighter, def: ItemDef, world: ItemWorld, particles: Particle[]) {
  world.projectiles.push({
    id: nextProjId++,
    kind: 'bomb',
    ownerIndex: fighter.playerIndex,
    x: fighter.x + fighter.facing * 22,
    y: fighter.y - 6,
    vx: fighter.facing * def.projectileSpeed + fighter.vx * 0.35,
    vy: -7.5,
    damage: def.damage,
    knockbackBase: def.knockbackBase,
    knockbackGrowth: def.knockbackGrowth,
    radius: def.hitRadius,
    lifetime: 96,
    color: def.glowColor,
    ownerIgnoreFrames: 12,
    bounces: 0,
  });
  sound.playBombThrow();
  burst(fighter.x, fighter.y, '#fb7185', particles, 5);
}

function bounceBomb(proj: Projectile, stage: Stage) {
  for (const plat of stage.platforms) {
    const withinH = proj.x > plat.x - 8 && proj.x < plat.x + plat.width + 8;
    if (!withinH) continue;
    if (proj.vy >= 0 && proj.y >= plat.y - 10 && proj.y <= plat.y + 16) {
      proj.y = plat.y - 10;
      proj.vy *= -0.55;
      proj.vx *= 0.72;
      proj.bounces++;
      if (Math.abs(proj.vy) < 1.4) proj.vy = 0;
      if (proj.bounces >= 4) proj.lifetime = Math.min(proj.lifetime, 8);
    }
  }
}

function explodeBomb(
  proj: Projectile,
  fighters: Fighter[],
  _world: ItemWorld,
  particles: Particle[],
  addScreenShake: (intensity: number, frames: number) => void
) {
  sound.playBombExplode();
  addScreenShake(10, 16);
  burst(proj.x, proj.y, '#fb7185', particles, 18);
  burst(proj.x, proj.y, '#fbbf24', particles, 10);
  particles.push({
    x: proj.x,
    y: proj.y,
    vx: 0,
    vy: 0,
    color: '#fb7185',
    size: 18,
    alpha: 0.9,
    decay: 0.08,
    type: 'shockwave',
  });
  pushText(proj.x, proj.y - 28, 'BOOM!', '#fb7185', particles);

  for (const fighter of fighters) {
    if (fighter.stocks <= 0 || fighter.respawnTimer > 0 || fighter.invincibleFrames > 0) continue;
    const dist = Math.hypot(proj.x - fighter.x, proj.y - fighter.y);
    if (dist < proj.radius + fighter.width / 2) {
      const dir = fighter.x >= proj.x ? 1 : -1;
      applyProjectileHit(fighter, proj, dir as 1 | -1, particles, addScreenShake);
    }
  }
}

function applyProjectileHit(
  fighter: Fighter,
  proj: Projectile,
  dir: 1 | -1,
  particles: Particle[],
  addScreenShake: (intensity: number, frames: number) => void
) {
  fighter.damagePercent += proj.damage;
  const pct = fighter.damagePercent;
  const wt = fighter.stats.weight;
  fighter.vx = dir * ((proj.knockbackBase + pct * proj.knockbackGrowth) / wt) * KNOCKBACK_SCALE;
  fighter.vy = -((proj.knockbackBase * 0.5 + pct * proj.knockbackGrowth * 0.42) / wt) * KNOCKBACK_SCALE;
  fighter.hitstun = Math.floor(14 + pct * 0.18);
  fighter.currentAction = 'hitstun';
  fighter.attack = null;
  fighter.isGrounded = false;
  addScreenShake(Math.min(10, 4 + pct * 0.04), 8);
  burst(fighter.x, fighter.y, proj.color, particles, 10);
  pushText(fighter.x, fighter.y - 24, `${proj.damage}%`, proj.color, particles);
}

function canPickup(fighter: Fighter): boolean {
  return (
    fighter.stocks > 0 &&
    fighter.respawnTimer <= 0 &&
    fighter.hitstun <= 0 &&
    fighter.grab.role === 'none' &&
    !fighter.ledgeHang &&
    fighter.currentAction !== 'respawning'
  );
}

function canBeHitByProjectile(fighter: Fighter, proj: Projectile): boolean {
  if (fighter.stocks <= 0 || fighter.respawnTimer > 0 || fighter.invincibleFrames > 0) return false;
  if (fighter.grab.role === 'grabbed') return false;
  if (proj.ownerIndex === fighter.playerIndex && proj.ownerIgnoreFrames > 0) return false;
  return true;
}

function landItemOnPlatforms(item: WorldItem, stage: Stage) {
  item.isGrounded = false;
  const feetY = item.y + 12;
  const prevFeetY = feetY - item.vy;

  for (const plat of stage.platforms) {
    const withinH = item.x > plat.x - 6 && item.x < plat.x + plat.width + 6;
    if (!withinH) continue;
    if (item.vy >= 0 && prevFeetY <= plat.y + 10 && feetY >= plat.y) {
      item.y = plat.y - 12;
      item.vy = 0;
      item.vx *= 0.55;
      item.isGrounded = true;
      return;
    }
  }
}

function burst(x: number, y: number, color: string, particles: Particle[], count: number) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      size: 3 + Math.random() * 4,
      alpha: 1,
      decay: 0.05,
      type: 'spark',
    });
  }
}

function pushText(x: number, y: number, text: string, color: string, particles: Particle[]) {
  particles.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 1.2,
    vy: -2,
    color,
    size: 16,
    alpha: 1,
    decay: 0.025,
    type: 'text',
    text,
  });
}
