import React, { useEffect } from 'react';
import { Trophy, RotateCcw, Settings, Flame } from 'lucide-react';
import { Fighter } from '../types';
import { sound } from '../audio';

interface GameOverModalProps {
  winner: Fighter | null;
  onRematch: () => void;
  onOpenSettings: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  winner,
  onRematch,
  onOpenSettings,
}) => {
  useEffect(() => {
    if (winner) {
      sound.playVictory();
    }
  }, [winner]);

  if (!winner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md animate-in zoom-in-95 duration-200 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]">
      <div className="text-center max-w-lg w-full bg-slate-900/90 border border-slate-700/80 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Animated Accent Glow */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: winner.stats.color }}
        />

        {/* Smash GAME! Header */}
        <div className="mb-2">
          <span className="font-black text-6xl tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-red-600 drop-shadow-[0_4px_16px_rgba(245,158,11,0.5)] italic">
            GAME!
          </span>
        </div>

        {/* Winner Showcase */}
        <div className="my-6 p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-inner">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 mb-3">
            <Trophy className="w-8 h-8 animate-bounce" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {winner.stats.name} WINS!
          </h2>
          <p className="text-sm font-semibold mt-1" style={{ color: winner.stats.color }}>
            {winner.playerIndex === 0 ? 'Player 1' : winner.isCpu ? 'CPU Opponent' : 'Player 2'} Victory
          </p>
          <p className="text-xs text-slate-400 mt-2 italic">{winner.stats.tagline}</p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            id="gameover-rematch-btn"
            onClick={onRematch}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-slate-950 font-black px-6 py-3 rounded-xl shadow-lg transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Rematch
          </button>
          <button
            id="gameover-select-btn"
            onClick={onOpenSettings}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-6 py-3 rounded-xl border border-slate-600 transition cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            Fighter / Stage Select
          </button>
        </div>
      </div>
    </div>
  );
};
