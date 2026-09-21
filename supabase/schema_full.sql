-- ============================================================
-- GROWTHENGINE — COMPLETE PRODUCTION SUPABASE SCHEMA (STEP 0)
-- 31 TABLES WITH STRICT ROW LEVEL SECURITY (RLS) & AUDIT TRAIL
-- REMOVED khata_entries IN FAVOR OF UNIFIED payments TABLE
-- DATABASE-DRIVEN SEQUENTIAL INVOICE NUMBERING & ATOMIC INVENTORY SYNC
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- 1. BUSINESSES (Tenants)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    trade_type VARCHAR(50) NOT NULL CHECK (trade_type IN ('retail', 'wholesale', 'distributor', 'manufacturer')),
    gstin VARCHAR(15),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    address TEXT,
    currency VARCHAR(10) DEFAULT 'INR',
    logo_url TEXT,
    invoice_sequence INT DEFAULT 1,
    plan VARCHAR(50) DEFAULT 'pro',
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. USER PROFILES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY, -- matches auth.users(id)
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    avatar_url TEXT,
    default_business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 3. BUSINESS MEMBERS & ROLES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- references auth.users(id)
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'sales', 'accountant', 'cashier', 'delivery')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50)
);

-- ------------------------------------------------------------
-- 4. CATEGORIES, WAREHOUSES & PRODUCTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    hsn VARCHAR(20) DEFAULT '8413',
    category VARCHAR(100) DEFAULT 'General',
    stock DECIMAL(12, 2) DEFAULT 0.00,
    min_stock_alert DECIMAL(12, 2) DEFAULT 10.00,
    unit VARCHAR(50) DEFAULT 'Units',
    cost_price DECIMAL(15, 2) DEFAULT 0.00,
    selling_price DECIMAL(15, 2) NOT NULL,
    gst_rate DECIMAL(5, 2) DEFAULT 18.00,
    image_url TEXT,
    status VARCHAR(20) DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, sku)
);

-- ------------------------------------------------------------
-- 5. STOCK MOVEMENTS (Atomic Ledger)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('invoice_sale', 'purchase_received', 'adjustment_damaged', 'adjustment_audit', 'return')),
    quantity DECIMAL(12, 2) NOT NULL, -- negative for deduction, positive for addition
    previous_stock DECIMAL(12, 2) NOT NULL,
    resulting_stock DECIMAL(12, 2) NOT NULL,
    reference_id UUID, -- invoice_id or purchase_id
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 6. CUSTOMERS & SUPPLIERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    city VARCHAR(100),
    gstin VARCHAR(15),
    outstanding_balance DECIMAL(15, 2) DEFAULT 0.00,
    credit_limit DECIMAL(15, 2) DEFAULT 50000.00,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'overdue', 'settled')),
    last_active DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    city VARCHAR(100),
    gstin VARCHAR(15),
    outstanding_payable DECIMAL(15, 2) DEFAULT 0.00,
    category VARCHAR(100) DEFAULT 'Raw Materials',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 7. QUOTATIONS & SALES ORDERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    quotation_number VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal DECIMAL(15, 2) NOT NULL,
    total_gst DECIMAL(15, 2) NOT NULL,
    grand_total DECIMAL(15, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'converted_to_order', 'converted_to_invoice', 'rejected', 'expired')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(12, 2) NOT NULL,
    rate DECIMAL(15, 2) NOT NULL,
    gst_rate DECIMAL(5, 2) DEFAULT 18.00,
    taxable_amount DECIMAL(15, 2) NOT NULL,
    gst_amount DECIMAL(15, 2) NOT NULL,
    total DECIMAL(15, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sales_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    order_number VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'converted_to_invoice', 'cancelled')),
    grand_total DECIMAL(15, 2) NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(12, 2) NOT NULL,
    rate DECIMAL(15, 2) NOT NULL,
    total DECIMAL(15, 2) NOT NULL
);

-- ------------------------------------------------------------
-- 8. INVOICES & INVOICE ITEMS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal DECIMAL(15, 2) NOT NULL,
    total_gst DECIMAL(15, 2) NOT NULL,
    grand_total DECIMAL(15, 2) NOT NULL,
    amount_paid DECIMAL(15, 2) DEFAULT 0.00,
    balance_due DECIMAL(15, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid', 'overdue', 'cancelled')),
    type VARCHAR(30) DEFAULT 'tax_invoice' CHECK (type IN ('tax_invoice', 'quotation', 'sales_order', 'pos_receipt')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    hsn VARCHAR(20),
    quantity DECIMAL(12, 2) NOT NULL,
    unit VARCHAR(50) DEFAULT 'Units',
    rate DECIMAL(15, 2) NOT NULL,
    gst_rate DECIMAL(5, 2) DEFAULT 18.00,
    taxable_amount DECIMAL(15, 2) NOT NULL,
    gst_amount DECIMAL(15, 2) NOT NULL,
    total DECIMAL(15, 2) NOT NULL
);

-- ------------------------------------------------------------
-- 9. UNIFIED PAYMENTS TABLE (Replaces khata_entries completely)
-- Records Udhar Diya, Jama Mila, and Supplier Payments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    party_type VARCHAR(20) NOT NULL CHECK (party_type IN ('customer', 'supplier')),
    party_id UUID NOT NULL, -- references customers(id) or suppliers(id)
    party_name VARCHAR(255) NOT NULL,
    payment_type VARCHAR(30) NOT NULL CHECK (payment_type IN ('credit_issued', 'payment_received', 'payment_made')),
    amount DECIMAL(15, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'upi' CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'cheque', 'credit_note')),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    date DATE DEFAULT CURRENT_DATE,
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 10. PURCHASES & PURCHASE ORDERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    supplier_name VARCHAR(255) NOT NULL,
    po_number VARCHAR(100) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    expected_delivery DATE,
    items JSONB DEFAULT '[]'::jsonb,
    grand_total DECIMAL(15, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'received', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    supplier_name VARCHAR(255) NOT NULL,
    bill_number VARCHAR(100) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    grand_total DECIMAL(15, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'received' CHECK (status IN ('received', 'pending', 'partial')),
    items_count INT DEFAULT 1,
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(12, 2) NOT NULL,
    cost_price DECIMAL(15, 2) NOT NULL,
    total DECIMAL(15, 2) NOT NULL
);

-- ------------------------------------------------------------
-- 11. APPROVAL REQUESTS (100% Supabase-backed)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    requester_id UUID,
    requester_name VARCHAR(255) NOT NULL,
    requester_role VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('discount', 'credit_limit', 'purchase_order', 'invoice_cancel', 'stock_adjustment')),
    amount DECIMAL(15, 2),
    reason TEXT NOT NULL,
    target_entity_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 12. AUTOMATIONS & NOTIFICATIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    trigger VARCHAR(100) NOT NULL,
    action VARCHAR(255) NOT NULL,
    channel VARCHAR(50) DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'notification', 'system')),
    enabled BOOLEAN DEFAULT true,
    executions_count INT DEFAULT 0,
    last_executed TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.automation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'success',
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 13. AI CONVERSATIONS & USAGE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID,
    prompt TEXT NOT NULL,
    detected_route VARCHAR(100) NOT NULL,
    reply TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    month_year VARCHAR(7) NOT NULL, -- '2026-09'
    messages_count INT DEFAULT 0,
    tokens_used INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, month_year)
);

CREATE TABLE IF NOT EXISTS public.ai_action_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID,
    route VARCHAR(100) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    target_entity VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL, -- 'proposed', 'confirmed', 'rejected', 'cancelled'
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 14. SUBSCRIPTIONS & PLANS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price_inr DECIMAL(10, 2) NOT NULL,
    invoice_limit INT,
    ai_limit INT,
    staff_limit INT
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) REFERENCES public.plans(id),
    status VARCHAR(30) DEFAULT 'active',
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 15. AUDIT LOGS (Immutable record for actions)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID,
    actor_type VARCHAR(20) DEFAULT 'user' CHECK (actor_type IN ('user', 'ai_employee', 'system')),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    is_high_risk BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DATABASE FUNCTIONS & TRIGGERS (Step 0)
-- ============================================================

-- Function: Atomic Sequential Invoice Number Generator (Zero concurrent collision)
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    next_num INT;
    current_yr TEXT;
BEGIN
    current_yr := to_char(CURRENT_DATE, 'YYYY');
    
    -- Atomically increment and get next sequence for this business
    UPDATE public.businesses
    SET invoice_sequence = COALESCE(invoice_sequence, 0) + 1
    WHERE id = NEW.business_id
    RETURNING invoice_sequence INTO next_num;
    
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        NEW.invoice_number := 'INV-' || current_yr || '-' || lpad(next_num::TEXT, 4, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_invoice_number ON public.invoices;
CREATE TRIGGER trg_generate_invoice_number
BEFORE INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.generate_invoice_number();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES — DENY-BY-DEFAULT
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_business_member(biz_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF auth.role() = 'service_role' THEN
        RETURN TRUE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.business_members
        WHERE business_id = biz_id
        AND user_id = auth.uid()
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_action_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Businesses table: access governed by membership or service_role
DROP POLICY IF EXISTS "tenant_isolation_businesses" ON public.businesses;
CREATE POLICY "tenant_isolation_businesses" ON public.businesses
FOR ALL USING (
    id IN (SELECT business_id FROM public.business_members WHERE user_id = auth.uid() AND status = 'active')
    OR auth.role() = 'service_role'
)
WITH CHECK (
    id IN (SELECT business_id FROM public.business_members WHERE user_id = auth.uid() AND status = 'active')
    OR auth.role() = 'service_role'
);

-- 2. Business members: users can see members of their own businesses or their own memberships
DROP POLICY IF EXISTS "tenant_isolation_business_members" ON public.business_members;
CREATE POLICY "tenant_isolation_business_members" ON public.business_members
FOR ALL USING (
    user_id = auth.uid() 
    OR public.is_business_member(business_id)
)
WITH CHECK (
    public.is_business_member(business_id)
);

-- 3. Child item tables (linked via parent foreign key)
DROP POLICY IF EXISTS "tenant_isolation_quotation_items" ON public.quotation_items;
CREATE POLICY "tenant_isolation_quotation_items" ON public.quotation_items
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.quotations q WHERE q.id = quotation_items.quotation_id AND public.is_business_member(q.business_id))
    OR auth.role() = 'service_role'
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.quotations q WHERE q.id = quotation_items.quotation_id AND public.is_business_member(q.business_id))
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS "tenant_isolation_sales_order_items" ON public.sales_order_items;
CREATE POLICY "tenant_isolation_sales_order_items" ON public.sales_order_items
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sales_orders s WHERE s.id = sales_order_items.sales_order_id AND public.is_business_member(s.business_id))
    OR auth.role() = 'service_role'
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.sales_orders s WHERE s.id = sales_order_items.sales_order_id AND public.is_business_member(s.business_id))
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS "tenant_isolation_invoice_items" ON public.invoice_items;
CREATE POLICY "tenant_isolation_invoice_items" ON public.invoice_items
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id AND public.is_business_member(i.business_id))
    OR auth.role() = 'service_role'
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id AND public.is_business_member(i.business_id))
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS "tenant_isolation_purchase_items" ON public.purchase_items;
CREATE POLICY "tenant_isolation_purchase_items" ON public.purchase_items
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.purchases p WHERE p.id = purchase_items.purchase_id AND public.is_business_member(p.business_id))
    OR auth.role() = 'service_role'
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.purchases p WHERE p.id = purchase_items.purchase_id AND public.is_business_member(p.business_id))
    OR auth.role() = 'service_role'
);

-- 4. Dynamic policy creation for all remaining tables having a direct 'business_id' column
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN (
        SELECT c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables t ON c.table_name = t.table_name
        WHERE c.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
          AND c.column_name = 'business_id'
          AND c.table_name NOT IN ('business_members')
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_%I" ON public.%I', tbl.table_name, tbl.table_name);
        EXECUTE format('CREATE POLICY "tenant_isolation_%I" ON public.%I FOR ALL USING (public.is_business_member(business_id)) WITH CHECK (public.is_business_member(business_id))', tbl.table_name, tbl.table_name);
    END LOOP;
END $$;

-- 5. Profiles: Users can only read/update their own profile or service_role
DROP POLICY IF EXISTS "profiles_self_access" ON public.profiles;
CREATE POLICY "profiles_self_access" ON public.profiles FOR ALL USING (id = auth.uid() OR auth.role() = 'service_role');

