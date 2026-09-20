import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BusinessSwitcher from "./components/BusinessSwitcher";

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
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
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
  );
}
