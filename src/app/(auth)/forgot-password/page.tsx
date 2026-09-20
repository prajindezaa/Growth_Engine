"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "../actions";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await forgotPassword(formData);

    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setSuccess(result.success);
    }

    setLoading(false);
  }

  return (
    <div className="ge-auth-card">
      {/* Top navigation header */}
      <div className="ge-auth-nav-top">
        <Link href="/login" className="ge-auth-back-btn" aria-label="Go back to Login">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <span className="ge-auth-brand-name">GrowthEngine</span>
        <div style={{ width: "36px" }} />
      </div>

      {/* Title */}
      <div className="ge-auth-title-section" style={{ marginTop: "16px" }}>
        <h1 className="ge-auth-title">Reset Password</h1>
        <p className="ge-auth-subtitle">Enter your email and we&apos;ll send a reset link</p>
      </div>

      {error && (
        <div className="ge-auth-error-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "#ECFDF5",
            border: "1px solid #A7F3D0",
            color: "#059669",
            padding: "12px 16px",
            borderRadius: "16px",
            fontSize: "14px",
            fontWeight: 600,
            marginBottom: "20px",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{success}</span>
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="ge-auth-form">
          <div className="ge-floating-input-group">
            <label htmlFor="forgot-email" className="ge-floating-label">Email</label>
            <div className="ge-pill-input-box">
              <span className="ge-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
                id="forgot-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="ge-pill-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="ge-pill-btn-primary"
            style={{ marginTop: "16px" }}
          >
            {loading ? (
              <span className="ge-btn-loading-content">
                <span className="ge-btn-spinner" />
                Sending link…
              </span>
            ) : (
              "Send reset link"
            )}
          </button>
        </form>
      )}

      {/* Switch to Login */}
      <div className="ge-auth-footer" style={{ marginTop: "36px" }}>
        <span>Remember your password? </span>
        <Link href="/login" className="ge-auth-switch-link">
          Login
        </Link>
      </div>
    </div>
  );
}
