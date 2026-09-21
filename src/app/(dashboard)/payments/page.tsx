"use client";

import { useState } from "react";
import { usePayments } from "@/hooks/use-payments";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatIndianCurrency } from "@/lib/utils";
import { ExportService } from "@/lib/services/export";
import { CreditCard, Plus, Download, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function PaymentsPage() {
  const { payments } = usePayments();

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Payments & Collections
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Cash, UPI, and Bank settlements across customers and suppliers
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            onClick={() => {
              const csv = ExportService.generateCSV(payments, [
                { header: "Payment ID", key: "id" },
                { header: "Party Name", key: "partyName" },
                { header: "Type", key: "paymentType" },
                { header: "Amount (₹)", key: "amount" },
                { header: "Method", key: "paymentMethod" },
                { header: "Reference", key: "referenceNumber" },
              ]);
              ExportService.downloadCSV(csv, `Payments_${new Date().toISOString().split("T")[0]}`);
            }}
            className="font-semibold text-xs h-9"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Export CSV</span>
          </Button>

          <Link href="/khata">
            <Button className="font-semibold text-xs h-9">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              <span>Record Payment</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {payments.map((p) => (
          <Card key={p.id} className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                p.paymentType === "payment_received" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              }`}>
                {p.paymentType === "payment_received" ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{p.partyName}</h3>
                <p className="text-xs text-slate-500">
                  Mode: <span className="uppercase font-semibold">{p.paymentMethod}</span> • Ref: {p.referenceNumber || "Direct"}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className={`text-base font-black ${
                p.paymentType === "payment_received" ? "text-emerald-600" : "text-rose-600"
              }`}>
                {p.paymentType === "payment_received" ? `+${formatIndianCurrency(p.amount)}` : `-${formatIndianCurrency(p.amount)}`}
              </span>
              <Badge variant={p.paymentType === "payment_received" ? "success" : "warning"} className="text-[10px]">
                {p.paymentType === "payment_received" ? "Received" : "Paid Out"}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
