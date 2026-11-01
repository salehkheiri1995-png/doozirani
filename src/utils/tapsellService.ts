const defaultZones={
 rewardedVideo:'6ae359267ae48b79af14cf0d',
 standardBanner:'6ae1bdbd35198b5ded9c8803',
 interstitialVideo:''
};

export const TAPSELL_CONFIG={
 packageName:'doozz.tapcell',
 appName:'دوز اصیل ایرانی',
 zones:{
  rewardedVideo:import.meta.env.VITE_TAPSELL_REWARDED_ZONE_ID||defaultZones.rewardedVideo,
  standardBanner:import.meta.env.VITE_TAPSELL_BANNER_ZONE_ID||defaultZones.standardBanner,
  interstitialVideo:import.meta.env.VITE_TAPSELL_INTERSTITIAL_ZONE_ID||defaultZones.interstitialVideo
 }
} as const;

export function getTapsellDetailedStats(){return{source:'device-local-non-financial' as const,officialRevenue:null};}
export function getTapsellImpressions():null{return null;}
