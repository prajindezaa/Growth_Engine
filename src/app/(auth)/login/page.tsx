"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/context/auth-context";
import {
  Mail,
  Smartphone,
  ArrowRight,
  ShieldCheck,
  Building2,
  Sparkles,
  Zap,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { error: showError, success: showSuccess } = useToast();
  const { user, business, sendEmailOtp, signInWithGoogle, loading } = useAuth();

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // If already authenticated and has a business, redirect straight to dashboard
  useEffect(() => {
    if (!loading && user) {
      if (business) {
        router.replace("/");
      } else {
        router.replace("/onboarding");
      }
    }
  }, [user, business, loading, router]);

  // Handle Continue with Email (Email OTP)
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.replace(/\D/g, "");

    if (!cleanEmail || !cleanEmail.includes("@")) {
      showError("Please enter a valid business email address");
      return;
    }

    setIsSending(true);
    try {
      // Store phone number temporarily in sessionStorage for business onboarding
      if (typeof window !== "undefined" && cleanPhone) {
        sessionStorage.setItem("ge_temp_phone", cleanPhone);
      }

      const { error } = await sendEmailOtp(cleanEmail);
      if (error) {
        showError(error.message || "Failed to send verification code. Please try again.");
        return;
      }

      showSuccess(`Verification code sent to ${cleanEmail}`);
      const encodedEmail = encodeURIComponent(cleanEmail);
      const encodedPhone = encodeURIComponent(cleanPhone);
      router.push(`/auth/verify?email=${encodedEmail}&phone=${encodedPhone}`);
    } catch (err: any) {
      showError(err.message || "Something went wrong sending OTP");
    } finally {
      setIsSending(false);
    }
  };

  // Handle Continue with Google
  const handleGoogleSubmit = async () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (typeof window !== "undefined" && cleanPhone) {
      sessionStorage.setItem("ge_temp_phone", cleanPhone);
    }

    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        showError(error.message || "Failed to initiate Google login");
        setIsGoogleLoading(false);
      }
    } catch (err: any) {
      showError(err.message || "Google login error");
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Branding Bar */}
      <header className="px-5 py-4 flex items-center justify-between max-w-5xl mx-auto w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#4F46E5] flex items-center justify-center text-white font-black text-lg shadow-sm shadow-indigo-500/20">
            G
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none">
                GrowthEngine
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-[#4F46E5] border border-indigo-100">
                PRO
              </span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
              MSME Operating System
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <span className="hidden sm:inline">Need assistance?</span>
          <span className="text-[#4F46E5] font-semibold">24/7 Support</span>
        </div>
      </header>

      {/* Main Form Center Canvas */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="max-w-md w-full">
          <Card className="p-6 sm:p-8 shadow-xl shadow-slate-200/50 border-slate-200/80 rounded-3xl bg-white/95 backdrop-blur-xs relative overflow-hidden">
            {/* Top brand gradient accent */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#4F46E5]" />

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Sign in to GrowthEngine
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Enter your credentials to access POS billing, Khata ledgers, and your AI Employee.
              </p>
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSubmit}
              disabled={isGoogleLoading || isSending}
              className="w-full h-12 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold shadow-2xs flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-60"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{isGoogleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
            </button>

            {/* Visual Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2.5 text-slate-400 font-semibold tracking-wider">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Login Form: Mobile Number + Email Address */}
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {/* 1. Mobile Number Field */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Mobile Number
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center gap-1.5 text-slate-600 font-bold text-sm pointer-events-none border-r border-slate-200 pr-2.5">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="98401 23456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    className="w-full h-12 pl-22 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold tracking-wide text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 focus:outline-none transition-all"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Used for account profile and WhatsApp billing receipts
                </span>
              </div>

              {/* 2. Email Address Field */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Email Address *
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="owner@yourbusiness.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 focus:outline-none transition-all"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  We'll email you a secure 6-digit one-time passcode (OTP)
                </span>
              </div>

              {/* 3. Continue with Email Button */}
              <Button
                type="submit"
                variant="primary"
                className="w-full h-12 font-bold shadow-md shadow-indigo-500/20 active:scale-[0.98] mt-2"
                isLoading={isSending}
              >
                <span>Continue with Email</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>

            {/* Information Callout */}
            <div className="mt-5 p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100/80 text-xs text-indigo-900/90 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#4F46E5] shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>Passwordless & Secure:</strong> No passwords to remember. You will receive an instant 6-digit OTP code directly to your email inbox.
              </div>
            </div>
          </Card>
        </div>
      </main>

      {/* Trust & Security Footnote */}
      <footer className="py-4 px-5 text-center safe-bottom">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/80 text-[11px] font-medium text-slate-500 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Supabase Auth • Postgres Row-Level Security • 100% Isolated MSME Data</span>
        </div>
      </footer>
    </div>
  );
}
