"use client";

import React, { useState } from "react";
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
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [authMode, setAuthMode] = useState<"phone" | "email">("phone");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) {
      error("Please enter your full name");
      return;
    }
    if (authMode === "phone" && (!phone || phone.replace(/\D/g, "").length < 10)) {
      error("Please enter a valid 10-digit mobile number");
      return;
    }
    if (authMode === "email" && (!email || !password)) {
      error("Please enter your email and set a secure password");
      return;
    }
    if (!agreeTerms) {
      error("Please agree to the MSME terms & privacy policy");
      return;
    }

    setIsLoading(true);
    try {
      if (authMode === "email") {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone ? `+91${phone.replace(/\D/g, "")}` : undefined,
            },
          },
        });

        if (signUpErr) {
          error(signUpErr.message || "Failed to create account");
          return;
        }

        // Create or update profile record
        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            full_name: fullName,
            email: email,
            phone: phone || null,
          });
        }
      } else {
        const cleanPhone = phone.replace(/\D/g, "");
        const formattedPhone = cleanPhone.startsWith("91") ? `+${cleanPhone}` : `+91${cleanPhone}`;
        await supabase.auth.signInWithOtp({
          phone: formattedPhone,
        });
      }

      success("Account created! Proceeding to Business Setup...");
      router.push("/onboarding");
    } catch (err: any) {
      error(err.message || "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
      });
    } catch (err: any) {
      error(err.message || "Google auth failed");
      setIsLoading(false);
    }
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
              New MSME Registration
            </span>
          </div>
        </Link>

        <Link
          href="/login"
          className="text-xs font-bold text-[#4F46E5] bg-indigo-50 hover:bg-indigo-100/80 px-3 py-1.5 rounded-xl border border-indigo-200/60 transition-all"
        >
          Sign In Instead
        </Link>
      </header>

      {/* Main Form Canvas */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="max-w-md w-full">
          <Card className="p-6 sm:p-8 shadow-xl shadow-slate-200/50 border-slate-200/80 rounded-3xl bg-white/95 backdrop-blur-xs relative overflow-hidden">
            
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#4F46E5]" />

            <div className="mb-6">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Create Business Account
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Start your 14-day full trial with POS, Khata, GST billing, and your AI Employee
              </p>
            </div>

            {/* Google Signup Button */}
            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={isLoading}
              className="w-full h-12 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold shadow-2xs flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-60"
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
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-semibold tracking-wider">
                  or register with
                </span>
              </div>
            </div>

            {/* Auth Mode Toggle */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAuthMode("phone")}
                className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  authMode === "phone"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile (+91)</span>
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("email")}
                className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  authMode === "email"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email & Pass</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSignup} className="space-y-4">
              <Input
                label="Owner Full Name *"
                placeholder="e.g. Ramasamy Sundaram"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              {authMode === "phone" ? (
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Mobile Number *
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
                      className="w-full h-11 pl-22 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-bold tracking-wide text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 focus:outline-none transition-all"
                      required
                    />
                  </div>
                </div>
              ) : (
                <>
                  <Input
                    label="Work / Business Email *"
                    placeholder="owner@mybusiness.in"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<Mail className="w-4 h-4" />}
                    required
                  />
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                      Create Password *
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 focus:outline-none transition-all"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 text-slate-400 hover:text-slate-600 p-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Terms Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded text-[#4F46E5] focus:ring-[#4F46E5]"
                />
                <span className="text-xs text-slate-500 leading-snug">
                  I agree to the{" "}
                  <Link href="/terms" className="text-[#4F46E5] hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-[#4F46E5] hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>

              <Button
                type="submit"
                variant="primary"
                className="w-full h-12 font-bold shadow-md shadow-indigo-500/20"
                isLoading={isLoading}
              >
                <span>Create Account & Setup Store</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>

            <div className="mt-5 text-center text-xs text-slate-500">
              <span>Already registered? </span>
              <Link href="/login" className="font-bold text-[#4F46E5] hover:underline">
                Sign In to existing store
              </Link>
            </div>

          </Card>
        </div>
      </main>

      <footer className="py-4 px-5 text-center safe-bottom">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/80 text-[11px] font-medium text-slate-500 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Multi-tenant Row-Level Security • 100% Isolated Data</span>
        </div>
      </footer>

    </div>
  );
}
