import { Stage } from './types';

/** Sentinel stageId: pick a stage at random when the match starts. */
export const RANDOM_STAGE_ID = 'random';

export function pickStage(stageId: string): Stage {
  if (stageId === RANDOM_STAGE_ID) {
    const ids = Object.keys(STAGES);
    return STAGES[ids[Math.floor(Math.random() * ids.length)]];
  }
  return STAGES[stageId] || STAGES.battlefield;
}

export const STAGES: Record<string, Stage> = {
  battlefield: {
    id: 'battlefield',
    name: 'Amber Colosseum',
    subtitle: 'Sun-baked tri-platform arena under warm paper washes',
    width: 1400,
    height: 800,
    blastZone: {
      left: -350,
      right: 1750,
      top: -300,
      bottom: 950,
    },
    spawnPoints: [
      { x: 480, y: 350 },
      { x: 920, y: 350 },
      { x: 500, y: 280 },
      { x: 900, y: 280 },
    ],
    theme: 'battlefield',
    // Warm cream sky → dusty mauve ground
    bgGradient: ['#e8d5c4', '#5c3d48'],
    platforms: [
      {
        id: 'main-stage',
        x: 350,
        y: 500,
        width: 700,
        height: 60,
        isDropThrough: false,
        color: '#c4a882',
        borderColor: '#1a120e',
      },
      {
        id: 'left-plat',
        x: 420,
        y: 380,
        width: 160,
        height: 14,
        isDropThrough: true,
        color: '#d2b48c',
        borderColor: '#1a120e',
      },
      {
        id: 'right-plat',
        x: 820,
        y: 380,
        width: 160,
        height: 14,
        isDropThrough: true,
        color: '#d2b48c',
        borderColor: '#1a120e',
      },
      {
        id: 'top-plat',
        x: 620,
        y: 260,
        width: 160,
        height: 14,
        isDropThrough: true,
        color: '#d2b48c',
        borderColor: '#1a120e',
      },
    ],
  },
  destination: {
    id: 'destination',
    name: 'Moonlit Tide Bridge',
    subtitle: 'A lone stone causeway over a silver night sea',
    width: 1400,
    height: 800,
    blastZone: {
      left: -350,
      right: 1750,
      top: -300,
      bottom: 950,
    },
    spawnPoints: [
      { x: 460, y: 380 },
      { x: 940, y: 380 },
      { x: 620, y: 380 },
      { x: 780, y: 380 },
    ],
    theme: 'destination',
    // Deep indigo night → ink-black water
    bgGradient: ['#1a2744', '#0c1220'],
    platforms: [
      {
        id: 'destination-main',
        x: 320,
        y: 500,
        width: 760,
        height: 50,
        isDropThrough: false,
        color: '#9aa4b2',
        borderColor: '#12161f',
      },
    ],
  },
  cyber: {
    id: 'cyber',
    name: 'Jade Hot Springs',
    subtitle: 'Misty bamboo baths with twin wooden walkways',
    width: 1400,
    height: 800,
    blastZone: {
      left: -350,
      right: 1750,
      top: -300,
      bottom: 950,
    },
    spawnPoints: [
      { x: 430, y: 360 },
      { x: 970, y: 360 },
      { x: 300, y: 320 },
      { x: 1100, y: 320 },
    ],
    theme: 'cyber',
    // Soft jade mist → deep tea-green pools
    bgGradient: ['#c5d9c8', '#2f4a3c'],
    platforms: [
      {
        id: 'cyber-main',
        x: 400,
        y: 500,
        width: 600,
        height: 55,
        isDropThrough: false,
        color: '#8b6a4a',
        borderColor: '#1a140e',
      },
      {
        id: 'cyber-side-left',
        x: 230,
        y: 430,
        width: 140,
        height: 14,
        isDropThrough: true,
        color: '#a07d58',
        borderColor: '#1a140e',
      },
      {
        id: 'cyber-side-right',
        x: 1030,
        y: 430,
        width: 140,
        height: 14,
        isDropThrough: true,
        color: '#a07d58',
        borderColor: '#1a140e',
      },
    ],
  },

  // Smashville-style: wide main + single soft platform overhead
  skyfair: {
    id: 'skyfair',
    name: 'Lantern Skyfair',
    subtitle: 'Wide market dock with one floating lantern platform',
    width: 1400,
    height: 800,
    blastZone: {
      left: -350,
      right: 1750,
      top: -300,
      bottom: 950,
    },
    spawnPoints: [
      { x: 450, y: 380 },
      { x: 950, y: 380 },
      { x: 600, y: 280 },
      { x: 800, y: 280 },
    ],
    theme: 'skyfair',
    bgGradient: ['#2a1a3a', '#4a2030'],
    platforms: [
      {
        id: 'skyfair-main',
        x: 280,
        y: 500,
        width: 840,
        height: 52,
        isDropThrough: false,
        color: '#c9a06a',
        borderColor: '#1a120e',
      },
      {
        id: 'skyfair-balloon',
        x: 580,
        y: 330,
        width: 220,
        height: 14,
        isDropThrough: true,
        color: '#e8b86a',
        borderColor: '#1a120e',
      },
    ],
  },

  // Kalos Main Hall-style: main + soft platforms hanging over each ledge
  spire: {
    id: 'spire',
    name: 'Ivory Spire Hall',
    subtitle: 'Marble hall with platforms overhanging both ledges',
    width: 1400,
    height: 800,
    blastZone: {
      left: -350,
      right: 1750,
      top: -300,
      bottom: 950,
    },
    spawnPoints: [
      { x: 480, y: 380 },
      { x: 920, y: 380 },
      { x: 360, y: 280 },
      { x: 1040, y: 280 },
    ],
    theme: 'spire',
    bgGradient: ['#e8e0d4', '#5a4a68'],
    platforms: [
      {
        id: 'spire-main',
        x: 360,
        y: 500,
        width: 680,
        height: 55,
        isDropThrough: false,
        color: '#d8d0c4',
        borderColor: '#1e1824',
      },
      // Hang halfway past the left ledge (main starts at 360)
      {
        id: 'spire-left',
        x: 280,
        y: 355,
        width: 190,
        height: 14,
        isDropThrough: true,
        color: '#ece6dc',
        borderColor: '#1e1824',
      },
      // Hang halfway past the right ledge (main ends at 1040)
      {
        id: 'spire-right',
        x: 930,
        y: 355,
        width: 190,
        height: 14,
        isDropThrough: true,
        color: '#ece6dc',
        borderColor: '#1e1824',
      },
    ],
  },

  // Stadium Rock / ascent-style: diagonal stair shelves climbing left → right
  crater: {
    id: 'crater',
    name: 'Ember Ascent',
    subtitle: 'Volcanic stair shelves rising toward the crater rim',
    width: 1400,
    height: 800,
    blastZone: {
      left: -350,
      right: 1750,
      top: -300,
      bottom: 950,
    },
    spawnPoints: [
      { x: 460, y: 400 },
      { x: 780, y: 280 },
      { x: 560, y: 320 },
      { x: 900, y: 200 },
    ],
    theme: 'crater',
    bgGradient: ['#f0c090', '#3a1818'],
    platforms: [
      {
        id: 'crater-main',
        x: 380,
        y: 520,
        width: 640,
        height: 55,
        isDropThrough: false,
        color: '#8a5a42',
        borderColor: '#1a100c',
      },
      {
        id: 'crater-step-1',
        x: 400,
        y: 420,
        width: 150,
        height: 14,
        isDropThrough: true,
        color: '#a86848',
        borderColor: '#1a100c',
      },
      {
        id: 'crater-step-2',
        x: 560,
        y: 330,
        width: 150,
        height: 14,
        isDropThrough: true,
        color: '#b87850',
        borderColor: '#1a100c',
      },
      {
        id: 'crater-step-3',
        x: 720,
        y: 240,
        width: 150,
        height: 14,
        isDropThrough: true,
        color: '#c88858',
        borderColor: '#1a100c',
      },
      {
        id: 'crater-rim',
        x: 880,
        y: 160,
        width: 130,
        height: 14,
        isDropThrough: true,
        color: '#d49860',
        borderColor: '#1a100c',
      },
    ],
  },
};
