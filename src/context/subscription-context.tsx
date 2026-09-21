"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";

export interface PlanFeatureInfo {
  enabled: boolean;
  limit: number | null;
}

export interface BusinessSubscriptionData {
  planId: string;
  planName: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  isTrial: boolean;
  trialDaysLeft: number;
  features: Record<string, PlanFeatureInfo>;
  usage: {
    users?: { currentUsage: number; limit: number | null; remaining: number | null; percentUsed: number; allowed: boolean };
    products?: { currentUsage: number; limit: number | null; remaining: number | null; percentUsed: number; allowed: boolean };
    customers?: { currentUsage: number; limit: number | null; remaining: number | null; percentUsed: number; allowed: boolean };
    ai?: { currentUsage: number; limit: number | null; remaining: number | null; percentUsed: number; allowed: boolean };
  };
}

interface SubscriptionContextType {
  subscription: BusinessSubscriptionData | null;
  loading: boolean;
  canUse: (featureKey: string) => boolean;
  isLimitReached: (featureKey: "users" | "products" | "customers" | "ai") => boolean;
  refreshSubscription: () => Promise<void>;
  upgradePlan: (planId: string, billingCycle?: "monthly" | "yearly") => Promise<{ success: boolean; message?: string }>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  loading: true,
  canUse: () => true,
  isLimitReached: () => false,
  refreshSubscription: async () => {},
  upgradePlan: async () => ({ success: false }),
});

export const useSubscription = () => useContext(SubscriptionContext);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { business, session } = useAuth();
  const [subscription, setSubscription] = useState<BusinessSubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    if (!business?.id) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/billing/entitlements?businessId=${encodeURIComponent(business.id)}`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });

      if (res.ok) {
        const data = await res.json();
        setSubscription({
          ...data.entitlements,
          usage: data.usage || {},
        });
      }
    } catch (err) {
      console.error("Error fetching subscription context:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [business?.id, session?.access_token]);

  const canUse = (featureKey: string): boolean => {
    if (!subscription) return true;
    const feat = subscription.features[featureKey];
    return feat ? feat.enabled : true;
  };

  const isLimitReached = (featureKey: "users" | "products" | "customers" | "ai"): boolean => {
    if (!subscription || !subscription.usage) return false;
    const usage = subscription.usage[featureKey];
    return usage ? !usage.allowed : false;
  };

  const upgradePlan = async (planId: string, billingCycle: "monthly" | "yearly" = "monthly") => {
    if (!business?.id) return { success: false, message: "No active business found" };

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          businessId: business.id,
          planId,
          billingCycle,
          action: "confirm_payment",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        await fetchSubscription();
        return { success: true, message: data.message };
      }
      return { success: false, message: data.error || "Upgrade failed" };
    } catch (err: any) {
      return { success: false, message: err.message || "Network error during checkout" };
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        loading,
        canUse,
        isLimitReached,
        refreshSubscription: fetchSubscription,
        upgradePlan,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}
