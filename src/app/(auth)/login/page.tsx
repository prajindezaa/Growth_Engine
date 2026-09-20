"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "../actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    // On success, signIn redirects — no need to setLoading(false)
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
          Welcome back
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--ge-text-secondary)",
          }}
        >
          Sign in to your GrowthEngine account
        </p>
      </div>

      {error && (
        <div className="ge-error" style={{ marginBottom: "20px" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "18px" }}>
          <label htmlFor="login-email" className="ge-label">
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="ge-input"
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label htmlFor="login-password" className="ge-label">
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="ge-input"
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "24px",
          }}
        >
          <Link
            href="/forgot-password"
            className="ge-link"
            style={{ fontSize: "0.8125rem" }}
          >
            Forgot password?
          </Link>
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
                Signing in…
              </span>
            ) : (
              "Sign in"
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
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="ge-link">
          Sign up
        </Link>
      </p>
    </>
  );
}
