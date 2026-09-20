"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Business, TaxConfig, PaymentSettings } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Check role
      const { data: membership } = await supabase
        .from("business_members")
        .select("role")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .single();

      setRole(membership?.role ?? null);

      // Fetch business
      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .single();

      if (data) setBusiness(data as Business);
      setLoading(false);
    }
    load();
  }, [businessId]);

  function updateField(field: keyof Business, value: unknown) {
    if (!business) return;
    setBusiness({ ...business, [field]: value } as Business);
  }

  function updateTaxConfig(field: keyof TaxConfig, value: unknown) {
    if (!business) return;
    setBusiness({
      ...business,
      tax_config: { ...business.tax_config, [field]: value },
    });
  }

  function updatePaymentSettings(field: keyof PaymentSettings, value: unknown) {
    if (!business) return;
    setBusiness({
      ...business,
      payment_settings: { ...business.payment_settings, [field]: value },
    });
  }

  async function handleSave() {
    if (!business) return;
    setError(null);
    setSuccess(null);
    setSaving(true);

    const supabase = createClient();

    const { error: err } = await supabase
      .from("businesses")
      .update({
        name: business.name,
        address: business.address || null,
        phone: business.phone || null,
        email: business.email || null,
        gstin: business.gstin || null,
        currency: business.currency,
        tax_config: business.tax_config,
        invoice_prefix: business.invoice_prefix,
        financial_year_start: business.financial_year_start,
        number_format: business.number_format,
        payment_settings: business.payment_settings,
      })
      .eq("id", businessId);

    if (err) {
      setError(err.message);
    } else {
      setSuccess("Settings saved successfully.");
      router.refresh();
    }
    setSaving(false);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !business) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      setError("Invalid file type. Use JPEG, PNG, WebP, or SVG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("File too large. Maximum 2MB.");
      return;
    }

    setError(null);
    setLogoUploading(true);

    const supabase = createClient();
    const fileExt = file.name.split(".").pop();
    const filePath = `${businessId}/logo.${fileExt}`;

    const { error: uploadErr } = await supabase.storage
      .from("business-logos")
      .upload(filePath, file, { upsert: true });

    if (uploadErr) {
      setError(uploadErr.message);
      setLogoUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("business-logos").getPublicUrl(filePath);

    await supabase
      .from("businesses")
      .update({ logo_url: publicUrl })
      .eq("id", businessId);

    setBusiness({ ...business, logo_url: publicUrl });
    setLogoUploading(false);
    router.refresh();
  }

  async function handleLogoRemove() {
    if (!business) return;
    setLogoUploading(true);

    const supabase = createClient();

    if (business.logo_url) {
      const url = new URL(business.logo_url);
      const parts = url.pathname.split("/business-logos/");
      if (parts[1]) {
        await supabase.storage.from("business-logos").remove([parts[1]]);
      }
    }

    await supabase
      .from("businesses")
      .update({ logo_url: null })
      .eq("id", businessId);

    setBusiness({ ...business, logo_url: null });
    setLogoUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  if (loading) {
    return (
      <div
        style={{
          padding: "60px 40px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <span className="ge-spinner" />
      </div>
    );
  }

  if (!business) {
    return (
      <div style={{ padding: "60px 40px", color: "var(--ge-text-muted)" }}>
        Business not found.
      </div>
    );
  }

  const isOwner = role === "owner";

  return (
    <div className="ge-page-container" style={{ maxWidth: "720px" }}>
      <PageHeader
        title="Business Settings"
        subtitle={
          isOwner
            ? "Manage your business profile, invoicing preferences, and tax setup"
            : "View-only — only the business owner can edit settings"
        }
      />

      {error && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "var(--danger-bg)",
            color: "var(--danger)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--font-sm)",
            marginBottom: "var(--space-2)",
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "var(--success-bg)",
            color: "var(--success)",
            border: "1px solid rgba(22, 163, 74, 0.2)",
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--font-sm)",
            marginBottom: "var(--space-2)",
          }}
        >
          {success}
        </div>
      )}

        {/* Logo section */}
        <Section title="Logo">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
            }}
          >
            {business.logo_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={business.logo_url}
                  alt="Business logo"
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "var(--ge-radius)",
                    objectFit: "cover",
                    border: "1px solid var(--ge-border)",
                  }}
                />
                {isOwner && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={logoUploading}
                      className="ge-btn-secondary"
                      style={{ width: "auto", padding: "8px 14px", fontSize: "0.8125rem" }}
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={handleLogoRemove}
                      disabled={logoUploading}
                      style={{
                        padding: "8px 14px",
                        fontSize: "0.8125rem",
                        color: "var(--ge-error)",
                        background: "transparent",
                        border: "1px solid rgba(248, 113, 113, 0.2)",
                        borderRadius: "var(--ge-radius)",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </>
            ) : (
              isOwner && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoUploading}
                  style={{
                    padding: "24px 40px",
                    border: "2px dashed var(--ge-border)",
                    borderRadius: "var(--ge-radius)",
                    background: "transparent",
                    color: "var(--ge-text-muted)",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  {logoUploading ? "Uploading…" : "Upload logo"}
                </button>
              )
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              onChange={handleLogoUpload}
              style={{ display: "none" }}
            />
          </div>
        </Section>

        {/* Business details */}
        <Section title="Business Details">
          <FieldGroup>
            <Field label="Business name" required>
              <input
                type="text"
                value={business.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="ge-input"
                disabled={!isOwner}
              />
            </Field>
            <Field label="Address">
              <textarea
                value={business.address || ""}
                onChange={(e) => updateField("address", e.target.value)}
                className="ge-input"
                rows={3}
                style={{ resize: "vertical", minHeight: "80px" }}
                disabled={!isOwner}
              />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Field label="Phone">
                <input
                  type="tel"
                  value={business.phone || ""}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="ge-input"
                  disabled={!isOwner}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={business.email || ""}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="ge-input"
                  disabled={!isOwner}
                />
              </Field>
            </div>
          </FieldGroup>
        </Section>

        {/* GST & Tax */}
        <Section title="GST & Tax">
          <FieldGroup>
            <Field label="GSTIN">
              <input
                type="text"
                value={business.gstin || ""}
                onChange={(e) =>
                  updateField("gstin", e.target.value.toUpperCase())
                }
                className="ge-input"
                maxLength={15}
                disabled={!isOwner}
              />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Field label="GST rate (%)">
                <input
                  type="number"
                  value={business.tax_config?.gst_rate ?? 18}
                  onChange={(e) =>
                    updateTaxConfig(
                      "gst_rate",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="ge-input"
                  min={0}
                  max={100}
                  disabled={!isOwner}
                />
              </Field>
              <Field label="Cess rate (%)">
                <input
                  type="number"
                  value={business.tax_config?.cess_rate ?? 0}
                  onChange={(e) =>
                    updateTaxConfig(
                      "cess_rate",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="ge-input"
                  min={0}
                  max={100}
                  disabled={!isOwner}
                />
              </Field>
            </div>
            <Field label="Default HSN/SAC code">
              <input
                type="text"
                value={business.tax_config?.hsn_default ?? ""}
                onChange={(e) =>
                  updateTaxConfig("hsn_default", e.target.value)
                }
                className="ge-input"
                disabled={!isOwner}
              />
            </Field>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "0.875rem",
                color: "var(--ge-text-secondary)",
                cursor: isOwner ? "pointer" : "default",
              }}
            >
              <input
                type="checkbox"
                checked={business.tax_config?.tax_inclusive ?? false}
                onChange={(e) =>
                  updateTaxConfig("tax_inclusive", e.target.checked)
                }
                style={{
                  width: "18px",
                  height: "18px",
                  accentColor: "var(--ge-accent)",
                }}
                disabled={!isOwner}
              />
              Prices are tax-inclusive
            </label>
          </FieldGroup>
        </Section>

        {/* Preferences */}
        <Section title="Preferences">
          <FieldGroup>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Field label="Currency">
                <select
                  value={business.currency}
                  onChange={(e) => updateField("currency", e.target.value)}
                  className="ge-input"
                  disabled={!isOwner}
                >
                  <option value="INR">₹ INR</option>
                  <option value="USD">$ USD</option>
                  <option value="EUR">€ EUR</option>
                  <option value="GBP">£ GBP</option>
                  <option value="AED">د.إ AED</option>
                  <option value="SGD">S$ SGD</option>
                </select>
              </Field>
              <Field label="Invoice prefix">
                <input
                  type="text"
                  value={business.invoice_prefix}
                  onChange={(e) =>
                    updateField(
                      "invoice_prefix",
                      e.target.value.toUpperCase()
                    )
                  }
                  className="ge-input"
                  maxLength={10}
                  disabled={!isOwner}
                />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Field label="Financial year starts">
                <select
                  value={business.financial_year_start}
                  onChange={(e) =>
                    updateField(
                      "financial_year_start",
                      parseInt(e.target.value, 10)
                    )
                  }
                  className="ge-input"
                  disabled={!isOwner}
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
              </Field>
              <Field label="Number format">
                <select
                  value={business.number_format}
                  onChange={(e) =>
                    updateField("number_format", e.target.value)
                  }
                  className="ge-input"
                  disabled={!isOwner}
                >
                  <option value="en-IN">Indian (1,00,000.00)</option>
                  <option value="en-US">US (100,000.00)</option>
                  <option value="de-DE">European (100.000,00)</option>
                </select>
              </Field>
            </div>
          </FieldGroup>
        </Section>

        {/* Payment Settings */}
        <Section title="Payment Settings">
          <FieldGroup>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Field label="Bank name">
                <input
                  type="text"
                  value={business.payment_settings?.bank_name ?? ""}
                  onChange={(e) =>
                    updatePaymentSettings("bank_name", e.target.value)
                  }
                  className="ge-input"
                  disabled={!isOwner}
                />
              </Field>
              <Field label="IFSC code">
                <input
                  type="text"
                  value={business.payment_settings?.ifsc_code ?? ""}
                  onChange={(e) =>
                    updatePaymentSettings(
                      "ifsc_code",
                      e.target.value.toUpperCase()
                    )
                  }
                  className="ge-input"
                  disabled={!isOwner}
                />
              </Field>
            </div>
            <Field label="Account number">
              <input
                type="text"
                value={business.payment_settings?.account_number ?? ""}
                onChange={(e) =>
                  updatePaymentSettings("account_number", e.target.value)
                }
                className="ge-input"
                disabled={!isOwner}
              />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Field label="UPI ID">
                <input
                  type="text"
                  value={business.payment_settings?.upi_id ?? ""}
                  onChange={(e) =>
                    updatePaymentSettings("upi_id", e.target.value)
                  }
                  className="ge-input"
                  placeholder="business@upi"
                  disabled={!isOwner}
                />
              </Field>
              <Field label="Payment terms (days)">
                <input
                  type="number"
                  value={business.payment_settings?.payment_terms_days ?? ""}
                  onChange={(e) =>
                    updatePaymentSettings(
                      "payment_terms_days",
                      e.target.value ? parseInt(e.target.value, 10) : undefined
                    )
                  }
                  className="ge-input"
                  placeholder="30"
                  min={0}
                  disabled={!isOwner}
                />
              </Field>
            </div>
          </FieldGroup>
        </Section>

        {/* Save button */}
        {isOwner && (
          <div style={{ marginTop: "32px" }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="ge-btn-primary"
              style={{ maxWidth: "200px" }}
            >
              <span>
                {saving ? (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <span className="ge-spinner" />
                    Saving…
                  </span>
                ) : (
                  "Save changes"
                )}
              </span>
            </button>
          </div>
        )}
    </div>
  );
}

// ── Helper components ──

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ge-card" style={{ marginBottom: "var(--space-3)", padding: "var(--space-3)" }}>
      <h2
        style={{
          fontSize: "var(--font-base)",
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: "var(--space-2)",
          paddingBottom: "var(--space-1)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: "var(--font-xs)",
          fontWeight: 600,
          color: "var(--text-secondary)",
          marginBottom: "6px",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
        {required && (
          <span style={{ color: "var(--danger)", marginLeft: "2px" }}>*</span>
        )}
      </label>
      {children}
    </div>
  );
}
