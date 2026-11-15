import React, { useEffect, useRef, useState } from 'react';
import { Award, Coins, LoaderCircle, Play, Video, X } from 'lucide-react';
import { androidAds, AdState } from '../utils/androidAds';
import { TAPSELL_CONFIG } from '../utils/tapsellService';

interface Props {
  isOpen: boolean;
  rewardAmount?: number;
  onRewardGranted: (amount: number) => void;
  onClose: () => void;
}

const DEMO_WATCH_MS = 6000;

export const RewardedAdModal: React.FC<Props> = ({ isOpen, rewardAmount = 100, onRewardGranted, onClose }) => {
  const [state, setState] = useState<AdState | 'demo'>('idle');
  const [msg, setMsg] = useState('');
  const [demoLeft, setDemoLeft] = useState(0);
  const id = useRef('');
  const rewarded = useRef(false);
  const demoInterval = useRef<any>(null);

  const clearDemo = () => {
    if (demoInterval.current) {
      clearInterval(demoInterval.current);
      demoInterval.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      clearDemo();
      setState('idle');
      setMsg('');
      setDemoLeft(0);
      id.current = '';
      rewarded.current = false;
      return;
    }

    // Native Android ads (inside the APK)
    if (androidAds.isAvailable()) {
      if (!TAPSELL_CONFIG.zones.rewardedVideo) {
        setState('unavailable');
        setMsg('شناسه تبلیغ‌گاه Mediation جایزه‌ای تنظیم نشده است');
        return;
      }
      setState('loading');
      setMsg('در حال آماده‌سازی تبلیغ واقعی…');
      androidAds
        .request('rewarded', TAPSELL_CONFIG.zones.rewardedVideo)
        .then((event) => {
          id.current = event.requestId;
          setState('ready');
          setMsg('تبلیغ آماده نمایش است');
        })
        .catch((error) => {
          setState('error');
          setMsg(error.message || 'خطا در بارگذاری تبلیغ');
        });
      return;
    }

    // Fallback: preview/demo ad for web browsers (no native bridge)
    setState('demo');
    setMsg('در نسخه پیش‌نمایش وب، تبلیغ واقعی در دسترس نیست. برای تست، یک تبلیغ شبیه‌سازی‌شده مشاهده کنید.');
  }, [isOpen]);

  useEffect(() => {
    const unsub = androidAds.subscribe((event) => {
      if (event.requestId !== id.current || event.format !== 'rewarded') return;
      setState(event.state);
      if (event.event === 'reward_earned' && !rewarded.current) {
        rewarded.current = true;
        onRewardGranted(rewardAmount);
        setMsg(`جایزه ${rewardAmount} سکه‌ای ثبت شد`);
      } else if (event.event === 'ad_closed' && !rewarded.current) {
        setMsg('تبلیغ بدون دریافت جایزه بسته شد');
      } else if (event.message) {
        setMsg(event.message);
      }
    });
    return unsub;
  }, [onRewardGranted, rewardAmount]);

  const startDemo = () => {
    setDemoLeft(DEMO_WATCH_MS / 1000);
    setState('showing');
    setMsg('در حال پخش تبلیغ شبیه‌سازی‌شده…');
    demoInterval.current = setInterval(() => {
      setDemoLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearDemo();
          if (!rewarded.current) {
            rewarded.current = true;
            setState('idle');
            setMsg(`جایزه ${rewardAmount} سکه‌ای ثبت شد`);
            onRewardGranted(rewardAmount);
          }
          return 0;
        }
        return next;
      });
    }, 1000);
  };

  const show = () => {
    if (state === 'demo') {
      startDemo();
      return;
    }
    if (state !== 'ready' || !id.current) return;
    setState('showing');
    androidAds.show('rewarded', id.current).catch((error) => {
      setState('error');
      setMsg(error.message);
    });
  };

  if (!isOpen) return null;

  const isBusy = state === 'loading' || state === 'showing';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90" dir="rtl">
      <div className="w-full max-w-sm rounded-3xl border border-amber-500/60 bg-stone-950 p-6 text-center">
        <div className="flex justify-between mb-6 items-center">
          <b className="text-amber-100">ویدئوی جایزه‌ای</b>
          <button onClick={onClose} className="text-amber-400 hover:text-amber-200 cursor-pointer" aria-label="بستن">
            <X className="w-5 h-5" />
          </button>
        </div>

        <Award className="w-16 h-16 mx-auto text-yellow-400" />

        <p className="min-h-12 my-4 text-sm text-stone-300 leading-relaxed">{msg}</p>
        <p className="flex justify-center gap-2 text-yellow-300 text-sm">
          <Coins /> پاداش: {rewardAmount} سکه
        </p>

        {state === 'showing' && demoLeft > 0 && (
          <div className="my-3 text-center">
            <div className="w-full bg-stone-800 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-amber-600 transition-all"
                style={{ width: `${(demoLeft / (DEMO_WATCH_MS / 1000)) * 100}%` }}
              />
            </div>
            <span className="text-xs text-amber-300">{demoLeft} ثانیه</span>
          </div>
        )}

        <button
          disabled={!['ready', 'demo'].includes(state) || isBusy}
          onClick={show}
          className="w-full mt-4 py-3 rounded-xl bg-amber-600 disabled:bg-stone-700 flex justify-center gap-2 text-white font-bold cursor-pointer"
        >
          {isBusy ? <LoaderCircle className="animate-spin" /> : state === 'demo' ? <Video /> : <Play />}
          {state === 'ready' ? 'نمایش تبلیغ' : state === 'demo' ? 'مشاهده تبلیغ (پیش‌نمایش)' : 'تبلیغ آماده نیست'}
        </button>

        <small className="block mt-4 text-stone-500">
          {state === 'demo'
            ? 'در نسخه اندروید، تبلیغ واقعی تپسل نمایش داده می‌شود.'
            : 'جایزه فقط با callback معتبر SDK داده می‌شود.'}
        </small>
      </div>
    </div>
  );
};
