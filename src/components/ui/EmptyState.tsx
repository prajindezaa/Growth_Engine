import React from "react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "📋",
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
}) => {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-6) var(--space-4)",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-2)",
        maxWidth: "600px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          backgroundColor: "var(--primary-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "28px",
          marginBottom: "4px",
        }}
      >
        {icon}
      </div>

      <h3
        style={{
          fontSize: "var(--font-md)",
          fontWeight: 700,
          color: "var(--text-primary)",
          margin: 0,
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: "var(--font-sm)",
          color: "var(--text-muted)",
          margin: 0,
          maxWidth: "400px",
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>

      {actionLabel && (
        <div style={{ marginTop: "8px" }}>
          {actionHref ? (
            <a href={actionHref} style={{ textDecoration: "none" }}>
              <Button variant="primary">{actionLabel}</Button>
            </a>
          ) : (
            <Button variant="primary" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
