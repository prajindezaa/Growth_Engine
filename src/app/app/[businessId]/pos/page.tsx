"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { scanBarcode } from "@/lib/capacitor/barcodeScanner";
import { useToast } from "@/components/Toast";

interface POSProduct {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  selling_price: number;
  current_stock: number;
  tax_rate?: number;
}

interface CartItem {
  product: POSProduct;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  line_total: number;
}

interface POSCustomer {
  id: string;
  name: string;
  phone?: string;
}

export default function POSPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const { toast } = useToast();

  const [products, setProducts] = useState<POSProduct[]>([]);
  const [customers, setCustomers] = useState<POSCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Cart & Mobile Drawer State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<POSCustomer | null>(null);
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [showMobileCart, setShowMobileCart] = useState(false);

  // Checkout State
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card">("cash");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState<{
    invoice_number: string;
    grand_total: number;
    cash_tendered?: number;
    change_due?: number;
    items: CartItem[];
    customerName: string;
    payment_method: string;
    date: string;
  } | null>(null);

  const barcodeRef = useRef<HTMLInputElement>(null);

  // Load products and customers
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const supabase = createClient();
      const [prodRes, custRes] = await Promise.all([
        supabase
          .from("products")
          .select("id, name, sku, barcode, category, selling_price, current_stock, tax_rate")
          .eq("business_id", businessId)
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("customers")
          .select("id, name, phone")
          .eq("business_id", businessId)
          .order("name"),
      ]);

      if (prodRes.data) setProducts(prodRes.data as POSProduct[]);
      if (custRes.data) setCustomers(custRes.data as POSCustomer[]);
      setLoading(false);
    }

    loadData();
  }, [businessId]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["All", ...Array.from(set)];
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === "All" || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  // Add product to cart
  const addToCart = (product: POSProduct) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.id === product.id);
      const unit_price = Number(product.selling_price || 0);
      const tax_rate = Number(product.tax_rate || 0);

      if (existingIdx >= 0) {
        const copy = [...prev];
        const item = copy[existingIdx];
        const newQty = item.quantity + 1;
        const line_total = newQty * unit_price;
        copy[existingIdx] = { ...item, quantity: newQty, line_total };
        return copy;
      } else {
        return [
          ...prev,
          {
            product,
            quantity: 1,
            unit_price,
            discount: 0,
            tax_rate,
            line_total: unit_price,
          },
        ];
      }
    });
  };

  // Barcode scanner auto-enter
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matched = products.find(
      (p) => (p.barcode && p.barcode.trim() === barcodeInput.trim()) || (p.sku && p.sku.trim() === barcodeInput.trim())
    );

    if (matched) {
      addToCart(matched);
      setBarcodeInput("");
    } else {
      toast("error", `No product found matching barcode "${barcodeInput}"`);
    }
  };

  // Cart quantity controls
  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((_, idx) => idx !== index));
    } else {
      setCart((prev) => {
        const copy = [...prev];
        const item = copy[index];
        copy[index] = {
          ...item,
          quantity: newQty,
          line_total: newQty * item.unit_price - item.discount,
        };
        return copy;
      });
    }
  };

  // Totals calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  }, [cart]);

  const taxTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const taxable = item.quantity * item.unit_price - item.discount;
      return sum + (taxable * item.tax_rate) / 100;
    }, 0);
  }, [cart]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal + taxTotal - globalDiscount);
  }, [subtotal, taxTotal, globalDiscount]);

  const changeDue = useMemo(() => {
    const tendered = parseFloat(cashTendered) || 0;
    return Math.max(0, tendered - grandTotal);
  }, [cashTendered, grandTotal]);

  // Complete POS Sale
  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    setProcessing(true);

    try {
      const supabase = createClient();
      const payload = {
        p_business_id: businessId,
        p_customer_id: selectedCustomer ? selectedCustomer.id : null,
        p_subtotal: subtotal,
        p_tax_total: taxTotal,
        p_discount_total: globalDiscount,
        p_grand_total: grandTotal,
        p_payment_method: paymentMethod,
        p_payment_reference: paymentMethod === "cash" ? `Tendered: ₹${cashTendered}` : "POS Counter",
        p_notes: "POS Counter Checkout",
        p_items: cart.map((item) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          discount: item.discount,
          line_total: item.line_total,
        })),
      };

      // Call create_pos_sale RPC
      const { data, error } = await (supabase.rpc as any)("create_pos_sale", payload);

      if (error) {
        toast("error", `POS Sale Failed: ${error.message}`);
        setProcessing(false);
        return;
      }

      toast("success", `Sale completed: ${data?.invoice_number || "POS-SALE"}`);
      setCompletedSale({
        invoice_number: data?.invoice_number || "POS-SALE",
        grand_total: grandTotal,
        cash_tendered: paymentMethod === "cash" ? parseFloat(cashTendered) || grandTotal : undefined,
        change_due: paymentMethod === "cash" ? changeDue : undefined,
        items: [...cart],
        customerName: selectedCustomer ? selectedCustomer.name : "Walk-in Customer",
        payment_method: paymentMethod.toUpperCase(),
        date: new Date().toLocaleString("en-IN"),
      });

      // Clear current sale
      setCart([]);
      setSelectedCustomer(null);
      setCashTendered("");
      setGlobalDiscount(0);
      setShowCheckout(false);
    } catch (err: any) {
      console.error("Sale error:", err);
      toast("error", `Checkout failed: ${err.message || "Unknown error"}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", overflow: "hidden", background: "var(--ge-bg-primary)" }}>
      {/* LEFT COLUMN: Catalog & Products */}
      <div style={{ flex: 1.4, display: "flex", flexDirection: "column", borderRight: "1px solid var(--ge-border)", overflow: "hidden" }}>
        {/* Top Search & Barcode Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--ge-border)", background: "var(--ge-bg-secondary)", display: "flex", gap: "12px", alignItems: "center" }}>
          <form onSubmit={handleBarcodeSubmit} style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1.2 }}>
            <button
              type="button"
              onClick={async () => {
                const code = await scanBarcode();
                if (code) {
                  const matched = products.find(
                    (p) => (p.barcode && p.barcode.trim() === code.trim()) || (p.sku && p.sku.trim() === code.trim())
                  );
                  if (matched) {
                    addToCart(matched);
                    toast("success", `Added ${matched.name} to cart`);
                  } else {
                    toast("error", `Scanned code "${code}" does not match any product in inventory.`);
                  }
                }
              }}
              title="Open Barcode Scanner (Camera / MLKit)"
              style={{
                background: "var(--ge-accent-soft, rgba(16, 185, 129, 0.15))",
                border: "1px solid var(--ge-accent)",
                color: "var(--ge-accent)",
                borderRadius: "var(--ge-radius)",
                padding: "7px 10px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.8125rem",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <span>📷</span>
              <span className="hidden sm:inline">Scan</span>
            </button>
            <input
              ref={barcodeRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan barcode or press Enter..."
              className="ge-input"
              style={{ fontSize: "0.875rem", padding: "8px 12px", flex: 1 }}
            />
          </form>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className="ge-input"
            style={{ flex: 1.2, fontSize: "0.875rem", padding: "8px 12px" }}
          />
        </div>

        {/* Category Pills */}
        <div style={{ display: "flex", gap: "8px", padding: "10px 20px", background: "var(--ge-bg-card)", borderBottom: "1px solid var(--ge-border)", overflowX: "auto" }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--ge-radius-full)",
                background: selectedCategory === cat ? "var(--ge-accent)" : "var(--ge-bg-secondary)",
                color: selectedCategory === cat ? "#fff" : "var(--ge-text-secondary)",
                border: "none",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--ge-text-muted)" }}>Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--ge-text-muted)" }}>No products found.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "12px" }}>
              {filteredProducts.map((p) => {
                const inCart = cart.find((i) => i.product.id === p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p)}
                    style={{
                      background: inCart ? "var(--ge-accent-soft)" : "var(--ge-bg-card)",
                      border: inCart ? "1px solid var(--ge-accent)" : "1px solid var(--ge-border)",
                      borderRadius: "var(--ge-radius)",
                      padding: "12px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ge-text-primary)", marginBottom: "4px" }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: "0.6875rem", color: "var(--ge-text-muted)" }}>
                        {p.sku ? `SKU: ${p.sku}` : p.category || "General"}
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "10px" }}>
                      <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--ge-accent)" }}>
                        ₹{p.selling_price}
                      </span>
                      <span style={{ fontSize: "0.6875rem", color: p.current_stock <= 5 ? "var(--ge-error)" : "var(--ge-text-muted)" }}>
                        {p.current_stock} in stock
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* DESKTOP RIGHT COLUMN: Active POS Cart & Checkout */}
      <div
        className="ge-desktop-only"
        style={{ width: "420px", display: "flex", flexDirection: "column", background: "var(--ge-bg-card)" }}
      >
        {/* Customer Select Bar */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ge-border)", background: "var(--ge-bg-secondary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>👤</span>
            <select
              value={selectedCustomer ? selectedCustomer.id : ""}
              onChange={(e) => {
                const found = customers.find((c) => c.id === e.target.value);
                setSelectedCustomer(found || null);
              }}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="">Walk-in Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""}
                </option>
              ))}
            </select>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "0.75rem",
                color: "var(--danger)",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {cart.length === 0 ? (
            <div style={{ margin: "auto", textAlign: "center", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🛒</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>Cart is empty</div>
              <div style={{ fontSize: "0.75rem", marginTop: "4px" }}>Scan barcode or select an item</div>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={item.product.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0, paddingRight: "8px" }}>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.product.name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    ₹{item.unit_price} each
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    onClick={() => updateQuantity(idx, item.quantity - 1)}
                    className="ge-touch-target"
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-card)",
                      cursor: "pointer",
                      fontSize: "1rem",
                      fontWeight: 700,
                    }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, width: "24px", textAlign: "center" }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(idx, item.quantity + 1)}
                    className="ge-touch-target"
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-card)",
                      cursor: "pointer",
                      fontSize: "1rem",
                      fontWeight: 700,
                    }}
                  >
                    +
                  </button>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, minWidth: "65px", textAlign: "right" }}>
                    ₹{item.line_total}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Calculation Footer */}
        <div style={{ padding: "16px", borderTop: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "4px" }}>
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          {taxTotal > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "4px" }}>
              <span>Tax (GST)</span>
              <span>₹{taxTotal.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)", margin: "8px 0 16px" }}>
            <span>Grand Total</span>
            <span style={{ color: "var(--primary)" }}>₹{grandTotal.toFixed(2)}</span>
          </div>

          <button
            disabled={cart.length === 0}
            onClick={() => {
              setCashTendered(grandTotal.toString());
              setShowCheckout(true);
            }}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "var(--radius-sm)",
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: cart.length === 0 ? "default" : "pointer",
              opacity: cart.length === 0 ? 0.5 : 1,
              boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
            }}
          >
            ⚡ Checkout (₹{grandTotal.toFixed(2)})
          </button>
        </div>
      </div>

      {/* MOBILE PERSISTENT BOTTOM BAR: Running Cart Total + Instant Checkout Trigger */}
      {cart.length > 0 && (
        <div
          className="ge-mobile-only"
          style={{
            position: "fixed",
            bottom: "64px",
            left: 0,
            right: 0,
            zIndex: 980,
            backgroundColor: "var(--bg-card)",
            borderTop: "1px solid var(--border-subtle)",
            padding: "10px 16px",
            boxShadow: "0 -4px 16px rgba(0, 0, 0, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            onClick={() => setShowMobileCart(true)}
            style={{ display: "flex", flexDirection: "column", cursor: "pointer" }}
          >
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
              🛒 {cart.reduce((s, i) => s + i.quantity, 0)} items • Tap to view
            </span>
            <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--primary)" }}>
              ₹{grandTotal.toFixed(2)}
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setShowMobileCart(true)}
              className="ge-touch-target"
              style={{
                padding: "0 14px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Cart
            </button>
            <button
              type="button"
              onClick={() => {
                setCashTendered(grandTotal.toString());
                setShowCheckout(true);
              }}
              className="ge-touch-target"
              style={{
                padding: "0 20px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--primary)",
                color: "#ffffff",
                border: "none",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
              }}
            >
              Pay ₹{grandTotal.toFixed(2)}
            </button>
          </div>
        </div>
      )}

      {/* MOBILE FULL-SCREEN CART DRAWER */}
      {showMobileCart && (
        <>
          <div
            className="ge-bottom-sheet-overlay"
            onClick={() => setShowMobileCart(false)}
            aria-hidden="true"
          />
          <div
            className="ge-bottom-sheet"
            style={{
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div className="ge-bottom-sheet-handle" onClick={() => setShowMobileCart(false)} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 20px",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>
                  Active Cart ({cart.reduce((s, i) => s + i.quantity, 0)} items)
                </h3>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {selectedCustomer ? selectedCustomer.name : "Walk-in Customer"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileCart(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.2rem",
                  color: "var(--text-muted)",
                  padding: "4px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Cart items list in drawer */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {cart.map((item, idx) => (
                <div
                  key={item.product.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: "10px" }}>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {item.product.name}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      ₹{item.unit_price} each
                    </div>
                  </div>

                  {/* Large thumb stepper controls */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={() => updateQuantity(idx, item.quantity - 1)}
                      className="ge-touch-target"
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        background: "var(--bg-card)",
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      -
                    </button>
                    <span style={{ fontSize: "1rem", fontWeight: 700, width: "24px", textAlign: "center" }}>
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(idx, item.quantity + 1)}
                      className="ge-touch-target"
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        background: "var(--bg-card)",
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      +
                    </button>
                    <span style={{ fontSize: "1rem", fontWeight: 800, minWidth: "65px", textAlign: "right", color: "var(--primary)" }}>
                      ₹{item.line_total}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Checkout trigger inside drawer */}
            <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", fontWeight: 800, marginBottom: "12px" }}>
                <span>Grand Total</span>
                <span style={{ color: "var(--primary)" }}>₹{grandTotal.toFixed(2)}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMobileCart(false);
                  setCashTendered(grandTotal.toString());
                  setShowCheckout(true);
                }}
                className="ge-touch-target"
                style={{
                  width: "100%",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--primary)",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "1.05rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(59, 130, 246, 0.4)",
                }}
              >
                Proceed to Payment (₹{grandTotal.toFixed(2)})
              </button>
            </div>
          </div>
        </>
      )}

      {/* MODAL: Payment Tender Checkout */}
      {showCheckout && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ width: "100%", maxWidth: "440px", background: "var(--ge-bg-card)", border: "1px solid var(--ge-border)", borderRadius: "var(--ge-radius-lg)", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Payment Tender</h2>
              <button onClick={() => setShowCheckout(false)} style={{ background: "transparent", border: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--ge-accent)", textAlign: "center", margin: "12px 0 20px" }}>
              ₹{grandTotal.toFixed(2)}
            </div>

            {/* Payment Method Selector */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" }}>
              {[
                { id: "cash", label: "💵 Cash" },
                { id: "upi", label: "📱 UPI" },
                { id: "card", label: "💳 Card" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id as any)}
                  style={{
                    padding: "12px 8px",
                    borderRadius: "var(--ge-radius)",
                    border: paymentMethod === m.id ? "2px solid var(--ge-accent)" : "1px solid var(--ge-border)",
                    background: paymentMethod === m.id ? "var(--ge-accent-soft)" : "var(--ge-bg-secondary)",
                    color: paymentMethod === m.id ? "var(--ge-accent)" : "var(--ge-text-primary)",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Cash Tender Calculation */}
            {paymentMethod === "cash" && (
              <div style={{ background: "var(--ge-bg-secondary)", padding: "14px", borderRadius: "var(--ge-radius)", marginBottom: "20px" }}>
                <label className="ge-label" style={{ marginBottom: "6px" }}>Cash Received (₹)</label>
                <input
                  type="number"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  className="ge-input"
                  style={{ fontSize: "1.25rem", fontWeight: 700 }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", fontSize: "0.875rem" }}>
                  <span style={{ color: "var(--ge-text-muted)" }}>Change to return:</span>
                  <strong style={{ color: changeDue > 0 ? "var(--ge-error)" : "var(--ge-success)", fontSize: "1rem" }}>
                    ₹{changeDue.toFixed(2)}
                  </strong>
                </div>
              </div>
            )}

            {paymentMethod === "upi" && (
              <div style={{ textAlign: "center", padding: "16px", background: "var(--ge-bg-secondary)", borderRadius: "var(--ge-radius)", marginBottom: "20px" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>📱</div>
                <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>Scan UPI QR on Terminal</div>
                <div style={{ fontSize: "0.75rem", color: "var(--ge-text-muted)", marginTop: "4px" }}>Awaiting customer UPI confirmation...</div>
              </div>
            )}

            <button
              onClick={handleCompleteSale}
              disabled={processing}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "var(--ge-radius)",
                background: "var(--ge-accent)",
                color: "#fff",
                border: "none",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: processing ? "default" : "pointer",
              }}
            >
              {processing ? "Recording Sale..." : "Confirm & Print Receipt"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Thermal Receipt & Success Share */}
      {completedSale && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ width: "100%", maxWidth: "380px", background: "#fff", color: "#000", borderRadius: "8px", padding: "20px", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
            <div style={{ textAlign: "center", borderBottom: "1px dashed #666", paddingBottom: "12px", marginBottom: "12px" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: 800 }}>GROWTHENGINE POS</div>
              <div style={{ fontSize: "0.75rem", color: "#555" }}>Receipt #{completedSale.invoice_number}</div>
              <div style={{ fontSize: "0.6875rem", color: "#777" }}>{completedSale.date}</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, marginTop: "4px" }}>Customer: {completedSale.customerName}</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.75rem", marginBottom: "12px" }}>
              {completedSale.items.map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{item.quantity}x {item.product.name}</span>
                  <strong>₹{item.line_total}</strong>
                </div>
              ))}
            </div>

            <div style={{ borderTop: "1px dashed #666", paddingTop: "8px", fontSize: "0.875rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                <span>TOTAL:</span>
                <span>₹{completedSale.grand_total.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#444", marginTop: "4px" }}>
                <span>Paid via {completedSale.payment_method}</span>
                {completedSale.cash_tendered !== undefined && (
                  <span>Tendered: ₹{completedSale.cash_tendered}</span>
                )}
              </div>
              {completedSale.change_due !== undefined && completedSale.change_due > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#000", fontWeight: 600 }}>
                  <span>Change Due:</span>
                  <span>₹{completedSale.change_due.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
              <button
                onClick={() => window.print()}
                style={{ flex: 1, padding: "10px", background: "#0d9488", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}
              >
                🖨️ Print
              </button>
              <button
                onClick={() => setCompletedSale(null)}
                style={{ flex: 1, padding: "10px", background: "#333", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}
              >
                Next Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
