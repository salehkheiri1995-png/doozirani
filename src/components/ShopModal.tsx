import React, { useState, useEffect } from 'react';
import { Coins, Video, Check, ShoppingBag, X, Sparkles, Gift, Lock, Crown, Grid3x3 } from 'lucide-react';
import {
  CosmeticSkin,
  BoardTheme,
  INITIAL_SKINS,
  INITIAL_BOARD_THEMES,
  SKIN_CATEGORIES,
  getUnlockedSkinIds,
  unlockSkin,
  getActiveSkinId,
  setActiveSkinId,
  savePlayerCoins,
  isDailyBonusAvailable,
  claimDailyBonus,
  getUnlockedBoardThemeIds,
  unlockBoardTheme,
  getActiveBoardThemeId,
  setActiveBoardThemeId,
} from '../utils/monetization';
import { playStonePlaceSound, playVictorySound } from '../utils/audio';

interface ShopModalProps {
  isOpen: boolean;
  coins: number;
  onCoinsChange: (newCoins: number) => void;
  onWatchAdClick: () => void;
  onClose: () => void;
  /** Called immediately whenever the active skin changes (buy or equip) */
  onSkinChange?: (skinId: string) => void;
  /** Called immediately whenever the active board theme changes (buy or equip) */
  onThemeChange?: (themeId: string) => void;
}

const CATEGORY_ICON: Record<string, string> = {
  classic: '🎨',
  royal: '👑',
  legendary: '🔥',
  mythic: '✨',
};

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  coins,
  onCoinsChange,
  onWatchAdClick,
  onClose,
  onSkinChange,
  onThemeChange,
}) => {
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(getUnlockedSkinIds());
  const [activeSkin, setActiveSkin] = useState<string>(getActiveSkinId());
  const [unlockedBoardThemes, setUnlockedBoardThemes] = useState<string[]>(getUnlockedBoardThemeIds());
  const [activeTheme, setActiveTheme] = useState<string>(getActiveBoardThemeId());
  const [category, setCategory] = useState<string>('all');
  const [feedback, setFeedback] = useState<string>('');
  const [dailyClaimed, setDailyClaimed] = useState<boolean>(!isDailyBonusAvailable());

  // Re-sync local state from localStorage every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setUnlockedSkins(getUnlockedSkinIds());
      setActiveSkin(getActiveSkinId());
      setUnlockedBoardThemes(getUnlockedBoardThemeIds());
      setActiveTheme(getActiveBoardThemeId());
      setDailyClaimed(!isDailyBonusAvailable());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const flash = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(''), 2200);
  };

  const handleBuySkin = (skin: CosmeticSkin) => {
    if (coins < skin.cost) {
      flash('سکه کافی نیست! برای دریافت سکه، جایزه روزانه بگیرید یا تبلیغ ببینید.');
      return;
    }
    const nextCoins = coins - skin.cost;
    savePlayerCoins(nextCoins);
    onCoinsChange(nextCoins);
    unlockSkin(skin.id);
    setActiveSkinId(skin.id);
    setActiveSkin(skin.id);
    setUnlockedSkins(getUnlockedSkinIds());
    playVictorySound();
    onSkinChange?.(skin.id);
    flash(`${skin.name} خریداری و فعال شد! 🎉`);
  };

  const handleEquipSkin = (skinId: string) => {
    setActiveSkinId(skinId);
    setActiveSkin(skinId);
    playStonePlaceSound();
    onSkinChange?.(skinId);
    flash('مهره‌ها به‌روزرسانی شدند.');
  };

  const handleBuyTheme = (theme: BoardTheme) => {
    if (coins < theme.cost) {
      flash('سکه کافی نیست! برای دریافت سکه، جایزه روزانه بگیرید یا تبلیغ ببینید.');
      return;
    }
    const nextCoins = coins - theme.cost;
    savePlayerCoins(nextCoins);
    onCoinsChange(nextCoins);
    unlockBoardTheme(theme.id);
    setActiveBoardThemeId(theme.id);
    setActiveTheme(theme.id);
    setUnlockedBoardThemes(getUnlockedBoardThemeIds());
    playVictorySound();
    onThemeChange?.(theme.id);
    flash(`${theme.name} خریداری و فعال شد! 🎉`);
  };

  const handleEquipTheme = (themeId: string) => {
    setActiveBoardThemeId(themeId);
    setActiveTheme(themeId);
    playStonePlaceSound();
    onThemeChange?.(themeId);
    flash('طرح تخته به‌روزرسانی شد.');
  };

  const handleClaimDaily = () => {
    const result = claimDailyBonus();
    if (result.available) {
      onCoinsChange(coins + result.granted);
      setDailyClaimed(true);
      playVictorySound();
      flash(`جایزه روزانه ${result.granted} سکه دریافت شد! 🎁`);
    } else {
      setDailyClaimed(true);
      flash('جایزه روزانه را قبلاً دریافت کرده‌اید. فردا دوباره بیایید!');
    }
  };

  const filteredSkins = category === 'all' ? INITIAL_SKINS : INITIAL_SKINS.filter((s) => s.category === category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-md bg-[#18110b] border-2 border-amber-600/70 rounded-3xl p-5 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-600/30 border border-amber-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-black text-amber-100">فروشگاه و سکه</h2>
              <p className="text-[10px] text-amber-300/70">سکه جمع کن، مهره‌ها را متمایز کن</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Feedback toast */}
        {feedback && (
          <div className="mt-2 px-3 py-2 rounded-xl bg-amber-600/20 border border-amber-500/50 text-amber-200 text-xs font-bold text-center animate-fadeIn">
            {feedback}
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-3 mt-3">
          {/* Daily bonus card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-teal-950/70 to-emerald-950/80 border-2 border-emerald-500/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-400 flex items-center justify-center">
                <Gift className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <span className="text-xs font-black text-emerald-200 block">جایزه روزانه</span>
                <span className="text-[10px] text-emerald-300/70 block">هر روز یک‌بار، ۸۰ سکه رایگان</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClaimDaily}
              disabled={dailyClaimed}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                dailyClaimed
                  ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
              }`}
            >
              {dailyClaimed ? 'گرفته شد ✓' : 'دریافت'}
            </button>
          </div>

          {/* Rewarded Ad Watch Action Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/80 via-yellow-950/60 to-amber-950/80 border-2 border-yellow-500/60 shadow-lg text-center">
            <span className="text-xs font-bold text-amber-200 block mb-1">
              🎁 دریافت فوری سکه طلا با تماشای فیلم تبلیغاتی
            </span>
            <p className="text-[11px] text-stone-300 mb-3">
              با تماشای یک ویدیوی کوتاه، ۱۰۰ سکه رایگان برای خرید تم‌ها بگیرید!
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

          {/* Category filter */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                category === 'all' ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-400 hover:text-amber-200'
              }`}
            >
              همه
            </button>
            {SKIN_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  category === c.id ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-400 hover:text-amber-200'
                }`}
              >
                {CATEGORY_ICON[c.id]} {c.label}
              </button>
            ))}
          </div>

          {/* Skins list */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-amber-300 block">رنگ و مدل مهره‌ها:</span>
            {filteredSkins.map((skin) => {
              const isUnlocked = unlockedSkins.includes(skin.id);
              const isEquipped = activeSkin === skin.id;
              const canAfford = coins >= skin.cost;

              return (
                <div
                  key={skin.id}
                  className={`p-3 rounded-2xl bg-stone-900/80 border flex items-center justify-between transition-colors ${
                    isEquipped ? 'border-amber-400/70' : 'border-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${skin.previewClass} border-2 border-white/40 shadow-md`} />
                    <div>
                      <span className="text-xs font-bold text-stone-100 block">{skin.name}</span>
                      <span className="text-[10px] text-stone-400 block">
                        {skin.category === 'mythic' && (
                          <span className="text-amber-400 inline-flex items-center gap-0.5 ml-1">
                            <Crown className="w-3 h-3" /> اساطیری
                          </span>
                        )}
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
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1 ${
                        canAfford
                          ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-md'
                          : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      {!canAfford && <Lock className="w-3 h-3" />}
                      خرید ({skin.cost} سکه)
                    </button>
                  )}
                </div>
              );
            })}

            {filteredSkins.length === 0 && (
              <p className="text-center text-stone-500 text-xs py-3">در این دسته‌بندی آیتمی نیست.</p>
            )}
          </div>

          {/* Board themes (purchasable board skins) */}
          <div className="space-y-2 mt-4">
            <div className="flex items-center gap-2">
              <Grid3x3 className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-300">طرح تخته بازی:</span>
            </div>
            {INITIAL_BOARD_THEMES.map((theme) => {
              const isUnlocked = unlockedBoardThemes.includes(theme.id);
              const isEquipped = activeTheme === theme.id;
              const canAfford = coins >= theme.cost;

              return (
                <div
                  key={theme.id}
                  className={`p-3 rounded-2xl bg-stone-900/80 border flex items-center justify-between transition-colors ${
                    isEquipped ? 'border-amber-400/70' : 'border-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-7 rounded-lg bg-gradient-to-br ${theme.previewClass} border border-white/20 shadow-md`} />
                    <div>
                      <span className="text-xs font-bold text-stone-100 block">{theme.name}</span>
                      <span className="text-[10px] text-stone-400 block">
                        {theme.category === 'mythic' && (
                          <span className="text-amber-400 inline-flex items-center gap-0.5 ml-1">
                            <Crown className="w-3 h-3" /> اساطیری
                          </span>
                        )}
                        {theme.cost === 0 ? 'رایگان اولیه' : `${theme.cost} سکه`}
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
                      onClick={() => handleEquipTheme(theme.id)}
                      className="px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      استفاده
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleBuyTheme(theme)}
                      disabled={!canAfford}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1 ${
                        canAfford
                          ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-md'
                          : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      {!canAfford && <Lock className="w-3 h-3" />}
                      خرید ({theme.cost} سکه)
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Encouraging call to action */}
          <div className="p-3 rounded-2xl bg-stone-900/60 border border-stone-800 text-center">
            <Sparkles className="w-4 h-4 inline-block text-amber-400 mb-1" />
            <p className="text-[11px] text-stone-400 leading-relaxed">
              با برد در بازی، جایزه روزانه و تماشای تبلیغ، سکه جمع کنید و مهره‌های
              کمیاب و افسانه‌ای باز کنید!
            </p>
          </div>
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
