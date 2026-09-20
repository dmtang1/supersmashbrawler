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
  HelpCircle,
  ArrowLeft,
  X,
  ChevronLeft,
  Smartphone,
  MoreHorizontal,
} from 'lucide-react';
import { Fighter, GameSettings, InputState, PERCENT_KO_THRESHOLD, SPRINT_STAMINA_MAX, SUPER_METER_MAX } from '../types';
import { ITEM_DEFS } from '../items';
import { TouchControls } from './TouchControls';

interface HUDProps {
  p1: Fighter;
  p2: Fighter;
  settings: GameSettings;
  matchTime: number; // remaining seconds (countdown)
  isPaused: boolean;
  onTogglePause: () => void;
  onRestart: () => void;
  onToggleSound: () => void;
  onOpenControls: () => void;
  onOpenSettings: () => void;
  onBackToSelect?: () => void;
  activeKeys?: InputState;
  isTouchDevice?: boolean;
  showTouchControls?: boolean;
  onToggleTouchControls?: () => void;
  onVirtualKey?: (action: keyof InputState, isDown: boolean) => void;
  onReleaseAllVirtual?: () => void;
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
  isTouchDevice,
  showTouchControls,
  onToggleTouchControls,
  onVirtualKey,
  onReleaseAllVirtual,
  children,
}) => {
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getPercentColor = (pct: number) => {
    if (pct < 40) return 'text-white';
    if (pct < 80) return 'text-amber-300';
    if (pct < 130) return 'text-orange-400';
    return 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.85)]';
  };

  const getHealthBarGradient = (pct: number) => {
    if (pct < 40) return 'from-emerald-500 to-teal-400';
    if (pct < 80) return 'from-yellow-400 to-amber-500';
    if (pct < 120) return 'from-amber-500 to-orange-500';
    return 'from-rose-500 via-red-500 to-red-600';
  };

  const getMeterFillWidth = (pct: number) => {
    return Math.min(100, Math.max(4, (pct / PERCENT_KO_THRESHOLD) * 100));
  };

  const renderLabeledBar = (
    label: string,
    fill: React.ReactNode,
    align: 'left' | 'right',
    labelClass: string,
    barExtraClass = ''
  ) => (
    <div className={`flex items-center gap-1.5 w-full ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      <span
        className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0 w-11 sm:w-12 ${
          align === 'right' ? 'text-left' : 'text-right'
        } ${labelClass}`}
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.95)' }}
      >
        {label}
      </span>
      <div
        className={`flex-1 h-2.5 sm:h-3.5 bg-black/55 rounded-full overflow-hidden border border-white/25 shadow-[inset_0_1px_2px_rgba(0,0,0,0.55)] ${barExtraClass}`}
      >
        {fill}
      </div>
    </div>
  );

  const renderMeterRow = (
    fighter: Fighter,
    align: 'left' | 'right'
  ) => {
    const sprintPct = Math.min(100, Math.max(0, ((fighter.sprintStamina ?? SPRINT_STAMINA_MAX) / SPRINT_STAMINA_MAX) * 100));
    const sprintEmpty = sprintPct <= 0.5;
    const sprintLow = sprintPct < 22;
    const superPct = Math.min(100, Math.max(0, ((fighter.superMeter ?? 0) / SUPER_METER_MAX) * 100));
    const superReady = superPct >= 99.5;
    const held = fighter.heldWeapon;
    const itemDef = held ? ITEM_DEFS[held.kind] : null;
    const itemPct = held && itemDef
      ? Math.min(100, Math.max(0, (held.usesLeft / Math.max(1, itemDef.uses)) * 100))
      : 0;
    const itemLow = itemPct <= 35;

    return (
      <div className={`flex flex-col gap-1 sm:gap-1.5 mt-1.5 w-[14rem] sm:w-[18rem] md:w-[22rem] lg:w-[26rem] ${align === 'right' ? 'items-end' : 'items-start'}`}>
        {renderLabeledBar(
          'Dmg',
          <div
            className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-150 ${getHealthBarGradient(fighter.damagePercent)}`}
            style={{ width: `${getMeterFillWidth(fighter.damagePercent)}%` }}
          />,
          align,
          'text-white/80'
        )}

        {renderLabeledBar(
          sprintEmpty ? 'Empty' : 'Sprint',
          <div
            className={`h-full rounded-full transition-[width] duration-75 ${
              sprintEmpty
                ? 'bg-slate-600'
                : sprintLow
                ? 'bg-gradient-to-r from-rose-500 to-orange-400'
                : fighter.isSprinting
                ? 'bg-gradient-to-r from-violet-500 to-fuchsia-400'
                : 'bg-gradient-to-r from-indigo-500 to-violet-400'
            }`}
            style={{ width: `${sprintPct}%` }}
          />,
          align,
          sprintEmpty ? 'text-rose-400' : fighter.isSprinting ? 'text-violet-300' : 'text-violet-200/80',
          fighter.isSprinting ? 'border-violet-400/50' : ''
        )}

        {renderLabeledBar(
          superReady ? 'Ready' : 'Super',
          <div
            className={`h-full rounded-full transition-[width] duration-100 ${
              superReady
                ? 'bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-400'
                : 'bg-gradient-to-r from-amber-700 to-amber-400'
            }`}
            style={{ width: `${Math.max(superPct, superPct > 0 ? 4 : 0)}%` }}
          />,
          align,
          superReady ? 'text-amber-300' : 'text-amber-200/80',
          superReady ? 'border-amber-300/70 shadow-[0_0_8px_rgba(251,191,36,0.35)]' : ''
        )}

        {held && itemDef &&
          renderLabeledBar(
            itemDef.name.length > 6 ? 'Item' : itemDef.name,
            <div
              className="h-full rounded-full transition-[width] duration-100"
              style={{
                width: `${Math.max(itemPct, itemPct > 0 ? 4 : 0)}%`,
                background: itemLow
                  ? 'linear-gradient(to right, #f43f5e, #fb7185)'
                  : `linear-gradient(to right, ${itemDef.color}, ${itemDef.glowColor})`,
              }}
            />,
            align,
            itemLow ? 'text-rose-400' : 'text-white/70',
            itemLow ? 'border-rose-400/60' : ''
          )}
      </div>
    );
  };

  const renderFighterHud = (fighter: Fighter, side: 'left' | 'right') => {
    const isLeft = side === 'left';
    const stockColor = isLeft
      ? 'bg-red-500 border-red-200 shadow-[0_0_6px_rgba(239,68,68,0.85)]'
      : 'bg-sky-500 border-sky-200 shadow-[0_0_6px_rgba(56,189,248,0.85)]';

    return (
      <div
        className={`flex items-end gap-2 sm:gap-2.5 min-w-0 ${isLeft ? '' : 'flex-row-reverse'}`}
        id={isLeft ? 'p1-health-display' : 'p2-health-display'}
      >
        {/* Portrait */}
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center font-black text-[10px] sm:text-xs text-slate-950 shrink-0 border-2 shadow-[0_2px_12px_rgba(0,0,0,0.45)]"
          style={{
            backgroundColor: fighter.stats.color,
            borderColor: fighter.stats.glowColor || '#ffffff',
          }}
        >
          {fighter.isCpu ? 'CPU' : isLeft ? 'P1' : 'P2'}
        </div>

        <div className={`flex flex-col min-w-0 ${isLeft ? 'items-start' : 'items-end'}`}>
          <div className={`flex items-center gap-1.5 ${isLeft ? '' : 'flex-row-reverse'}`}>
            <span
              className="text-[11px] sm:text-sm font-extrabold text-white tracking-wide truncate max-w-[7rem] sm:max-w-[10rem]"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.5)' }}
            >
              {fighter.stats.name}
            </span>
            <div className={`flex items-center gap-0.5 ${isLeft ? '' : 'flex-row-reverse'}`}>
              {Array.from({ length: settings.stocks }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border transition-all ${
                    idx < fighter.stocks ? stockColor : 'bg-black/40 border-white/15 opacity-30'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className={`flex items-baseline gap-1.5 ${isLeft ? '' : 'flex-row-reverse'}`}>
            <span
              className={`font-mono text-2xl sm:text-3xl md:text-4xl font-black leading-none tracking-tight ${getPercentColor(
                fighter.damagePercent
              )}`}
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.95), 0 0 18px rgba(0,0,0,0.55)' }}
            >
              {Math.floor(fighter.damagePercent)}
              <span className="text-base sm:text-lg md:text-xl">%</span>
            </span>
          </div>

          {renderMeterRow(fighter, isLeft ? 'left' : 'right')}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full relative min-h-0 bg-slate-950 select-none overflow-hidden">
      {/* Full-bleed arena — stage fills the entire viewport */}
      <main
        id="battle-game-screen"
        className="absolute inset-0 bg-slate-950 overflow-hidden flex items-center justify-center"
      >
        {children}

        {onVirtualKey && onReleaseAllVirtual && (
          <TouchControls
            visible={!!isTouchDevice && !!showTouchControls && !isPaused}
            onVirtualKey={onVirtualKey}
            onReleaseAll={onReleaseAllVirtual}
          />
        )}

        {/* Keyboard guide tab */}
        {!showSidePanel && !(isTouchDevice && showTouchControls) && (
          <button
            id="edge-controls-open-btn"
            onClick={() => setShowSidePanel(true)}
            title="Open Controls Guide"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white/60 hover:text-sky-300 border-l border-y border-white/15 hover:border-sky-400/40 rounded-l-lg py-2.5 px-1.5 flex flex-col items-center gap-1 backdrop-blur-[2px] transition-all cursor-pointer group"
          >
            <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-sky-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider [writing-mode:vertical-lr] rotate-180">
              Controls
            </span>
          </button>
        )}

        {/* Side controls panel */}
        {showSidePanel && (
          <aside
            id="side-control-panel"
            className="absolute right-0 top-0 bottom-0 w-60 sm:w-68 z-30 bg-slate-950/92 border-l border-white/10 flex flex-col shadow-2xl backdrop-blur-md select-none"
          >
            <div className="p-2.5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-200">
                <Gamepad2 className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold uppercase tracking-wider">Controls</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  id="side-open-guide-btn"
                  onClick={onOpenControls}
                  title="Full Guide"
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
                <button
                  id="side-close-panel-btn"
                  onClick={() => setShowSidePanel(false)}
                  title="Close"
                  className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
              <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                <div className="flex items-center gap-1 text-sky-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  <Zap className="w-3 h-3" />
                  <span>Movement</span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  {[
                    { label: 'Jump / Recovery', key: 'W', active: activeKeys?.up },
                    { label: 'Move Left', key: 'A', active: activeKeys?.left },
                    { label: 'Crouch / Drop', key: 'S', active: activeKeys?.down },
                    { label: 'Move Right', key: 'D', active: activeKeys?.right },
                  ].map((row) => (
                    <div key={row.key} className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">{row.label}</span>
                      <kbd
                        className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                          row.active
                            ? 'bg-sky-500 text-slate-950 border-sky-300'
                            : 'bg-slate-800 border-slate-700 text-slate-200'
                        }`}
                      >
                        {row.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                <div className="flex items-center gap-1 text-amber-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  <Swords className="w-3 h-3" />
                  <span>Combat</span>
                </div>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-slate-300">
                    <div>
                      <span className="text-amber-300 font-bold block leading-tight">Punch / Jab</span>
                      <span className="text-[9px] text-slate-500 font-sans">Fast combo starter</span>
                    </div>
                    <kbd className={`px-2 py-0.5 rounded border text-[10px] font-bold ${activeKeys?.punch ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-slate-800 border-slate-700 text-amber-200'}`}>SPACE</kbd>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <div>
                      <span className="text-rose-300 font-bold block leading-tight">Kick / Smash</span>
                      <span className="text-[9px] text-slate-500 font-sans">High knockback</span>
                    </div>
                    <kbd className={`px-2 py-0.5 rounded border text-[10px] font-bold ${activeKeys?.kick ? 'bg-rose-400 text-slate-950 border-rose-300' : 'bg-slate-800 border-slate-700 text-rose-200'}`}>C</kbd>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <div>
                      <span className="text-sky-300 font-bold block leading-tight">Grab & Throw</span>
                      <span className="text-[9px] text-slate-500 font-sans">Holds / throws</span>
                    </div>
                    <kbd className={`px-2 py-0.5 rounded border text-[10px] font-bold ${activeKeys?.grab ? 'bg-sky-400 text-slate-950 border-sky-300' : 'bg-slate-800 border-slate-700 text-sky-200'}`}>V</kbd>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <div>
                      <span className="text-cyan-300 font-bold block leading-tight">Block / Guard</span>
                      <span className="text-[9px] text-slate-500 font-sans">Negates attacks</span>
                    </div>
                    <kbd className={`px-2 py-0.5 rounded border text-[10px] font-bold ${activeKeys?.block ? 'bg-cyan-400 text-slate-950 border-cyan-300' : 'bg-slate-800 border-slate-700 text-cyan-200'}`}>B</kbd>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <div>
                      <span className="text-purple-300 font-bold block leading-tight">Sprint Dash</span>
                      <span className="text-[9px] text-slate-500 font-sans">Drains sprint bar</span>
                    </div>
                    <kbd className={`px-2 py-0.5 rounded border text-[10px] font-bold ${activeKeys?.sprint ? 'bg-purple-400 text-slate-950 border-purple-300' : 'bg-slate-800 border-slate-700 text-purple-200'}`}>SHIFT</kbd>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                <div className="flex items-center gap-1 text-emerald-400 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  <Shield className="w-3 h-3" />
                  <span>Pro Tech</span>
                </div>
                <ul className="space-y-1 text-[10px] text-slate-300 leading-tight">
                  <li>
                    <strong>Block:</strong> Hold <code className="text-cyan-300 font-bold">B</code> facing the attacker. Grabs break through.
                  </li>
                  <li>
                    <strong>Ledge:</strong> Near edge, auto-snap. <code className="text-sky-300 font-bold">W</code> jump or <code className="text-sky-300 font-bold">Space</code> climb-attack.
                  </li>
                  <li>
                    <strong>Throws:</strong> While holding (<code className="text-amber-300 font-bold">V</code>), press <code className="text-amber-300 font-bold">W/S/A/D</code>.
                  </li>
                  <li>
                    <strong>Items:</strong> Walk into crates. <code className="text-amber-300 font-bold">Space</code> uses, <code className="text-sky-300 font-bold">V</code> tosses.
                  </li>
                </ul>
              </div>
            </div>
          </aside>
        )}
      </main>

      {/* Overlay HUD — floats on top of stage, no section background */}
      <header
        id="battle-header"
        className="absolute top-0 left-0 right-0 z-20 pointer-events-none pt-[max(0.5rem,env(safe-area-inset-top,0px))] px-[max(0.75rem,env(safe-area-inset-left,0px))] sm:px-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] sm:pr-[max(1rem,env(safe-area-inset-right,0px))]"
      >
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          {renderFighterHud(p1, 'left')}

          {/* Center: timer + compact menu */}
          <div className="flex flex-col items-center gap-1.5 shrink-0 pt-0.5 pointer-events-auto">
            <div
              className={`font-mono text-xl sm:text-2xl md:text-3xl font-black tracking-wider leading-none ${
                matchTime <= 10
                  ? 'text-red-400 animate-pulse'
                  : matchTime <= 30
                  ? 'text-amber-300'
                  : 'text-white'
              }`}
              style={{ textShadow: '0 2px 6px rgba(0,0,0,0.95), 0 0 20px rgba(0,0,0,0.6)' }}
            >
              {formatTime(matchTime)}
            </div>

            <div className="relative flex items-center gap-1">
              <button
                id="header-pause-btn"
                onClick={onTogglePause}
                title={isPaused ? 'Resume' : 'Pause'}
                className="p-1.5 rounded-md bg-black/40 hover:bg-black/60 text-white/90 border border-white/15 backdrop-blur-[2px] transition cursor-pointer"
              >
                {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
              </button>

              <button
                id="header-menu-btn"
                onClick={() => setShowMenu((v) => !v)}
                title="Match options"
                className={`p-1.5 rounded-md border backdrop-blur-[2px] transition cursor-pointer ${
                  showMenu
                    ? 'bg-sky-500/30 text-sky-200 border-sky-400/50'
                    : 'bg-black/40 hover:bg-black/60 text-white/90 border-white/15'
                }`}
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              {showMenu && (
                <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-lg bg-black/75 border border-white/15 backdrop-blur-md shadow-xl">
                  {isTouchDevice && onToggleTouchControls && (
                    <button
                      id="header-touch-controls-toggle"
                      onClick={onToggleTouchControls}
                      title={showTouchControls ? 'Hide touch controls' : 'Show touch controls'}
                      className={`p-1.5 rounded-md border transition cursor-pointer ${
                        showTouchControls
                          ? 'bg-sky-500/30 text-sky-300 border-sky-500/50'
                          : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    id="header-side-panel-toggle"
                    onClick={() => {
                      setShowSidePanel((prev) => !prev);
                      setShowMenu(false);
                    }}
                    title="Controls guide"
                    className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-sky-300 border border-white/10 transition cursor-pointer"
                  >
                    <Gamepad2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    id="header-sound-btn"
                    onClick={onToggleSound}
                    title="Toggle Sound"
                    className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition cursor-pointer"
                  >
                    {settings.soundEnabled ? (
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5 text-red-400" />
                    )}
                  </button>

                  <button
                    id="header-restart-btn"
                    onClick={() => {
                      onRestart();
                      setShowMenu(false);
                    }}
                    title="Restart Match"
                    className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-amber-300 border border-white/10 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  {onBackToSelect && (
                    <button
                      id="header-select-btn"
                      onClick={() => {
                        onBackToSelect();
                        setShowMenu(false);
                      }}
                      title="Back to Fighter Select"
                      className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-amber-300 border border-white/10 transition cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {renderFighterHud(p2, 'right')}
        </div>
      </header>
    </div>
  );
};
