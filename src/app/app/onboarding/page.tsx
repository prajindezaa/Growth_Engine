"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_ONBOARDING_DATA, type OnboardingFormData } from "@/lib/types";

const STEPS = [
  { label: "Name", icon: "🏢" },
  { label: "Contact", icon: "📍" },
  { label: "GST & Tax", icon: "📋" },
  { label: "Preferences", icon: "⚙️" },
  { label: "Logo", icon: "🎨" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingFormData>(DEFAULT_ONBOARDING_DATA);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function update(fields: Partial<OnboardingFormData>) {
    setData((prev) => ({ ...prev, ...fields }));
  }

  function next() {
    setError(null);
    // Validate current step
    if (step === 0 && !data.name.trim()) {
      setError("Business name is required.");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      setError("Invalid file type. Use JPEG, PNG, WebP, or SVG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("File too large. Maximum size is 2MB.");
      return;
    }

    setError(null);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function removeLogo() {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleCreate() {
    setError(null);

    if (!data.name.trim()) {
      setError("Business name is required.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Not authenticated. Please sign in again.");
        setLoading(false);
        return;
      }

      // Create business + owner membership via SECURITY DEFINER function
      const { data: businessId, error: bizError } = await supabase.rpc(
        "create_business",
        {
          p_name: data.name,
          p_address: data.address || null,
          p_phone: data.phone || null,
          p_email: data.email || null,
          p_gstin: data.gstin || null,
          p_currency: data.currency,
          p_tax_config: {
            gst_rate: data.gst_rate,
            cess_rate: data.cess_rate,
            hsn_default: data.hsn_default,
            tax_inclusive: data.tax_inclusive,
          },
          p_invoice_prefix: data.invoice_prefix,
          p_financial_year_start: data.financial_year_start,
          p_number_format: data.number_format,
        }
      );

      if (bizError) {
        setError(bizError.message);
        setLoading(false);
        return;
      }

      const newBusinessId = businessId as string;

      // Upload logo if provided
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const filePath = `${newBusinessId}/logo.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("business-logos")
          .upload(filePath, logoFile, { upsert: true });

        if (!uploadError) {
          const {
            data: { publicUrl },
          } = supabase.storage.from("business-logos").getPublicUrl(filePath);

          await supabase
            .from("businesses")
            .update({ logo_url: publicUrl })
            .eq("id", newBusinessId);
        }
      }

      router.push(`/app/${newBusinessId}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow */}
      <div
        className="ge-glow"
        style={{ top: "-200px", left: "-100px" }}
      />

      <div
        className="ge-animate-in"
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: "560px",
        }}
      >
        {/* Progress indicator */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "8px",
            marginBottom: "32px",
          }}
        >
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                if (i < step) setStep(i);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "var(--ge-radius-full)",
                background:
                  i === step
                    ? "var(--ge-accent-soft)"
                    : i < step
                    ? "rgba(52, 211, 153, 0.1)"
                    : "transparent",
                border:
                  i === step
                    ? "1px solid rgba(6, 182, 212, 0.3)"
                    : "1px solid transparent",
                color:
                  i === step
                    ? "var(--ge-accent)"
                    : i < step
                    ? "var(--ge-success)"
                    : "var(--ge-text-muted)",
                fontSize: "0.75rem",
                fontWeight: 500,
                cursor: i < step ? "pointer" : "default",
                transition: "all var(--ge-transition)",
              }}
            >
              <span>{i < step ? "✓" : s.icon}</span>
              <span className="ge-step-label">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Card */}
        <div
          className="ge-card"
          style={{ maxWidth: "560px", margin: "0 auto" }}
        >
          {error && (
            <div className="ge-error" style={{ marginBottom: "20px" }}>
              {error}
            </div>
          )}

          {/* Step 1: Name */}
          {step === 0 && (
            <div className="ge-animate-in">
              <h2 style={stepTitleStyle}>What&apos;s your business called?</h2>
              <p style={stepDescStyle}>
                This is how your business will appear on invoices and reports.
              </p>
              <div style={{ marginTop: "24px" }}>
                <label htmlFor="biz-name" className="ge-label">
                  Business name
                </label>
                <input
                  id="biz-name"
                  type="text"
                  value={data.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="Acme Pvt. Ltd."
                  className="ge-input"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Step 2: Contact */}
          {step === 1 && (
            <div className="ge-animate-in">
              <h2 style={stepTitleStyle}>Business contact details</h2>
              <p style={stepDescStyle}>
                Address and contact info for invoices. All optional.
              </p>
              <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label htmlFor="biz-address" className="ge-label">
                    Address
                  </label>
                  <textarea
                    id="biz-address"
                    value={data.address}
                    onChange={(e) => update({ address: e.target.value })}
                    placeholder="123 Main St, Bengaluru, Karnataka 560001"
                    className="ge-input"
                    rows={3}
                    style={{ resize: "vertical", minHeight: "80px" }}
                  />
                </div>
                <div>
                  <label htmlFor="biz-phone" className="ge-label">
                    Phone
                  </label>
                  <input
                    id="biz-phone"
                    type="tel"
                    value={data.phone}
                    onChange={(e) => update({ phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="ge-input"
                  />
                </div>
                <div>
                  <label htmlFor="biz-email" className="ge-label">
                    Business email
                  </label>
                  <input
                    id="biz-email"
                    type="email"
                    value={data.email}
                    onChange={(e) => update({ email: e.target.value })}
                    placeholder="hello@acme.com"
                    className="ge-input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: GST & Tax */}
          {step === 2 && (
            <div className="ge-animate-in">
              <h2 style={stepTitleStyle}>GST & tax configuration</h2>
              <p style={stepDescStyle}>
                Set up your default tax rates. You can change these anytime.
              </p>
              <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label htmlFor="biz-gstin" className="ge-label">
                    GSTIN (optional)
                  </label>
                  <input
                    id="biz-gstin"
                    type="text"
                    value={data.gstin}
                    onChange={(e) =>
                      update({ gstin: e.target.value.toUpperCase() })
                    }
                    placeholder="22AAAAA0000A1Z5"
                    className="ge-input"
                    maxLength={15}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label htmlFor="biz-gst-rate" className="ge-label">
                      Default GST rate (%)
                    </label>
                    <input
                      id="biz-gst-rate"
                      type="number"
                      value={data.gst_rate}
                      onChange={(e) =>
                        update({ gst_rate: parseFloat(e.target.value) || 0 })
                      }
                      min={0}
                      max={100}
                      className="ge-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="biz-cess-rate" className="ge-label">
                      Cess rate (%)
                    </label>
                    <input
                      id="biz-cess-rate"
                      type="number"
                      value={data.cess_rate}
                      onChange={(e) =>
                        update({ cess_rate: parseFloat(e.target.value) || 0 })
                      }
                      min={0}
                      max={100}
                      className="ge-input"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="biz-hsn" className="ge-label">
                    Default HSN/SAC code (optional)
                  </label>
                  <input
                    id="biz-hsn"
                    type="text"
                    value={data.hsn_default}
                    onChange={(e) => update({ hsn_default: e.target.value })}
                    placeholder="998314"
                    className="ge-input"
                  />
                </div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    color: "var(--ge-text-secondary)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={data.tax_inclusive}
                    onChange={(e) =>
                      update({ tax_inclusive: e.target.checked })
                    }
                    style={{
                      width: "18px",
                      height: "18px",
                      accentColor: "var(--ge-accent)",
                    }}
                  />
                  Prices are tax-inclusive by default
                </label>
              </div>
            </div>
          )}

          {/* Step 4: Preferences */}
          {step === 3 && (
            <div className="ge-animate-in">
              <h2 style={stepTitleStyle}>Business preferences</h2>
              <p style={stepDescStyle}>
                Currency, invoice numbering, and formatting defaults.
              </p>
              <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label htmlFor="biz-currency" className="ge-label">
                      Currency
                    </label>
                    <select
                      id="biz-currency"
                      value={data.currency}
                      onChange={(e) => update({ currency: e.target.value })}
                      className="ge-input"
                    >
                      <option value="INR">₹ INR</option>
                      <option value="USD">$ USD</option>
                      <option value="EUR">€ EUR</option>
                      <option value="GBP">£ GBP</option>
                      <option value="AED">د.إ AED</option>
                      <option value="SGD">S$ SGD</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="biz-prefix" className="ge-label">
                      Invoice prefix
                    </label>
                    <input
                      id="biz-prefix"
                      type="text"
                      value={data.invoice_prefix}
                      onChange={(e) =>
                        update({
                          invoice_prefix: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="INV"
                      className="ge-input"
                      maxLength={10}
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label htmlFor="biz-fy-start" className="ge-label">
                      Financial year starts
                    </label>
                    <select
                      id="biz-fy-start"
                      value={data.financial_year_start}
                      onChange={(e) =>
                        update({
                          financial_year_start: parseInt(e.target.value, 10),
                        })
                      }
                      className="ge-input"
                    >
                      {[
                        "January","February","March","April","May","June",
                        "July","August","September","October","November","December",
                      ].map((m, i) => (
                        <option key={i + 1} value={i + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="biz-numfmt" className="ge-label">
                      Number format
                    </label>
                    <select
                      id="biz-numfmt"
                      value={data.number_format}
                      onChange={(e) =>
                        update({ number_format: e.target.value })
                      }
                      className="ge-input"
                    >
                      <option value="en-IN">Indian (1,00,000.00)</option>
                      <option value="en-US">US (100,000.00)</option>
                      <option value="de-DE">European (100.000,00)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Logo */}
          {step === 4 && (
            <div className="ge-animate-in">
              <h2 style={stepTitleStyle}>Upload your logo</h2>
              <p style={stepDescStyle}>
                This will appear on invoices and in your dashboard. You can skip
                this and add it later.
              </p>
              <div style={{ marginTop: "24px" }}>
                {logoPreview ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    <div
                      style={{
                        width: "120px",
                        height: "120px",
                        borderRadius: "var(--ge-radius-lg)",
                        overflow: "hidden",
                        border: "2px solid var(--ge-border)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={removeLogo}
                      style={{
                        fontSize: "0.8125rem",
                        color: "var(--ge-error)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px 8px",
                      }}
                    >
                      Remove logo
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: "100%",
                      padding: "40px",
                      border: "2px dashed var(--ge-border)",
                      borderRadius: "var(--ge-radius-lg)",
                      background: "transparent",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "12px",
                      transition: "all var(--ge-transition)",
                      color: "var(--ge-text-muted)",
                    }}
                    className="ge-upload-zone"
                  >
                    <span style={{ fontSize: "2rem" }}>📁</span>
                    <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                      Click to upload logo
                    </span>
                    <span style={{ fontSize: "0.75rem" }}>
                      JPEG, PNG, WebP, or SVG • Max 2MB
                    </span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={handleLogoSelect}
                  style={{ display: "none" }}
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "32px",
            }}
          >
            {step > 0 && (
              <button
                type="button"
                onClick={back}
                className="ge-btn-secondary"
                style={{ flex: 1 }}
              >
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={next}
                className="ge-btn-primary"
                style={{ flex: 1 }}
              >
                <span>Continue</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreate}
                disabled={loading}
                className="ge-btn-primary"
                style={{ flex: 1 }}
              >
                <span>
                  {loading ? (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                      }}
                    >
                      <span className="ge-spinner" />
                      Creating…
                    </span>
                  ) : (
                    "Create business"
                  )}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Shared styles
const stepTitleStyle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "var(--ge-text-primary)",
  letterSpacing: "-0.02em",
  marginBottom: "6px",
};

const stepDescStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "var(--ge-text-secondary)",
  lineHeight: 1.5,
};
