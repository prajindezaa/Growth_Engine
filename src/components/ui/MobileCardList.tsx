"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export interface MobileCardAction<T> {
  label: string;
  icon?: string;
  variant?: "primary" | "secondary" | "destructive";
  onClick: (item: T) => void;
}

export interface MobileCardListProps<T> {
  items: T[];
  keyExtractor: (item: T) => string;
  onItemClick: (item: T) => void;
  renderPrimary: (item: T) => React.ReactNode;
  renderSecondary?: (item: T) => React.ReactNode;
  renderStatus?: (item: T) => React.ReactNode;
  renderMetric?: (item: T) => React.ReactNode;
  swipeAction?: {
    icon: string;
    label: string;
    onSwipe: (item: T) => void;
    bg?: string;
  };
  actions?: MobileCardAction<T>[];
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
  onFilterClick?: () => void;
  hasActiveFilters?: boolean;
  fabAction?: {
    label: string;
    icon?: string;
    href?: string;
    onClick?: () => void;
  };
}

export function MobileCardList<T>({
  items,
  keyExtractor,
  onItemClick,
  renderPrimary,
  renderSecondary,
  renderStatus,
  renderMetric,
  swipeAction,
  actions = [],
  searchPlaceholder = "Search...",
  onSearchChange,
  onFilterClick,
  hasActiveFilters = false,
  fabAction,
}: MobileCardListProps<T>) {
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(true);
  const lastScrollY = useRef(0);
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [openActionItemId, setOpenActionItemId] = useState<string | null>(null);

  // Collapse search on scroll down, restore on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 70) {
        setShowSearch(false);
      } else {
        setShowSearch(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (onSearchChange) onSearchChange(val);
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Scroll-aware Collapsible Sticky Search & Filter Bar */}
      {onSearchChange && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            backgroundColor: "var(--bg-primary)",
            padding: "8px 0 12px 0",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transform: showSearch ? "translateY(0)" : "translateY(-100%)",
            opacity: showSearch ? 1 : 0,
            pointerEvents: showSearch ? "auto" : "none",
            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <span
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "0.9rem",
                color: "var(--text-muted)",
              }}
            >
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="ge-input"
              style={{
                paddingLeft: "36px",
                width: "100%",
                minHeight: "44px",
                fontSize: "var(--font-sm)",
              }}
            />
          </div>

          {onFilterClick && (
            <button
              type="button"
              onClick={onFilterClick}
              className="ge-touch-target"
              style={{
                background: hasActiveFilters ? "var(--primary-soft)" : "var(--bg-card)",
                border: hasActiveFilters
                  ? "1px solid var(--primary)"
                  : "1px solid var(--border-subtle)",
                color: hasActiveFilters ? "var(--primary)" : "var(--text-secondary)",
                borderRadius: "var(--radius-md)",
                padding: "0 14px",
                fontSize: "0.85rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <span>⚡</span> Filter
            </button>
          )}
        </div>
      )}

      {/* Cards List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingBottom: fabAction ? "80px" : "16px" }}>
        {items.map((item) => {
          const id = keyExtractor(item);
          const isSwiped = swipedItemId === id;
          const isActionsOpen = openActionItemId === id;

          return (
            <div
              key={id}
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-card)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {/* Swipe Action Background Layer (if configured) */}
              {swipeAction && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: swipeAction.bg || "var(--primary)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: "24px",
                    fontWeight: 700,
                    fontSize: "var(--font-sm)",
                    gap: "8px",
                  }}
                  onClick={() => swipeAction.onSwipe(item)}
                >
                  <span>{swipeAction.icon}</span>
                  <span>{swipeAction.label}</span>
                </div>
              )}

              {/* Main Card Content Container (with Touch Swipe handling) */}
              <div
                onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
                onTouchMove={(e) => {
                  if (touchStartX === null || !swipeAction) return;
                  const deltaX = e.touches[0].clientX - touchStartX;
                  if (deltaX < -60) {
                    setSwipedItemId(id);
                  } else if (deltaX > 20) {
                    setSwipedItemId(null);
                  }
                }}
                onTouchEnd={() => setTouchStartX(null)}
                onClick={() => {
                  if (isSwiped) {
                    setSwipedItemId(null);
                  } else {
                    onItemClick(item);
                  }
                }}
                style={{
                  position: "relative",
                  zIndex: 2,
                  backgroundColor: "var(--bg-card)",
                  padding: "14px 16px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  transform: isSwiped ? "translateX(-110px)" : "translateX(0)",
                  transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {/* Top Row: Primary Title & Status / Metric */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "1rem",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        lineHeight: 1.3,
                        wordBreak: "break-word",
                      }}
                    >
                      {renderPrimary(item)}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    {renderStatus && renderStatus(item)}
                    {renderMetric && (
                      <div
                        style={{
                          fontSize: "1rem",
                          fontWeight: 800,
                          textAlign: "right",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {renderMetric(item)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Secondary Info & Actions */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginTop: "2px" }}>
                  <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", flex: 1, minWidth: 0 }}>
                    {renderSecondary && renderSecondary(item)}
                  </div>

                  {actions.length > 0 && (
                    <div style={{ position: "relative" }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenActionItemId(isActionsOpen ? null : id);
                        }}
                        className="ge-touch-target"
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--text-muted)",
                          fontSize: "1.2rem",
                          cursor: "pointer",
                          padding: "4px 8px",
                        }}
                        aria-label="Item Actions"
                      >
                        ⋮
                      </button>

                      {isActionsOpen && (
                        <div
                          style={{
                            position: "absolute",
                            right: 0,
                            bottom: "100%",
                            marginBottom: "4px",
                            zIndex: 10,
                            backgroundColor: "var(--bg-card)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "var(--radius-md)",
                            boxShadow: "var(--shadow-lg)",
                            minWidth: "160px",
                            padding: "4px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                          }}
                        >
                          {actions.map((act, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionItemId(null);
                                act.onClick(item);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "10px 12px",
                                border: "none",
                                background: "transparent",
                                color:
                                  act.variant === "destructive"
                                    ? "var(--danger)"
                                    : "var(--text-primary)",
                                fontSize: "var(--font-xs)",
                                fontWeight: 600,
                                textAlign: "left",
                                cursor: "pointer",
                                borderRadius: "var(--radius-sm)",
                              }}
                            >
                              {act.icon && <span>{act.icon}</span>}
                              <span>{act.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Action Button (FAB) in bottom 25% zone */}
      {fabAction && (
        <div
          style={{
            position: "fixed",
            bottom: "76px",
            right: "20px",
            zIndex: 950,
          }}
        >
          {fabAction.href ? (
            <Link href={fabAction.href} style={{ textDecoration: "none" }}>
              <button
                type="button"
                className="ge-touch-target"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "var(--radius-full)",
                  padding: "14px 22px",
                  fontSize: "var(--font-sm)",
                  fontWeight: 700,
                  boxShadow: "0 6px 20px rgba(59, 130, 246, 0.4)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: "1.2rem" }}>{fabAction.icon || "＋"}</span>
                <span>{fabAction.label}</span>
              </button>
            </Link>
          ) : (
            <button
              type="button"
              onClick={fabAction.onClick}
              className="ge-touch-target"
              style={{
                backgroundColor: "var(--primary)",
                color: "#ffffff",
                border: "none",
                borderRadius: "var(--radius-full)",
                padding: "14px 22px",
                fontSize: "var(--font-sm)",
                fontWeight: 700,
                boxShadow: "0 6px 20px rgba(59, 130, 246, 0.4)",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: "1.2rem" }}>{fabAction.icon || "＋"}</span>
              <span>{fabAction.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
