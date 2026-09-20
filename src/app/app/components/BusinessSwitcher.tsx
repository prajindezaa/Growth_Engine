import Link from "next/link";
import Image from "next/image";
import type { BusinessWithRole } from "@/lib/types";

export default function BusinessSwitcher({
  businesses,
}: {
  businesses: BusinessWithRole[];
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "16px",
      }}
    >
      {businesses.map((membership) => {
        const biz = membership.businesses;
        const initials = biz.name
          .split(" ")
          .map((w: string) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        return (
          <Link
            key={membership.business_id}
            href={`/app/${membership.business_id}`}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "28px 20px",
              background: "var(--ge-bg-card)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--ge-border)",
              borderRadius: "var(--ge-radius-lg)",
              textDecoration: "none",
              transition: "all var(--ge-transition)",
              cursor: "pointer",
            }}
            className="ge-biz-card"
          >
            {/* Logo or initials */}
            {biz.logo_url ? (
              <Image
                src={biz.logo_url}
                alt={biz.name}
                width={48}
                height={48}
                style={{
                  borderRadius: "var(--ge-radius)",
                  objectFit: "cover",
                  marginBottom: "14px",
                }}
              />
            ) : (
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "var(--ge-radius)",
                  background: "var(--ge-gradient-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "var(--ge-accent)",
                  marginBottom: "14px",
                }}
              >
                {initials}
              </div>
            )}

            <span
              style={{
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: "var(--ge-text-primary)",
                textAlign: "center",
                marginBottom: "6px",
              }}
            >
              {biz.name}
            </span>

            <span
              style={{
                fontSize: "0.6875rem",
                fontWeight: 500,
                color:
                  membership.role === "owner"
                    ? "var(--ge-accent)"
                    : "var(--ge-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "2px 8px",
                borderRadius: "var(--ge-radius-full)",
                background:
                  membership.role === "owner"
                    ? "var(--ge-accent-soft)"
                    : "rgba(255,255,255,0.04)",
              }}
            >
              {membership.role}
            </span>
          </Link>
        );
      })}

      {/* Create new business card */}
      <Link
        href="/app/onboarding"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "28px 20px",
          background: "transparent",
          border: "1px dashed var(--ge-border)",
          borderRadius: "var(--ge-radius-lg)",
          textDecoration: "none",
          transition: "all var(--ge-transition)",
          cursor: "pointer",
          minHeight: "160px",
        }}
        className="ge-biz-card"
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "var(--ge-radius)",
            border: "1px dashed var(--ge-border-hover)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.5rem",
            color: "var(--ge-text-muted)",
            marginBottom: "14px",
          }}
        >
          +
        </div>
        <span
          style={{
            fontSize: "0.875rem",
            color: "var(--ge-text-muted)",
            fontWeight: 500,
          }}
        >
          New business
        </span>
      </Link>
    </div>
  );
}
