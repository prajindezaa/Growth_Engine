"use client";

import React, { useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export interface DetailPanelSection {
  title?: string;
  children: React.ReactNode;
}

export interface DetailPanelAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  loading?: boolean;
  icon?: React.ReactNode;
}

export interface DetailBreadcrumb {
  label: string;
  onBack: () => void;
}

export interface DetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  statusBadge?: {
    text: string;
    variant: "success" | "warning" | "danger" | "neutral" | "primary";
  };
  heroNumber?: {
    label: string;
    value: string | number;
    color?: string;
    caption?: string;
  };
  fullPageHref?: string;
  width?: "normal" | "wide"; // normal: 480px, wide: 640px
  breadcrumbs?: DetailBreadcrumb[];
  children: React.ReactNode;
  actions?: DetailPanelAction[];
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  statusBadge,
  heroNumber,
  fullPageHref,
  width = "normal",
  breadcrumbs = [],
  children,
  actions = [],
}) => {
  // Swipe to dismiss tracking
  const [touchStartX, setTouchStartX] = React.useState<number | null>(null);
  const [touchStartY, setTouchStartY] = React.useState<number | null>(null);
  const [dragOffset, setDragOffset] = React.useState<number>(0);

  // Handle ESC key to dismiss panel
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - touchStartX;
    if (deltaX > 0) {
      setDragOffset(deltaX);
    }
  };

  const onTouchEnd = () => {
    if (dragOffset > 90) {
      onClose();
    }
    setDragOffset(0);
    setTouchStartX(null);
    setTouchStartY(null);
  };

  if (!isOpen) return null;

  const panelWidth = width === "wide" ? "640px" : "480px";

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="ge-detail-panel-backdrop"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 9998,
          animation: "ge-fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        aria-hidden="true"
      />

      {/* Slide-in Drawer */}
      <aside
        className="ge-detail-panel"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: panelWidth,
          maxWidth: "100vw",
          height: "100vh",
          backgroundColor: "var(--bg-card)",
          borderLeft: "1px solid var(--border-subtle)",
          boxShadow: "var(--shadow-lg)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          transform: dragOffset > 0 ? `translateX(${dragOffset}px)` : "translateX(0)",
          transition: dragOffset > 0 ? "none" : "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          animation: dragOffset === 0 ? "ge-slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)" : undefined,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-panel-title"
      >
        {/* Mobile Swipe Grab Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "8px 0 2px",
            touchAction: "pan-y",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "4px",
              backgroundColor: "var(--border-strong, #475569)",
              borderRadius: "var(--radius-full)",
            }}
          />
        </div>

        {/* Header with Breadcrumb & Action Bar */}
        <div
          style={{
            padding: "var(--space-2) var(--space-3)",
            borderBottom: "1px solid var(--border-subtle)",
            backgroundColor: "var(--bg-card)",
            flexShrink: 0,
          }}
        >
          {/* Nested Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "8px",
                fontSize: "var(--font-xs)",
              }}
            >
              {breadcrumbs.map((b, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={b.onBack}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    color: "var(--primary)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontWeight: 600,
                  }}
                >
                  ← {b.label}
                </button>
              ))}
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h2
                  id="detail-panel-title"
                  style={{
                    fontSize: "var(--font-md)",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: 0,
                    lineHeight: 1.2,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {title}
                </h2>
                {statusBadge && (
                  <span className={`ge-badge ge-badge-${statusBadge.variant}`}>
                    {statusBadge.text}
                  </span>
                )}
              </div>
              {subtitle && (
                <p
                  style={{
                    fontSize: "var(--font-xs)",
                    color: "var(--text-muted)",
                    margin: "4px 0 0 0",
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>

            {/* Header controls: full page & close */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
              {fullPageHref && (
                <Link
                  href={fullPageHref}
                  title="Open full page"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "32px",
                    height: "32px",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-muted)",
                    textDecoration: "none",
                    border: "1px solid var(--border-subtle)",
                    fontSize: "var(--font-sm)",
                    transition: "color 0.15s ease",
                  }}
                >
                  ↗
                </Link>
              )}
              <button
                type="button"
                onClick={onClose}
                title="Close panel (Esc)"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "var(--radius-sm)",
                  background: "transparent",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-muted)",
                  fontSize: "var(--font-sm)",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Hero Number Section (MSME Primary Metric Zone) */}
        {heroNumber && (
          <div
            style={{
              padding: "16px 20px",
              backgroundColor: "var(--bg-secondary)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: "var(--font-xs)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 600,
                color: "var(--text-muted)",
              }}
            >
              {heroNumber.label}
            </span>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: heroNumber.color || "var(--text-primary)",
                lineHeight: 1.1,
              }}
            >
              {heroNumber.value}
            </div>
            {heroNumber.caption && (
              <span style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>
                {heroNumber.caption}
              </span>
            )}
          </div>
        )}

        {/* Scrollable Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "var(--space-3)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          {children}
        </div>

        {/* Sticky Action Footer */}
        {actions.length > 0 && (
          <div
            style={{
              padding: "var(--space-2) var(--space-3)",
              borderTop: "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "var(--space-1)",
              flexShrink: 0,
            }}
          >
            {actions.map((act, i) => {
              if (act.href) {
                return (
                  <Link key={i} href={act.href} style={{ textDecoration: "none" }}>
                    <Button
                      variant={act.variant || (i === 0 ? "primary" : "secondary")}
                      size="sm"
                      icon={act.icon}
                    >
                      {act.label}
                    </Button>
                  </Link>
                );
              }
              return (
                <Button
                  key={i}
                  variant={act.variant || (i === 0 ? "primary" : "secondary")}
                  size="sm"
                  onClick={act.onClick}
                  loading={act.loading}
                  icon={act.icon}
                >
                  {act.label}
                </Button>
              );
            })}
          </div>
        )}
      </aside>
    </>
  );
};
