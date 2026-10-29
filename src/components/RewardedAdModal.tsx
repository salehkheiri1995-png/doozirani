import React, { useState, useEffect, useRef } from 'react';
import { Play, Coins, X, CheckCircle, Video, Award, Sparkles, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { playVictorySound } from '../utils/audio';
import {
  TAPSELL_CONFIG,
  incrementTapsellImpressions,
} from '../utils/tapsellService';
import { fetchLiveTapsellAd, AdCampaign, CAMPAIGN_POOL } from '../utils/tapsellAdFetcher';

interface RewardedAdModalProps {
  isOpen: boolean;
  rewardAmount?: number;
  onRewardGranted: (amount: number) => void;
  onClose: () => void;
}

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  isOpen,
  rewardAmount = 100,
  onRewardGranted,
  onClose,
}) => {
  const [currentCampaign, setCurrentCampaign] = useState<AdCampaign>(CAMPAIGN_POOL[0]);
  const [secondsLeft, setSecondsLeft] = useState(7);
  const [totalSeconds, setTotalSeconds] = useState(7);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiveStream, setIsLiveStream] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rewardCallbackRef = useRef(onRewardGranted);
  const hasRewardedRef = useRef(false);

  useEffect(() => {
    rewardCallbackRef.current = onRewardGranted;
  }, [onRewardGranted]);

  useEffect(() => {
    if (!isOpen) {
      setIsCompleted(false);
      hasRewardedRef.current = false;
      return;
    }

    // Fetch dynamic rotated ad from pool or live stream
    fetchLiveTapsellAd().then(({ campaign, isOnlineStream }) => {
      setCurrentCampaign(campaign);
      setIsLiveStream(isOnlineStream);
      setTotalSeconds(campaign.durationSeconds);
      setSecondsLeft(campaign.durationSeconds);
      setIsCompleted(false);
      hasRewardedRef.current = false;

      // Record impression in Tapsell tracker
      incrementTapsellImpressions();

      // Trigger video playback
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play().catch(() => {
            if (videoRef.current) {
              videoRef.current.muted = true;
              setIsMuted(true);
              videoRef.current.play().catch(() => {});
            }
          });
        }
      }, 150);
    });

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          completeReward();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const completeReward = () => {
    setIsCompleted(true);
    playVictorySound();
    if (!hasRewardedRef.current) {
      hasRewardedRef.current = true;
      rewardCallbackRef.current(rewardAmount);
    }
  };

  const handleToggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  if (!isOpen) return null;

  const progressPercent = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-sm bg-[#161009] border-2 border-amber-500/80 rounded-3xl p-5 shadow-2xl text-center relative overflow-hidden">
        {/* Ad Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/50 text-xs text-amber-300">
          <div className="flex items-center gap-1.5 font-bold">
            <Video className="w-4 h-4 text-amber-400" />
            <span>شبکه تبلیغات تپسل (Tapsell)</span>
          </div>

          {isCompleted ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="بستن آگهی"
              className="p-1 rounded-lg bg-stone-800 text-stone-200 hover:bg-stone-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="font-mono text-amber-400 bg-black/70 px-2 py-0.5 rounded-lg border border-amber-600/40 text-[11px]">
              {secondsLeft} ثانیه
            </span>
          )}
        </div>

        {/* Dynamic Sponsor & Zone Info Badge */}
        <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-stone-900 to-black border border-amber-600/40 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-right">
            <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: currentCampaign.accentColor }} />
            <div>
              <span className="font-black text-white text-xs block">{currentCampaign.brandName}</span>
              <span className="text-[10px] text-stone-400 block">{currentCampaign.subtitle}</span>
            </div>
          </div>
          <span className="font-mono text-[9px] text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30" dir="ltr">
            s01
          </span>
        </div>

        {/* DYNAMIC VIDEO PLAYER CONTAINER */}
        <div className="my-3 aspect-video w-full rounded-2xl bg-black border-2 border-amber-500/50 relative overflow-hidden shadow-2xl flex items-center justify-center">
          {!isCompleted ? (
            <>
              <video
                key={currentCampaign.id}
                ref={videoRef}
                src={currentCampaign.videoUrl}
                autoPlay
                playsInline
                muted={isMuted}
                onEnded={completeReward}
                className="w-full h-full object-cover"
              />

              {/* Dynamic Sponsor Watermark */}
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded-lg border border-white/20">
                <Sparkles className="w-3 h-3 text-yellow-300" />
                <span className="text-[10px] font-bold text-white">{currentCampaign.brandEn}</span>
              </div>

              {/* Sound Toggle */}
              <button
                type="button"
                onClick={handleToggleMute}
                aria-label="تغییر وضعیت صدا"
                className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-black/80 text-amber-300 border border-amber-700/50 hover:bg-black cursor-pointer flex items-center gap-1"
              >
                {isMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-[10px]">بی‌صدا</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px]">باصدا</span>
                  </>
                )}
              </button>

              {/* Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/70 z-10">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </>
          ) : (
            /* REWARD UNLOCKED STATE */
            <div className="w-full h-full p-4 bg-gradient-to-b from-stone-900 to-emerald-950/80 flex flex-col items-center justify-center animate-fadeIn">
              <Award className="w-12 h-12 text-yellow-400 mb-1 drop-shadow-lg animate-bounce" />
              <p className="text-sm font-black text-amber-200">جایزه با موفقیت ثبت شد!</p>
              <div className="flex items-center gap-1 text-emerald-300 font-black text-base mt-1">
                <span>+{rewardAmount}</span>
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="text-xs">سکه طلا به کیف پول اضافه شد</span>
              </div>
            </div>
          )}
        </div>

        {/* Sponsor Banner & Action Info */}
        {!isCompleted ? (
          <div className="p-2.5 rounded-2xl bg-stone-900/80 border border-stone-800 text-right flex items-center justify-between">
            <div>
              <span className="text-[10px] text-amber-400 font-bold block">{currentCampaign.title}</span>
              <span className="text-[9px] text-stone-400 block">پاداش تماشای این فیلم: +۱۰۰ سکه طلا</span>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl text-white shadow-sm" style={{ backgroundColor: currentCampaign.accentColor }}>
              {currentCampaign.ctaText}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm shadow-xl hover:from-emerald-400 hover:to-teal-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            دریافت سکه و بازگشت به بازی
          </button>
        )}
      </div>
    </div>
  );
};
