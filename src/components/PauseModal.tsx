import React from 'react';
import { Play, RotateCcw, Settings, HelpCircle, X } from 'lucide-react';

interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onOpenControls: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  onResume,
  onRestart,
  onOpenSettings,
  onOpenControls,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-slate-100 text-center relative">
        <button
          id="close-pause-modal-btn"
          onClick={onResume}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-black tracking-tight text-white mb-1">Match Paused</h2>
        <p className="text-xs text-slate-400 mb-6">Take a breather or change battle options</p>

        <div className="flex flex-col gap-2.5">
          <button
            id="pause-resume-btn"
            onClick={onResume}
            className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black py-2.5 px-4 rounded-xl transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            Resume Fight
          </button>

          <button
            id="pause-restart-btn"
            onClick={onRestart}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 px-4 rounded-xl border border-slate-700 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Restart Match
          </button>

          <button
            id="pause-controls-btn"
            onClick={onOpenControls}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 px-4 rounded-xl border border-slate-700 transition cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-sky-400" />
            View Controls
          </button>

          <button
            id="pause-settings-btn"
            onClick={onOpenSettings}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 px-4 rounded-xl border border-slate-700 transition cursor-pointer"
          >
            <Settings className="w-4 h-4 text-amber-400" />
            Fighter & Stage Select
          </button>
        </div>
      </div>
    </div>
  );
};
