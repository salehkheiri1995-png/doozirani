import React from 'react';
import { Player } from '../game/doozTypes';
import { CosmeticSkin, getSkinById, getActiveSkinId } from '../utils/monetization';

interface StonePieceProps {
  player: Player;
  skin?: CosmeticSkin;
  isSelected?: boolean;
  isRemovable?: boolean;
  isWinning?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export const StonePiece: React.FC<StonePieceProps> = ({
  player,
  skin,
  isSelected = false,
  isRemovable = false,
  isWinning = false,
  size = 'md',
  onClick,
  className = '',
}) => {
  const isP1 = player === 'player1';

  // Resolve the cosmetic skin: prefer the passed prop, otherwise fall back to the active skin
  const resolvedSkin = skin || getSkinById(getActiveSkinId());

  const sizeClasses = {
    sm: 'w-8 h-8 sm:w-9 sm:h-9',
    md: 'w-10 h-10 sm:w-12 sm:h-12',
    lg: 'w-14 h-14 sm:w-16 sm:h-16',
  }[size];

  const pieceClass = isP1 ? resolvedSkin.p1Color : resolvedSkin.p2Color;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={isP1 ? 'مهره فیروزه بازیکن ۱' : 'مهره عقیق بازیکن ۲'}
      className={`
        ${sizeClasses}
        rounded-full relative flex items-center justify-center transition-all duration-200 cursor-pointer
        ${pieceClass}
        ${isSelected ? 'ring-4 ring-amber-400 scale-110 z-20 shadow-[0_0_20px_rgba(251,191,36,0.9)] animate-pulse' : ''}
        ${isRemovable ? 'ring-4 ring-red-500 scale-105 z-20 animate-bounce' : ''}
        ${isWinning ? 'ring-4 ring-yellow-300 shadow-[0_0_25px_rgba(234,179,8,1)] scale-110 z-20' : ''}
        ${className}
      `}
    >
      {/* 3D Highlight sheen */}
      <span className="absolute top-1 left-1.5 w-1/3 h-1/3 bg-white/40 rounded-full blur-[1px] pointer-events-none" />

      {/* Persian geometric core emblem */}
      <span className="w-1/2 h-1/2 rounded-full border border-white/30 flex items-center justify-center pointer-events-none">
        <span className={`w-1.5 h-1.5 rounded-full ${isP1 ? 'bg-teal-100' : 'bg-amber-100'} shadow-sm`} />
      </span>

      {/* Target indicator when removable */}
      {isRemovable && (
        <span className="absolute inset-0 flex items-center justify-center text-white font-black text-xs sm:text-sm drop-shadow-md">
          ✕
        </span>
      )}
    </button>
  );
};
