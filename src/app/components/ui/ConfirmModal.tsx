import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Ya, Yakin",
  cancelText = "Batal",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 pb-4 flex items-start gap-4">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 leading-6">{title}</h3>
            <p className="text-sm text-gray-600 mt-2">{message}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-2.5 border-t">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-white border border-gray-250 rounded-[10px] text-gray-700 hover:bg-gray-100 text-sm font-semibold transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-[10px] text-sm font-semibold transition-all cursor-pointer shadow-md shadow-amber-500/10"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
