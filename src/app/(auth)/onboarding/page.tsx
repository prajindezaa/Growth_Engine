"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/context/auth-context";
import {
  Building2,
  Store,
  Truck,
  Factory,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  MapPin,
  Briefcase,
  User,
  Phone,
  Mail,
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const { user, session, business, refreshBusiness, loading } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Form Fields
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [businessType, setBusinessType] = useState<"retail" | "wholesale" | "distributor" | "manufacturer">("retail");
  const [industry, setIndustry] = useState("Retail & FMCG");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [gstin, setGstin] = useState("");
  const [currency, setCurrency] = useState("INR");

  // Pre-fill email from Supabase Auth and mobile number from temporary storage
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
    if (user?.user_metadata?.full_name && !ownerName) {
      setOwnerName(user.user_metadata.full_name);
    }
    if (typeof window !== "undefined") {
      const storedPhone = sessionStorage.getItem("ge_temp_phone");
      if (storedPhone && !mobileNumber) {
        setMobileNumber(storedPhone);
      }
    }
  }, [user]);

  // If user already has an active business, direct them immediately to the dashboard
  useEffect(() => {
    if (!loading && business) {
      router.replace("/");
    }
  }, [business, loading, router]);

  // If unauthenticated after loading, redirect to login
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessName.trim() || !ownerName.trim() || !mobileNumber.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      showError("Please fill in all required fields (marked with *)");
      return;
    }

    if (!user) {
      showError("Session expired. Please log in again.");
      router.push("/login");
      return;
    }

    setIsSubmitting(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/auth/setup-business", {
        method: "POST",
        headers,
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          businessName: businessName.trim(),
          ownerName: ownerName.trim(),
          mobileNumber: mobileNumber.trim(),
          email: email.trim() || user.email,
          businessType,
          industry,
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          gstin: gstin.trim() || null,
          currency: currency || "INR",
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to set up business profile");
      }

      // Refresh auth context so state reflects new business
      await refreshBusiness();

      // Show success state
      setIsCompleted(true);
      showSuccess("Business profile created successfully!");
    } catch (err: any) {
      console.error("Setup business error:", err);
      showError(err.message || "Failed to save business setup");
    } finally {
      setIsSubmitting(false);
    }
  };

  const businessTypeOptions = [
    { id: "retail", title: "Retail Store", desc: "Walk-in customers, rapid barcode POS", icon: Store },
    { id: "wholesale", title: "Wholesale & Trading", desc: "B2B orders, Khata credit ledgers", icon: Building2 },
    { id: "distributor", title: "Distributor / Agency", desc: "Van sales, route deliveries", icon: Truck },
    { id: "manufacturer", title: "Manufacturer", desc: "Raw materials, assembly, packaging", icon: Factory },
  ];

  const industryOptions = [
    "Retail & FMCG",
    "Electricals & Hardware",
    "Textiles & Garments",
    "Automotive & Spares",
    "Electronics & Mobile",
    "Pharma & Healthcare",
    "Food & Beverages",
    "Building Materials",
    "General Trading",
  ];

  // ==========================================
  // Success Screen: "Your business is ready!"
  // ==========================================
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between p-4 sm:p-6 safe-top safe-bottom">
        <header className="max-w-md w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#4F46E5] flex items-center justify-center text-white font-black text-sm">
              G
            </div>
            <span className="text-sm font-black text-slate-900">GrowthEngine</span>
          </div>
        </header>

        <div className="max-w-md w-full mx-auto my-auto py-6">
          <Card className="p-7 sm:p-8 shadow-2xl border-slate-200/80 rounded-3xl bg-white text-center animate-in zoom-in-95 duration-300">
            {/* Celebration Icon */}
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-[#4F46E5] border border-indigo-100 uppercase tracking-wider">
              Setup Complete
            </span>

            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-3">
              Your business is ready!
            </h2>

            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
              We’ve configured your POS terminal, Khata ledgers, GST templates, and initialized your AI Employee.
            </p>

            {/* Quick Summary Card */}
            <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Business:</span>
                <span className="font-bold text-slate-900 truncate max-w-[200px]">{businessName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Owner:</span>
                <span className="font-bold text-slate-900">{ownerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Type:</span>
                <span className="font-bold text-slate-900 capitalize">{businessType} • {industry}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Location:</span>
                <span className="font-bold text-slate-900">{city}, {state}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                <span className="text-slate-400 font-medium">Currency:</span>
                <span className="font-bold text-emerald-600">{currency} (₹)</span>
              </div>
            </div>

            {/* CTA: Go to Dashboard */}
            <Button
              onClick={() => router.replace("/")}
              variant="primary"
              className="w-full h-13 font-black text-sm shadow-lg shadow-indigo-500/25 mt-6 active:scale-[0.98]"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        </div>

        <footer className="text-center text-[11px] text-slate-400">
          GrowthEngine MSME Business Operating System
        </footer>
      </div>
    );
  }

  // ==========================================
  // Main Business Setup Form
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between p-4 sm:p-6 selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="max-w-2xl w-full mx-auto flex items-center justify-between pb-4 border-b border-slate-200/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#4F46E5] flex items-center justify-center text-white font-black text-base shadow-sm">
            G
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none">
              GrowthEngine Setup
            </h1>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              First-Time Business Profile
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-[#4F46E5]" />
          <span>Step 1 of 1</span>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="max-w-2xl w-full mx-auto my-6">
        <Card className="p-6 sm:p-8 shadow-xl border-slate-200/80 rounded-3xl bg-white relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#4F46E5]" />

          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Let's set up your Business
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              This information will be printed on all your GST tax invoices, thermal slips, and WhatsApp receipts.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Business Identity */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Building2 className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  1. Business Identity & Owner
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Business Name *
                  </label>
                  <Input
                    placeholder="e.g. Sri Lakshmi Enterprises"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Owner / Proprietor Name *
                  </label>
                  <Input
                    placeholder="e.g. Ramesh Kumar"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Mobile Number *
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 flex items-center gap-1 text-slate-500 text-xs font-bold pointer-events-none border-r border-slate-200 pr-2">
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="98401 23456"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                      required
                      className="w-full h-11 pl-16 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Email Address *
                  </label>
                  <Input
                    type="email"
                    placeholder="billing@yourbusiness.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Business Type & Industry */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Briefcase className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  2. Business Type & Industry
                </h3>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Select Business Model *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {businessTypeOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = businessType === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setBusinessType(opt.id as any)}
                        className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all active:scale-[0.99] ${
                          isSelected
                            ? "border-[#4F46E5] bg-indigo-50/50 shadow-xs ring-1 ring-[#4F46E5]"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div
                          className={`p-2 rounded-xl shrink-0 ${
                            isSelected ? "bg-[#4F46E5] text-white" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900">{opt.title}</h4>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-[#4F46E5]" />}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Industry Category *
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 focus:outline-none"
                  >
                    {industryOptions.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Currency (Default)
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 focus:outline-none"
                  >
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="AED">AED (د.إ) - UAE Dirham</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Location & GST */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <MapPin className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  3. Address & Tax Details
                </h3>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Street Address / Shop No.
                </label>
                <Input
                  placeholder="e.g. 142 Cross Cut Road, Gandhipuram"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    City *
                  </label>
                  <Input
                    placeholder="Coimbatore"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    State *
                  </label>
                  <Input
                    placeholder="Tamil Nadu"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Pincode *
                  </label>
                  <Input
                    placeholder="641012"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  GSTIN (Optional for non-GST MSMEs)
                </label>
                <Input
                  placeholder="33AABCS1429B1ZB"
                  maxLength={15}
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  You can always update your GSTIN later in Business Settings
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                variant="primary"
                className="w-full h-13 font-black text-sm shadow-md shadow-indigo-500/20 active:scale-[0.98]"
                isLoading={isSubmitting}
              >
                <span>Complete Setup & Launch Store</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </form>
        </Card>
      </main>

      <footer className="text-center text-[11px] text-slate-400 py-3">
        GrowthEngine Operating System for Indian MSMEs
      </footer>
    </div>
  );
}
