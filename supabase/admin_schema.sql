-- ============================================================
-- GROWTHENGINE — SUPER ADMIN & PLATFORM MANAGEMENT SCHEMA
-- (Run this in Supabase SQL Editor)
-- ============================================================

-- 1. ADMIN USERS TABLE (Database-backed server authorization)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'admin', 'support_agent', 'auditor')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Super Admin
INSERT INTO public.admin_users (email, role, status)
VALUES ('prajindezaa142@gmail.com', 'super_admin', 'active')
ON CONFLICT (email) DO UPDATE 
SET role = 'super_admin', status = 'active';

-- 2. SUBSCRIPTION PLANS TABLE
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price_monthly DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    price_yearly DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    ai_request_limit INTEGER NOT NULL DEFAULT 100,
    ai_token_limit INTEGER NOT NULL DEFAULT 50000,
    max_businesses INTEGER NOT NULL DEFAULT 1,
    max_users INTEGER NOT NULL DEFAULT 3,
    features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.subscription_plans (id, name, price_monthly, price_yearly, ai_request_limit, ai_token_limit, max_businesses, max_users, features)
VALUES 
('free', 'Free Starter', 0.00, 0.00, 50, 25000, 1, 2, '["pos", "khata", "standard_invoices"]'::jsonb),
('basic', 'Basic Growth', 999.00, 9990.00, 250, 150000, 1, 5, '["pos", "khata", "gst_invoicing", "basic_ai"]'::jsonb),
('pro', 'Pro Business', 2499.00, 24990.00, 1000, 750000, 3, 15, '["pos", "khata", "gst_invoicing", "unlimited_ai", "reports", "multi_counter"]'::jsonb),
('enterprise', 'Enterprise Unlimited', 6999.00, 69990.00, 10000, 5000000, 10, 100, '["all_features", "priority_ai", "dedicated_support", "api_access"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 3. ENSURE COLUMNS ON SUBSCRIPTIONS TABLE
ALTER TABLE IF EXISTS public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_id VARCHAR(50) REFERENCES public.subscription_plans(id) DEFAULT 'pro',
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. ENSURE COLUMNS ON AI_USAGE TABLE
ALTER TABLE IF EXISTS public.ai_usage
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS request_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS feature VARCHAR(100) DEFAULT 'AI Assistant',
  ADD COLUMN IF NOT EXISTS model VARCHAR(100) DEFAULT 'gemini-3.6-flash',
  ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10, 4) DEFAULT 0.0000,
  ADD COLUMN IF NOT EXISTS response_time INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'success';

-- 5. PLATFORM ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS public.platform_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID,
    actor_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(100),
    target_id VARCHAR(100),
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
    assigned_admin VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ADMIN SETTINGS & FEATURE FLAGS
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by VARCHAR(255),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.admin_settings (id, value, description)
VALUES 
('platform_config', '{"maintenance_mode": false, "new_registrations_enabled": true, "enforce_email_verification": true}'::jsonb, 'Platform-wide operational flags'),
('ai_config', '{"default_model": "gemini-3.6-flash", "enforce_rate_limits": true, "cost_per_million_tokens_inr": 85.0}'::jsonb, 'AI Employee configuration'),
('notification_config', '{"email_alerts_enabled": true, "security_incident_alerts": true}'::jsonb, 'Alert preferences')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.feature_flags (
    id VARCHAR(100) PRIMARY KEY,
    enabled BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.feature_flags (id, enabled, description)
VALUES 
('ai_voice_pos', true, 'Enable Voice AI POS billing'),
('gst_e_way_bill', true, 'Automated E-way bill generation'),
('whatsapp_invoicing', true, 'Instant WhatsApp invoice delivery')
ON CONFLICT (id) DO NOTHING;

-- 8. INDEXES FOR HIGH-SPEED ADMIN FILTERING
CREATE INDEX IF NOT EXISTS idx_platform_activity_created_at ON public.platform_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON public.invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at);
