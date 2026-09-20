import React from "react";

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = "20px",
  borderRadius = "var(--radius-sm)",
  className = "",
  style,
}) => {
  return (
    <div
      className={`ge-skeleton ${className}`.trim()}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-3)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", gap: "16px", marginBottom: "8px" }}>
        <Skeleton width="180px" height="14px" />
        <Skeleton width="100px" height="14px" />
        <Skeleton width="80px" height="14px" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            padding: "8px 0",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <Skeleton width="24px" height="24px" borderRadius="50%" />
          <Skeleton width="30%" height="16px" />
          <Skeleton width="20%" height="16px" />
          <Skeleton width="15%" height="16px" />
          <Skeleton width="10%" height="16px" style={{ marginLeft: "auto" }} />
        </div>
      ))}
    </div>
  );
};
