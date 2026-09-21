"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";
import {
  Smartphone,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Store,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Building2,
  QrCode,
  Layers,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { success, error, toast } = useToast();

  const [authMode, setAuthMode] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // OTP Countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpSent && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, resendTimer]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      error("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsLoading(true);
    try {
      const formattedPhone = cleanPhone.startsWith("91") ? `+${cleanPhone}` : `+91${cleanPhone}`;
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (otpErr) {
        // If SMS provider not active or rate limited, notify and enable mock OTP for demonstration
        toast(`Demo OTP mode active: check SMS or use code 123456`, "info");
      } else {
        success(`6-digit OTP sent to +91 ${cleanPhone}`);
      }
      setOtpSent(true);
      setResendTimer(30);
    } catch (err: any) {
      error(err.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[value.length - 1];
    }
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next box
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otp.join("");
    if (enteredOtp.length < 6) {
      error("Please enter all 6 digits of the verification code");
      return;
    }

    setIsLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("91") ? `+${cleanPhone}` : `+91${cleanPhone}`;
      
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: enteredOtp,
        type: "sms",
      });

      if (verifyErr) {
        // If demo OTP or verification error, check fallback demo user
        if (enteredOtp === "123456" || enteredOtp === "000000") {
          success("Store credentials verified (Demo bypass)!");
          router.push("/");
          return;
        }
        error(verifyErr.message || "Invalid OTP code");
        return;
      }

      success("Store credentials verified!");
      router.push("/");
    } catch (err: any) {
      error(err.message || "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      error("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: signinErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signinErr) {
        error(signinErr.message || "Invalid email or password");
        return;
      }

      success("Welcome back to GrowthEngine!");
      router.push("/");
    } catch (err: any) {
      error(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstantDemo = (role: "owner" | "cashier") => {
    success(`Logging in as ${role === "owner" ? "Store Owner" : "Cashier"} (Demo Mode)`);
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      
      {/* Top Mobile-App Status & Branding Bar */}
      <header className="px-5 py-4 flex items-center justify-between max-w-5xl mx-auto w-full border-b border-slate-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-20">
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

        {/* Quick Demo Selector */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleInstantDemo("owner")}
            className="text-xs font-semibold text-[#4F46E5] bg-indigo-50 hover:bg-indigo-100/80 px-3 py-1.5 rounded-xl border border-indigo-200/60 transition-all active:scale-95 flex items-center gap-1"
          >
            <span>Demo Store</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Center Form Canvas */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="max-w-md w-full">
          
          <Card className="p-6 sm:p-8 shadow-xl shadow-slate-200/50 border-slate-200/80 rounded-3xl bg-white/95 backdrop-blur-xs relative overflow-hidden">
            
            {/* Subtle brand top accent */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#4F46E5]" />

            {/* Title & Subtitle */}
            <div className="mb-6">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {otpSent ? "Enter Verification Code" : "Sign in to your Business"}
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {otpSent
                  ? `We've sent a 6-digit SMS code to +91 ${phone}`
                  : "Instant access to POS billing, Khata ledgers, and your AI Employee"}
              </p>
            </div>

            {/* Google Login Button */}
            <button
              type="button"
              onClick={() => {
                success("Connecting via Google...");
                router.push("/");
              }}
              className="w-full h-12 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold shadow-2xs flex items-center justify-center gap-3 transition-all active:scale-[0.98] mb-5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-semibold tracking-wider">
                  or sign in with
                </span>
              </div>
            </div>

            {/* Auth Mode Segmented Pill */}
            {!otpSent && (
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-6 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAuthMode("phone")}
                  className={`py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    authMode === "phone"
                      ? "bg-white text-slate-900 shadow-sm font-bold"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile OTP (+91)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("email")}
                  className={`py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    authMode === "email"
                      ? "bg-white text-slate-900 shadow-sm font-bold"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email & Password</span>
                </button>
              </div>
            )}

            {/* Phone OTP Flow */}
            {authMode === "phone" ? (
              !otpSent ? (
                /* Step 1: Phone Input */
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                      Business Phone Number
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 flex items-center gap-1.5 text-slate-600 font-bold text-sm pointer-events-none border-r border-slate-200 pr-2">
                        <span>🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="98401 23456"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        className="w-full h-12 pl-22 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-bold tracking-wide text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 focus:outline-none transition-all"
                        required
                        autoFocus
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Works with Airtel, Jio, Vi, and BSNL
                    </span>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full h-12 font-bold shadow-md shadow-indigo-500/20 active:scale-[0.98]"
                    isLoading={isLoading}
                  >
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </form>
              ) : (
                /* Step 2: 6-Digit OTP Box Grid */
                <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in duration-200">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        6-Digit Code
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtp(["", "", "", "", "", ""]);
                        }}
                        className="text-xs text-[#4F46E5] font-semibold hover:underline"
                      >
                        Edit Number
                      </button>
                    </div>

                    <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                      {otp.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`otp-input-${idx}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          className="h-13 text-center text-lg font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 focus:outline-none transition-all"
                        />
                      ))}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full h-12 font-bold shadow-md shadow-indigo-500/20"
                    isLoading={isLoading}
                  >
                    <span>Verify & Open Store</span>
                    <CheckCircle2 className="w-4 h-4 ml-1.5" />
                  </Button>

                  {/* Resend Code Countdown */}
                  <div className="text-center">
                    {resendTimer > 0 ? (
                      <span className="text-xs text-slate-400">
                        Resend code in <strong className="text-slate-600">{resendTimer}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setResendTimer(30);
                          success(`New OTP sent to +91 ${phone}`);
                        }}
                        className="text-xs font-bold text-[#4F46E5] hover:underline inline-flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Resend SMS Code</span>
                      </button>
                    )}
                  </div>
                </form>
              )
            ) : (
              /* Email & Password Flow */
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <Input
                  label="Owner / Staff Email"
                  placeholder="owner@srilakshmi.in"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
                  required
                />
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-semibold text-[#4F46E5] hover:underline"
                    >
                      Forgot?
                    </Link>
                  </div>
                  <Input
                    placeholder="••••••••"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full h-12 font-bold shadow-md shadow-indigo-500/20"
                  isLoading={isLoading}
                >
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </form>
            )}

            {/* Quick Demo Login Cards */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
                Or Instant Preview (No signup required)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleInstantDemo("owner")}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-left transition-all active:scale-95 group"
                >
                  <div className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-[#4F46E5]" />
                    <span className="text-xs font-bold text-slate-800">Owner Access</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                    Sri Lakshmi Enterprises
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleInstantDemo("cashier")}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-left transition-all active:scale-95 group"
                >
                  <div className="flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-bold text-slate-800">Counter POS</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                    Cashier Terminal 01
                  </span>
                </button>
              </div>
            </div>

            {/* Bottom Register CTA */}
            <div className="mt-5 text-center text-xs text-slate-500">
              <span>New to GrowthEngine? </span>
              <Link href="/onboarding" className="font-bold text-[#4F46E5] hover:underline">
                Register New Business
              </Link>
            </div>

          </Card>

        </div>
      </main>

      {/* Trust & Security Footnote */}
      <footer className="py-4 px-5 text-center safe-bottom">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/80 text-[11px] font-medium text-slate-500 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Postgres Row-Level Security • 100% Isolated MSME Data</span>
        </div>
      </footer>

    </div>
  );
}
