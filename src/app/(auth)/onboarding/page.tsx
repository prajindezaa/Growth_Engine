"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";
import { Building2, Store, Truck, Factory, ArrowRight, CheckCircle2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const { user, refreshBusiness } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [businessName, setBusinessName] = useState("Sri Lakshmi Enterprises");
  const [gstin, setGstin] = useState("33AABCS1429B1ZB");
  const [tradeType, setTradeType] = useState<"retail" | "wholesale" | "distributor" | "manufacturer">("wholesale");
  const [phone, setPhone] = useState("98401 23456");
  const [city, setCity] = useState("Coimbatore");
  const [state, setState] = useState("Tamil Nadu");

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // 1. Insert business
      const { data: bizData, error: bizErr } = await supabase
        .from("businesses")
        .insert({
          name: businessName,
          trade_type: tradeType,
          gstin: gstin || null,
          phone: phone,
          city: city,
          state: state,
          plan: "pro",
        })
        .select()
        .single();

      if (bizErr) {
        throw bizErr;
      }

      // 2. Add current user as Owner in business_members
      if (user && bizData) {
        await supabase.from("business_members").insert({
          business_id: bizData.id,
          user_id: user.id,
          role: "owner",
          status: "active",
        });

        // Set default business id on profile
        await supabase
          .from("profiles")
          .update({ default_business_id: bizData.id })
          .eq("id", user.id);
      }

      await refreshBusiness();
      success("Business created! Welcome to GrowthEngine.");
      router.push("/");
    } catch (err: any) {
      error(err.message || "Failed to create business");
    } finally {
      setIsSubmitting(false);
    }
  };

  const tradeOptions = [
    { id: "retail", title: "Retail Shop / Store", desc: "Counter sales, walk-ins, fast barcode POS", icon: Store },
    { id: "wholesale", title: "Wholesale & Traders", desc: "B2B sales, bulk orders, Khata credit ledger", icon: Building2 },
    { id: "distributor", title: "Distributor / Agency", desc: "Route deliveries, multi-van sales, van stocks", icon: Truck },
    { id: "manufacturer", title: "Small Manufacturer", desc: "Raw materials, assembly, batch packaging", icon: Factory },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between p-4 sm:p-6 safe-top safe-bottom">
      
      {/* Top Header */}
      <div className="max-w-lg w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#4F46E5] flex items-center justify-center text-white font-black text-sm">
            G
          </div>
          <span className="text-sm font-bold text-slate-900">GrowthEngine Onboarding</span>
        </div>
        <span className="text-xs font-semibold text-slate-500">Step {step} of 3</span>
      </div>

      {/* Main Multi-step Card */}
      <div className="max-w-lg w-full mx-auto my-auto py-6">
        <Card className="p-6 sm:p-7 shadow-lg">
          
          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full mb-6 overflow-hidden">
            <div
              className="bg-[#4F46E5] h-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>

          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Tell us about your Business</h2>
                <p className="text-xs text-slate-500">This will appear on all your GST tax invoices and receipts.</p>
              </div>

              <Input
                label="Business / Trading Name *"
                placeholder="e.g. Sri Lakshmi Enterprises"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
              />

              <Input
                label="GSTIN Number (Optional for unregistered MSMEs)"
                placeholder="33AAAAA0000A1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                hint="Auto-populates tax rates and states"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="City / Town *"
                  placeholder="Coimbatore"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
                <Input
                  label="State *"
                  placeholder="Tamil Nadu"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                />
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!businessName}
                  className="w-full h-12 font-semibold"
                >
                  <span>Next: Choose Business Type</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <h2 className="text-lg font-bold text-slate-900">What type of business is this?</h2>
                <p className="text-xs text-slate-500">GrowthEngine customizes your default forms and features based on this.</p>
              </div>

              <div className="space-y-2.5">
                {tradeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = tradeType === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setTradeType(opt.id as any)}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all active:scale-[0.99] ${
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
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900">{opt.title}</h4>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#4F46E5]" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex gap-2">
                <Button variant="secondary" onClick={() => setStep(1)} className="flex-1 h-12">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1 h-12 font-semibold">
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-center py-2">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-black text-slate-900">Your Business is Ready!</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  We have configured your POS, Khata ledger, and initialized your AI Employee.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Business Name:</span>
                  <span className="font-bold text-slate-900">{businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trade Type:</span>
                  <span className="font-bold text-slate-900 capitalize">{tradeType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Location:</span>
                  <span className="font-bold text-slate-900">{city}, {state}</span>
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <Button variant="secondary" onClick={() => setStep(2)} className="flex-1 h-12">
                  Back
                </Button>
                <Button onClick={handleFinish} variant="primary" className="flex-1 h-12 font-bold">
                  Launch GrowthEngine
                </Button>
              </div>
            </div>
          )}

        </Card>
      </div>

      <div className="text-center text-[11px] text-slate-400">
        GrowthEngine Operating System for Indian MSMEs
      </div>

    </div>
  );
}
