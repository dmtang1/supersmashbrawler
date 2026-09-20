import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { InputState, TouchMoveStyle } from '../types';

interface TouchControlsProps {
  visible: boolean;
  /** Joystick drag pad or discrete 4-arrow D-pad. */
  moveStyle?: TouchMoveStyle;
  onVirtualKey: (action: keyof InputState, isDown: boolean) => void;
  /** Clear all held virtual inputs (pause, hide, unmount). */
  onReleaseAll: () => void;
}

const ACTION_CODES: Record<keyof InputState, string> = {
  up: 'KeyW',
  down: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  punch: 'Space',
  kick: 'KeyC',
  grab: 'KeyV',
  block: 'KeyB',
  sprint: 'ShiftLeft',
  special: 'KeyF',
};

type DirKey = 'up' | 'down' | 'left' | 'right';

/**
 * Landscape two-thumb layout for platform fighters:
 * - Left thumb arc: virtual joystick (lower-left)
 * - Right thumb arc: sprint + jump + attacks + guard (lower-right)
 * Overlay uses pointer-events-none except on controls so the
 * center of the arena stays visible and tappable for focus.
 */
export const TouchControls: React.FC<TouchControlsProps> = ({
  visible,
  moveStyle = 'joystick',
  onVirtualKey,
  onReleaseAll,
}) => {
  const [pressed, setPressed] = useState<Partial<Record<keyof InputState, boolean>>>({});
  /** Knob offset from joystick center, in px (clamped to travel radius). */
  const [stickOffset, setStickOffset] = useState({ x: 0, y: 0 });
  const [stickActive, setStickActive] = useState(false);
  const dirsHeld = useRef<Set<DirKey>>(new Set());
  /** Jump face-button holds `up` independently from the stick so aerials work while moving. */
  const jumpButtonHeld = useRef(false);
  const stickPointerId = useRef<number | null>(null);
  const stickOrigin = useRef<{ x: number; y: number } | null>(null);
  const actionPointers = useRef<Map<number, keyof InputState>>(new Map());
  /** D-pad: which pointer owns which direction(s) (diagonals hold two). */
  const dpadPointers = useRef<Map<number, DirKey[]>>(new Map());

  const setAction = useCallback(
    (action: keyof InputState, isDown: boolean) => {
      setPressed((prev) => (prev[action] === isDown ? prev : { ...prev, [action]: isDown }));
      onVirtualKey(action, isDown);
    },
    [onVirtualKey]
  );

  const publishUp = useCallback(() => {
    const want = jumpButtonHeld.current || dirsHeld.current.has('up');
    setAction('up', want);
  }, [setAction]);

  const syncDirections = useCallback(
    (next: Set<DirKey>) => {
      (['down', 'left', 'right'] as DirKey[]).forEach((dir) => {
        const want = next.has(dir);
        const had = dirsHeld.current.has(dir);
        if (want !== had) {
          setAction(dir, want);
        }
      });
      dirsHeld.current = new Set(next);
      publishUp();
    },
    [publishUp, setAction]
  );

  /**
   * Map stick vector → discrete directions the game expects.
   *
   * Jump (`up`) is gated harder than left/right/down: mild forward diagonals
   * used to trip accidental jumps. Prefer the Jump face-button for hop-while-running;
   * stick-up still works when the tilt is clearly vertical.
   */
  const directionsFromOffset = (dx: number, dy: number, maxTravel: number): Set<DirKey> => {
    const next = new Set<DirKey>();
    const dead = maxTravel * 0.28;
    const dist = Math.hypot(dx, dy);
    if (dist < dead) return next;

    const ax = Math.abs(dx);
    const ay = Math.abs(dy);

    if (ax >= dead * 0.7) next.add(dx < 0 ? 'left' : 'right');

    // Down stays relatively easy (crouch / drop-through).
    if (dy > 0 && ay >= dead * 0.7) next.add('down');

    // Up (jump): require deeper travel + a steeper-than-~45° angle when also
    // holding left/right, so slight upward drift while running doesn't hop.
    const upMin = maxTravel * 0.48;
    const steepEnough = ax < dead * 0.55 || ay >= ax * 1.15;
    if (dy < 0 && ay >= upMin && steepEnough) next.add('up');

    if (next.size === 0) {
      if (ax >= ay) next.add(dx < 0 ? 'left' : 'right');
      else if (dy > 0) next.add('down');
      // Do not fall back to stick-up from a weak vertical bias — use Jump button.
    }
    return next;
  };

  const clampStick = (dx: number, dy: number, maxTravel: number) => {
    const dist = Math.hypot(dx, dy);
    if (dist <= maxTravel || dist === 0) return { x: dx, y: dy };
    const scale = maxTravel / dist;
    return { x: dx * scale, y: dy * scale };
  };

  const applyStick = (clientX: number, clientY: number, baseRadius: number) => {
    if (!stickOrigin.current) return;
    const rawX = clientX - stickOrigin.current.x;
    const rawY = clientY - stickOrigin.current.y;
    // Knob travel stays inside the base (leave room for knob radius ~35% of base)
    const maxTravel = baseRadius * 0.62;
    const clamped = clampStick(rawX, rawY, maxTravel);
    setStickOffset(clamped);
    setStickActive(true);
    syncDirections(directionsFromOffset(clamped.x, clamped.y, maxTravel));
  };

  const resetStick = () => {
    stickPointerId.current = null;
    stickOrigin.current = null;
    setStickOffset({ x: 0, y: 0 });
    setStickActive(false);
    syncDirections(new Set());
  };

  const releaseAll = useCallback(() => {
    stickPointerId.current = null;
    stickOrigin.current = null;
    jumpButtonHeld.current = false;
    actionPointers.current.clear();
    dpadPointers.current.clear();
    dirsHeld.current = new Set();
    setStickOffset({ x: 0, y: 0 });
    setStickActive(false);
    (Object.keys(ACTION_CODES) as (keyof InputState)[]).forEach((action) => {
      setAction(action, false);
    });
    onReleaseAll();
  }, [onReleaseAll, setAction]);

  useEffect(() => {
    if (!visible) {
      releaseAll();
    }
  }, [visible, releaseAll]);

  // Clear movement when switching joystick ↔ D-pad so no stuck directions linger.
  useEffect(() => {
    stickPointerId.current = null;
    stickOrigin.current = null;
    dpadPointers.current.clear();
    setStickOffset({ x: 0, y: 0 });
    setStickActive(false);
    syncDirections(new Set());
  }, [moveStyle, syncDirections]);

  // Release stuck inputs only on unmount (not when releaseAll identity changes)
  useEffect(() => {
    return () => {
      onReleaseAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Safety: release stuck inputs if the tab blurs mid-press
  useEffect(() => {
    const onBlur = () => releaseAll();
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [releaseAll]);

  if (!visible) return null;

  const onStickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    stickPointerId.current = e.pointerId;
    const rect = el.getBoundingClientRect();
    stickOrigin.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const baseRadius = Math.min(rect.width, rect.height) / 2;
    applyStick(e.clientX, e.clientY, baseRadius);
  };

  const onStickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stickPointerId.current !== e.pointerId || !stickOrigin.current) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const baseRadius = Math.min(rect.width, rect.height) / 2;
    applyStick(e.clientX, e.clientY, baseRadius);
  };

  const onStickPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stickPointerId.current !== e.pointerId) return;
    resetStick();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const bindAction = (action: keyof InputState) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      actionPointers.current.set(e.pointerId, action);
      if (action === 'up') {
        jumpButtonHeld.current = true;
        publishUp();
      } else {
        setAction(action, true);
      }
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      const mapped = actionPointers.current.get(e.pointerId);
      if (mapped) {
        if (mapped === 'up') {
          jumpButtonHeld.current = false;
          publishUp();
        } else {
          setAction(mapped, false);
        }
        actionPointers.current.delete(e.pointerId);
      }
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    },
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => {
      const mapped = actionPointers.current.get(e.pointerId);
      if (mapped) {
        if (mapped === 'up') {
          jumpButtonHeld.current = false;
          publishUp();
        } else {
          setAction(mapped, false);
        }
        actionPointers.current.delete(e.pointerId);
      }
    },
  });

  const rebuildDpadDirs = () => {
    const next = new Set<DirKey>();
    dpadPointers.current.forEach((dirs) => {
      dirs.forEach((dir) => next.add(dir));
    });
    syncDirections(next);
  };

  const bindDpad = (...dirs: DirKey[]) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dpadPointers.current.set(e.pointerId, dirs);
      rebuildDpadDirs();
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (dpadPointers.current.has(e.pointerId)) {
        dpadPointers.current.delete(e.pointerId);
        rebuildDpadDirs();
      }
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    },
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (dpadPointers.current.has(e.pointerId)) {
        dpadPointers.current.delete(e.pointerId);
        rebuildDpadDirs();
      }
    },
  });

  const actActive = (a: keyof InputState) =>
    a === 'up' ? jumpButtonHeld.current : !!pressed[a];

  const dirActive = (dir: DirKey) => !!pressed[dir];

  const diagActive = (a: DirKey, b: DirKey) => !!pressed[a] && !!pressed[b];

  return (
    <div
      id="touch-controls-overlay"
      className="pointer-events-none absolute inset-0 z-30"
      style={{
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.35rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.35rem, env(safe-area-inset-right, 0px))',
      }}
      aria-hidden={!visible}
    >
      {/* LEFT: joystick or D-pad (cardinals + up-diagonals) */}
      <div className="pointer-events-none absolute bottom-2 left-2 sm:bottom-3 sm:left-3">
        {moveStyle === 'dpad' ? (
          <div
            id="touch-dpad"
            className="pointer-events-none relative"
            style={{
              width: `${DPAD.padW}rem`,
              height: `${DPAD.padH}rem`,
            }}
            aria-label="Movement D-pad"
          >
            <DpadButton
              id="touch-dpad-up-left"
              label="Up Left"
              active={diagActive('up', 'left')}
              size="sm"
              style={dpadCenter(DPAD.upLeft.x, DPAD.upLeft.y)}
              {...bindDpad('up', 'left')}
            >
              <ArrowUpLeft className="w-5 h-5" strokeWidth={2.75} />
            </DpadButton>
            <DpadButton
              id="touch-dpad-up-right"
              label="Up Right"
              active={diagActive('up', 'right')}
              size="sm"
              style={dpadCenter(DPAD.upRight.x, DPAD.upRight.y)}
              {...bindDpad('up', 'right')}
            >
              <ArrowUpRight className="w-5 h-5" strokeWidth={2.75} />
            </DpadButton>
            <DpadButton
              id="touch-dpad-up"
              label="Up"
              active={dirActive('up') && !dirActive('left') && !dirActive('right')}
              style={dpadCenter(DPAD.up.x, DPAD.up.y)}
              {...bindDpad('up')}
            >
              <ArrowUp className="w-6 h-6" strokeWidth={2.75} />
            </DpadButton>
            <DpadButton
              id="touch-dpad-left"
              label="Left"
              active={dirActive('left') && !dirActive('up')}
              style={dpadCenter(DPAD.left.x, DPAD.left.y)}
              {...bindDpad('left')}
            >
              <ArrowLeft className="w-6 h-6" strokeWidth={2.75} />
            </DpadButton>
            <DpadButton
              id="touch-dpad-right"
              label="Right"
              active={dirActive('right') && !dirActive('up')}
              style={dpadCenter(DPAD.right.x, DPAD.right.y)}
              {...bindDpad('right')}
            >
              <ArrowRight className="w-6 h-6" strokeWidth={2.75} />
            </DpadButton>
            <DpadButton
              id="touch-dpad-down"
              label="Down"
              active={dirActive('down')}
              style={dpadCenter(DPAD.down.x, DPAD.down.y)}
              {...bindDpad('down')}
            >
              <ArrowDown className="w-6 h-6" strokeWidth={2.75} />
            </DpadButton>
          </div>
        ) : (
          <div
            id="touch-joystick"
            role="slider"
            aria-label="Movement joystick"
            className="pointer-events-auto relative touch-none select-none rounded-full"
            style={{ width: 'min(42vw, 168px)', height: 'min(42vw, 168px)' }}
            onPointerDown={onStickPointerDown}
            onPointerMove={onStickPointerMove}
            onPointerUp={onStickPointerEnd}
            onPointerCancel={onStickPointerEnd}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Base */}
            <div
              className={`absolute inset-0 rounded-full border backdrop-blur-[2px] shadow-[0_4px_20px_rgba(0,0,0,0.35)] transition-colors ${
                stickActive
                  ? 'bg-slate-950/45 border-sky-400/40'
                  : 'bg-slate-950/35 border-white/15'
              }`}
            />
            {/* Subtle ring guide */}
            <div className="absolute inset-[18%] rounded-full border border-white/10" />

            {/* Movable knob */}
            <div
              className={`absolute left-1/2 top-1/2 h-[38%] w-[38%] rounded-full border shadow-[0_2px_12px_rgba(0,0,0,0.45)] ${
                stickActive
                  ? 'bg-sky-400/70 border-sky-100/80'
                  : 'bg-white/25 border-white/35'
              }`}
              style={{
                transform: `translate(calc(-50% + ${stickOffset.x}px), calc(-50% + ${stickOffset.y}px))`,
                transition: stickActive ? 'none' : 'transform 120ms ease-out',
              }}
            />
          </div>
        )}
      </div>

      {/*
        RIGHT: Kick/Punch thumb rest + arc satellites.
        Positions use rem centers with a fixed gap so buttons never overlap.
      */}
      <div
        className="pointer-events-none absolute bottom-1 right-1 sm:bottom-2 sm:right-2"
        style={{
          width: 'min(72vw, 17.75rem)',
          height: 'min(60vw, 15.25rem)',
        }}
      >
        <ActionButton
          id="touch-special"
          label="Super"
          active={actActive('special')}
          tone="amber"
          size="md"
          style={btnCenter(BTN.super.r, BTN.super.b)}
          {...bindAction('special')}
        />
        <ActionButton
          id="touch-sprint"
          label="Sprint"
          active={actActive('sprint')}
          tone="violet"
          size="md"
          style={btnCenter(BTN.sprint.r, BTN.sprint.b)}
          {...bindAction('sprint')}
        />
        <ActionButton
          id="touch-grab"
          label="Grab"
          active={actActive('grab')}
          tone="sky"
          size="md"
          style={btnCenter(BTN.grab.r, BTN.grab.b)}
          {...bindAction('grab')}
        />
        <ActionButton
          id="touch-jump"
          label="Jump"
          active={actActive('up')}
          tone="sky"
          size="lg"
          style={btnCenter(BTN.jump.r, BTN.jump.b)}
          {...bindAction('up')}
        />
        <ActionButton
          id="touch-block"
          label="Block"
          active={actActive('block')}
          tone="cyan"
          size="lg"
          style={btnCenter(BTN.block.r, BTN.block.b)}
          {...bindAction('block')}
        />
        <ActionButton
          id="touch-kick"
          label="Kick"
          active={actActive('kick')}
          tone="rose"
          size="xl"
          style={btnCenter(BTN.kick.r, BTN.kick.b)}
          {...bindAction('kick')}
        />
        <ActionButton
          id="touch-punch"
          label="Punch"
          active={actActive('punch')}
          tone="amber"
          size="xl"
          style={btnCenter(BTN.punch.r, BTN.punch.b)}
          {...bindAction('punch')}
        />
      </div>
    </div>
  );
};

/** Center a D-pad button from the pad's top-left (rem). */
function dpadCenter(xRem: number, yRem: number): React.CSSProperties {
  return {
    position: 'absolute',
    left: `${xRem}rem`,
    top: `${yRem}rem`,
    transform: 'translate(-50%, -50%)',
  };
}

/**
 * D-pad geometry: adjacent buttons keep GAP clear air (not just opposite ones).
 * Cardinals use a wider cross spacing so corners don't collide; diagonals sit further out.
 */
const DPAD = (() => {
  const MD = 3.5;
  const SM = 3.0;
  const GAP = 0.85;
  // Adjacent cardinals need center distance >= MD + GAP
  const cardinalOffset = (MD + GAP) / Math.SQRT2;
  // Diagonals clear of neighboring cardinals
  const diagNeed = SM / 2 + MD / 2 + GAP;
  let diagR = cardinalOffset + 0.35;
  while (Math.hypot(diagR, diagR - cardinalOffset) < diagNeed) {
    diagR += 0.05;
  }

  const cx = SM / 2 + diagR;
  const cy = SM / 2 + diagR;

  const upLeft = { x: cx - diagR, y: cy - diagR };
  const upRight = { x: cx + diagR, y: cy - diagR };
  const up = { x: cx, y: cy - cardinalOffset };
  const left = { x: cx - cardinalOffset, y: cy };
  const right = { x: cx + cardinalOffset, y: cy };
  const down = { x: cx, y: cy + cardinalOffset };

  const padW = upRight.x + SM / 2;
  const padH = down.y + MD / 2;

  return { MD, SM, padW, padH, upLeft, upRight, up, left, right, down };
})();

/** Button diameters in rem — must match ActionButton size classes. */
const SZ = { xl: 5.5, lg: 4.25, md: 3.6 } as const;
/** Clear air between nearest edges (mis-tap buffer). */
const GAP = 0.75;

const half = (d: number) => d / 2;

/** Center position from the bottom-right corner of the cluster. */
function btnCenter(rightRem: number, bottomRem: number): React.CSSProperties {
  return {
    position: 'absolute',
    right: `${rightRem}rem`,
    bottom: `${bottomRem}rem`,
    transform: 'translate(50%, 50%)',
  };
}

/**
 * Layout (centers), thumb rest at bottom-right:
 *
 *        Super
 *     Sprint
 *  Grab   Block  Jump
 *       Kick  Punch
 *
 * Each neighbor is at least GAP rem apart edge-to-edge.
 */
const BTN = (() => {
  const punch = { r: half(SZ.xl), b: half(SZ.xl) };
  const kick = {
    r: half(SZ.xl) + SZ.xl + GAP,
    b: half(SZ.xl),
  };
  // Jump / Block sit one clear gap above Punch / Kick
  const jump = {
    r: punch.r,
    b: half(SZ.xl) + half(SZ.xl) + half(SZ.lg) + GAP,
  };
  const block = {
    r: kick.r,
    b: jump.b,
  };
  // Outer thumb arc left of Kick: Grab → Sprint → Super
  const grab = {
    r: kick.r + half(SZ.xl) + half(SZ.md) + GAP,
    b: half(SZ.xl),
  };
  const sprint = {
    r: grab.r + 0.35,
    b: grab.b + SZ.md + GAP,
  };
  const special = {
    r: kick.r + half(SZ.xl) + half(SZ.md) + GAP * 0.35,
    b: block.b + half(SZ.lg) + half(SZ.md) + GAP,
  };
  return { punch, kick, jump, block, grab, sprint, super: special };
})();

type ActionTone = 'amber' | 'rose' | 'sky' | 'cyan' | 'violet';
type ActionSize = 'md' | 'lg' | 'xl';

function ActionButton({
  id,
  label,
  active,
  tone,
  size,
  className = '',
  style,
  ...handlers
}: {
  id: string;
  label: string;
  active: boolean;
  tone: ActionTone;
  size: ActionSize;
  className?: string;
  style?: React.CSSProperties;
} & React.HTMLAttributes<HTMLButtonElement>) {
  const tones: Record<ActionTone, { idle: string; on: string }> = {
    amber: {
      idle: 'bg-slate-950/40 border-amber-400/45 text-amber-100',
      on: 'bg-amber-400/75 border-amber-200 text-slate-950',
    },
    rose: {
      idle: 'bg-slate-950/40 border-rose-400/45 text-rose-100',
      on: 'bg-rose-400/75 border-rose-200 text-slate-950',
    },
    sky: {
      idle: 'bg-slate-950/40 border-sky-400/45 text-sky-100',
      on: 'bg-sky-400/75 border-sky-200 text-slate-950',
    },
    cyan: {
      idle: 'bg-slate-950/40 border-cyan-400/45 text-cyan-100',
      on: 'bg-cyan-400/75 border-cyan-200 text-slate-950',
    },
    violet: {
      idle: 'bg-slate-950/40 border-violet-400/45 text-violet-100',
      on: 'bg-violet-400/75 border-violet-200 text-slate-950',
    },
  };

  // Diameters must stay in sync with SZ above.
  const dims: Record<ActionSize, string> = {
    xl: 'w-[5.5rem] h-[5.5rem] min-w-[5.5rem] min-h-[5.5rem] text-sm px-2',
    lg: 'w-[4.25rem] h-[4.25rem] min-w-[4.25rem] min-h-[4.25rem] text-xs px-2',
    md: 'w-[3.6rem] h-[3.6rem] min-w-[3.6rem] min-h-[3.6rem] text-[11px] px-1.5',
  };

  return (
    <button
      id={id}
      type="button"
      aria-label={label}
      style={style}
      className={`pointer-events-auto touch-none select-none rounded-full border font-black uppercase tracking-wide backdrop-blur-[2px] shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-colors flex items-center justify-center leading-tight ${dims[size]} ${
        active ? tones[tone].on : tones[tone].idle
      } ${className}`}
      onContextMenu={(e) => e.preventDefault()}
      {...handlers}
    >
      {label}
    </button>
  );
}

function DpadButton({
  id,
  label,
  active,
  size = 'md',
  className = '',
  style,
  children,
  ...handlers
}: {
  id: string;
  label: string;
  active: boolean;
  size?: 'sm' | 'md';
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLButtonElement>) {
  // Diameters must stay in sync with DPAD.MD / DPAD.SM
  const dims = size === 'sm' ? 'w-[3rem] h-[3rem]' : 'w-[3.5rem] h-[3.5rem]';
  return (
    <button
      id={id}
      type="button"
      aria-label={label}
      style={style}
      className={`pointer-events-auto touch-none select-none rounded-2xl border backdrop-blur-[2px] shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-colors flex items-center justify-center ${dims} ${
        active
          ? 'bg-sky-400/75 border-sky-100 text-slate-950'
          : 'bg-slate-950/40 border-white/20 text-sky-100'
      } ${className}`}
      onContextMenu={(e) => e.preventDefault()}
      {...handlers}
    >
      {children}
    </button>
  );
}
