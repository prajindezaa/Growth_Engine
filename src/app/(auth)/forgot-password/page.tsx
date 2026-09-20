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
    <>
      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--ge-text-primary)",
            marginBottom: "6px",
            letterSpacing: "-0.02em",
          }}
        >
          Reset your password
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--ge-text-secondary)",
          }}
        >
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      {error && (
        <div className="ge-error" style={{ marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {success && (
        <div className="ge-success" style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              style={{ flexShrink: 0 }}
            >
              <path
                d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.97 10.47 4.72 8.22l.56-.56L6.97 9.34l3.75-3.75.56.56-4.31 4.32Z"
                fill="currentColor"
              />
            </svg>
            {success}
          </div>
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "24px" }}>
            <label htmlFor="forgot-email" className="ge-label">
              Email
            </label>
            <input
              id="forgot-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="ge-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="ge-btn-primary"
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
                  Sending…
                </span>
              ) : (
                "Send reset link"
              )}
            </span>
          </button>
        </form>
      )}

      <div className="ge-divider" />

      <p
        style={{
          textAlign: "center",
          fontSize: "0.875rem",
          color: "var(--ge-text-secondary)",
        }}
      >
        Remember your password?{" "}
        <Link href="/login" className="ge-link">
          Sign in
        </Link>
      </p>
    </>
  );
}
