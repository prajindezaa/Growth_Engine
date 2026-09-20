"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  fullscreen?: boolean;
}

export default function BottomSheet({ isOpen, onClose, title, children, fullscreen }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [dragging, setDragging] = useState(false);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Swipe to dismiss
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setDragging(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging) return;
    const diff = e.touches[0].clientY - startY;
    if (diff > 0) setCurrentY(diff);
  }, [dragging, startY]);

  const onTouchEnd = useCallback(() => {
    setDragging(false);
    if (currentY > 100) {
      onClose();
    }
    setCurrentY(0);
  }, [currentY, onClose]);

  if (!isOpen) return null;

  if (fullscreen) {
    return (
      <div className="ge-mobile-fullscreen">
        <div className="ge-mobile-fullscreen-header">
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--ge-text-secondary)", fontSize: "1.25rem",
            width: "44px", height: "44px", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>←</button>
          {title && <h2 style={{
            fontSize: "var(--ge-text-base)", fontWeight: 600,
            color: "var(--ge-text-primary)", flex: 1, textAlign: "center",
          }}>{title}</h2>}
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--ge-text-muted)", fontSize: "1.25rem",
            width: "44px", height: "44px", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>
        <div style={{ padding: "16px", flex: 1 }}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="ge-bottom-sheet-overlay" onClick={onClose} />
      <div
        ref={sheetRef}
        className="ge-bottom-sheet"
        style={{ transform: currentY > 0 ? `translateY(${currentY}px)` : undefined }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="ge-bottom-sheet-handle" />
        {title && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "4px 20px 12px", borderBottom: "1px solid var(--ge-border)",
          }}>
            <h3 style={{
              fontSize: "var(--ge-text-base)", fontWeight: 600,
              color: "var(--ge-text-primary)", margin: 0,
            }}>{title}</h3>
            <button onClick={onClose} style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--ge-text-muted)", fontSize: "1.25rem",
              width: "44px", height: "44px", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>✕</button>
          </div>
        )}
        <div style={{ padding: "16px 20px" }}>
          {children}
        </div>
      </div>
    </>
  );
}
