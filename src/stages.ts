import { Stage } from './types';

export const STAGES: Record<string, Stage> = {
  battlefield: {
    id: 'battlefield',
    name: 'Smash Arena',
    subtitle: 'Classic Tri-Platform Floating Colosseum',
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
    bgGradient: ['#0f172a', '#1e1b4b'],
    platforms: [
      // Main Solid Stage
      {
        id: 'main-stage',
        x: 350,
        y: 500,
        width: 700,
        height: 60,
        isDropThrough: false,
        color: '#1e293b',
        borderColor: '#38bdf8',
      },
      // Left Floating Soft Platform
      {
        id: 'left-plat',
        x: 420,
        y: 380,
        width: 160,
        height: 14,
        isDropThrough: true,
        color: '#334155',
        borderColor: '#0284c7',
      },
      // Right Floating Soft Platform
      {
        id: 'right-plat',
        x: 820,
        y: 380,
        width: 160,
        height: 14,
        isDropThrough: true,
        color: '#334155',
        borderColor: '#0284c7',
      },
      // Top Center Floating Soft Platform
      {
        id: 'top-plat',
        x: 620,
        y: 260,
        width: 160,
        height: 14,
        isDropThrough: true,
        color: '#334155',
        borderColor: '#0284c7',
      },
    ],
  },
  destination: {
    id: 'destination',
    name: 'Final Destination',
    subtitle: 'Pure Competitive Flat Ground Floating in Orbit',
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
    bgGradient: ['#180828', '#2e1065'],
    platforms: [
      // Pure Flat Main Stage
      {
        id: 'destination-main',
        x: 320,
        y: 500,
        width: 760,
        height: 50,
        isDropThrough: false,
        color: '#1c1917',
        borderColor: '#c084fc',
      },
    ],
  },
  cyber: {
    id: 'cyber',
    name: 'Neon Skyway',
    subtitle: 'Futuristic Hovering Highway with Dual Jump-Pads',
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
    bgGradient: ['#022c22', '#0f172a'],
    platforms: [
      // Main Center Stage
      {
        id: 'cyber-main',
        x: 400,
        y: 500,
        width: 600,
        height: 55,
        isDropThrough: false,
        color: '#064e3b',
        borderColor: '#10b981',
      },
      // Lower Side Platform Left
      {
        id: 'cyber-side-left',
        x: 230,
        y: 430,
        width: 140,
        height: 14,
        isDropThrough: true,
        color: '#065f46',
        borderColor: '#34d399',
      },
      // Lower Side Platform Right
      {
        id: 'cyber-side-right',
        x: 1030,
        y: 430,
        width: 140,
        height: 14,
        isDropThrough: true,
        color: '#065f46',
        borderColor: '#34d399',
      },
    ],
  },
};
