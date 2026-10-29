import React, { useEffect } from 'react';
import { TAPSELL_CONFIG, incrementBannerImpressions } from '../utils/tapsellService';
import { ShieldCheck, ExternalLink, Sparkles } from 'lucide-react';

interface TapsellBannerProps {
  className?: string;
}

export const TapsellBanner: React.FC<TapsellBannerProps> = ({ className = '' }) => {
  useEffect(() => {
    incrementBannerImpressions();
  }, []);

  return (
    <div
      id="tapsell-banner-container"
      className={`w-full max-w-sm mx-auto p-2 rounded-2xl bg-gradient-to-r from-[#1c140d] via-[#24170e] to-[#1c140d] border border-amber-700/50 shadow-md flex items-center justify-between text-right overflow-hidden relative select-none ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-amber-600/30 border border-amber-400 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
        </div>
        <div className="overflow-hidden">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-amber-200 truncate">اسپانسر رسمی بازی دوز</span>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/30 shrink-0">
              تپسل
            </span>
          </div>
          <span className="text-[10px] text-amber-400/80 block truncate">
            حمایت از توسعه‌دهنده با تماشای تبلیغات
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end shrink-0 pl-1">
        <span className="font-mono text-[9px] text-amber-400/60 bg-black/40 px-1.5 py-0.5 rounded" dir="ltr">
          {TAPSELL_CONFIG.zones.standardBanner.substring(0, 8)}...
        </span>
        <span className="text-[9px] text-emerald-400 font-bold mt-0.5">تبلیغگاه استاندارد</span>
      </div>
    </div>
  );
};
