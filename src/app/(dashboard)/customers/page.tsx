"use client";

import React, { useState } from "react";
import { useCustomers } from "@/hooks/use-customers";
import { Customer } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DetailPanel } from "@/components/ui/detail-panel";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useToast } from "@/components/ui/toast";
import { formatIndianCurrency } from "@/lib/utils";
import { ExportService } from "@/lib/services/export";
import {
  Search,
  UserPlus,
  Phone,
  Send,
  CreditCard,
  Building2,
  Calendar,
  AlertCircle,
  Check,
  Download,
} from "lucide-react";

export default function CustomersPage() {
  const {
    customers,
    searchQuery,
    setSearchQuery,
    filter,
    setFilter,
    addCustomer,
    updateCustomer,
    totalKhataReceivables,
  } = useCustomers();

  const { success } = useToast();

  // Selected customer for DetailPanel
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Add Customer modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newGstin, setNewGstin] = useState("");
  const [newCreditLimit, setNewCreditLimit] = useState("100000");

  // Confirmation dialog state
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;

    addCustomer({
      name: newName,
      phone: newPhone,
      city: newCity || "Local",
      gstin: newGstin || undefined,
      outstandingBalance: 0,
      creditLimit: Number(newCreditLimit) || 50000,
      status: "settled",
    });

    success(`Customer "${newName}" added successfully`);
    setIsAddOpen(false);
    setNewName("");
    setNewPhone("");
    setNewCity("");
    setNewGstin("");
  };

  const handleSendReminder = () => {
    if (!selectedCustomer) return;
    setReminderDialogOpen(false);
    success(`WhatsApp payment reminder sent to ${selectedCustomer.name} (${selectedCustomer.phone})`);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Customers & Khata
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage parties, credit limits, and outstanding ledger balances
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            onClick={() => {
              const csv = ExportService.generateCSV(customers, [
                { header: "Party / Customer Name", key: "name" },
                { header: "Phone", key: "phone" },
                { header: "City", key: "city" },
                { header: "GSTIN", key: "gstin" },
                { header: "Outstanding Balance (₹)", key: "outstandingBalance" },
                { header: "Credit Limit (₹)", key: "creditLimit" },
                { header: "Status", key: "status" },
              ]);
              ExportService.downloadCSV(csv, `Customers_Directory_${new Date().toISOString().split("T")[0]}`);
              success("Customers CSV exported!");
            }}
            className="font-semibold"
          >
            <Download className="w-4 h-4 mr-1.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            onClick={() => setIsAddOpen(true)}
            className="font-semibold"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            <span>Add Customer</span>
          </Button>
        </div>
      </div>

      {/* Hero Summary Badge */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Outstanding Khata
          </span>
          <div className="text-2xl font-extrabold text-rose-600">
            {formatIndianCurrency(totalKhataReceivables)}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {(["all", "overdue", "active", "settled"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                filter === f
                  ? "bg-[#4F46E5] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f === "all" ? "All Customers" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Input
          placeholder="Search by party name, phone number, or city..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          className="bg-white"
        />
      </div>

      {/* Customer Cards List (Mobile-Optimized Touch Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {customers.map((cust) => (
          <Card
            key={cust.id}
            hoverable
            onClick={() => setSelectedCustomer(cust)}
            className="flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{cust.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{cust.city} • {cust.phone}</p>
                </div>
                <Badge
                  variant={
                    cust.status === "overdue"
                      ? "danger"
                      : cust.status === "active"
                      ? "warning"
                      : "neutral"
                  }
                >
                  {cust.status === "overdue"
                    ? "Overdue"
                    : cust.status === "active"
                    ? "Active Due"
                    : "Settled"}
                </Badge>
              </div>

              {cust.gstin && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>GST: {cust.gstin}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Outstanding Balance
                </span>
                <div
                  className={`text-base font-extrabold ${
                    cust.outstandingBalance > 0 ? "text-rose-600" : "text-emerald-700"
                  }`}
                >
                  {formatIndianCurrency(cust.outstandingBalance)}
                </div>
              </div>

              <span className="text-xs font-semibold text-[#4F46E5] group-hover:underline">
                View Ledger →
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Customer DetailPanel (Slide-in right on desktop, bottom sheet on mobile) */}
      <DetailPanel
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title={selectedCustomer?.name || "Customer Details"}
        subtitle={`Party ID: ${selectedCustomer?.id} • ${selectedCustomer?.city}`}
        footerActions={
          <div className="flex items-center gap-2 w-full">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                window.open(`tel:${selectedCustomer?.phone}`);
              }}
            >
              <Phone className="w-4 h-4 mr-1.5 text-slate-600" />
              <span>Call</span>
            </Button>

            {selectedCustomer && selectedCustomer.outstandingBalance > 0 && (
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => setReminderDialogOpen(true)}
              >
                <Send className="w-4 h-4 mr-1.5" />
                <span>WhatsApp Reminder</span>
              </Button>
            )}
          </div>
        }
      >
        {selectedCustomer && (
          <div className="space-y-4">
            
            {/* Hero Outstanding Banner */}
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">
                Current Due Balance (Khata)
              </span>
              <div className="text-3xl font-black text-rose-600 mt-1">
                {formatIndianCurrency(selectedCustomer.outstandingBalance)}
              </div>
              <p className="text-xs text-rose-700 mt-1">
                Credit Limit: {formatIndianCurrency(selectedCustomer.creditLimit)}
              </p>
            </div>

            {/* Information Grid */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/50">
                <span className="text-slate-500 font-medium">Phone Number</span>
                <span className="font-semibold text-slate-900">+91 {selectedCustomer.phone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/50">
                <span className="text-slate-500 font-medium">City / State</span>
                <span className="font-semibold text-slate-900">{selectedCustomer.city}, TN</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/50">
                <span className="text-slate-500 font-medium">GSTIN</span>
                <span className="font-mono font-semibold text-slate-900">
                  {selectedCustomer.gstin || "Unregistered Consumer"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Last Activity</span>
                <span className="font-semibold text-slate-900">{selectedCustomer.lastActive}</span>
              </div>
            </div>

            {/* Mini Ledger Activity */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Recent Ledger Transactions
              </h4>
              <div className="space-y-2">
                <div className="p-3 rounded-xl border border-slate-200 bg-white flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-800">Invoice #INV-2026-881</span>
                    <p className="text-[10px] text-slate-400">12 Sep 2026 • Credit given</p>
                  </div>
                  <span className="font-extrabold text-rose-600">+₹65,000</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-white flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-800">Payment Recd (UPI)</span>
                    <p className="text-[10px] text-slate-400">01 Sep 2026 • Paid via GPay</p>
                  </div>
                  <span className="font-extrabold text-emerald-600">-₹50,000</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </DetailPanel>

      {/* Add Customer Slide-over / Modal */}
      <DetailPanel
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Customer"
        subtitle="Register customer details & set credit limit"
        footerActions={
          <div className="flex items-center gap-2 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleCreateCustomer}>
              Save Customer
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <Input
            label="Party / Business Name *"
            placeholder="e.g. Sri Murugan Agencies"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <Input
            label="Phone Number *"
            placeholder="10-digit mobile number"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            required
          />
          <Input
            label="City / Town"
            placeholder="e.g. Tiruppur"
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
          />
          <Input
            label="GSTIN (Optional)"
            placeholder="33AAAAA0000A1Z5"
            value={newGstin}
            onChange={(e) => setNewGstin(e.target.value)}
          />
          <Input
            label="Credit Limit (₹)"
            type="number"
            value={newCreditLimit}
            onChange={(e) => setNewCreditLimit(e.target.value)}
          />
        </form>
      </DetailPanel>

      {/* Reminder Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={reminderDialogOpen}
        onClose={() => setReminderDialogOpen(false)}
        onConfirm={handleSendReminder}
        title="Send Payment Reminder?"
        description={`This will send a WhatsApp message with payment QR link to ${selectedCustomer?.name} for the balance of ${formatIndianCurrency(
          selectedCustomer?.outstandingBalance || 0
        )}.`}
        confirmLabel="Send on WhatsApp"
        variant="primary"
      />

    </div>
  );
}
