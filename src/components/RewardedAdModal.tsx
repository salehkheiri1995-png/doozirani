import React, { useEffect, useRef, useState } from 'react';
import { Award, Coins, LoaderCircle, Play, Video, X } from 'lucide-react';
import { androidAds, AdState } from '../utils/androidAds';
import { TAPSELL_CONFIG } from '../utils/tapsellService';
import {
  REWARDED_AMOUNT,
  REWARDED_COOLDOWN_MS,
  canWatchRewarded,
  registerRewarded,
  rewardedAdsLeft,
} from '../utils/monetization';
import { toFa } from '../utils/format';

interface Props {
  isOpen: boolean;
  rewardAmount?: number;
  onRewardGranted: (amount: number) => void;
  onClose: () => void;
}

const DEMO_WATCH_MS = 6000;

export const RewardedAdModal: React.FC<Props> = ({
  isOpen,
  rewardAmount = REWARDED_AMOUNT,
  onRewardGranted,
  onClose,
}) => {
  const [state, setState] = useState<AdState | 'demo' | 'blocked'>('idle');
  const [msg, setMsg] = useState('');
  const [demoLeft, setDemoLeft] = useState(0);
  const [left, setLeft] = useState(0);
  const id = useRef('');
  const rewarded = useRef(false);
  const demoInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDemoRef = useRef(false);

  const clearDemo = () => {
    if (demoInterval.current) {
      clearInterval(demoInterval.current);
      demoInterval.current = null;
    }
  };

  const grant = () => {
    if (rewarded.current) return;
    rewarded.current = true;
    registerRewarded(isDemoRef.current);
    setLeft(rewardedAdsLeft(isDemoRef.current));
    onRewardGranted(rewardAmount);
    setState('idle');
    setMsg(`جایزه ${toFa(rewardAmount)} سکه ثبت شد`);
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

    // مسیر اپ اندروید (تپسل)
    if (androidAds.isAvailable()) {
      isDemoRef.current = false;
      const policy = canWatchRewarded(false);
      setLeft(policy.left);
      if (!policy.allowed) {
        setState('blocked');
        setMsg(policy.reason ?? 'در حال حاضر امکان نمایش تبلیغ نیست');
        return;
      }
      if (!TAPSELL_CONFIG.zones.rewardedVideo) {
        setState('blocked');
        setMsg('تبلیغ جایزه‌ای در این نسخه تنظیم نشده است. از جایزهٔ روزانه استفاده کنید.');
        return;
      }
      setState('loading');
      setMsg('در حال آماده‌سازی تبلیغ…');
      androidAds
        .request('rewarded', TAPSELL_CONFIG.zones.rewardedVideo)
        .then((event) => {
          id.current = event.requestId;
          setState('ready');
          setMsg('تبلیغ آماده نمایش است');
        })
        .catch((error) => {
          setState('error');
          setMsg(error?.message || 'فعلاً تبلیغی موجود نیست');
        });
      return;
    }

    // پیش‌نمایش وب
    isDemoRef.current = true;
    const policy = canWatchRewarded(true);
    setLeft(policy.left);
    if (!policy.allowed) {
      setState('blocked');
      setMsg(policy.reason ?? 'سقف تبلیغ پیش‌نمایش امروز تمام شد');
      return;
    }
    setState('demo');
    setMsg('در نسخهٔ پیش‌نمایش وب، تبلیغ واقعی پخش نمی‌شود؛ یک تبلیغ شبیه‌سازی‌شده می‌بینید.');
  }, [isOpen]);

  useEffect(() => {
    const unsub = androidAds.subscribe((event) => {
      if (event.requestId !== id.current || event.format !== 'rewarded') return;
      if (event.event === 'reward_earned') {
        grant();
      } else if (event.event === 'ad_closed') {
        setState(rewarded.current ? 'idle' : 'ready');
        if (!rewarded.current) setMsg('تبلیغ بدون دریافت جایزه بسته شد');
      } else if (event.event === 'ad_show_failed' || event.event === 'ad_load_failed') {
        setState('error');
        setMsg(event.message || 'فعلاً تبلیغی موجود نیست');
      } else {
        setState(event.state);
        if (event.message) setMsg(event.message);
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
          grant();
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
      setMsg(error?.message || 'نمایش تبلیغ ناموفق بود');
    });
  };

  if (!isOpen) return null;

  const isBusy = state === 'loading' || state === 'showing';
  const cooldown = Math.ceil(REWARDED_COOLDOWN_MS / 1000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90" dir="rtl">
      <div className="w-full max-w-sm rounded-3xl border border-amber-500/60 bg-stone-950 p-6 text-center">
        <div className="flex justify-between mb-5 items-center">
          <b className="text-amber-100">ویدئوی جایزه‌ای</b>
          <button onClick={onClose} className="text-amber-400 hover:text-amber-200 cursor-pointer p-1" aria-label="بستن">
            <X className="w-5 h-5" />
          </button>
        </div>

        <Award className="w-14 h-14 mx-auto text-yellow-400" />

        <p className="min-h-12 my-4 text-sm text-stone-300 leading-relaxed">{msg}</p>

        <p className="flex justify-center gap-2 text-yellow-300 text-sm items-center">
          <Coins className="w-4 h-4" /> پاداش: {toFa(rewardAmount)} سکه
        </p>

        <p className="mt-1 text-[11px] text-stone-500">
          باقی‌ماندهٔ امروز: {toFa(left)} تبلیغ · فاصلهٔ بین دو تبلیغ: {toFa(cooldown)} ثانیه
        </p>

        {state === 'showing' && demoLeft > 0 && (
          <div className="my-3 text-center">
            <div className="w-full bg-stone-800 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-amber-600 transition-all"
                style={{ width: `${(demoLeft / (DEMO_WATCH_MS / 1000)) * 100}%` }}
              />
            </div>
            <span className="text-xs text-amber-300">{toFa(demoLeft)} ثانیه</span>
          </div>
        )}

        <button
          disabled={!['ready', 'demo'].includes(state) || isBusy}
          onClick={show}
          className="w-full mt-4 py-3 rounded-xl bg-amber-600 disabled:bg-stone-800 disabled:text-stone-500 flex justify-center items-center gap-2 text-white font-bold cursor-pointer disabled:cursor-not-allowed"
        >
          {isBusy ? (
            <LoaderCircle className="w-4 h-4 animate-spin" />
          ) : state === 'demo' ? (
            <Video className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {state === 'ready'
            ? 'نمایش تبلیغ'
            : state === 'demo'
              ? 'مشاهدهٔ تبلیغ (پیش‌نمایش)'
              : isBusy
                ? 'در حال اجرا…'
                : 'تبلیغ در دسترس نیست'}
        </button>

        <small className="block mt-4 text-stone-500 leading-relaxed text-[11px]">
          سکه فقط پس از تأیید تبلیغ اضافه می‌شود. در اپ اندروید، تبلیغ از سرویس تپسل پخش می‌شود.
        </small>
      </div>
    </div>
  );
};
