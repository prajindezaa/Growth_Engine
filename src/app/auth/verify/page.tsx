"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/context/auth-context";
import {
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  Mail,
  Sparkles,
} from "lucide-react";

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error: showError, success: showSuccess } = useToast();
  const { verifyEmailOtp, sendEmailOtp } = useAuth();

  const emailParam = searchParams.get("email") || "";
  const phoneParam = searchParams.get("phone") || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [errorMessage, setErrorMessage] = useState("");

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto focus first OTP input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Resend countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  // Handle character input
  const handleDigitChange = (index: number, value: string) => {
    setErrorMessage("");
    // Take only the last entered digit
    const digit = value.replace(/\D/g, "").slice(-1);

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto focus next box if digit entered
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Backspace navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        // Current is empty, focus previous and erase
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pastedData[i] || "";
    }
    setOtp(newOtp);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  // Verify OTP submission
  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const token = otp.join("");
    if (token.length < 6) {
      setErrorMessage("Please enter all 6 digits of the verification code.");
      return;
    }

    if (!emailParam) {
      showError("Missing email address. Please return to login.");
      router.push("/login");
      return;
    }

    setIsVerifying(true);
    setErrorMessage("");

    try {
      const { data, error } = await verifyEmailOtp(emailParam, token);

      if (error) {
        const msg = error.message || "Invalid or expired verification code.";
        setErrorMessage(msg);
        showError(msg);
        setIsVerifying(false);
        return;
      }

      showSuccess("Email verified successfully!");

      const userId = data?.user?.id;
      const accessToken = data?.session?.access_token;

      // Check if user already has an active business membership
      let hasBusiness = false;
      if (userId) {
        try {
          const res = await fetch(`/api/auth/profile-status?userId=${encodeURIComponent(userId)}`, {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          });
          if (res.ok) {
            const statusJson = await res.json();
            hasBusiness = statusJson.hasBusiness === true;
          }
        } catch (statusErr) {
          console.error("Error checking status after verify:", statusErr);
        }
      }

      if (hasBusiness) {
        router.replace("/");
      } else {
        router.replace("/onboarding");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Verification failed");
      showError(err.message || "Verification failed");
      setIsVerifying(false);
    }
  };

  // Resend OTP code
  const handleResend = async () => {
    if (resendTimer > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage("");

    try {
      const { error } = await sendEmailOtp(emailParam);
      if (error) {
        showError(error.message || "Failed to resend code");
      } else {
        showSuccess(`A new 6-digit code was sent to ${emailParam}`);
        setResendTimer(30);
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      showError(err.message || "Failed to resend code");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="px-5 py-4 flex items-center justify-between max-w-5xl mx-auto w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <Link
          href="/login"
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Login</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-[#4F46E5] flex items-center justify-center text-white font-black text-xs">
            G
          </div>
          <span className="text-xs font-bold text-slate-900">GrowthEngine Auth</span>
        </div>
      </header>

      {/* Main Verify Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="max-w-md w-full">
          <Card className="p-6 sm:p-8 shadow-xl shadow-slate-200/50 border-slate-200/80 rounded-3xl bg-white/95 backdrop-blur-xs relative overflow-hidden">
            {/* Top Brand Accent */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#4F46E5]" />

            <div className="text-center mb-6">
              <div className="w-13 h-13 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4F46E5] mx-auto mb-3 shadow-xs">
                <Mail className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Verify your Email
              </h2>
              <p className="text-xs text-slate-500 mt-1.5">
                We sent a 6-digit one-time code to:
              </p>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <span className="text-xs font-bold text-slate-800 break-all">{emailParam || "your email"}</span>
                <Link
                  href="/login"
                  className="text-[11px] font-semibold text-[#4F46E5] hover:underline shrink-0"
                >
                  Change
                </Link>
              </div>
            </div>

            {/* OTP Form */}
            <form onSubmit={handleVerify} className="space-y-6">
              {/* 6 Digit Inputs */}
              <div>
                <div className="grid grid-cols-6 gap-2 sm:gap-2.5" onPaste={handlePaste}>
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className={`h-13 sm:h-14 text-center text-xl font-black rounded-xl border bg-slate-50 text-slate-900 focus:bg-white focus:outline-none transition-all ${
                        errorMessage
                          ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                          : "border-slate-200 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                      }`}
                    />
                  ))}
                </div>

                {errorMessage ? (
                  <p className="text-xs font-semibold text-rose-600 mt-2.5 text-center">
                    {errorMessage}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-2.5 text-center">
                    Check your spam/promotions folder if you don't see it in your inbox
                  </p>
                )}
              </div>

              {/* Verify Button */}
              <Button
                type="submit"
                variant="primary"
                className="w-full h-12 font-bold shadow-md shadow-indigo-500/20 active:scale-[0.98]"
                isLoading={isVerifying}
                disabled={otp.join("").length < 6 || isVerifying}
              >
                <span>Verify & Continue</span>
                <CheckCircle2 className="w-4 h-4 ml-1.5" />
              </Button>

              {/* Resend Timer & Action */}
              <div className="text-center pt-1 border-t border-slate-100">
                {resendTimer > 0 ? (
                  <span className="text-xs text-slate-400">
                    Resend code in <strong className="text-slate-700">{resendTimer}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="text-xs font-bold text-[#4F46E5] hover:underline inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isResending ? "animate-spin" : ""}`} />
                    <span>Resend 6-Digit Code</span>
                  </button>
                )}
              </div>
            </form>
          </Card>
        </div>
      </main>

      {/* Trust & Security Footnote */}
      <footer className="py-4 px-5 text-center safe-bottom">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/80 text-[11px] font-medium text-slate-500 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Encrypted Session • Instant OTP Verification</span>
        </div>
      </footer>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#4F46E5] mb-2 animate-pulse">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="text-xs font-bold text-slate-700">Loading verification...</div>
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
