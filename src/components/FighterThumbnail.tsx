import React, { useEffect, useRef } from 'react';
import { FighterStats } from '../types';
import { renderFighterPortrait } from '../renderer';

interface FighterThumbnailProps {
  stats: FighterStats;
  className?: string;
  /** When true, accessories animate a bit more lively */
  active?: boolean;
}

export const FighterThumbnail: React.FC<FighterThumbnailProps> = ({
  stats,
  className = '',
  active = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animTickRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let lastW = 0;
    let lastH = 0;

    const syncSize = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      syncSize();
      animTickRef.current += active ? 0.9 : 0.45;
      renderFighterPortrait(ctx, stats, lastW, lastH, animTickRef.current);
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [stats, active]);

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-full ${className}`}
      aria-hidden
    />
  );
};
