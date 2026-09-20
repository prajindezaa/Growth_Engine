"use client";

export default function SearchTriggerButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("open-global-search"))}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        marginBottom: "var(--space-1)",
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-sm)",
        color: "var(--text-muted)",
        fontSize: "var(--font-sm)",
        cursor: "pointer",
        transition: "border-color 0.15s ease",
      }}
      className="ge-sidebar-search-btn"
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span>🔍</span>
        <span>Search...</span>
      </div>
      <kbd
        style={{
          fontSize: "var(--font-xs)",
          padding: "2px 6px",
          background: "var(--bg-primary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "4px",
          color: "var(--text-muted)",
          fontWeight: 600,
        }}
      >
        ⌘K
      </kbd>
    </button>
  );
}
