"use client";

import React from "react";
import Link from "next/link";
import { useSubscription } from "@/context/subscription-context";
import { Lock, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeatureGateProps {
  feature: string;
  fallbackTitle?: string;
  fallbackDescription?: string;
  children: React.ReactNode;
}

export function FeatureGate({
  feature,
  fallbackTitle = "Feature Locked",
  fallbackDescription = "This feature requires an upgraded business subscription.",
  children,
}: FeatureGateProps) {
  const { canUse, subscription, loading } = useSubscription();

  if (loading) {
    return <>{children}</>;
  }

  const isAllowed = canUse(feature);

  if (isAllowed) {
    return <>{children}</>;
  }

  const currentPlan = subscription?.planName || "Free Starter";

  return (
    <div className="p-6 sm:p-8 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 text-center shadow-xs">
      <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-[#4F46E5] flex items-center justify-center mx-auto mb-3 shadow-xs">
        <Lock className="w-6 h-6" />
      </div>

      <h3 className="text-base font-bold text-slate-900">{fallbackTitle}</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
        {fallbackDescription}
      </p>

      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white border border-slate-200 text-slate-600 shadow-2xs">
        <span>Current Plan:</span>
        <strong className="text-slate-900">{currentPlan}</strong>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2">
        <Link href="/pricing">
          <Button variant="primary" className="h-10 text-xs font-bold shadow-md shadow-indigo-500/20">
            <span>View Available Plans</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
