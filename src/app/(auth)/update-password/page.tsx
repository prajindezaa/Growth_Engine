"use client";

import { useState } from "react";
import { updatePassword } from "../actions";

export default function UpdatePasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirm_password") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const result = await updatePassword(formData);

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
          Set new password
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--ge-text-secondary)",
          }}
        >
          Enter your new password below
        </p>
      </div>

      {error && (
        <div className="ge-error" style={{ marginBottom: "20px" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "18px" }}>
          <label htmlFor="update-password" className="ge-label">
            New password
          </label>
          <input
            id="update-password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="Min. 6 characters"
            className="ge-input"
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label htmlFor="update-confirm-password" className="ge-label">
            Confirm password
          </label>
          <input
            id="update-confirm-password"
            name="confirm_password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="Re-enter your password"
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
                Updating…
              </span>
            ) : (
              "Update password"
            )}
          </span>
        </button>
      </form>
    </>
  );
}
