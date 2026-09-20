import React from 'react';
import { X, Play, Sliders, Shield, MapPin, Bot, Users } from 'lucide-react';
import { FighterId, GameSettings } from '../types';
import { FIGHTERS } from '../fighters';
import { RANDOM_STAGE_ID, STAGES } from '../stages';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onStartMatch: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onStartMatch,
}) => {
  if (!isOpen) return null;

  const fighterList = Object.values(FIGHTERS);
  const stageList = Object.values(STAGES);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in zoom-in-95 duration-150 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full p-6 shadow-2xl text-slate-100 relative my-auto">
        <button
          id="close-settings-modal-btn"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">Battle Setup & Character Select</h2>
            <p className="text-xs text-slate-400">Configure battle mode, fighters, stages, and CPU strength</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Game Mode Selection */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
              Match Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                id="mode-cpu-btn"
                onClick={() => onUpdateSettings({ ...settings, mode: 'cpu' })}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border font-bold text-xs transition cursor-pointer ${
                  settings.mode === 'cpu'
                    ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Bot className="w-4 h-4" />
                Vs CPU
              </button>
              <button
                id="mode-2p-btn"
                onClick={() => onUpdateSettings({ ...settings, mode: '2p' })}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border font-bold text-xs transition cursor-pointer ${
                  settings.mode === '2p'
                    ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                2-Player Local
              </button>
              <button
                id="mode-training-btn"
                onClick={() => onUpdateSettings({ ...settings, mode: 'training' })}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border font-bold text-xs transition cursor-pointer ${
                  settings.mode === 'training'
                    ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Shield className="w-4 h-4" />
                Training Dummy
              </button>
            </div>
          </div>

          {/* CPU Difficulty (if CPU mode) */}
          {settings.mode === 'cpu' && (
            <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/60">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  CPU Difficulty Level
                </label>
                <span className="text-xs font-mono font-bold text-amber-400">
                  Level {settings.cpuLevel}{' '}
                  {settings.cpuLevel >= 8
                    ? '(Master)'
                    : settings.cpuLevel >= 6
                      ? '(Hard)'
                      : settings.cpuLevel >= 3
                        ? '(Normal)'
                        : '(Easy)'}
                </span>
              </div>
              <input
                id="cpu-level-slider"
                type="range"
                min={1}
                max={9}
                value={settings.cpuLevel}
                onChange={(e) => onUpdateSettings({ ...settings, cpuLevel: parseInt(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>1 Easy</span>
                <span>3 Normal</span>
                <span>6 Hard</span>
                <span>9 Master</span>
              </div>
            </div>
          )}

          {/* Stocks Count */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
              Stock Count (Lives)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 5].map((cnt) => (
                <button
                  key={cnt}
                  id={`stock-${cnt}-btn`}
                  onClick={() => onUpdateSettings({ ...settings, stocks: cnt })}
                  className={`flex-1 py-2 rounded-xl border font-bold text-xs transition cursor-pointer ${
                    settings.stocks === cnt
                      ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {cnt} {cnt === 1 ? 'Stock' : 'Stocks'}
                </button>
              ))}
            </div>
          </div>

          {/* Match Time Limit */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
              Match Time Limit
            </label>
            <div className="flex gap-2">
              {[
                { secs: 60, label: '1 Min' },
                { secs: 120, label: '2 Min' },
                { secs: 180, label: '3 Min' },
                { secs: 300, label: '5 Min' },
              ].map(({ secs, label }) => (
                <button
                  key={secs}
                  id={`duration-${secs}-btn`}
                  onClick={() => onUpdateSettings({ ...settings, matchDuration: secs })}
                  className={`flex-1 py-2 rounded-xl border font-bold text-xs transition cursor-pointer ${
                    settings.matchDuration === secs
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Fighter Select Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* P1 Fighter */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-2 block">
                Player 1 Fighter
              </label>
              <div className="grid grid-cols-2 gap-2">
                {fighterList.map((f) => (
                  <button
                    key={f.id}
                    id={`p1-fighter-${f.id}-btn`}
                    onClick={() => onUpdateSettings({ ...settings, p1Fighter: f.id as FighterId })}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      settings.p1Fighter === f.id
                        ? 'border-2 shadow-md'
                        : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800'
                    }`}
                    style={{
                      borderColor: settings.p1Fighter === f.id ? f.color : undefined,
                      backgroundColor: settings.p1Fighter === f.id ? `${f.color}15` : undefined,
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                      <span className="font-bold text-xs text-white truncate">{f.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">{f.tagline}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* P2 / CPU Fighter */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 block">
                {settings.mode === 'cpu' ? 'CPU Fighter' : 'Player 2 Fighter'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {fighterList.map((f) => (
                  <button
                    key={f.id}
                    id={`p2-fighter-${f.id}-btn`}
                    onClick={() => onUpdateSettings({ ...settings, p2Fighter: f.id as FighterId })}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      settings.p2Fighter === f.id
                        ? 'border-2 shadow-md'
                        : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800'
                    }`}
                    style={{
                      borderColor: settings.p2Fighter === f.id ? f.color : undefined,
                      backgroundColor: settings.p2Fighter === f.id ? `${f.color}15` : undefined,
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                      <span className="font-bold text-xs text-white truncate">{f.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">{f.tagline}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stage Selection */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              Battle Stage
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                id="stage-random-btn"
                onClick={() => onUpdateSettings({ ...settings, stageId: RANDOM_STAGE_ID })}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  settings.stageId === RANDOM_STAGE_ID
                    ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="font-bold text-xs text-white truncate">Random</div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">Surprise stage each match</div>
              </button>
              {stageList.map((stg) => (
                <button
                  key={stg.id}
                  id={`stage-${stg.id}-btn`}
                  onClick={() => onUpdateSettings({ ...settings, stageId: stg.id })}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    settings.stageId === stg.id
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-bold text-xs text-white truncate">{stg.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">{stg.subtitle}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="mt-7 flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
          <button
            id="cancel-settings-btn"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="start-match-btn"
            onClick={onStartMatch}
            className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-black px-6 py-2.5 rounded-xl shadow-lg transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            Apply & Start Fight!
          </button>
        </div>
      </div>
    </div>
  );
};
