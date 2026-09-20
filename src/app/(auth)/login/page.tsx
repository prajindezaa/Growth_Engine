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
      <div style={{ marginBottom: "var(--space-3)" }}>
        <h1
          style={{
            fontSize: "var(--font-lg)",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "4px",
            letterSpacing: "-0.02em",
          }}
        >
          Welcome back
        </h1>
        <p
          style={{
            fontSize: "var(--font-sm)",
            color: "var(--text-muted)",
            margin: 0,
          }}
        >
          Sign in to your GrowthEngine account
        </p>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: "var(--danger-bg)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "var(--danger)",
            padding: "10px 14px",
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--font-sm)",
            marginBottom: "var(--space-2)",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <div>
          <label
            htmlFor="login-email"
            style={{
              display: "block",
              fontSize: "var(--font-xs)",
              fontWeight: 500,
              color: "var(--text-secondary)",
              marginBottom: "6px",
            }}
          >
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

        <div>
          <label
            htmlFor="login-password"
            style={{
              display: "block",
              fontSize: "var(--font-xs)",
              fontWeight: 500,
              color: "var(--text-secondary)",
              marginBottom: "6px",
            }}
          >
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

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "-4px" }}>
          <Link
            href="/forgot-password"
            style={{
              fontSize: "var(--font-xs)",
              color: "var(--primary)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px 16px",
            backgroundColor: "var(--primary)",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--font-sm)",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            marginTop: "8px",
          }}
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p
        style={{
          marginTop: "var(--space-3)",
          textAlign: "center",
          fontSize: "var(--font-sm)",
          color: "var(--text-muted)",
        }}
      >
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          style={{
            color: "var(--primary)",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Sign up
        </Link>
      </p>
    </>
  );
}
