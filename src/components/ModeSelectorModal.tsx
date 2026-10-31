import React from 'react';
import { Smartphone, Bluetooth, Bot, Users, Sparkles, Check, X } from 'lucide-react';
import { GameVariant, GameMode, AIDifficulty } from '../game/doozTypes';

interface ModeSelectorModalProps {
  isOpen: boolean;
  currentVariant: GameVariant;
  currentMode: GameMode;
  aiDifficulty: AIDifficulty;
  onSelect: (variant: GameVariant, mode: GameMode, difficulty: AIDifficulty) => void;
  onClose: () => void;
}

export const ModeSelectorModal: React.FC<ModeSelectorModalProps> = ({
  isOpen,
  currentVariant,
  currentMode,
  aiDifficulty,
  onSelect,
  onClose,
}) => {
  const [selectedVariant, setSelectedVariant] = React.useState<GameVariant>(currentVariant);
  const [selectedMode, setSelectedMode] = React.useState<GameMode>(currentMode);
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<AIDifficulty>(aiDifficulty);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onSelect(selectedVariant, selectedMode, selectedDifficulty);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#1e140d] border-2 border-amber-600/60 rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-800/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-black text-amber-100">تنظیمات و انتخاب بازی</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="p-1 rounded-xl text-amber-400 hover:bg-amber-900/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Game Variant Selector */}
        <div className="mt-4">
          <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">نوع بازی دوز</h3>
          <div className="space-y-2">
            {/* 3-Dooz */}
            <button
              type="button"
              onClick={() => setSelectedVariant('three_dooz')}
              className={`w-full text-right p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                selectedVariant === 'three_dooz'
                  ? 'bg-amber-900/70 border-amber-400 text-amber-100 shadow-md'
                  : 'bg-stone-900/60 border-stone-800 text-stone-300 hover:bg-stone-800/60'
              }`}
            >
              <div>
                <span className="font-bold text-sm block">دوز ۳ تایی سنتی ایرانی</span>
                <span className="text-xs text-amber-300/80 block mt-0.5">
                  ۳ مهره برای هر بازیکن با مرحله چیدن و جابجایی مهره‌ها
                </span>
              </div>
              {selectedVariant === 'three_dooz' && <Check className="w-5 h-5 text-amber-400 shrink-0" />}
            </button>

            {/* 12-Dooz */}
            <button
              type="button"
              onClick={() => setSelectedVariant('twelve_dooz')}
              className={`w-full text-right p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                selectedVariant === 'twelve_dooz'
                  ? 'bg-amber-900/70 border-amber-400 text-amber-100 shadow-md'
                  : 'bg-stone-900/60 border-stone-800 text-stone-300 hover:bg-stone-800/60'
              }`}
            >
              <div>
                <span className="font-bold text-sm block">دوز ۱۲ تایی اصیل ایرانی</span>
                <span className="text-xs text-amber-300/80 block mt-0.5">
                  ۱۲ مهره، ۳ مربع تو در تو، سوزاندن مهره حریف و فاز پرواز
                </span>
              </div>
              {selectedVariant === 'twelve_dooz' && <Check className="w-5 h-5 text-amber-400 shrink-0" />}
            </button>
          </div>
        </div>

        {/* 2. Game Mode Selector */}
        <div className="mt-5">
          <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">حالت بازی</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Pass and play on same phone */}
            <button
              type="button"
              onClick={() => setSelectedMode('pass_and_play')}
              className={`text-right p-3 rounded-2xl border transition-all cursor-pointer ${
                selectedMode === 'pass_and_play'
                  ? 'bg-amber-900/70 border-amber-400 text-amber-100 shadow-md'
                  : 'bg-stone-900/60 border-stone-800 text-stone-300 hover:bg-stone-800/60'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-xs">دو نفره (یک گوشی)</span>
              </div>
              <p className="text-[11px] text-stone-400">بازی دو نفره آفلاین روی همین صفحه</p>
            </button>

            {/* Bluetooth */}
            <button
              type="button"
              onClick={() => setSelectedMode('bluetooth')}
              className={`text-right p-3 rounded-2xl border transition-all cursor-pointer ${
                selectedMode === 'bluetooth'
                  ? 'bg-amber-900/70 border-amber-400 text-amber-100 shadow-md'
                  : 'bg-stone-900/60 border-stone-800 text-stone-300 hover:bg-stone-800/60'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Bluetooth className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-xs">بلوتوث بین دو گوشی</span>
              </div>
              <p className="text-[11px] text-stone-400">اتصال با بلوتوث بین دو دستگاه اندروید</p>
            </button>

            {/* Online rooms are not shipped yet; never present them as working. */}
            <button
              type="button"
              disabled
              className="text-right p-3 rounded-2xl border bg-stone-950/60 border-stone-800 text-stone-500 opacity-60 cursor-not-allowed"
            >
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-stone-500" />
                <span className="font-bold text-xs">اتاق آنلاین با کد دعوت</span>
              </div>
              <p className="text-[11px] text-stone-500">در این نسخه فعال نیست؛ فقط بلوتوث و بازی محلی</p>
            </button>

            {/* AI */}
            <button
              type="button"
              onClick={() => setSelectedMode('vs_ai')}
              className={`text-right p-3 rounded-2xl border transition-all cursor-pointer ${
                selectedMode === 'vs_ai'
                  ? 'bg-amber-900/70 border-amber-400 text-amber-100 shadow-md'
                  : 'bg-stone-900/60 border-stone-800 text-stone-300 hover:bg-stone-800/60'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Bot className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-xs">بازی با هوش مصنوعی</span>
              </div>
              <p className="text-[11px] text-stone-400">آفلاین تک‌نفره با ربات هوشمند</p>
            </button>
          </div>
        </div>

        {/* AI Difficulty (if AI selected) */}
        {selectedMode === 'vs_ai' && (
          <div className="mt-4 p-3 rounded-2xl bg-amber-950/40 border border-amber-800/40">
            <span className="text-xs font-bold text-amber-300 block mb-2">درجه سختی هوش مصنوعی:</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['easy', 'medium', 'hard'] as AIDifficulty[]).map((level) => {
                const label = level === 'easy' ? 'آسان' : level === 'medium' ? 'متوسط' : 'حرفه‌ای (استاد)';
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSelectedDifficulty(level)}
                    className={`py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                      selectedDifficulty === level
                        ? 'bg-amber-600 text-white border-amber-300'
                        : 'bg-stone-900 text-stone-300 border-stone-800 hover:bg-stone-800'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Start / Apply CTA */}
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-700 text-white font-black text-sm shadow-lg hover:from-amber-400 hover:to-amber-600 transition-all cursor-pointer"
          >
            تایید و شروع بازی
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded-2xl bg-stone-800 text-stone-300 font-bold text-sm hover:bg-stone-700 transition-colors cursor-pointer"
          >
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
};
