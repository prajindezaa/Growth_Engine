import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BusinessSwitcher from "./components/BusinessSwitcher";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "../(auth)/actions";

export default async function AppPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user's business memberships
  const { data: memberships } = await supabase
    .from("business_members")
    .select("business_id, role, businesses(*)")
    .eq("user_id", user.id);

  const businesses = memberships || [];

  // 0 businesses → onboarding
  if (businesses.length === 0) {
    redirect("/app/onboarding");
  }

  // 1 business → go straight in
  if (businesses.length === 1) {
    redirect(`/app/${businesses[0].business_id}`);
  }

  // 2+ businesses → show switcher
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-primary)" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px var(--space-4)",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-card)",
        }}
      >
        <Link href="/app" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <Image src="/logo.jpeg" alt="GrowthEngine" width={32} height={32} style={{ borderRadius: "8px" }} />
          <span style={{ fontSize: "var(--font-base)", fontWeight: 700, color: "var(--text-primary)" }}>
            GrowthEngine
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>{user.email}</span>
          <form action={signOut}>
            <button
              type="submit"
              style={{
                padding: "6px 14px",
                fontSize: "var(--font-xs)",
                background: "transparent",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-6) var(--space-3)",
        }}
      >
      <div
        className="ge-animate-in"
        style={{ width: "100%", maxWidth: "720px" }}
      >
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "var(--ge-text-primary)",
              letterSpacing: "-0.02em",
              marginBottom: "8px",
            }}
          >
            Select a business
          </h1>
          <p
            style={{
              fontSize: "0.9375rem",
              color: "var(--ge-text-secondary)",
            }}
          >
            Choose which business to work on
          </p>
        </div>

        <BusinessSwitcher businesses={businesses as any} />
      </div>
    </div>
    </div>
  );
}
