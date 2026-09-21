"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  Building2,
  Receipt,
  Printer,
  Shield,
  Smartphone,
  Save,
  CheckCircle2,
} from "lucide-react";

export default function SettingsPage() {
  const { success } = useToast();

  const [businessName, setBusinessName] = useState("Sri Lakshmi Enterprises");
  const [gstin, setGstin] = useState("33AABCS1429B1ZB");
  const [phone, setPhone] = useState("98401 23456");
  const [email, setEmail] = useState("billing@srilakshmi.in");
  const [address, setAddress] = useState("142, Cross Cut Road, Gandhipuram");
  const [city, setCity] = useState("Coimbatore");
  const [state, setState] = useState("Tamil Nadu");
  const [pincode, setPincode] = useState("641012");
  const [invoicePrefix, setInvoicePrefix] = useState("INV-2026-");
  const [upiId, setUpiId] = useState("srilakshmi@okaxis");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    success("Business & Invoice settings saved successfully!");
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Business Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            GSTIN credentials, UPI payment QR details, and thermal invoice preferences
          </p>
        </div>

        <Button onClick={handleSave} className="self-start sm:self-auto font-semibold">
          <Save className="w-4 h-4 mr-2" />
          <span>Save Changes</span>
        </Button>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        
        {/* Business Profile */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-5 h-5 text-[#4F46E5]" />
            <h3 className="text-sm font-bold text-slate-900">Trading Identity & GST</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Legal Business Name *"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />
            <Input
              label="GSTIN Identification Number *"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Primary Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Billing Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Input
            label="Shop / Office Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div className="grid grid-cols-3 gap-3">
            <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
            <Input label="State" value={state} onChange={(e) => setState(e.target.value)} />
            <Input label="PIN Code" value={pincode} onChange={(e) => setPincode(e.target.value)} />
          </div>
        </Card>

        {/* Invoice & Payments Setup */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Invoicing & UPI Payments</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Invoice Number Prefix"
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value)}
              hint="e.g. INV-2026- or SLE/"
            />
            <Input
              label="UPI ID (VPA for instant QR generation)"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              hint="Printed as Dynamic UPI QR on invoices"
            />
          </div>
        </Card>

      </form>

    </div>
  );
}
