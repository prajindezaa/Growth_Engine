"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface Toast {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}

const ToastContext = createContext<{
  toast: (type: Toast["type"], message: string) => void;
}>({ toast: () => {} });

export function useToast() { return useContext(ToastContext); }

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: Toast["type"], message: string) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="ge-toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`ge-toast ge-toast-${t.type}`}>
            {t.type === "success" ? "✓ " : t.type === "error" ? "✕ " : "ℹ "}{t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
