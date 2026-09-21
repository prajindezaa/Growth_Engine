"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatIndianCurrency } from "@/lib/utils";
import { ExportService } from "@/lib/services/export";
import { FileText, Plus, Search, Send, Download, Printer } from "lucide-react";
import Link from "next/link";

export default function QuotationsPage() {
  const [search, setSearch] = useState("");

  const quotes = [
    {
      id: "qt_01",
      quoteNumber: "QT-2026-0041",
      customerName: "Ravi Traders",
      date: "2026-09-18",
      validUntil: "2026-09-25",
      amount: 42500,
      status: "sent",
      itemsCount: 3,
    },
    {
      id: "qt_02",
      quoteNumber: "QT-2026-0042",
      customerName: "Kavitha Electricals",
      date: "2026-09-20",
      validUntil: "2026-09-27",
      amount: 18900,
      status: "accepted",
      itemsCount: 2,
    },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Quotations & Estimates
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Create price estimates, share via WhatsApp, and convert to invoices
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            onClick={() => {
              const csv = ExportService.generateCSV(quotes, [
                { header: "Quote Number", key: "quoteNumber" },
                { header: "Customer Name", key: "customerName" },
                { header: "Date", key: "date" },
                { header: "Valid Until", key: "validUntil" },
                { header: "Amount (₹)", key: "amount" },
                { header: "Status", key: "status" },
              ]);
              ExportService.downloadCSV(csv, `Quotations_${new Date().toISOString().split("T")[0]}`);
            }}
            className="font-semibold text-xs h-9"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Export CSV</span>
          </Button>

          <Link href="/invoices">
            <Button className="font-semibold text-xs h-9">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              <span>Draft New Estimate</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {quotes.map((q) => (
          <Card key={q.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-[#4F46E5]">{q.quoteNumber}</span>
                <Badge variant={q.status === "accepted" ? "success" : "neutral"}>
                  {q.status}
                </Badge>
              </div>
              <h3 className="font-bold text-slate-900 text-sm mt-1">{q.customerName}</h3>
              <p className="text-xs text-slate-500">Date: {q.date} • Valid until: {q.validUntil}</p>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <span className="text-base font-black text-slate-900">{formatIndianCurrency(q.amount)}</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const msg = `Vanakkam ${q.customerName},\nHere is your quotation ${q.quoteNumber} totaling ${formatIndianCurrency(q.amount)}.\nValid until ${q.validUntil}.`;
                  window.open(ExportService.getWhatsAppUrl("9842109876", msg), "_blank");
                }}
              >
                <Send className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                <span>WhatsApp</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
