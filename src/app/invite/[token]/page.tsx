"use client";

import { use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ShieldCheck, Building2, CheckCircle2, ArrowRight } from "lucide-react";

export default function InviteAcceptancePage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { success, error } = useToast();

  const role = searchParams.get("role") || "staff";
  const businessName = searchParams.get("biz") || "GrowthEngine Store";

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !password) return;
    setIsSubmitting(true);

    try {
      // Simulate token validation and membership binding
      await new Promise((resolve) => setTimeout(resolve, 800));
      setIsAccepted(true);
      success(`Welcome to ${businessName}! Your role is configured as ${role.toUpperCase()}.`);
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err: any) {
      error("Failed to activate invite. Please contact your store administrator.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Team Invitation
          </h1>
          <p className="text-sm text-slate-600">
            You've been invited to join <strong className="text-slate-900">{businessName}</strong>
          </p>
        </div>

        <Card className="p-6 space-y-5 bg-white shadow-xl border border-slate-200/80">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
            <span className="text-slate-500">Assigned Role</span>
            <Badge variant="primary" className="uppercase font-bold">
              {role}
            </Badge>
          </div>

          {isAccepted ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Account Activated!</h3>
              <p className="text-xs text-slate-500">
                Redirecting you to your store dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleAcceptInvite} className="space-y-4">
              <Input
                label="Your Full Name *"
                placeholder="e.g. Senthil Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Create Password *"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#4F46E5] shrink-0 mt-0.5" />
                <span>
                  Permissions for role <strong>{role.toUpperCase()}</strong> are pre-configured by the store administrator.
                </span>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 font-bold shadow-sm"
              >
                <span>{isSubmitting ? "Activating..." : "Accept Invitation & Login"}</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          )}
        </Card>

        <p className="text-center text-xs text-slate-400">
          GrowthEngine — MSME Operating System for Bharat
        </p>
      </div>
    </div>
  );
}
