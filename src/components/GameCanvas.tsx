import React, { useRef, useEffect, useCallback } from 'react';
import {
  CameraState,
  Fighter,
  GameSettings,
  InputState,
  Particle,
  Stage,
} from '../types';
import { FIGHTERS } from '../fighters';
import { STAGES } from '../stages';
import { createInitialFighter, resolveFighterCollision, updateFighterPhysics } from '../physics';
import { calculateCpuInput } from '../ai';
import {
  renderFighter,
  renderOffscreenIndicators,
  renderParticles,
  renderProjectiles,
  renderStage,
  renderWorldItems,
} from '../renderer';
import {
  createEmptyItemWorld,
  dropEliminatedWeapons,
  FIRST_ITEM_DELAY,
  randomSpawnDelay,
  spawnRandomItem,
  tryPickupItems,
  updateProjectiles,
  updateWorldItems,
} from '../items';

interface GameCanvasProps {
  settings: GameSettings;
  isPaused: boolean;
  onUpdateFighters: (p1: Fighter, p2: Fighter) => void;
  onGameOver: (winner: Fighter) => void;
  restartSignal: number;
  virtualInput?: InputState;
  onActiveInputState?: (input: InputState) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  settings,
  isPaused,
  onUpdateFighters,
  onGameOver,
  restartSignal,
  virtualInput,
  onActiveInputState,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active Keys Set (normalized strings: code, key, aliases)
  const keysPressed = useRef<Set<string>>(new Set());

  // Game Engine Refs
  const stageRef = useRef<Stage>(STAGES[settings.stageId] || STAGES.battlefield);
  const p1Ref = useRef<Fighter>(
    createInitialFighter(0, false, FIGHTERS[settings.p1Fighter], stageRef.current.spawnPoints[0], 1)
  );
  const p2Ref = useRef<Fighter>(
    createInitialFighter(
      1,
      settings.mode === 'cpu' || settings.mode === 'training',
      FIGHTERS[settings.p2Fighter],
      stageRef.current.spawnPoints[1],
      -1
    )
  );

  const particlesRef = useRef<Particle[]>([]);
  const itemWorldRef = useRef(createEmptyItemWorld());
  const itemSpawnTimerRef = useRef(FIRST_ITEM_DELAY);
  const animTickRef = useRef<number>(0);
  const hitstopFramesRef = useRef<number>(0);

  const cameraRef = useRef<CameraState>({
    x: 700,
    y: 400,
    zoom: 0.95,
    targetX: 700,
    targetY: 400,
    targetZoom: 0.95,
    shakeTimer: 0,
    shakeIntensity: 0,
  });

  const gameOverTriggered = useRef<boolean>(false);
  // Keep virtual (touch) input in a ref so the rAF loop never reads a stale prop closure
  const virtualInputRef = useRef<InputState | undefined>(virtualInput);
  useEffect(() => {
    virtualInputRef.current = virtualInput;
  }, [virtualInput]);

  // Initialize or Reset Match
  const resetMatch = useCallback(() => {
    stageRef.current = STAGES[settings.stageId] || STAGES.battlefield;
    p1Ref.current = createInitialFighter(
      0,
      false,
      FIGHTERS[settings.p1Fighter],
      stageRef.current.spawnPoints[0],
      1
    );
    p1Ref.current.stocks = settings.stocks;

    p2Ref.current = createInitialFighter(
      1,
      settings.mode === 'cpu' || settings.mode === 'training',
      FIGHTERS[settings.p2Fighter],
      stageRef.current.spawnPoints[1],
      -1
    );
    p2Ref.current.stocks = settings.stocks;

    particlesRef.current = [];
    itemWorldRef.current = createEmptyItemWorld();
    itemSpawnTimerRef.current = FIRST_ITEM_DELAY;
    cameraRef.current = {
      x: 700,
      y: 400,
      zoom: 0.95,
      targetX: 700,
      targetY: 400,
      targetZoom: 0.95,
      shakeTimer: 0,
      shakeIntensity: 0,
    };
    gameOverTriggered.current = false;
    hitstopFramesRef.current = 0;
  }, [settings]);

  useEffect(() => {
    resetMatch();
  }, [resetMatch, restartSignal]);

  // Screen shake helper
  const addScreenShake = useCallback((intensity: number, frames: number) => {
    cameraRef.current.shakeIntensity = Math.max(cameraRef.current.shakeIntensity, intensity);
    cameraRef.current.shakeTimer = Math.max(cameraRef.current.shakeTimer, frames);
    // Add micro hitstop freeze frame for impactful attacks
    if (intensity > 6) {
      hitstopFramesRef.current = Math.min(6, Math.floor(intensity * 0.6));
    }
  }, []);

  // Keyboard Event Listeners with broad compatibility & normalization
  useEffect(() => {
    const recordKey = (e: KeyboardEvent, isDown: boolean) => {
      const set = keysPressed.current;
      const tokens: string[] = [];

      if (e.code) {
        tokens.push(e.code);
        tokens.push(e.code.toLowerCase());
      }
      if (e.key) {
        tokens.push(e.key);
        tokens.push(e.key.toLowerCase());
      }
      // Direct numeric keyCode fallback
      if (e.keyCode === 87) tokens.push('keyw', 'w'); // W
      if (e.keyCode === 65) tokens.push('keya', 'a'); // A
      if (e.keyCode === 83) tokens.push('keys', 's'); // S
      if (e.keyCode === 68) tokens.push('keyd', 'd'); // D
      if (e.keyCode === 32) tokens.push('space', ' '); // Space
      if (e.keyCode === 66) tokens.push('keyb', 'b'); // B block
      if (e.keyCode === 67) tokens.push('keyc', 'c'); // C kick
      if (e.keyCode === 86) tokens.push('keyv', 'v'); // V grab
      if (e.keyCode === 70) tokens.push('keyf', 'f'); // F special / super
      if (e.keyCode === 186 || e.keyCode === 59) tokens.push('semicolon', ';'); // ; P2 special
      if (e.keyCode === 81) tokens.push('keyq', 'q'); // Q (legacy grab alias)
      if (e.keyCode === 16) {
        tokens.push('shift');
        // location 1 = left, 2 = right — never mark both or 2P sprint overlaps
        if (e.location === 1) tokens.push('shiftleft');
        else if (e.location === 2) tokens.push('shiftright');
      }
      if (e.keyCode === 38) tokens.push('arrowup', 'up');
      if (e.keyCode === 40) tokens.push('arrowdown', 'down');
      if (e.keyCode === 37) tokens.push('arrowleft', 'left');
      if (e.keyCode === 39) tokens.push('arrowright', 'right');

      for (const t of tokens) {
        if (isDown) set.add(t);
        else set.delete(t);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser page scrolling on game controls
      const scrollKeys = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS'];
      if (scrollKeys.includes(e.code) || e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
      }
      recordKey(e, true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      recordKey(e, false);
    };

    const handleBlur = () => {
      keysPressed.current.clear();
    };

    // Auto focus canvas on mount and whenever user clicks window/document
    const ensureFocus = () => {
      if (canvasRef.current && document.activeElement !== canvasRef.current) {
        canvasRef.current.focus();
      }
    };
    ensureFocus();

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    document.addEventListener('keyup', handleKeyUp, { capture: true });
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pointerdown', ensureFocus);
    window.addEventListener('click', ensureFocus);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true } as any);
      window.removeEventListener('keyup', handleKeyUp, { capture: true } as any);
      document.removeEventListener('keydown', handleKeyDown, { capture: true } as any);
      document.removeEventListener('keyup', handleKeyUp, { capture: true } as any);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pointerdown', ensureFocus);
      window.removeEventListener('click', ensureFocus);
    };
  }, []);

  // Input mapping
  const getInputStates = (): { p1Input: InputState; p2Input: InputState } => {
    const keys = keysPressed.current;
    const is2P = settings.mode === '2p';

    const has = (...aliases: string[]) => aliases.some((a) => keys.has(a) || keys.has(a.toLowerCase()));

    // Player 1: WASD + Space/C/V/B/Shift. In solo/CPU, also allow arrows & aliases.
    // In 2P, arrows and P2 action keys must NOT drive P1 or both fighters move together.
    const touch = virtualInputRef.current;
    const p1Input: InputState = is2P
      ? {
          up: (has('KeyW', 'w', 'z', 'KeyZ') || !!touch?.up),
          down: (has('KeyS', 's') || !!touch?.down),
          left: (has('KeyA', 'a') || !!touch?.left),
          right: (has('KeyD', 'd') || !!touch?.right),
          punch: (has('Space', ' ', 'j', 'KeyJ') || !!touch?.punch),
          kick: (has('KeyC', 'c', 'x') || !!touch?.kick),
          grab: (has('KeyV', 'v', 'g', 'KeyG') || !!touch?.grab),
          block: (has('KeyB', 'b') || !!touch?.block),
          sprint: (has('ShiftLeft') || !!touch?.sprint),
          special: (has('KeyF', 'f') || !!touch?.special),
        }
      : {
          up: (has('KeyW', 'w', 'ArrowUp', 'up', 'z', 'KeyZ') || !!touch?.up),
          down: (has('KeyS', 's', 'ArrowDown', 'down') || !!touch?.down),
          left: (has('KeyA', 'a', 'ArrowLeft', 'left') || !!touch?.left),
          right: (has('KeyD', 'd', 'ArrowRight', 'right') || !!touch?.right),
          punch: (has('Space', ' ', 'Enter', 'enter', 'j', 'KeyJ', 'Numpad0') || !!touch?.punch),
          kick: (has('KeyC', 'c', 'x') || !!touch?.kick),
          grab: (has('KeyV', 'v', 'g', 'KeyG', 'KeyQ', 'q') || !!touch?.grab),
          block: (has('KeyB', 'b') || !!touch?.block),
          sprint: (has('ShiftLeft', 'ShiftRight', 'Shift', 'shift') || !!touch?.sprint),
          special: (has('KeyF', 'f') || !!touch?.special),
        };

    if (onActiveInputState) {
      onActiveInputState(p1Input);
    }

    let p2Input: InputState = {
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

    if (is2P) {
      p2Input = {
        up: has('ArrowUp', 'up'),
        down: has('ArrowDown', 'down'),
        left: has('ArrowLeft', 'left'),
        right: has('ArrowRight', 'right'),
        punch: has('Enter', 'enter', 'NumpadEnter', 'Slash', '/'),
        kick: has('KeyL', 'l', 'Numpad2'),
        grab: has('KeyK', 'k', 'Period', '.', 'Numpad3'),
        block: has('KeyO', 'o', 'Comma', ','),
        sprint: has('ShiftRight', 'KeyP', 'p'),
        special: has('Semicolon', ';', 'semicolon'),
      };
    } else if (settings.mode === 'cpu') {
      p2Input = calculateCpuInput(
        p2Ref.current,
        p1Ref.current,
        stageRef.current,
        settings.cpuLevel,
        itemWorldRef.current.items
      );
    } else {
      // Training Dummy: passive
      p2Input = {
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
    }

    return { p1Input, p2Input };
  };

  // Main 60fps Loop
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Handle Hitstop Freeze Frame
      if (hitstopFramesRef.current > 0 && !isPaused) {
        hitstopFramesRef.current--;
      } else if (!isPaused && !gameOverTriggered.current) {
        animTickRef.current++;

        // Inputs
        const { p1Input, p2Input } = getInputStates();

        // Update Physics for P1
        updateFighterPhysics(
          p1Ref.current,
          p2Ref.current,
          p1Input,
          stageRef.current,
          particlesRef.current,
          addScreenShake,
          itemWorldRef.current
        );

        // Update Physics for P2
        updateFighterPhysics(
          p2Ref.current,
          p1Ref.current,
          p2Input,
          stageRef.current,
          particlesRef.current,
          addScreenShake,
          itemWorldRef.current
        );

        // Soft body collision — keep fighters from nesting / dragging together
        resolveFighterCollision(p1Ref.current, p2Ref.current, stageRef.current);

        const fighters = [p1Ref.current, p2Ref.current];
        updateWorldItems(itemWorldRef.current, stageRef.current, particlesRef.current);
        tryPickupItems(itemWorldRef.current, fighters, particlesRef.current);
        updateProjectiles(
          itemWorldRef.current,
          fighters,
          stageRef.current,
          particlesRef.current,
          addScreenShake
        );
        dropEliminatedWeapons(fighters, itemWorldRef.current, particlesRef.current);

        itemSpawnTimerRef.current--;
        if (itemSpawnTimerRef.current <= 0) {
          spawnRandomItem(itemWorldRef.current, stageRef.current, particlesRef.current);
          itemSpawnTimerRef.current = randomSpawnDelay();
        }

        // Check Win Condition
        if (p1Ref.current.stocks <= 0 && !gameOverTriggered.current) {
          gameOverTriggered.current = true;
          onGameOver(p2Ref.current);
        } else if (p2Ref.current.stocks <= 0 && !gameOverTriggered.current) {
          gameOverTriggered.current = true;
          onGameOver(p1Ref.current);
        }

        // Notify HUD of updated percentages and stocks
        onUpdateFighters({ ...p1Ref.current }, { ...p2Ref.current });
      }

      // --- Dynamic Camera Calculation ---
      const p1 = p1Ref.current;
      const p2 = p2Ref.current;
      const cam = cameraRef.current;

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2 - 40;
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);

      // Zoom scales with distance
      const targetZoom = Math.max(0.62, Math.min(1.15, 1100 / (dist + 500)));

      // Smooth camera interpolation
      cam.x += (midX - cam.x) * 0.08;
      cam.y += (midY - cam.y) * 0.08;
      cam.zoom += (targetZoom - cam.zoom) * 0.05;

      // Apply Screen Shake
      let shakeOffsetX = 0;
      let shakeOffsetY = 0;
      if (cam.shakeTimer > 0) {
        cam.shakeTimer--;
        shakeOffsetX = (Math.random() - 0.5) * cam.shakeIntensity;
        shakeOffsetY = (Math.random() - 0.5) * cam.shakeIntensity;
        cam.shakeIntensity *= 0.9;
      }

      // --- Render Pass ---
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      // Apply Camera Transform
      ctx.translate(width / 2 + shakeOffsetX, height / 2 + shakeOffsetY);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.x, -cam.y);

      // 1. Stage & Background (fills the full camera view on every stage)
      renderStage(ctx, stageRef.current, cam, width, height);

      // 2. Item crates
      renderWorldItems(ctx, itemWorldRef.current.items, animTickRef.current);

      // 3. Fighters
      renderFighter(ctx, p1, animTickRef.current);
      renderFighter(ctx, p2, animTickRef.current);

      // 4. Projectiles
      renderProjectiles(ctx, itemWorldRef.current.projectiles);

      // 5. Particles
      renderParticles(ctx, particlesRef.current);

      ctx.restore();

      // 4. UI Overlays (Offscreen radar bubbles)
      renderOffscreenIndicators(ctx, [p1, p2], stageRef.current, cam, width, height);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPaused, settings, onUpdateFighters, onGameOver, addScreenShake]);

  // Handle Responsive Resize
  useEffect(() => {
    const parent = canvasRef.current?.parentElement;
    if (!parent) return;

    const updateSize = () => {
      if (canvasRef.current && parent) {
        const rect = parent.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const newW = Math.floor(rect.width);
          const newH = Math.floor(rect.height);
          if (canvasRef.current.width !== newW || canvasRef.current.height !== newH) {
            canvasRef.current.width = newW;
            canvasRef.current.height = newH;
          }
        }
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(parent);
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="smash-canvas"
      tabIndex={0}
      aria-label="Super Smash Battle Arena Canvas"
      onClick={() => canvasRef.current?.focus()}
      className="w-full h-full block bg-slate-950 cursor-crosshair touch-none outline-none focus:outline-none"
    />
  );
};
