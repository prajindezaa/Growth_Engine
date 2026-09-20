import { createClient } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";
import Image from "next/image";
import Link from "next/link";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ge-bg-primary)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          borderBottom: "1px solid var(--ge-border)",
          background: "var(--ge-bg-secondary)",
          flexShrink: 0,
        }}
      >
        <Link
          href="/app"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
          }}
        >
          <Image
            src="/logo.jpeg"
            alt="GrowthEngine"
            width={32}
            height={32}
            style={{ borderRadius: "8px" }}
          />
          <span
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "var(--ge-text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            GrowthEngine
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {user && (
            <span
              style={{
                fontSize: "0.8125rem",
                color: "var(--ge-text-muted)",
              }}
            >
              {user.email}
            </span>
          )}
          <form action={signOut}>
            <button
              type="submit"
              style={{
                padding: "6px 14px",
                fontSize: "0.8125rem",
                background: "transparent",
                border: "1px solid var(--ge-border)",
                borderRadius: "var(--ge-radius)",
                color: "var(--ge-text-secondary)",
                cursor: "pointer",
                transition: "all var(--ge-transition)",
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </main>
    </div>
  );
}
