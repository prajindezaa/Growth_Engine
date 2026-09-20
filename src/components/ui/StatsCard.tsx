import React from "react";

interface StatsCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  subColor?: string;
  icon?: string;
  isHero?: boolean;
  badge?: {
    text: string;
    variant: "success" | "warning" | "danger" | "neutral" | "primary";
  };
}

export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  subValue,
  subColor = "var(--text-muted)",
  icon,
  isHero = false,
  badge,
}) => {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: isHero ? "1px solid var(--primary)" : "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-3)",
        boxShadow: "var(--shadow-sm)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            fontSize: "var(--font-xs)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "var(--text-muted)",
          }}
        >
          {label}
        </span>
        {icon && <span style={{ fontSize: "1.2rem" }}>{icon}</span>}
      </div>

      <div
        style={{
          fontSize: isHero ? "var(--font-xl)" : "var(--font-lg)",
          fontWeight: 700,
          color: isHero ? "var(--primary)" : "var(--text-primary)",
          lineHeight: 1.1,
          margin: "4px 0 8px 0",
        }}
      >
        {value}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        {subValue && (
          <span
            style={{
              fontSize: "var(--font-xs)",
              fontWeight: 500,
              color: subColor,
            }}
          >
            {subValue}
          </span>
        )}
        {badge && (
          <span className={`ge-badge ge-badge-${badge.variant}`}>
            {badge.text}
          </span>
        )}
      </div>
    </div>
  );
};
