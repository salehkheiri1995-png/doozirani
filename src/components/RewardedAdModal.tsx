import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Award, Coins, LoaderCircle, Play, X } from 'lucide-react';
import { androidAds, type AdPhase, type AdSession } from '../utils/androidAds';
import { TAPSELL_CONFIG } from '../utils/tapsellService';

interface RewardedAdModalProps {
  isOpen: boolean;
  /** Displayed amount. The actual credit is decided by the economy store. */
  rewardAmount: number;
  /**
   * Called once, only after the official SDK `reward_earned` callback.
   * Returns true when the economy accepted the reward.
   */
  onRewardGranted: () => boolean;
  onClose: () => void;
}

const STATE_TEXT: Partial<Record<AdPhase, string>> = {
  idle: 'در حال آماده‌سازی…',
  loading: 'در حال دریافت تبلیغ از تپسل…',
  ready: 'تبلیغ آماده نمایش است.',
  showing: 'تبلیغ در حال پخش است…',
  closed: 'تبلیغ بسته شد.',
  rewarded: 'جایزه با تأیید رسمی SDK ثبت شد.',
  error: 'نمایش تبلیغ انجام نشد.',
  unavailable: 'تبلیغات در این محیط در دسترس نیست.',
};

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  isOpen,
  rewardAmount,
  onRewardGranted,
  onClose,
}) => {
  const [phase, setPhase] = useState<AdPhase>('idle');
  const [message, setMessage] = useState('');
  const sessionRef = useRef<AdSession | null>(null);
  const rewardHandledRef = useRef(false);
  const mountedRef = useRef(true);
  const rewardCallbackRef = useRef(onRewardGranted);
  rewardCallbackRef.current = onRewardGranted;

  const closeSession = useCallback(() => {
    sessionRef.current?.dispose();
    sessionRef.current = null;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      closeSession();
    };
  }, [closeSession]);

  useEffect(() => {
    if (!isOpen) {
      closeSession();
      setPhase('idle');
      setMessage('');
      rewardHandledRef.current = false;
      return;
    }

    rewardHandledRef.current = false;
    setMessage('');

    if (!androidAds.isAvailable()) {
      setPhase('unavailable');
      setMessage('تبلیغات جایزه‌ای فقط در نسخه اندروید با SDK رسمی فعال است.');
      return;
    }
    if (!TAPSELL_CONFIG.zones.rewardedVideo) {
      setPhase('unavailable');
      setMessage('شناسه تبلیغ‌گاه جایزه‌ای تنظیم نشده است؛ تا زمان تنظیم، سکه‌ای هم داده نمی‌شود.');
      return;
    }

    const session = androidAds.request('rewarded', TAPSELL_CONFIG.zones.rewardedVideo);
    if (!session) {
      setPhase('unavailable');
      setMessage('درخواست تبلیغ آغاز نشد.');
      return;
    }
    sessionRef.current = session;
    setPhase('loading');
    setMessage(STATE_TEXT.loading || '');

    const grantRewardOnce = (): void => {
      if (rewardHandledRef.current) return;
      rewardHandledRef.current = true;
      let accepted = false;
      try {
        accepted = rewardCallbackRef.current();
      } catch {
        accepted = false;
      }
      if (!mountedRef.current) return;
      if (accepted) {
        setPhase('rewarded');
        setMessage(`${rewardAmount} سکه پس از تأیید رسمی تبلیغ اضافه شد.`);
      } else {
        setPhase('closed');
        setMessage('تبلیغ تأیید شد اما سقف روزانه یا فاصله مجاز مانع ثبت جایزه شد.');
      }
    };

    const unsubscribe = session.onEvent((event) => {
      if (!mountedRef.current) return;
      if (event.event === 'ad_loaded') {
        setPhase('ready');
        setMessage(STATE_TEXT.ready || '');
      } else if (event.event === 'reward_earned') {
        // The only place that may grant coins: the official SDK callback.
        grantRewardOnce();
      } else if (event.event === 'ad_closed') {
        setPhase((previous) => (previous === 'rewarded' ? previous : 'closed'));
        if (!rewardHandledRef.current) {
          setMessage('تبلیغ بدون دریافت جایزه بسته شد؛ سکه‌ای اضافه نمی‌شود.');
        }
      } else if (event.event === 'ad_load_failed' || event.event === 'ad_show_failed') {
        setPhase('error');
        setMessage(event.message || 'تبلیغ در دسترس نیست.');
      }
    });

    session.loaded
      .then(() => {
        if (!mountedRef.current) return;
        setPhase((previous) => (previous === 'idle' || previous === 'loading' ? 'ready' : previous));
        setMessage(STATE_TEXT.ready || '');
      })
      .catch((error: Error) => {
        if (!mountedRef.current) return;
        setPhase('error');
        setMessage(error.message || 'دریافت تبلیغ ناموفق بود.');
      });

    return () => {
      unsubscribe();
      // If the user closes the modal before showing, release the request.
      // During `showing` the SDK owns the surface; disposal is delayed to unmount.
      if (sessionRef.current === session) {
        session.dispose();
        sessionRef.current = null;
      }
    };
  }, [isOpen, rewardAmount, closeSession]);

  const handleShow = () => {
    const session = sessionRef.current;
    if (!session || phase !== 'ready') return;
    setPhase('showing');
    setMessage(STATE_TEXT.showing || '');
    session
      .show()
      .then((outcome) => {
        if (!mountedRef.current) return;
        if (outcome.rewardEarned && !rewardHandledRef.current) {
          // Fallback for a dropped event listener; the flag still comes from
          // the native `reward_earned` callback, never from a timer.
          let accepted = false;
          try {
            accepted = rewardCallbackRef.current();
          } catch {
            accepted = false;
          }
          rewardHandledRef.current = true;
          setPhase(accepted ? 'rewarded' : 'closed');
          setMessage(
            accepted
              ? `${rewardAmount} سکه پس از تأیید رسمی تبلیغ اضافه شد.`
              : 'تبلیغ تأیید شد اما ثبت جایزه ممکن نبود.'
          );
          return;
        }
        setPhase((previous) => (previous === 'rewarded' ? previous : 'closed'));
        if (!rewardHandledRef.current) {
          setMessage('تبلیغ بدون دریافت جایزه بسته شد؛ سکه‌ای اضافه نمی‌شود.');
        }
      })
      .catch((error: Error) => {
        if (!mountedRef.current) return;
        setPhase('error');
        setMessage(error.message || 'نمایش تبلیغ ناموفق بود.');
      });
  };

  const handleClose = () => {
    if (phase === 'showing') return;
    closeSession();
    onClose();
  };

  if (!isOpen) return null;

  const canShow = phase === 'ready';
  const busy = phase === 'loading' || phase === 'showing';
  const isError = phase === 'error' || phase === 'unavailable';
  const isDone = phase === 'rewarded' || phase === 'closed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" dir="rtl">
      <div className="w-full max-w-sm rounded-3xl border-2 border-amber-500/60 bg-stone-950 p-5 text-center shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black text-amber-100">ویدئوی جایزه‌ای اختیاری</h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={phase === 'showing'}
            aria-label="بستن"
            className="p-1 rounded-lg text-amber-300 hover:bg-stone-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {phase === 'rewarded' ? (
          <Award className="w-16 h-16 mx-auto text-emerald-400" />
        ) : isError ? (
          <AlertTriangle className="w-16 h-16 mx-auto text-rose-400" />
        ) : (
          <Award className={`w-16 h-16 mx-auto text-yellow-400 ${busy ? 'animate-pulse' : ''}`} />
        )}

        <p className="min-h-12 my-4 text-xs text-stone-200 leading-6">
          {message || STATE_TEXT[phase] || 'در حال آماده‌سازی تبلیغ…'}
        </p>

        <p className="flex items-center justify-center gap-2 text-yellow-300 text-sm font-black">
          <Coins className="w-4 h-4" />
          پاداش: {rewardAmount} سکه
        </p>

        {!isDone && (
          <button
            type="button"
            disabled={!canShow}
            onClick={handleShow}
            className={`w-full mt-4 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
              canShow
                ? 'bg-gradient-to-r from-amber-500 to-amber-700 text-white hover:from-amber-400 cursor-pointer active:scale-[0.98]'
                : 'bg-stone-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            {busy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {phase === 'loading'
              ? 'در حال دریافت تبلیغ'
              : phase === 'showing'
                ? 'در حال پخش تبلیغ'
                : phase === 'ready'
                  ? 'نمایش تبلیغ'
                  : 'تبلیغ آماده نیست'}
          </button>
        )}

        {(isDone || isError) && (
          <button
            type="button"
            onClick={handleClose}
            className="w-full mt-4 py-3 rounded-2xl bg-stone-800 text-stone-200 font-black text-sm hover:bg-stone-700 cursor-pointer"
          >
            بستن
          </button>
        )}

        <small className="block mt-4 text-[10px] text-stone-500 leading-5">
          جایزه فقط پس از callback رسمی <span dir="ltr">reward_earned</span> از SDK تپسل ثبت می‌شود.
          بستن تبلیغ بدون این callback هیچ سکه‌ای نمی‌دهد.
        </small>
      </div>
    </div>
  );
};
