-- ============================================================
-- Seed Script: 2 Demo Businesses
-- ============================================================
-- This ONLY creates business data. Demo users are created
-- automatically by the test script via the Supabase Auth API.
--
-- Run AFTER all migrations (001-003).
-- ============================================================

-- NOTE: The test script will create the users and insert
-- the businesses + memberships. This file is kept as a
-- reference and for manual seeding if needed.

-- If you already ran the previous seed.sql and got errors,
-- clean up first:
DELETE FROM public.audit_logs WHERE business_id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);
DELETE FROM public.business_members WHERE business_id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);
DELETE FROM public.businesses WHERE id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);

-- Clean up broken auth entries if they exist
DELETE FROM auth.identities WHERE user_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);
DELETE FROM auth.users WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);
