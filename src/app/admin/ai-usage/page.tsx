"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/context/auth-context";
import { Bot, Cpu, Zap, Activity, Filter, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";

function AiUsageContent() {
  const { session } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [featureFilter, setFeatureFilter] = useState("");
  const [page, setPage] = useState(1);

  async function fetchAiUsage() {
    setLoading(true);
    try {
      const token = session?.access_token;
      let url = `/api/admin/ai-usage?page=${page}&limit=20`;
      if (featureFilter) url += `&feature=${encodeURIComponent(featureFilter)}`;

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setMetrics(data.metrics || null);
      }
    } catch (e) {
      console.error("Fetch AI usage error:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAiUsage();
  }, [page, featureFilter, session]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-indigo-400" />
            <span>AI Usage & Token Consumption</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time tracking of Gemini model inference, prompt token costs, and feature breakdown.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={featureFilter}
            onChange={(e) => {
              setFeatureFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All AI Features</option>
            <option value="AI Assistant">AI Assistant</option>
            <option value="Sales Analysis">Sales Analysis</option>
            <option value="Khata Summary">Khata Summary</option>
            <option value="Voice POS">Voice POS</option>
            <option value="Stock Forecast">Stock Forecast</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total AI Inferences</span>
          <div className="text-xl font-black text-white mt-1">
            {metrics?.totalRequests || 0}
          </div>
          <span className="text-[10px] text-emerald-400 mt-0.5 block font-semibold">Gemini 3.6 Flash</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tokens Processed</span>
          <div className="text-xl font-black text-white mt-1">
            {(metrics?.totalTokens || 0).toLocaleString("en-IN")}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Input + Completion Tokens</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Model Cost</span>
          <div className="text-xl font-black text-white mt-1">
            ₹{(metrics?.totalCost || 0).toFixed(2)}
          </div>
          <span className="text-[10px] text-indigo-400 mt-0.5 block">₹85 / Million Tokens</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Latency</span>
          <div className="text-xl font-black text-white mt-1">
            {metrics?.avgResponseTime || 0} ms
          </div>
          <span className="text-[10px] text-emerald-400 mt-0.5 block font-semibold">Low-latency Edge</span>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Inference Audit Trail</h3>
          <span className="text-xs text-slate-400">Showing recent executions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="px-4 py-3">Feature & Intent</th>
                <th className="px-4 py-3">Tenant Store</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Tokens</th>
                <th className="px-4 py-3">Latency</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span>Loading inference logs...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No AI usage recorded yet for this criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>{log.feature || "AI Employee Assistant"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-indigo-300">
                      {log.businesses?.name || "Sri Lakshmi Enterprises"}
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                      {log.model || "gemini-3.6-flash"}
                    </td>
                    <td className="px-4 py-3 font-bold text-white">
                      {Number(log.total_tokens || log.tokens_used || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-[11px]">
                      {log.response_time || 450} ms
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {log.status || "success"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400 text-[11px]">
                      {new Date(log.created_at || Date.now()).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AdminAiUsagePage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Loading AI usage...</div>}>
      <AiUsageContent />
    </Suspense>
  );
}
