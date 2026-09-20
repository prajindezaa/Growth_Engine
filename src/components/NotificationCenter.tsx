"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { pushNotifications } from "@/lib/capacitor/pushNotifications";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  overdue_invoice: "🔴",
  due_today: "🟡",
  due_this_week: "🟠",
  low_stock: "📦",
  payment_received: "💰",
  staff_joined: "👤",
  general: "🔔",
};

export default function NotificationCenter({ businessId }: { businessId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();

    // Register Capacitor push notifications if running on native mobile
    pushNotifications.init((push) => {
      // Refresh notifications when native alert arrives
      loadNotifications();
    });
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    const handleOpenEvent = () => {
      setIsOpen(true);
      loadNotifications();
    };
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("open-notifications-panel", handleOpenEvent);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("open-notifications-panel", handleOpenEvent);
    };
  }, []);

  async function loadNotifications() {
    const supabase = createClient();
    const { data } = await supabase.from("notifications")
      .select("*").eq("business_id", businessId)
      .order("created_at", { ascending: false }).limit(30);
    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
    }
  }

  async function markAllRead() {
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true })
      .eq("business_id", businessId).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  async function generateNotifications() {
    const supabase = createClient();
    await (supabase.rpc as Function)("generate_daily_notifications", { p_business_id: businessId });
    await loadNotifications();
  }

  function getLink(n: Notification): string | null {
    if (!n.reference_type || !n.reference_id) return null;
    switch (n.reference_type) {
      case "invoice": return `/app/${businessId}/sales/invoices/${n.reference_id}`;
      case "product": return `/app/${businessId}/products/${n.reference_id}`;
      default: return null;
    }
  }

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          position: "relative",
          padding: "6px 8px",
          borderRadius: "var(--radius-sm)",
          fontSize: "1.15rem",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "0px",
              right: "0px",
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              background: "var(--danger)",
              color: "#fff",
              fontSize: "10px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "360px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            overflow: "hidden",
            zIndex: 100,
          }}
          className="ge-animate-in"
        >
          {/* Header */}
          <div
            style={{
              padding: "12px var(--space-2)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h4
              style={{
                margin: 0,
                fontSize: "var(--font-sm)",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              Notifications
            </h4>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={generateNotifications}
                style={{
                  fontSize: "var(--font-xs)",
                  padding: "4px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                  background: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                ↻ Refresh
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  style={{
                    fontSize: "var(--font-xs)",
                    padding: "4px 8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    background: "transparent",
                    color: "var(--primary)",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "var(--space-4) var(--space-2)",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: "var(--font-sm)",
                }}
              >
                No notifications yet. Click Refresh to generate alerts.
              </div>
            ) : (
              notifications.map((n) => {
                const link = getLink(n);
                const itemStyle = {
                  display: "flex" as const,
                  gap: "10px",
                  padding: "12px var(--space-2)",
                  borderBottom: "1px solid var(--border-subtle)",
                  textDecoration: "none",
                  background: n.is_read ? "transparent" : "var(--primary-soft)",
                  cursor: link ? ("pointer" as const) : ("default" as const),
                };
                const inner = (
                  <>
                    <span style={{ fontSize: "1.1rem", flexShrink: 0, marginTop: "2px" }}>
                      {TYPE_ICONS[n.type] || "🔔"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "var(--font-sm)",
                          fontWeight: n.is_read ? 400 : 600,
                          color: "var(--text-primary)",
                          marginBottom: "2px",
                        }}
                      >
                        {n.title}
                      </div>
                      {n.body && (
                        <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>
                          {n.body}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--text-muted)",
                          marginTop: "4px",
                        }}
                      >
                        {new Date(n.created_at).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    {!n.is_read && (
                      <div
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "var(--primary)",
                          flexShrink: 0,
                          marginTop: "6px",
                        }}
                      />
                    )}
                  </>
                );
                return link ? (
                  <Link key={n.id} href={link} style={itemStyle}>
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id} style={itemStyle}>
                    {inner}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
