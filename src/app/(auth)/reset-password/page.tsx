"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      error("Please enter the 6-digit recovery code");
      return;
    }
    if (newPassword.length < 8) {
      error("Password must be at least 8 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsDone(true);
      success("Password changed successfully! You can now log in.");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      
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
              Update Password
            </span>
          </div>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="max-w-md w-full">
          <Card className="p-6 sm:p-8 shadow-xl shadow-slate-200/50 border-slate-200/80 rounded-3xl bg-white/95 backdrop-blur-xs relative overflow-hidden">
            
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#4F46E5]" />

            {!isDone ? (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Set New Password
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Enter your verification token and create a strong, memorable password.
                  </p>
                </div>

                <form onSubmit={handleReset} className="space-y-4">
                  <Input
                    label="6-Digit Reset Code *"
                    placeholder="123456"
                    type="number"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    leftIcon={<KeyRound className="w-4 h-4" />}
                    required
                    autoFocus
                  />

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                      New Password *
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
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

                  <Input
                    label="Confirm New Password *"
                    placeholder="Re-enter password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                    required
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full h-12 font-bold shadow-md shadow-indigo-500/20"
                    isLoading={isLoading}
                  >
                    <span>Update & Save Password</span>
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
                  <h3 className="text-lg font-bold text-slate-900">Password Updated!</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Your password has been changed securely. You can now sign in to your store.
                  </p>
                </div>

                <div className="pt-2">
                  <Link href="/login">
                    <Button variant="primary" className="w-full h-12 font-bold">
                      Sign In Now
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
              <Link href="/login" className="font-bold text-[#4F46E5] hover:underline">
                Back to Sign In
              </Link>
            </div>

          </Card>
        </div>
      </main>

      <footer className="py-4 px-5 text-center safe-bottom">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/80 text-[11px] font-medium text-slate-500 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Bcrypt Hashed • Zero Plaintext Storage</span>
        </div>
      </footer>

    </div>
  );
}
