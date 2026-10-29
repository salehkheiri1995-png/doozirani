import React from 'react';
import { Player, GamePhase } from '../game/doozTypes';
import { StonePiece } from './StonePiece';

interface TwelveDoozBoardProps {
  board: (Player | null)[];
  turn: Player;
  phase: GamePhase;
  mustRemoveStone: boolean;
  removableIndices: number[];
  selectedFromIndex: number | null;
  validDestinations: number[];
  lastFormedLines: number[][];
  onCellClick: (index: number) => void;
}

export const TwelveDoozBoard: React.FC<TwelveDoozBoardProps> = ({
  board,
  turn,
  phase,
  mustRemoveStone,
  removableIndices,
  selectedFromIndex,
  validDestinations,
  lastFormedLines,
  onCellClick,
}) => {
  // SVG coordinates for 24 points: outer (0-7), middle (8-15), inner (16-23)
  const coords = [
    // Outer square
    { x: 10, y: 10 }, // 0
    { x: 50, y: 10 }, // 1
    { x: 90, y: 10 }, // 2
    { x: 10, y: 50 }, // 3
    { x: 90, y: 50 }, // 4
    { x: 10, y: 90 }, // 5
    { x: 50, y: 90 }, // 6
    { x: 90, y: 90 }, // 7

    // Middle square
    { x: 23.3, y: 23.3 }, // 8
    { x: 50,   y: 23.3 }, // 9
    { x: 76.7, y: 23.3 }, // 10
    { x: 23.3, y: 50 },   // 11
    { x: 76.7, y: 50 },   // 12
    { x: 23.3, y: 76.7 }, // 13
    { x: 50,   y: 76.7 }, // 14
    { x: 76.7, y: 76.7 }, // 15

    // Inner square
    { x: 36.6, y: 36.6 }, // 16
    { x: 50,   y: 36.6 }, // 17
    { x: 63.4, y: 36.6 }, // 18
    { x: 36.6, y: 50 },   // 19
    { x: 63.4, y: 50 },   // 20
    { x: 36.6, y: 63.4 }, // 21
    { x: 50,   y: 63.4 }, // 22
    { x: 63.4, y: 63.4 }, // 23
  ];

  const opponent: Player = turn === 'player1' ? 'player2' : 'player1';

  return (
    <div className="relative w-full max-w-[390px] aspect-square mx-auto p-2 sm:p-3 select-none">
      {/* Persian Inlay Wooden Board */}
      <div className="w-full h-full rounded-3xl persian-wood persian-board-border relative overflow-hidden flex items-center justify-center p-2 shadow-2xl">
        {/* Decorative corner motifs */}
        <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-amber-500/50 rounded-tl-lg pointer-events-none" />
        <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-amber-500/50 rounded-tr-lg pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-amber-500/50 rounded-bl-lg pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-amber-500/50 rounded-br-lg pointer-events-none" />

        {/* 12-Dooz Geometric lines */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full pointer-events-none p-2"
          strokeLinecap="round"
        >
          {/* Outer Square */}
          <rect x="10" y="10" width="80" height="80" fill="none" stroke="#a67c52" strokeWidth="2" strokeOpacity="0.85" />
          {/* Middle Square */}
          <rect x="23.3" y="23.3" width="53.4" height="53.4" fill="none" stroke="#a67c52" strokeWidth="2" strokeOpacity="0.85" />
          {/* Inner Square */}
          <rect x="36.6" y="36.6" width="26.8" height="26.8" fill="none" stroke="#a67c52" strokeWidth="2" strokeOpacity="0.85" />

          {/* Cross lines connecting midpoints */}
          <line x1="50" y1="10" x2="50" y2="36.6" stroke="#a67c52" strokeWidth="2" strokeOpacity="0.85" />
          <line x1="50" y1="63.4" x2="50" y2="90" stroke="#a67c52" strokeWidth="2" strokeOpacity="0.85" />
          <line x1="10" y1="50" x2="36.6" y2="50" stroke="#a67c52" strokeWidth="2" strokeOpacity="0.85" />
          <line x1="63.4" y1="50" x2="90" y2="50" stroke="#a67c52" strokeWidth="2" strokeOpacity="0.85" />

          {/* Diagonals connecting corners (Authentic 12-Dooz / Morabaraba rules) */}
          <line x1="10" y1="10" x2="36.6" y2="36.6" stroke="#8b5e34" strokeWidth="1.8" strokeOpacity="0.8" />
          <line x1="90" y1="10" x2="63.4" y2="36.6" stroke="#8b5e34" strokeWidth="1.8" strokeOpacity="0.8" />
          <line x1="10" y1="90" x2="36.6" y2="63.4" stroke="#8b5e34" strokeWidth="1.8" strokeOpacity="0.8" />
          <line x1="90" y1="90" x2="63.4" y2="63.4" stroke="#8b5e34" strokeWidth="1.8" strokeOpacity="0.8" />

          {/* Newly formed Mill/Dooz highlighted lines */}
          {lastFormedLines.map((line, idx) => {
            const start = coords[line[0]];
            const end = coords[line[2]];
            return (
              <line
                key={idx}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="#fbbf24"
                strokeWidth="3.5"
                strokeLinecap="round"
                className="animate-pulse"
              />
            );
          })}
        </svg>

        {/* 24 Board Nodes */}
        <div className="relative w-full h-full">
          {coords.map((pt, index) => {
            const stone = board[index];
            const isSelected = selectedFromIndex === index;
            const isValidDest = validDestinations.includes(index);
            const isRemovable = mustRemoveStone && removableIndices.includes(index);

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
                    size="sm"
                    isSelected={isSelected}
                    isRemovable={isRemovable}
                    onClick={() => onCellClick(index)}
                  />
                ) : (
                  // Empty hole
                  <button
                    type="button"
                    onClick={() => onCellClick(index)}
                    aria-label={`نقطه ${index + 1}`}
                    className={`
                      w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer
                      ${
                        isValidDest
                          ? 'ring-4 ring-amber-400 bg-amber-500/40 scale-125 animate-pulse'
                          : 'bg-[#150d08] border-2 border-amber-800/60 hover:border-amber-400 hover:scale-115 shadow-inner'
                      }
                    `}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
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
