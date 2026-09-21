import { createClient } from "@supabase/supabase-js";

// Initialize Supabase admin client for backend entitlement resolution and billing actions
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "cancelled"
  | "expired"
  | "paused"
  | "incomplete"
  | "payment_failed";

export interface PlanFeature {
  featureKey: string;
  enabled: boolean;
  limitValue: number | null; // null = unlimited
}

export interface BusinessEntitlement {
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  isTrial: boolean;
  trialDaysLeft: number;
  features: Record<string, { enabled: boolean; limit: number | null }>;
}

export interface UsageCheckResult {
  allowed: boolean;
  currentUsage: number;
  limit: number | null;
  remaining: number | null;
  percentUsed: number;
  reason?: string;
}

// Fallback plan matrix if database has not yet run migrations
const FALLBACK_PLAN_FEATURES: Record<string, Record<string, { enabled: boolean; limit: number | null }>> = {
  free: {
    pos: { enabled: true, limit: null },
    basic_billing: { enabled: true, limit: null },
    products: { enabled: true, limit: 100 },
    customers: { enabled: true, limit: 50 },
    basic_inventory: { enabled: true, limit: null },
    basic_reports: { enabled: true, limit: null },
    ai_assistant: { enabled: true, limit: null },
    ai_monthly_requests: { enabled: true, limit: 50 },
    users: { enabled: true, limit: 2 },
    branches: { enabled: true, limit: 1 },
    advanced_reports: { enabled: false, limit: null },
    multi_branch: { enabled: false, limit: null },
    forecasting: { enabled: false, limit: null },
    gst: { enabled: true, limit: null },
  },
  starter: {
    pos: { enabled: true, limit: null },
    basic_billing: { enabled: true, limit: null },
    advanced_billing: { enabled: true, limit: null },
    products: { enabled: true, limit: 500 },
    customers: { enabled: true, limit: 250 },
    basic_inventory: { enabled: true, limit: null },
    purchases: { enabled: true, limit: null },
    expenses: { enabled: true, limit: null },
    advanced_reports: { enabled: true, limit: null },
    ai_assistant: { enabled: true, limit: null },
    ai_monthly_requests: { enabled: true, limit: 250 },
    users: { enabled: true, limit: 3 },
    branches: { enabled: true, limit: 1 },
    multi_branch: { enabled: false, limit: null },
    forecasting: { enabled: false, limit: null },
    gst: { enabled: true, limit: null },
  },
  growth: {
    pos: { enabled: true, limit: null },
    basic_billing: { enabled: true, limit: null },
    advanced_billing: { enabled: true, limit: null },
    products: { enabled: true, limit: 2500 },
    customers: { enabled: true, limit: 1500 },
    basic_inventory: { enabled: true, limit: null },
    purchases: { enabled: true, limit: null },
    expenses: { enabled: true, limit: null },
    advanced_reports: { enabled: true, limit: null },
    gst: { enabled: true, limit: null },
    multi_branch: { enabled: true, limit: 3 },
    branches: { enabled: true, limit: 3 },
    ai_assistant: { enabled: true, limit: null },
    ai_monthly_requests: { enabled: true, limit: 1000 },
    forecasting: { enabled: true, limit: null },
    users: { enabled: true, limit: 10 },
  },
  pro: {
    pos: { enabled: true, limit: null },
    basic_billing: { enabled: true, limit: null },
    advanced_billing: { enabled: true, limit: null },
    products: { enabled: true, limit: null },
    customers: { enabled: true, limit: null },
    basic_inventory: { enabled: true, limit: null },
    purchases: { enabled: true, limit: null },
    expenses: { enabled: true, limit: null },
    advanced_reports: { enabled: true, limit: null },
    gst: { enabled: true, limit: null },
    multi_branch: { enabled: true, limit: null },
    branches: { enabled: true, limit: 10 },
    ai_assistant: { enabled: true, limit: null },
    ai_monthly_requests: { enabled: true, limit: 10000 },
    forecasting: { enabled: true, limit: null },
    users: { enabled: true, limit: 100 },
    priority_support: { enabled: true, limit: null },
    api_access: { enabled: true, limit: null },
  },
};

/**
 * Ensures every business has a valid subscription record.
 * Automatically provisions the Free Starter plan if none exists.
 */
export async function getOrCreateBusinessSubscription(businessId: string) {
  try {
    const { data: sub, error } = await supabaseAdmin
      .from("subscriptions")
      .select("*, subscription_plans(*)")
      .eq("business_id", businessId)
      .maybeSingle();

    if (!error && sub) {
      return sub;
    }

    // Auto-create Free Starter subscription
    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 30);

    const { data: newSub, error: createErr } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        business_id: businessId,
        plan_id: "free",
        status: "active",
        billing_cycle: "monthly",
        current_period_start: new Date().toISOString(),
        current_period_end: defaultEnd.toISOString(),
      })
      .select("*, subscription_plans(*)")
      .single();

    if (createErr) {
      console.warn("Notice: getOrCreateBusinessSubscription insert:", createErr.message);
    }

    return newSub || null;
  } catch (err) {
    console.error("Error in getOrCreateBusinessSubscription:", err);
    return null;
  }
}

/**
 * Returns the resolved business entitlements matrix from database.
 */
export async function getBusinessEntitlements(businessId: string): Promise<BusinessEntitlement> {
  const defaultEntitlement: BusinessEntitlement = {
    planId: "free",
    planName: "Free Starter",
    status: "active",
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    cancelAtPeriodEnd: false,
    isTrial: false,
    trialDaysLeft: 0,
    features: FALLBACK_PLAN_FEATURES.free,
  };

  if (!businessId) return defaultEntitlement;

  try {
    const sub = await getOrCreateBusinessSubscription(businessId);
    const planId = (sub?.plan_id || "free").toLowerCase();
    const planName = sub?.subscription_plans?.name || (planId.charAt(0).toUpperCase() + planId.slice(1));

    // Check trial status
    let isTrial = sub?.status === "trialing";
    let trialDaysLeft = 0;
    if (sub?.trial_end) {
      const diffMs = new Date(sub.trial_end).getTime() - Date.now();
      trialDaysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    // Query plan_features from database
    const { data: dbFeatures } = await supabaseAdmin
      .from("plan_features")
      .select("feature_key, enabled, limit_value")
      .eq("plan_id", planId);

    const featuresMap: Record<string, { enabled: boolean; limit: number | null }> = {
      ...(FALLBACK_PLAN_FEATURES[planId] || FALLBACK_PLAN_FEATURES.free),
    };

    if (dbFeatures && dbFeatures.length > 0) {
      for (const item of dbFeatures) {
        featuresMap[item.feature_key] = {
          enabled: item.enabled,
          limit: item.limit_value,
        };
      }
    }

    return {
      planId,
      planName,
      status: (sub?.status || "active") as SubscriptionStatus,
      currentPeriodEnd: sub?.current_period_end || defaultEntitlement.currentPeriodEnd,
      cancelAtPeriodEnd: sub?.cancel_at_period_end || false,
      isTrial,
      trialDaysLeft,
      features: featuresMap,
    };
  } catch (err) {
    console.error("Error in getBusinessEntitlements:", err);
    return defaultEntitlement;
  }
}

/**
 * Server-side feature access check.
 */
export async function canUseFeature(businessId: string, featureKey: string): Promise<boolean> {
  const entitlement = await getBusinessEntitlements(businessId);
  const feature = entitlement.features[featureKey];
  return feature ? feature.enabled : false;
}

/**
 * Server-side usage limit check.
 */
export async function checkLimit(businessId: string, featureKey: string): Promise<UsageCheckResult> {
  const entitlement = await getBusinessEntitlements(businessId);
  const feature = entitlement.features[featureKey];

  if (!feature || !feature.enabled) {
    return {
      allowed: false,
      currentUsage: 0,
      limit: 0,
      remaining: 0,
      percentUsed: 100,
      reason: `Feature '${featureKey}' is not enabled on the ${entitlement.planName} plan.`,
    };
  }

  const limit = feature.limit;
  if (limit === null) {
    return {
      allowed: true,
      currentUsage: 0,
      limit: null,
      remaining: null,
      percentUsed: 0,
    };
  }

  // Calculate live current count based on resource key
  let currentCount = 0;
  if (featureKey === "users") {
    const { count } = await supabaseAdmin
      .from("business_members")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "active");
    currentCount = count || 0;
  } else if (featureKey === "products") {
    const { count } = await supabaseAdmin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);
    currentCount = count || 0;
  } else if (featureKey === "customers") {
    const { count } = await supabaseAdmin
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);
    currentCount = count || 0;
  } else if (featureKey === "ai_monthly_requests") {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabaseAdmin
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .gte("created_at", startOfMonth.toISOString());
    currentCount = count || 0;
  } else {
    // Check usage_records table
    const today = new Date().toISOString().split("T")[0];
    const { data: usageRow } = await supabaseAdmin
      .from("usage_records")
      .select("usage_count")
      .eq("business_id", businessId)
      .eq("feature_key", featureKey)
      .lte("period_start", today)
      .gte("period_end", today)
      .maybeSingle();
    currentCount = usageRow?.usage_count || 0;
  }

  const remaining = Math.max(0, limit - currentCount);
  const percentUsed = limit > 0 ? Math.min(100, Math.round((currentCount / limit) * 100)) : 0;
  const allowed = currentCount < limit;

  return {
    allowed,
    currentUsage: currentCount,
    limit,
    remaining,
    percentUsed,
    reason: allowed ? undefined : `You have reached the limit of ${limit} ${featureKey} on your ${entitlement.planName} plan.`,
  };
}

/**
 * Records an incremental usage event (e.g. AI request or transaction).
 */
export async function recordUsage(businessId: string, featureKey: string, incrementBy: number = 1, userId?: string) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const periodEnd = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

    const { data: existing } = await supabaseAdmin
      .from("usage_records")
      .select("id, usage_count")
      .eq("business_id", businessId)
      .eq("feature_key", featureKey)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("usage_records")
        .update({
          usage_count: existing.usage_count + incrementBy,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("usage_records").insert({
        business_id: businessId,
        user_id: userId || null,
        feature_key: featureKey,
        usage_count: incrementBy,
        period_start: today,
        period_end: periodEnd,
      });
    }
  } catch (err) {
    console.warn("Notice: recordUsage error:", err);
  }
}
