export const TAPSELL_CONFIG = {
  packageName: 'dooz.tapcell',
  appName: 'دوز اصیل ایرانی',
  zones: {
    rewardedVideo: import.meta.env.VITE_TAPSELL_REWARDED_ZONE_ID || '',
    standardBanner: import.meta.env.VITE_TAPSELL_BANNER_ZONE_ID || '',
    interstitialVideo: import.meta.env.VITE_TAPSELL_INTERSTITIAL_ZONE_ID || '',
  },
} as const;
