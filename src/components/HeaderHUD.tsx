import React from 'react';
import { Volume2, VolumeX, RotateCcw, ArrowRight, Coins, Undo2, Users } from 'lucide-react';
import { Player, GameVariant, GameMode, isNetworkMode } from '../game/doozTypes';
import { StonePiece } from './StonePiece';
import { toFa } from '../utils/format';

interface HeaderHUDProps {
  variant: GameVariant;
  mode: GameMode;
  turn: Player;
  p1Unplaced: number;
  p2Unplaced: number;
  p1OnBoard: number;
  p2OnBoard: number;
  phase: string;
  mustRemoveStone: boolean;
  isSoundOn: boolean;
  coins: number;
  /** سمتی که این گوشی در بازی شبکه‌ای دارد (null = بازی محلی) */
  mySide?: Player | null;
  canUndo?: boolean;
  onUndo?: () => void;
  onToggleSound: () => void;
  onRestart: () => void;
  onBackToMenu: () => void;
  onOpenShop: () => void;
}

export const HeaderHUD: React.FC<HeaderHUDProps> = ({
  variant,
  mode,
  turn,
  p1Unplaced,
  p2Unplaced,
  p1OnBoard,
  p2OnBoard,
  phase,
  mustRemoveStone,
  isSoundOn,
  coins,
  mySide = null,
  canUndo = false,
  onUndo,
  onToggleSound,
  onRestart,
  onBackToMenu,
  onOpenShop,
}) => {
  const variantTitle = variant === 'three_dooz' ? 'دوز ۳ تایی سنتی' : 'دوز ۱۲ تایی اصیل';
  const networked = isNetworkMode(mode);
  const isMyTurn = mySide ? turn === mySide : true;

  const modeLabel =
    mode === 'vs_ai'
      ? 'بازی با هوش مصنوعی'
      : networked
        ? 'دو گوشی (اتصال مستقیم)'
        : 'دو نفره در یک گوشی';

  const getPhaseDescription = () => {
    if (networked && mySide) {
      if (!isMyTurn) return '⏳ نوبت حریف است…';
      if (mustRemoveStone) return '💥 دوز کردید! یک مهره از حریف را انتخاب کنید';
      return '🎯 نوبت شماست';
    }
    if (mustRemoveStone) {
      return turn === 'player1'
        ? '💥 دوز کردید! یک مهره از حریف را انتخاب کنید'
        : '💥 حریف دوز کرد! در حال حذف مهره...';
    }
    if (phase === 'placing') return 'مرحله ۱: نوبتی مهره‌ها را بگذارید';
    if (phase === 'flying') return '🚀 پرواز آزاد با ۳ مهره';
    if (phase === 'moving') return 'مرحله ۲: حرکت به خانه‌های متصل';
    return '';
  };

  return (
    <header className="w-full max-w-md mx-auto px-3 pt-3 pb-1 z-30 select-none">
      <div className="flex items-center justify-between py-2 px-2.5 gap-2 rounded-2xl bg-[#24170e]/90 border-2 border-amber-700/60 backdrop-blur-md shadow-xl">
        <button
          type="button"
          onClick={onBackToMenu}
          aria-label="بازگشت به منوی اصلی"
          className="flex items-center gap-1.5 py-2 px-2.5 min-h-10 rounded-xl bg-amber-900/60 border border-amber-600/60 text-amber-200 font-black text-xs hover:bg-amber-800/80 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowRight className="w-4 h-4 text-amber-300" />
          <span>منو</span>
        </button>

        <div className="text-center min-w-0">
          <span className="text-xs font-black text-amber-100 block truncate">{variantTitle}</span>
          <span className="text-[11px] text-amber-300/80 block truncate">{modeLabel}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenShop}
            title="فروشگاه"
            className="flex items-center gap-1 py-2 px-2 min-h-10 rounded-xl bg-amber-950/80 border border-yellow-500/50 hover:border-yellow-400 active:scale-95 transition-all cursor-pointer"
          >
            <Coins className="w-3.5 h-3.5 text-yellow-400" />
            <span className="font-black text-xs text-yellow-300">{toFa(coins)}</span>
          </button>

          {onUndo && (
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="بازگرداندن حرکت"
              className={`p-2 min-h-10 min-w-10 rounded-xl border transition-colors ${
                canUndo
                  ? 'bg-amber-900/50 text-amber-200 border-amber-700/50 hover:bg-amber-800/60 cursor-pointer'
                  : 'bg-stone-900/60 text-stone-600 border-stone-800 cursor-not-allowed'
              }`}
            >
              <Undo2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onToggleSound}
            aria-label={isSoundOn ? 'قطع صدا' : 'وصل صدا'}
            className="p-2 min-h-10 min-w-10 rounded-xl bg-amber-900/50 text-amber-200 border border-amber-700/50 hover:bg-amber-800/60 transition-colors cursor-pointer"
          >
            {isSoundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-amber-400" />}
          </button>

          <button
            type="button"
            onClick={onRestart}
            aria-label="شروع مجدد بازی"
            className="p-2 min-h-10 min-w-10 rounded-xl bg-amber-900/50 text-amber-200 border border-amber-700/50 hover:bg-amber-800/60 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <div
          className={`p-2.5 rounded-2xl transition-all duration-300 relative border-2 ${
            turn === 'player1'
              ? 'bg-gradient-to-l from-teal-950/90 to-emerald-950/90 border-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.45)]'
              : 'bg-stone-900/80 border-stone-800 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-2 min-w-0">
              <StonePiece player="player1" size="sm" />
              <div className="min-w-0">
                <span className="text-xs font-black text-teal-100 block truncate">
                  {mode === 'vs_ai' ? 'شما' : 'بازیکن ۱'} {mySide === 'player1' ? '(شما)' : ''}
                </span>
                <span className="text-[11px] text-teal-300">روی صفحه: {toFa(p1OnBoard)}</span>
              </div>
            </div>
            {p1Unplaced > 0 && (
              <div className="text-left shrink-0">
                <span className="text-[11px] text-amber-200 font-bold block">در دست</span>
                <span className="text-xs font-black text-amber-300 px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-700/60">
                  {toFa(p1Unplaced)}
                </span>
              </div>
            )}
          </div>
          {turn === 'player1' && (
            <div className="mt-1 text-center">
              <span className="text-[11px] font-black text-teal-300 animate-pulse">
                {networked && mySide !== 'player1' ? 'نوبت حریف' : 'نوبت فیروزه'}
              </span>
            </div>
          )}
        </div>

        <div
          className={`p-2.5 rounded-2xl transition-all duration-300 relative border-2 ${
            turn === 'player2'
              ? 'bg-gradient-to-r from-rose-950/90 to-red-950/90 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.45)]'
              : 'bg-stone-900/80 border-stone-800 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-2 min-w-0">
              <StonePiece player="player2" size="sm" />
              <div className="min-w-0">
                <span className="text-xs font-black text-rose-100 block truncate">
                  {mode === 'vs_ai' ? 'هوش مصنوعی' : 'بازیکن ۲'} {mySide === 'player2' ? '(شما)' : ''}
                </span>
                <span className="text-[11px] text-rose-300">روی صفحه: {toFa(p2OnBoard)}</span>
              </div>
            </div>
            {p2Unplaced > 0 && (
              <div className="text-left shrink-0">
                <span className="text-[11px] text-amber-200 font-bold block">در دست</span>
                <span className="text-xs font-black text-amber-300 px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-700/60">
                  {toFa(p2Unplaced)}
                </span>
              </div>
            )}
          </div>
          {turn === 'player2' && (
            <div className="mt-1 text-center">
              <span className="text-[11px] font-black text-rose-300 animate-pulse">
                {mode === 'vs_ai'
                  ? 'هوش مصنوعی در حال فکر...'
                  : networked && mySide !== 'player2'
                    ? 'نوبت حریف'
                    : 'نوبت عقیق'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-1.5 py-1.5 px-3 rounded-xl bg-amber-950/60 border border-amber-800/40 text-center flex items-center justify-center gap-1.5">
        {networked && <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
        <p className="text-xs font-bold text-amber-200">{getPhaseDescription()}</p>
      </div>
    </header>
  );
};
