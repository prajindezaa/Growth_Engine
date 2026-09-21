"use client";

import React from "react";
import { CreditCard } from "lucide-react";

export default function AdminExpensesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-indigo-400" />
          <span>Expenses & Store Overheads</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">Operating expenses, rent, freight, and utility records</p>
      </div>
      <div className="p-12 text-center text-slate-500 rounded-2xl border border-slate-800 bg-slate-900/60">
        Operational overheads are synced from store financial logs.
      </div>
    </div>
  );
}
