import React from 'react';
import { Player, GamePhase, MoveRecord } from '../game/doozTypes';
import { StonePiece } from './StonePiece';
import { CosmeticSkin, BoardTheme } from '../utils/monetization';

interface TwelveDoozBoardProps {
  board: (Player | null)[];
  turn: Player;
  phase: GamePhase;
  mustRemoveStone: boolean;
  removableIndices: number[];
  selectedFromIndex: number | null;
  validDestinations: number[];
  lastFormedLines: number[][];
  /** خط دوز نهایی (پایان بازی) */
  winningLine?: number[] | null;
  lastMove?: MoveRecord | null;
  skin?: CosmeticSkin;
  theme?: BoardTheme;
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
  winningLine = null,
  lastMove = null,
  skin,
  theme,
  onCellClick,
}) => {
  const trayClass = theme && theme.boardClass ? theme.boardClass : 'persian-wood';
  const lineCol = theme?.lineColor ?? '#a67c52';
  const lineOp = theme?.lineOpacity ?? 0.85;
  const diagCol = theme ? lineCol : '#8b5e34';

  const coords = [
    { x: 10, y: 10 },
    { x: 50, y: 10 },
    { x: 90, y: 10 },
    { x: 10, y: 50 },
    { x: 90, y: 50 },
    { x: 10, y: 90 },
    { x: 50, y: 90 },
    { x: 90, y: 90 },

    { x: 23.3, y: 23.3 },
    { x: 50, y: 23.3 },
    { x: 76.7, y: 23.3 },
    { x: 23.3, y: 50 },
    { x: 76.7, y: 50 },
    { x: 23.3, y: 76.7 },
    { x: 50, y: 76.7 },
    { x: 76.7, y: 76.7 },

    { x: 36.6, y: 36.6 },
    { x: 50, y: 36.6 },
    { x: 63.4, y: 36.6 },
    { x: 36.6, y: 50 },
    { x: 63.4, y: 50 },
    { x: 36.6, y: 63.4 },
    { x: 50, y: 63.4 },
    { x: 63.4, y: 63.4 },
  ];

  const highlightedLines = [...lastFormedLines];
  if (winningLine && !highlightedLines.some((line) => line.join(',') === winningLine.join(','))) {
    highlightedLines.push(winningLine);
  }

  return (
    <div className="relative w-full max-w-[400px] aspect-square mx-auto p-1.5 sm:p-3 select-none">
      <div className={`w-full h-full rounded-3xl ${trayClass} persian-board-border relative overflow-hidden flex items-center justify-center p-2 shadow-2xl`}>
        <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-amber-500/50 rounded-tl-lg pointer-events-none" />
        <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-amber-500/50 rounded-tr-lg pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-amber-500/50 rounded-bl-lg pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-amber-500/50 rounded-br-lg pointer-events-none" />

        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full pointer-events-none p-2"
          strokeLinecap="round"
        >
          <rect x="10" y="10" width="80" height="80" fill="none" stroke={lineCol} strokeWidth="2" strokeOpacity={lineOp} />
          <rect x="23.3" y="23.3" width="53.4" height="53.4" fill="none" stroke={lineCol} strokeWidth="2" strokeOpacity={lineOp} />
          <rect x="36.6" y="36.6" width="26.8" height="26.8" fill="none" stroke={lineCol} strokeWidth="2" strokeOpacity={lineOp} />

          <line x1="50" y1="10" x2="50" y2="36.6" stroke={lineCol} strokeWidth="2" strokeOpacity={lineOp} />
          <line x1="50" y1="63.4" x2="50" y2="90" stroke={lineCol} strokeWidth="2" strokeOpacity={lineOp} />
          <line x1="10" y1="50" x2="36.6" y2="50" stroke={lineCol} strokeWidth="2" strokeOpacity={lineOp} />
          <line x1="63.4" y1="50" x2="90" y2="50" stroke={lineCol} strokeWidth="2" strokeOpacity={lineOp} />

          <line x1="10" y1="10" x2="36.6" y2="36.6" stroke={diagCol} strokeWidth="1.8" strokeOpacity={lineOp} />
          <line x1="90" y1="10" x2="63.4" y2="36.6" stroke={diagCol} strokeWidth="1.8" strokeOpacity={lineOp} />
          <line x1="10" y1="90" x2="36.6" y2="63.4" stroke={diagCol} strokeWidth="1.8" strokeOpacity={lineOp} />
          <line x1="90" y1="90" x2="63.4" y2="63.4" stroke={diagCol} strokeWidth="1.8" strokeOpacity={lineOp} />

          {highlightedLines.map((line, idx) => {
            const start = coords[line[0]];
            const end = coords[line[2]];
            if (!start || !end) return null;
            return (
              <line
                key={`line-${idx}`}
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

        <div className="relative w-full h-full">
          {coords.map((pt, index) => {
            const stone = board[index];
            const isSelected = selectedFromIndex === index;
            const isValidDest = validDestinations.includes(index);
            const isRemovable = mustRemoveStone && removableIndices.includes(index);
            const isLastMove = !!lastMove && (lastMove.to === index || lastMove.from === index);

            return (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  left: `${pt.x}%`,
                  top: `${pt.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="z-10 flex items-center justify-center w-11 h-11"
              >
                {stone ? (
                  <div className="relative">
                    <StonePiece
                      player={stone}
                      skin={skin}
                      size="sm"
                      isSelected={isSelected}
                      isRemovable={isRemovable}
                      onClick={() => onCellClick(index)}
                    />
                    {isLastMove && !isSelected && (
                      <span className="absolute -inset-1 rounded-full border border-amber-200/50 pointer-events-none" />
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onCellClick(index)}
                    aria-label={`نقطه ${index + 1}`}
                    className={`
                      w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer
                      ${
                        isValidDest
                          ? 'ring-4 ring-amber-400 bg-amber-500/40 animate-pulse'
                          : 'bg-[#150d08] border-2 border-amber-800/60 hover:border-amber-400 shadow-inner'
                      }
                    `}
                  >
                    <span className={`w-2 h-2 rounded-full ${isValidDest ? 'bg-amber-300' : 'bg-amber-700/60'}`} />
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
