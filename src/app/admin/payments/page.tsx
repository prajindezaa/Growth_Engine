"use client";

import React from "react";
import { Layers } from "lucide-react";

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Layers className="w-6 h-6 text-indigo-400" />
          <span>Payments Ledger</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">UPI QR dynamic settlements and counter cash receipts</p>
      </div>
      <div className="p-12 text-center text-slate-500 rounded-2xl border border-slate-800 bg-slate-900/60">
        Payments are automatically reconciled against customer Khata entries and invoices.
      </div>
    </div>
  );
}
