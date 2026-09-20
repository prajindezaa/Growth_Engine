"use client";

import { useState } from "react";
import Link from "next/link";
import { signUp } from "../actions";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signUp(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
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
          Create your account
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--ge-text-secondary)",
          }}
        >
          Start accelerating your growth today
        </p>
      </div>

      {error && (
        <div className="ge-error" style={{ marginBottom: "20px" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "18px" }}>
          <label htmlFor="signup-name" className="ge-label">
            Full name
          </label>
          <input
            id="signup-name"
            name="full_name"
            type="text"
            required
            autoComplete="name"
            placeholder="Jane Smith"
            className="ge-input"
          />
        </div>

        <div style={{ marginBottom: "18px" }}>
          <label htmlFor="signup-phone" className="ge-label">
            Phone number
          </label>
          <input
            id="signup-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+1 (555) 000-0000"
            className="ge-input"
          />
        </div>

        <div style={{ marginBottom: "18px" }}>
          <label htmlFor="signup-email" className="ge-label">
            Email
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="ge-input"
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label htmlFor="signup-password" className="ge-label">
            Password
          </label>
          <input
            id="signup-password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="Min. 6 characters"
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
                Creating account…
              </span>
            ) : (
              "Create account"
            )}
          </span>
        </button>
      </form>

      <div className="ge-divider" />

      <p
        style={{
          textAlign: "center",
          fontSize: "0.875rem",
          color: "var(--ge-text-secondary)",
        }}
      >
        Already have an account?{" "}
        <Link href="/login" className="ge-link">
          Sign in
        </Link>
      </p>
    </>
  );
}
