import React, { useState, useEffect } from 'react';
import { Bluetooth, Radio, CheckCircle2, AlertTriangle, X, RefreshCw, Smartphone, KeyRound, Wifi, Play, Users } from 'lucide-react';
import { directMultiplayer, MultiplayerState, RemoteDevice } from '../utils/directMultiplayer';

interface BluetoothModalProps {
  isOpen: boolean;
  onConnected: () => void;
  onClose: () => void;
}

export const BluetoothModal: React.FC<BluetoothModalProps> = ({
  isOpen,
  onConnected,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'room_code' | 'bluetooth'>('room_code');
  const [state, setState] = useState<MultiplayerState>(directMultiplayer.getState());
  const [inputCode, setInputCode] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);

  useEffect(() => {
    directMultiplayer.setCallbacks(
      (newState) => {
        setState(newState);
        if (newState.isConnected) {
          onConnected();
        }
      },
      () => {}
    );
  }, [onConnected]);

  useEffect(() => {
    if (isOpen) {
      if (directMultiplayer.isNativeAndroidBluetoothAvailable()) {
        directMultiplayer.loadPairedDevices();
      }
    }
  }, [isOpen]);

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

  const isNative = directMultiplayer.isNativeAndroidBluetoothAvailable();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-md bg-[#161009] border-2 border-blue-500/70 rounded-3xl p-5 shadow-2xl text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-blue-900/50">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-blue-100">بازی دو نفره بین دو گوشی موبایل</h2>
              <span className="text-[11px] text-blue-300/80">اتصال مستقیم و مسابقه زنده دونفره</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن پنجره"
            className="p-1.5 rounded-xl text-blue-300 hover:bg-blue-950/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Method Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-black/50 rounded-2xl border border-blue-900/40">
          <button
            type="button"
            onClick={() => setActiveTab('room_code')}
            className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'room_code'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>اتصال فوری با کد ۴ رقمی</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bluetooth')}
            className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'bluetooth'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Bluetooth className="w-3.5 h-3.5" />
            <span>بلوتوث مستقیم اندروید</span>
          </button>
        </div>

        {/* Current Connection Status Box */}
        <div className="mt-3.5 p-3 rounded-2xl bg-blue-950/40 border border-blue-800/40 flex items-center justify-between text-xs">
          <span className="text-blue-200">وضعیت اتصال:</span>
          {state.isConnected ? (
            <span className="flex items-center gap-1.5 font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/50">
              <CheckCircle2 className="w-3.5 h-3.5" />
              متصل به {state.deviceName || 'گوشی حریف'}
            </span>
          ) : (
            <span className="text-amber-300 font-medium bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-500/40">
              {state.statusText}
            </span>
          )}
        </div>

        {state.error && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-rose-950/70 border border-rose-800/60 flex items-start gap-2 text-xs text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">{state.error}</p>
          </div>
        )}

        {/* TAB 1: 4-DIGIT INSTANT WIRELESS ROOM */}
        {activeTab === 'room_code' && (
          <div className="mt-4 space-y-3.5">
            <div className="p-3 rounded-2xl bg-stone-900/60 border border-stone-800 text-[11px] text-stone-300 leading-relaxed space-y-1">
              <p className="font-bold text-amber-300">نحوه اتصال دو گوشی (آسان‌ترین روش):</p>
              <p>• در یکی از گوشی‌ها روی <strong>«ایجاد بازی جدید»</strong> بزنید تا کد ۴ رقمی دریافت کنید.</p>
              <p>• در گوشی دوم، همان کد ۴ رقمی را وارد کنید تا بلافاصله به هم وصل شوید!</p>
            </div>

            {/* If Host: Show Room Code */}
            {state.roomCode ? (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/80 via-indigo-950/70 to-blue-950/80 border-2 border-blue-500/70 text-center space-y-2">
                <span className="text-xs text-blue-200 block">کد ورود برای گوشی دوم:</span>
                <div className="font-mono text-3xl font-black text-amber-300 tracking-widest bg-black/60 py-2 px-4 rounded-xl border border-amber-500/40 inline-block select-all" dir="ltr">
                  {state.roomCode}
                </div>
                <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-300 animate-pulse pt-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>منتظر وارد کردن این کد در گوشی دوم...</span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCreateRoom}
                disabled={isCreatingRoom}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-black text-sm shadow-xl hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isCreatingRoom ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                ایجاد بازی جدید (گوشی اول / میزبان)
              </button>
            )}

            {/* If Guest: Join by Code */}
            <form onSubmit={handleJoinRoom} className="space-y-2 pt-1 border-t border-stone-800">
              <label className="text-xs text-stone-300 block font-bold">ورود به بازی حریف با کد ۴ رقمی:</label>
              <div className="flex gap-2">
                <input
                  type="text"
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

        {/* TAB 2: NATIVE ANDROID BLUETOOTH */}
        {activeTab === 'bluetooth' && (
          <div className="mt-4 space-y-3">
            {isNative ? (
              <>
                <div className="p-3 rounded-2xl bg-stone-900/60 border border-stone-800 text-[11px] text-stone-300 leading-relaxed space-y-1">
                  <p className="font-bold text-blue-300">بلوتوث نیتیو اندروید فعال است:</p>
                  <p>دستگاه‌های جفت‌شده (Paired) گوشی شما در زیر قابل مشاهده است:</p>
                </div>

                <button
                  type="button"
                  onClick={() => directMultiplayer.startNativeBluetoothServer()}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs shadow-lg hover:from-blue-500 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Radio className="w-4 h-4" />
                  قرار دادن گوشی در حالت میزبان بلوتوث
                </button>

                {state.pairedDevices.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    <span className="text-[11px] text-stone-400 block font-bold">دستگاه‌های بلوتوث جفت‌شده:</span>
                    {state.pairedDevices.map((dev) => (
                      <div
                        key={dev.address}
                        className="p-2.5 rounded-xl bg-black/60 border border-blue-900/50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-white block">{dev.name}</span>
                          <span className="text-[10px] text-stone-400 font-mono" dir="ltr">{dev.address}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => directMultiplayer.connectNativeBluetooth(dev.address)}
                          className="py-1 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold cursor-pointer"
                        >
                          اتصال
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-400 text-center py-2">
                    دستگاه بلوتوث جفت‌شده‌ای یافت نشد. می‌توانید از تب «کد ۴ رقمی» بدون نیاز به بلوتوث متصل شوید.
                  </p>
                )}
              </>
            ) : (
              <div className="p-4 rounded-2xl bg-stone-900/70 border border-stone-800 space-y-2 text-xs leading-relaxed text-stone-300">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>اتصال مستقیم موبایل به موبایل</span>
                </div>
                <p className="text-[11px] text-stone-300">
                  برای اتصال دو گوشی اندروید، از تب **«اتصال فوری با کد ۴ رقمی»** استفاده کنید. این روش بدون نیاز به جفت‌سازی بلوتوث یا مجوزهای سخت‌گیرانه سیستم‌عامل، دو گوشی را در کمتر از ۲ ثانیه به یکدیگر وصل می‌کند!
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('room_code')}
                  className="w-full mt-2 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs cursor-pointer"
                >
                  رفتن به تب اتصال با کد ۴ رقمی
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {state.isConnected && (
          <div className="mt-4 pt-3 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm shadow-xl cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              شروع بازی دو نفره
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
