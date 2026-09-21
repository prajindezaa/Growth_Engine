"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/context/auth-context";
import { Layers, CheckCircle2, AlertCircle, RefreshCw, Shield, ArrowUpRight, DollarSign } from "lucide-react";

function SubscriptionsContent() {
  const { session } = useAuth();
  const [plans, setPlans] = useState([
    { id: "free", name: "Free Starter", price: "₹0", aiLimit: "50 req / mo", users: "Up to 2 users" },
    { id: "basic", name: "Basic Growth", price: "₹999 / mo", aiLimit: "250 req / mo", users: "Up to 5 users" },
    { id: "pro", name: "Pro Business", price: "₹2,499 / mo", aiLimit: "1,000 req / mo", users: "Up to 15 users", popular: true },
    { id: "enterprise", name: "Enterprise Unlimited", price: "₹6,999 / mo", aiLimit: "10,000 req / mo", users: "Unlimited" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-400" />
            <span>Subscriptions & Plans</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configurable MSME SaaS subscription tiers, automated billing limits, and active licenses.
          </p>
        </div>
      </div>

      {/* Plans Tier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => (
          <div
            key={p.id}
            className={`p-5 rounded-2xl border bg-slate-900/90 flex flex-col justify-between ${
              p.popular ? "border-indigo-500 ring-1 ring-indigo-500/50 shadow-xl shadow-indigo-500/10" : "border-slate-800"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{p.name}</span>
                {p.popular && (
                  <span className="text-[10px] font-bold bg-indigo-500 text-white px-2 py-0.5 rounded-full">
                    POPULAR
                  </span>
                )}
              </div>
              <div className="text-2xl font-black text-white mt-2">{p.price}</div>
              <div className="mt-4 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{p.aiLimit}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{p.users}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>PostgreSQL Tenant RLS</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => alert(`Configuring tier: ${p.name}`)}
              className="mt-6 w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl transition-colors border border-slate-700"
            >
              Configure Limits
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminSubscriptionsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Loading subscriptions...</div>}>
      <SubscriptionsContent />
    </Suspense>
  );
}
