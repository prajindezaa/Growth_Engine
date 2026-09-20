import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  subtitle,
  action,
}) => {
  const desc = description || subtitle;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "var(--space-3)",
        gap: "var(--space-2)",
        flexWrap: "wrap",
      }}
    >
      <div>
        <h1
          style={{
            fontSize: "var(--font-lg)",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {title}
        </h1>
        {desc && (
          <p
            style={{
              fontSize: "var(--font-sm)",
              color: "var(--text-muted)",
              margin: "4px 0 0 0",
              lineHeight: 1.4,
            }}
          >
            {desc}
          </p>
        )}
      </div>

      {action && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
          {action}
        </div>
      )}
    </div>
  );
};
