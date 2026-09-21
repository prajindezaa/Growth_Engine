"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { StatsCard } from "@/components/ui/stats-card";
import { Badge } from "@/components/ui/badge";
import { formatIndianCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ExportService } from "@/lib/services/export";
import {
  TrendingUp,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  FileSpreadsheet,
  Download,
  Printer,
} from "lucide-react";

export default function ReportsPage() {
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");

  const monthlySales = [
    { month: "Apr", sales: 420000, profit: 92000 },
    { month: "May", sales: 510000, profit: 114000 },
    { month: "Jun", sales: 480000, profit: 105000 },
    { month: "Jul", sales: 620000, profit: 142000 },
    { month: "Aug", sales: 740000, profit: 168000 },
    { month: "Sep (MTD)", sales: 384000, profit: 89000 },
  ];

  const maxSales = Math.max(...monthlySales.map((m) => m.sales));

  const taxSummary = {
    taxableTurnover: 2814000,
    outputGst: 506520, // 18% collected
    inputTaxCredit: 382400, // ITC paid on purchases
    netGstPayable: 124120, // To pay in GSTR-3B
  };

  const handleExportCSV = () => {
    const csv = ExportService.generateCSV(monthlySales, [
      { header: "Month", key: "month" },
      { header: "Gross Sales (₹)", key: "sales" },
      { header: "Gross Profit (₹)", key: "profit" },
    ]);
    ExportService.downloadCSV(csv, `GrowthEngine_Financial_Report_${period}_${new Date().toISOString().split("T")[0]}`);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Financial & Tax Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            GSTR-1, GSTR-3B estimations, sales analytics, and profit margins
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            className="font-semibold text-xs h-9"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
            className="font-semibold text-xs h-9"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            <span>Print PDF</span>
          </Button>

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setPeriod("month")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                period === "month" ? "bg-[#4F46E5] text-white shadow-xs" : "text-slate-600"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPeriod("quarter")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                period === "quarter" ? "bg-[#4F46E5] text-white shadow-xs" : "text-slate-600"
              }`}
            >
              Quarterly
            </button>
          </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          label="Gross Revenue (FY 26-27)"
          value={formatIndianCurrency(3154000)}
          subValue="Across 142 B2B invoices"
          trend={{ value: "+24% YoY", isPositive: true }}
          variant="success"
        />
        <StatsCard
          label="Estimated Gross Profit"
          value={formatIndianCurrency(710000)}
          subValue="Avg 22.5% margin"
          trend={{ value: "+3.2% vs last qtr", isPositive: true }}
          variant="default"
        />
        <StatsCard
          label="Net GST Payable"
          value={formatIndianCurrency(taxSummary.netGstPayable)}
          subValue="Due for Sep 2026 GSTR-3B"
          trend={{ value: "ITC claimed: ₹3.82L", isNeutral: true }}
          variant="warning"
        />
        <StatsCard
          label="Average Ticket Size"
          value={formatIndianCurrency(22200)}
          subValue="B2B wholesale bills"
          trend={{ value: "+8% vs Aug", isPositive: true }}
          variant="default"
        />
      </div>

      {/* Revenue Growth Bar Visualizer */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Revenue & Profit Trajectory</h3>
            <p className="text-[11px] text-slate-500">Monthly gross sales in INR</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#4F46E5]" />
              <span className="text-slate-600">Sales</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
              <span className="text-slate-600">Gross Profit</span>
            </span>
          </div>
        </div>

        {/* CSS Scaled Chart Bars */}
        <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end pt-4 pb-2 h-44">
          {monthlySales.map((m) => {
            const heightPercent = (m.sales / maxSales) * 100;
            const profitHeightPercent = (m.profit / maxSales) * 100;
            return (
              <div key={m.month} className="flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="w-full flex items-end justify-center gap-1 h-36">
                  {/* Sales Bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-1/2 bg-[#4F46E5] rounded-t-lg transition-all duration-300 relative group"
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap z-10 transition-opacity">
                      {formatIndianCurrency(m.sales)}
                    </div>
                  </div>
                  {/* Profit Bar */}
                  <div
                    style={{ height: `${profitHeightPercent}%` }}
                    className="w-1/2 bg-emerald-500 rounded-t-lg transition-all duration-300 relative group"
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap z-10 transition-opacity">
                      {formatIndianCurrency(m.profit)}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-slate-600 truncate w-full text-center">
                  {m.month}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* GST Tax Compliance & GSTR-3B Estimator */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-[#4F46E5]">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">GSTR-3B Tax Filing Summary (Estimated)</h3>
              <p className="text-[11px] text-slate-500">Auto-aggregated from Sales Invoices and Purchase Bills</p>
            </div>
          </div>
          <Badge variant="primary">GSTIN: 33AABCS1429B1ZB</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">Output GST (Sales)</span>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {formatIndianCurrency(taxSummary.outputGst)}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Collected from customer tax invoices</p>
          </div>

          <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200">
            <span className="text-emerald-700 font-medium">Input Tax Credit (Purchases)</span>
            <div className="text-base font-bold text-emerald-800 mt-0.5">
              -{formatIndianCurrency(taxSummary.inputTaxCredit)}
            </div>
            <p className="text-[10px] text-emerald-600 mt-0.5">Eligible 2B verified ITC</p>
          </div>

          <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200">
            <span className="text-amber-800 font-medium">Net Tax to Pay (Cash Ledger)</span>
            <div className="text-base font-black text-amber-700 mt-0.5">
              {formatIndianCurrency(taxSummary.netGstPayable)}
            </div>
            <p className="text-[10px] text-amber-700 mt-0.5">Due before 20th of next month</p>
          </div>
        </div>
      </Card>

    </div>
  );
}
