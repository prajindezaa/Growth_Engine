"use client";

import React, { useState } from "react";
import { useProducts } from "@/hooks/use-products";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatIndianCurrency } from "@/lib/utils";
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle2, Search } from "lucide-react";

import { useInvoices } from "@/hooks/use-invoices";
import { usePayments } from "@/hooks/use-payments";

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  unit?: string;
  gstRate?: number;
}

export default function POSPage() {
  const { products } = useProducts();
  const { createInvoice } = useInvoices();
  const { recordPayment } = usePayments();
  const { success, error } = useToast();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [customerName, setCustomerName] = useState("Walk-in Counter Customer");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi">("cash");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.sellingPrice,
          qty: 1,
          unit: product.unit || "Units",
          gstRate: product.gstRate || 18,
        },
      ];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item))
        .filter((item) => item.qty > 0)
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const gst = subtotal * 0.18;
  const grandTotal = subtotal + gst;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);

    try {
      const items = cart.map((item) => {
        const taxable = item.price * item.qty;
        const itemGst = taxable * ((item.gstRate || 18) / 100);
        return {
          productId: item.id,
          name: item.name,
          quantity: item.qty,
          unit: item.unit || "Units",
          rate: item.price,
          gstRate: item.gstRate || 18,
          taxableAmount: taxable,
          gstAmount: itemGst,
          total: taxable + itemGst,
        };
      });

      const inv = await createInvoice({
        customerId: "",
        customerName: customerName || "Walk-in Counter Customer",
        items,
        subtotal,
        totalGst: gst,
        grandTotal,
        amountPaid: grandTotal,
        paymentStatus: "paid",
        type: "pos_receipt",
        notes: `Counter sale via ${paymentMethod.toUpperCase()}`,
      });

      if (inv?.id) {
        await recordPayment({
          partyType: "customer",
          partyId: inv.customerId || inv.id,
          partyName: customerName || "Walk-in Counter Customer",
          paymentType: "payment_received",
          amount: grandTotal,
          paymentMethod: paymentMethod,
          invoiceId: inv.id,
          notes: "Instant POS counter payment",
        });
      }

      success(`POS Bill ${inv?.invoiceNumber || "issued"} paid & inventory updated!`);
      setCart([]);
    } catch (err: any) {
      error(err.message || "Failed to process POS checkout");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Fast POS Billing
          </h1>
          <p className="text-xs text-slate-500">Speed counter billing for retail & walk-ins</p>
        </div>
        <Badge variant="primary">Counter 01</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Product Selection Catalog */}
        <div className="lg:col-span-7 space-y-3">
          <Input
            placeholder="Search items or scan barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="bg-white"
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[600px] overflow-y-auto p-0.5">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="bg-white border border-slate-200/90 rounded-xl p-3 text-left hover:border-[#4F46E5] hover:shadow-sm active:scale-95 transition-all flex flex-col justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-2">{p.name}</h4>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{p.sku}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#4F46E5]">
                    {formatIndianCurrency(p.sellingPrice)}
                  </span>
                  <Plus className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Active Cart / Bill Summary */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Current Bill
            </span>
            <span className="text-xs font-semibold text-slate-400">{cart.length} items</span>
          </div>

          {/* Cart items */}
          <div className="divide-y divide-slate-100 max-h-[280px] overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                Tap any product on the left to add to bill
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {formatIndianCurrency(item.price)} × {item.qty}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold w-5 text-center">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="text-xs font-bold text-slate-900 w-16 text-right">
                    {formatIndianCurrency(item.price * item.qty)}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Totals */}
          <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatIndianCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>GST (18% Estimated)</span>
              <span>{formatIndianCurrency(gst)}</span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-100">
              <span>Grand Total</span>
              <span className="text-[#4F46E5]">{formatIndianCurrency(grandTotal)}</span>
            </div>
          </div>

          {/* Sticky Checkout Bar */}
          <Button
            variant="primary"
            className="w-full h-12 text-sm font-bold shadow-md"
            disabled={cart.length === 0}
            onClick={handleCheckout}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            <span>Generate Bill ({formatIndianCurrency(grandTotal)})</span>
          </Button>
        </div>

      </div>
    </div>
  );
}
