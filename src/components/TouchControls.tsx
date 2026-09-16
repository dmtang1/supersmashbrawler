import React, { useCallback, useEffect, useRef, useState } from 'react';
import { InputState } from '../types';

interface TouchControlsProps {
  visible: boolean;
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
};

type DirKey = 'up' | 'down' | 'left' | 'right';

/**
 * Landscape two-thumb layout for platform fighters:
 * - Left thumb arc: movement D-pad + sprint (lower-left)
 * - Right thumb arc: jump + attacks + guard (lower-right)
 * Overlay uses pointer-events-none except on controls so the
 * center of the arena stays visible and tappable for focus.
 */
export const TouchControls: React.FC<TouchControlsProps> = ({
  visible,
  onVirtualKey,
  onReleaseAll,
}) => {
  const [pressed, setPressed] = useState<Partial<Record<keyof InputState, boolean>>>({});
  const dirsHeld = useRef<Set<DirKey>>(new Set());
  /** Jump face-button holds `up` independently from the D-pad so aerials work while moving. */
  const jumpButtonHeld = useRef(false);
  const padPointerId = useRef<number | null>(null);
  const padOrigin = useRef<{ x: number; y: number } | null>(null);
  const actionPointers = useRef<Map<number, keyof InputState>>(new Map());

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

  const directionsFromOffset = (dx: number, dy: number, radius: number): Set<DirKey> => {
    const next = new Set<DirKey>();
    const dead = radius * 0.22;
    const dist = Math.hypot(dx, dy);
    if (dist < dead) return next;

    // Prefer cardinal axes; allow diagonals when both axes clear the dead zone.
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    const gate = dead * 0.85;

    if (ax >= gate && ax >= ay * 0.55) {
      next.add(dx < 0 ? 'left' : 'right');
    }
    if (ay >= gate && ay >= ax * 0.55) {
      next.add(dy < 0 ? 'up' : 'down');
    }
    // If somehow empty after leaving deadzone, snap to dominant axis
    if (next.size === 0) {
      if (ax >= ay) next.add(dx < 0 ? 'left' : 'right');
      else next.add(dy < 0 ? 'up' : 'down');
    }
    return next;
  };

  const releaseAll = useCallback(() => {
    padPointerId.current = null;
    padOrigin.current = null;
    jumpButtonHeld.current = false;
    actionPointers.current.clear();
    dirsHeld.current = new Set();
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

  const onPadPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    padPointerId.current = e.pointerId;
    const rect = el.getBoundingClientRect();
    const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    padOrigin.current = origin;
    const radius = Math.min(rect.width, rect.height) / 2;
    syncDirections(directionsFromOffset(e.clientX - origin.x, e.clientY - origin.y, radius));
  };

  const onPadPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (padPointerId.current !== e.pointerId || !padOrigin.current) return;
    e.preventDefault();
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) / 2;
    syncDirections(
      directionsFromOffset(e.clientX - padOrigin.current.x, e.clientY - padOrigin.current.y, radius)
    );
  };

  const onPadPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (padPointerId.current !== e.pointerId) return;
    padPointerId.current = null;
    padOrigin.current = null;
    syncDirections(new Set());
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

  const dirActive = (d: DirKey) => dirsHeld.current.has(d);
  const actActive = (a: keyof InputState) =>
    a === 'up' ? jumpButtonHeld.current : !!pressed[a];

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
      {/* LEFT: movement (thumb zone) — keeps center stage clear */}
      <div className="pointer-events-none absolute bottom-2 left-2 sm:bottom-3 sm:left-3 flex flex-col items-center gap-2">
        <div
          id="touch-dpad"
          className="pointer-events-auto relative touch-none select-none rounded-full"
          style={{ width: 'min(42vw, 168px)', height: 'min(42vw, 168px)' }}
          onPointerDown={onPadPointerDown}
          onPointerMove={onPadPointerMove}
          onPointerUp={onPadPointerEnd}
          onPointerCancel={onPadPointerEnd}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Base ring */}
          <div className="absolute inset-0 rounded-full bg-slate-950/35 border border-white/15 backdrop-blur-[2px] shadow-[0_4px_20px_rgba(0,0,0,0.35)]" />
          {/* Cross guides */}
          <div className="absolute left-1/2 top-[12%] bottom-[12%] w-px -translate-x-1/2 bg-white/10" />
          <div className="absolute top-1/2 left-[12%] right-[12%] h-px -translate-y-1/2 bg-white/10" />

          <DpadGlyph dir="up" active={dirActive('up')} className="top-[8%] left-1/2 -translate-x-1/2" />
          <DpadGlyph dir="down" active={dirActive('down')} className="bottom-[8%] left-1/2 -translate-x-1/2" />
          <DpadGlyph dir="left" active={dirActive('left')} className="left-[8%] top-1/2 -translate-y-1/2" />
          <DpadGlyph dir="right" active={dirActive('right')} className="right-[8%] top-1/2 -translate-y-1/2" />

          <div
            className={`absolute left-1/2 top-1/2 h-[28%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full border transition-colors ${
              dirsHeld.current.size > 0
                ? 'bg-sky-400/55 border-sky-200/70'
                : 'bg-white/20 border-white/25'
            }`}
          />
        </div>

        <button
          id="touch-sprint"
          type="button"
          aria-label="Sprint"
          className={`pointer-events-auto touch-none select-none min-w-[4.5rem] px-3 py-2.5 rounded-2xl border text-[11px] font-black uppercase tracking-wider transition-colors ${
            actActive('sprint')
              ? 'bg-violet-400/70 border-violet-200 text-slate-950'
              : 'bg-slate-950/40 border-violet-400/40 text-violet-100 backdrop-blur-[2px]'
          }`}
          style={{ minHeight: 48 }}
          {...bindAction('sprint')}
          onContextMenu={(e) => e.preventDefault()}
        >
          Sprint
        </button>
      </div>

      {/* RIGHT: actions in thumb arc — primary punch sits at rest position */}
      <div className="pointer-events-none absolute bottom-2 right-2 sm:bottom-3 sm:right-3 flex flex-col items-end gap-2">
        <div className="pointer-events-none flex items-end gap-2">
          <div className="flex flex-col gap-2">
            <ActionButton
              id="touch-grab"
              label="Grab"
              active={actActive('grab')}
              tone="sky"
              size="md"
              {...bindAction('grab')}
            />
            <ActionButton
              id="touch-kick"
              label="Kick"
              active={actActive('kick')}
              tone="rose"
              size="md"
              {...bindAction('kick')}
            />
          </div>

          <div className="flex flex-col gap-2 items-center">
            <div className="flex gap-2">
              <ActionButton
                id="touch-block"
                label="Block"
                active={actActive('block')}
                tone="cyan"
                size="md"
                {...bindAction('block')}
              />
              <ActionButton
                id="touch-jump"
                label="Jump"
                active={actActive('up')}
                tone="sky"
                size="md"
                {...bindAction('up')}
              />
            </div>
            <ActionButton
              id="touch-punch"
              label="Punch"
              active={actActive('punch')}
              tone="amber"
              size="lg"
              {...bindAction('punch')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

function DpadGlyph({
  dir,
  active,
  className,
}: {
  dir: DirKey;
  active: boolean;
  className: string;
}) {
  const rotate =
    dir === 'up' ? '0deg' : dir === 'right' ? '90deg' : dir === 'down' ? '180deg' : '270deg';
  return (
    <div
      className={`absolute flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
        active ? 'bg-sky-400/50 text-white' : 'bg-white/10 text-white/70'
      } ${className}`}
      style={{ transform: undefined }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{ transform: `rotate(${rotate})` }}
        aria-hidden
      >
        <path d="M12 5l7 9H5l7-9z" />
      </svg>
    </div>
  );
}

type ActionTone = 'amber' | 'rose' | 'sky' | 'cyan';

function ActionButton({
  id,
  label,
  active,
  tone,
  size,
  ...handlers
}: {
  id: string;
  label: string;
  active: boolean;
  tone: ActionTone;
  size: 'md' | 'lg';
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
  };

  const dims =
    size === 'lg'
      ? 'min-w-[4.75rem] min-h-[4.75rem] text-sm px-3'
      : 'min-w-[3.25rem] min-h-[3.25rem] text-[10px] px-2';

  return (
    <button
      id={id}
      type="button"
      aria-label={label}
      className={`pointer-events-auto touch-none select-none rounded-full border font-black uppercase tracking-wide backdrop-blur-[2px] shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-colors ${dims} ${
        active ? tones[tone].on : tones[tone].idle
      }`}
      onContextMenu={(e) => e.preventDefault()}
      {...handlers}
    >
      {label}
    </button>
  );
}
