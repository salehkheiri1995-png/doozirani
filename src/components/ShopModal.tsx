import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Coins,
  Eye,
  Lock,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Video,
  X,
} from 'lucide-react';
import {
  CATALOG,
  getItemsByType,
  getItemById,
  type CosmeticItem,
  type CosmeticType,
} from '../economy/catalog';
import {
  AD_REWARD_COINS,
  getAdAvailability,
  type EquippedItems,
} from '../economy/economyStore';
import { economyActions, useEconomy } from '../economy/useEconomy';
import { playStonePlaceSound, playVictorySound } from '../utils/audio';
import { StonePiece } from './StonePiece';

interface ShopModalProps {
  isOpen: boolean;
  adsAllowed?: boolean;
  onWatchAdClick: () => void;
  onClose: () => void;
}

const TABS: Array<{ type: CosmeticType; label: string }> = [
  { type: 'stone_skin', label: 'مهره‌ها' },
  { type: 'board_theme', label: 'صفحه‌ها' },
  { type: 'profile_frame', label: 'قاب پروفایل' },
  { type: 'bundle', label: 'بسته‌ها' },
];

const TYPE_LABEL: Record<CosmeticType, string> = {
  stone_skin: 'پوسته مهره',
  board_theme: 'تم صفحه',
  profile_frame: 'قاب پروفایل',
  bundle: 'بسته ظاهری',
};

const RARITY_LABEL = {
  standard: 'معمولی',
  special: 'ویژه',
  premium: 'ممتاز',
} as const;

function itemOwned(item: CosmeticItem, owned: string[]): boolean {
  if (item.type !== 'bundle') return owned.includes(item.id);
  return (item.contents || []).every((id) => owned.includes(id));
}

function equippableKey(type: CosmeticType): keyof EquippedItems | null {
  if (type === 'stone_skin' || type === 'board_theme' || type === 'profile_frame') {
    return type;
  }
  return null;
}

const MiniPreview: React.FC<{ item: CosmeticItem }> = ({ item }) => {
  if (item.type === 'stone_skin') {
    const config = item.renderConfig as Extract<CosmeticItem['renderConfig'], { p1: unknown }>;
    return (
      <div className="flex items-center justify-center gap-3 py-3">
        <StonePiece player="player1" size="lg" appearance={config.p1} />
        <StonePiece player="player2" size="lg" appearance={config.p2} />
      </div>
    );
  }
  if (item.type === 'board_theme') {
    const config = item.renderConfig as { surface: string; line: string; accent: string };
    return (
      <div
        className="h-24 w-full rounded-2xl border-2 relative overflow-hidden"
        style={{ background: config.surface, borderColor: config.accent }}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full p-3">
          <rect x="10" y="10" width="80" height="80" fill="none" stroke={config.line} strokeWidth="2" />
          <line x1="50" y1="10" x2="50" y2="90" stroke={config.line} strokeWidth="2" />
          <line x1="10" y1="50" x2="90" y2="50" stroke={config.line} strokeWidth="2" />
        </svg>
      </div>
    );
  }
  if (item.type === 'profile_frame') {
    const config = item.renderConfig as { ring: string; background: string; label: string };
    return (
      <div className="flex items-center justify-center py-5">
        <div
          className="px-6 py-3 rounded-2xl text-sm font-black text-white"
          style={{
            border: `3px solid ${config.ring}`,
            background: config.background,
            boxShadow: `0 0 18px ${config.ring}55`,
          }}
        >
          {config.label}
        </div>
      </div>
    );
  }
  return (
    <div className="py-3 space-y-1.5">
      {(item.contents || []).map((id) => {
        const child = getItemById(id);
        if (!child) return null;
        return (
          <div
            key={id}
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-stone-900/80 border border-stone-700/60 text-xs"
          >
            <span className="font-bold text-amber-100">{child.nameFa}</span>
            <span className="text-stone-400">{TYPE_LABEL[child.type]}</span>
          </div>
        );
      })}
    </div>
  );
};

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  adsAllowed = true,
  onWatchAdClick,
  onClose,
}) => {
  const economy = useEconomy();
  const [tab, setTab] = useState<CosmeticType>('stone_skin');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isOpen) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const items = useMemo(() => getItemsByType(tab), [tab]);
  const preview = previewId ? getItemById(previewId) : null;
  const adAvailability = getAdAvailability(economy, now);

  if (!isOpen) return null;

  const handleBuy = (item: CosmeticItem) => {
    if (itemOwned(item, economy.ownedItemIds)) {
      const key = equippableKey(item.type);
      if (!key) {
        setMessage('این بسته را خریده‌اید؛ آیتم‌های داخل آن را از تب‌های دیگر انتخاب کنید.');
        return;
      }
      const result = economyActions.equip(item.id);
      if (result.ok) {
        playStonePlaceSound();
        setMessage(`${item.nameFa} انتخاب شد و همین حالا روی صفحه بازی اعمال می‌شود.`);
      } else {
        setMessage(result.messageFa);
      }
      return;
    }
    const requestId = `shop-${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const result = economyActions.purchase(item.id, requestId);
    if (result.ok) {
      playVictorySound();
      setMessage(
        result.duplicate
          ? 'این درخواست قبلاً ثبت شده بود و سکه‌ای دوباره کم نشد.'
          : `خرید ${item.nameFa} ثبت شد. در صورت نیاز، دکمه «استفاده» را بزنید.`
      );
    } else {
      setMessage(result.messageFa);
    }
  };

  const handleEquip = (item: CosmeticItem) => {
    const result = economyActions.equip(item.id);
    if (result.ok) {
      playStonePlaceSound();
      setMessage(`${item.nameFa} روی ظاهر بازی اعمال شد.`);
    } else {
      setMessage(result.messageFa);
    }
  };

  const adButtonLabel = !adsAllowed
    ? 'در میانه مسابقه بلوتوث، تبلیغ جایزه‌ای نمایش داده نمی‌شود'
    : !adAvailability.canClaim
      ? adAvailability.remainingDaily === 0
        ? 'سقف پاداش امروز پر شده است'
        : `تا تبلیغ بعدی ${Math.ceil(adAvailability.cooldownRemainingMs / 1000)} ثانیه`
      : `تماشای تبلیغ جایزه‌ای (+${AD_REWARD_COINS} سکه)`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-md bg-[#18110b] border-2 border-amber-600/70 rounded-3xl p-4 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-600/30 border border-amber-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-black text-amber-100">فروشگاه ظاهر بازی</h2>
              <span className="text-[10px] text-amber-300/70">آیتم‌ها فقط ظاهری‌اند و روی قوانین یا شانس برد اثر ندارند.</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/60 shadow-inner">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="font-black text-xs text-yellow-300">{economy.coins}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="بستن"
              className="p-1 rounded-xl text-amber-400 hover:bg-amber-950/60 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto pr-1 flex-1 space-y-3 pt-3">
          <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/80 via-yellow-950/60 to-amber-950/80 border-2 border-yellow-500/60 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-amber-200 block">تبلیغ جایزه‌ای اختیاری</span>
                <span className="text-[10px] text-stone-300 block">
                  {AD_REWARD_COINS} سکه فقط بعد از تأیید رسمی SDK. سقف روزانه: {adAvailability.remainingDaily} باقی‌مانده.
                </span>
              </div>
              <Video className="w-5 h-5 text-yellow-300 shrink-0" />
            </div>
            <button
              type="button"
              onClick={onWatchAdClick}
              disabled={!adsAllowed || !adAvailability.canClaim}
              className={`w-full mt-2 py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
                adsAllowed && adAvailability.canClaim
                  ? 'bg-gradient-to-r from-yellow-500 via-amber-600 to-amber-700 text-white hover:from-yellow-400 active:scale-[0.98] cursor-pointer'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed'
              }`}
            >
              <Video className="w-4 h-4" />
              {adButtonLabel}
            </button>
          </div>

          <div className="flex gap-1 bg-stone-900/90 p-1 rounded-2xl border border-amber-800/50">
            {TABS.map((entry) => (
              <button
                key={entry.type}
                type="button"
                onClick={() => {
                  setTab(entry.type);
                  setPreviewId(null);
                }}
                className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                  tab === entry.type ? 'bg-amber-600 text-white' : 'text-stone-400 hover:text-amber-200'
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>

          {preview && (
            <div className="p-3 rounded-2xl bg-stone-900/90 border-2 border-amber-500/60">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-black text-amber-100 block">{preview.nameFa}</span>
                  <span className="text-[10px] text-stone-400 block">{preview.descriptionFa}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewId(null)}
                  className="text-stone-400 hover:text-amber-200 cursor-pointer"
                  aria-label="بستن پیش‌نمایش"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <MiniPreview item={preview} />
              <span className="text-[10px] text-emerald-300 block text-center">
                پیش‌نمایش رایگان است و سکه‌ای کم نمی‌کند.
              </span>
            </div>
          )}

          {message && (
            <div className="px-3 py-2 rounded-xl bg-amber-950/70 border border-amber-600/50 text-[11px] font-bold text-amber-200">
              {message}
            </div>
          )}

          <div className="space-y-2">
            {items.map((item) => {
              const owned = itemOwned(item, economy.ownedItemIds);
              const key = equippableKey(item.type);
              const equipped = !!key && economy.equipped[key] === item.id;
              const canAfford = economy.coins >= item.priceCoins;
              return (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-stone-900/80 border border-stone-800 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-2xl border-2 shrink-0"
                      style={{ background: item.preview.gradient, borderColor: '#ffffff44' }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-black text-stone-100 block truncate">{item.nameFa}</span>
                      <span className="text-[10px] text-stone-400 block">
                        {RARITY_LABEL[item.rarity]} • {item.priceCoins === 0 ? 'رایگان' : `${item.priceCoins} سکه`}
                      </span>
                      {!owned && !canAfford && (
                        <span className="text-[10px] text-rose-300 block">
                          {item.priceCoins - economy.coins} سکه دیگر لازم دارید
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewId(item.id)}
                      aria-label={`پیش‌نمایش ${item.nameFa}`}
                      className="p-2 rounded-xl bg-stone-800 text-amber-200 hover:bg-stone-700 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {equipped ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-1.5 rounded-xl border border-emerald-500/40">
                        <Check className="w-3 h-3" />
                        فعال
                      </span>
                    ) : owned && key ? (
                      <button
                        type="button"
                        onClick={() => handleEquip(item)}
                        className="px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-600 text-white text-[11px] font-bold cursor-pointer"
                      >
                        استفاده
                      </button>
                    ) : owned ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-1.5 rounded-xl border border-emerald-500/40">
                        <Check className="w-3 h-3" />
                        خریداری‌شده
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleBuy(item)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                          canAfford
                            ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-md'
                            : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                        }`}
                      >
                        <Lock className="w-3 h-3 inline ml-1" />
                        خرید
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              economyActions.resetEquipped();
              playStonePlaceSound();
              setMessage('ظاهر پایه بازی بازگردانده شد؛ آیتم‌های خریداری‌شده در مالکیت شما می‌مانند.');
            }}
            className="w-full py-2 rounded-xl bg-stone-800 text-stone-300 text-[11px] font-bold hover:bg-stone-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            بازگشت به ظاهر پایه
          </button>

          <p className="text-[10px] text-stone-500 text-center leading-5">
            <Sparkles className="w-3 h-3 inline ml-1" />
            در این نسخه، مالکیت و سکه‌ها روی همین گوشی ذخیره می‌شوند. خرید پولی واقعی و اقتصاد آنلاین
            در این نسخه فعال نیست. مجموع آیتم‌های کاتالوگ: {CATALOG.length}
          </p>
        </div>

        <div className="mt-3 pt-2 border-t border-amber-900/50">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-stone-800 text-stone-300 text-xs font-bold hover:bg-stone-700 transition-colors cursor-pointer"
          >
            بستن فروشگاه
          </button>
        </div>
      </div>
    </div>
  );
};
