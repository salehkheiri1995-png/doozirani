import React from 'react';
import { Volume2, VolumeX, RotateCcw, ArrowRight, Coins, ShoppingBag } from 'lucide-react';
import { Player, GameVariant, GameMode } from '../game/doozTypes';
import { StonePiece } from './StonePiece';

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
  onToggleSound,
  onRestart,
  onBackToMenu,
  onOpenShop,
}) => {
  const variantTitle =
    variant === 'three_dooz'
      ? 'دوز ۳ تایی سنتی'
      : 'دوز ۱۲ تایی اصیل';

  const getPhaseDescription = () => {
    if (mustRemoveStone) {
      return turn === 'player1'
        ? '💥 دوز کردید! یک مهره از حریف بسوزانید'
        : '💥 حریف دوز کرد! در حال حذف مهره...';
    }
    if (phase === 'placing') {
      return 'مرحله ۱: نوبتی مهره‌ها را بگذارید';
    }
    if (phase === 'flying') {
      return '🚀 مرحله پرواز آزاد ۳ مهره';
    }
    if (phase === 'moving') {
      return 'مرحله ۲: حرکت به خانه‌های متصل';
    }
    return '';
  };

  return (
    <header className="w-full max-w-md mx-auto px-3 pt-3 pb-1 z-30 select-none">
      {/* Mobile Game Top Bar */}
      <div className="flex items-center justify-between py-2 px-3 rounded-2xl bg-[#24170e]/90 border-2 border-amber-700/60 backdrop-blur-md shadow-xl">
        {/* Prominent Back to Menu Button */}
        <button
          type="button"
          onClick={onBackToMenu}
          aria-label="بازگشت به منوی اصلی"
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-amber-900/60 border border-amber-600/60 text-amber-200 font-black text-xs hover:bg-amber-800/80 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowRight className="w-4 h-4 text-amber-300" />
          <span>منوی اصلی</span>
        </button>

        {/* Center: Title & Variant */}
        <div className="text-center">
          <span className="text-xs font-black text-amber-100 block">{variantTitle}</span>
          <span className="text-[10px] text-amber-300/80 block">
            {mode === 'vs_ai' ? 'بازی با هوش مصنوعی' : mode === 'bluetooth' ? 'بازی با بلوتوث' : 'دو نفره در یک گوشی'}
          </span>
        </div>

        {/* Right Action Icons: Coins + Sound + Restart */}
        <div className="flex items-center gap-1.5">
          {/* Coins chip with + button */}
          <button
            type="button"
            onClick={onOpenShop}
            title="فروشگاه و تماشای تبلیغ"
            className="flex items-center gap-1 py-1 px-2.5 rounded-xl bg-amber-950/80 border border-yellow-500/50 hover:border-yellow-400 active:scale-95 transition-all cursor-pointer"
          >
            <Coins className="w-3.5 h-3.5 text-yellow-400" />
            <span className="font-black text-xs text-yellow-300">{coins}</span>
            <span className="text-[10px] text-emerald-400 font-bold mr-0.5">+</span>
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={isSoundOn ? 'قطع صدا' : 'وصل صدا'}
            className="p-1.5 rounded-xl bg-amber-900/50 text-amber-200 border border-amber-700/50 hover:bg-amber-800/60 transition-colors cursor-pointer"
          >
            {isSoundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Restart */}
          <button
            type="button"
            onClick={onRestart}
            aria-label="شروع مجدد بازی"
            className="p-1.5 rounded-xl bg-amber-900/50 text-amber-200 border border-amber-700/50 hover:bg-amber-800/60 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Players HUD Banner (Bold & Tactile) */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        {/* Player 1 (Turquoise) */}
        <div
          className={`p-2.5 rounded-2xl transition-all duration-300 relative border-2 ${
            turn === 'player1'
              ? 'bg-gradient-to-l from-teal-950/90 to-emerald-950/90 border-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.45)] scale-[1.02]'
              : 'bg-stone-900/80 border-stone-800 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StonePiece player="player1" size="sm" />
              <div>
                <span className="text-xs font-black text-teal-100 block">
                  {mode === 'vs_ai' ? 'شما (فیروزه)' : 'بازیکن ۱ (فیروزه)'}
                </span>
                <span className="text-[10px] text-teal-300">صفحه: {p1OnBoard}</span>
              </div>
            </div>
            {p1Unplaced > 0 && (
              <div className="text-left">
                <span className="text-[10px] text-amber-200 font-bold block">در دست:</span>
                <span className="text-xs font-black text-amber-300 px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-700/60">
                  {p1Unplaced}
                </span>
              </div>
            )}
          </div>
          {turn === 'player1' && (
            <div className="mt-1 flex items-center justify-center">
              <span className="text-[11px] font-black text-teal-300 animate-pulse">نوبت شما (فیروزه)</span>
            </div>
          )}
        </div>

        {/* Player 2 (Ruby) */}
        <div
          className={`p-2.5 rounded-2xl transition-all duration-300 relative border-2 ${
            turn === 'player2'
              ? 'bg-gradient-to-r from-rose-950/90 to-red-950/90 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.45)] scale-[1.02]'
              : 'bg-stone-900/80 border-stone-800 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StonePiece player="player2" size="sm" />
              <div>
                <span className="text-xs font-black text-rose-100 block">
                  {mode === 'vs_ai' ? 'هوش مصنوعی' : 'بازیکن ۲ (عقیق)'}
                </span>
                <span className="text-[10px] text-rose-300">صفحه: {p2OnBoard}</span>
              </div>
            </div>
            {p2Unplaced > 0 && (
              <div className="text-left">
                <span className="text-[10px] text-amber-200 font-bold block">در دست:</span>
                <span className="text-xs font-black text-amber-300 px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-700/60">
                  {p2Unplaced}
                </span>
              </div>
            )}
          </div>
          {turn === 'player2' && (
            <div className="mt-1 flex items-center justify-center">
              <span className="text-[11px] font-black text-rose-300 animate-pulse">
                {mode === 'vs_ai' ? 'هوش مصنوعی در حال فکر...' : 'نوبت عقیق'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Phase status indicator banner */}
      <div className="mt-1.5 py-1 px-3 rounded-xl bg-amber-950/60 border border-amber-800/40 text-center">
        <p className="text-xs font-bold text-amber-200">{getPhaseDescription()}</p>
      </div>
    </header>
  );
};
