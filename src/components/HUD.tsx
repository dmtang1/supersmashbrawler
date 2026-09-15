import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  Gamepad2,
  Shield,
  Zap,
  Swords,
  Sparkles,
  Flame,
  HelpCircle,
  ArrowLeft,
  X,
  ChevronLeft,
} from 'lucide-react';
import { Fighter, GameSettings, InputState, PERCENT_KO_THRESHOLD, SPRINT_STAMINA_MAX } from '../types';
import { ITEM_DEFS } from '../items';

interface HUDProps {
  p1: Fighter;
  p2: Fighter;
  settings: GameSettings;
  matchTime: number; // in seconds
  isPaused: boolean;
  onTogglePause: () => void;
  onRestart: () => void;
  onToggleSound: () => void;
  onOpenControls: () => void;
  onOpenSettings: () => void;
  onBackToSelect?: () => void;
  activeKeys?: InputState;
  showTouchControls?: boolean;
  onToggleTouchControls?: () => void;
  onVirtualKey?: (action: keyof InputState, isDown: boolean, code?: string) => void;
  children?: React.ReactNode;
}

export const HUD: React.FC<HUDProps> = ({
  p1,
  p2,
  settings,
  matchTime,
  isPaused,
  onTogglePause,
  onRestart,
  onToggleSound,
  onOpenControls,
  onBackToSelect,
  activeKeys,
  children,
}) => {
  // Minimized by default so the arena has 100% full screen space
  const [showSidePanel, setShowSidePanel] = useState(false);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getPercentColor = (pct: number) => {
    if (pct < 40) return 'text-emerald-300';
    if (pct < 80) return 'text-amber-300';
    if (pct < 130) return 'text-orange-400';
    return 'text-red-500 font-black drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]';
  };

  const getHealthBarGradient = (pct: number) => {
    if (pct < 40) return 'from-emerald-500 to-teal-400';
    if (pct < 80) return 'from-yellow-400 to-amber-500';
    if (pct < 120) return 'from-amber-500 to-orange-500';
    return 'from-rose-500 via-red-500 to-red-600 animate-pulse';
  };

  const getMeterFillWidth = (pct: number) => {
    return Math.min(100, Math.max(4, (pct / PERCENT_KO_THRESHOLD) * 100));
  };

  const renderSprintBar = (fighter: Fighter, align: 'left' | 'right') => {
    const pct = Math.min(100, Math.max(0, ((fighter.sprintStamina ?? SPRINT_STAMINA_MAX) / SPRINT_STAMINA_MAX) * 100));
    const depleted = pct <= 0.5;
    const low = pct < 22;
    return (
      <div className={`flex items-center gap-1.5 mt-0.5 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        <div
          className={`w-20 sm:w-32 md:w-40 h-1.5 bg-slate-950 border rounded-full overflow-hidden p-[1px] ${
            depleted
              ? 'border-rose-700'
              : fighter.isSprinting
              ? 'border-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.55)]'
              : 'border-slate-700'
          }`}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-75 ${
              depleted
                ? 'bg-slate-700'
                : low
                ? 'bg-gradient-to-r from-rose-500 to-orange-400'
                : fighter.isSprinting
                ? 'bg-gradient-to-r from-violet-500 to-fuchsia-400'
                : 'bg-gradient-to-r from-indigo-500 to-violet-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span
          className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider ${
            depleted ? 'text-rose-400' : fighter.isSprinting ? 'text-violet-300' : 'text-slate-500'
          }`}
        >
          {depleted ? 'Empty' : 'Sprint'}
        </span>
      </div>
    );
  };

  const activeGrabber = p1.grab.role === 'grabber' ? p1 : p2.grab.role === 'grabber' ? p2 : null;
  const isP1LedgeHanging = p1.currentAction === 'ledge_hang';

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-slate-950 select-none overflow-hidden">
      {/* 
        ========================================================================
        1. TOP HEADER BAR: HEALTH BARS & ESSENTIAL MATCH CONTROLS
        Positioned strictly at the top, completely outside and above the arena.
        The health bars CANNOT block the fighters or recovery arcs.
        ========================================================================
      */}
      <header
        id="battle-header"
        className="h-[4.25rem] sm:h-[4.75rem] w-full bg-slate-900/95 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between shrink-0 shadow-xl z-20"
      >
        {/* PLAYER 1 HEALTH BAR & CARD (TOP-LEFT) */}
        <div id="p1-health-display" className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm text-slate-950 shadow-md border-2 shrink-0 transition-transform"
            style={{
              backgroundColor: p1.stats.color,
              borderColor: p1.stats.glowColor || '#ffffff',
            }}
          >
            P1
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold text-white tracking-wide">
                {p1.stats.name}
              </span>
              <div className="flex items-center gap-1">
                {Array.from({ length: settings.stocks }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2.5 h-2.5 rounded-full border transition-all ${
                      idx < p1.stocks
                        ? 'bg-red-500 border-red-300 shadow-[0_0_6px_rgba(239,68,68,0.9)]'
                        : 'bg-slate-800 border-slate-700 opacity-20'
                    }`}
                  />
                ))}
              </div>
              {p1.heldWeapon && (
                <span
                  className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide border"
                  style={{
                    color: ITEM_DEFS[p1.heldWeapon.kind].glowColor,
                    borderColor: `${ITEM_DEFS[p1.heldWeapon.kind].glowColor}88`,
                    backgroundColor: `${ITEM_DEFS[p1.heldWeapon.kind].color}33`,
                  }}
                >
                  {ITEM_DEFS[p1.heldWeapon.kind].name}
                  <span className="font-mono text-slate-200">×{p1.heldWeapon.usesLeft}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-20 sm:w-32 md:w-40 h-2 sm:h-2.5 bg-slate-950 border border-slate-700 rounded-full overflow-hidden p-0.5 shadow-inner">
                <div
                  className={`h-full rounded-full bg-gradient-to-r transition-all duration-150 ${getHealthBarGradient(
                    p1.damagePercent
                  )}`}
                  style={{ width: `${getMeterFillWidth(p1.damagePercent)}%` }}
                />
              </div>

              <span
                className={`font-mono text-xs sm:text-base font-black leading-none ${getPercentColor(
                  p1.damagePercent
                )}`}
              >
                {Math.floor(p1.damagePercent)}%
              </span>
            </div>
            {renderSprintBar(p1, 'left')}
          </div>
        </div>

        {/* CENTER: TIME & QUICK MATCH CONTROLS */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Dynamic Action Alerts */}
          {activeGrabber ? (
            <div className="hidden md:flex animate-bounce bg-amber-500 text-slate-950 font-black text-[11px] px-2.5 py-0.5 rounded-full shadow border border-amber-300 items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>GRAB! [W/A/S/D]</span>
            </div>
          ) : isP1LedgeHanging ? (
            <div className="hidden md:flex animate-pulse bg-sky-500 text-slate-950 font-black text-[11px] px-2.5 py-0.5 rounded-full shadow border border-sky-300 items-center gap-1">
              <Flame className="w-3 h-3" />
              <span>EDGE! [W/D/SPACE/S]</span>
            </div>
          ) : null}

          {/* Match Timer */}
          <div className="bg-slate-950/80 border border-slate-800 px-3 py-1 rounded-full flex items-center gap-2 shadow-inner">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
              {settings.mode === 'cpu'
                ? `VS CPU (LVL ${settings.cpuLevel})`
                : settings.mode === '2p'
                ? '2-PLAYER'
                : 'TRAINING'}
            </span>
            <span className="text-xs sm:text-sm font-black text-white font-mono tracking-wider sm:border-l sm:border-slate-800 sm:pl-2">
              {formatTime(matchTime)}
            </span>
          </div>

          {/* Quick Header Buttons (Consolidated, Zero Floating Screen Clutter) */}
          <div className="flex items-center gap-1">
            <button
              id="header-side-panel-toggle"
              onClick={() => setShowSidePanel((prev) => !prev)}
              title={showSidePanel ? 'Minimize Controls Panel' : 'Open Controls Guide'}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm ${
                showSidePanel
                  ? 'bg-sky-500/25 text-sky-300 border-sky-500/60 shadow-[0_0_10px_rgba(56,189,248,0.2)]'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750 hover:text-white hover:border-slate-600'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[11px] font-semibold">Controls</span>
            </button>

            <button
              id="header-sound-btn"
              onClick={onToggleSound}
              title="Toggle Sound"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              {settings.soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-red-400" />}
            </button>

            <button
              id="header-pause-btn"
              onClick={onTogglePause}
              title={isPaused ? 'Resume Fight' : 'Pause Fight'}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
            </button>

            <button
              id="header-restart-btn"
              onClick={onRestart}
              title="Restart Match"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            </button>

            {onBackToSelect && (
              <button
                id="header-select-btn"
                onClick={onBackToSelect}
                title="Back to Fighter Select"
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-bold transition cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span className="text-[11px]">Fighters</span>
              </button>
            )}
          </div>
        </div>

        {/* PLAYER 2 / CPU HEALTH BAR & CARD (TOP-RIGHT) */}
        <div id="p2-health-display" className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {Array.from({ length: settings.stocks }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2.5 h-2.5 rounded-full border transition-all ${
                      idx < p2.stocks
                        ? 'bg-blue-500 border-blue-300 shadow-[0_0_6px_rgba(59,130,246,0.9)]'
                        : 'bg-slate-800 border-slate-700 opacity-20'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs sm:text-sm font-extrabold text-white tracking-wide">
                {p2.stats.name}
              </span>
              {p2.heldWeapon && (
                <span
                  className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide border"
                  style={{
                    color: ITEM_DEFS[p2.heldWeapon.kind].glowColor,
                    borderColor: `${ITEM_DEFS[p2.heldWeapon.kind].glowColor}88`,
                    backgroundColor: `${ITEM_DEFS[p2.heldWeapon.kind].color}33`,
                  }}
                >
                  {ITEM_DEFS[p2.heldWeapon.kind].name}
                  <span className="font-mono text-slate-200">×{p2.heldWeapon.usesLeft}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`font-mono text-xs sm:text-base font-black leading-none ${getPercentColor(
                  p2.damagePercent
                )}`}
              >
                {Math.floor(p2.damagePercent)}%
              </span>

              <div className="w-20 sm:w-32 md:w-40 h-2 sm:h-2.5 bg-slate-950 border border-slate-700 rounded-full overflow-hidden p-0.5 shadow-inner">
                <div
                  className={`h-full rounded-full bg-gradient-to-r transition-all duration-150 ${getHealthBarGradient(
                    p2.damagePercent
                  )}`}
                  style={{ width: `${getMeterFillWidth(p2.damagePercent)}%` }}
                />
              </div>
            </div>
            {renderSprintBar(p2, 'right')}
          </div>

          <div
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm text-slate-950 shadow-md border-2 shrink-0 transition-transform"
            style={{
              backgroundColor: p2.stats.color,
              borderColor: p2.stats.glowColor || '#ffffff',
            }}
          >
            {p2.isCpu ? 'CPU' : 'P2'}
          </div>
        </div>
      </header>

      {/* 
        ========================================================================
        2. MAIN ARENA & SLENDER SIDE CONTROLS REFERENCE
        - Pure unobstructed arena canvas: NO floating overlay buttons in the way!
        - Side Panel: Clean, streamlined reference guide without bulky buttons taking up room!
        ========================================================================
      */}
      <div className="flex-1 flex flex-row min-h-0 relative overflow-hidden">
        {/* BATTLE ARENA CANVAS - 100% UNCLUTTERED */}
        <main
          id="battle-game-screen"
          className="flex-1 h-full min-w-0 relative bg-slate-950 overflow-hidden flex items-center justify-center"
        >
          {children}

          {/* Quick Peek Edge Tab when minimized (Unobtrusive right-edge tab to open controls) */}
          {!showSidePanel && (
            <button
              id="edge-controls-open-btn"
              onClick={() => setShowSidePanel(true)}
              title="Click to Open Controls Guide"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-sky-300 border-l border-y border-slate-700/80 hover:border-sky-500/50 rounded-l-lg py-2.5 px-1.5 flex flex-col items-center gap-1 shadow-lg transition-all cursor-pointer group"
            >
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-sky-400" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-sky-200 [writing-mode:vertical-lr] rotate-180">
                Controls
              </span>
            </button>
          )}
        </main>

        {/* STREAMLINED SIDE CONTROLS PANEL (Minimized by default, opened when clicked) */}
        {showSidePanel && (
          <aside
            id="side-control-panel"
            className="w-60 sm:w-68 shrink-0 bg-slate-900/95 border-l border-slate-800 flex flex-col h-full z-20 shadow-xl select-none"
          >
            {/* Header */}
            <div className="p-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-1.5 text-slate-200">
                <Gamepad2 className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold uppercase tracking-wider">Controls Guide</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  id="side-open-guide-btn"
                  onClick={onOpenControls}
                  title="Detailed Full-Screen Guide"
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
                <button
                  id="side-close-panel-btn"
                  onClick={() => setShowSidePanel(false)}
                  title="Minimize Controls Guide"
                  className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Clean compact list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
              {/* MOVEMENT KEYS */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5">
                <div className="flex items-center gap-1 text-sky-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  <Zap className="w-3 h-3" />
                  <span>Movement</span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Jump / Recovery</span>
                    <kbd className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${activeKeys?.up ? 'bg-sky-500 text-slate-950 border-sky-300' : 'bg-slate-800 border-slate-700 text-slate-200'}`}>W</kbd>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Move Left</span>
                    <kbd className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${activeKeys?.left ? 'bg-sky-500 text-slate-950 border-sky-300' : 'bg-slate-800 border-slate-700 text-slate-200'}`}>A</kbd>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Crouch / Drop</span>
                    <kbd className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${activeKeys?.down ? 'bg-sky-500 text-slate-950 border-sky-300' : 'bg-slate-800 border-slate-700 text-slate-200'}`}>S</kbd>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Move Right</span>
                    <kbd className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${activeKeys?.right ? 'bg-sky-500 text-slate-950 border-sky-300' : 'bg-slate-800 border-slate-700 text-slate-200'}`}>D</kbd>
                  </div>
                </div>
              </div>

              {/* COMBAT ACTIONS (Sleek Compact Key Reference, No Bulky Buttons) */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5">
                <div className="flex items-center gap-1 text-amber-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  <Swords className="w-3 h-3" />
                  <span>Combat Attacks</span>
                </div>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-slate-300">
                    <div>
                      <span className="text-amber-300 font-bold block leading-tight">Punch / Jab</span>
                      <span className="text-[9px] text-slate-500 font-sans">Fast combo starter</span>
                    </div>
                    <kbd className={`px-2 py-0.5 rounded border text-[10px] font-bold ${activeKeys?.punch ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'bg-slate-800 border-slate-700 text-amber-200'}`}>SPACE</kbd>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <div>
                      <span className="text-rose-300 font-bold block leading-tight">Kick / Smash</span>
                      <span className="text-[9px] text-slate-500 font-sans">High knockback finisher</span>
                    </div>
                    <kbd className={`px-2 py-0.5 rounded border text-[10px] font-bold ${activeKeys?.kick ? 'bg-rose-400 text-slate-950 border-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'bg-slate-800 border-slate-700 text-rose-200'}`}>F</kbd>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <div>
                      <span className="text-sky-300 font-bold block leading-tight">Grab & Throw</span>
                      <span className="text-[9px] text-slate-500 font-sans">Holds shield / opponent</span>
                    </div>
                    <kbd className={`px-2 py-0.5 rounded border text-[10px] font-bold ${activeKeys?.grab ? 'bg-sky-400 text-slate-950 border-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.8)]' : 'bg-slate-800 border-slate-700 text-sky-200'}`}>Q</kbd>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <div>
                      <span className="text-purple-300 font-bold block leading-tight">Sprint Dash</span>
                      <span className="text-[9px] text-slate-500 font-sans">Drains the sprint bar</span>
                    </div>
                    <kbd className={`px-2 py-0.5 rounded border text-[10px] font-bold ${activeKeys?.sprint ? 'bg-purple-400 text-slate-950 border-purple-300 shadow-[0_0_8px_rgba(192,132,252,0.8)]' : 'bg-slate-800 border-slate-700 text-purple-200'}`}>SHIFT</kbd>
                  </div>
                </div>
              </div>

              {/* RECOVERY & TECHNIQUES */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5">
                <div className="flex items-center gap-1 text-emerald-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  <Shield className="w-3 h-3" />
                  <span>Pro Tech</span>
                </div>
                <ul className="space-y-1 text-[10px] text-slate-300 leading-tight">
                  <li className="flex items-start gap-1">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><strong>Ledge Sweetspot:</strong> Near edge, you auto-snap to ledge. Press <code className="text-sky-300 font-bold">W</code> to jump or <code className="text-sky-300 font-bold">Space</code> to climb-attack!</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <span className="text-amber-400 font-bold">•</span>
                    <span><strong>Throws:</strong> While holding opponent (<code className="text-amber-300 font-bold">Q</code>), press <code className="text-amber-300 font-bold">W/S/A/D</code> to launch them.</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <span className="text-rose-400 font-bold">•</span>
                    <span><strong>Item Drops:</strong> Walk into glowing crates to grab guns, swords, hammers, bats, and bombs. <code className="text-amber-300 font-bold">Space</code> fires/swings. <code className="text-sky-300 font-bold">Q</code> tosses it.</span>
                  </li>
                </ul>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
