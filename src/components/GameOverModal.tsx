import React from 'react';
import { Trophy, RotateCcw, Frown, Coins, Handshake, ArrowRight, Video } from 'lucide-react';
import { Player, Winner, GameVariant, GameMode, isNetworkMode } from '../game/doozTypes';
import { StonePiece } from './StonePiece';
import { toFa } from '../utils/format';

interface GameOverModalProps {
  isOpen: boolean;
  winner: Winner | null;
  reason?: string | null;
  moveCount: number;
  mode: GameMode;
  variant: GameVariant;
  scores: { player1: number; player2: number; draws: number };
  mySide?: Player | null;
  coinsEarned?: number;
  onRestart: () => void;
  onBackToMenu: () => void;
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
  mySide = null,
  coinsEarned = 0,
  onRestart,
  onBackToMenu,
  onWatchAd,
}) => {
  if (!isOpen || !winner) return null;

  const isDraw = winner === 'draw';
  const networked = isNetworkMode(mode);
  const winnerPlayer: Player | null = isDraw ? null : (winner as Player);

  let titleText = '';
  if (isDraw) {
    titleText = 'بازی مساوی شد!';
  } else if (mode === 'vs_ai') {
    titleText = winnerPlayer === 'player1' ? '🎉 تبریک! شما برنده شدید!' : '🤖 هوش مصنوعی برنده شد!';
  } else if (networked && mySide) {
    titleText = winnerPlayer === mySide ? '🎉 شما برنده شدید!' : '😔 حریف برنده شد';
  } else {
    titleText = winnerPlayer === 'player1' ? '🎉 بازیکن ۱ برنده شد!' : '🎉 بازیکن ۲ برنده شد!';
  }

  const p1Label = mode === 'vs_ai' ? 'شما' : mySide === 'player1' ? 'شما' : 'فیروزه';
  const p2Label = mode === 'vs_ai' ? 'ربات' : mySide === 'player2' ? 'شما' : 'عقیق';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-sm bg-[#1c120a] border-2 border-amber-500/70 rounded-3xl p-5 shadow-2xl text-center relative overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-amber-500/20 blur-3xl pointer-events-none" />

        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-950/80 border-2 border-amber-400 flex items-center justify-center shadow-lg relative mb-3">
          {isDraw ? (
            <Handshake className="w-8 h-8 text-amber-300" />
          ) : winnerPlayer === 'player2' && mode === 'vs_ai' ? (
            <Frown className="w-8 h-8 text-amber-300" />
          ) : (
            <Trophy className="w-8 h-8 text-amber-300 animate-bounce" />
          )}
        </div>

        <h2 className="text-lg font-black text-amber-100">{titleText}</h2>

        {winnerPlayer && (
          <div className="flex items-center justify-center gap-2 mt-3 mb-2">
            <StonePiece player={winnerPlayer} size="md" isWinning />
            <span className="text-xs font-bold text-amber-300">
              {winnerPlayer === 'player1' ? 'مهره‌های فیروزه‌ای' : 'مهره‌های عقیقی'}
            </span>
          </div>
        )}

        {reason && (
          <p className="text-xs text-amber-200/90 mt-1 mb-3 px-2 py-1.5 bg-amber-950/40 rounded-xl border border-amber-800/40 leading-relaxed">
            {reason}
          </p>
        )}

        <div className="my-4 p-3 rounded-2xl bg-stone-900/70 border border-stone-800">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[11px] text-teal-300 block">برد {p1Label}</span>
              <span className="text-base font-black text-teal-200">{toFa(scores.player1)}</span>
            </div>
            <div>
              <span className="text-[11px] text-amber-300 block">حرکت‌ها</span>
              <span className="text-base font-black text-amber-200">{toFa(moveCount)}</span>
            </div>
            <div>
              <span className="text-[11px] text-rose-300 block">برد {p2Label}</span>
              <span className="text-base font-black text-rose-200">{toFa(scores.player2)}</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-stone-800 text-[11px] text-stone-400">
            تساوی‌ها: <span className="text-stone-200 font-bold">{toFa(scores.draws)}</span>
            {' · '}
            {variant === 'three_dooz' ? 'دوز ۳ تایی' : 'دوز ۱۲ تایی'}
          </div>
        </div>

        {coinsEarned > 0 && (
          <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-2xl bg-gradient-to-r from-yellow-950/80 via-amber-950/80 to-yellow-950/80 border border-yellow-500/50 mb-3 animate-fadeIn">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-black text-yellow-300">+{toFa(coinsEarned)} سکه کسب کردید!</span>
          </div>
        )}

        <div className="space-y-2 mt-2">
          {onWatchAd && (
            <button
              type="button"
              onClick={onWatchAd}
              className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-yellow-600/80 to-amber-700/80 text-white font-black text-xs shadow-lg hover:from-yellow-500 hover:to-amber-600 transition-all flex items-center justify-center gap-2 cursor-pointer border border-yellow-300/30 active:scale-95"
            >
              <Video className="w-4 h-4" />
              <span>تماشای تبلیغ و دریافت سکه</span>
            </button>
          )}

          <button
            type="button"
            data-start="true"
            onClick={onRestart}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white font-black text-sm shadow-xl hover:from-amber-400 hover:to-amber-600 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            {networked ? 'درخواست بازی مجدد' : 'دست جدید'}
          </button>

          <button
            type="button"
            onClick={onBackToMenu}
            className="w-full py-2.5 px-4 rounded-2xl bg-stone-800 text-stone-200 font-bold text-xs hover:bg-stone-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            بازگشت به منو
          </button>
        </div>
      </div>
    </div>
  );
};
