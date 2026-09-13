export type FighterId = 'brawler' | 'striker' | 'titan' | 'shinobi' | 'zephyr' | 'yeti';

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

export interface AttackState {
  type: 'punch' | 'kick' | 'grab' | 'throw_fwd' | 'throw_back' | 'throw_up' | 'throw_down';
  frame: number;
  totalFrames: number;
  startupFrames: number;
  activeFrames: number;
  hitLanded: boolean;
  hitTargets?: number[];
  direction?: 'up' | 'down' | 'forward' | 'back' | 'neutral';
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
  sprint: boolean;
}
