import React, { useEffect, useState } from 'react';
import { X, Trophy, Target, Flame, Clock, Handshake, Trash2, ShieldCheck, Coins, CircleUserRound } from 'lucide-react';
import { loadStats, StatsState, VariantStats, resetProgressData } from '../utils/storage';
import { toFa } from '../utils/format';

interface ProfileModalProps {
  isOpen: boolean;
  coins: number;
  onClose: () => void;
  /** بعد از پاک‌کردن داده‌ها، App باید وضعیت خودش را تازه کند */
  onDataReset: () => void;
}

/** هر برد ۱۰ امتیاز تجربه؛ هر سطح ۱۰۰ امتیاز */
const XP_PER_WIN = 10;
const XP_PER_LEVEL = 100;

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, coins, onClose, onDataReset }) => {
  const [stats, setStats] = useState<StatsState>(() => loadStats());
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStats(loadStats());
      setConfirmReset(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalWins = stats.three_dooz.wins + stats.twelve_dooz.wins;
  const totalGames = stats.three_dooz.games + stats.twelve_dooz.games;
  const xp = totalWins * XP_PER_WIN;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const levelProgress = xp % XP_PER_LEVEL;

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    resetProgressData();
    setStats(loadStats());
    setConfirmReset(false);
    onDataReset();
  };

  const Card: React.FC<{ title: string; s: VariantStats; accent: string }> = ({ title, s, accent }) => (
    <div className="p-3 rounded-2xl bg-stone-900/70 border border-stone-700/70">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-black ${accent}`}>{title}</span>
        <span className="text-[11px] text-stone-400">{toFa(s.games)} بازی</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded-xl bg-emerald-950/50 border border-emerald-800/40 py-1.5">
          <span className="block text-[10px] text-emerald-300/80">برد</span>
          <span className="block text-sm font-black text-emerald-200">{toFa(s.wins)}</span>
        </div>
        <div className="rounded-xl bg-rose-950/50 border border-rose-900/40 py-1.5">
          <span className="block text-[10px] text-rose-300/80">باخت</span>
          <span className="block text-sm font-black text-rose-200">{toFa(s.losses)}</span>
        </div>
        <div className="rounded-xl bg-amber-950/50 border border-amber-900/40 py-1.5">
          <span className="block text-[10px] text-amber-300/80">مساوی</span>
          <span className="block text-sm font-black text-amber-200">{toFa(s.draws)}</span>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] text-stone-300">
        <span className="flex items-center gap-1">
          <Flame className="w-3 h-3 text-orange-400 shrink-0" />
          بهترین زنجیره: <b className="text-stone-100">{toFa(s.bestStreak)}</b>
        </span>
        <span className="flex items-center gap-1">
          <Target className="w-3 h-3 text-teal-400 shrink-0" />
          دوز ساخته: <b className="text-stone-100">{toFa(s.totalMills)}</b>
        </span>
        <span className="flex items-center gap-1">
          <Handshake className="w-3 h-3 text-rose-400 shrink-0" />
          مهره سوزانده: <b className="text-stone-100">{toFa(s.totalCaptures)}</b>
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-sky-400 shrink-0" />
          سریع‌ترین برد:{' '}
          <b className="text-stone-100">{s.fastestWinMoves === null ? '—' : `${toFa(s.fastestWinMoves)} حرکت`}</b>
        </span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-[#17100a] border-2 border-amber-600/60 rounded-3xl p-4 shadow-2xl text-right">
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/40">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-900/60 border border-amber-600/60 flex items-center justify-center">
              <CircleUserRound className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm font-black text-amber-100">پروفایل بازیکن</h2>
              <span className="text-[11px] text-amber-300/70">همهٔ داده‌ها فقط روی همین دستگاه است</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن پروفایل"
            className="p-2 rounded-xl text-amber-300 hover:bg-amber-950/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* سطح و تجربه */}
        <div className="mt-3 p-3 rounded-2xl bg-gradient-to-l from-amber-950/80 via-stone-900/70 to-amber-950/80 border border-amber-700/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-black text-amber-200">سطح {toFa(level)}</span>
            <span className="text-[11px] text-amber-300/80">{toFa(xp)} امتیاز تجربه</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-black/60 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all"
              style={{ width: `${Math.min(100, (levelProgress / XP_PER_LEVEL) * 100)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-stone-300">
            <span className="flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              مجموع بردها: <b className="text-amber-200">{toFa(totalWins)}</b>
            </span>
            <span className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-yellow-400" />
              سکه: <b className="text-yellow-300">{toFa(coins)}</b>
            </span>
            <span>کل بازی‌ها: {toFa(totalGames)}</span>
          </div>
        </div>

        <div className="mt-2.5 space-y-2">
          <Card title="دوز ۳ تایی" s={stats.three_dooz} accent="text-teal-200" />
          <Card title="دوز ۱۲ تایی" s={stats.twelve_dooz} accent="text-rose-200" />
        </div>

        <div className="mt-3 p-2.5 rounded-xl bg-stone-900/60 border border-stone-700/60 text-[11px] text-stone-400 flex items-start gap-2 leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p>
            حریم خصوصی: این بازی هیچ اطلاعاتی را به سرور نمی‌فرستد. آمار و تنظیمات فقط در حافظهٔ
            همین دستگاه (localStorage) ذخیره می‌شود. نسخهٔ ۱.۷.۰
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className={`w-full mt-3 py-2.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer min-h-11 ${
            confirmReset
              ? 'bg-rose-700 hover:bg-rose-600 text-white'
              : 'bg-stone-800 text-rose-300 hover:bg-stone-700'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          {confirmReset ? 'مطمئنید؟ برای پاک‌شدن دوباره بزنید' : 'پاک‌کردن آمار و تنظیمات'}
        </button>
        <p className="mt-1.5 text-[10px] text-stone-500 text-center leading-relaxed">
          سکه‌ها، اسکین‌های خریداری‌شده و «حذف تبلیغات» پاک نمی‌شوند.
        </p>
      </div>
    </div>
  );
};
