import React, { useEffect, useRef, useState } from 'react';
import { Bluetooth, Radio, CheckCircle2, AlertTriangle, X, RefreshCw, Smartphone, KeyRound, Play, Users, Info } from 'lucide-react';
import {
  directMultiplayer,
  MultiplayerState,
  ConnectionKind,
  isRoomServerAvailable,
} from '../utils/directMultiplayer';

interface BluetoothModalProps {
  isOpen: boolean;
  /** وقتی اتصال برقرار شد و کاربر «شروع بازی» را زد */
  onReady: (kind: ConnectionKind) => void;
  onClose: () => void;
}

export const BluetoothModal: React.FC<BluetoothModalProps> = ({ isOpen, onReady, onClose }) => {
  const [state, setState] = useState<MultiplayerState>(directMultiplayer.getState());
  const [activeTab, setActiveTab] = useState<'bluetooth' | 'room_code'>('bluetooth');
  const [inputCode, setInputCode] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const startedRef = useRef(false);

  const roomServerAvailable = isRoomServerAvailable();
  const nativeAvailable = directMultiplayer.isNativeAndroidBluetoothAvailable();

  // فقط وضعیت را دنبال می‌کنیم؛ شنوندهٔ پیام متعلق به App است و دست نمی‌خورد.
  useEffect(() => directMultiplayer.onState(setState), []);

  useEffect(() => {
    if (!isOpen) {
      startedRef.current = false;
      return;
    }
    if (nativeAvailable) {
      directMultiplayer.loadPairedDevices();
    }
    const preferred = nativeAvailable ? 'bluetooth' : roomServerAvailable ? 'room_code' : 'bluetooth';
    setActiveTab(preferred);
  }, [isOpen, nativeAvailable, roomServerAvailable]);

  useEffect(() => {
    const reload = () => {
      if (directMultiplayer.isNativeAndroidBluetoothAvailable()) {
        directMultiplayer.loadPairedDevices();
      }
    };
    window.addEventListener('doozBtPermissionGranted', reload);
    return () => window.removeEventListener('doozBtPermissionGranted', reload);
  }, []);

  if (!isOpen) return null;

  const handleCreateRoom = async () => {
    setIsCreatingRoom(true);
    await directMultiplayer.createWirelessRoom();
    setIsCreatingRoom(false);
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    setIsJoiningRoom(true);
    await directMultiplayer.joinWirelessRoom(inputCode.trim());
    setIsJoiningRoom(false);
  };

  const handleStart = () => {
    if (!state.isConnected || startedRef.current) return;
    startedRef.current = true;
    onReady(state.kind);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-[#161009] border-2 border-blue-500/70 rounded-3xl p-5 shadow-2xl text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-blue-900/50">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-blue-100">بازی دو نفره بین دو گوشی</h2>
              <span className="text-xs text-blue-300/80">هر بازیکن روی گوشی خودش بازی می‌کند</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن پنجره"
            className="p-2 rounded-xl text-blue-300 hover:bg-blue-950/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Method tabs */}
        <div className={`grid gap-2 mt-4 p-1 bg-black/50 rounded-2xl border border-blue-900/40 ${roomServerAvailable ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <button
            type="button"
            onClick={() => setActiveTab('bluetooth')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'bluetooth'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Bluetooth className="w-4 h-4" />
            <span>بلوتوث (بدون اینترنت)</span>
          </button>

          {roomServerAvailable && (
            <button
              type="button"
              onClick={() => setActiveTab('room_code')}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'room_code'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>کد اتاق</span>
            </button>
          )}
        </div>

        {/* Status */}
        <div className="mt-3.5 p-3 rounded-2xl bg-blue-950/40 border border-blue-800/40 flex items-center justify-between gap-2 text-xs">
          <span className="text-blue-200 shrink-0">وضعیت:</span>
          {state.isConnected ? (
            <span className="flex items-center gap-1.5 font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/50">
              <CheckCircle2 className="w-3.5 h-3.5" />
              متصل به {state.deviceName || 'گوشی حریف'}
            </span>
          ) : (
            <span className="text-amber-300 font-medium bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-500/40 text-center">
              {state.statusText}
            </span>
          )}
        </div>

        {state.isConnected && (
          <div className="mt-2 p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-700/50 text-xs text-emerald-200 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              شما با مهره‌های{' '}
              <strong>{directMultiplayer.getMySide() === 'player1' ? 'فیروزه‌ای' : 'عقیقی'}</strong>{' '}
              بازی می‌کنید. پس از شروع، هر کس فقط در نوبت خودش می‌تواند حرکت کند.
            </p>
          </div>
        )}

        {state.error && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-rose-950/70 border border-rose-800/60 flex items-start gap-2 text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">{state.error}</p>
          </div>
        )}

        {/* Bluetooth tab */}
        {activeTab === 'bluetooth' && (
          <div className="mt-4 space-y-3">
            {nativeAvailable ? (
              <>
                <div className="p-3 rounded-2xl bg-stone-900/60 border border-stone-800 text-xs text-stone-300 leading-relaxed space-y-1">
                  <p className="font-bold text-blue-300">اتصال مستقیم بلوتوث:</p>
                  <p>۱. یک گوشی روی «میزبان شو» بزند.</p>
                  <p>۲. گوشی دوم از فهرست دستگاه‌های جفت‌شده، گوشی میزبان را انتخاب کند.</p>
                  <p className="text-amber-300/90">به اینترنت نیازی نیست؛ فقط بلوتوث هر دو گوشی روشن باشد.</p>
                </div>

                <button
                  type="button"
                  onClick={() => directMultiplayer.startNativeBluetoothServer()}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs shadow-lg hover:from-blue-500 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Radio className="w-4 h-4" />
                  میزبان شو (این گوشی)
                </button>

                {state.pairedDevices.length > 0 ? (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    <span className="text-xs text-stone-400 block font-bold">دستگاه‌های جفت‌شده:</span>
                    {state.pairedDevices.map((dev) => (
                      <div
                        key={dev.address}
                        className="p-2.5 rounded-xl bg-black/60 border border-blue-900/50 flex items-center justify-between text-xs gap-2"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-white block truncate">{dev.name}</span>
                          <span className="text-[11px] text-stone-400 font-mono block truncate" dir="ltr">
                            {dev.address}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => directMultiplayer.connectNativeBluetooth(dev.address)}
                          className="py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer shrink-0"
                        >
                          اتصال
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 text-center py-2 leading-relaxed">
                    دستگاه جفت‌شده‌ای پیدا نشد. اول در تنظیمات بلوتوث گوشی، دو گوشی را جفت (Pair) کنید و
                    دوباره این پنجره را باز کنید.
                  </p>
                )}
              </>
            ) : (
              <div className="p-4 rounded-2xl bg-stone-900/70 border border-stone-800 space-y-2 text-xs leading-relaxed text-stone-300">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>بلوتوث در این مرورگر در دسترس نیست</span>
                </div>
                <p>
                  بازی دو گوشی با بلوتوث فقط داخل اپ اندروید کار می‌کند. اگر نسخهٔ وب را باز کرده‌اید،
                  با کد اتاق (در صورت فعال بودن سرور) یا روی یک گوشی بازی کنید.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Room code tab (web only) */}
        {activeTab === 'room_code' && roomServerAvailable && (
          <div className="mt-4 space-y-3.5">
            <div className="p-3 rounded-2xl bg-stone-900/60 border border-stone-800 text-xs text-stone-300 leading-relaxed space-y-1">
              <p className="font-bold text-amber-300">اتصال با کد ۴ رقمی:</p>
              <p>• گوشی اول «ایجاد اتاق» را بزند و کد را بخواند.</p>
              <p>• گوشی دوم همان کد را وارد کند.</p>
            </div>

            {state.roomCode ? (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/80 via-indigo-950/70 to-blue-950/80 border-2 border-blue-500/70 text-center space-y-2">
                <span className="text-xs text-blue-200 block">کد ورود برای گوشی دوم:</span>
                <div
                  className="font-mono text-3xl font-black text-amber-300 tracking-widest bg-black/60 py-2 px-4 rounded-xl border border-amber-500/40 inline-block select-all"
                  dir="ltr"
                >
                  {state.roomCode}
                </div>
                <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-300 animate-pulse pt-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>منتظر ورود گوشی دوم...</span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCreateRoom}
                disabled={isCreatingRoom}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-black text-sm shadow-xl hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isCreatingRoom ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                ایجاد اتاق (میزبان)
              </button>
            )}

            <form onSubmit={handleJoinRoom} className="space-y-2 pt-2 border-t border-stone-800">
              <label className="text-xs text-stone-300 block font-bold">ورود به اتاق حریف:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="مثلاً ۱۲۳۴"
                  className="flex-1 py-2.5 px-3 rounded-xl bg-black/60 border border-blue-700/50 text-white text-center font-mono text-lg tracking-widest focus:outline-none focus:border-amber-400"
                  dir="ltr"
                />
                <button
                  type="submit"
                  disabled={inputCode.length !== 4 || isJoiningRoom}
                  className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isJoiningRoom ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                  پیوستن
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-stone-800 space-y-2">
          <button
            type="button"
            onClick={handleStart}
            disabled={!state.isConnected}
            className={`w-full py-3 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 transition-all ${
              state.isConnected
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white cursor-pointer active:scale-[0.98]'
                : 'bg-stone-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {state.isConnected ? 'شروع بازی دو نفره' : 'اول به گوشی حریف وصل شوید'}
          </button>
          <button
            type="button"
            onClick={() => {
              directMultiplayer.disconnect();
              onClose();
            }}
            className="w-full py-2 rounded-xl bg-stone-900 text-stone-400 text-xs font-bold hover:bg-stone-800 cursor-pointer"
          >
            لغو و قطع اتصال
          </button>
        </div>
      </div>
    </div>
  );
};
