"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/context/auth-context";
import { BarChart3, TrendingUp, Users, Building2, Receipt, RefreshCw } from "lucide-react";

function AnalyticsContent() {
  const { session } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = session?.access_token;
        const res = await fetch("/api/admin/stats?range=30d", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [session]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-400" />
          <span>Platform Analytics & Trends</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">Real-time aggregations of store activity, turnover, and volume</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Gross Platform Sales</span>
          <div className="text-2xl font-black text-white mt-2">
            ₹{(stats?.totalSales || 0).toLocaleString("en-IN")}
          </div>
          <span className="text-[11px] text-emerald-400 mt-1 block">Live Invoice Cumulative</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Platform Active Khata Due</span>
          <div className="text-2xl font-black text-white mt-2">
            ₹{(stats?.totalOutstanding || 0).toLocaleString("en-IN")}
          </div>
          <span className="text-[11px] text-amber-400 mt-1 block">Receivables Across MSMEs</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Average Ticket Size</span>
          <div className="text-2xl font-black text-white mt-2">
            ₹{stats?.totalInvoices ? Math.round(stats.totalSales / stats.totalInvoices).toLocaleString("en-IN") : 0}
          </div>
          <span className="text-[11px] text-indigo-400 mt-1 block">Per Billed Invoice</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Loading analytics...</div>}>
      <AnalyticsContent />
    </Suspense>
  );
}
