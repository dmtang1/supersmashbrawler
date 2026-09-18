import React from 'react';
import { X, Keyboard, Zap, ArrowUp, ArrowDown, ArrowRight, ArrowLeft } from 'lucide-react';

interface ControlsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  is2Player: boolean;
}

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({ isOpen, onClose, is2Player }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl text-slate-100 relative">
        <button
          id="close-controls-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5 border-b border-slate-800 pb-4">
          <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">Battle Controls Guide</h2>
            <p className="text-xs text-slate-400">Master movement, punches, kicks, blocks, grabs, item weapons, and 4-way throws</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {/* Movement & Basic Actions */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-3 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" />
              Primary Combat
            </h3>
            <ul className="space-y-2.5">
              <li className="flex items-center justify-between">
                <span className="text-slate-300">Move / Aim</span>
                <div className="flex items-center gap-1 font-mono text-xs">
                  <kbd className="px-2 py-1 bg-slate-700 border border-slate-600 rounded">W</kbd>
                  <kbd className="px-2 py-1 bg-slate-700 border border-slate-600 rounded">A</kbd>
                  <kbd className="px-2 py-1 bg-slate-700 border border-slate-600 rounded">S</kbd>
                  <kbd className="px-2 py-1 bg-slate-700 border border-slate-600 rounded">D</kbd>
                </div>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-300">Jump / Double Jump</span>
                <kbd className="px-2.5 py-1 bg-slate-700 border border-slate-600 rounded font-mono text-xs">W</kbd>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-300">Sprint (Dash)</span>
                <kbd className="px-2.5 py-1 bg-slate-700 border border-slate-600 rounded font-mono text-xs">Shift</kbd>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold text-amber-300">Punch Attack</span>
                <kbd className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded font-mono text-xs font-bold">
                  Space
                </kbd>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold text-rose-300">Kick Attack</span>
                <kbd className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded font-mono text-xs font-bold">
                  C
                </kbd>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold text-cyan-300">Block / Guard</span>
                <kbd className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded font-mono text-xs font-bold">
                  B
                </kbd>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold text-sky-300">Grab Opponent</span>
                <kbd className="px-3 py-1 bg-sky-500/20 text-sky-300 border border-sky-500/40 rounded font-mono text-xs font-bold">
                  V
                </kbd>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold text-amber-200">Super Move (full meter)</span>
                <kbd className="px-3 py-1 bg-amber-500/20 text-amber-200 border border-amber-500/40 rounded font-mono text-xs font-bold">
                  F
                </kbd>
              </li>
            </ul>
          </div>

          {/* Directional Throws */}
          <div className="bg-slate-800/60 border border-amber-500/40 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Directional Grab Throws
            </h3>
            <p className="text-xs text-slate-400 mb-2.5">
              Press <span className="text-sky-300 font-bold">V</span> to grab, then input a direction:
            </p>
            <ul className="space-y-2">
              <li className="flex items-center justify-between bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-200">
                  <ArrowUp className="w-3.5 h-3.5 text-sky-400" />
                  <span>Toss Up</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">V + W</span>
              </li>
              <li className="flex items-center justify-between bg-slate-900/60 p-2 rounded-lg border border-amber-500/30">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Toss Down & Bounce!</span>
                </div>
                <span className="text-[11px] font-mono text-amber-300 font-bold">V + S</span>
              </li>
              <li className="flex items-center justify-between bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-200">
                  <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
                  <span>Throw Forward</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">V + D</span>
              </li>
              <li className="flex items-center justify-between bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-200">
                  <ArrowLeft className="w-3.5 h-3.5 text-sky-400" />
                  <span>Toss The Other Way</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">V + A</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Super Moves */}
        <div className="mt-4 p-3.5 bg-gradient-to-r from-amber-950/50 to-slate-900 border border-amber-500/40 rounded-xl text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-300 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Unique Super Moves</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Fight to fill the amber Super meter — mostly from damage you deal, plus some from damage taken.
            Expect roughly one READY per stock. When it reads READY, press{' '}
            <span className="text-amber-300 font-bold">F</span> (P1) or{' '}
            <span className="text-amber-300 font-bold">;</span> (P2) to fire your fighter&apos;s unique finisher. Touch
            devices use the Super pad.
          </p>
        </div>

        {/* Item Drops */}
        <div className="mt-4 p-3.5 bg-gradient-to-r from-amber-950/50 to-slate-900 border border-amber-500/40 rounded-xl text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-300 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Item Drops Every Match</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Weapon crates fall onto the stage throughout the fight — blasters, ray guns, swords, beam swords, hammers, home-run bats, and bombs. Walk into a crate to pick it up. Punch uses the weapon; grab (<span className="text-sky-300 font-bold">V</span>) tosses it away. Hold <span className="text-cyan-300 font-bold">B</span> to block punches, kicks, and shots from the front.
          </p>
        </div>

        {/* Ledge Grab & Recovery Banner */}
        <div className="mt-4 p-3.5 bg-gradient-to-r from-sky-950/60 to-slate-900 border border-sky-500/40 rounded-xl text-xs">
          <div className="flex items-center gap-2 font-bold text-sky-300 mb-1">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            <span>Ledge Grab & Recovery (Sweetspot)</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            When recovering from off-stage, jumping near any platform corner automatically snaps you onto the edge! Grabbing the ledge restores all your double jumps and grants invincibility frames.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 font-mono text-[11px]">
            <div className="bg-slate-950/70 px-2 py-1 rounded border border-slate-800 text-sky-200">
              <span className="text-white font-bold">[W]</span> Ledge Jump
            </div>
            <div className="bg-slate-950/70 px-2 py-1 rounded border border-slate-800 text-sky-200">
              <span className="text-white font-bold">[D / A]</span> Climb Up
            </div>
            <div className="bg-slate-950/70 px-2 py-1 rounded border border-slate-800 text-sky-200">
              <span className="text-white font-bold">[Space]</span> Ledge Attack
            </div>
            <div className="bg-slate-950/70 px-2 py-1 rounded border border-slate-800 text-sky-200">
              <span className="text-white font-bold">[S]</span> Drop / Fall
            </div>
          </div>
        </div>

        {/* 2-Player Controls note */}
        {is2Player && (
          <div className="mt-4 p-3 bg-sky-950/40 border border-sky-800/60 rounded-xl text-xs flex items-center justify-between">
            <span className="text-sky-200 font-medium">Player 2 Keys:</span>
            <span className="font-mono text-slate-300">
              Arrows: Move | Enter: Punch | L: Kick | K: Grab | O: Block | RShift: Sprint | ;: Super
            </span>
          </div>
        )}

        <div className="mt-4 p-3 bg-slate-800/50 border border-slate-700/60 rounded-xl text-xs text-slate-300">
          <span className="text-sky-300 font-bold">Touch / iPad:</span> On phones and tablets, translucent pads appear in the
          lower corners (left = joystick, right = sprint / jump / attacks / block). They stay out of the center of the arena.
          Use the phone icon in the header to hide them if you pair a keyboard or controller.
        </div>

        <div className="mt-6 flex justify-end">
          <button
            id="controls-got-it-btn"
            onClick={onClose}
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-5 py-2 rounded-xl transition cursor-pointer"
          >
            Got It, Let's Fight!
          </button>
        </div>
      </div>
    </div>
  );
};
