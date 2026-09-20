import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className = "",
  disabled,
  style,
  ...props
}) => {
  const getStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      borderRadius: "var(--radius-sm)",
      fontWeight: 600,
      cursor: disabled || loading ? "not-allowed" : "pointer",
      opacity: disabled || loading ? 0.6 : 1,
      transition: "all 0.15s ease",
      textDecoration: "none",
      outline: "none",
      border: "1px solid transparent",
    };

    // Sizes strictly on typography scale & 8px grid
    if (size === "sm") {
      base.fontSize = "var(--font-xs)";
      base.padding = "6px 12px";
    } else if (size === "lg") {
      base.fontSize = "var(--font-base)";
      base.padding = "12px 24px";
    } else {
      base.fontSize = "var(--font-sm)";
      base.padding = "10px 16px";
    }

    // Variants
    if (variant === "primary") {
      base.backgroundColor = "var(--primary)";
      base.color = "#FFFFFF";
      base.boxShadow = "var(--shadow-sm)";
    } else if (variant === "secondary") {
      base.backgroundColor = "transparent";
      base.color = "var(--text-primary)";
      base.borderColor = "var(--border-subtle)";
    } else if (variant === "ghost") {
      base.backgroundColor = "transparent";
      base.color = "var(--text-secondary)";
    } else if (variant === "destructive") {
      base.backgroundColor = "var(--danger-bg)";
      base.color = "var(--danger)";
      base.borderColor = "rgba(239, 68, 68, 0.3)";
    }

    return { ...base, ...style };
  };

  return (
    <button
      disabled={disabled || loading}
      style={getStyles()}
      className={`ge-button ${className}`}
      {...props}
    >
      {loading ? (
        <span
          style={{
            width: "14px",
            height: "14px",
            border: "2px solid currentColor",
            borderRightColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.6s linear infinite",
            display: "inline-block",
          }}
        />
      ) : icon ? (
        <span style={{ display: "inline-flex", fontSize: "1.1em" }}>{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
};
