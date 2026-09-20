"use client";

import { useState, useRef, useEffect } from "react";
import ThemeToggle from "./ThemeToggle";
import { signOut } from "@/app/(auth)/actions";

interface UserMenuProps {
  userEmail: string;
  userName?: string;
  role: string;
  collapsed?: boolean;
}

export default function UserMenu({
  userEmail,
  userName,
  role,
  collapsed = false,
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = userName || userEmail.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={collapsed ? `${displayName} (${role})` : undefined}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: collapsed ? "8px 0" : "8px 10px",
          justifyContent: collapsed ? "center" : "space-between",
          background: isOpen ? "var(--bg-elevated)" : "transparent",
          border: "none",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
          transition: "background 0.15s ease",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          {/* Avatar / Initials */}
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "var(--primary-soft)",
              border: "1px solid rgba(79, 70, 229, 0.3)",
              color: "var(--primary)",
              fontWeight: 700,
              fontSize: "var(--font-xs)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "var(--font-sm)",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {displayName}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  className="ge-badge ge-badge-neutral"
                  style={{
                    fontSize: "10px",
                    padding: "1px 6px",
                    textTransform: "uppercase",
                  }}
                >
                  {role}
                </span>
              </div>
            </div>
          )}
        </div>

        {!collapsed && (
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {isOpen ? "▲" : "▼"}
          </span>
        )}
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: collapsed ? "68px" : "0",
            width: "240px",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            padding: "var(--space-2)",
            zIndex: 1000,
            animation: "ge-fadeIn 0.15s ease",
          }}
        >
          <div style={{ paddingBottom: "8px", borderBottom: "1px solid var(--border-subtle)", marginBottom: "8px" }}>
            <div style={{ fontSize: "var(--font-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
              {displayName}
            </div>
            <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", wordBreak: "break-all" }}>
              {userEmail}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 8px",
              borderRadius: "var(--radius-sm)",
              marginBottom: "6px",
              fontSize: "var(--font-sm)",
              color: "var(--text-primary)",
            }}
          >
            <span>Appearance</span>
            <ThemeToggle />
          </div>

          <form action={signOut} style={{ marginTop: "4px" }}>
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "8px 10px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "var(--font-sm)",
                color: "var(--danger)",
                backgroundColor: "transparent",
                border: "none",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--danger-bg)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <span>🚪</span>
              <span>Sign out</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
