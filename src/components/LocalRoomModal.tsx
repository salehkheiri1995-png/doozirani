import React from 'react';
import { Wifi, Users, CheckCircle, Copy, X } from 'lucide-react';

interface LocalRoomModalProps {
  isOpen: boolean;
  roomId: string;
  isHost: boolean;
  connectedPeers: number;
  onSetRoomId: (id: string) => void;
  onClose: () => void;
}

export const LocalRoomModal: React.FC<LocalRoomModalProps> = ({
  isOpen,
  roomId,
  isHost,
  connectedPeers,
  onSetRoomId,
  onClose,
}) => {
  const [inputCode, setInputCode] = React.useState(roomId);
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      onSetRoomId(inputCode.trim());
      onClose();
    }
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-md bg-[#1a130c] border-2 border-emerald-600/70 rounded-3xl p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/30 border border-emerald-400 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-emerald-100">بازی با وای‌فای و هات‌اسپات</h2>
              <span className="text-[11px] text-emerald-300/80">اتصال محلی آفلاین بین دو گوشی</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="p-1 rounded-xl text-emerald-300 hover:bg-emerald-950/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Room Code Card */}
        <div className="mt-4 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 text-center">
          <span className="text-xs text-emerald-200 block mb-1">کد اتاق مشترک:</span>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-black text-amber-300 tracking-widest bg-stone-900/90 px-4 py-1.5 rounded-xl border border-amber-600/50">
              {roomId}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="p-2 rounded-xl bg-stone-800 text-stone-200 hover:bg-stone-700 transition-colors"
              title="کپی کد اتاق"
            >
              {copied ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Change room code form */}
        <form onSubmit={handleApply} className="mt-4">
          <label htmlFor="room-code-input" className="block text-xs font-bold text-stone-300 mb-1 text-right">
            وارد کردن کد اتاق گوشی حریف:
          </label>
          <div className="flex gap-2">
            <input
              id="room-code-input"
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="مثال: 1234"
              className="flex-1 px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-center text-sm font-bold text-amber-200 focus:outline-none focus:border-emerald-400"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              عضویت
            </button>
          </div>
        </form>

        {/* Instructions */}
        <div className="mt-4 p-3 rounded-2xl bg-stone-950/60 border border-stone-800/80 text-[11px] text-stone-300 space-y-1 text-right leading-relaxed">
          <p className="font-bold text-amber-300">نحوه بازی بدون اینترنت:</p>
          <p>۱. یکی از گوشی‌ها «نقطه اتصال همراه» (Hotspot) خود را روشن کند.</p>
          <p>۲. گوشی دوم به وای‌فای هات‌اسپات آن وصل شود (بدون نیاز به بسته اینترنت).</p>
          <p>۳. هر دو بازیکن کد یکسان را در این کادر وارد کنند تا به هم متصل شوند.</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-4 py-2.5 rounded-2xl bg-stone-800 text-stone-300 text-xs font-bold hover:bg-stone-700 transition-colors"
        >
          تایید و بستن
        </button>
      </div>
    </div>
  );
};
