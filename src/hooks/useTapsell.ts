import { useState, useEffect, useCallback, useRef } from 'react';
import {
  TAPSELL_CONFIG,
  incrementBannerImpressions,
  incrementInterstitialImpressions,
  incrementRewardedImpressions,
  getTapsellDetailedStats,
  TapsellDetailedStats,
} from '../utils/tapsellService';
import { fetchLiveTapsellAd, AdCampaign, CAMPAIGN_POOL } from '../utils/tapsellAdFetcher';

declare global {
  interface Window {
    tapsell?: any;
    Tapsell?: any;
    tapsellPlus?: any;
    onTapsellReady?: (sdk: any) => void;
  }
}

export interface TapsellHookState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  appKey: string;
  zones: {
    standardBanner: string;
    interstitialVideo: string;
    rewardedVideo: string;
  };
  stats: TapsellDetailedStats;
  currentBannerAd: any | null;
  currentInterstitialAd: any | null;
  currentRewardedAd: any | null;
}

export function useTapsell() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TapsellDetailedStats>(getTapsellDetailedStats());
  const [currentBannerAd, setCurrentBannerAd] = useState<any | null>(null);
  const [currentInterstitialAd, setCurrentInterstitialAd] = useState<any | null>(null);
  const [currentRewardedAd, setCurrentRewardedAd] = useState<any | null>(null);

  const initAttemptedRef = useRef(false);

  // Initialize Tapsell Web SDK
  const initializeTapsell = useCallback(() => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if SDK already attached to window
      const sdk = window.tapsell || window.Tapsell || window.tapsellPlus;
      if (sdk && typeof sdk.init === 'function') {
        sdk.init({ appKey: TAPSELL_CONFIG.appKey });
        // Map zone slots
        if (typeof sdk.setZone === 'function') {
          sdk.setZone('banner', TAPSELL_CONFIG.zones.standardBanner);
          sdk.setZone('interstitial', TAPSELL_CONFIG.zones.interstitialVideo);
          sdk.setZone('rewarded', TAPSELL_CONFIG.zones.rewardedVideo);
        }
        setIsInitialized(true);
        setIsLoading(false);
        return;
      }

      // If script is not yet loaded, inject it dynamically
      let script = document.querySelector('script[src*="tapsell-web-sdk.js"]') as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.src = '/tapsell-web-sdk.js';
        script.async = true;
        document.head.appendChild(script);
      }

      const handleReady = () => {
        const readySdk = window.tapsell || window.Tapsell || window.tapsellPlus;
        if (readySdk && typeof readySdk.init === 'function') {
          readySdk.init({ appKey: TAPSELL_CONFIG.appKey });
          if (typeof readySdk.setZone === 'function') {
            readySdk.setZone('banner', TAPSELL_CONFIG.zones.standardBanner);
            readySdk.setZone('interstitial', TAPSELL_CONFIG.zones.interstitialVideo);
            readySdk.setZone('rewarded', TAPSELL_CONFIG.zones.rewardedVideo);
          }
          setIsInitialized(true);
          setIsLoading(false);
        }
      };

      if ((window as any).tapsell) {
        handleReady();
      } else {
        window.addEventListener('tapsell_sdk_ready', handleReady, { once: true });
        script.onload = handleReady;
        script.onerror = () => {
          console.warn('[useTapsell] Failed to load remote Tapsell script, using local fallback.');
          setIsInitialized(true);
          setIsLoading(false);
        };
      }
    } catch (err: any) {
      console.error('[useTapsell] Initialization error:', err);
      setError(err?.message || 'خطا در راه‌اندازی SDK تپسل');
      setIsLoading(false);
      // Fallback is still initialized
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (!initAttemptedRef.current) {
      initAttemptedRef.current = true;
      initializeTapsell();
    }
  }, [initializeTapsell]);

  // Request Banner Ad with standard zone
  const requestBannerAd = useCallback(
    async (containerId = 'tapsell-banner-container', customZoneId?: string) => {
      const zoneId = customZoneId || TAPSELL_CONFIG.zones.standardBanner;
      const sdk = window.tapsell || window.Tapsell;

      return new Promise((resolve) => {
        if (sdk && typeof sdk.requestBanner === 'function') {
          sdk.requestBanner(zoneId, containerId, {
            onAdAvailable: (adId: string, adObj: any) => {
              incrementBannerImpressions();
              setStats(getTapsellDetailedStats());
              setCurrentBannerAd(adObj);
              resolve({ success: true, adId, adObj });
            },
            onError: () => {
              incrementBannerImpressions();
              setStats(getTapsellDetailedStats());
              resolve({ success: true, isFallback: true });
            },
          });
        } else {
          incrementBannerImpressions();
          setStats(getTapsellDetailedStats());
          resolve({ success: true, isFallback: true });
        }
      });
    },
    []
  );

  // Request Interstitial Ad with interstitial zone
  const requestInterstitialAd = useCallback(
    async (customZoneId?: string) => {
      const zoneId = customZoneId || TAPSELL_CONFIG.zones.interstitialVideo;
      const sdk = window.tapsell || window.Tapsell;

      return new Promise((resolve) => {
        if (sdk && typeof sdk.requestAd === 'function') {
          sdk.requestAd(zoneId, 'interstitial', {
            onAdAvailable: (adId: string, adObj: any) => {
              setCurrentInterstitialAd(adObj);
              resolve({ success: true, adId, adObj });
            },
            onError: (err: any) => {
              resolve({ success: false, error: err });
            },
          });
        } else {
          resolve({ success: true, isFallback: true });
        }
      });
    },
    []
  );

  // Trigger Interstitial display
  const showInterstitialAd = useCallback(
    async (customZoneId?: string) => {
      const zoneId = customZoneId || TAPSELL_CONFIG.zones.interstitialVideo;
      incrementInterstitialImpressions();
      setStats(getTapsellDetailedStats());
      return { success: true, zoneId };
    },
    []
  );

  // Request Rewarded Video with rewarded zone
  const requestRewardedVideoAd = useCallback(
    async (customZoneId?: string) => {
      const zoneId = customZoneId || TAPSELL_CONFIG.zones.rewardedVideo;
      const result = await fetchLiveTapsellAd();
      setCurrentRewardedAd(result);
      return result;
    },
    []
  );

  // Trigger Rewarded Video display
  const showRewardedVideoAd = useCallback(
    async (onRewarded: (amount: number) => void, rewardAmount = 100) => {
      incrementRewardedImpressions();
      setStats(getTapsellDetailedStats());
      onRewarded(rewardAmount);
    },
    []
  );

  return {
    isInitialized,
    isLoading,
    error,
    appKey: TAPSELL_CONFIG.appKey,
    packageName: TAPSELL_CONFIG.packageName,
    appName: TAPSELL_CONFIG.appName,
    zones: TAPSELL_CONFIG.zones,
    stats,
    currentBannerAd,
    currentInterstitialAd,
    currentRewardedAd,
    initializeTapsell,
    requestBannerAd,
    requestInterstitialAd,
    showInterstitialAd,
    requestRewardedVideoAd,
    showRewardedVideoAd,
  };
}
