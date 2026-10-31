import React from 'react';
import { Player } from '../game/doozTypes';
import { resolveStoneSkin, type StoneRenderConfig } from '../economy/catalog';

export type StoneAppearance = StoneRenderConfig['p1'];

interface StonePieceProps {
  player: Player;
  appearance?: StoneAppearance;
  isSelected?: boolean;
  isRemovable?: boolean;
  isWinning?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

function Emblem({ kind, isP1 }: { kind: StoneAppearance['emblem']; isP1: boolean }) {
  const color = isP1 ? 'rgba(236,254,255,0.85)' : 'rgba(255,251,235,0.9)';
  if (kind === 'diamond') {
    return (
      <span
        aria-hidden="true"
        style={{
          width: '45%',
          height: '45%',
          border: `1.5px solid ${color}`,
          transform: 'rotate(45deg)',
          borderRadius: 2,
        }}
      />
    );
  }
  if (kind === 'star') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '58%', height: '58%' }}>
        <path
          d="M12 2.6l2.6 6.1 6.6.6-5 4.4 1.5 6.5L12 16.7 6.3 20.2l1.5-6.5-5-4.4 6.6-.6z"
          fill={color}
        />
      </svg>
    );
  }
  if (kind === 'khatam') {
    return (
      <span
        aria-hidden="true"
        style={{ position: 'relative', width: '58%', height: '58%', display: 'block' }}
      >
        <span
          style={{
            position: 'absolute',
            inset: '12%',
            border: `1.4px solid ${color}`,
            transform: 'rotate(45deg)',
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '12%',
            border: `1.4px solid ${color}`,
          }}
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{
        width: '44%',
        height: '44%',
        borderRadius: '9999px',
        border: `1.5px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{ width: '35%', height: '35%', borderRadius: '9999px', background: color }}
      />
    </span>
  );
}

export const StonePiece: React.FC<StonePieceProps> = ({
  player,
  appearance,
  isSelected = false,
  isRemovable = false,
  isWinning = false,
  size = 'md',
  onClick,
  className = '',
}) => {
  const isP1 = player === 'player1';
  const classic = resolveStoneSkin('skin_classic');
  const look = appearance ?? (isP1 ? classic.p1 : classic.p2);

  const sizeClasses = {
    sm: 'w-7 h-7 sm:w-8 sm:h-8',
    md: 'w-10 h-10 sm:w-12 sm:h-12',
    lg: 'w-14 h-14 sm:w-16 sm:h-16',
  }[size];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      data-player={player}
      aria-label={isP1 ? 'مهره بازیکن ۱' : 'مهره بازیکن ۲'}
      className={`
        ${sizeClasses}
        rounded-full relative flex items-center justify-center transition-all duration-200
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
        ${isSelected ? 'ring-4 ring-amber-300 scale-110 z-20 animate-pulse' : ''}
        ${isRemovable ? 'ring-4 ring-red-500 scale-105 z-20 animate-bounce' : ''}
        ${isWinning ? 'ring-4 ring-yellow-300 scale-110 z-20' : ''}
        ${className}
      `}
      style={{
        backgroundImage: `linear-gradient(145deg, ${look.from} 0%, ${look.via} 55%, ${look.to} 100%)`,
        border: `2px solid ${look.border}`,
        boxShadow: `0 4px 12px ${look.glow}`,
      }}
    >
      {/* 3D highlight sheen */}
      <span
        aria-hidden="true"
        className="absolute top-1 left-1.5 w-1/3 h-1/3 bg-white/40 rounded-full blur-[1px] pointer-events-none"
      />

      <Emblem kind={look.emblem} isP1={isP1} />

      {/* Shape marker keeps players distinguishable without relying on colour. */}
      <span
        aria-hidden="true"
        className="absolute -top-0.5 right-1"
        style={{
          width: 5,
          height: 5,
          borderRadius: isP1 ? '9999px' : 1,
          transform: isP1 ? undefined : 'rotate(45deg)',
          background: look.border,
          opacity: 0.95,
        }}
      />

      {isRemovable && (
        <span className="absolute inset-0 flex items-center justify-center text-white font-black text-xs sm:text-sm drop-shadow-md">
          ✕
        </span>
      )}
    </button>
  );
};
