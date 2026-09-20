/**
 * Tenant Isolation Test Script
 *
 * Proves that User A cannot read or write User B's business data.
 * Self-contained: creates demo users via Supabase Auth API, seeds
 * businesses, runs tests, then cleans up.
 *
 * Run: npx tsx supabase/test-isolation.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually (tsx doesn't auto-load Next.js env files)
const envPath = resolve(process.cwd(), ".env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  console.error("Could not read .env.local — make sure it exists in project root.");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

// Demo credentials
const USER_A = { email: "demo-a@growthengine.test", password: "demo-password-123!" };
const USER_B = { email: "demo-b@growthengine.test", password: "demo-password-123!" };

let passed = 0;
let failed = 0;

// ── Helpers ──

async function signUp(email: string, password: string): Promise<{ access_token: string; user_id: string }> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email,
      password,
      data: { full_name: email.split("@")[0] },
    }),
  });
  const data = await res.json();
  // If user already exists, try to sign in instead
  if (data.error || !data.access_token) {
    return signIn(email, password);
  }
  return { access_token: data.access_token, user_id: data.user?.id ?? data.id };
}

async function signIn(email: string, password: string): Promise<{ access_token: string; user_id: string }> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Auth failed for ${email}: ${JSON.stringify(data)}`);
  }
  return { access_token: data.access_token, user_id: data.user?.id ?? "" };
}

async function query(
  token: string,
  table: string,
  params: string = ""
): Promise<{ data: any[]; status: number }> {
  const url = `${SUPABASE_URL}/rest/v1/${table}${params ? "?" + params : ""}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = await res.json();
  return { data: Array.isArray(data) ? data : [], status: res.status };
}

async function insertRow(
  token: string,
  table: string,
  body: Record<string, unknown>
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function patchRow(
  token: string,
  table: string,
  filter: string,
  body: Record<string, unknown>
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

// ── Setup: create users and businesses ──

async function setup() {
  console.log("Setting up demo users and businesses...\n");

  // Sign up (or sign in) both users
  const authA = await signUp(USER_A.email, USER_A.password);
  console.log(`  User A: ${authA.user_id}`);

  const authB = await signUp(USER_B.email, USER_B.password);
  console.log(`  User B: ${authB.user_id}`);

  // Check if businesses already exist
  const existingA = await query(authA.access_token, "businesses", "select=id");
  const existingB = await query(authB.access_token, "businesses", "select=id");

  let bizAId: string;
  let bizBId: string;

  if (existingA.data.length > 0) {
    bizAId = existingA.data[0].id;
    console.log(`  Business A already exists: ${bizAId}`);
  } else {
    const bizA = await insertRow(authA.access_token, "businesses", {
      name: "Acme Corp (Demo)",
      address: "123 MG Road, Bengaluru",
      phone: "+91 80 1234 5678",
      email: "hello@acmecorp.test",
      gstin: "29AAAAA0000A1Z5",
      currency: "INR",
      invoice_prefix: "ACM",
      created_by: authA.user_id,
    });
    if (bizA.status >= 400) {
      console.error("  Failed to create Business A:", bizA.data);
      process.exit(1);
    }
    bizAId = bizA.data[0].id;
    console.log(`  Business A created: ${bizAId}`);

    // Add as owner
    await insertRow(authA.access_token, "business_members", {
      business_id: bizAId,
      user_id: authA.user_id,
      role: "owner",
    });
  }

  if (existingB.data.length > 0) {
    bizBId = existingB.data[0].id;
    console.log(`  Business B already exists: ${bizBId}`);
  } else {
    const bizB = await insertRow(authB.access_token, "businesses", {
      name: "Beta Industries (Demo)",
      address: "456 Anna Salai, Chennai",
      phone: "+91 44 9876 5432",
      email: "info@betaindustries.test",
      gstin: "33BBBBB0000B1Z3",
      currency: "INR",
      invoice_prefix: "BTA",
      created_by: authB.user_id,
    });
    if (bizB.status >= 400) {
      console.error("  Failed to create Business B:", bizB.data);
      process.exit(1);
    }
    bizBId = bizB.data[0].id;
    console.log(`  Business B created: ${bizBId}`);

    // Add as owner
    await insertRow(authB.access_token, "business_members", {
      business_id: bizBId,
      user_id: authB.user_id,
      role: "owner",
    });
  }

  console.log("");
  return { authA, authB, bizAId, bizBId };
}

// ── Tests ──

async function main() {
  console.log("🔐 Tenant Isolation Tests\n");

  const { authA, authB, bizAId, bizBId } = await setup();
  const tokenA = authA.access_token;
  const tokenB = authB.access_token;

  // ── Test 1: businesses table ──
  console.log("── businesses table ──");

  const bizA = await query(tokenA, "businesses");
  assert(
    bizA.data.length >= 1 && bizA.data.every((b: any) => b.id !== bizBId),
    "User A cannot see Business B"
  );
  assert(
    bizA.data.some((b: any) => b.id === bizAId),
    "User A can see Business A"
  );

  const bizB = await query(tokenB, "businesses");
  assert(
    bizB.data.length >= 1 && bizB.data.every((b: any) => b.id !== bizAId),
    "User B cannot see Business A"
  );
  assert(
    bizB.data.some((b: any) => b.id === bizBId),
    "User B can see Business B"
  );

  // Try to read other business by ID
  const crossReadA = await query(tokenA, "businesses", `id=eq.${bizBId}`);
  assert(crossReadA.data.length === 0, "User A gets 0 rows querying Business B by ID");

  const crossReadB = await query(tokenB, "businesses", `id=eq.${bizAId}`);
  assert(crossReadB.data.length === 0, "User B gets 0 rows querying Business A by ID");

  // ── Test 2: business_members table ──
  console.log("\n── business_members table ──");

  const memA = await query(tokenA, "business_members");
  assert(
    memA.data.every((m: any) => m.business_id !== bizBId),
    "User A cannot see Business B memberships"
  );

  const memB = await query(tokenB, "business_members");
  assert(
    memB.data.every((m: any) => m.business_id !== bizAId),
    "User B cannot see Business A memberships"
  );

  // ── Test 3: Cross-tenant writes ──
  console.log("\n── Cross-tenant writes ──");

  // User B tries to update Business A
  const crossUpdate = await patchRow(tokenB, "businesses", `id=eq.${bizAId}`, {
    name: "HACKED BY USER B",
  });
  assert(
    Array.isArray(crossUpdate.data) && crossUpdate.data.length === 0,
    "User B cannot update Business A"
  );

  // Verify name wasn't changed
  const checkA = await query(tokenA, "businesses", `id=eq.${bizAId}`);
  assert(
    checkA.data[0]?.name !== "HACKED BY USER B",
    "Business A name unchanged after cross-tenant update attempt"
  );

  // User A tries to insert audit log for Business B
  const crossAudit = await insertRow(tokenA, "audit_logs", {
    business_id: bizBId,
    action: "hack_attempt",
    entity_type: "test",
  });
  assert(
    crossAudit.status >= 400,
    "User A cannot insert audit log into Business B"
  );

  // ── Test 4: profiles isolation ──
  console.log("\n── profiles table ──");

  const profileA = await query(tokenA, "profiles");
  assert(
    profileA.data.length === 1 && profileA.data[0].id === authA.user_id,
    "User A can only see own profile"
  );

  const profileB = await query(tokenB, "profiles");
  assert(
    profileB.data.length === 1 && profileB.data[0].id === authB.user_id,
    "User B can only see own profile"
  );

  // ── Test 5: audit_logs isolation ──
  console.log("\n── audit_logs table ──");

  // Insert an audit log for each business
  await insertRow(tokenA, "audit_logs", {
    business_id: bizAId,
    action: "test",
    entity_type: "test",
  });
  await insertRow(tokenB, "audit_logs", {
    business_id: bizBId,
    action: "test",
    entity_type: "test",
  });

  const logsA = await query(tokenA, "audit_logs");
  assert(
    logsA.data.every((l: any) => l.business_id !== bizBId),
    "User A cannot see Business B audit logs"
  );

  const logsB = await query(tokenB, "audit_logs");
  assert(
    logsB.data.every((l: any) => l.business_id !== bizAId),
    "User B cannot see Business A audit logs"
  );

  // ── Summary ──
  console.log(`\n${"═".repeat(44)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`${"═".repeat(44)}\n`);

  if (failed > 0) {
    console.log("⚠️  Some tests failed! Check your RLS policies.");
    process.exit(1);
  } else {
    console.log("🎉 All tenant isolation tests passed!");
    process.exit(0);
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
