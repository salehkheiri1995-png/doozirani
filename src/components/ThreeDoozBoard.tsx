import React from 'react';
import { Player, GamePhase, MoveRecord } from '../game/doozTypes';
import { StonePiece } from './StonePiece';
import { CosmeticSkin, BoardTheme } from '../utils/monetization';

interface ThreeDoozBoardProps {
  board: (Player | null)[];
  turn: Player;
  phase: GamePhase;
  selectedFromIndex: number | null;
  validDestinations: number[];
  winningLine: number[] | null;
  lastMove?: MoveRecord | null;
  skin?: CosmeticSkin;
  theme?: BoardTheme;
  onCellClick: (index: number) => void;
}

export const ThreeDoozBoard: React.FC<ThreeDoozBoardProps> = ({
  board,
  turn,
  phase,
  selectedFromIndex,
  validDestinations,
  winningLine,
  lastMove = null,
  skin,
  theme,
  onCellClick,
}) => {
  const trayClass = theme && theme.boardClass ? theme.boardClass : 'persian-wood';
  const lineCol = theme?.lineColor ?? '#a67c52';
  const lineOp = theme?.lineOpacity ?? 0.8;
  const diagCol = theme ? lineCol : '#8b5e34';

  const coords = [
    { x: 16, y: 16 },
    { x: 50, y: 16 },
    { x: 84, y: 16 },
    { x: 16, y: 50 },
    { x: 50, y: 50 },
    { x: 84, y: 50 },
    { x: 16, y: 84 },
    { x: 50, y: 84 },
    { x: 84, y: 84 },
  ];

  return (
    <div className="relative w-full max-w-[360px] aspect-square mx-auto p-3 sm:p-4 select-none">
      <div className={`w-full h-full rounded-3xl ${trayClass} persian-board-border relative overflow-hidden flex items-center justify-center p-3 shadow-2xl`}>
        <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-500/40 rounded-tl-xl pointer-events-none" />
        <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-500/40 rounded-tr-xl pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-500/40 rounded-bl-xl pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-500/40 rounded-br-xl pointer-events-none" />

        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full pointer-events-none p-3"
          strokeLinecap="round"
        >
          <rect x="16" y="16" width="68" height="68" fill="none" stroke={lineCol} strokeWidth="2.2" strokeOpacity={lineOp} />
          <line x1="50" y1="16" x2="50" y2="84" stroke={lineCol} strokeWidth="2.2" strokeOpacity={lineOp} />
          <line x1="16" y1="50" x2="84" y2="50" stroke={lineCol} strokeWidth="2.2" strokeOpacity={lineOp} />
          <line x1="16" y1="16" x2="84" y2="84" stroke={diagCol} strokeWidth="1.8" strokeOpacity={lineOp} />
          <line x1="84" y1="16" x2="16" y2="84" stroke={diagCol} strokeWidth="1.8" strokeOpacity={lineOp} />

          {winningLine && (
            <line
              x1={coords[winningLine[0]].x}
              y1={coords[winningLine[0]].y}
              x2={coords[winningLine[2]].x}
              y2={coords[winningLine[2]].y}
              stroke="#fbbf24"
              strokeWidth="4"
              strokeLinecap="round"
              className="animate-pulse"
            />
          )}
        </svg>

        <div className="relative w-full h-full">
          {coords.map((pt, index) => {
            const stone = board[index];
            const isSelected = selectedFromIndex === index;
            const isValidDest = validDestinations.includes(index);
            const isWinningStone = winningLine?.includes(index) ?? false;
            const isLastMove = !!lastMove && (lastMove.to === index || (lastMove.from ?? -1) === index);

            return (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  left: `${pt.x}%`,
                  top: `${pt.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="z-10 flex items-center justify-center w-12 h-12"
              >
                {stone ? (
                  <div className="relative">
                    <StonePiece
                      player={stone}
                      skin={skin}
                      size="md"
                      isSelected={isSelected}
                      isWinning={isWinningStone}
                      onClick={() => onCellClick(index)}
                    />
                    {isLastMove && !isSelected && !isWinningStone && (
                      <span className="absolute -inset-1 rounded-full border border-amber-200/50 pointer-events-none" />
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onCellClick(index)}
                    aria-label={`خانه ${index + 1}`}
                    className={`
                      w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer
                      ${
                        isValidDest
                          ? 'ring-4 ring-amber-400 bg-amber-500/30 animate-pulse'
                          : 'bg-[#150d08] border-2 border-amber-800/60 hover:border-amber-500 shadow-inner'
                      }
                    `}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${isValidDest ? 'bg-amber-300' : 'bg-amber-700/60'}`} />
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
