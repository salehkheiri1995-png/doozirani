import React from 'react';
import { Bluetooth, Radio, CheckCircle2, AlertTriangle, X, RefreshCw, Zap } from 'lucide-react';
import { BluetoothConnectionState } from '../utils/bluetooth';

interface BluetoothModalProps {
  isOpen: boolean;
  btState: BluetoothConnectionState;
  onScanAndConnect: () => void;
  onSimulateConnect: () => void;
  onDisconnect: () => void;
  onClose: () => void;
}

export const BluetoothModal: React.FC<BluetoothModalProps> = ({
  isOpen,
  btState,
  onScanAndConnect,
  onSimulateConnect,
  onDisconnect,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-[#1a120c] border-2 border-blue-500/60 rounded-3xl p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-blue-900/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-400 flex items-center justify-center">
              <Bluetooth className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-blue-100">اتصال بلوتوث دو کاربره اندروید</h2>
              <span className="text-[11px] text-blue-300/80">بازی دو نفره بین دو گوشی مجاور</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="p-1.5 rounded-xl text-blue-300 hover:bg-blue-950/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Status Box */}
        <div className="mt-4 p-4 rounded-2xl bg-blue-950/30 border border-blue-800/40">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-200">وضعیت اتصال:</span>
            {btState.isConnected ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/50">
                <CheckCircle2 className="w-3.5 h-3.5" />
                متصل به {btState.deviceName || 'گوشی حریف'}
              </span>
            ) : btState.isScanning ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-500/50">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                در حال جستجوی بلوتوث...
              </span>
            ) : (
              <span className="text-xs font-medium text-stone-400 bg-stone-900 px-2.5 py-1 rounded-full border border-stone-800">
                قطع
              </span>
            )}
          </div>

          {btState.error && (
            <div className="mt-3 p-2.5 rounded-xl bg-red-950/60 border border-red-800/60 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-200 leading-relaxed">{btState.error}</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-4 space-y-2 text-xs text-stone-300 bg-stone-950/50 p-3 rounded-2xl border border-stone-800/80">
          <p className="font-bold text-amber-300 mb-1">راهنمای اتصال بلوتوث:</p>
          <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed text-stone-300">
            <li>بلوتوث هر دو گوشی اندروید را روشن کنید.</li>
            <li>روی دکمه «اسکن و اتصال بلوتوث» در یکی از گوشی‌ها کلیک کنید.</li>
            <li>از لیست باز شده، گوشی یا دستگاه اندرویدی حریف را انتخاب نمایید.</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 space-y-2">
          {!btState.isConnected ? (
            <>
              <button
                type="button"
                onClick={onScanAndConnect}
                disabled={btState.isScanning}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold text-sm shadow-lg hover:from-blue-500 hover:to-indigo-600 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Radio className="w-4 h-4" />
                اسکن و اتصال با بلوتوث اندروید
              </button>

              <button
                type="button"
                onClick={onSimulateConnect}
                className="w-full py-2.5 px-4 rounded-2xl bg-amber-900/40 text-amber-300 border border-amber-700/50 font-medium text-xs hover:bg-amber-800/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                تست و شبیه‌سازی اتصال بلوتوث (مخصوص آزمایش)
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onDisconnect}
              className="w-full py-3 px-4 rounded-2xl bg-red-900/60 text-red-200 border border-red-700/60 font-bold text-sm hover:bg-red-800/60 transition-colors cursor-pointer"
            >
              قطع اتصال بلوتوث
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-center text-xs text-stone-400 hover:text-stone-200 transition-colors"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
