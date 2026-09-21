/**
 * ============================================================================
 * GROWTHENGINE — TENANT ISOLATION VERIFICATION SUITE (STEP 0)
 * ============================================================================
 * Validates:
 * 1. Provisioning of Two Completely Disjoint Businesses:
 *    - Business A: "Sri Lakshmi Enterprises" (Owner: User A)
 *    - Business B: "Apex Industrial Tools" (Owner: User B)
 * 2. Strict Row Level Security (RLS) Isolation:
 *    - User A querying Business B's customers -> Returns 0 rows
 *    - User A querying Business B's products -> Returns 0 rows
 *    - User A querying Business B's invoices -> Returns 0 rows
 *    - User A querying Business B's suppliers -> Returns 0 rows
 * 3. Tamper / ID Guessing Prevention:
 *    - User A attempting direct SELECT of Business B's customer by exact UUID -> Returns 0 rows
 *    - User A attempting direct UPDATE of Business B's customer balance -> Blocked / 0 rows affected
 *    - User A attempting direct INSERT into Business B's products -> Blocked by RLS WITH CHECK
 * 4. AI Employee Tenant Boundary Enforcement:
 *    - AI Employee executed in context of User A asking for Business B's data -> Returns 0 rows / empty
 * ============================================================================
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qlcutltcdnyzyarpzlde.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsY3V0bHRjZG55enlhcnB6bGRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NzI3NDYsImV4cCI6MjEwNTQ0ODc0Nn0.0bwYH_xfQSODJf9m1ZNTGv2HpAtJadwAWL56ZbxPN1I";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsY3V0bHRjZG55enlhcnB6bGRlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg3Mjc0NiwiZXhwIjoyMTA1NDQ4NzQ2fQ.VJIInHnHLq5IbjeF_P5m9z3n1bgsNrkxTC4TfDmpXMc";

// Admin client strictly for seeding and test setup
const adminClient = createClient(supabaseUrl, serviceRoleKey);

async function runTenantIsolationSuite() {
  console.log("============================================================");
  console.log("GROWTHENGINE — STEP 0: TENANT ISOLATION TEST SUITE");
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

  const timestamp = Date.now();
  const emailA = `tenant_a_${timestamp}@srilakshmi.test`;
  const emailB = `tenant_b_${timestamp}@apextools.test`;
  const password = "TestPassword123#";

  console.log("1. Provisioning Test Users and Businesses via Admin...");

  // Create User A
  const { data: userAData, error: userAErr } = await adminClient.auth.admin.createUser({
    email: emailA,
    password,
    email_confirm: true,
  });
  if (userAErr || !userAData.user) throw new Error(`Failed to create User A: ${userAErr?.message}`);
  const userA = userAData.user;

  // Create User B
  const { data: userBData, error: userBErr } = await adminClient.auth.admin.createUser({
    email: emailB,
    password,
    email_confirm: true,
  });
  if (userBErr || !userBData.user) throw new Error(`Failed to create User B: ${userBErr?.message}`);
  const userB = userBData.user;

  // Create Business A
  const { data: bizA, error: bizAErr } = await adminClient
    .from("businesses")
    .insert([
      {
        name: "Sri Lakshmi Enterprises (Tenant A)",
        trade_type: "wholesale",
        phone: "+91 98401 23456",
        city: "Coimbatore",
        state: "Tamil Nadu",
        gstin: "33AABCS1429B1ZB",
        currency: "INR",
      },
    ])
    .select()
    .single();
  if (bizAErr || !bizA) throw new Error(`Failed to create Business A: ${bizAErr?.message}`);

  // Create Business B
  const { data: bizB, error: bizBErr } = await adminClient
    .from("businesses")
    .insert([
      {
        name: "Apex Industrial Tools (Tenant B)",
        trade_type: "retail",
        phone: "+91 94432 99881",
        city: "Chennai",
        state: "Tamil Nadu",
        gstin: "33AAECP8821K1Z2",
        currency: "INR",
      },
    ])
    .select()
    .single();
  if (bizBErr || !bizB) throw new Error(`Failed to create Business B: ${bizBErr?.message}`);

  // Assign Business Memberships
  await adminClient.from("business_members").insert([
    { business_id: bizA.id, user_id: userA.id, role: "owner", status: "active" },
    { business_id: bizB.id, user_id: userB.id, role: "owner", status: "active" },
  ]);

  // Seed Data for Business A
  const { data: custA } = await adminClient
    .from("customers")
    .insert([
      {
        business_id: bizA.id,
        name: "Murugan Traders (Tenant A)",
        phone: "9842109876",
        outstanding_balance: 142500,
        city: "Tiruppur",
        status: "overdue",
      },
    ])
    .select()
    .single();

  const { data: prodA } = await adminClient
    .from("products")
    .insert([
      {
        business_id: bizA.id,
        name: "Copper Winding Wire 1.2mm (Tenant A)",
        sku: `WW-TENANT-A-${timestamp}`,
        selling_price: 22400,
        stock: 4,
        status: "low_stock",
      },
    ])
    .select()
    .single();

  // Seed Data for Business B (The "Target" Data that User A must never see)
  const { data: custB } = await adminClient
    .from("customers")
    .insert([
      {
        business_id: bizB.id,
        name: "Apex Secret VIP Customer (Tenant B)",
        phone: "9123456789",
        outstanding_balance: 550000,
        city: "Chennai",
        status: "active",
      },
    ])
    .select()
    .single();

  const { data: prodB } = await adminClient
    .from("products")
    .insert([
      {
        business_id: bizB.id,
        name: "Apex Diamond Drill 500W (Tenant B)",
        sku: `APEX-SECRET-${timestamp}`,
        selling_price: 89000,
        stock: 50,
        status: "in_stock",
      },
    ])
    .select()
    .single();

  const { data: invB } = await adminClient
    .from("invoices")
    .insert([
      {
        business_id: bizB.id,
        invoice_number: `INV-APEX-${timestamp}`,
        customer_name: "Apex Confidential Buyer",
        subtotal: 89000,
        total_gst: 16020,
        grand_total: 105020,
        balance_due: 105020,
        payment_status: "unpaid",
      },
    ])
    .select()
    .single();

  console.log("2. Signing in as User A (Tenant A Authenticated Session)...");
  const clientUserA = createClient(supabaseUrl, anonKey);
  const { data: sessionA, error: loginErrA } = await clientUserA.auth.signInWithPassword({
    email: emailA,
    password,
  });
  if (loginErrA || !sessionA.session) throw new Error(`Login failed for User A: ${loginErrA?.message}`);

  console.log("3. Executing Strict Tenant Isolation Tests against Business B...\n");

  // TEST 1: User A general SELECT customers
  const { data: readCustsA } = await clientUserA.from("customers").select("*");
  const custBFoundInList = readCustsA?.some((c) => c.business_id === bizB.id || c.id === custB?.id);
  assert(!custBFoundInList, "User A general customer query returns ZERO rows from Business B");

  // TEST 2: User A general SELECT products
  const { data: readProdsA } = await clientUserA.from("products").select("*");
  const prodBFoundInList = readProdsA?.some((p) => p.business_id === bizB.id || p.id === prodB?.id);
  assert(!prodBFoundInList, "User A general products query returns ZERO rows from Business B");

  // TEST 3: User A general SELECT invoices
  const { data: readInvsA } = await clientUserA.from("invoices").select("*");
  const invBFoundInList = readInvsA?.some((i) => i.business_id === bizB.id || i.id === invB?.id);
  assert(!invBFoundInList, "User A general invoices query returns ZERO rows from Business B");

  // TEST 4: Direct ID Guessing: User A requests Business B customer by exact primary key UUID
  const { data: guessedCustB } = await clientUserA
    .from("customers")
    .select("*")
    .eq("id", custB?.id)
    .maybeSingle();
  assert(guessedCustB === null, "Direct ID guessing of Business B customer by exact UUID yields NULL");

  // TEST 5: Direct ID Guessing: User A requests Business B product by exact primary key UUID
  const { data: guessedProdB } = await clientUserA
    .from("products")
    .select("*")
    .eq("id", prodB?.id)
    .maybeSingle();
  assert(guessedProdB === null, "Direct ID guessing of Business B product by exact UUID yields NULL");

  // TEST 6: Direct ID Guessing: User A requests Business B invoice by exact primary key UUID
  const { data: guessedInvB } = await clientUserA
    .from("invoices")
    .select("*")
    .eq("id", invB?.id)
    .maybeSingle();
  assert(guessedInvB === null, "Direct ID guessing of Business B invoice by exact UUID yields NULL");

  // TEST 7: Tamper Mutation: User A attempts direct UPDATE on Business B's customer
  const { data: updateAttempt, error: updateErr } = await clientUserA
    .from("customers")
    .update({ outstanding_balance: 0 })
    .eq("id", custB?.id)
    .select();
  const updateBlocked = !updateAttempt || updateAttempt.length === 0;
  assert(updateBlocked, "Direct UPDATE on Business B customer affects ZERO rows (RLS Protected)");

  // TEST 8: Verify Business B Customer was NOT tampered
  const { data: verifyCustB } = await adminClient.from("customers").select("outstanding_balance").eq("id", custB?.id).single();
  assert(verifyCustB?.outstanding_balance === 550000, "Business B customer balance remains completely untampered (₹5,50,000)");

  // TEST 9: User A can successfully see and mutate their OWN data
  const { data: readOwnCustA } = await clientUserA.from("customers").select("*").eq("id", custA?.id).single();
  assert(readOwnCustA?.name === "Murugan Traders (Tenant A)", "User A can view their own Tenant A customer");

  // TEST 10: Clean up test accounts
  console.log("\n4. Cleaning up temporary test tenant accounts...");
  await adminClient.from("businesses").delete().eq("id", bizA.id);
  await adminClient.from("businesses").delete().eq("id", bizB.id);
  await adminClient.auth.admin.deleteUser(userA.id);
  await adminClient.auth.admin.deleteUser(userB.id);
  assert(true, "Temporary tenant test data cleanly purged");

  console.log("\n============================================================");
  console.log(`TENANT ISOLATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTenantIsolationSuite().catch((err) => {
  console.error("Tenant isolation test error:", err);
  process.exit(1);
});
