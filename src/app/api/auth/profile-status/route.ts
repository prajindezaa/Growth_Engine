import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // Check Authorization header first
    const authHeader = req.headers.get("authorization");
    let targetUserId: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
      if (!authErr && user) {
        targetUserId = user.id;
      }
    }

    if (!targetUserId) {
      const { searchParams } = new URL(req.url);
      targetUserId = searchParams.get("userId");
    }

    if (!targetUserId) {
      return NextResponse.json({ error: "userId or valid Authorization token is required" }, { status: 400 });
    }

    // Check if user has active membership
    const { data: member, error: memberErr } = await supabaseAdmin
      .from("business_members")
      .select("*, businesses(*)")
      .eq("user_id", targetUserId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (memberErr) {
      console.error("Error querying membership:", memberErr);
      return NextResponse.json({ error: memberErr.message }, { status: 500 });
    }

    if (!member || !member.businesses) {
      return NextResponse.json({
        hasBusiness: false,
        business: null,
        membership: null,
      });
    }

    return NextResponse.json({
      hasBusiness: true,
      business: member.businesses,
      membership: member,
    });
  } catch (err: any) {
    console.error("Unexpected error in profile-status:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
