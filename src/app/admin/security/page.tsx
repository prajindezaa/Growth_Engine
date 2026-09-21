"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/context/auth-context";
import { ShieldCheck, Lock, AlertTriangle, Key, Terminal, RefreshCw, CheckCircle2 } from "lucide-react";

export default function AdminSecurityPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <span>Security & Access Control Hub</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Server-side authorization policies, Row Level Security isolation, and authenticated admin credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Active Super Admin Identity */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <Lock className="w-4 h-4" />
            <span>Authenticated Super Admin</span>
          </div>
          <div className="text-lg font-black text-white font-mono break-all">{user?.email}</div>
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800 text-xs text-slate-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Authorization Level:</span>
              <span className="font-bold text-emerald-400">super_admin</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Verification Source:</span>
              <span className="font-mono text-[11px] text-slate-200">Supabase JWT + admin_users table</span>
            </div>
          </div>
        </div>

        {/* Database RLS Isolation State */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            <span>Postgres Row Level Security (RLS)</span>
          </div>
          <div className="text-xs text-slate-300 leading-relaxed">
            Tenants are strictly isolated. Normal store users query through client libraries bounded by <code className="text-indigo-400 font-mono">is_business_member()</code>. Admin control queries operate via encrypted server-side handlers.
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Cross-tenant leakage prevention: ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
