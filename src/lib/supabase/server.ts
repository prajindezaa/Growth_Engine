import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qlcutltcdnyzyarpzlde.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsY3V0bHRjZG55enlhcnB6bGRlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg3Mjc0NiwiZXhwIjoyMTA1NDQ4NzQ2fQ.VJIInHnHLq5IbjeF_P5m9z3n1bgsNrkxTC4TfDmpXMc";

/**
 * Server-side Supabase client using Service Role Key.
 * Bypasses RLS strictly for trusted server operations, tenant provisioning, and AI route execution.
 * NEVER import or expose in client-side components.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
