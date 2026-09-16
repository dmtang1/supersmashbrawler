/**
 * Synthesized Web Audio engine for Super Smash style sound effects & battle ambience.
 * Zero external audio files required, instant playback with no latency.
 */

import type { FighterId } from './types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  public musicEnabled: boolean = true;
  private musicInterval: number | null = null;
  private currentStep = 0;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playJump(isDoubleJump = false) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = isDoubleJump ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isDoubleJump ? 300 : 180, now);
    osc.frequency.exponentialRampToValueAtTime(isDoubleJump ? 680 : 360, now + 0.12);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /** Character-flavored punch / kick — each fighter has a distinct attack voice. */
  public playAttack(fighterId: FighterId, kind: 'punch' | 'kick') {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    switch (fighterId) {
      case 'striker':
        this.playStrikerAttack(kind);
        break;
      case 'zephyr':
        this.playZephyrAttack(kind);
        break;
      case 'brawler':
        this.playBrawlerAttack(kind);
        break;
      case 'yeti':
        this.playYetiAttack(kind);
        break;
      case 'titan':
        this.playTitanAttack(kind);
        break;
      case 'shinobi':
        this.playShinobiAttack(kind);
        break;
      default:
        if (kind === 'kick') this.playKick();
        else this.playPunch();
    }
  }

  public playPunch() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Whoosh / punch snap
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);

    // Punch impact noise burst
    this.playNoiseBurst(0.07, 0.25, 600);
  }

  public playKick() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Heavy kick thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.16);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);

    this.playNoiseBurst(0.12, 0.35, 400);
  }

  /** Neon Striker — electric zap / arc crackle */
  private playStrikerAttack(kind: 'punch' | 'kick') {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const heavy = kind === 'kick';

    // Sharp voltage snap
    const zap = this.ctx.createOscillator();
    const zapGain = this.ctx.createGain();
    zap.type = 'sawtooth';
    zap.frequency.setValueAtTime(heavy ? 1100 : 900, now);
    zap.frequency.exponentialRampToValueAtTime(heavy ? 90 : 140, now + (heavy ? 0.14 : 0.09));
    zapGain.gain.setValueAtTime(heavy ? 0.38 : 0.28, now);
    zapGain.gain.exponentialRampToValueAtTime(0.01, now + (heavy ? 0.16 : 0.1));
    zap.connect(zapGain);
    zapGain.connect(this.ctx.destination);
    zap.start(now);
    zap.stop(now + (heavy ? 0.18 : 0.12));

    // High-freq sparkle buzz
    const buzz = this.ctx.createOscillator();
    const buzzGain = this.ctx.createGain();
    buzz.type = 'square';
    buzz.frequency.setValueAtTime(heavy ? 2400 : 1800, now);
    buzz.frequency.exponentialRampToValueAtTime(400, now + 0.06);
    buzzGain.gain.setValueAtTime(0.12, now);
    buzzGain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
    buzz.connect(buzzGain);
    buzzGain.connect(this.ctx.destination);
    buzz.start(now);
    buzz.stop(now + 0.08);

    this.playNoiseBurst(heavy ? 0.1 : 0.06, heavy ? 0.4 : 0.28, heavy ? 2200 : 1800);
  }

  /** Zephyr Drake — airy wind whoosh */
  private playZephyrAttack(kind: 'punch' | 'kick') {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const heavy = kind === 'kick';

    const whoosh = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    whoosh.type = 'sine';
    whoosh.frequency.setValueAtTime(heavy ? 520 : 380, now);
    whoosh.frequency.exponentialRampToValueAtTime(heavy ? 160 : 220, now + (heavy ? 0.18 : 0.12));
    gain.gain.setValueAtTime(heavy ? 0.28 : 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + (heavy ? 0.2 : 0.14));
    whoosh.connect(gain);
    gain.connect(this.ctx.destination);
    whoosh.start(now);
    whoosh.stop(now + (heavy ? 0.22 : 0.15));

    // Soft flutter overtone
    const flutter = this.ctx.createOscillator();
    const flutterGain = this.ctx.createGain();
    flutter.type = 'triangle';
    flutter.frequency.setValueAtTime(heavy ? 900 : 700, now);
    flutter.frequency.exponentialRampToValueAtTime(300, now + 0.1);
    flutterGain.gain.setValueAtTime(0.1, now);
    flutterGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    flutter.connect(flutterGain);
    flutterGain.connect(this.ctx.destination);
    flutter.start(now);
    flutter.stop(now + 0.13);

    this.playNoiseBurst(heavy ? 0.14 : 0.08, heavy ? 0.28 : 0.18, heavy ? 900 : 700);
  }

  /** Blaze Brawler — fiery crackle / flame burst */
  private playBrawlerAttack(kind: 'punch' | 'kick') {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const heavy = kind === 'kick';

    const flame = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    flame.type = 'sawtooth';
    flame.frequency.setValueAtTime(heavy ? 280 : 220, now);
    flame.frequency.exponentialRampToValueAtTime(heavy ? 55 : 70, now + (heavy ? 0.16 : 0.1));
    gain.gain.setValueAtTime(heavy ? 0.36 : 0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + (heavy ? 0.18 : 0.11));
    flame.connect(gain);
    gain.connect(this.ctx.destination);
    flame.start(now);
    flame.stop(now + (heavy ? 0.2 : 0.12));

    this.playNoiseBurst(heavy ? 0.16 : 0.09, heavy ? 0.42 : 0.3, heavy ? 550 : 480);
  }

  /** Glacial Yeti — ice crack / crystalline crunch */
  private playYetiAttack(kind: 'punch' | 'kick') {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const heavy = kind === 'kick';

    const ice = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    ice.type = 'triangle';
    ice.frequency.setValueAtTime(heavy ? 720 : 980, now);
    ice.frequency.exponentialRampToValueAtTime(heavy ? 180 : 320, now + (heavy ? 0.15 : 0.09));
    gain.gain.setValueAtTime(heavy ? 0.35 : 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + (heavy ? 0.17 : 0.1));
    ice.connect(gain);
    gain.connect(this.ctx.destination);
    ice.start(now);
    ice.stop(now + (heavy ? 0.19 : 0.12));

    // Brittle crystal ping
    const ping = this.ctx.createOscillator();
    const pingGain = this.ctx.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(heavy ? 1400 : 1600, now);
    ping.frequency.exponentialRampToValueAtTime(900, now + 0.08);
    pingGain.gain.setValueAtTime(0.15, now);
    pingGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    ping.connect(pingGain);
    pingGain.connect(this.ctx.destination);
    ping.start(now);
    ping.stop(now + 0.11);

    this.playNoiseBurst(heavy ? 0.12 : 0.07, heavy ? 0.35 : 0.22, heavy ? 1400 : 1600);
  }

  /** Gilded Titan — heavy metal thud / seismic boom */
  private playTitanAttack(kind: 'punch' | 'kick') {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const heavy = kind === 'kick';

    const thud = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    thud.type = 'square';
    thud.frequency.setValueAtTime(heavy ? 120 : 150, now);
    thud.frequency.exponentialRampToValueAtTime(heavy ? 28 : 40, now + (heavy ? 0.22 : 0.14));
    gain.gain.setValueAtTime(heavy ? 0.48 : 0.36, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + (heavy ? 0.24 : 0.16));
    thud.connect(gain);
    gain.connect(this.ctx.destination);
    thud.start(now);
    thud.stop(now + (heavy ? 0.26 : 0.17));

    // Metallic clang overtone
    const clang = this.ctx.createOscillator();
    const clangGain = this.ctx.createGain();
    clang.type = 'triangle';
    clang.frequency.setValueAtTime(heavy ? 480 : 560, now);
    clang.frequency.exponentialRampToValueAtTime(120, now + 0.1);
    clangGain.gain.setValueAtTime(0.18, now);
    clangGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    clang.connect(clangGain);
    clangGain.connect(this.ctx.destination);
    clang.start(now);
    clang.stop(now + 0.13);

    this.playNoiseBurst(heavy ? 0.18 : 0.1, heavy ? 0.45 : 0.3, heavy ? 280 : 350);
  }

  /** Shadow Shinobi — sharp blade slash / soft cut */
  private playShinobiAttack(kind: 'punch' | 'kick') {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const heavy = kind === 'kick';

    const slash = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    slash.type = 'sawtooth';
    slash.frequency.setValueAtTime(heavy ? 1600 : 1200, now);
    slash.frequency.exponentialRampToValueAtTime(heavy ? 200 : 280, now + (heavy ? 0.12 : 0.07));
    gain.gain.setValueAtTime(heavy ? 0.32 : 0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + (heavy ? 0.13 : 0.08));
    slash.connect(gain);
    gain.connect(this.ctx.destination);
    slash.start(now);
    slash.stop(now + (heavy ? 0.14 : 0.09));

    // Quiet void undertone
    const voidOsc = this.ctx.createOscillator();
    const voidGain = this.ctx.createGain();
    voidOsc.type = 'sine';
    voidOsc.frequency.setValueAtTime(heavy ? 180 : 220, now);
    voidOsc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
    voidGain.gain.setValueAtTime(0.12, now);
    voidGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    voidOsc.connect(voidGain);
    voidGain.connect(this.ctx.destination);
    voidOsc.start(now);
    voidOsc.stop(now + 0.13);

    this.playNoiseBurst(heavy ? 0.09 : 0.05, heavy ? 0.3 : 0.2, heavy ? 2400 : 2000);
  }

  public playFightClash() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.25);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);
    this.playNoiseBurst(0.2, 0.45, 1200);
  }

  public playBlock() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.09);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.11);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);

    this.playNoiseBurst(0.06, 0.22, 2800);
  }

  public playGrab() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.1);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playLedgeGrab() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);

    // Subtle metallic click
    this.playNoiseBurst(0.04, 0.2, 1800);
  }

  public playThrow(direction: 'up' | 'down' | 'forward' | 'back') {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    if (direction === 'up') {
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
    } else if (direction === 'down') {
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
    } else {
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(550, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);
    }

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playGroundBounce() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Low rumble slam
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.25);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);

    // Springy bounce chirp
    const chirp = this.ctx.createOscillator();
    const chirpGain = this.ctx.createGain();
    chirp.type = 'sine';
    chirp.frequency.setValueAtTime(220, now + 0.05);
    chirp.frequency.exponentialRampToValueAtTime(580, now + 0.2);

    chirpGain.gain.setValueAtTime(0.0, now);
    chirpGain.gain.setValueAtTime(0.3, now + 0.05);
    chirpGain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    chirp.connect(chirpGain);
    chirpGain.connect(this.ctx.destination);
    chirp.start(now + 0.05);
    chirp.stop(now + 0.24);

    this.playNoiseBurst(0.15, 0.4, 300);
  }

  public playKoExplosion() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Deep Sub-Bass blast
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.6);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.75);

    // Lightning zap
    const zap = this.ctx.createOscillator();
    const zapGain = this.ctx.createGain();
    zap.type = 'triangle';
    zap.frequency.setValueAtTime(900, now);
    zap.frequency.exponentialRampToValueAtTime(80, now + 0.35);

    zapGain.gain.setValueAtTime(0.4, now);
    zapGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    zap.connect(zapGain);
    zapGain.connect(this.ctx.destination);
    zap.start(now);
    zap.stop(now + 0.45);

    // Blast noise
    this.playNoiseBurst(0.5, 0.6, 800);
  }

  public playVictory() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99]; // C, E, G, C, E, G
    const now = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);

      gain.gain.setValueAtTime(0.28, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.45);
    });
  }

  private playNoiseBurst(duration: number, volume: number, filterFreq = 1000) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
  }

  public startArenaMusic() {
    if (!this.musicEnabled || this.musicInterval) return;
    this.initCtx();

    // Energetic arena bassline pattern
    const bassline = [110, 110, 130.81, 110, 146.83, 130.81, 123.47, 98];
    const tempoMs = 180;

    this.musicInterval = window.setInterval(() => {
      if (!this.musicEnabled || !this.ctx || this.ctx.state !== 'running') return;
      
      const now = this.ctx.currentTime;
      const freq = bassline[this.currentStep % bassline.length];
      
      // Synth bass note
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380, now);
      filter.frequency.exponentialRampToValueAtTime(140, now + 0.15);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.17);

      this.currentStep++;
    }, tempoMs);
  }

  public playGlide() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.18);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playFreeze() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Chime crystalline tink
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.22);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playLightning() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
    this.playNoiseBurst(0.1, 0.35, 1200);
  }

  public playFireBurst() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    this.playNoiseBurst(0.22, 0.45, 450);
  }

  public playShadowPhase() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.16);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playQuake() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.3);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
    this.playNoiseBurst(0.2, 0.5, 250);
  }

  public playItemSpawn() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.16);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playItemPickup() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.1);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playItemBreak() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    this.playNoiseBurst(0.12, 0.28, 900);
  }

  public playGunshot() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.08);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
    this.playNoiseBurst(0.07, 0.32, 1400);
  }

  public playLaser() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.09);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playWeaponSwing(kind: 'sword' | 'beam_sword' | 'hammer' | 'bat' | string) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const heavy = kind === 'hammer' || kind === 'bat';
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = heavy ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(heavy ? 180 : 340, now);
    osc.frequency.exponentialRampToValueAtTime(heavy ? 40 : 90, now + (heavy ? 0.16 : 0.1));
    gain.gain.setValueAtTime(heavy ? 0.38 : 0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + (heavy ? 0.18 : 0.12));
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + (heavy ? 0.2 : 0.13));
    this.playNoiseBurst(heavy ? 0.12 : 0.06, heavy ? 0.35 : 0.2, heavy ? 500 : 800);
  }

  public playBombThrow() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playBombExplode() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    this.playNoiseBurst(0.22, 0.5, 380);
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.28);
    gain.gain.setValueAtTime(0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  public stopArenaMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const sound = new SoundEngine();
