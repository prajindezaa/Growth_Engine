"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
}

export function DetailPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footerActions,
}: DetailPanelProps) {
  // Prevent body scroll when open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Container: Bottom Sheet on Mobile, Right Slide-over on Desktop */}
      <div className="fixed inset-x-0 bottom-0 top-12 sm:top-0 sm:left-auto sm:right-0 sm:w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-none sm:rounded-l-2xl shadow-2xl flex flex-col z-10 transition-transform duration-300 ease-out animate-in slide-in-from-bottom-8 sm:slide-in-from-right-8">
        
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden cursor-grab">
          <div className="w-12 h-1.5 rounded-full bg-slate-300" />
        </div>

        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Panel Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-5">
          {children}
        </div>

        {/* Sticky Footer Action Bar (Bottom 25% Thumb Zone) */}
        {footerActions && (
          <div className="p-4 sm:px-6 border-t border-slate-200 bg-white/95 backdrop-blur-xs safe-bottom sticky bottom-0">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  );
}
