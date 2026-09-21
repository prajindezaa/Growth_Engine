-- ============================================================
-- GROWTHENGINE — OFFICIAL PRODUCTION SUPABASE SCHEMA
-- MULTI-TENANT ARCHITECTURE WITH POSTGRES ROW LEVEL SECURITY (RLS)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BUSINESSES (Every tenant account)
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BUSINESS MEMBERS (Users assigned to Businesses with Roles)
CREATE TABLE IF NOT EXISTS public.business_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- references auth.users(id)
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'sales', 'accountant', 'cashier', 'delivery')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, user_id)
);

-- 3. CUSTOMERS / PARTIES (Khata Ledgers & Credit Tracking)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    city VARCHAR(100),
    gstin VARCHAR(15),
    outstanding_balance DECIMAL(15, 2) DEFAULT 0.00,
    credit_limit DECIMAL(15, 2) DEFAULT 50000.00,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'overdue', 'settled')),
    last_active DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PRODUCTS & INVENTORY
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    hsn VARCHAR(20) DEFAULT '8413',
    category VARCHAR(100) DEFAULT 'General',
    stock DECIMAL(12, 2) DEFAULT 0.00,
    min_stock_alert DECIMAL(12, 2) DEFAULT 10.00,
    unit VARCHAR(50) DEFAULT 'Units',
    cost_price DECIMAL(15, 2) DEFAULT 0.00,
    selling_price DECIMAL(15, 2) NOT NULL,
    gst_rate DECIMAL(5, 2) DEFAULT 18.00,
    status VARCHAR(20) DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SUPPLIERS / VENDORS
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

-- 6. INVOICES & GST BILLS
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
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid', 'overdue')),
    type VARCHAR(30) DEFAULT 'tax_invoice' CHECK (type IN ('tax_invoice', 'quotation', 'sales_order')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. KHATA TRANSACTIONS (Udhar Diya & Jama Mila entries)
CREATE TABLE IF NOT EXISTS public.khata_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('give_credit', 'got_payment')),
    amount DECIMAL(15, 2) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    note TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. AUDIT LOGS (Immutable record for all financial & AI actions)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    actor_type VARCHAR(20) DEFAULT 'user' CHECK (actor_type IN ('user', 'ai_employee', 'system')),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES — STRICT ISOLATION
-- ============================================================

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper security definer function to verify tenant membership
CREATE OR REPLACE FUNCTION public.is_business_member(biz_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Allows service_role and authenticated business members
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

-- Policies for public tables
CREATE POLICY "RLS on businesses" ON public.businesses FOR ALL USING (public.is_business_member(id));
CREATE POLICY "RLS on business_members" ON public.business_members FOR ALL USING (public.is_business_member(business_id));
CREATE POLICY "RLS on customers" ON public.customers FOR ALL USING (public.is_business_member(business_id));
CREATE POLICY "RLS on products" ON public.products FOR ALL USING (public.is_business_member(business_id));
CREATE POLICY "RLS on suppliers" ON public.suppliers FOR ALL USING (public.is_business_member(business_id));
CREATE POLICY "RLS on invoices" ON public.invoices FOR ALL USING (public.is_business_member(business_id));
CREATE POLICY "RLS on khata_entries" ON public.khata_entries FOR ALL USING (public.is_business_member(business_id));
CREATE POLICY "RLS on audit_logs" ON public.audit_logs FOR ALL USING (public.is_business_member(business_id));

-- Demo Seed Data (Pre-populates your store with realistic Coimbatore MSME data)
DO $$
DECLARE
    biz UUID;
    cust1 UUID;
    cust2 UUID;
    cust3 UUID;
    cust4 UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE name = 'Sri Lakshmi Enterprises') THEN
        INSERT INTO public.businesses (name, trade_type, gstin, phone, city, state, currency)
        VALUES ('Sri Lakshmi Enterprises', 'wholesale', '33AABCS1429B1ZB', '+91 98401 23456', 'Coimbatore', 'Tamil Nadu', 'INR')
        RETURNING id INTO biz;

        INSERT INTO public.customers (business_id, name, phone, city, gstin, outstanding_balance, credit_limit, status)
        VALUES 
        (biz, 'Murugan Traders', '9842109876', 'Tiruppur', '33AABCT9981A1Z1', 142500, 200000, 'overdue') RETURNING id INTO cust1;
        
        INSERT INTO public.customers (business_id, name, phone, city, gstin, outstanding_balance, credit_limit, status)
        VALUES 
        (biz, 'Kavitha Electricals & Hardware', '9443211223', 'Erode', '33AAECK4412K1Z9', 48200, 100000, 'active') RETURNING id INTO cust2;

        INSERT INTO public.customers (business_id, name, phone, city, gstin, outstanding_balance, credit_limit, status)
        VALUES 
        (biz, 'Balaji Motors & Spares', '9789012345', 'Salem', '33AAFCB8810M1Z4', 0, 150000, 'settled') RETURNING id INTO cust3;

        INSERT INTO public.customers (business_id, name, phone, city, outstanding_balance, credit_limit, status)
        VALUES 
        (biz, 'Raja Engineering Works', '9944123890', 'Coimbatore', 86400, 100000, 'overdue') RETURNING id INTO cust4;

        -- Products
        INSERT INTO public.products (business_id, name, sku, hsn, category, stock, min_stock_alert, unit, cost_price, selling_price, status)
        VALUES
        (biz, 'Copper Winding Wire 1.2mm (25kg Roll)', 'WW-COP-12', '8544', 'Electrical', 4, 10, 'Rolls', 18500, 22400, 'low_stock'),
        (biz, 'Heavy Duty Submersible Pump 5HP', 'PUMP-5HP-3PH', '8413', 'Motors & Pumps', 14, 5, 'Units', 16200, 19800, 'in_stock'),
        (biz, 'Industrial Ball Bearing 6205-2RS', 'BRG-6205-2RS', '8482', 'Mechanical', 0, 25, 'Pieces', 140, 210, 'out_of_stock'),
        (biz, 'Brass Connector Terminal Block 100A', 'TRM-BRS-100', '8536', 'Electrical', 120, 30, 'Pieces', 85, 135, 'in_stock');

        -- Suppliers
        INSERT INTO public.suppliers (business_id, name, contact_person, phone, city, gstin, outstanding_payable, category)
        VALUES
        (biz, 'Supreme Metals & Winding Corp', 'Ramesh Sharma', '9820011223', 'Mumbai / Hosur', '27AABCS9912K1Z8', 185000, 'Raw Metals & Wires'),
        (biz, 'Crompton Industrial Spares Hub', 'Natarajan K', '9442088991', 'Coimbatore', '33AAECR1122L1Z4', 62000, 'Motors & Spares');
    END IF;
END $$;
