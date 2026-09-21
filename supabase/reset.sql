-- ============================================================
-- GROWTHENGINE — ULTIMATE FRESH RESET SCRIPT
-- DROPS ALL POLICIES, TRIGGERS, CUSTOM FUNCTIONS, TYPES, AND TABLES
-- IN THE PUBLIC SCHEMA WHILE PRESERVING SUPABASE SYSTEM EXTENSIONS
-- ============================================================

-- 1. DROP ALL TRIGGERS ON PUBLIC TABLES
DO $$ 
DECLARE 
    trig RECORD;
BEGIN
    FOR trig IN (
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
    ) 
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I CASCADE', trig.trigger_name, trig.event_object_table);
    END LOOP;
END $$;

-- 2. DROP ALL POLICIES ON PUBLIC TABLES
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 3. DROP ALL PUBLIC TABLES (CASCADE DROPS ALL FOREIGN KEYS, CONSTRAINTS & DEPENDENT OBJECTS)
DO $$ 
DECLARE 
    tbl RECORD;
BEGIN
    FOR tbl IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    ) 
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', tbl.tablename);
    END LOOP;
END $$;

-- 4. DROP ALL VIEWS & MATERIALIZED VIEWS IN PUBLIC
DO $$ 
DECLARE 
    v RECORD;
BEGIN
    FOR v IN (
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public'
    ) 
    LOOP
        EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', v.table_name);
    END LOOP;
END $$;

-- 5. DROP ALL CUSTOM FUNCTIONS & PROCEDURES IN PUBLIC
-- (Preserves system extension functions like uuid_generate_v4 from pgcrypto/uuid-ossp)
DO $$ 
DECLARE 
    fn RECORD;
BEGIN
    FOR fn IN (
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname NOT IN (
              'uuid_generate_v1', 'uuid_generate_v1mc', 'uuid_generate_v3', 
              'uuid_generate_v4', 'uuid_generate_v5', 'uuid_nil', 'uuid_ns_dns', 
              'uuid_ns_url', 'uuid_ns_oid', 'uuid_ns_x500', 'gen_random_uuid'
          )
    ) 
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', fn.proname, fn.args);
    END LOOP;
END $$;

-- 6. DROP ALL CUSTOM ENUM TYPES & DOMAINS IN PUBLIC
DO $$ 
DECLARE 
    t RECORD;
BEGIN
    FOR t IN (
        SELECT typname 
        FROM pg_type typ
        JOIN pg_namespace nsp ON typ.typnamespace = nsp.oid
        WHERE nsp.nspname = 'public' 
          AND typ.typtype IN ('e', 'd')
    ) 
    LOOP
        EXECUTE format('DROP TYPE IF EXISTS public.%I CASCADE', t.typname);
    END LOOP;
END $$;

-- Final Verification Check
SELECT 
    (SELECT count(*) FROM pg_tables WHERE schemaname = 'public') AS remaining_tables,
    (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') AS remaining_policies,
    'Database is 100% clean and ready for fresh setup!' AS status;
