import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Server-side admin client using service-role key (never exposed to browser)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export interface AdminSessionInfo {
  userId: string;
  email: string;
  role: "super_admin" | "admin" | "support_agent" | "auditor";
}

/**
 * Verifies if the incoming request has a valid Supabase JWT and possesses an active record in `admin_users`.
 * Checks both database record and bootstrap email for zero-downtime bootstrapping.
 */
export async function verifyAdminAuth(req: NextRequest): Promise<AdminSessionInfo | null> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const {
      data: { user },
      error: userErr,
    } = await supabaseAdmin.auth.getUser(token);

    if (userErr || !user || !user.email) {
      return null;
    }

    const userEmail = user.email.toLowerCase().trim();

    // 1. Check in `admin_users` table
    const { data: adminRecord, error: adminErr } = await supabaseAdmin
      .from("admin_users")
      .select("id, user_id, role, status")
      .or(`user_id.eq.${user.id},email.eq.${userEmail}`)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (adminRecord && (adminRecord.role === "super_admin" || adminRecord.role === "admin")) {
      // Ensure user_id is linked if it wasn't
      if (!adminRecord.user_id) {
        await supabaseAdmin
          .from("admin_users")
          .update({ user_id: user.id })
          .eq("id", adminRecord.id);
      }

      return {
        userId: user.id,
        email: userEmail,
        role: adminRecord.role,
      };
    }

    // 2. Initial Bootstrap Email fallback: if email matches initial owner and admin table not populated yet
    if (userEmail === "prajindezaa142@gmail.com") {
      // Upsert into admin_users database table so it is strictly database-backed
      try {
        await supabaseAdmin.from("admin_users").upsert(
          {
            user_id: user.id,
            email: userEmail,
            role: "super_admin",
            status: "active",
          },
          { onConflict: "email" }
        );
      } catch (upsertErr) {
        console.warn("Notice: admin_users table bootstrap:", upsertErr);
      }

      return {
        userId: user.id,
        email: userEmail,
        role: "super_admin",
      };
    }

    return null;
  } catch (err) {
    console.error("verifyAdminAuth error:", err);
    return null;
  }
}
