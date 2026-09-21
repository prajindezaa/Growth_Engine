"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  FileText,
  CreditCard,
  Package,
  Check,
} from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "payment" | "stock" | "invoice" | "approval" | "general";
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { business } = useAuth();
  const { success } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (business?.id) {
        query = query.eq("business_id", business.id);
      }

      const { data, error } = await query;
      if (data && data.length > 0) {
        setNotifications(
          data.map((n) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type || "general",
            isRead: n.is_read || false,
            createdAt: new Date(n.created_at).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }))
        );
      } else if (business?.id) {
        // Seed default notification alerts into Supabase
        const initialSeeds = [
          {
            business_id: business.id,
            title: "Khata Payment Received",
            message: "Ravi Traders sent ₹15,000 via UPI QR for Invoice #INV-101.",
            type: "payment",
            is_read: false,
          },
          {
            business_id: business.id,
            title: "Low Stock Alert: PVC Pipes",
            message: "Supreme PVC Pipe 4-inch has reached 0 units (Below minimum threshold 20).",
            type: "stock",
            is_read: false,
          },
          {
            business_id: business.id,
            title: "Pending Discount Approval",
            message: "Senthil Nathan requested 12% discount authorization for Murugan Traders.",
            type: "approval",
            is_read: true,
          },
        ];

        const { data: inserted } = await supabase
          .from("notifications")
          .insert(initialSeeds)
          .select();

        if (inserted) {
          setNotifications(
            inserted.map((n) => ({
              id: n.id,
              title: n.title,
              message: n.message,
              type: n.type || "general",
              isRead: n.is_read || false,
              createdAt: "Just now",
            }))
          );
        }
      }
    } catch (e) {
      console.warn("Failed to load notifications:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [business?.id]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );

    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      success("Notification marked as read");
    } catch (e) {
      console.warn("Error updating notification status:", e);
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      if (business?.id) {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("business_id", business.id);
      }
      success("All notifications marked as read");
    } catch (e) {
      console.warn("Error updating all notifications:", e);
    }
  };

  const getIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "payment":
        return <CreditCard className="w-5 h-5 text-emerald-600" />;
      case "stock":
        return <Package className="w-5 h-5 text-amber-600" />;
      case "approval":
        return <AlertTriangle className="w-5 h-5 text-indigo-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Notifications & Live Activity
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time business events, payments, low inventory alerts, and approvals
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={markAllRead}
          className="self-start sm:self-auto gap-2"
        >
          <Check className="w-4 h-4" />
          Mark all as read
        </Button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map((item) => (
          <Card
            key={item.id}
            className={`p-4 flex items-start justify-between gap-4 transition-all ${
              item.isRead ? "opacity-75 bg-slate-50/50" : "bg-white border-l-4 border-l-[#4F46E5] shadow-xs"
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-slate-100 shrink-0 mt-0.5">
                {getIcon(item.type)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                  {!item.isRead && (
                    <Badge variant="primary">
                      New
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{item.message}</p>
                <span className="text-[10px] font-medium text-slate-400 mt-1 block">
                  {item.createdAt}
                </span>
              </div>
            </div>

            {!item.isRead && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAsRead(item.id)}
                className="text-xs font-semibold text-[#4F46E5] hover:bg-indigo-50 shrink-0"
              >
                Mark Read
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
