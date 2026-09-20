-- ============================================================
-- Migration 016: Dashboard Views & Functions
-- ============================================================

-- ── Business dashboard stats ──
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
  v_today_sales NUMERIC;
  v_avg_daily_sales NUMERIC;
  v_total_receivable NUMERIC;
  v_total_payable NUMERIC;
  v_overdue_count INTEGER;
  v_overdue_amount NUMERIC;
  v_due_today_count INTEGER;
  v_due_week_count INTEGER;
  v_low_stock_count INTEGER;
  v_pending_orders INTEGER;
  v_total_products INTEGER;
  v_total_customers INTEGER;
  v_total_suppliers INTEGER;
BEGIN
  -- Today's sales (finalized/paid invoices created today)
  SELECT COALESCE(SUM(grand_total), 0) INTO v_today_sales
  FROM public.invoices
  WHERE business_id = p_business_id AND status IN ('finalized','paid','partially_paid','sent')
    AND DATE(created_at) = CURRENT_DATE;

  -- Average daily sales (last 30 days)
  SELECT COALESCE(SUM(grand_total) / GREATEST(1, COUNT(DISTINCT DATE(created_at))), 0) INTO v_avg_daily_sales
  FROM public.invoices
  WHERE business_id = p_business_id AND status IN ('finalized','paid','partially_paid','sent','overdue')
    AND created_at >= CURRENT_DATE - 30;

  -- Total receivable (unpaid invoice amounts)
  SELECT COALESCE(SUM(grand_total - amount_paid), 0) INTO v_total_receivable
  FROM public.invoices
  WHERE business_id = p_business_id AND status NOT IN ('cancelled','draft') AND payment_status != 'paid';

  -- Total payable (unpaid purchase amounts)
  SELECT COALESCE(SUM(grand_total - amount_paid), 0) INTO v_total_payable
  FROM public.purchases
  WHERE business_id = p_business_id AND status = 'finalized' AND payment_status != 'paid';

  -- Overdue invoices
  SELECT COUNT(*), COALESCE(SUM(grand_total - amount_paid), 0) INTO v_overdue_count, v_overdue_amount
  FROM public.invoices
  WHERE business_id = p_business_id AND due_date < CURRENT_DATE AND payment_status != 'paid' AND status NOT IN ('cancelled','draft');

  -- Due today
  SELECT COUNT(*) INTO v_due_today_count
  FROM public.invoices
  WHERE business_id = p_business_id AND due_date = CURRENT_DATE AND payment_status != 'paid' AND status NOT IN ('cancelled','draft');

  -- Due this week
  SELECT COUNT(*) INTO v_due_week_count
  FROM public.invoices
  WHERE business_id = p_business_id AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 AND payment_status != 'paid' AND status NOT IN ('cancelled','draft');

  -- Low stock
  SELECT COUNT(*) INTO v_low_stock_count
  FROM public.products
  WHERE business_id = p_business_id AND is_active = true AND current_stock <= min_stock;

  -- Pending sales orders
  SELECT COUNT(*) INTO v_pending_orders
  FROM public.sales_orders
  WHERE business_id = p_business_id AND status IN ('draft','confirmed');

  -- Totals
  SELECT COUNT(*) INTO v_total_products FROM public.products WHERE business_id = p_business_id AND is_active = true;
  SELECT COUNT(*) INTO v_total_customers FROM public.customers WHERE business_id = p_business_id;
  SELECT COUNT(*) INTO v_total_suppliers FROM public.suppliers WHERE business_id = p_business_id;

  v_result := jsonb_build_object(
    'today_sales', v_today_sales,
    'avg_daily_sales', ROUND(v_avg_daily_sales, 2),
    'total_receivable', v_total_receivable,
    'total_payable', v_total_payable,
    'overdue_count', v_overdue_count,
    'overdue_amount', v_overdue_amount,
    'due_today_count', v_due_today_count,
    'due_week_count', v_due_week_count,
    'low_stock_count', v_low_stock_count,
    'pending_orders', v_pending_orders,
    'total_products', v_total_products,
    'total_customers', v_total_customers,
    'total_suppliers', v_total_suppliers
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats TO authenticated;

-- ── Sales trend (last 30 days, grouped by date) ──
CREATE OR REPLACE FUNCTION public.get_sales_trend(p_business_id UUID, p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.d), '[]'::jsonb) INTO v_result
  FROM (
    SELECT d::date AS d, COALESCE(SUM(i.grand_total), 0) AS total
    FROM generate_series(CURRENT_DATE - p_days, CURRENT_DATE, '1 day') AS d
    LEFT JOIN public.invoices i ON DATE(i.created_at) = d::date AND i.business_id = p_business_id AND i.status NOT IN ('cancelled','draft')
    GROUP BY d::date
  ) t;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sales_trend TO authenticated;

-- ── Top selling products (this month) ──
CREATE OR REPLACE FUNCTION public.get_top_products(p_business_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_result
  FROM (
    SELECT li.product_name, SUM(li.quantity) AS total_qty, SUM(li.line_total) AS total_revenue
    FROM public.line_items li
    JOIN public.invoices inv ON inv.id = li.parent_id AND li.parent_type = 'invoice'
    WHERE inv.business_id = p_business_id AND inv.status NOT IN ('cancelled','draft')
      AND inv.created_at >= date_trunc('month', CURRENT_DATE)
    GROUP BY li.product_name
    ORDER BY total_revenue DESC
    LIMIT p_limit
  ) t;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_products TO authenticated;

-- ── Customer-wise outstanding ──
CREATE OR REPLACE FUNCTION public.get_customer_outstanding(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_result
  FROM (
    SELECT c.id, c.name, COALESCE(SUM(i.grand_total - i.amount_paid), 0) AS outstanding
    FROM public.customers c
    LEFT JOIN public.invoices i ON i.customer_id = c.id AND i.status NOT IN ('cancelled','draft') AND i.payment_status != 'paid'
    WHERE c.business_id = p_business_id
    GROUP BY c.id, c.name
    HAVING COALESCE(SUM(i.grand_total - i.amount_paid), 0) > 0
    ORDER BY outstanding DESC
  ) t;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_outstanding TO authenticated;

-- ── Supplier-wise outstanding ──
CREATE OR REPLACE FUNCTION public.get_supplier_outstanding(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_result
  FROM (
    SELECT s.id, s.name, COALESCE(SUM(p.grand_total - p.amount_paid), 0) AS outstanding
    FROM public.suppliers s
    LEFT JOIN public.purchases p ON p.supplier_id = s.id AND p.status = 'finalized' AND p.payment_status != 'paid'
    WHERE s.business_id = p_business_id
    GROUP BY s.id, s.name
    HAVING COALESCE(SUM(p.grand_total - p.amount_paid), 0) > 0
    ORDER BY outstanding DESC
  ) t;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_supplier_outstanding TO authenticated;
