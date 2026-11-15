import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

interface ConfirmDialogProps {
  options: ConfirmOptions | null;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ options, onClose }) => {
  if (!options) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm bg-[#1b130c] border-2 border-amber-600/70 rounded-3xl p-5 shadow-2xl text-right">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-900/60 border border-amber-600/60 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-300" />
            </div>
            <h2 className="text-sm font-black text-amber-100">{options.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-950/60 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {options.body && (
          <p className="mt-3 text-xs text-stone-300 leading-relaxed">{options.body}</p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              options.onConfirm();
              onClose();
            }}
            className={`flex-1 py-2.5 rounded-xl text-white font-black text-sm cursor-pointer ${
              options.destructive ? 'bg-rose-600 hover:bg-rose-500' : 'bg-amber-600 hover:bg-amber-500'
            }`}
          >
            {options.confirmLabel ?? 'تأیید'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-stone-800 text-stone-200 font-bold text-sm hover:bg-stone-700 cursor-pointer"
          >
            {options.cancelLabel ?? 'انصراف'}
          </button>
        </div>
      </div>
    </div>
  );
};
