export type FighterId =
  | 'brawler'
  | 'striker'
  | 'titan'
  | 'shinobi'
  | 'zephyr'
  | 'yeti'
  | 'monk'
  | 'lotus';

export interface FighterStats {
  id: FighterId;
  name: string;
  tagline: string;
  color: string;
  secondaryColor: string;
  glowColor: string;
  weight: number; // 0.8 to 1.3 (heavier takes less knockback)
  walkSpeed: number;
  sprintSpeed: number;
  jumpForce: number;
  doubleJumps: number;
  punchDamage: number;
  kickDamage: number;
  throwDamage: number;
  description: string;
  specialAbility: {
    name: string;
    badge: string;
    description: string;
    icon?: string;
  };
  /** Unique finisher — only this fighter can perform it (Special button when meter is full). */
  superMove: {
    name: string;
    description: string;
  };
  accessories: string[];
}

export type ActionType =
  | 'idle'
  | 'walk'
  | 'sprint'
  | 'jump'
  | 'fall'
  | 'crouch'
  | 'punch'
  | 'kick'
  | 'super'
  | 'block'
  | 'grab'
  | 'grabbed'
  | 'throw_fwd'
  | 'throw_back'
  | 'throw_up'
  | 'throw_down'
  | 'hitstun'
  | 'respawning'
  | 'ledge_hang'
  | 'ledge_climb';

/** Hitting this damage % instantly explodes the fighter and costs a stock. */
export const PERCENT_KO_THRESHOLD = 150;

/** Sprint stamina pool. Drains while dashing, regenerates while walking/idle. */
export const SPRINT_STAMINA_MAX = 100;

/** Super meter fills from damage dealt/taken; Special fires the unique finisher at 100. */
export const SUPER_METER_MAX = 100;
/** Meter from damage dealt — ~100–120% dealt alone fills the bar (~1 super per stock). */
export const SUPER_METER_GAIN_DEALT = 0.85;
/** Comeback meter from damage taken (milder than dealt so aggression stays the main path). */
export const SUPER_METER_GAIN_TAKEN = 0.4;
/** Soft floor so very defensive matches still unlock a super (~0.2/sec at 60fps). */
export const SUPER_METER_PASSIVE_PER_FRAME = 0.2 / 60;
/** Flat meter on grab pummel (dealt / taken). */
export const SUPER_METER_PUMMEL_DEALT = 2.5;
export const SUPER_METER_PUMMEL_TAKEN = 1;
/** Meter kept after a KO (progress isn't fully wiped). */
export const SUPER_METER_ON_KO_KEEP = 55;

export type ItemKind = 'blaster' | 'raygun' | 'sword' | 'beam_sword' | 'hammer' | 'bat' | 'bomb';
export type ItemCategory = 'ranged' | 'melee' | 'throwable';

export interface HeldWeapon {
  kind: ItemKind;
  usesLeft: number;
}

export interface WorldItem {
  id: number;
  kind: ItemKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isGrounded: boolean;
  lifetime: number;
  bob: number;
  pickupLock: number;
}

export interface Projectile {
  id: number;
  kind: 'bullet' | 'laser' | 'bomb';
  ownerIndex: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  knockbackBase: number;
  knockbackGrowth: number;
  radius: number;
  lifetime: number;
  color: string;
  ownerIgnoreFrames: number;
  bounces: number;
}

export interface ItemWorld {
  items: WorldItem[];
  projectiles: Projectile[];
}

export interface AttackState {
  type: 'punch' | 'kick' | 'grab' | 'throw_fwd' | 'throw_back' | 'throw_up' | 'throw_down' | 'super';
  frame: number;
  totalFrames: number;
  startupFrames: number;
  activeFrames: number;
  hitLanded: boolean;
  hitTargets?: number[];
  direction?: 'up' | 'down' | 'forward' | 'back' | 'neutral';
  weaponKind?: ItemKind;
  /** Extra hits already applied this super (lotus / monk multi-hit). */
  superHitCount?: number;
}

export interface GrabInfo {
  role: 'none' | 'grabber' | 'grabbed';
  targetIndex?: number;
  duration: number; // frames remaining until auto-break
  maxDuration: number;
}

export interface Fighter {
  playerIndex: number; // 0 for P1, 1 for P2/CPU
  isCpu: boolean;
  stats: FighterStats;
  
  // Physics & Position
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  facing: 1 | -1; // 1 = right, -1 = left
  isGrounded: boolean;
  onDropThroughPlatform: boolean;
  dropThroughTimer: number;

  // Jump
  doubleJumpsLeft: number;
  jumpReleased?: boolean;
  isSprinting: boolean;
  sprintStamina: number;
  isCrouching: boolean;

  // Battle State
  damagePercent: number;
  stocks: number;
  currentAction: ActionType;
  actionTimer: number;
  attack: AttackState | null;
  grab: GrabInfo;
  hitstun: number;
  invincibleFrames: number;
  respawnTimer: number;

  // Ledge Grab State
  ledgeHang?: {
    platformX: number;
    platformY: number;
    platformWidth: number;
    side: 'left' | 'right';
    timer: number;
  } | null;
  ledgeCooldownTimer?: number;

  // Visual effects & Creature Status
  trailPositions: { x: number; y: number; alpha: number }[];
  bouncedOnGround: boolean;

  // Creature Special Mechanics & Accessories
  isGliding?: boolean;
  glideFuel?: number; // for flying creatures
  frostbiteTimer?: number; // slowed by Yeti
  burnTimer?: number; // ignited by Brawler
  staticCharge?: number; // 0 to 100 for Striker
  shadowPhaseTimer?: number; // intangible dash for Shinobi
  hasSuperArmor?: boolean; // Titan heavy poise
  wingFlapTick?: number;
  tipsyCharge?: number; // 0 to 100 for Aaron (monk) drunken sway
  tipsyTimer?: number; // stumble/wobble inflicted by monk
  lightningKickFlash?: number; // brief VFX after Lyla lightning kick hit
  /** 0–100 unique super meter (Special / F). */
  superMeter: number;
  /** Hard freeze from Yeti Glacial Lock — no movement until it expires. */
  freezeTimer?: number;
  /** Brief glow after firing a super. */
  superFlash?: number;

  // Smash-style item / weapon currently in hand
  heldWeapon: HeldWeapon | null;
}

export interface Platform {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isDropThrough: boolean;
  color?: string;
  borderColor?: string;
}

export interface Stage {
  id: string;
  name: string;
  subtitle: string;
  width: number;
  height: number;
  blastZone: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  platforms: Platform[];
  spawnPoints: { x: number; y: number }[];
  theme: 'battlefield' | 'destination' | 'cyber';
  bgGradient: [string, string];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  type: 'spark' | 'smoke' | 'ring' | 'shockwave' | 'text' | 'lightning';
  text?: string;
  rotation?: number;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
  targetZoom: number;
  shakeTimer: number;
  shakeIntensity: number;
}

export type GameMode = 'cpu' | '2p' | 'training';

export interface GameSettings {
  mode: GameMode;
  cpuLevel: number; // 1 to 9
  stocks: number;
  /** Match time limit in seconds (countdown). */
  matchDuration: number;
  stageId: string;
  playerCount: 2 | 3 | 4;
  p1Fighter: FighterId;
  p2Fighter: FighterId;
  p3Fighter: FighterId;
  p4Fighter: FighterId;
  soundEnabled: boolean;
  musicEnabled: boolean;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  punch: boolean;
  kick: boolean;
  grab: boolean;
  block: boolean;
  sprint: boolean;
  /** Fire unique super when meter is full (P1: F, P2: ;). */
  special: boolean;
}
