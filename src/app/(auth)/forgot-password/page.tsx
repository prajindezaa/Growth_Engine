"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import {
  Mail,
  Smartphone,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [identifier, setIdentifier] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) {
      error(`Please enter your registered ${mode === "phone" ? "mobile number" : "email address"}`);
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
      success(
        mode === "phone"
          ? `Password reset code sent to +91 ${identifier}`
          : `Password reset link sent to ${identifier}`
      );
    }, 700);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      
      {/* Top Header */}
      <header className="px-5 py-4 flex items-center justify-between max-w-5xl mx-auto w-full border-b border-slate-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-20">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#4F46E5] flex items-center justify-center text-white font-black text-lg shadow-sm shadow-indigo-500/20">
            G
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none">
              GrowthEngine
            </h1>
            <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
              Account Recovery
            </span>
          </div>
        </Link>

        <Link
          href="/login"
          className="text-xs font-bold text-[#4F46E5] bg-indigo-50 hover:bg-indigo-100/80 px-3 py-1.5 rounded-xl border border-indigo-200/60 transition-all flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Login</span>
        </Link>
      </header>

      {/* Main Form */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="max-w-md w-full">
          <Card className="p-6 sm:p-8 shadow-xl shadow-slate-200/50 border-slate-200/80 rounded-3xl bg-white/95 backdrop-blur-xs relative overflow-hidden">
            
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#4F46E5]" />

            {!isSubmitted ? (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Reset Password
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Choose how you want to receive your account recovery credentials.
                  </p>
                </div>

                {/* Reset Mode Toggle */}
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("phone");
                      setIdentifier("");
                    }}
                    className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                      mode === "phone"
                        ? "bg-white text-slate-900 shadow-xs font-bold"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile SMS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("email");
                      setIdentifier("");
                    }}
                    className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                      mode === "email"
                        ? "bg-white text-slate-900 shadow-xs font-bold"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email Link</span>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === "phone" ? (
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Registered Mobile Number
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
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, ""))}
                          className="w-full h-11 pl-22 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-bold tracking-wide text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 focus:outline-none transition-all"
                          required
                          autoFocus
                        />
                      </div>
                    </div>
                  ) : (
                    <Input
                      label="Registered Business Email"
                      placeholder="owner@mybusiness.in"
                      type="email"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      leftIcon={<Mail className="w-4 h-4" />}
                      required
                      autoFocus
                    />
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full h-12 font-bold shadow-md shadow-indigo-500/20"
                    isLoading={isLoading}
                  >
                    <span>Send Reset Instructions</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="text-center py-4 space-y-4 animate-in fade-in">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Recovery Instructions Sent!</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    {mode === "phone"
                      ? `We sent an SMS with a one-time reset code to +91 ${identifier}.`
                      : `Check your inbox at ${identifier} for your password reset link.`}
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Link href="/reset-password">
                    <Button variant="primary" className="w-full h-11 font-bold">
                      Enter Reset Code & New Password
                    </Button>
                  </Link>

                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 py-1"
                  >
                    Didn&apos;t receive it? Try again
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
              <Link href="/login" className="font-bold text-[#4F46E5] hover:underline flex items-center justify-center gap-1">
                <ArrowLeft className="w-3 h-3" />
                <span>Return to Sign In</span>
              </Link>
            </div>

          </Card>
        </div>
      </main>

      <footer className="py-4 px-5 text-center safe-bottom">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/80 text-[11px] font-medium text-slate-500 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Encrypted Auth & Recovery Tokens</span>
        </div>
      </footer>

    </div>
  );
}
