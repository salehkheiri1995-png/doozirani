import React, { useEffect, useState } from 'react';
import { androidAds } from '../utils/androidAds';
import { TAPSELL_CONFIG } from '../utils/tapsellService';

/**
 * Passive banner. It grants nothing and can fail silently without blocking play.
 */
export const TapsellBanner: React.FC = () => {
  const [message, setMessage] = useState('');

  useEffect(() => {
    const zoneId = TAPSELL_CONFIG.zones.standardBanner;
    if (!androidAds.isAvailable()) {
      setMessage('بنر تبلیغاتی فقط در نسخه اندروید نمایش داده می‌شود.');
      return;
    }
    if (!zoneId) {
      setMessage('شناسه تبلیغ‌گاه بنر تنظیم نشده است.');
      return;
    }
    const session = androidAds.request('banner', zoneId);
    if (!session) {
      setMessage('بنر تبلیغاتی در دسترس نیست.');
      return;
    }
    const unsubscribe = session.onEvent((event) => {
      if (event.event === 'ad_load_failed' || event.event === 'ad_show_failed') {
        setMessage(event.message || 'بنر تبلیغاتی بارگذاری نشد.');
      }
    });
    session.loaded.catch((error: Error) => setMessage(error.message));
    return () => {
      unsubscribe();
      session.dispose();
    };
  }, []);

  return message ? (
    <div className="text-center text-[10px] text-stone-500 py-1" aria-live="polite">
      {message}
    </div>
  ) : null;
};
