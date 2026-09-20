"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS, ROLE_COLORS, type Role } from "@/lib/roles";
import Image from "next/image";

interface InviteInfo {
  id: string;
  business_id: string;
  business_name: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // Auth form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    loadInvite();
  }, [token]);

  async function loadInvite() {
    const supabase = createClient();

    // Fetch invite details
    const { data, error: err } = await supabase.rpc("get_invite_by_token", {
      p_token: token,
    });

    if (err || !data || data.length === 0) {
      setError("This invite link is invalid or has expired.");
      setLoading(false);
      return;
    }

    const inviteData = data[0] as InviteInfo;
    setInvite(inviteData);
    setEmail(inviteData.email);

    // Check if user is already authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Already logged in — accept directly
      await acceptInvite();
    } else {
      setNeedsAuth(true);
    }

    setLoading(false);
  }

  async function acceptInvite() {
    setAccepting(true);
    setError(null);

    const supabase = createClient();

    const { data: bizId, error: err } = await supabase.rpc("accept_invite", {
      p_token: token,
    });

    if (err) {
      setError(err.message);
      setAccepting(false);
      return;
    }

    router.push(`/app/${bizId}`);
  }

  async function handleSignIn() {
    setError(null);
    setAccepting(true);

    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (err) {
      setError(err.message);
      setAccepting(false);
      return;
    }

    await acceptInvite();
  }

  async function handleSignUp() {
    setError(null);
    setAccepting(true);

    const supabase = createClient();
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (err) {
      setError(err.message);
      setAccepting(false);
      return;
    }

    await acceptInvite();
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--ge-bg-primary)",
        }}
      >
        <span className="ge-spinner" />
      </div>
    );
  }

  if (!invite) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--ge-bg-primary)",
          padding: "24px",
        }}
      >
        <div className="ge-card ge-animate-in" style={{ textAlign: "center", maxWidth: "420px" }}>
          <div style={{ fontSize: "2rem", marginBottom: "16px" }}>⚠️</div>
          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "var(--ge-text-primary)",
              marginBottom: "8px",
            }}
          >
            Invalid invite
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)", marginBottom: "24px" }}>
            {error || "This invite link is invalid or has expired."}
          </p>
          <button onClick={() => router.push("/login")} className="ge-btn-secondary">
            Go to login
          </button>
        </div>
      </div>
    );
  }

  const roleColor = ROLE_COLORS[invite.role as Role] || ROLE_COLORS.sales;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--ge-bg-primary)",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div className="ge-glow" style={{ top: "-200px", right: "-100px" }} />

      <div className="ge-animate-in" style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "420px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <Image src="/logo.jpeg" alt="GrowthEngine" width={48} height={48} style={{ borderRadius: "12px" }} />
        </div>

        <div className="ge-card" style={{ maxWidth: "420px" }}>
          {/* Invite info */}
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <h1
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "var(--ge-text-primary)",
                marginBottom: "8px",
              }}
            >
              You&apos;re invited to join
            </h1>
            <p
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "var(--ge-accent)",
                marginBottom: "8px",
              }}
            >
              {invite.business_name}
            </p>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: "var(--ge-radius-full)",
                background: roleColor.bg,
                color: roleColor.text,
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              as {ROLE_LABELS[invite.role as Role] || invite.role}
            </span>
          </div>

          {error && <div className="ge-error" style={{ marginBottom: "16px" }}>{error}</div>}

          {needsAuth && (
            <>
              <div className="ge-divider" />

              {isSignUp ? (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div>
                      <label className="ge-label">Full name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your name"
                        className="ge-input"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="ge-label">Email</label>
                      <input
                        type="email"
                        value={email}
                        className="ge-input"
                        disabled
                        style={{ opacity: 0.6 }}
                      />
                    </div>
                    <div>
                      <label className="ge-label">Create a password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="ge-input"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignUp}
                    disabled={accepting}
                    className="ge-btn-primary"
                    style={{ marginTop: "20px" }}
                  >
                    <span>{accepting ? "Joining…" : "Sign up & join"}</span>
                  </button>
                  <p style={{ textAlign: "center", marginTop: "16px", fontSize: "0.8125rem", color: "var(--ge-text-muted)" }}>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(false)}
                      className="ge-link"
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "inherit" }}
                    >
                      Sign in
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div>
                      <label className="ge-label">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="ge-input"
                      />
                    </div>
                    <div>
                      <label className="ge-label">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Your password"
                        className="ge-input"
                        autoFocus
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignIn}
                    disabled={accepting}
                    className="ge-btn-primary"
                    style={{ marginTop: "20px" }}
                  >
                    <span>{accepting ? "Joining…" : "Sign in & join"}</span>
                  </button>
                  <p style={{ textAlign: "center", marginTop: "16px", fontSize: "0.8125rem", color: "var(--ge-text-muted)" }}>
                    New here?{" "}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(true)}
                      className="ge-link"
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "inherit" }}
                    >
                      Create an account
                    </button>
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
