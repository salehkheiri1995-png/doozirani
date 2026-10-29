import React, { useState } from 'react';
import { Coins, Video, Check, ShoppingBag, X } from 'lucide-react';
import { CosmeticSkin, INITIAL_SKINS, getUnlockedSkinIds, unlockSkin, getActiveSkinId, setActiveSkinId, savePlayerCoins } from '../utils/monetization';
import { playStonePlaceSound, playVictorySound } from '../utils/audio';

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

        {/* Body */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-3">
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
