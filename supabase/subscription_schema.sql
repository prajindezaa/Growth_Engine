-- ============================================================
-- GROWTHENGINE — OFFICIAL SUBSCRIPTION & ENTITLEMENT SCHEMA
-- (Run this in Supabase SQL Editor)
-- ============================================================

-- 1. ENSURE SUBSCRIPTION PLANS TABLE & ALL COLUMNS EXIST
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add all required columns if table already existed
ALTER TABLE public.subscription_plans 
  ADD COLUMN IF NOT EXISTS slug VARCHAR(100),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS yearly_price DECIMAL(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Populate / update slug where null
UPDATE public.subscription_plans SET slug = id WHERE slug IS NULL;

-- Upsert Standard Plans
INSERT INTO public.subscription_plans (id, name, slug, description, monthly_price, yearly_price, currency, is_active, display_order)
VALUES
('free', 'Free Starter', 'free', 'Ideal for single retail counters and micro shops', 0.00, 0.00, 'INR', true, 1),
('starter', 'Starter', 'starter', 'Essential tools for growing traders and small wholesalers', 499.00, 4990.00, 'INR', true, 2),
('growth', 'Growth', 'growth', 'Advanced analytics, GST, multi-branch, and AI Employee for scaling MSMEs', 999.00, 9990.00, 'INR', true, 3),
('pro', 'Pro Business', 'pro', 'Unlimited power with priority AI, custom reports, and enterprise support', 1999.00, 19990.00, 'INR', true, 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  monthly_price = EXCLUDED.monthly_price,
  yearly_price = EXCLUDED.yearly_price,
  updated_at = NOW();

-- 2. PLAN FEATURES & ENTITLEMENT LIMITS
CREATE TABLE IF NOT EXISTS public.plan_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id VARCHAR(50) NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    limit_value INTEGER DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_id, feature_key)
);

-- FREE Plan Features
INSERT INTO public.plan_features (plan_id, feature_key, enabled, limit_value) VALUES
('free', 'pos', true, NULL),
('free', 'basic_billing', true, NULL),
('free', 'products', true, 100),
('free', 'customers', true, 50),
('free', 'basic_inventory', true, NULL),
('free', 'basic_reports', true, NULL),
('free', 'ai_assistant', true, NULL),
('free', 'ai_monthly_requests', true, 50),
('free', 'users', true, 2),
('free', 'branches', true, 1),
('free', 'advanced_reports', false, NULL),
('free', 'multi_branch', false, NULL),
('free', 'forecasting', false, NULL),
('free', 'priority_support', false, NULL)
ON CONFLICT (plan_id, feature_key) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  limit_value = EXCLUDED.limit_value;

-- STARTER Plan Features
INSERT INTO public.plan_features (plan_id, feature_key, enabled, limit_value) VALUES
('starter', 'pos', true, NULL),
('starter', 'basic_billing', true, NULL),
('starter', 'advanced_billing', true, NULL),
('starter', 'products', true, 500),
('starter', 'customers', true, 250),
('starter', 'basic_inventory', true, NULL),
('starter', 'purchases', true, NULL),
('starter', 'expenses', true, NULL),
('starter', 'advanced_reports', true, NULL),
('starter', 'ai_assistant', true, NULL),
('starter', 'ai_monthly_requests', true, 250),
('starter', 'users', true, 3),
('starter', 'branches', true, 1),
('starter', 'multi_branch', false, NULL),
('starter', 'forecasting', false, NULL),
('starter', 'priority_support', false, NULL)
ON CONFLICT (plan_id, feature_key) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  limit_value = EXCLUDED.limit_value;

-- GROWTH Plan Features
INSERT INTO public.plan_features (plan_id, feature_key, enabled, limit_value) VALUES
('growth', 'pos', true, NULL),
('growth', 'basic_billing', true, NULL),
('growth', 'advanced_billing', true, NULL),
('growth', 'products', true, 2500),
('growth', 'customers', true, 1500),
('growth', 'basic_inventory', true, NULL),
('growth', 'purchases', true, NULL),
('growth', 'expenses', true, NULL),
('growth', 'advanced_reports', true, NULL),
('growth', 'gst', true, NULL),
('growth', 'multi_branch', true, 3),
('growth', 'branches', true, 3),
('growth', 'ai_assistant', true, NULL),
('growth', 'ai_monthly_requests', true, 1000),
('growth', 'forecasting', true, NULL),
('growth', 'users', true, 10),
('growth', 'priority_support', false, NULL)
ON CONFLICT (plan_id, feature_key) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  limit_value = EXCLUDED.limit_value;

-- PRO Plan Features
INSERT INTO public.plan_features (plan_id, feature_key, enabled, limit_value) VALUES
('pro', 'pos', true, NULL),
('pro', 'basic_billing', true, NULL),
('pro', 'advanced_billing', true, NULL),
('pro', 'products', true, NULL),
('pro', 'customers', true, NULL),
('pro', 'basic_inventory', true, NULL),
('pro', 'purchases', true, NULL),
('pro', 'expenses', true, NULL),
('pro', 'advanced_reports', true, NULL),
('pro', 'gst', true, NULL),
('pro', 'multi_branch', true, NULL),
('pro', 'branches', true, 10),
('pro', 'ai_assistant', true, NULL),
('pro', 'ai_monthly_requests', true, 10000),
('pro', 'forecasting', true, NULL),
('pro', 'users', true, 100),
('pro', 'priority_support', true, NULL),
('pro', 'api_access', true, NULL)
ON CONFLICT (plan_id, feature_key) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  limit_value = EXCLUDED.limit_value;

-- 3. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
    plan_id VARCHAR(50) NOT NULL REFERENCES public.subscription_plans(id) DEFAULT 'free',
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'expired', 'paused', 'incomplete', 'payment_failed')),
    billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    provider VARCHAR(50) DEFAULT 'razorpay',
    provider_customer_id VARCHAR(100),
    provider_subscription_id VARCHAR(100),
    current_period_start TIMESTAMPTZ DEFAULT NOW(),
    current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SUBSCRIPTION EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.subscription_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    provider_event_id VARCHAR(100) UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. USAGE RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.usage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID,
    feature_key VARCHAR(100) NOT NULL,
    usage_count INTEGER NOT NULL DEFAULT 0,
    period_start DATE NOT NULL DEFAULT CURRENT_DATE,
    period_end DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, feature_key, period_start)
);

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_subscriptions_business ON public.subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_id ON public.subscription_events(provider_event_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_business_feature ON public.usage_records(business_id, feature_key);

-- 7. ROW LEVEL SECURITY
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read plans" ON public.subscription_plans;
CREATE POLICY "Public read plans" ON public.subscription_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read plan features" ON public.plan_features;
CREATE POLICY "Public read plan features" ON public.plan_features FOR SELECT USING (true);

DROP POLICY IF EXISTS "Business members can view subscription" ON public.subscriptions;
CREATE POLICY "Business members can view subscription" ON public.subscriptions FOR SELECT USING (
  public.is_business_member(business_id)
);

DROP POLICY IF EXISTS "Business members can view usage" ON public.usage_records;
CREATE POLICY "Business members can view usage" ON public.usage_records FOR SELECT USING (
  public.is_business_member(business_id)
);
