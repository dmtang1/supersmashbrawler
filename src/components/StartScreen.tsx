import React, { useState, useEffect } from 'react';
import {
  Swords,
  Bot,
  Users,
  Shield,
  Zap,
  Flame,
  Crown,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  ArrowRight,
  Check,
  Award,
  ChevronRight,
} from 'lucide-react';
import { FighterId, GameMode, GameSettings } from '../types';
import { FIGHTERS } from '../fighters';
import { STAGES } from '../stages';
import { sound } from '../audio';

interface StartScreenProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onStartBattle: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  settings,
  onUpdateSettings,
  onStartBattle,
}) => {
  const [activeTab, setActiveTab] = useState<'fighters' | 'rules'>('fighters');
  const [pressedKeyFeedback, setPressedKeyFeedback] = useState<Record<string, boolean>>({});

  const fighterList = Object.values(FIGHTERS);
  const selectedP1 = FIGHTERS[settings.p1Fighter];
  const selectedP2 = FIGHTERS[settings.p2Fighter];

  // Test Keyboard Input right on start screen so player can confirm WASD works
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code.toLowerCase();
      const key = e.key.toLowerCase();
      setPressedKeyFeedback((prev) => ({
        ...prev,
        [code]: true,
        [key]: true,
        up: ['keyw', 'w', 'arrowup'].includes(code) || ['w', 'arrowup'].includes(key),
        down: ['keys', 's', 'arrowdown'].includes(code) || ['s', 'arrowdown'].includes(key),
        left: ['keya', 'a', 'arrowleft'].includes(code) || ['a', 'arrowleft'].includes(key),
        right: ['keyd', 'd', 'arrowright'].includes(code) || ['d', 'arrowright'].includes(key),
        punch: ['space', ' '].includes(code) || ['space', ' '].includes(key),
        kick: ['keyf', 'f'].includes(code) || ['f'].includes(key),
        grab: ['keyq', 'q'].includes(code) || ['q'].includes(key),
        sprint: ['shiftleft', 'shiftright', 'shift'].includes(code) || ['shift'].includes(key),
      }));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code.toLowerCase();
      const key = e.key.toLowerCase();
      setPressedKeyFeedback((prev) => ({
        ...prev,
        [code]: false,
        [key]: false,
        up: ['keyw', 'w', 'arrowup'].includes(code) || ['w', 'arrowup'].includes(key) ? false : prev.up,
        down: ['keys', 's', 'arrowdown'].includes(code) || ['s', 'arrowdown'].includes(key) ? false : prev.down,
        left: ['keya', 'a', 'arrowleft'].includes(code) || ['a', 'arrowleft'].includes(key) ? false : prev.left,
        right: ['keyd', 'd', 'arrowright'].includes(code) || ['d', 'arrowright'].includes(key) ? false : prev.right,
        punch: ['space', ' '].includes(code) || ['space', ' '].includes(key) ? false : prev.punch,
        kick: ['keyf', 'f'].includes(code) || ['f'].includes(key) ? false : prev.kick,
        grab: ['keyq', 'q'].includes(code) || ['q'].includes(key) ? false : prev.grab,
        sprint: ['shiftleft', 'shiftright', 'shift'].includes(code) || ['shift'].includes(key) ? false : prev.sprint,
      }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleSelectP1 = (id: FighterId) => {
    sound.playAttack(id, 'punch');
    onUpdateSettings({ ...settings, p1Fighter: id });
  };

  const handleSelectP2 = (id: FighterId) => {
    sound.playAttack(id, 'kick');
    onUpdateSettings({ ...settings, p2Fighter: id });
  };

  const handleSetCpuLevel = (level: number) => {
    sound.playPunch();
    onUpdateSettings({ ...settings, cpuLevel: Math.max(1, Math.min(9, level)) });
  };

  const handleSetMode = (mode: GameMode) => {
    sound.playPunch();
    onUpdateSettings({ ...settings, mode });
  };

  const getDifficultyLabel = (lvl: number) => {
    if (lvl === 1) return { label: 'Level 1: Very Easy', desc: 'Gentle & slow reactions — best for beginners!', color: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    if (lvl === 2) return { label: 'Level 2: Easy', desc: 'Relaxed sparring with minimal attacks', color: 'text-green-400', badge: 'bg-green-500/20 text-green-300 border-green-500/40' };
    if (lvl === 3) return { label: 'Level 3: Normal', desc: 'Standard casual bot behavior', color: 'text-sky-400', badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40' };
    if (lvl <= 5) return { label: `Level ${lvl}: Medium`, desc: 'Active fighting, basic edge recovery', color: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    if (lvl <= 7) return { label: `Level ${lvl}: Hard`, desc: 'Fast attacks, sprinting, aggressive grabs', color: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40' };
    return { label: `Level ${lvl}: Smash Master`, desc: 'Extreme tournament reactions & aerial tech', color: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
  };

  const diffInfo = getDifficultyLabel(settings.cpuLevel);

  return (
    <div className="relative w-full h-full min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-y-auto p-4 md:p-6 lg:p-8 select-none">
      {/* Background glow ambiance */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-3xl transition-all duration-700"
          style={{ backgroundColor: selectedP1.color }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl transition-all duration-700"
          style={{ backgroundColor: selectedP2.color }}
        />
      </div>

      {/* Top Header & Game Title */}
      <header className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-red-600 text-slate-950 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center">
            <Swords className="w-7 h-7 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-500">
                Super Smash Brawler
              </h1>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-amber-400 tracking-wider">
                Platform Fighter
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Select your fighter, set opponent level, and jump into the arena
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl shadow-inner">
          <button
            id="start-mode-cpu-btn"
            onClick={() => handleSetMode('cpu')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              settings.mode === 'cpu'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Bot className="w-4 h-4" />
            Vs CPU
          </button>
          <button
            id="start-mode-training-btn"
            onClick={() => handleSetMode('training')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              settings.mode === 'training'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Shield className="w-4 h-4" />
            Training Dummy
          </button>
          <button
            id="start-mode-2p-btn"
            onClick={() => handleSetMode('2p')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              settings.mode === '2p'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            2-Player Local
          </button>
        </div>
      </header>

      {/* Main Selection Body */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 my-6">
        {/* Left Column: Player 1 Fighter Selection (5 cols) */}
        <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-1 rounded-lg text-xs font-black uppercase text-slate-950"
                  style={{ backgroundColor: selectedP1.color }}
                >
                  P1 YOU
                </span>
                <h2 className="text-lg font-bold text-white">Choose Your Fighter</h2>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {selectedP1.name} • {selectedP1.tagline}
              </span>
            </div>

            {/* Fighter Cards Grid (6 Distinct Creatures) */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
              {fighterList.map((f) => {
                const isSelected = settings.p1Fighter === f.id;
                return (
                  <button
                    key={f.id}
                    id={`select-p1-${f.id}`}
                    onClick={() => handleSelectP1(f.id)}
                    className={`relative p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col items-center group ${
                      isSelected
                        ? 'bg-slate-800/95 border-2 shadow-lg scale-102'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                    style={{
                      borderColor: isSelected ? f.color : undefined,
                      boxShadow: isSelected ? `0 0 16px ${f.glowColor}` : undefined,
                    }}
                  >
                    {/* Character Avatar Indicator */}
                    <div
                      className="w-12 h-12 rounded-xl mb-1.5 flex items-center justify-center font-black text-lg shadow-inner transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor: f.color,
                        color: '#0f172a',
                      }}
                    >
                      {f.name.charAt(0)}
                    </div>
                    <span className="text-xs font-bold text-white text-center leading-tight">
                      {f.name}
                    </span>
                    <span className="text-[10px] text-slate-400 text-center mt-0.5 truncate max-w-full">
                      {f.specialAbility.badge}
                    </span>
                    {isSelected && (
                      <div
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-slate-950 text-xs font-black shadow"
                        style={{ backgroundColor: f.color }}
                      >
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Fighter Details & Stat Bars */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
                  <Flame className="w-4 h-4" style={{ color: selectedP1.color }} />
                  {selectedP1.name} Overview
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Weight: {selectedP1.weight}x
                </span>
              </div>
              <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                {selectedP1.description}
              </p>

              {/* Unique Special Ability Feature Box */}
              <div className="mb-3.5 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Special Ability: {selectedP1.specialAbility.name}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {selectedP1.specialAbility.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {selectedP1.specialAbility.description}
                </p>
                {selectedP1.accessories && selectedP1.accessories.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-400 font-semibold">Accessories:</span>
                    {selectedP1.accessories.map((acc, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700/80"
                      >
                        {acc}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats Visual Bars */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-0.5 font-medium">
                    <span>Speed / Sprint</span>
                    <span className="text-slate-200">{selectedP1.sprintSpeed}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(selectedP1.sprintSpeed / 11) * 100}%`,
                        backgroundColor: selectedP1.color,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-0.5 font-medium">
                    <span>Kick Power</span>
                    <span className="text-slate-200">{selectedP1.kickDamage}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(selectedP1.kickDamage / 20) * 100}%`,
                        backgroundColor: selectedP1.color,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-0.5 font-medium">
                    <span>Throw Damage</span>
                    <span className="text-slate-200">{selectedP1.throwDamage}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(selectedP1.throwDamage / 20) * 100}%`,
                        backgroundColor: selectedP1.color,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-0.5 font-medium">
                    <span>Air Mobility</span>
                    <span className="text-slate-200">
                      {selectedP1.doubleJumps + 1} Jumps
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(selectedP1.jumpForce / 16) * 100}%`,
                        backgroundColor: selectedP1.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Opponent & CPU Level Controls (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-1 rounded-lg text-xs font-black uppercase text-slate-950"
                  style={{ backgroundColor: selectedP2.color }}
                >
                  {settings.mode === 'cpu' ? 'OPPONENT BOT' : settings.mode === 'training' ? 'DUMMY' : 'P2'}
                </span>
                <h2 className="text-lg font-bold text-white">
                  {settings.mode === 'cpu' ? 'Bot & Difficulty Setup' : 'Opponent Selection'}
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {selectedP2.name}
              </span>
            </div>

            {/* Opponent Fighter Selection (6 Distinct Creatures) */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
              {fighterList.map((f) => {
                const isSelected = settings.p2Fighter === f.id;
                return (
                  <button
                    key={f.id}
                    id={`select-p2-${f.id}`}
                    onClick={() => handleSelectP2(f.id)}
                    className={`relative p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col items-center group ${
                      isSelected
                        ? 'bg-slate-800/95 border-2 shadow-lg scale-102'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                    style={{
                      borderColor: isSelected ? f.color : undefined,
                      boxShadow: isSelected ? `0 0 16px ${f.glowColor}` : undefined,
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl mb-1.5 flex items-center justify-center font-black text-lg shadow-inner transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor: f.color,
                        color: '#0f172a',
                      }}
                    >
                      {f.name.charAt(0)}
                    </div>
                    <span className="text-xs font-bold text-white text-center leading-tight">
                      {f.name}
                    </span>
                    <span className="text-[10px] text-slate-400 text-center mt-0.5 truncate max-w-full">
                      {f.specialAbility.badge}
                    </span>
                    {isSelected && (
                      <div
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-slate-950 text-xs font-black shadow"
                        style={{ backgroundColor: f.color }}
                      >
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Opponent Ability Info */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedP2.color }} />
                  {selectedP2.name} - Special Ability: {selectedP2.specialAbility.name}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                  {selectedP2.specialAbility.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {selectedP2.specialAbility.description}
              </p>
            </div>

            {/* CPU LEVEL SELECTION (CRITICAL FEATURE: MAKE IT EASIER) */}
            {settings.mode === 'cpu' ? (
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4.5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300 block">
                      Opponent Difficulty
                    </span>
                    <span className={`text-sm font-black ${diffInfo.color}`}>
                      {diffInfo.label}
                    </span>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${diffInfo.badge}`}>
                    {diffInfo.desc}
                  </span>
                </div>

                {/* Quick Difficulty Presets (Prominently feature Level 1 for easy play!) */}
                <div className="grid grid-cols-4 gap-2 mb-3.5">
                  <button
                    id="diff-preset-1"
                    onClick={() => handleSetCpuLevel(1)}
                    className={`py-2 px-2 rounded-xl text-xs font-black border transition cursor-pointer flex flex-col items-center gap-0.5 ${
                      settings.cpuLevel === 1
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    <span>LVL 1</span>
                    <span className="text-[10px] font-normal opacity-90">Very Easy ⭐</span>
                  </button>

                  <button
                    id="diff-preset-2"
                    onClick={() => handleSetCpuLevel(2)}
                    className={`py-2 px-2 rounded-xl text-xs font-black border transition cursor-pointer flex flex-col items-center gap-0.5 ${
                      settings.cpuLevel === 2
                        ? 'bg-green-500 text-slate-950 border-green-400 shadow-[0_0_12px_rgba(34,197,94,0.5)]'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-green-400 border-green-500/30'
                    }`}
                  >
                    <span>LVL 2</span>
                    <span className="text-[10px] font-normal opacity-90">Easy</span>
                  </button>

                  <button
                    id="diff-preset-3"
                    onClick={() => handleSetCpuLevel(3)}
                    className={`py-2 px-2 rounded-xl text-xs font-black border transition cursor-pointer flex flex-col items-center gap-0.5 ${
                      settings.cpuLevel === 3
                        ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.5)]'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-sky-400 border-sky-500/30'
                    }`}
                  >
                    <span>LVL 3</span>
                    <span className="text-[10px] font-normal opacity-90">Normal</span>
                  </button>

                  <button
                    id="diff-preset-6"
                    onClick={() => handleSetCpuLevel(6)}
                    className={`py-2 px-2 rounded-xl text-xs font-black border transition cursor-pointer flex flex-col items-center gap-0.5 ${
                      settings.cpuLevel === 6
                        ? 'bg-orange-500 text-slate-950 border-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.5)]'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-orange-400 border-orange-500/30'
                    }`}
                  >
                    <span>LVL 6</span>
                    <span className="text-[10px] font-normal opacity-90">Hard</span>
                  </button>
                </div>

                {/* Stepper / Slider with 1 to 9 buttons */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Fine Tune:
                  </span>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                    <button
                      key={lvl}
                      id={`cpu-level-btn-${lvl}`}
                      onClick={() => handleSetCpuLevel(lvl)}
                      className={`flex-1 py-1.5 rounded-lg font-mono font-bold text-xs transition cursor-pointer ${
                        settings.cpuLevel === lvl
                          ? 'bg-amber-400 text-slate-950 shadow-md scale-105'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            ) : settings.mode === 'training' ? (
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 mb-4 text-emerald-300 text-xs leading-relaxed">
                <span className="font-bold block mb-1">🛡️ Training Dummy Mode Active:</span>
                The opponent will stay passive and not attack back. You can freely practice your
                movement, punches, kicks, and 4-way throws with ground bounce physics!
              </div>
            ) : (
              <div className="bg-purple-950/30 border border-purple-500/30 rounded-2xl p-4 mb-4 text-purple-300 text-xs leading-relaxed">
                <span className="font-bold block mb-1">👥 2-Player Local Battle:</span>
                Player 1 uses <span className="font-mono text-white">WASD + Space + F + Q</span>.
                Player 2 uses <span className="font-mono text-white">Arrow Keys + Enter + L + K</span>.
              </div>
            )}

            {/* Stage & Stock Rules Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Stage Select */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                  Battle Stage
                </label>
                <select
                  id="stage-select-dropdown"
                  value={settings.stageId}
                  onChange={(e) => onUpdateSettings({ ...settings, stageId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold rounded-lg px-2.5 py-2 cursor-pointer outline-none"
                >
                  <option value="battlefield">Smash Arena (Tri-Platform)</option>
                  <option value="destination">Final Destination (Flat Ground)</option>
                  <option value="cyber">Neon Skyway (Cyber Platforms)</option>
                </select>
              </div>

              {/* Stocks Select */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                  Match Stocks (Lives)
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 5].map((stk) => (
                    <button
                      key={stk}
                      id={`stock-btn-${stk}`}
                      onClick={() => onUpdateSettings({ ...settings, stocks: stk })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        settings.stocks === stk
                          ? 'bg-red-500 text-white shadow'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {stk} {stk === 1 ? 'Life' : 'Lives'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Interactive Controls Tester & BIG "START MATCH" Button */}
      <footer className="relative z-10 bg-slate-900/90 border border-slate-800 rounded-3xl p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl">
        {/* Controls Reference & Live Input Test Banner */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
              Battle Controls Guide
            </span>
            <span className="text-[10px] text-slate-400">
              (Press keys right now to test!)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Move WASD */}
            <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 mr-1">MOVE:</span>
              <span
                className={`px-1.5 py-0.5 rounded text-xs font-mono font-bold transition ${
                  pressedKeyFeedback.up ? 'bg-sky-500 text-slate-950 scale-110 shadow' : 'bg-slate-800 text-slate-200'
                }`}
              >
                W
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-xs font-mono font-bold transition ${
                  pressedKeyFeedback.left ? 'bg-sky-500 text-slate-950 scale-110 shadow' : 'bg-slate-800 text-slate-200'
                }`}
              >
                A
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-xs font-mono font-bold transition ${
                  pressedKeyFeedback.down ? 'bg-sky-500 text-slate-950 scale-110 shadow' : 'bg-slate-800 text-slate-200'
                }`}
              >
                S
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-xs font-mono font-bold transition ${
                  pressedKeyFeedback.right ? 'bg-sky-500 text-slate-950 scale-110 shadow' : 'bg-slate-800 text-slate-200'
                }`}
              >
                D
              </span>
            </div>

            {/* Punch */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400">PUNCH:</span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition ${
                  pressedKeyFeedback.punch ? 'bg-amber-400 text-slate-950 scale-110 shadow' : 'bg-slate-800 text-amber-300'
                }`}
              >
                SPACE
              </span>
            </div>

            {/* Kick */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400">KICK:</span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition ${
                  pressedKeyFeedback.kick ? 'bg-rose-500 text-slate-950 scale-110 shadow' : 'bg-slate-800 text-rose-300'
                }`}
              >
                F
              </span>
            </div>

            {/* Grab & Directional Throw */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400">GRAB & THROW:</span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition ${
                  pressedKeyFeedback.grab ? 'bg-sky-400 text-slate-950 scale-110 shadow' : 'bg-slate-800 text-sky-300'
                }`}
              >
                Q
              </span>
              <span className="text-[10px] text-slate-400 hidden xl:inline">
                + W (Up) / S (Bounce Down) / D (Fwd) / A (Back)
              </span>
            </div>

            {/* Sprint */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400">SPRINT:</span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition ${
                  pressedKeyFeedback.sprint ? 'bg-purple-400 text-slate-950 scale-110 shadow' : 'bg-slate-800 text-purple-300'
                }`}
              >
                SHIFT
              </span>
            </div>
          </div>
        </div>

        {/* Huge Glow "FIGHT!" / "START MATCH" Button */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            id="start-battle-fight-btn"
            onClick={() => {
              sound.playFightClash();
              onStartBattle();
            }}
            className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-slate-950 font-black text-base md:text-lg tracking-wider uppercase rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.6)] hover:shadow-[0_0_40px_rgba(239,68,68,0.8)] active:scale-98 transition-all flex items-center justify-center gap-3 cursor-pointer group"
          >
            <span>FIGHT!</span>
            <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </footer>
    </div>
  );
};
