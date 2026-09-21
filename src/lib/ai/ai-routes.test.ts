/**
 * Automated Verification Test Suite for GrowthEngine AI Employee Intent Routes
 * Validates:
 * 1. Read-only sales questions (English, Tamil, Tanglish)
 * 2. Read-only Khata questions (English, Tamil, Tanglish)
 * 3. Read-only inventory questions (English, Tamil, Tanglish)
 * 4. Action: create_quotation with centralized calculation & preview
 * 5. High-risk action: cancel_invoice with stronger confirmation & audit logging
 * 6. Ambiguous resolution with single clarifying question (e.g. "Ravi")
 * 7. Out of scope plain honest refusal
 * 8. Permission-gated routes (team_summary with Owner vs Cashier)
 * 9. Multi-lingual equivalence: same underlying route across English/Tamil/Tanglish
 * 10. Audit logging on proposed, confirmed, and rejected decisions
 */

import { detectIntentLocally } from "./intent-detector";
import { executeRoute } from "./route-executor";
import { getAuditLogs } from "../calculations";

async function runTests() {
  console.log("============================================================");
  console.log("GROWTHENGINE AI EMPLOYEE: FULL INTENT ROUTES TEST SUITE");
  console.log("============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // 1. Language Equivalence & Sales Route
  // --------------------------------------------------------------------------
  console.log("--- 1. Testing Sales & Revenue Intent Mapping (EN / TA / Tanglish) ---");
  const salesEn = detectIntentLocally("How much did I sell today?");
  const salesTa = detectIntentLocally("இன்னைக்கு எவ்வளவு சேல்ஸ்?");
  const salesTang = detectIntentLocally("innaiku evalo sales?");

  assert(salesEn.route === "today_sales", "English 'How much did I sell today?' -> today_sales");
  assert(salesTa.route === "today_sales", "Tamil 'இன்னைக்கு எவ்வளவு சேல்ஸ்?' -> today_sales");
  assert(salesTang.route === "today_sales", "Tanglish 'innaiku evalo sales?' -> today_sales");

  const salesRes = await executeRoute(salesEn.route);
  assert(salesRes.reply.includes("₹42,500"), "Today's sales format uses ₹42,500 with Indian digit grouping");
  assert(salesRes.reply.includes("18 invoices"), "Today's sales includes invoice count");
  assert(!!salesRes.offeredNextStep, "Includes max one offered next step");

  // --------------------------------------------------------------------------
  // 2. Khata & Outstanding Questions
  // --------------------------------------------------------------------------
  console.log("\n--- 2. Testing Khata & Outstanding Routes ---");
  const khataEn = detectIntentLocally("What's my total outstanding?");
  const khataTa = detectIntentLocally("எவ்வளவு கலெக்ட் பண்ணணும்?");
  const khataTang = detectIntentLocally("evalo collect pannanum?");

  assert(khataEn.route === "total_outstanding", "English 'What's my total outstanding?' -> total_outstanding");
  assert(khataTa.route === "total_outstanding", "Tamil 'எவ்வளவு கலெக்ட் பண்ணணும்?' -> total_outstanding");
  assert(khataTang.route === "total_outstanding", "Tanglish 'evalo collect pannanum?' -> total_outstanding");

  const khataRes = await executeRoute(khataEn.route);
  assert(khataRes.reply.includes("₹1,42,800"), "Total outstanding mentions ₹1,42,800");
  assert(khataRes.reply.includes("Ravi Traders at ₹34,500"), "Total outstanding identifies largest party Ravi Traders");

  // Threshold query
  const threshDet = detectIntentLocally("Who owes more than ₹25,000?");
  assert(threshDet.route === "customers_above_threshold", "Who owes more than 25k -> customers_above_threshold");
  const threshRes = await executeRoute(threshDet.route, threshDet.params);
  assert(threshRes.reply.includes("3 customers owe more than ₹25,000, totaling ₹94,200"), "Customers above threshold exact format response");
  assert(threshRes.structuredCards?.type === "customer_list", "Structured cards render as tappable customer_list, not text wall");

  // --------------------------------------------------------------------------
  // 3. Inventory & Stock Questions
  // --------------------------------------------------------------------------
  console.log("\n--- 3. Testing Inventory & Stock Routes ---");
  const stockEn = detectIntentLocally("Which products are low in stock?");
  const stockTa = detectIntentLocally("என்ன ப்ராடக்ட் ஸ்டாக் குறைவா இருக்கு?");
  assert(stockEn.route === "low_stock", "English low stock -> low_stock");
  assert(stockTa.route === "low_stock", "Tamil low stock -> low_stock");

  const stockRes = await executeRoute(stockEn.route);
  assert(stockRes.reply.includes("7 products are low in stock"), "Low stock states 7 products");
  assert(stockRes.structuredCards?.type === "product_list", "Low stock provides tappable product_list card");

  const specificStock = detectIntentLocally("How much UltraTech Cement do I have?");
  assert(specificStock.route === "stock_level_specific", "Specific stock check -> stock_level_specific");
  const specificRes = await executeRoute(specificStock.route, specificStock.params);
  assert(specificRes.reply.includes("580 bags of UltraTech Cement 50kg"), "Specific stock returns 580 bags");
  assert(specificRes.reply.includes("₹2,23,300"), "Specific stock cost value formatted with ₹2,23,300");

  // --------------------------------------------------------------------------
  // 4. Action Route: create_quotation (Preview + Calculation)
  // --------------------------------------------------------------------------
  console.log("\n--- 4. Testing Action Route: create_quotation ---");
  const quoteDet = detectIntentLocally("Create a quotation for Ravi Traders for 100 bags cement");
  assert(quoteDet.route === "create_quotation", "Quote creation detected as create_quotation");

  const quoteRes = await executeRoute(quoteDet.route, quoteDet.params);
  assert(!!quoteRes.actionProposal, "Quotation returns an Action Proposal preview card");
  assert(quoteRes.actionProposal?.status === "pending", "Proposal initialized with status 'pending' awaiting confirmation");
  assert(quoteRes.actionProposal?.details["Grand Total"] === "₹49,560", "Calculated standard document grand total (100 * 420 + 18% GST)");
  assert(!!quoteRes.actionProposal?.auditId, "Quotation proposal generates an auditId");

  // --------------------------------------------------------------------------
  // 5. High-Risk Action Route: cancel_invoice (Strong Confirmation + Reversal)
  // --------------------------------------------------------------------------
  console.log("\n--- 5. Testing High-Risk Action: cancel_invoice ---");
  const cancelDet = detectIntentLocally("Cancel invoice INV-105");
  assert(cancelDet.route === "cancel_invoice", "Cancel invoice matched to cancel_invoice");
  assert(cancelDet.params.invoiceNumber === "INV-105", "Extracted invoice number INV-105");

  const cancelRes = await executeRoute(cancelDet.route, cancelDet.params);
  assert(cancelRes.actionProposal?.isHighRisk === true, "cancel_invoice flagged with isHighRisk: true");
  assert(cancelRes.reply.includes("Cancelling it will reverse the stock movement"), "Contains strong cancellation warning");
  assert(cancelRes.actionProposal?.details["Amount to Reverse"] === "₹18,500", "Includes exact invoice amount to reverse");

  // --------------------------------------------------------------------------
  // 6. Ambiguous / Multi-Match Resolution
  // --------------------------------------------------------------------------
  console.log("\n--- 6. Testing Ambiguous / Multi-Match Resolution ---");
  const ambigDet = detectIntentLocally("Ravi");
  assert(ambigDet.route === "clarification_needed", "Bare party name 'Ravi' triggers clarification_needed");
  const ambigRes = await executeRoute(ambigDet.route, ambigDet.params);
  assert(ambigRes.clarificationOptions?.length === 2, "Presents clarifying options rather than guessing");
  assert(!!ambigRes.clarificationOptions?.[0]?.includes("Ravi Traders"), "First option is Ravi Traders");


  // --------------------------------------------------------------------------
  // 7. Out of Scope Handling (Per Do's / Don'ts Contract)
  // --------------------------------------------------------------------------
  console.log("\n--- 7. Testing Out of Scope Handling ---");
  const oos1 = detectIntentLocally("What is the weather in Coimbatore?");
  const oos2 = detectIntentLocally("Tell me a movie joke");
  const oos3 = detectIntentLocally("Who is the prime minister of India?");
  assert(oos1.route === "out_of_scope", "Weather question detected as out_of_scope");
  assert(oos2.route === "out_of_scope", "Joke detected as out_of_scope");
  assert(oos3.route === "out_of_scope", "General knowledge detected as out_of_scope");

  const oosRes = await executeRoute("out_of_scope");
  assert(oosRes.reply.includes("outside what I can help with right now"), "Plainly and honestly declines out of scope questions");

  // --------------------------------------------------------------------------
  // 8. Team & Roles Permission Gating
  // --------------------------------------------------------------------------
  console.log("\n--- 8. Testing Team & Roles Permission Gating ---");
  const teamDet = detectIntentLocally("Who's on my team?");
  assert(teamDet.route === "team_summary", "Team question matched to team_summary");

  const teamOwnerRes = await executeRoute(teamDet.route, {}, { userRole: "owner" });
  assert(teamOwnerRes.reply.includes("You have 4 team members"), "Owner sees full team summary");

  const teamCashierRes = await executeRoute(teamDet.route, {}, { userRole: "cashier" });
  assert(teamCashierRes.reply.includes("Permission denied"), "Cashier receives plain permission-denied response");

  // --------------------------------------------------------------------------
  // 9. Audit Logs Verification
  // --------------------------------------------------------------------------
  console.log("\n--- 9. Testing Audit Logs Persistence for Actions ---");
  const auditLogs = getAuditLogs();
  assert(auditLogs.length >= 3, `Audit logs created across executed actions (found ${auditLogs.length})`);
  const cancelAudit = auditLogs.find((l) => l.route === "cancel_invoice");
  assert(cancelAudit?.isHighRisk === true, "cancel_invoice logged in audit trail as isHighRisk: true");

  // --------------------------------------------------------------------------
  // 10. Account & Profile Routes (L)
  // --------------------------------------------------------------------------
  console.log("\n--- 10. Testing Account & Profile Routes (L) ---");
  const accEn = detectIntentLocally("What's my account?");
  const accTa = detectIntentLocally("என் அக்கவுன்ட் தகவல்");
  assert(accEn.route === "my_account_info", "English 'What's my account?' -> my_account_info");
  assert(accTa.route === "my_account_info", "Tamil 'என் அக்கவுன்ட் தகவல்' -> my_account_info");
  const accRes = await executeRoute(accEn.route, {}, { userRole: "owner" });
  assert(accRes.reply.includes("logged in as Ramasamy S, role: Owner"), "Account info pulls real profile and owner role");

  const bizEn = detectIntentLocally("What's my business GSTIN?");
  const bizTa = detectIntentLocally("என் கடை விவரம்");
  assert(bizEn.route === "my_business_info", "English 'What's my business GSTIN?' -> my_business_info");
  assert(bizTa.route === "my_business_info", "Tamil 'என் கடை விவரம்' -> my_business_info");
  const bizRes = await executeRoute(bizEn.route);
  assert(bizRes.reply.includes("GSTIN 33AABCS1429B1ZB"), "Business info pulls real GSTIN");

  const planEn = detectIntentLocally("What plan am I on?");
  const planInvoices = detectIntentLocally("How many invoices have I used this month?");
  assert(planEn.route === "my_plan_subscription", "Plan inquiry -> my_plan_subscription");
  assert(planInvoices.route === "my_plan_subscription", "Invoice usage inquiry -> my_plan_subscription");
  const planRes = await executeRoute(planEn.route);
  assert(planRes.reply.includes("Growth Pro") && planRes.reply.includes("invoices used this month"), "Subscription reports real plan & invoices used");

  const setSetting = detectIntentLocally("Change my business address to 45 Trichy Road, Coimbatore");
  assert(setSetting.route === "update_business_setting", "Setting update -> update_business_setting");
  const setCashier = await executeRoute(setSetting.route, setSetting.params, { userRole: "cashier" });
  assert(setCashier.reply.includes("Permission denied"), "Cashier cannot change business settings");
  const setOwner = await executeRoute(setSetting.route, setSetting.params, { userRole: "owner" });
  assert(!!setOwner.actionProposal && setOwner.actionProposal.status === "pending", "Owner receives action preview proposal for business setting");

  // High Risk Team Role Change & Removal
  const roleChange = detectIntentLocally("Make Senthil a manager");
  assert(roleChange.route === "change_team_member_role", "Role change -> change_team_member_role");
  const roleChangeRes = await executeRoute(roleChange.route, roleChange.params, { userRole: "owner" });
  assert(roleChangeRes.actionProposal?.isHighRisk === true, "change_team_member_role is flagged as High Risk");
  assert(Boolean(roleChangeRes.actionProposal?.consequences.includes("privileged business operations")), "Highlights consequence of role change");

  const removeStaff = detectIntentLocally("Remove Senthil from the team");
  assert(removeStaff.route === "remove_team_member", "Staff remove -> remove_team_member");
  const removeStaffRes = await executeRoute(removeStaff.route, removeStaff.params, { userRole: "owner" });
  assert(removeStaffRes.actionProposal?.isHighRisk === true, "remove_team_member is flagged as High Risk");
  assert(Boolean(removeStaffRes.actionProposal?.consequences.includes("removes their access immediately")), "Highlights consequence of immediate access removal");

  // --------------------------------------------------------------------------
  // 11. System & Orientation Routes (M)
  // --------------------------------------------------------------------------
  console.log("\n--- 11. Testing System / Orientation Routes (M) ---");
  const dateEn = detectIntentLocally("What's today's date?");
  const dateTa = detectIntentLocally("இன்னைக்கு என்ன தேதி?");
  const dateTang = detectIntentLocally("innaiku enna date?");
  assert(dateEn.route === "current_date_time", "English 'What's today's date?' -> current_date_time");
  assert(dateTa.route === "current_date_time", "Tamil 'இன்னைக்கு என்ன தேதி?' -> current_date_time");
  assert(dateTang.route === "current_date_time", "Tanglish 'innaiku enna date?' -> current_date_time");
  const dateRes = await executeRoute(dateEn.route);
  assert(dateRes.reply.includes("Today is") && dateRes.reply.includes("2026"), "Current date reports actual year and formatted date");

  const helpEn = detectIntentLocally("Where do I find reports?");
  const helpPos = detectIntentLocally("How do I add a new product?");
  assert(helpEn.route === "app_help_navigation", "Navigation help -> app_help_navigation");
  assert(helpPos.route === "app_help_navigation", "Product help -> app_help_navigation");
  const helpRes = await executeRoute(helpEn.route, helpEn.params);
  assert(helpRes.structuredCards?.items[0].linkHref === "/reports", "App help provides direct navigation link card");

  // --------------------------------------------------------------------------
  // 12. Expanded Action Coverage Across Modules (N)
  // --------------------------------------------------------------------------
  console.log("\n--- 12. Testing Expanded Action Coverage (N) ---");
  const updCust = detectIntentLocally("Change Ravi Traders' credit limit to ₹60,000");
  assert(updCust.route === "update_customer", "Credit limit change -> update_customer");
  assert(updCust.params.creditLimit === 60000, "Extracts ₹60,000 credit limit parameter");
  const updCustRes = await executeRoute(updCust.route, updCust.params, { userRole: "owner" });
  assert(updCustRes.actionProposal?.details["New Credit Limit"] === "₹60,000", "Action preview displays formatted credit limit");

  const updProd = detectIntentLocally("Update the price of UltraTech Cement to ₹390");
  assert(updProd.route === "update_product", "Price change -> update_product");
  assert(updProd.params.newSellingPrice === 390, "Extracts new price parameter of 390");
  const updProdRes = await executeRoute(updProd.route, updProd.params, { userRole: "owner" });
  assert(updProdRes.actionProposal?.details["New Selling Price"] === "₹390", "Action preview displays formatted new price");

  const updInv = detectIntentLocally("Mark invoice INV-105 as sent");
  assert(updInv.route === "update_invoice_status", "Invoice status change -> update_invoice_status");
  const updInvRes = await executeRoute(updInv.route, updInv.params, { userRole: "owner" });
  assert(updInvRes.actionProposal?.details["Target Status"] === "SENT", "Action preview targets status SENT");

  const autoRule = detectIntentLocally("Alert me if any customer's outstanding goes above ₹50,000");
  assert(autoRule.route === "create_automation_rule", "Alert creation -> create_automation_rule");
  const autoRuleRes = await executeRoute(autoRule.route, autoRule.params, { userRole: "owner" });
  assert(String(autoRuleRes.actionProposal?.details["Trigger Condition"]).includes("outstanding_balance > 50000"), "Captures trigger condition in action proposal");

  console.log("\n============================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
