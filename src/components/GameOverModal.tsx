import React from 'react';
import { Trophy, RotateCcw, Settings, Frown } from 'lucide-react';
import { Player, GameVariant, GameMode } from '../game/doozTypes';
import { StonePiece } from './StonePiece';

interface GameOverModalProps {
  isOpen: boolean;
  winner: Player | 'draw' | null;
  reason?: string | null;
  moveCount: number;
  mode: GameMode;
  variant: GameVariant;
  scores: { player1: number; player2: number; draws: number };
  onRestart: () => void;
  onOpenModes: () => void;
  onWatchAd?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winner,
  reason,
  moveCount,
  mode,
  variant,
  scores,
  onRestart,
  onOpenModes,
  onWatchAd,
}) => {
  if (!isOpen || !winner) return null;

  const isDraw = winner === 'draw';
  const isP1 = winner === 'player1';

  let titleText = '';
  if (isDraw) {
    titleText = 'بازی مساوی شد!';
  } else if (mode === 'vs_ai') {
    titleText = isP1 ? '🎉 تبریک! شما برنده شدید!' : '🤖 هوش مصنوعی برنده شد!';
  } else {
    titleText = isP1 ? '🎉 بازیکن ۱ (فیروزه) برنده شد!' : '🎉 بازیکن ۲ (عقیق) برنده شد!';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-sm bg-[#1c120a] border-2 border-amber-500/70 rounded-3xl p-6 shadow-2xl text-center relative overflow-hidden">
        {/* Persian golden ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-amber-500/20 blur-3xl pointer-events-none" />

        {/* Icon / Emblem */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-950/80 border-2 border-amber-400 flex items-center justify-center shadow-lg relative mb-4">
          {isDraw ? (
            <Frown className="w-8 h-8 text-amber-300" />
          ) : (
            <Trophy className="w-8 h-8 text-amber-300 animate-bounce" />
          )}
        </div>

        {/* Winner Announcement */}
        <h2 className="text-lg font-black text-amber-100">{titleText}</h2>

        {/* Winner Stone display */}
        {!isDraw && (
          <div className="flex items-center justify-center gap-2 mt-3 mb-2">
            <StonePiece player={winner} size="md" isWinning />
            <span className="text-xs font-bold text-amber-300">
              {isP1 ? 'مهره‌های فیروزه‌ای' : 'مهره‌های عقیقی'}
            </span>
          </div>
        )}

        {/* Reason */}
        {reason && (
          <p className="text-xs text-amber-200/90 mt-1 mb-3 px-2 py-1 bg-amber-950/40 rounded-xl border border-amber-800/40">
            {reason}
          </p>
        )}

        {/* Match Statistics */}
        <div className="my-4 p-3 rounded-2xl bg-stone-900/70 border border-stone-800">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[10px] text-teal-300 block">برد فیروزه</span>
              <span className="text-base font-black text-teal-200">{scores.player1}</span>
            </div>
            <div>
              <span className="text-[10px] text-amber-300 block">تعداد حرکات</span>
              <span className="text-base font-black text-amber-200">{moveCount}</span>
            </div>
            <div>
              <span className="text-[10px] text-rose-300 block">برد عقیق</span>
              <span className="text-base font-black text-rose-200">{scores.player2}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 mt-5">
          {/* Rewarded Ad Option */}
          {onWatchAd && (
            <button
              type="button"
              onClick={onWatchAd}
              className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-yellow-500 via-amber-600 to-amber-700 text-white font-black text-xs shadow-lg hover:from-yellow-400 hover:to-amber-500 transition-all flex items-center justify-center gap-2 cursor-pointer border border-yellow-300/40 active:scale-95"
            >
              <span>🎬 دریافت ۱۰۰ سکه طلا با تماشای تبلیغ کوتاه</span>
            </button>
          )}

          <button
            type="button"
            data-start="true"
            onClick={onRestart}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white font-black text-sm shadow-xl hover:from-amber-400 hover:to-amber-600 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            دست جدید و شروع مجدد
          </button>

          <button
            type="button"
            onClick={onOpenModes}
            className="w-full py-2.5 px-4 rounded-2xl bg-stone-800 text-stone-200 font-bold text-xs hover:bg-stone-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            تغییر حالت یا نوع بازی
          </button>
        </div>
      </div>
    </div>
  );
};
