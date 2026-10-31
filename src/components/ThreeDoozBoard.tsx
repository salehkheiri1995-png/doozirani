import React from 'react';
import { Player } from '../game/doozTypes';
import { StonePiece, type StoneAppearance } from './StonePiece';
import type { BoardRenderConfig } from '../economy/catalog';

interface ThreeDoozBoardProps {
  board: (Player | null)[];
  selectedFromIndex: number | null;
  validDestinations: number[];
  winningLine: number[] | null;
  onCellClick: (index: number) => void;
  theme: BoardRenderConfig;
  stoneAppearance: Record<Player, StoneAppearance>;
}

export const ThreeDoozBoard: React.FC<ThreeDoozBoardProps> = ({
  board,
  selectedFromIndex,
  validDestinations,
  winningLine,
  onCellClick,
  theme,
  stoneAppearance,
}) => {
  // SVG coordinates for 9 points (percentage based)
  const coords = [
    { x: 16, y: 16 }, // 0: top-left
    { x: 50, y: 16 }, // 1: top-mid
    { x: 84, y: 16 }, // 2: top-right
    { x: 16, y: 50 }, // 3: mid-left
    { x: 50, y: 50 }, // 4: center
    { x: 84, y: 50 }, // 5: mid-right
    { x: 16, y: 84 }, // 6: bot-left
    { x: 50, y: 84 }, // 7: bot-mid
    { x: 84, y: 84 }, // 8: bot-right
  ];

  return (
    <div className="relative w-full max-w-[360px] aspect-square mx-auto p-4 select-none">
      {/* Persian Wooden Board Outer Frame */}
      <div
        className="w-full h-full rounded-3xl persian-board-border relative overflow-hidden flex items-center justify-center p-3 shadow-2xl"
        style={{ background: theme.surface, borderColor: theme.frame }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 20%, ${theme.accent}22 0 2px, transparent 3px), radial-gradient(circle at 80% 70%, ${theme.accent}18 0 2px, transparent 3px)`,
            backgroundSize: '26px 26px, 32px 32px',
          }}
        />
        {/* Persian corner ornament inlays */}
        <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 rounded-tl-xl pointer-events-none" style={{ borderColor: `${theme.accent}88` }} />
        <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 rounded-tr-xl pointer-events-none" style={{ borderColor: `${theme.accent}88` }} />
        <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 rounded-bl-xl pointer-events-none" style={{ borderColor: `${theme.accent}88` }} />
        <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 rounded-br-xl pointer-events-none" style={{ borderColor: `${theme.accent}88` }} />

        {/* Board SVG Grid Lines */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full pointer-events-none p-3"
          strokeLinecap="round"
        >
          {/* Outer Square */}
          <rect
            x="16"
            y="16"
            width="68"
            height="68"
            fill="none"
            stroke={theme.line}
            strokeWidth="2.2"
            strokeOpacity="0.8"
          />

          {/* Cross lines */}
          <line x1="50" y1="16" x2="50" y2="84" stroke={theme.line} strokeWidth="2.2" strokeOpacity="0.8" />
          <line x1="16" y1="50" x2="84" y2="50" stroke={theme.line} strokeWidth="2.2" strokeOpacity="0.8" />

          {/* Diagonals */}
          <line x1="16" y1="16" x2="84" y2="84" stroke={theme.accent} strokeWidth="1.8" strokeOpacity="0.7" />
          <line x1="84" y1="16" x2="16" y2="84" stroke={theme.accent} strokeWidth="1.8" strokeOpacity="0.7" />

          {/* Highlight winning line */}
          {winningLine && (
            <line
              x1={coords[winningLine[0]].x}
              y1={coords[winningLine[0]].y}
              x2={coords[winningLine[2]].x}
              y2={coords[winningLine[2]].y}
              stroke={theme.accent}
              strokeWidth="4"
              strokeLinecap="round"
              className="animate-pulse"
            />
          )}
        </svg>

        {/* 9 Interactive Points */}
        <div className="relative w-full h-full">
          {coords.map((pt, index) => {
            const stone = board[index];
            const isSelected = selectedFromIndex === index;
            const isValidDest = validDestinations.includes(index);
            const isWinningStone = winningLine?.includes(index) ?? false;

            return (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  left: `${pt.x}%`,
                  top: `${pt.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="z-10"
              >
                {stone ? (
                  <StonePiece
                    player={stone}
                    appearance={stoneAppearance[stone]}
                    size="md"
                    isSelected={isSelected}
                    isWinning={isWinningStone}
                    onClick={() => onCellClick(index)}
                  />
                ) : (
                  // Empty node hole
                  <button
                    type="button"
                    onClick={() => onCellClick(index)}
                    aria-label={`خانه ${index + 1}`}
                    className={`
                      w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer
                      ${
                        isValidDest
                          ? 'ring-4 ring-amber-400 bg-amber-500/30 scale-125 animate-pulse'
                          : 'bg-[#150d08] border-2 border-amber-800/60 hover:border-amber-500 hover:scale-110 shadow-inner'
                      }
                    `}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isValidDest ? 'bg-amber-300' : 'bg-amber-700/60'
                      }`}
                    />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
