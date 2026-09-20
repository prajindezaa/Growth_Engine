"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SearchResultItem, GroupedSearchResults } from "@/app/api/search/route";

interface GlobalSearchModalProps {
  businessId: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  customer: "👤",
  product: "📦",
  invoice: "🧾",
  order: "📋",
  quotation: "📝",
  purchase: "🛒",
  supplier: "🏭",
};

const CATEGORY_LABELS: Record<string, string> = {
  customer: "Customers",
  product: "Products",
  invoice: "Invoices",
  order: "Sales Orders",
  quotation: "Quotations",
  purchase: "Purchases",
  supplier: "Suppliers",
};

export default function GlobalSearchModal({ businessId }: GlobalSearchModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GroupedSearchResults | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Flattened list for keyboard navigation
  const flatResults: SearchResultItem[] = results
    ? [
        ...results.customers,
        ...results.products,
        ...results.invoices,
        ...results.orders,
        ...results.quotations,
        ...results.purchases,
        ...results.suppliers,
      ]
    : [];

  // Toggle modal open/close via custom DOM event or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => {
      setIsOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-global-search", handleCustomOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-global-search", handleCustomOpen);
    };
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
      setResults(null);
    }
  }, [isOpen]);

  // Execute debounced search
  const performSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?businessId=${encodeURIComponent(businessId)}&q=${encodeURIComponent(q)}`
        );
        if (res.ok) {
          const data: GroupedSearchResults = await res.json();
          setResults(data);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error("Search fetch failed:", err);
      } finally {
        setLoading(false);
      }
    },
    [businessId]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      performSearch(val);
    }, 200);
  };

  const handleSelectResult = (item: SearchResultItem) => {
    setIsOpen(false);
    router.push(item.url);
  };

  // Keyboard navigation inside search results
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (flatResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatResults[selectedIndex]) {
        handleSelectResult(flatResults[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "60px 16px 16px",
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(10px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "640px",
          background: "var(--ge-bg-secondary)",
          border: "1px solid var(--ge-border)",
          borderRadius: "var(--ge-radius-lg)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "80vh",
          animation: "fadeInScale 0.15s ease-out",
        }}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "16px 20px",
            borderBottom: "1px solid var(--ge-border)",
            background: "var(--ge-bg-card)",
          }}
        >
          <span style={{ fontSize: "1.2rem", color: "var(--ge-text-muted)" }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder="Search customers, products, invoices, orders, quotations..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: "1rem",
              color: "var(--ge-text-primary)",
            }}
          />
          {loading && (
            <div
              style={{
                width: "18px",
                height: "18px",
                border: "2px solid var(--ge-border)",
                borderTopColor: "var(--ge-accent)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
          )}
          {query && !loading && (
            <button
              onClick={() => {
                setQuery("");
                setResults(null);
                inputRef.current?.focus();
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--ge-text-muted)",
                cursor: "pointer",
                fontSize: "1rem",
                padding: "2px 6px",
              }}
            >
              ✕
            </button>
          )}
          <span
            style={{
              fontSize: "0.6875rem",
              padding: "3px 6px",
              borderRadius: "4px",
              background: "var(--ge-bg-primary)",
              border: "1px solid var(--ge-border)",
              color: "var(--ge-text-muted)",
              fontWeight: 600,
            }}
          >
            ESC
          </span>
        </div>

        {/* Results Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {!results && !query && (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--ge-text-muted)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>⚡</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--ge-text-primary)" }}>
                Quick Search across GrowthEngine
              </div>
              <div style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                Find invoices by number, customers by phone or name, products by SKU or barcode.
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  marginTop: "16px",
                }}
              >
                {["Invoices", "Quotations", "Customers", "Suppliers", "Products", "Orders"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setQuery(tag);
                      performSearch(tag);
                    }}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "var(--ge-radius-full)",
                      background: "var(--ge-bg-card)",
                      border: "1px solid var(--ge-border)",
                      color: "var(--ge-text-secondary)",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {results && results.total === 0 && (
            <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--ge-text-muted)" }}>
              <div style={{ fontSize: "1.75rem", marginBottom: "8px" }}>🔎</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--ge-text-primary)" }}>
                No records found for &ldquo;{query}&rdquo;
              </div>
              <div style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                Try searching by a customer name, phone number, product name, or invoice reference.
              </div>
            </div>
          )}

          {results && results.total > 0 && (
            <>
              {(
                [
                  "customer",
                  "product",
                  "invoice",
                  "order",
                  "quotation",
                  "purchase",
                  "supplier",
                ] as const
              ).map((cat) => {
                const key = (cat + "s") as keyof GroupedSearchResults;
                const items = (results[key] as SearchResultItem[]) || [];
                if (items.length === 0) return null;

                return (
                  <div key={cat}>
                    <div
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--ge-text-muted)",
                        padding: "4px 8px 6px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span>{CATEGORY_ICONS[cat]}</span>
                      <span>{CATEGORY_LABELS[cat]}</span>
                      <span style={{ opacity: 0.6 }}>({items.length})</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      {items.map((item) => {
                        const globalIdx = flatResults.findIndex((r) => r.id === item.id && r.type === item.type);
                        const isSelected = globalIdx === selectedIndex;

                        return (
                          <div
                            key={item.id + item.type}
                            onClick={() => handleSelectResult(item)}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 12px",
                              borderRadius: "var(--ge-radius)",
                              background: isSelected ? "var(--ge-bg-hover)" : "transparent",
                              cursor: "pointer",
                              transition: "background 0.1s ease",
                              border: isSelected ? "1px solid var(--ge-border)" : "1px solid transparent",
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div
                                style={{
                                  fontSize: "0.875rem",
                                  fontWeight: 500,
                                  color: isSelected ? "var(--ge-accent)" : "var(--ge-text-primary)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {item.title}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  color: "var(--ge-text-muted)",
                                  marginTop: "2px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {item.subtitle}
                              </div>
                            </div>

                            {item.badge && (
                              <span
                                style={{
                                  marginLeft: "8px",
                                  padding: "2px 8px",
                                  borderRadius: "var(--ge-radius-full)",
                                  background: "var(--ge-bg-card)",
                                  border: "1px solid var(--ge-border)",
                                  fontSize: "0.6875rem",
                                  fontWeight: 600,
                                  color: "var(--ge-text-secondary)",
                                  flexShrink: 0,
                                }}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer shortcuts */}
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid var(--ge-border)",
            background: "var(--ge-bg-card)",
            fontSize: "0.6875rem",
            color: "var(--ge-text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: "12px" }}>
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <div>Global Search</div>
        </div>
      </div>
    </div>
  );
}
