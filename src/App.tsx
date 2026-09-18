import React, { useState, useEffect, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { StartScreen } from './components/StartScreen';
import { ControlsOverlay } from './components/ControlsOverlay';
import { PauseModal } from './components/PauseModal';
import { SettingsModal } from './components/SettingsModal';
import { GameOverModal } from './components/GameOverModal';
import { Fighter, GameSettings, InputState } from './types';
import { FIGHTERS } from './fighters';
import { STAGES } from './stages';
import { createInitialFighter } from './physics';
import { sound } from './audio';

export default function App() {
  const [screen, setScreen] = useState<'start' | 'battle'>('start');

  const [settings, setSettings] = useState<GameSettings>({
    mode: 'cpu',
    cpuLevel: 2, // Default to Level 2 (Easy) as requested for ease of play!
    stocks: 3,
    matchDuration: 120, // 2 minutes
    stageId: 'battlefield',
    p1Fighter: 'brawler',
    p2Fighter: 'striker',
    soundEnabled: true,
    musicEnabled: true,
  });

  const [isPaused, setIsPaused] = useState(false);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [winner, setWinner] = useState<Fighter | null>(null);
  const [matchTime, setMatchTime] = useState(120);
  const [restartSignal, setRestartSignal] = useState(0);
  const emptyInput = (): InputState => ({
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
  });

  // Auto-enable on-screen pads for touch / coarse-pointer devices (iPhone, iPad, etc.)
  // Desktop testing: append ?touch=1 to the URL to force the pads on.
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forceTouch =
      params.get('touch') === '1' ||
      params.get('touch') === 'true' ||
      localStorage.getItem('ssb-force-touch') === '1';
    const coarse =
      forceTouch ||
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(hover: none)').matches ||
      (navigator.maxTouchPoints ?? 0) > 0;
    setIsTouchDevice(coarse);
    setShowTouchControls(coarse);
  }, []);

  // Live input state for HUD feedback & virtual buttons
  const [virtualInput, setVirtualInput] = useState<InputState>(emptyInput);
  const [activeInputFeedback, setActiveInputFeedback] = useState<InputState | undefined>();

  // Fighter HUD display state
  const [p1State, setP1State] = useState<Fighter>(() =>
    createInitialFighter(0, false, FIGHTERS[settings.p1Fighter], STAGES[settings.stageId]?.spawnPoints[0] || STAGES.battlefield.spawnPoints[0], 1)
  );
  const [p2State, setP2State] = useState<Fighter>(() =>
    createInitialFighter(1, true, FIGHTERS[settings.p2Fighter], STAGES[settings.stageId]?.spawnPoints[1] || STAGES.battlefield.spawnPoints[1], -1)
  );

  // Match countdown timer
  useEffect(() => {
    if (screen !== 'battle' || isPaused || winner) return;
    const timer = setInterval(() => {
      setMatchTime((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [screen, isPaused, winner]);

  // Audio settings sync
  useEffect(() => {
    sound.enabled = settings.soundEnabled;
    sound.musicEnabled = settings.musicEnabled;
    if (screen === 'battle' && settings.musicEnabled && !isPaused && !winner) {
      sound.startArenaMusic();
    } else {
      sound.stopArenaMusic();
    }
  }, [screen, settings.soundEnabled, settings.musicEnabled, isPaused, winner]);

  const handleUpdateFighters = useCallback((p1: Fighter, p2: Fighter) => {
    setP1State(p1);
    setP2State(p2);
  }, []);

  const handleGameOver = useCallback((winningFighter: Fighter) => {
    setWinner(winningFighter);
    sound.stopArenaMusic();
  }, []);

  // Time expired → declare winner by stocks, then lower damage %
  useEffect(() => {
    if (screen !== 'battle' || winner || matchTime > 0) return;
    let winningFighter: Fighter;
    if (p1State.stocks !== p2State.stocks) {
      winningFighter = p1State.stocks > p2State.stocks ? p1State : p2State;
    } else if (p1State.damagePercent !== p2State.damagePercent) {
      winningFighter = p1State.damagePercent < p2State.damagePercent ? p1State : p2State;
    } else {
      winningFighter = p1State;
    }
    handleGameOver(winningFighter);
  }, [screen, winner, matchTime, p1State, p2State, handleGameOver]);

  const handleRestart = useCallback(() => {
    setWinner(null);
    setIsPaused(false);
    setMatchTime(settings.matchDuration);
    setRestartSignal((prev) => prev + 1);
    if (settings.musicEnabled) {
      sound.startArenaMusic();
    }
  }, [settings.musicEnabled, settings.matchDuration]);

  const handleStartBattle = () => {
    setWinner(null);
    setIsPaused(false);
    setMatchTime(settings.matchDuration);
    setRestartSignal((prev) => prev + 1);
    setScreen('battle');
  };

  const handleBackToStart = () => {
    sound.stopArenaMusic();
    setIsPaused(false);
    setWinner(null);
    setScreen('start');
  };

  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const handleToggleSound = () => {
    setSettings((prev) => {
      const nextVal = !prev.soundEnabled;
      return { ...prev, soundEnabled: nextVal, musicEnabled: nextVal };
    });
  };

  const handleVirtualKey = useCallback((action: keyof InputState, isDown: boolean) => {
    setVirtualInput((prev) => (prev[action] === isDown ? prev : { ...prev, [action]: isDown }));
  }, []);

  const handleReleaseAllVirtual = useCallback(() => {
    setVirtualInput(emptyInput());
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {screen === 'start' ? (
        <StartScreen
          settings={settings}
          onUpdateSettings={setSettings}
          onStartBattle={handleStartBattle}
        />
      ) : (
        <HUD
          p1={p1State}
          p2={p2State}
          settings={settings}
          matchTime={matchTime}
          isPaused={isPaused}
          onTogglePause={handleTogglePause}
          onRestart={handleRestart}
          onToggleSound={handleToggleSound}
          onOpenControls={() => setIsControlsOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onBackToSelect={handleBackToStart}
          activeKeys={activeInputFeedback}
          isTouchDevice={isTouchDevice}
          showTouchControls={showTouchControls}
          onToggleTouchControls={() => setShowTouchControls((prev) => !prev)}
          onVirtualKey={handleVirtualKey}
          onReleaseAllVirtual={handleReleaseAllVirtual}
        >
          {/* Canvas Battle Arena (100% Unobstructed, zero overlays on top of the fight) */}
          <GameCanvas
            settings={settings}
            isPaused={isPaused || isControlsOpen || isSettingsOpen || winner !== null}
            onUpdateFighters={handleUpdateFighters}
            onGameOver={handleGameOver}
            restartSignal={restartSignal}
            virtualInput={virtualInput}
            onActiveInputState={setActiveInputFeedback}
          />
        </HUD>
      )}

      {/* Modals */}
      <ControlsOverlay
        isOpen={isControlsOpen}
        onClose={() => setIsControlsOpen(false)}
        is2Player={settings.mode === '2p'}
      />

      <PauseModal
        isOpen={isPaused}
        onResume={() => setIsPaused(false)}
        onRestart={handleRestart}
        onOpenSettings={() => {
          setIsPaused(false);
          setIsSettingsOpen(true);
        }}
        onOpenControls={() => setIsControlsOpen(true)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onStartMatch={() => {
          setIsSettingsOpen(false);
          handleRestart();
        }}
      />

      <GameOverModal
        winner={winner}
        onRematch={handleRestart}
        onOpenSettings={() => {
          setWinner(null);
          handleBackToStart();
        }}
      />
    </main>
  );
}

