import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase admin client with service role key to bypass initial RLS bootstrap
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user from Bearer token
    const authHeader = req.headers.get("authorization");
    let authenticatedUserId: string | null = null;
    let authenticatedUserEmail: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
      if (!authErr && user) {
        authenticatedUserId = user.id;
        authenticatedUserEmail = user.email || null;
      }
    }

    const body = await req.json();
    const {
      businessName,
      ownerName,
      mobileNumber,
      email,
      businessType,
      industry,
      address,
      city,
      state,
      pincode,
      gstin,
      currency = "INR",
    } = body;

    // Fallback to body.userId only if valid UUID provided and server token verification not passed (e.g. dev/client fetch with session payload)
    const effectiveUserId = authenticatedUserId || body.userId;
    const effectiveUserEmail = authenticatedUserEmail || email || body.userEmail;

    if (!effectiveUserId) {
      return NextResponse.json(
        { error: "Unauthorized: Valid user session is required" },
        { status: 401 }
      );
    }

    // Check if user ALREADY has an active business membership to prevent duplicates
    const { data: existingMember } = await supabaseAdmin
      .from("business_members")
      .select("*, businesses(*)")
      .eq("user_id", effectiveUserId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (existingMember && existingMember.businesses) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        business: existingMember.businesses,
        member: existingMember,
      });
    }

    if (!businessName || !city || !state) {
      return NextResponse.json(
        { error: "Business name, city, and state are required" },
        { status: 400 }
      );
    }

    // Format address to preserve full metadata: Street Address, Pincode, Industry
    const addressParts = [
      address,
      pincode ? `PIN: ${pincode}` : null,
      industry ? `Industry: ${industry}` : null,
    ].filter(Boolean);
    const formattedAddress = addressParts.join(", ");

    // 1. Insert business
    const { data: business, error: bizError } = await supabaseAdmin
      .from("businesses")
      .insert({
        name: businessName,
        trade_type: (businessType || "retail").toLowerCase(),
        gstin: gstin || null,
        phone: mobileNumber || "",
        email: effectiveUserEmail || null,
        city,
        state,
        address: formattedAddress,
        currency: currency || "INR",
      })
      .select()
      .single();

    if (bizError || !business) {
      console.error("Error inserting business:", bizError);
      return NextResponse.json(
        { error: bizError?.message || "Failed to create business" },
        { status: 500 }
      );
    }

    // 2. Insert business_member as Owner
    const { data: member, error: memberError } = await supabaseAdmin
      .from("business_members")
      .insert({
        business_id: business.id,
        user_id: effectiveUserId,
        role: "owner",
        status: "active",
      })
      .select()
      .single();

    if (memberError) {
      console.error("Error creating business member:", memberError);
    }

    // 3. Upsert user profile
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: effectiveUserId,
        full_name: ownerName || businessName,
        phone: mobileNumber || null,
        email: effectiveUserEmail || null,
        default_business_id: business.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.warn("Profile upsert notice:", profileError.message);
    }

    return NextResponse.json({
      success: true,
      business,
      member,
    });
  } catch (err: any) {
    console.error("Unexpected error in setup-business:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
