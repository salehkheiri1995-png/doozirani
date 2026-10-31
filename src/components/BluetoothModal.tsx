import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bluetooth,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  Settings,
  Smartphone,
  Unplug,
  X,
} from 'lucide-react';
import {
  directMultiplayer,
  type MultiplayerState,
  type RemoteDevice,
} from '../utils/directMultiplayer';
import type { MatchVariant } from '../game/match';
import type { SessionInfo } from '../multiplayer/protocol';

interface BluetoothModalProps {
  isOpen: boolean;
  variant: MatchVariant;
  identity: { displayName: string; stoneSkinId: string; profileFrameId: string };
  onReady: (session: SessionInfo) => void;
  onClose: () => void;
}

const PHASE_LABEL: Record<MultiplayerState['phase'], string> = {
  unsupported: 'پشتیبانی نمی‌شود',
  permission_required: 'مجوز لازم است',
  bluetooth_disabled: 'بلوتوث خاموش است',
  idle: 'آماده',
  hosting: 'در حال میزبانی',
  connecting: 'در حال اتصال',
  handshaking: 'در حال هماهنگی',
  ready: 'متصل و آماده',
  disconnected: 'قطع‌شده',
  error: 'خطا',
};

export const BluetoothModal: React.FC<BluetoothModalProps> = ({
  isOpen,
  variant,
  identity,
  onReady,
  onClose,
}) => {
  const [state, setState] = useState<MultiplayerState>(directMultiplayer.getState());
  const [devices, setDevices] = useState<RemoteDevice[]>([]);
  const [busy, setBusy] = useState(false);
  const readyRef = useRef(false);

  useEffect(() => {
    directMultiplayer.init();
    const unsubscribe = directMultiplayer.subscribeState((next) => setState(next));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      readyRef.current = false;
      return;
    }
    directMultiplayer.setIdentity(identity);
    void directMultiplayer.refreshStatus().then(() => {
      setDevices(directMultiplayer.loadPairedDevices());
    });
    // The identity values are part of the dependency list on purpose: equipping
    // a new skin while the panel is open must update the next handshake.
  }, [isOpen, identity.displayName, identity.stoneSkinId, identity.profileFrameId]);

  useEffect(() => {
    if (!isOpen || state.phase !== 'ready' || readyRef.current) return;
    const session = directMultiplayer.getSession();
    if (!session) return;
    readyRef.current = true;
    onReady(session);
  }, [isOpen, state.phase, onReady]);

  if (!isOpen) return null;

  const native = directMultiplayer.isNativeAvailable();
  const canStart = native && state.phase !== 'hosting' && state.phase !== 'ready';
  const showPermission = state.phase === 'permission_required';

  const handleHost = async () => {
    setBusy(true);
    try {
      await directMultiplayer.startHost({ variant, identity });
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (device: RemoteDevice) => {
    setBusy(true);
    try {
      await directMultiplayer.joinDevice(device.address, { variant, identity });
    } finally {
      setBusy(false);
    }
  };

  const refreshDevices = () => {
    setDevices(directMultiplayer.loadPairedDevices());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md select-none">
      <div className="w-full max-w-md bg-[#12100d] border-2 border-blue-700/70 rounded-3xl p-4 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-blue-900/60">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-blue-900/50 border border-blue-500/50 flex items-center justify-center">
              <Bluetooth className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-base font-black text-blue-100">اتصال دو گوشی با بلوتوث</h2>
              <span className="text-[10px] text-blue-300/70">آفلاین و مستقیم؛ بدون اینترنت</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="p-1.5 rounded-xl text-blue-300 hover:bg-blue-950/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-3 pt-3 pr-1">
          <div
            className={`p-3 rounded-2xl border-2 flex items-center justify-between ${
              state.phase === 'ready'
                ? 'bg-emerald-950/60 border-emerald-500/50'
                : state.phase === 'error' || state.phase === 'disconnected'
                  ? 'bg-rose-950/50 border-rose-600/50'
                  : 'bg-blue-950/40 border-blue-700/40'
            }`}
          >
            <div className="flex items-center gap-2">
              {state.phase === 'ready' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : state.phase === 'hosting' || state.phase === 'connecting' || state.phase === 'handshaking' ? (
                <LoaderCircle className="w-5 h-5 text-blue-300 animate-spin" />
              ) : (
                <Smartphone className="w-5 h-5 text-blue-300" />
              )}
              <div>
                <span className="text-xs font-black text-blue-50 block">{PHASE_LABEL[state.phase]}</span>
                <span className="text-[10px] text-blue-200/70 block">{state.statusText}</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-blue-200/70">
              {state.isHost ? 'میزبان' : state.role === 'guest' ? 'مهمان' : ''}
            </span>
          </div>

          {!native && (
            <div className="p-3 rounded-2xl bg-amber-950/60 border border-amber-600/50 text-[11px] text-amber-200 leading-5">
              این قابلیت فقط داخل نسخه اندروید فعال است. در مرورگر وب، بلوتوث کلاسیک دو گوشی
              در دسترس نیست و اتصال شبیه‌سازی نمی‌شود.
            </div>
          )}

          {showPermission && (
            <button
              type="button"
              onClick={() => directMultiplayer.requestPermission()}
              className="w-full py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black cursor-pointer flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4" />
              تأیید مجوز «دستگاه‌های نزدیک»
            </button>
          )}

          {state.phase === 'bluetooth_disabled' && (
            <button
              type="button"
              onClick={() => directMultiplayer.requestEnableBluetooth()}
              className="w-full py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black cursor-pointer flex items-center justify-center gap-2"
            >
              <Bluetooth className="w-4 h-4" />
              روشن‌کردن بلوتوث
            </button>
          )}

          {state.error && (
            <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-600/50 text-[11px] text-rose-100 leading-5 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{state.error}</span>
            </div>
          )}

          <div className="p-3 rounded-2xl bg-stone-900/80 border border-stone-700/60">
            <span className="text-xs font-black text-amber-100 block mb-1">پیش‌نیاز مهم</span>
            <p className="text-[11px] text-stone-300 leading-5">
              این نسخه فقط دستگاه‌های <b>جفت‌شده</b> را نشان می‌دهد. ابتدا هر دو گوشی را از تنظیمات
              اندروید، بخش بلوتوث، به هم جفت (Pair) کنید. سپس یک گوشی «میزبان» و گوشی دیگر از
              فهرست پایین «مهمان» شود. هر دو گوشی باید همان نوع دوز را انتخاب کرده باشند.
            </p>
          </div>

          <button
            type="button"
            onClick={handleHost}
            disabled={!canStart || busy || !native}
            className={`w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
              canStart && native && !busy
                ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-500 active:scale-[0.98] cursor-pointer'
                : 'bg-stone-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            {busy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Bluetooth className="w-4 h-4" />}
            میزبانی این گوشی
          </button>

          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-blue-200">گوشی‌های جفت‌شده</span>
            <button
              type="button"
              onClick={refreshDevices}
              className="flex items-center gap-1 text-[10px] font-bold text-blue-300 hover:text-blue-100 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              به‌روزرسانی فهرست
            </button>
          </div>

          {devices.length === 0 ? (
            <div className="p-3 rounded-2xl bg-stone-900/60 border border-dashed border-stone-700 text-center text-[11px] text-stone-400">
              گوشی جفت‌شده‌ای پیدا نشد. ابتدا از تنظیمات بلوتوث اندروید دو گوشی را جفت کنید، سپس
              این فهرست را به‌روزرسانی کنید.
            </div>
          ) : (
            <div className="space-y-2">
              {devices.map((device) => (
                <button
                  key={device.address}
                  type="button"
                  onClick={() => handleJoin(device)}
                  disabled={busy || state.phase === 'ready'}
                  className="w-full p-3 rounded-2xl bg-stone-900/80 border border-blue-800/60 hover:border-blue-500 text-right flex items-center justify-between disabled:opacity-50 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-blue-300" />
                    <div>
                      <span className="text-xs font-bold text-blue-50 block">{device.name}</span>
                      <span className="text-[10px] text-stone-400">{device.address}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-blue-300 font-bold">اتصال به‌عنوان مهمان</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-blue-900/60 flex gap-2">
          {(state.phase === 'ready' || state.phase === 'hosting' || state.phase === 'connecting' || state.phase === 'handshaking') && (
            <button
              type="button"
              onClick={() => directMultiplayer.disconnect()}
              className="flex-1 py-2.5 rounded-2xl bg-rose-900/60 border border-rose-600/50 text-rose-100 text-xs font-black hover:bg-rose-800/70 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Unplug className="w-4 h-4" />
              قطع اتصال
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl bg-stone-800 text-stone-300 text-xs font-bold hover:bg-stone-700 cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
