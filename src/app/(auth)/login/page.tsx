"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "../actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signIn(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="ge-erp-auth-viewport">
      {/* Outer Curved ERP Desktop Modal Frame matching MobiCore reference */}
      <div className="ge-erp-auth-card">
        {/* LEFT COLUMN: Deep Vibrant Blue ERP Showcase Panel */}
        <div className="ge-erp-showcase-panel">
          {/* Top Brand with User's Logo */}
          <div className="ge-erp-brand-header">
            <div className="ge-erp-logo-container">
              <Image
                src="/logo.jpeg"
                alt="GrowthEngine"
                width={52}
                height={52}
                className="ge-erp-brand-logo"
                priority
              />
            </div>
            <div className="ge-erp-brand-text">
              <h2 className="ge-erp-brand-title">GrowthEngine</h2>
              <span className="ge-erp-brand-tagline">Autonomous SME Operating System</span>
            </div>
          </div>

          {/* Description & Value Proposition */}
          <div className="ge-erp-description-block">
            <p className="ge-erp-main-desc">
              GrowthEngine Systems is a comprehensive, all-in-one accounting, inventory, and AI-driven business management solution designed specifically for modern Indian SMEs and retailers.
            </p>
            <p className="ge-erp-sub-desc">
              From tracking daily sales, GST e-invoices, and automated purchase reconciliations to AI employee autonomous cashflow execution — simplify your financial operations with speed and precision.
            </p>
          </div>

          {/* 3D Ledger Visual Artwork */}
          <div className="ge-erp-artwork-wrap">
            <Image
              src="/auth-illustration.jpg"
              alt="GrowthEngine 3D Business Ledger & Analytics"
              width={420}
              height={236}
              className="ge-erp-artwork-img"
              priority
            />
          </div>

          {/* Social Proof: Customers Already Using GrowthEngine */}
          <div className="ge-erp-social-proof">
            <div className="ge-erp-proof-label">Businesses Already Scaling with GrowthEngine</div>
            <div className="ge-erp-proof-row">
              {/* Overlapping Avatar circles */}
              <div className="ge-erp-avatar-stack">
                <span className="ge-erp-avatar" style={{ backgroundColor: "#F59E0B" }}>RT</span>
                <span className="ge-erp-avatar" style={{ backgroundColor: "#10B981" }}>SK</span>
                <span className="ge-erp-avatar" style={{ backgroundColor: "#6366F1" }}>AP</span>
                <span className="ge-erp-avatar" style={{ backgroundColor: "#EC4899" }}>MD</span>
                <span className="ge-erp-avatar" style={{ backgroundColor: "#06B6D4" }}>VK</span>
              </div>
              {/* Star Rating */}
              <div className="ge-erp-stars-block">
                <div className="ge-erp-stars">★★★★★</div>
                <span className="ge-erp-rating-text">4.9/5 (2,400+ SMEs)</span>
              </div>
            </div>
          </div>

          {/* Key Modules / Benefits Cards matching the 5 tiles from reference */}
          <div className="ge-erp-modules-section">
            <div className="ge-erp-modules-title">Key System Modules</div>
            <div className="ge-erp-modules-grid">
              {/* Module 1: Sales & POS */}
              <div className="ge-erp-module-tile">
                <div className="ge-erp-tile-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="5" x2="5" y2="19" />
                    <circle cx="6.5" cy="6.5" r="2.5" />
                    <circle cx="17.5" cy="17.5" r="2.5" />
                  </svg>
                </div>
                <span className="ge-erp-tile-name">Sales & POS</span>
              </div>

              {/* Module 2: Purchases & Vendors */}
              <div className="ge-erp-module-tile">
                <div className="ge-erp-tile-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                </div>
                <span className="ge-erp-tile-name">Purchase</span>
              </div>

              {/* Module 3: Inventory & Batches */}
              <div className="ge-erp-module-tile">
                <div className="ge-erp-tile-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                </div>
                <span className="ge-erp-tile-name">Inventory</span>
              </div>

              {/* Module 4: Accounts & GST */}
              <div className="ge-erp-module-tile">
                <div className="ge-erp-tile-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <span className="ge-erp-tile-name">Accounts</span>
              </div>

              {/* Module 5: Autonomous AI Employee */}
              <div className="ge-erp-module-tile ge-erp-module-tile-highlight">
                <div className="ge-erp-tile-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                </div>
                <span className="ge-erp-tile-name">AI Employee</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Elevated White Login Box */}
        <div className="ge-erp-form-container">
          <div className="ge-erp-form-box">
            {/* Top Form Header matching reference */}
            <div className="ge-erp-form-top">
              <div>
                <span className="ge-erp-form-welcome">Welcome to <strong>GrowthEngine</strong></span>
                <h1 className="ge-erp-form-title">Sign in</h1>
              </div>
              <div className="ge-erp-form-switch-top">
                <span className="ge-erp-no-account">No Account ?</span>
                <Link href="/signup" className="ge-erp-switch-link-top">
                  Sign up
                </Link>
              </div>
            </div>

            {error && (
              <div className="ge-erp-error-banner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="ge-erp-form">
              {/* Email / Username Field */}
              <div className="ge-erp-input-group">
                <label htmlFor="erp-email" className="ge-erp-input-label">
                  Enter your username or email address
                </label>
                <div className="ge-erp-input-wrapper">
                  <input
                    id="erp-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="Username or email address"
                    className="ge-erp-input"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="ge-erp-input-group">
                <label htmlFor="erp-password" className="ge-erp-input-label">
                  Enter your Password
                </label>
                <div className="ge-erp-input-wrapper">
                  <input
                    id="erp-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="Password"
                    className="ge-erp-input"
                  />
                  <button
                    type="button"
                    className="ge-erp-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="ge-erp-forgot-wrap">
                <Link href="/forgot-password" className="ge-erp-forgot-link">
                  Forgot Password
                </Link>
              </div>

              {/* Sign In Blue Rounded Button */}
              <button
                type="submit"
                disabled={loading}
                className="ge-erp-submit-btn"
              >
                {loading ? (
                  <span className="ge-erp-loading-content">
                    <span className="ge-erp-spinner" />
                    Signing in…
                  </span>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            {/* Mobile Fallback Switch */}
            <div className="ge-erp-mobile-switch">
              <span>Don&apos;t have an account? </span>
              <Link href="/signup" className="ge-erp-mobile-switch-link">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
