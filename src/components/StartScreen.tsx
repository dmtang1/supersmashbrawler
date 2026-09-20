import React from 'react';
import { Swords, Bot, Users, Shield, ArrowRight, Settings, Circle, ArrowUp } from 'lucide-react';
import { FighterId, GameMode, GameSettings } from '../types';
import { FIGHTERS } from '../fighters';
import { RANDOM_STAGE_ID, STAGES } from '../stages';
import { sound } from '../audio';
import { FighterThumbnail } from './FighterThumbnail';

interface StartScreenProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onStartBattle: () => void;
  onOpenSettings: () => void;
}

const DIFF_PRESETS = [
  { level: 1, label: 'Easy', id: 'diff-preset-1' },
  { level: 3, label: 'Normal', id: 'diff-preset-3' },
  { level: 6, label: 'Hard', id: 'diff-preset-6' },
  { level: 9, label: 'Master', id: 'cpu-level-btn-9' },
] as const;

function isDiffActive(cpuLevel: number, presetLevel: number) {
  if (presetLevel === 1) return cpuLevel <= 2;
  if (presetLevel === 3) return cpuLevel >= 3 && cpuLevel <= 5;
  if (presetLevel === 6) return cpuLevel >= 6 && cpuLevel <= 7;
  return cpuLevel >= 8;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  settings,
  onUpdateSettings,
  onStartBattle,
  onOpenSettings,
}) => {
  const fighterList = Object.values(FIGHTERS);
  const selectedP1 = FIGHTERS[settings.p1Fighter];
  const selectedP2 = FIGHTERS[settings.p2Fighter];

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

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 text-slate-100 flex flex-col px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-3 md:px-8 md:py-4 select-none">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-32 -left-32 w-72 h-72 rounded-full opacity-20 blur-3xl transition-all duration-700"
          style={{ backgroundColor: selectedP1.color }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-72 h-72 rounded-full opacity-20 blur-3xl transition-all duration-700"
          style={{ backgroundColor: selectedP2.color }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="p-1.5 sm:p-2 bg-gradient-to-br from-amber-500 to-red-600 text-slate-950 rounded-lg sm:rounded-xl shadow-[0_0_16px_rgba(245,158,11,0.35)] shrink-0">
            <Swords className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          </div>
          <h1 className="text-base sm:text-xl md:text-2xl font-black tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 truncate">
            Super Smash Brawler
          </h1>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            id="start-open-settings-btn"
            type="button"
            onClick={onOpenSettings}
            title="Settings"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-amber-300 hover:bg-slate-800 hover:border-amber-500/40 font-bold text-[10px] sm:text-xs transition cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>

          <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-900/90 border border-slate-800 p-0.5 sm:p-1 rounded-xl shrink-0">
          <button
            id="start-mode-cpu-btn"
            onClick={() => handleSetMode('cpu')}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer ${
              settings.mode === 'cpu'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CPU</span>
          </button>
          <button
            id="start-mode-training-btn"
            onClick={() => handleSetMode('training')}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer ${
              settings.mode === 'training'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Train</span>
          </button>
          <button
            id="start-mode-2p-btn"
            onClick={() => handleSetMode('2p')}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer ${
              settings.mode === '2p'
                ? 'bg-purple-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">2P</span>
          </button>
          </div>
        </div>
      </header>

      {/* Fighter select */}
      <main className="relative z-10 flex-1 min-h-0 grid grid-cols-2 gap-2 sm:gap-3 my-2 sm:my-2.5">
        <FighterPanel
          label="P1"
          labelColor={selectedP1.color}
          selectedName={selectedP1.name}
          selectedSuper={selectedP1.superMove.name}
          selectedId={settings.p1Fighter}
          fighters={fighterList}
          idPrefix="select-p1"
          onSelect={handleSelectP1}
        />
        <FighterPanel
          label={settings.mode === 'cpu' ? 'CPU' : settings.mode === 'training' ? 'Dummy' : 'P2'}
          labelColor={selectedP2.color}
          selectedName={selectedP2.name}
          selectedSuper={selectedP2.superMove.name}
          selectedId={settings.p2Fighter}
          fighters={fighterList}
          idPrefix="select-p2"
          onSelect={handleSelectP2}
        />
      </main>

      {/* Rules + fight */}
      <footer className="relative z-10 shrink-0 flex flex-col gap-1.5 sm:gap-2">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1.5 bg-slate-900/80 border border-slate-800 rounded-xl sm:rounded-2xl px-2 py-1.5 sm:px-3 sm:py-2">
          {settings.mode === 'cpu' && (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                Diff
              </span>
              <div className="flex gap-0.5 sm:gap-1">
                {DIFF_PRESETS.map(({ level, label, id }) => (
                  <button
                    key={level}
                    id={id}
                    onClick={() => handleSetCpuLevel(level)}
                    className={`px-2 sm:px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold transition cursor-pointer ${
                      isDiffActive(settings.cpuLevel, level)
                        ? 'bg-amber-400 text-slate-950 shadow'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
              Lives
            </span>
            <div className="flex gap-0.5 sm:gap-1">
              {[1, 2, 3, 5].map((stk) => (
                <button
                  key={stk}
                  id={`stock-btn-${stk}`}
                  onClick={() => onUpdateSettings({ ...settings, stocks: stk })}
                  className={`min-w-7 px-2 py-1 rounded-md text-[10px] sm:text-xs font-bold transition cursor-pointer ${
                    settings.stocks === stk
                      ? 'bg-red-500 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {stk}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
              Time
            </span>
            <div className="flex gap-0.5 sm:gap-1">
              {[
                { secs: 60, label: '1m' },
                { secs: 120, label: '2m' },
                { secs: 180, label: '3m' },
                { secs: 300, label: '5m' },
              ].map(({ secs, label }) => (
                <button
                  key={secs}
                  id={`duration-btn-${secs}`}
                  onClick={() => onUpdateSettings({ ...settings, matchDuration: secs })}
                  className={`px-2 py-1 rounded-md text-[10px] sm:text-xs font-bold transition cursor-pointer ${
                    settings.matchDuration === secs
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
              Stage
            </span>
            <select
              id="stage-select-dropdown"
              value={settings.stageId}
              onChange={(e) => onUpdateSettings({ ...settings, stageId: e.target.value })}
              className="bg-slate-800 border border-slate-700 text-slate-100 text-[10px] sm:text-xs font-bold rounded-lg px-2 py-1 cursor-pointer outline-none"
            >
              <option value={RANDOM_STAGE_ID}>Random</option>
              {Object.values(STAGES).map((stg) => (
                <option key={stg.id} value={stg.id}>
                  {stg.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
              Pad
            </span>
            <div className="flex gap-0.5 sm:gap-1">
              <button
                id="start-touch-joystick-btn"
                type="button"
                onClick={() => onUpdateSettings({ ...settings, touchMoveStyle: 'joystick' })}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold transition cursor-pointer ${
                  settings.touchMoveStyle === 'joystick'
                    ? 'bg-sky-500 text-white shadow'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <Circle className="w-3 h-3" />
                Stick
              </button>
              <button
                id="start-touch-dpad-btn"
                type="button"
                onClick={() => onUpdateSettings({ ...settings, touchMoveStyle: 'dpad' })}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold transition cursor-pointer ${
                  settings.touchMoveStyle === 'dpad'
                    ? 'bg-sky-500 text-white shadow'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <ArrowUp className="w-3 h-3" />
                D-Pad
              </button>
            </div>
          </div>
        </div>

        <button
          id="start-battle-fight-btn"
          onClick={() => {
            sound.playFightClash();
            onStartBattle();
          }}
          className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-slate-950 font-black text-sm sm:text-base tracking-wider uppercase rounded-xl sm:rounded-2xl shadow-[0_0_24px_rgba(245,158,11,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer group"
        >
          <span>FIGHT!</span>
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </button>
      </footer>
    </div>
  );
};

interface FighterPanelProps {
  label: string;
  labelColor: string;
  selectedName: string;
  selectedSuper?: string;
  selectedId: FighterId;
  fighters: (typeof FIGHTERS)[FighterId][];
  idPrefix: string;
  onSelect: (id: FighterId) => void;
}

const FighterPanel: React.FC<FighterPanelProps> = ({
  label,
  labelColor,
  selectedName,
  selectedSuper,
  selectedId,
  fighters,
  idPrefix,
  onSelect,
}) => (
  <section className="bg-slate-900/80 border border-slate-800 rounded-xl sm:rounded-2xl p-1.5 sm:p-3 flex flex-col min-h-0 overflow-hidden">
    <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2 shrink-0 min-w-0">
      <span
        className="px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-black uppercase text-slate-950 shrink-0"
        style={{ backgroundColor: labelColor }}
      >
        {label}
      </span>
      <div className="min-w-0 flex flex-col">
        <span className="text-[11px] sm:text-sm font-bold text-white truncate">{selectedName}</span>
        {selectedSuper && (
          <span className="text-[9px] sm:text-[10px] font-semibold text-amber-300/90 truncate">
            Super: {selectedSuper}
          </span>
        )}
      </div>
    </div>
    <div className="grid grid-cols-4 grid-rows-2 gap-1 sm:gap-1.5 flex-1 min-h-0">
      {fighters.map((f) => {
        const isSelected = selectedId === f.id;
        return (
          <button
            key={f.id}
            id={`${idPrefix}-${f.id}`}
            onClick={() => onSelect(f.id)}
            className={`relative rounded-lg sm:rounded-xl border flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all cursor-pointer min-h-0 p-1 overflow-hidden ${
              isSelected
                ? 'bg-slate-800 border-2 shadow-lg'
                : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
            }`}
            style={{
              borderColor: isSelected ? f.color : undefined,
              boxShadow: isSelected ? `0 0 12px ${f.glowColor}` : undefined,
            }}
          >
            <div className="w-full flex-1 min-h-[2.25rem] sm:min-h-[2.75rem] md:min-h-[3.25rem] max-h-16 sm:max-h-20">
              <FighterThumbnail stats={f} active={isSelected} />
            </div>
            <span className="text-[9px] sm:text-xs font-bold text-white truncate max-w-full leading-tight shrink-0">
              {f.name}
            </span>
          </button>
        );
      })}
    </div>
  </section>
);
