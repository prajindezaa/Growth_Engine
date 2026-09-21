export type AIRouteId =
  // A) SALES & REVENUE
  | "today_sales"
  | "sales_by_period"
  | "top_products"
  | "top_customers"
  | "sales_trend"
  // B) OUTSTANDING / KHATA
  | "total_outstanding"
  | "customers_above_threshold"
  | "overdue_only"
  | "supplier_payables"
  | "send_payment_reminder"
  // C) INVENTORY & STOCK
  | "low_stock"
  | "out_of_stock"
  | "stock_level_specific"
  | "inventory_value"
  | "create_stock_adjustment"
  // D) CUSTOMERS & SUPPLIERS
  | "customer_lookup"
  | "customer_last_order"
  | "new_customers"
  | "supplier_lookup"
  // E) PURCHASES
  | "recent_purchases"
  | "pending_pos"
  | "create_purchase_order"
  // F) SALES DOCUMENTS (ACTIONS)
  | "create_quotation"
  | "create_invoice"
  | "record_payment"
  | "cancel_invoice" // High risk
  // G) REPORTS & EXPORTS
  | "report_summary"
  | "gst_summary"
  | "profit_margin"
  | "export_report_pdf"
  | "export_report_excel"
  | "export_data"
  // H) NOTIFICATIONS & APPROVALS
  | "pending_approvals"
  | "automation_status"
  | "recent_notifications"
  // I) TEAM & ROLES
  | "team_summary"
  | "change_team_member_role" // High risk, strong confirmation
  | "remove_team_member" // High risk, strong confirmation
  // J) META & CONVERSATION
  | "capability_check"
  | "greeting"
  | "clarification_needed"
  | "out_of_scope"
  // L) ACCOUNT & PROFILE
  | "my_account_info"
  | "my_business_info"
  | "my_plan_subscription"
  | "update_business_setting" // Action, standard confirmation
  // M) SYSTEM / ORIENTATION
  | "current_date_time"
  | "app_help_navigation"
  // N) EXPANDED ACTION COVERAGE
  | "update_customer"
  | "update_supplier"
  | "update_product"
  | "update_invoice_status"
  | "create_automation_rule";

export interface AIActionProposalData {
  id: string;
  type: string;
  route: AIRouteId;
  title: string;
  targetEntity: string;
  what: string;
  details: Record<string, string | number>;
  consequences: string;
  isHighRisk?: boolean; // Requires stronger confirmation e.g. cancel invoice
  status: "pending" | "confirmed" | "cancelled";
  auditId?: string;
}

export interface StructuredCardItem {
  id: string;
  title: string;
  subtitle?: string;
  primaryValue?: string;
  badge?: {
    text: string;
    variant: "success" | "warning" | "danger" | "neutral" | "primary";
  };
  linkHref?: string;
}

export interface AIResponsePayload {
  route: AIRouteId;
  reply: string;
  structuredCards?: {
    type: "customer_list" | "product_list" | "invoice_list" | "stats_list";
    title?: string;
    items: StructuredCardItem[];
  };
  actionProposal?: AIActionProposalData | null;
  clarificationOptions?: string[];
  offeredNextStep?: string;
  auditId?: string;
}

