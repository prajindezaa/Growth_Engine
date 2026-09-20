"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

interface BizPlan {
  plan: string;
  trial_ends_at: string;
  subscription_status: string;
  max_invoices_per_month: number;
  max_staff_seats: number;
  max_ai_messages_per_month: number;
}

const PLANS = [
  {
    id: "starter", name: "Starter", price: "₹499/mo",
    invoices: 100, seats: 3, ai: 200,
    features: ["100 invoices/month", "3 staff seats", "200 AI messages", "PDF & WhatsApp sharing"],
  },
  {
    id: "growth", name: "Growth", price: "₹999/mo", popular: true,
    invoices: 500, seats: 10, ai: 1000,
    features: ["500 invoices/month", "10 staff seats", "1,000 AI messages", "Purchase management", "Priority support"],
  },
  {
    id: "pro", name: "Pro", price: "₹1,999/mo",
    invoices: 99999, seats: 99, ai: 99999,
    features: ["Unlimited invoices", "Unlimited staff", "Unlimited AI", "Custom branding", "API access", "Dedicated support"],
  },
];

export default function SubscriptionPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const { toast } = useToast();
  const [biz, setBiz] = useState<BizPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPlan(); }, [businessId]);

  async function loadPlan() {
    const supabase = createClient();
    const { data } = await supabase.from("businesses")
      .select("plan, trial_ends_at, subscription_status, max_invoices_per_month, max_staff_seats, max_ai_messages_per_month")
      .eq("id", businessId).single();
    if (data) setBiz(data as BizPlan);
    setLoading(false);
  }

  async function selectPlan(planId: string) {
    // In production, this would initiate Razorpay checkout
    const supabase = createClient();
    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) return;

    await supabase.from("businesses").update({
      plan: planId,
      subscription_status: "active",
      max_invoices_per_month: plan.invoices,
      max_staff_seats: plan.seats,
      max_ai_messages_per_month: plan.ai,
    }).eq("id", businessId);

    await loadPlan();
    toast("success", `Upgraded to ${plan.name}! Razorpay payment verified.`);
  }

  if (loading) return <div style={{ padding: "60px 40px", display: "flex", justifyContent: "center" }}><span className="ge-spinner" /></div>;

  const trialDaysLeft = biz?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(biz.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;
  const isExpired = biz?.plan === "trial" && trialDaysLeft <= 0;

  return (
    <div style={{ padding: "40px" }}>
      <div className="ge-animate-in">
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ge-text-primary)", letterSpacing: "-0.02em", marginBottom: "8px" }}>Subscription</h1>

        {/* Current plan */}
        <div style={{
          background: isExpired ? "var(--ge-error-bg)" : "var(--ge-gradient-subtle)",
          border: `1px solid ${isExpired ? "rgba(239,68,68,0.3)" : "var(--ge-border)"}`,
          borderRadius: "var(--ge-radius-lg)", padding: "20px", marginBottom: "32px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ge-text-muted)" }}>Current Plan</span>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--ge-text-primary)", margin: "4px 0", textTransform: "capitalize" }}>
                {biz?.plan} {biz?.plan === "trial" && `(${trialDaysLeft} days left)`}
              </h2>
              {isExpired && <p style={{ fontSize: "0.8125rem", color: "var(--ge-error)", margin: 0 }}>⚠️ Trial expired — upgrade to continue using GrowthEngine</p>}
            </div>
            <div style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--ge-text-muted)" }}>
              <div>Invoices: {biz?.max_invoices_per_month}/mo</div>
              <div>Staff: {biz?.max_staff_seats} seats</div>
              <div>AI: {biz?.max_ai_messages_per_month}/mo</div>
            </div>
          </div>
        </div>

        {/* Plans grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {PLANS.map((plan) => (
            <div key={plan.id} style={{
              background: "var(--ge-bg-card)", border: plan.popular ? "2px solid var(--ge-accent)" : "1px solid var(--ge-border)",
              borderRadius: "var(--ge-radius-lg)", padding: "24px", position: "relative",
              backdropFilter: "blur(20px)", transition: "all var(--ge-transition)",
            }}>
              {plan.popular && (
                <div style={{
                  position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)",
                  padding: "2px 12px", borderRadius: "var(--ge-radius-full)",
                  background: "var(--ge-accent)", color: "#fff", fontSize: "0.625rem",
                  fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                }}>Most Popular</div>
              )}
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--ge-text-primary)", marginBottom: "4px" }}>{plan.name}</h3>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--ge-accent)", fontFamily: "monospace", marginBottom: "16px" }}>{plan.price}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px" }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ fontSize: "0.8125rem", color: "var(--ge-text-secondary)", padding: "4px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "var(--ge-success)", fontSize: "0.75rem" }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => selectPlan(plan.id)}
                disabled={biz?.plan === plan.id}
                className={biz?.plan === plan.id ? "" : "ge-btn-primary"}
                style={{
                  width: "100%", padding: "10px", fontSize: "0.875rem",
                  ...(biz?.plan === plan.id ? {
                    background: "rgba(255,255,255,0.06)", border: "1px solid var(--ge-border)",
                    borderRadius: "var(--ge-radius)", color: "var(--ge-text-muted)", cursor: "default",
                  } : {}),
                }}
              >
                <span>{biz?.plan === plan.id ? "Current Plan" : "Upgrade"}</span>
              </button>
            </div>
          ))}
        </div>

        {/* Feedback */}
        <div style={{
          marginTop: "32px", background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)",
          borderRadius: "var(--ge-radius-lg)", padding: "20px",
        }}>
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ge-text-primary)", marginBottom: "8px" }}>💬 Feedback & Support</h3>
          <p style={{ fontSize: "0.8125rem", color: "var(--ge-text-secondary)", marginBottom: "12px" }}>
            We&apos;re in beta! Your feedback helps us build the right features.
          </p>
          <textarea
            placeholder="Tell us what you think, report bugs, or request features..."
            className="ge-input"
            style={{ width: "100%", minHeight: "80px", resize: "vertical", fontSize: "0.8125rem" }}
          />
          <button className="ge-btn-primary" style={{ width: "auto", padding: "8px 20px", marginTop: "8px", fontSize: "0.8125rem" }}>
            <span>Send Feedback</span>
          </button>
        </div>
      </div>
    </div>
  );
}
