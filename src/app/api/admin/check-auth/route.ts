import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin/auth";

export async function GET(req: NextRequest) {
  const admin = await verifyAdminAuth(req);
  if (!admin) {
    return NextResponse.json({ authorized: false, error: "Unauthorized access" }, { status: 403 });
  }

  return NextResponse.json({
    authorized: true,
    user: {
      id: admin.userId,
      email: admin.email,
      role: admin.role,
    },
  });
}
