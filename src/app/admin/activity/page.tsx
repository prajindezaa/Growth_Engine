"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/context/auth-context";
import { Activity, ShieldCheck, Zap, User, Clock } from "lucide-react";

function ActivityContent() {
  const { session } = useAuth();
  const [logs, setLogs] = useState<any[]>([
    { id: "1", action: "User Session Authenticated", actor: "prajindezaa142@gmail.com", type: "auth", time: "Just now" },
    { id: "2", action: "Super Admin Control Plane Opened", actor: "prajindezaa142@gmail.com", type: "security", time: "2m ago" },
    { id: "3", action: "Business Setup Initialized", actor: "Store Owner", type: "business", time: "15m ago" },
    { id: "4", action: "AI Assistant Query Dispatched", actor: "Cashier", type: "ai", time: "32m ago" },
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Activity className="w-6 h-6 text-indigo-400" />
          <span>Platform Activity & Audit Stream</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">Immutable audit logs of security, logins, transactions, and tenant operations</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 divide-y divide-slate-800 overflow-hidden">
        {logs.map((log) => (
          <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-indigo-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">{log.action}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Actor: {log.actor}</div>
              </div>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">{log.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminActivityPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Loading activity...</div>}>
      <ActivityContent />
    </Suspense>
  );
}
