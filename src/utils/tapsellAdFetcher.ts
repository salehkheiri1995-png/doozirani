/**
 * Dynamic Ad Campaign Rotation and Live Tapsell Network Fetcher
 * Rotates between distinct Iranian brand sponsors (Snapp, Digikala, Cafe Bazaar, Tapsell Pro)
 * and dynamically streams live ads when provided by Tapsell's ad server.
 */

import { TAPSELL_CONFIG, incrementTapsellImpressions } from './tapsellService';

export interface AdCampaign {
  id: string;
  brandName: string;
  brandEn: string;
  badge: string;
  title: string;
  subtitle: string;
  videoUrl: string;
  accentColor: string;
  ctaText: string;
  durationSeconds: number;
}

export const CAMPAIGN_POOL: AdCampaign[] = [
  {
    id: 'snapp_superapp',
    brandName: 'اسنپ (Snapp)',
    brandEn: 'SNAPP SUPER APP',
    badge: 'اسپانسر رسمی تپسل',
    title: 'تخفیف ویژه سفر و سوپرمارکت اسنپ',
    subtitle: 'کد تخفیف اختصاصی: DOOZ2026',
    videoUrl: '/ad_snapp.mp4',
    accentColor: '#10b981', // Emerald
    ctaText: 'نصب و دریافت تخفیف',
    durationSeconds: 7,
  },
  {
    id: 'digikala_offers',
    brandName: 'دیجی‌کالا (Digikala)',
    brandEn: 'DIGIKALA DEALS',
    badge: 'پیشنهاد شگفت‌انگیز تپسل',
    title: 'حراج ۵۰٪ برترین کالاهای دیجیتال',
    subtitle: 'ارسال رایگان برای اولین خرید',
    videoUrl: '/ad_digikala.mp4',
    accentColor: '#f43f5e', // Rose
    ctaText: 'مشاهده تخفیف‌ها',
    durationSeconds: 7,
  },
  {
    id: 'bazaar_games',
    brandName: 'کافه‌بازار (Cafe Bazaar)',
    brandEn: 'CAFE BAZAAR',
    badge: 'لیگ بازی‌های برتر ایران',
    title: 'جشنواره طلایی بازی‌های تخته‌ای بازار',
    subtitle: 'مسابقه هفتگی و جوایز میلیونی',
    videoUrl: '/ad_bazaar.mp4',
    accentColor: '#14b8a6', // Teal
    ctaText: 'دانلود از بازار',
    durationSeconds: 7,
  },
  {
    id: 'tapsell_tournament',
    brandName: 'جام قهرمانی دوز (تپسل)',
    brandEn: 'TAPSELL DOOZ CUP',
    badge: 'شبکه تبلیغات هوشمند تپسل',
    title: 'مسابقات بزرگ دوز اصیل ایرانی',
    subtitle: 'تبلیغگاه s01: 6ae1bd1817758066a4da86c1',
    videoUrl: '/ad_tapsell_pro.mp4',
    accentColor: '#f59e0b', // Amber
    ctaText: 'ثبت در قرعه‌کشی',
    durationSeconds: 7,
  },
  {
    id: 'tapsell_showcase',
    brandName: 'تیزر تجاری تپسل',
    brandEn: 'TAPSELL SHOWCASE',
    badge: 'اسپانسر شبکه تبلیغاتی',
    title: 'حامی رسمی توسعه‌دهندگان بازی‌های ایرانی',
    subtitle: 'درآمد پایدار برای بازی‌سازان',
    videoUrl: '/tapsell_ad.mp4',
    accentColor: '#38bdf8', // Sky
    ctaText: 'اطلاعات بیشتر',
    durationSeconds: 9,
  },
];

const LAST_CAMPAIGN_INDEX_KEY = 'dooz_tapsell_ad_rotation_index';

/**
 * Returns the next ad campaign in rotation to ensure variety on every watch
 */
export function getNextAdCampaign(): AdCampaign {
  if (typeof window === 'undefined') return CAMPAIGN_POOL[0];

  const rawIdx = localStorage.getItem(LAST_CAMPAIGN_INDEX_KEY);
  const currentIdx = rawIdx ? parseInt(rawIdx, 10) || 0 : 0;
  const nextIdx = (currentIdx + 1) % CAMPAIGN_POOL.length;

  localStorage.setItem(LAST_CAMPAIGN_INDEX_KEY, nextIdx.toString());
  return CAMPAIGN_POOL[nextIdx];
}

/**
 * Attempts to fetch a live external video ad from Tapsell servers if available
 */
export async function fetchLiveTapsellAd(): Promise<{
  campaign: AdCampaign;
  isOnlineStream: boolean;
}> {
  // Rotate to the next creative
  const campaign = getNextAdCampaign();

  try {
    // Attempt pinging Tapsell suggestions API
    const res = await fetch(`https://api.tapsell.ir/v2/sdks/config?secretKey=${TAPSELL_CONFIG.appKey}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.videoUrl) {
        return {
          campaign: {
            ...campaign,
            videoUrl: data.videoUrl,
          },
          isOnlineStream: true,
        };
      }
    }
  } catch {
    // Fallback smoothly to rotating campaign pool
  }

  return {
    campaign,
    isOnlineStream: false,
  };
}
