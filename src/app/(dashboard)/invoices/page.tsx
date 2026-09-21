"use client";

import React, { useState } from "react";
import { Invoice } from "@/types/sales";
import { MOCK_INVOICES } from "@/lib/mock-sales";
import { MOCK_CUSTOMERS, MOCK_PRODUCTS } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DetailPanel } from "@/components/ui/detail-panel";
import { useToast } from "@/components/ui/toast";
import { formatIndianCurrency, formatShortDate } from "@/lib/utils";
import {
  FileText,
  Plus,
  Search,
  Printer,
  Send,
  CheckCircle2,
  AlertCircle,
  Building2,
  Trash2,
} from "lucide-react";

import { useInvoices } from "@/hooks/use-invoices";
import { useCustomers } from "@/hooks/use-customers";
import { useProducts } from "@/hooks/use-products";

export default function InvoicesPage() {
  const { invoices, search, setSearch, totalOutstanding, createInvoice, isLoading } = useInvoices();
  const { rawCustomers: customers } = useCustomers();
  const { rawProducts: products } = useProducts();

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { success } = useToast();

  // Create Invoice Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || "");
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || "");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");

  const filteredInvoices = invoices;

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find((c) => c.id === selectedCustomerId) || customers[0];
    const product = products.find((p) => p.id === selectedProductId) || products[0];
    if (!customer || !product) return;

    const qty = Number(quantity) || 1;
    const taxableAmount = product.sellingPrice * qty;
    const gstAmount = taxableAmount * (product.gstRate / 100);
    const grandTotal = taxableAmount + gstAmount;

    await createInvoice({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerGstin: customer.gstin,
      items: [
        {
          id: `item_${Date.now()}`,
          productId: product.id,
          name: product.name,
          hsn: product.hsn,
          quantity: qty,
          unit: product.unit,
          rate: product.sellingPrice,
          gstRate: product.gstRate,
          taxableAmount,
          gstAmount,
          total: grandTotal,
        },
      ],
      subtotal: taxableAmount,
      totalGst: gstAmount,
      grandTotal,
      amountPaid: 0,
      paymentStatus: "unpaid",
      type: "tax_invoice",
      notes: notes || "Standard terms: 7 days payment",
    });

    success("Tax Invoice created with atomic DB number!");
    setIsCreateOpen(false);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            GST Tax Invoices
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            B2B & B2C tax invoices, HSN GST compliance, and payment follow-ups
          </p>
        </div>

        <Button onClick={() => setIsCreateOpen(true)} className="self-start sm:self-auto font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          <span>New Tax Invoice</span>
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Unpaid Invoice Receivables
          </span>
          <div className="text-2xl font-extrabold text-rose-600">
            {formatIndianCurrency(totalOutstanding)}
          </div>
        </div>
        <div className="text-xs text-slate-500">
          Showing {filteredInvoices.length} invoices
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Search invoice number or customer name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search className="w-4 h-4" />}
        className="bg-white"
      />

      {/* Invoices List */}
      <div className="space-y-3">
        {filteredInvoices.map((inv) => (
          <Card
            key={inv.id}
            hoverable
            onClick={() => setSelectedInvoice(inv)}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#4F46E5] font-mono">
                  {inv.invoiceNumber}
                </span>
                <Badge
                  variant={
                    inv.paymentStatus === "paid"
                      ? "success"
                      : inv.paymentStatus === "overdue"
                      ? "danger"
                      : "warning"
                  }
                >
                  {inv.paymentStatus === "paid"
                    ? "Paid"
                    : inv.paymentStatus === "overdue"
                    ? "Overdue"
                    : "Partial / Due"}
                </Badge>
              </div>

              <h3 className="text-sm font-bold text-slate-900 mt-1">{inv.customerName}</h3>
              <p className="text-xs text-slate-500">
                Date: {formatShortDate(inv.date)} • Due: {formatShortDate(inv.dueDate)}
              </p>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
              <div className="text-right">
                <span className="text-sm sm:text-base font-black text-slate-900 block">
                  {formatIndianCurrency(inv.grandTotal)}
                </span>
                {inv.balanceDue > 0 && (
                  <span className="text-[11px] font-bold text-rose-600 block">
                    Due: {formatIndianCurrency(inv.balanceDue)}
                  </span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Invoice DetailPanel & Printable View */}
      <DetailPanel
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title={selectedInvoice?.invoiceNumber || "Tax Invoice"}
        subtitle={`Issued to ${selectedInvoice?.customerName}`}
        footerActions={
          <div className="flex items-center gap-2 w-full">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                success(`Printing ${selectedInvoice?.invoiceNumber}`);
                window.print();
              }}
            >
              <Printer className="w-4 h-4 mr-1.5" />
              <span>Print / PDF</span>
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => {
                success(`Invoice link shared on WhatsApp with ${selectedInvoice?.customerName}`);
              }}
            >
              <Send className="w-4 h-4 mr-1.5" />
              <span>Share Invoice</span>
            </Button>
          </div>
        }
      >
        {selectedInvoice && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Date:</span>
                <span className="font-bold text-slate-900">{selectedInvoice.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Due Date:</span>
                <span className="font-bold text-slate-900">{selectedInvoice.dueDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer GSTIN:</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedInvoice.customerGstin || "Unregistered"}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Line Items (HSN & GST 18%)
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {selectedInvoice.items.map((it) => (
                  <div key={it.id} className="p-3 bg-white text-xs">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>{it.name}</span>
                      <span>{formatIndianCurrency(it.total)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                      <span>
                        HSN {it.hsn} • {it.quantity} {it.unit} × {formatIndianCurrency(it.rate)}
                      </span>
                      <span>GST: {formatIndianCurrency(it.gstAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Breakdown */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Amount</span>
                <span>{formatIndianCurrency(selectedInvoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total GST (18%)</span>
                <span>{formatIndianCurrency(selectedInvoice.totalGst)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Grand Total</span>
                <span className="text-[#4F46E5]">{formatIndianCurrency(selectedInvoice.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-rose-600">
                <span>Balance Due</span>
                <span>{formatIndianCurrency(selectedInvoice.balanceDue)}</span>
              </div>
            </div>
          </div>
        )}
      </DetailPanel>

      {/* Create Invoice Drawer */}
      <DetailPanel
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Tax Invoice"
        subtitle="Generate GST compliant B2B/B2C invoice"
        footerActions={
          <div className="flex items-center gap-2 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleCreateInvoice}>
              Generate Invoice
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 tracking-wide mb-1.5 block">
              Select Customer / Party *
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#4F46E5]"
            >
              {MOCK_CUSTOMERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 tracking-wide mb-1.5 block">
              Select Product *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#4F46E5]"
            >
              {MOCK_PRODUCTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatIndianCurrency(p.sellingPrice)}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Quantity *"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />

          <Input
            label="Invoice Notes / Payment Terms"
            placeholder="e.g. Due within 7 days, delivery via lorry"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </form>
      </DetailPanel>

    </div>
  );
}
