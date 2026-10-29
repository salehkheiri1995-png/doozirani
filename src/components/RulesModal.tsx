import React from 'react';
import { BookOpen, X } from 'lucide-react';
import { GameVariant } from '../game/doozTypes';

interface RulesModalProps {
  isOpen: boolean;
  activeVariant: GameVariant;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({
  isOpen,
  activeVariant,
  onClose,
}) => {
  const [tab, setTab] = React.useState<GameVariant>(activeVariant);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-md bg-[#1e140d] border-2 border-amber-600/70 rounded-3xl p-5 shadow-2xl max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-800/40">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-black text-amber-100">قوانین و راهنمای بازی دوز</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن راهنما"
            className="p-1 rounded-xl text-amber-400 hover:bg-amber-900/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch between 3-Dooz and 12-Dooz */}
        <div className="flex gap-2 my-3">
          <button
            type="button"
            onClick={() => setTab('three_dooz')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
              tab === 'three_dooz'
                ? 'bg-amber-600 text-white border-amber-400'
                : 'bg-stone-900 text-stone-300 border-stone-800 hover:bg-stone-800'
            }`}
          >
            دوز ۳ تایی سنتی
          </button>
          <button
            type="button"
            onClick={() => setTab('twelve_dooz')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
              tab === 'twelve_dooz'
                ? 'bg-amber-600 text-white border-amber-400'
                : 'bg-stone-900 text-stone-300 border-stone-800 hover:bg-stone-800'
            }`}
          >
            دوز ۱۲ تایی اصیل
          </button>
        </div>

        {/* Scrollable rules body */}
        <div className="overflow-y-auto space-y-3 pr-1 text-xs text-stone-200 text-right leading-relaxed flex-1">
          {tab === 'three_dooz' ? (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-800/40">
                <h3 className="font-bold text-amber-300 mb-1">🎯 هدف بازی دوز ۳ تایی</h3>
                <p>
                  هر بازیکن ۳ مهره (فیروزه یا عقیق) دارد. هدف این است که ۳ مهره خود را در یک امتداد افقی، عمودی یا اریب ردیف کنید.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-stone-900/60 border border-stone-800">
                <h4 className="font-bold text-amber-400 mb-1">مرحله اول: چیدن مهره‌ها</h4>
                <p>
                  بازیکنان به نوبت مهره‌های خود را یکی‌یکی روی خانه‌های خالی صفحه قرار می‌دهند. اگر بازیکنی در همین مرحله موفق به ردیف کردن ۳ مهره شود، بلافاصله برنده می‌شود!
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-stone-900/60 border border-stone-800">
                <h4 className="font-bold text-amber-400 mb-1">مرحله دوم: جابجایی مهره‌ها</h4>
                <p>
                  وقتی تمام ۶ مهره وارد صفحه شد، بازیکنان در نوبت خود یکی از مهره‌هایشان را به خانه خالی مجاور در مسیر خطوط منتقل می‌کنند تا ۳ مهره در یک راستا قرار گیرند.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-800/40">
                <h3 className="font-bold text-amber-300 mb-1">👑 تاریخچه و قوانین دوز ۱۲ تایی</h3>
                <p>
                  بازی اصیل و استراتژیک ایرانی روی صفحه‌ای با ۳ مربع تو در تو و ۲۴ نقطه انجام می‌شود. هر بازیکن ۱۲ مهره دارد.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-stone-900/60 border border-stone-800">
                <h4 className="font-bold text-amber-400 mb-1">۱. مرحله چیدن و سوزاندن مهره</h4>
                <p>
                  بازیکنان به نوبت مهره‌های خود را در نقاط خالی می‌گذارند. هر بار بازیکنی موفق شود ۳ مهره را در امتداد یک خط ردیف کند (دوز کند)، حق دارد یک مهره حریف را بسوزاند و از بازی خارج کند!
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-stone-900/60 border border-stone-800">
                <h4 className="font-bold text-amber-400 mb-1">۲. مرحله جابجایی مهره‌ها</h4>
                <p>
                  پس از چیده شدن مهره‌ها، بازیکنان مهره‌های خود را به خانه‌های همسایه که با خط متصل هستند حرکت می‌دهند و هر بار دوز تشکیل دهند، مهره‌ای از حریف می‌سوزانند.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-stone-900/60 border border-stone-800">
                <h4 className="font-bold text-amber-400 mb-1">۳. مرحله پرواز (۳ مهره آخر)</h4>
                <p>
                  وقتی تعداد مهره‌های یک بازیکن به ۳ عدد کاهش یابد، او قدرت پرواز پیدا می‌کند و می‌تواند مهره‌اش را به هر خانه خالی دلخواه در کل صفحه منتقل کند!
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-stone-900/60 border border-stone-800">
                <h4 className="font-bold text-amber-400 mb-1">۴. پایان بازی و تعیین برنده</h4>
                <p>
                  هر بازیکنی که مهره‌هایش به ۲ عدد برسد (چون دیگر قادر به تشکیل دوز نیست) یا تمام راه‌های حرکتش بسته شود، بازنده اعلام می‌شود.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="mt-4 pt-2 border-t border-amber-800/40">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            متوجه شدم
          </button>
        </div>
      </div>
    </div>
  );
};
