"use client";

import React, { useEffect, useState, Suspense } from "react";
import { Bell, ShieldCheck, AlertCircle, Info } from "lucide-react";

export default function AdminNotificationsPage() {
  const [notifications] = useState([
    { id: "1", title: "New MSME Store Registered", desc: "A new business completed onboarding", time: "10m ago", type: "business" },
    { id: "2", title: "Super Admin Access Initialized", desc: "prajindezaa142@gmail.com authenticated", time: "1h ago", type: "security" },
    { id: "3", title: "Gemini Model Gateway Healthy", desc: "Low token latency observed across all routes", time: "2h ago", type: "ai" },
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Bell className="w-6 h-6 text-indigo-400" />
          <span>Admin Notifications & Alerts</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">Platform alerts, registrations, and operational warnings</p>
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (
          <div key={n.id} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-slate-800 text-indigo-400">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">{n.title}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{n.desc}</p>
              </div>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">{n.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
