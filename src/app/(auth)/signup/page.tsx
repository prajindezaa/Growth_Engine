"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signUp } from "../actions";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const pwd = formData.get("password") as string;
    const confirmPwd = formData.get("confirm_password") as string;

    if (pwd !== confirmPwd) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const result = await signUp(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="ge-erp-auth-viewport">
      {/* Outer Curved ERP Desktop Modal Frame */}
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
              Join thousands of thriving Indian manufacturers, wholesalers, and retail businesses managing orders, inventory, and GST e-invoices effortlessly.
            </p>
            <p className="ge-erp-sub-desc">
              Get an autonomous AI employee that tracks unpaid bills, reconciles supplier ledgers, and predicts stock demands so you never lose a sale.
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

          {/* Social Proof */}
          <div className="ge-erp-social-proof">
            <div className="ge-erp-proof-label">Join 2,400+ Fast-Growing MSMEs</div>
            <div className="ge-erp-proof-row">
              <div className="ge-erp-avatar-stack">
                <span className="ge-erp-avatar" style={{ backgroundColor: "#10B981" }}>GS</span>
                <span className="ge-erp-avatar" style={{ backgroundColor: "#3B82F6" }}>RK</span>
                <span className="ge-erp-avatar" style={{ backgroundColor: "#F59E0B" }}>NV</span>
                <span className="ge-erp-avatar" style={{ backgroundColor: "#8B5CF6" }}>AA</span>
                <span className="ge-erp-avatar" style={{ backgroundColor: "#EC4899" }}>TS</span>
              </div>
              <div className="ge-erp-stars-block">
                <div className="ge-erp-stars">★★★★★</div>
                <span className="ge-erp-rating-text">Certified GST Ready</span>
              </div>
            </div>
          </div>

          {/* Key Modules */}
          <div className="ge-erp-modules-section">
            <div className="ge-erp-modules-title">What You Unlock Today</div>
            <div className="ge-erp-modules-grid">
              <div className="ge-erp-module-tile">
                <div className="ge-erp-tile-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="5" x2="5" y2="19" />
                    <circle cx="6.5" cy="6.5" r="2.5" />
                    <circle cx="17.5" cy="17.5" r="2.5" />
                  </svg>
                </div>
                <span className="ge-erp-tile-name">Fast POS</span>
              </div>

              <div className="ge-erp-module-tile">
                <div className="ge-erp-tile-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                </div>
                <span className="ge-erp-tile-name">Live Stock</span>
              </div>

              <div className="ge-erp-module-tile">
                <div className="ge-erp-tile-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <span className="ge-erp-tile-name">Automated GST</span>
              </div>

              <div className="ge-erp-module-tile ge-erp-module-tile-highlight">
                <div className="ge-erp-tile-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                </div>
                <span className="ge-erp-tile-name">AI Assistant</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Elevated White Signup Box */}
        <div className="ge-erp-form-container">
          <div className="ge-erp-form-box">
            {/* Top Header */}
            <div className="ge-erp-form-top">
              <div>
                <span className="ge-erp-form-welcome">Get started with <strong>GrowthEngine</strong></span>
                <h1 className="ge-erp-form-title">Create account</h1>
              </div>
              <div className="ge-erp-form-switch-top">
                <span className="ge-erp-no-account">Have an account?</span>
                <Link href="/login" className="ge-erp-switch-link-top">
                  Sign in
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
              {/* Full Name */}
              <div className="ge-erp-input-group">
                <label htmlFor="erp-signup-name" className="ge-erp-input-label">
                  Your Full Name
                </label>
                <div className="ge-erp-input-wrapper">
                  <input
                    id="erp-signup-name"
                    name="full_name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="e.g. Rajesh Kumar"
                    className="ge-erp-input"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="ge-erp-input-group">
                <label htmlFor="erp-signup-email" className="ge-erp-input-label">
                  Work Email Address
                </label>
                <div className="ge-erp-input-wrapper">
                  <input
                    id="erp-signup-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="rajesh@enterprise.com"
                    className="ge-erp-input"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="ge-erp-input-group">
                <label htmlFor="erp-signup-phone" className="ge-erp-input-label">
                  Mobile Number (for WhatsApp Alerts)
                </label>
                <div className="ge-erp-input-wrapper">
                  <input
                    id="erp-signup-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                    className="ge-erp-input"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="ge-erp-input-group">
                <label htmlFor="erp-signup-password" className="ge-erp-input-label">
                  Create Password (min. 6 characters)
                </label>
                <div className="ge-erp-input-wrapper">
                  <input
                    id="erp-signup-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="••••••••"
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

              {/* Confirm Password */}
              <div className="ge-erp-input-group">
                <label htmlFor="erp-signup-confirm" className="ge-erp-input-label">
                  Confirm Password
                </label>
                <div className="ge-erp-input-wrapper">
                  <input
                    id="erp-signup-confirm"
                    name="confirm_password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="ge-erp-input"
                  />
                  <button
                    type="button"
                    className="ge-erp-eye-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
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

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="ge-erp-submit-btn"
                style={{ marginTop: "12px" }}
              >
                {loading ? (
                  <span className="ge-erp-loading-content">
                    <span className="ge-erp-spinner" />
                    Creating account…
                  </span>
                ) : (
                  "Create Free Account"
                )}
              </button>
            </form>

            <div className="ge-erp-mobile-switch">
              <span>Already have an account? </span>
              <Link href="/login" className="ge-erp-mobile-switch-link">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
