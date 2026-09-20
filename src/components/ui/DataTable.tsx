import React from "react";

export interface Column<T> {
  header: string;
  accessor?: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  keyExtractor: (row: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  keyExtractor,
}: DataTableProps<T>) {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        width: "100%",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border-subtle)",
                backgroundColor: "rgba(0, 0, 0, 0.05)",
              }}
            >
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  style={{
                    padding: "12px 16px",
                    fontSize: "var(--font-xs)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: "var(--text-muted)",
                    textAlign: col.align || "left",
                    width: col.width,
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick && onRowClick(row)}
                style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  cursor: onRowClick ? "pointer" : "default",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (onRowClick) e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.02)";
                }}
                onMouseLeave={(e) => {
                  if (onRowClick) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {columns.map((col, idx) => (
                  <td
                    key={idx}
                    style={{
                      padding: "12px 16px",
                      fontSize: "var(--font-sm)",
                      color: "var(--text-primary)",
                      textAlign: col.align || "left",
                      verticalAlign: "middle",
                    }}
                  >
                    {typeof col.accessor === "function"
                      ? col.accessor(row)
                      : col.accessor
                      ? (row[col.accessor] as React.ReactNode)
                      : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
