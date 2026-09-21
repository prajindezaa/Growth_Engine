"use client";

import React, { useState } from "react";
import { Supplier, PurchaseRecord } from "@/types/sales";
import { MOCK_SUPPLIERS, MOCK_PURCHASES } from "@/lib/mock-sales";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DetailPanel } from "@/components/ui/detail-panel";
import { useToast } from "@/components/ui/toast";
import { formatIndianCurrency, formatShortDate } from "@/lib/utils";
import {
  Truck,
  Plus,
  Search,
  Phone,
  Building2,
  Package,
} from "lucide-react";

import { useSuppliers } from "@/hooks/use-suppliers";

export default function SuppliersPage() {
  const { suppliers, search, setSearch, totalPayable, addSupplier, isLoading } = useSuppliers();
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { success } = useToast();

  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("Raw Materials");
  const [gstin, setGstin] = useState("");

  const filtered = suppliers;

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    await addSupplier({
      name,
      contactPerson,
      phone,
      city: city || "Tamil Nadu",
      category,
      gstin: gstin || undefined,
    });

    success(`Supplier "${name}" registered!`);
    setIsAddOpen(false);
    setName("");
    setPhone("");
    setContactPerson("");
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Suppliers & Vendors
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Procurement partners, payables ledger, and raw material reorders
          </p>
        </div>

        <Button onClick={() => setIsAddOpen(true)} className="self-start sm:self-auto font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          <span>Add Supplier</span>
        </Button>
      </div>

      {/* Payables banner */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Outstanding Payables (To Suppliers)
          </span>
          <div className="text-2xl font-extrabold text-amber-600">
            {formatIndianCurrency(totalPayable)}
          </div>
        </div>
        <div className="text-xs text-slate-500">
          {suppliers.length} Active vendor accounts
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Search suppliers by vendor name or city..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search className="w-4 h-4" />}
        className="bg-white"
      />

      {/* Suppliers list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filtered.map((sup) => (
          <Card
            key={sup.id}
            hoverable
            onClick={() => setSelectedSupplier(sup)}
            className="flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{sup.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sup.contactPerson} • {sup.city}
                  </p>
                </div>
                <Badge variant="neutral">{sup.category}</Badge>
              </div>

              {sup.gstin && (
                <div className="mt-2 text-[11px] text-slate-500 font-mono">
                  GST: {sup.gstin}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  We Owe (Payable)
                </span>
                <div
                  className={`text-base font-extrabold ${
                    sup.outstandingPayable > 0 ? "text-amber-600" : "text-slate-800"
                  }`}
                >
                  {formatIndianCurrency(sup.outstandingPayable)}
                </div>
              </div>

              <span className="text-xs font-semibold text-[#4F46E5]">Manage →</span>
            </div>
          </Card>
        ))}
      </div>

      {/* DetailPanel */}
      <DetailPanel
        isOpen={!!selectedSupplier}
        onClose={() => setSelectedSupplier(null)}
        title={selectedSupplier?.name || "Supplier Details"}
        subtitle={`Contact: ${selectedSupplier?.contactPerson} (${selectedSupplier?.city})`}
        footerActions={
          <div className="flex items-center gap-2 w-full">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => window.open(`tel:${selectedSupplier?.phone}`)}
            >
              <Phone className="w-4 h-4 mr-1.5" />
              <span>Call Vendor</span>
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => {
                success(`Purchase Order request drafted for ${selectedSupplier?.name}`);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Draft PO</span>
            </Button>
          </div>
        }
      >
        {selectedSupplier && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-xs font-bold text-amber-800 uppercase">
                Payable Balance to Supplier
              </span>
              <div className="text-3xl font-black text-amber-700 mt-1">
                {formatIndianCurrency(selectedSupplier.outstandingPayable)}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="font-semibold text-slate-900">+91 {selectedSupplier.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">City / State:</span>
                <span className="font-semibold text-slate-900">{selectedSupplier.city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Category:</span>
                <span className="font-semibold text-slate-900">{selectedSupplier.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">GSTIN:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {selectedSupplier.gstin || "Unregistered"}
                </span>
              </div>
            </div>
          </div>
        )}
      </DetailPanel>

      {/* Add Supplier Drawer */}
      <DetailPanel
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Vendor / Supplier"
        subtitle="Register new procurement supplier"
        footerActions={
          <div className="flex items-center gap-2 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleAddSupplier}>
              Save Supplier
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddSupplier} className="space-y-3.5">
          <Input
            label="Supplier / Firm Name *"
            placeholder="e.g. Supreme Metals"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Contact Person Name"
            placeholder="e.g. Ramesh Sharma"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
          />
          <Input
            label="Phone Number *"
            placeholder="10-digit mobile"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <Input
            label="City / Hub"
            placeholder="Coimbatore / Hosur"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <Input
            label="GSTIN"
            placeholder="33AAAAA0000A1Z5"
            value={gstin}
            onChange={(e) => setGstin(e.target.value)}
          />
        </form>
      </DetailPanel>

    </div>
  );
}
