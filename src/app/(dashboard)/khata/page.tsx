"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomers } from "@/hooks/use-customers";
import { usePayments } from "@/hooks/use-payments";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DetailPanel } from "@/components/ui/detail-panel";
import { useToast } from "@/components/ui/toast";
import { formatIndianCurrency } from "@/lib/utils";
import { ExportService } from "@/lib/services/export";
import { useAuth } from "@/context/auth-context";
import {
  BookOpen,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Send,
  PlusCircle,
  Phone,
  Filter,
  Download,
  Share2,
} from "lucide-react";

export default function KhataPage() {
  const { business } = useAuth();
  const { customers, totalKhataReceivables, totalOverdueAmount, updateCustomer } = useCustomers();
  const { recordPayment } = usePayments();
  const { success, error } = useToast();

  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  // Quick transaction modal
  const [isTxOpen, setIsTxOpen] = useState(false);
  const [txType, setTxType] = useState<"give" | "got">("give");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const filtered = customers.filter(
    (c) =>
      c.outstandingBalance > 0 &&
      (c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search))
  );

  const handleRecordTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !selectedCustomer) return;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      error("Please enter a valid positive amount");
      return;
    }

    await recordPayment({
      partyType: "customer",
      partyId: selectedCustomer.id,
      partyName: selectedCustomer.name,
      paymentType: txType === "give" ? "credit_issued" : "payment_received",
      amount: numAmount,
      paymentMethod: "cash",
      notes: note || undefined,
    });

    const delta = txType === "give" ? numAmount : -numAmount;
    const newBal = Math.max(0, selectedCustomer.outstandingBalance + delta);
    updateCustomer(selectedCustomer.id, { outstandingBalance: newBal });

    success(
      `Recorded ${txType === "give" ? "Credit Given (Udhar)" : "Payment Received (Jama)"} of ${formatIndianCurrency(
        numAmount
      )} for ${selectedCustomer.name}`
    );
    setIsTxOpen(false);
    setAmount("");
    setNote("");
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Khata & Outstanding Ledgers
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Credit tracking (உதார் / உளுக்கடை), overdue reminders, and payment collection
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() => {
            const csv = ExportService.generateCSV(filtered, [
              { header: "Party Name", key: "name" },
              { header: "Phone", key: "phone" },
              { header: "City", key: "city" },
              { header: "Outstanding Balance (₹)", key: "outstandingBalance" },
              { header: "Credit Limit (₹)", key: "creditLimit" },
              { header: "Status", key: "status" },
            ]);
            ExportService.downloadCSV(csv, `Khata_Receivables_${new Date().toISOString().split("T")[0]}`);
            success("Khata ledger CSV exported!");
          }}
          className="self-start sm:self-auto font-semibold"
        >
          <Download className="w-4 h-4 mr-1.5" />
          <span>Export Ledger CSV</span>
        </Button>
      </div>

      {/* Hero Financial Dominance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-rose-500 text-white rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-100">
            Total Khata Due (Receivables)
          </span>
          <div className="text-3xl sm:text-4xl font-black mt-1">
            {formatIndianCurrency(totalKhataReceivables)}
          </div>
          <p className="text-xs text-rose-100 mt-1">
            Money to collect from {filtered.length} customers
          </p>
        </div>

        <div className="bg-amber-500 text-white rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-100">
            Overdue Balance (&gt;7 Days)
          </span>
          <div className="text-3xl sm:text-4xl font-black mt-1">
            {formatIndianCurrency(totalOverdueAmount)}
          </div>
          <p className="text-xs text-amber-100 mt-1">
            Requires immediate follow-up via WhatsApp
          </p>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Filter Khata ledgers by customer name or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search className="w-4 h-4" />}
        className="bg-white"
      />

      {/* Parties List */}
      <div className="space-y-3">
        {filtered.map((cust) => (
          <Card
            key={cust.id}
            hoverable
            onClick={() => setSelectedCustomer(cust)}
            className="flex items-center justify-between gap-3 py-3.5"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 font-bold flex items-center justify-center text-sm">
                {cust.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{cust.name}</h3>
                <p className="text-xs text-slate-500">
                  {cust.city} • Last: {cust.lastActive}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Pending Due
              </span>
              <span className="text-base sm:text-lg font-black text-rose-600">
                {formatIndianCurrency(cust.outstandingBalance)}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Customer Khata Detail Sheet */}
      <DetailPanel
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title={selectedCustomer?.name || "Khata Ledger"}
        subtitle={`Phone: +91 ${selectedCustomer?.phone}`}
        footerActions={
          <div className="flex items-center gap-2 w-full">
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                setTxType("give");
                setIsTxOpen(true);
              }}
            >
              <ArrowUpRight className="w-4 h-4 mr-1" />
              <span>Gave Credit (Udhar)</span>
            </Button>
            <Button
              variant="primary"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                setTxType("got");
                setIsTxOpen(true);
              }}
            >
              <ArrowDownLeft className="w-4 h-4 mr-1" />
              <span>Got Payment (Jama)</span>
            </Button>
          </div>
        }
      >
        {selectedCustomer && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
              <span className="text-xs font-bold text-rose-800 uppercase">Total Outstanding</span>
              <div className="text-3xl font-black text-rose-600 mt-1">
                {formatIndianCurrency(selectedCustomer.outstandingBalance)}
              </div>
            </div>

            <Button
              variant="secondary"
              className="w-full text-xs font-semibold"
              onClick={() => {
                const msg = `Vanakkam ${selectedCustomer.name},\nThis is a gentle payment reminder from ${business?.name || "GrowthEngine"}.\nYour pending ledger balance is ${formatIndianCurrency(selectedCustomer.outstandingBalance)}.\nPlease settle via UPI: growthengine@hdfcbank.\nThank you!`;
                window.open(ExportService.getWhatsAppUrl(selectedCustomer.phone, msg), "_blank");
                success(`WhatsApp reminder link opened for ${selectedCustomer.name}`);
              }}
            >
              <Share2 className="w-4 h-4 mr-2 text-emerald-600" />
              <span>Send UPI Payment Reminder via WhatsApp</span>
            </Button>

            <div className="pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Transaction History
              </h4>
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-800">Materials Bill #881</p>
                  <p className="text-[10px] text-slate-400">12 Sep 2026</p>
                </div>
                <span className="font-black text-rose-600">+₹65,000</span>
              </div>
            </div>
          </div>
        )}
      </DetailPanel>

      {/* Record Transaction Modal */}
      <DetailPanel
        isOpen={isTxOpen}
        onClose={() => setIsTxOpen(false)}
        title={txType === "give" ? "Record Credit (Udhar Diya)" : "Record Payment (Jama Mila)"}
        subtitle={`Party: ${selectedCustomer?.name}`}
        footerActions={
          <div className="flex items-center gap-2 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => setIsTxOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={txType === "give" ? "destructive" : "primary"}
              className={`flex-1 ${txType === "got" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
              onClick={handleRecordTx}
            >
              Save Entry
            </Button>
          </div>
        }
      >
        <form onSubmit={handleRecordTx} className="space-y-4">
          <Input
            label="Amount (₹) *"
            type="number"
            placeholder="e.g. 5000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Remarks / Note (Optional)"
            placeholder="e.g. UPI Ref, cash, or invoice number"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </form>
      </DetailPanel>

    </div>
  );
}
