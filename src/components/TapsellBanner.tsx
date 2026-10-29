import React, { useEffect, useState } from 'react';
import { TAPSELL_CONFIG, incrementBannerImpressions } from '../utils/tapsellService';
import { ShieldCheck, ExternalLink, Sparkles, Megaphone } from 'lucide-react';
import { useTapsell } from '../hooks/useTapsell';

interface TapsellBannerProps {
  className?: string;
  onClickAd?: () => void;
}

interface BannerCreative {
  title: string;
  subtitle: string;
  badge: string;
  cta: string;
  accent: string;
}

const BANNER_CREATIVES: BannerCreative[] = [
  {
    title: 'تخفیف ویژه سفر اسنپ',
    subtitle: 'کد هدیه ۵۰٪: DOOZ2026',
    badge: 'تپسل اسپانسر',
    cta: 'مشاهده',
    accent: '#10b981',
  },
  {
    title: 'حراج شگفت‌انگیز دیجی‌کالا',
    subtitle: 'ارسال رایگان سفارش اول',
    badge: 'پیشنهاد ویژه',
    cta: 'خرید',
    accent: '#f43f5e',
  },
  {
    title: 'جشنواره بازی‌های کافه‌بازار',
    subtitle: 'جوایز نقدی لیگ بازی‌های تخته‌ای',
    badge: 'منتخب بازار',
    cta: 'نصب',
    accent: '#14b8a6',
  },
  {
    title: 'شبکه تبلیغات هوشمند تپسل',
    subtitle: 'کسب درآمد تضمینی بازی‌سازان',
    badge: 'تپسل پلاس',
    cta: 'شروع',
    accent: '#f59e0b',
  },
];

export const TapsellBanner: React.FC<TapsellBannerProps> = ({ className = '', onClickAd }) => {
  const { isInitialized, requestBannerAd } = useTapsell();
  const [creativeIndex, setCreativeIndex] = useState(0);

  useEffect(() => {
    // Request banner using official SDK with mapped zone
    requestBannerAd('tapsell-banner-container', TAPSELL_CONFIG.zones.standardBanner);

    // Rotate banner content every 10 seconds for dynamic advertiser exposure
    const interval = setInterval(() => {
      setCreativeIndex((prev) => (prev + 1) % BANNER_CREATIVES.length);
      incrementBannerImpressions();
    }, 10000);

    return () => clearInterval(interval);
  }, [requestBannerAd]);

  const current = BANNER_CREATIVES[creativeIndex];

  return (
    <div
      id="tapsell-banner-container"
      data-zone-id={TAPSELL_CONFIG.zones.standardBanner}
      data-app-key={TAPSELL_CONFIG.appKey}
      onClick={onClickAd}
      className={`w-full max-w-sm mx-auto p-2.5 rounded-2xl bg-gradient-to-r from-[#1c140d] via-[#24170e] to-[#1c140d] border border-amber-600/50 shadow-lg flex items-center justify-between text-right overflow-hidden relative cursor-pointer hover:border-amber-500 transition-all select-none group ${className}`}
    >
      <div className="flex items-center gap-2.5 overflow-hidden">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
          style={{ backgroundColor: `${current.accent}25`, border: `1px solid ${current.accent}` }}
        >
          <Sparkles className="w-4 h-4 animate-pulse" style={{ color: current.accent }} />
        </div>

        <div className="overflow-hidden">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-amber-100 truncate">{current.title}</span>
            <span
              className="text-[9px] px-1.5 py-0.2 rounded font-bold shrink-0 border"
              style={{
                backgroundColor: `${current.accent}20`,
                color: current.accent,
                borderColor: `${current.accent}40`,
              }}
            >
              {current.badge}
            </span>
          </div>
          <span className="text-[10px] text-amber-300/80 block truncate mt-0.5">
            {current.subtitle}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end shrink-0 pl-1">
        <div className="flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded border border-amber-700/40">
          <span className="font-mono text-[9px] text-amber-400" dir="ltr">
            بنر: {TAPSELL_CONFIG.zones.standardBanner.substring(0, 6)}...
          </span>
          <ExternalLink className="w-2.5 h-2.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
        </div>
        <span className="text-[9px] text-emerald-400 font-bold mt-1">
          {isInitialized ? 'تبلیغگاه متصل' : 'تپسل وب'}
        </span>
      </div>
    </div>
  );
};
