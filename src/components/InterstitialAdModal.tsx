import React, { useState, useEffect } from 'react';
import { X, Sparkles, ExternalLink, ShieldCheck, ArrowRight, Play } from 'lucide-react';
import { TAPSELL_CONFIG, incrementInterstitialImpressions } from '../utils/tapsellService';
import { getNextAdCampaign, AdCampaign } from '../utils/tapsellAdFetcher';

interface InterstitialAdModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InterstitialAdModal: React.FC<InterstitialAdModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const [campaign, setCampaign] = useState<AdCampaign | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(5);
      setCanSkip(false);
      return;
    }

    // Pick next campaign in rotation
    const current = getNextAdCampaign();
    setCampaign(current);
    incrementInterstitialImpressions();

    setSecondsLeft(5);
    setCanSkip(false);

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen || !campaign) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-sm bg-[#161009] border-2 border-amber-500/80 rounded-3xl p-5 shadow-2xl text-center relative overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/50 text-xs text-amber-300">
          <div className="flex items-center gap-1.5 font-bold">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>تبلیغ بین‌صفحه‌ای تپسل (پیش‌نمایشی)</span>
          </div>

          {canSkip ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="رد کردن تبلیغ"
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-600 text-black font-bold text-xs hover:bg-amber-500 cursor-pointer shadow-md transition-transform active:scale-95"
            >
              <span>رد کردن</span>
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="font-mono text-amber-400 bg-black/70 px-2 py-0.5 rounded-lg border border-amber-600/40 text-[11px]">
              امکان رد کردن تا {secondsLeft} ثانیه
            </span>
          )}
        </div>

        {/* Zone Badge */}
        <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-stone-900 to-black border border-amber-600/30 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-right">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: campaign.accentColor }} />
            <span className="font-bold text-white text-xs">{campaign.brandName}</span>
          </div>
          <span className="font-mono text-[9px] text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30" dir="ltr">
            پیش‌نمایشی: {TAPSELL_CONFIG.zones.interstitialVideo.substring(0, 8)}...
          </span>
        </div>

        {/* Visual Creative / Video preview */}
        <div className="my-3 aspect-video w-full rounded-2xl bg-black border border-amber-500/40 relative overflow-hidden shadow-xl flex items-center justify-center">
          <video
            src={campaign.videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3 text-right">
            <span className="text-white font-black text-sm drop-shadow">{campaign.title}</span>
            <span className="text-amber-200 text-xs mt-0.5">{campaign.subtitle}</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 text-black font-black text-xs hover:brightness-110 shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>{campaign.ctaText}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {canSkip && (
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-3 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 text-xs font-bold cursor-pointer"
            >
              بستن
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
