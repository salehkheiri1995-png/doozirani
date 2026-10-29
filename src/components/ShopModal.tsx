import React, { useState } from 'react';
import { Coins, Video, Check, ShoppingBag, X, HelpCircle, DollarSign, Sparkles } from 'lucide-react';
import { CosmeticSkin, INITIAL_SKINS, getUnlockedSkinIds, unlockSkin, getActiveSkinId, setActiveSkinId, savePlayerCoins } from '../utils/monetization';
import { playStonePlaceSound, playVictorySound } from '../utils/audio';
import { getTapsellImpressions } from '../utils/tapsellService';

interface ShopModalProps {
  isOpen: boolean;
  coins: number;
  onCoinsChange: (newCoins: number) => void;
  onWatchAdClick: () => void;
  onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  coins,
  onCoinsChange,
  onWatchAdClick,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'shop' | 'guide'>('shop');
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(getUnlockedSkinIds());
  const [activeSkin, setActiveSkin] = useState<string>(getActiveSkinId());

  if (!isOpen) return null;

  const handleBuySkin = (skin: CosmeticSkin) => {
    if (coins < skin.cost) return;
    const nextCoins = coins - skin.cost;
    savePlayerCoins(nextCoins);
    onCoinsChange(nextCoins);
    unlockSkin(skin.id);
    setActiveSkinId(skin.id);
    setActiveSkin(skin.id);
    setUnlockedSkins(getUnlockedSkinIds());
    playVictorySound();
  };

  const handleEquipSkin = (skinId: string) => {
    setActiveSkinId(skinId);
    setActiveSkin(skinId);
    playStonePlaceSound();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-md bg-[#18110b] border-2 border-amber-600/70 rounded-3xl p-5 shadow-2xl max-h-[88vh] flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-600/30 border border-amber-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-black text-amber-100">فروشگاه و سکه</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Coin balance chip */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/60 shadow-inner">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="font-black text-xs text-yellow-300">{coins}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="بستن"
              className="p-1 rounded-xl text-amber-400 hover:bg-amber-950/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 my-3">
          <button
            type="button"
            onClick={() => setActiveTab('shop')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'shop'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-stone-900 text-stone-300 hover:bg-stone-800'
            }`}
          >
            مهره‌ها و تماشای تبلیغ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'guide'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-stone-900 text-stone-300 hover:bg-stone-800'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            آموزش کسب درآمد از بازی
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-3">
          {activeTab === 'shop' ? (
            <>
              {/* Rewarded Ad Watch Action Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/80 via-yellow-950/60 to-amber-950/80 border-2 border-yellow-500/60 shadow-lg text-center">
                <span className="text-xs font-bold text-amber-200 block mb-1">
                  🎁 دریافت فوری سکه طلا با تماشای فیلم تبلیغاتی
                </span>
                <p className="text-[11px] text-stone-300 mb-3">
                  با تماشای یک ویدیوی ۵ ثانیه‌ای، ۱۰۰ سکه رایگان برای خرید تم‌ها بگیرید!
                </p>
                <button
                  type="button"
                  onClick={onWatchAdClick}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-yellow-500 via-amber-600 to-amber-700 text-white font-black text-xs shadow-xl hover:from-yellow-400 hover:to-amber-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  تماشای فیلم تبلیغاتی (+۱۰۰ سکه طلا)
                </button>
              </div>

              {/* Skins list */}
              <div className="space-y-2 mt-3">
                <span className="text-xs font-bold text-amber-300 block">رنگ و مدل مهره‌ها:</span>
                {INITIAL_SKINS.map((skin) => {
                  const isUnlocked = unlockedSkins.includes(skin.id);
                  const isEquipped = activeSkin === skin.id;
                  const canAfford = coins >= skin.cost;

                  return (
                    <div
                      key={skin.id}
                      className="p-3 rounded-2xl bg-stone-900/80 border border-stone-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${skin.previewClass} border-2 border-white/40 shadow-md`} />
                        <div>
                          <span className="text-xs font-bold text-stone-100 block">{skin.name}</span>
                          <span className="text-[10px] text-stone-400 block">
                            {skin.cost === 0 ? 'رایگان اولیه' : `${skin.cost} سکه`}
                          </span>
                        </div>
                      </div>

                      {isEquipped ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-emerald-500/40">
                          <Check className="w-3.5 h-3.5" />
                          انتخاب شده
                        </span>
                      ) : isUnlocked ? (
                        <button
                          type="button"
                          onClick={() => handleEquipSkin(skin.id)}
                          className="px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          استفاده
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleBuySkin(skin)}
                          disabled={!canAfford}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                            canAfford
                              ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-md'
                              : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                          }`}
                        >
                          خرید ({skin.cost} سکه)
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Monetization Guide for Iran and International */
            <div className="space-y-3 text-right text-xs leading-relaxed text-stone-200">
              {/* Active Tapsell Key Status Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-teal-950/70 to-emerald-950/80 border-2 border-emerald-500/70 shadow-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black text-emerald-300 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>پنل تبلیغات تپسل: دوز اصیل ایرانی</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                    شناسه: dooz.tapcell
                  </span>
                </div>

                {/* App Key */}
                <div>
                  <span className="text-[10px] text-emerald-300 block mb-1">کلید اپلیکیشن (AppKey):</span>
                  <div className="p-1.5 rounded-lg bg-black/60 border border-emerald-600/40 font-mono text-[10px] text-emerald-300 break-all select-all text-left" dir="ltr">
                    noeafdfetsmgcntkdreroijahroqspqmjqbjptrprbidjioqloqnoalnpmtnoldqglnsge
                  </div>
                </div>

                {/* The 3 Active Zones from user's panel */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-amber-200 font-bold block">تبلیغگاه‌های متصل پنل شما:</span>

                  {/* Zone 1: s01 Rewarded Video */}
                  <div className="p-2 rounded-xl bg-black/40 border border-emerald-600/30 flex items-center justify-between text-[10px]">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-amber-300">۱. تبلیغگاه s01 (ویدئو جایزه‌ای)</span>
                        <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.2 rounded border border-emerald-500/30">حالت تست</span>
                      </div>
                      <span className="text-stone-400">تماشای فیلم در فروشگاه و پایان بازی (+۱۰۰ سکه)</span>
                    </div>
                    <span className="font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30" dir="ltr">
                      6ae1bd1817758066a4da86c1
                    </span>
                  </div>

                  {/* Zone 2: Standard Banner */}
                  <div className="p-2 rounded-xl bg-black/40 border border-emerald-600/30 flex items-center justify-between text-[10px]">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-amber-300">۲. بنر استاندارد</span>
                        <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.2 rounded border border-emerald-500/30">حالت تست</span>
                      </div>
                      <span className="text-stone-400">نمایش بنر تبلیغاتی حامی بازی در صفحات منو</span>
                    </div>
                    <span className="font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30" dir="ltr">
                      6ae1bdbd35198b5ded9c8803
                    </span>
                  </div>

                  {/* Zone 3: Interstitial Video */}
                  <div className="p-2 rounded-xl bg-black/40 border border-emerald-600/30 flex items-center justify-between text-[10px]">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-amber-300">۳. پیش نمایشی (ویدئو میان‌صفحه‌ای)</span>
                        <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.2 rounded border border-emerald-500/30">حالت تست</span>
                      </div>
                      <span className="text-stone-400">پخش بین دست‌های بازی</span>
                    </div>
                    <span className="font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30" dir="ltr">
                      6ae1bdde187ee67e6b59bcd8
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-xl bg-emerald-900/40 border border-emerald-700/50">
                    <span className="text-[10px] text-stone-300 block">نمایش روی این دستگاه</span>
                    <span className="text-sm font-black text-emerald-300">{getTapsellImpressions()} بار</span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-900/40 border border-emerald-700/50">
                    <span className="text-[10px] text-stone-300 block">تخمین درآمد ثبت‌شده</span>
                    <span className="text-sm font-black text-yellow-300">
                      {(getTapsellImpressions() * 300).toLocaleString('fa-IR')} تومان
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-stone-900/70 border border-stone-800 space-y-1.5">
                <h4 className="font-bold text-amber-300">نحوه تسویه حساب و دریافت پول به حساب بانکی</h4>
                <p className="text-[11px] text-stone-300">
                  در پنل تپسل خود در سایت <strong>tapsell.ir</strong>، به بخش «مدیریت مالی» بروید و شماره شبای بانکی خود را ثبت کنید. تپسل در پایان هر ماه درآمد حاصل از تماشای ویدیوها توسط بازیکنان را به تومان مستقیماً به حسابتان واریز می‌کند.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-800/40 space-y-1">
                <h4 className="font-bold text-amber-200">۲. درآمد بیشتر با افزایش بازیکنان</h4>
                <p className="text-[11px] text-stone-300">
                  وقتی بازی را در <strong>کافه‌بازار</strong> یا <strong>مایکت</strong> منتشر کنید، اگر مثلاً روزانه ۱۰۰۰ کاربر داشته باشید و هر کاربر فقط ۳ بار فیلم تبلیغاتی ببیند (۳۰۰۰ نمایش روزانه)، ماهانه مبالغ میلیونی به حساب شما واریز خواهد شد.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-2 border-t border-amber-900/50">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-stone-800 text-stone-300 text-xs font-bold hover:bg-stone-700 transition-colors cursor-pointer"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
