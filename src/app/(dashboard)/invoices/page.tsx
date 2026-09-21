"use client";

import React, { useState } from "react";
import { Invoice } from "@/types/sales";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DetailPanel } from "@/components/ui/detail-panel";
import { useToast } from "@/components/ui/toast";
import { formatIndianCurrency, formatShortDate } from "@/lib/utils";
import { ExportService } from "@/lib/services/export";
import { useAuth } from "@/context/auth-context";
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
  Download,
  Share2,
} from "lucide-react";

import { useInvoices } from "@/hooks/use-invoices";
import { useCustomers } from "@/hooks/use-customers";
import { useProducts } from "@/hooks/use-products";

export default function InvoicesPage() {
  const { business } = useAuth();
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

  // Sync default selection when customers or products load
  React.useEffect(() => {
    if (!selectedCustomerId && customers.length > 0) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [customers, selectedCustomerId]);

  React.useEffect(() => {
    if (!selectedProductId && products.length > 0) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

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

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            onClick={() => {
              const csv = ExportService.generateCSV(invoices, [
                { header: "Invoice Number", key: "invoiceNumber" },
                { header: "Customer Name", key: "customerName" },
                { header: "Date", key: "date" },
                { header: "Due Date", key: "dueDate" },
                { header: "Grand Total (₹)", key: "grandTotal" },
                { header: "Balance Due (₹)", key: "balanceDue" },
                { header: "Status", key: "paymentStatus" },
              ]);
              ExportService.downloadCSV(csv, `Tax_Invoices_${new Date().toISOString().split("T")[0]}`);
              success("Invoices CSV downloaded!");
            }}
            className="font-semibold"
          >
            <Download className="w-4 h-4 mr-1.5" />
            <span>Export CSV</span>
          </Button>

          <Button onClick={() => setIsCreateOpen(true)} className="font-semibold">
            <Plus className="w-4 h-4 mr-2" />
            <span>New Tax Invoice</span>
          </Button>
        </div>
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
              <span>Print A4 Invoice</span>
            </Button>
            <Button
              variant="primary"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                if (!selectedInvoice) return;
                const phone = selectedInvoice.customerPhone || "9842109876";
                const msg = `Dear ${selectedInvoice.customerName},\nYour invoice ${selectedInvoice.invoiceNumber} for ${formatIndianCurrency(selectedInvoice.grandTotal)} is generated by ${business?.name || "GrowthEngine"}.\nBalance Due: ${formatIndianCurrency(selectedInvoice.balanceDue)}.\nThank you!`;
                window.open(ExportService.getWhatsAppUrl(phone, msg), "_blank");
                success(`WhatsApp link opened for ${selectedInvoice.customerName}`);
              }}
            >
              <Share2 className="w-4 h-4 mr-1.5" />
              <span>WhatsApp Invoice</span>
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
              {customers.length === 0 ? (
                <option value="">No registered customers found</option>
              ) : (
                customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city})
                  </option>
                ))
              )}
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
              {products.length === 0 ? (
                <option value="">No products in catalog</option>
              ) : (
                products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatIndianCurrency(p.sellingPrice)}
                  </option>
                ))
              )}
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

      {/* Hidden during screen, displayed exclusively during window.print() */}
      {selectedInvoice && (
        <div className="hidden print:block printable-invoice-container p-6 bg-white text-slate-900 font-sans">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                {business?.name || "GrowthEngine Enterprise"}
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                {business?.address || "142 Trichy Road, Singanallur"}, {business?.city || "Coimbatore"}, {business?.state || "Tamil Nadu"}
              </p>
              <p className="text-xs text-slate-600">
                Phone: +91 {business?.phone || "98401 23456"} • GSTIN: <strong className="font-mono">{business?.gstin || "33AAAAA0000A1Z5"}</strong>
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white font-bold text-xs uppercase rounded">
                TAX INVOICE
              </span>
              <p className="text-sm font-black font-mono mt-1">{selectedInvoice.invoiceNumber}</p>
              <p className="text-xs text-slate-500">Date: {selectedInvoice.date}</p>
              <p className="text-xs text-slate-500">Due Date: {selectedInvoice.dueDate}</p>
            </div>
          </div>

          {/* Bill To */}
          <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs mb-4">
            <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Billed To:
            </span>
            <p className="text-sm font-bold text-slate-900">{selectedInvoice.customerName}</p>
            <p className="text-slate-600">GSTIN: {selectedInvoice.customerGstin || "Unregistered / Consumer"}</p>
            <p className="text-slate-600">Place of Supply: Tamil Nadu (33)</p>
          </div>

          {/* Line Items Table */}
          <table className="w-full text-left text-xs mb-4 border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-300 text-slate-700">
                <th className="py-2">Item Description</th>
                <th className="py-2 text-center">HSN</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Rate</th>
                <th className="py-2 text-right">Taxable</th>
                <th className="py-2 text-right">GST %</th>
                <th className="py-2 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {selectedInvoice.items.map((it) => (
                <tr key={it.id}>
                  <td className="py-2 font-medium">{it.name}</td>
                  <td className="py-2 text-center font-mono text-slate-600">{it.hsn || "8413"}</td>
                  <td className="py-2 text-right">{it.quantity} {it.unit}</td>
                  <td className="py-2 text-right">{formatIndianCurrency(it.rate)}</td>
                  <td className="py-2 text-right">{formatIndianCurrency(it.taxableAmount)}</td>
                  <td className="py-2 text-right">{it.gstRate}%</td>
                  <td className="py-2 text-right font-bold">{formatIndianCurrency(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Tax Summary & Bank Details */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 text-xs">
            <div>
              <p className="font-bold text-slate-700 uppercase mb-1">Bank & Payment Details</p>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-0.5 text-[11px]">
                <p>Bank: <strong className="text-slate-900">HDFC Bank, SME Branch</strong></p>
                <p>Account No: <strong className="font-mono text-slate-900">50200084729104</strong></p>
                <p>IFSC Code: <strong className="font-mono text-slate-900">HDFC0001234</strong></p>
                <p>UPI ID: <strong className="text-[#4F46E5]">growthengine@hdfcbank</strong></p>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                * Scan or transfer to settle balance before due date.
              </p>
            </div>

            <div className="space-y-1.5 text-right">
              <div className="flex justify-between">
                <span className="text-slate-600">Taxable Value:</span>
                <span>{formatIndianCurrency(selectedInvoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">CGST (9%):</span>
                <span>{formatIndianCurrency(selectedInvoice.totalGst / 2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">SGST (9%):</span>
                <span>{formatIndianCurrency(selectedInvoice.totalGst / 2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-300 font-black text-sm">
                <span>Total Amount:</span>
                <span className="text-[#4F46E5]">{formatIndianCurrency(selectedInvoice.grandTotal)}</span>
              </div>
              {selectedInvoice.balanceDue > 0 && (
                <div className="flex justify-between font-bold text-xs text-rose-600">
                  <span>Balance Due:</span>
                  <span>{formatIndianCurrency(selectedInvoice.balanceDue)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Signature */}
          <div className="mt-12 pt-4 border-t border-slate-200 flex justify-between items-end text-xs">
            <p className="text-slate-500 text-[10px]">
              This is a computer-generated tax invoice verified under GST Act 2017.
            </p>
            <div className="text-center">
              <div className="w-36 border-b border-slate-400 mb-1"></div>
              <p className="font-bold text-slate-800">Authorized Signatory</p>
              <p className="text-[10px] text-slate-500">{business?.name || "GrowthEngine"}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
