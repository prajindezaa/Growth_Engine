"use client";

import React, { useState } from "react";
import { Headphones, CheckCircle2, Clock } from "lucide-react";

export default function AdminSupportPage() {
  const [tickets] = useState([
    { id: "T-101", user: "Sri Lakshmi Enterprises", subject: "Thermal printer 58mm alignment", priority: "medium", status: "open", time: "1h ago" },
    { id: "T-102", user: "Murugan Traders", subject: "GST tax invoice reverse charge question", priority: "low", status: "resolved", time: "1d ago" },
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Headphones className="w-6 h-6 text-indigo-400" />
          <span>Support & Help Tickets</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">Customer service inquiries and technical assistance requests</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden divide-y divide-slate-800">
        {tickets.map((t) => (
          <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-800/40">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-indigo-400">{t.id}</span>
                <span className="text-xs font-bold text-white">{t.subject}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">{t.user} • Priority: {t.priority}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                t.status === "open" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              }`}>
                {t.status}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">{t.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
