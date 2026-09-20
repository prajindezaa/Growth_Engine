"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  ROLE_COLORS,
  canManageTeam,
  type Role,
} from "@/lib/roles";

interface MemberRow {
  id: string;
  user_id: string;
  role: Role;
  joined_at: string;
  profiles: { full_name: string | null } | null;
  email?: string;
}

interface InviteRow {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export default function TeamPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [myRole, setMyRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("staff");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [businessId]);

  async function loadData() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get my role
    const { data: myMembership } = await supabase
      .from("business_members")
      .select("role")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .single();

    setMyRole((myMembership?.role as Role) ?? null);

    // Get all members with profiles
    const { data: memberData } = await supabase
      .from("business_members")
      .select("id, user_id, role, joined_at, profiles(full_name)")
      .eq("business_id", businessId)
      .order("joined_at", { ascending: true });

    if (memberData) {
      // Fetch emails for each member via auth
      const enriched = await Promise.all(
        memberData.map(async (m: any) => {
          return {
            ...m,
            profiles: m.profiles,
            email: "", // We'll show user_id or profile name
          };
        })
      );
      setMembers(enriched);
    }

    // Get pending invites
    const { data: inviteData } = await supabase
      .from("invites")
      .select("id, email, role, status, created_at")
      .eq("business_id", businessId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (inviteData) setInvites(inviteData);
    setLoading(false);
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) {
      setError("Email is required.");
      return;
    }
    setError(null);
    setSuccess(null);
    setInviting(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Generate a random token
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

    const { error: err } = await supabase.from("invites").insert({
      business_id: businessId,
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      invited_by: user?.id,
      token,
    });

    if (err) {
      setError(err.message);
      setInviting(false);
      return;
    }

    const inviteUrl = `${window.location.origin}/invite/${token}`;
    setSuccess(`Invite created! Share this link:\n${inviteUrl}`);
    setInviteEmail("");
    setShowInvite(false);
    setInviting(false);
    loadData();
  }

  async function handleRoleChange(memberId: string, newRole: Role) {
    const supabase = createClient();
    await supabase
      .from("business_members")
      .update({ role: newRole })
      .eq("id", memberId);
    loadData();
  }

  async function handleRemoveMember(memberId: string, memberRole: Role) {
    if (memberRole === "owner") {
      const ownerCount = members.filter((m) => m.role === "owner").length;
      if (ownerCount <= 1) {
        setError("Cannot remove the last owner.");
        return;
      }
    }

    if (!confirm("Remove this team member?")) return;

    const supabase = createClient();
    await supabase.from("business_members").delete().eq("id", memberId);
    loadData();
  }

  if (loading) {
    return (
      <div style={{ padding: "60px 40px", display: "flex", justifyContent: "center" }}>
        <span className="ge-spinner" />
      </div>
    );
  }

  const isAdmin = myRole ? canManageTeam(myRole) : false;

  return (
    <div style={{ padding: "40px", maxWidth: "800px" }}>
      <div className="ge-animate-in">
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "32px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "var(--ge-text-primary)",
                letterSpacing: "-0.02em",
                marginBottom: "4px",
              }}
            >
              Team
            </h1>
            <p style={{ fontSize: "0.875rem", color: "var(--ge-text-secondary)" }}>
              {members.length} member{members.length !== 1 ? "s" : ""}
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowInvite(!showInvite)}
              className="ge-btn-primary"
              style={{ width: "auto", padding: "10px 20px", fontSize: "0.875rem" }}
            >
              <span>+ Invite member</span>
            </button>
          )}
        </div>

        {error && <div className="ge-error" style={{ marginBottom: "20px" }}>{error}</div>}
        {success && (
          <div className="ge-success" style={{ marginBottom: "20px", whiteSpace: "pre-wrap" }}>
            {success}
          </div>
        )}

        {/* Invite form */}
        {showInvite && isAdmin && (
          <div
            className="ge-card ge-animate-in"
            style={{ maxWidth: "100%", marginBottom: "24px", padding: "24px" }}
          >
            <h3
              style={{
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: "var(--ge-text-primary)",
                marginBottom: "16px",
              }}
            >
              Invite a team member
            </h3>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
              <div style={{ flex: 2 }}>
                <label className="ge-label">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="staff@company.com"
                  className="ge-input"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="ge-label">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="ge-input"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleInvite}
                disabled={inviting}
                className="ge-btn-primary"
                style={{ width: "auto", padding: "12px 20px", flexShrink: 0 }}
              >
                <span>{inviting ? "Sending…" : "Send invite"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Members table */}
        <div
          style={{
            background: "var(--ge-bg-card)",
            border: "1px solid var(--ge-border)",
            borderRadius: "var(--ge-radius-lg)",
            overflow: "hidden",
            backdropFilter: "blur(20px)",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--ge-border)",
                  fontSize: "0.75rem",
                  color: "var(--ge-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 500 }}>Member</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 500 }}>Role</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 500 }}>Joined</th>
                {isAdmin && (
                  <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 500 }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const name = member.profiles?.full_name || "Unknown";
                const initials = name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
                const roleColor = ROLE_COLORS[member.role as Role] || ROLE_COLORS.viewer;

                return (
                  <tr
                    key={member.id}
                    style={{ borderBottom: "1px solid var(--ge-border)" }}
                  >
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "var(--ge-radius-full)",
                            background: "var(--ge-gradient-subtle)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.6875rem",
                            fontWeight: 700,
                            color: "var(--ge-accent)",
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <span
                          style={{
                            fontSize: "0.875rem",
                            fontWeight: 500,
                            color: "var(--ge-text-primary)",
                          }}
                        >
                          {name}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {isAdmin && member.role !== "owner" ? (
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(member.id, e.target.value as Role)
                          }
                          style={{
                            padding: "4px 8px",
                            borderRadius: "var(--ge-radius-full)",
                            background: roleColor.bg,
                            color: roleColor.text,
                            border: "none",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {ASSIGNABLE_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "var(--ge-radius-full)",
                            background: roleColor.bg,
                            color: roleColor.text,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          {ROLE_LABELS[member.role as Role]}
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: "0.8125rem",
                        color: "var(--ge-text-muted)",
                      }}
                    >
                      {new Date(member.joined_at).toLocaleDateString()}
                    </td>
                    {isAdmin && (
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        {member.role !== "owner" && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.id, member.role as Role)}
                            style={{
                              padding: "4px 10px",
                              fontSize: "0.75rem",
                              color: "var(--ge-error)",
                              background: "transparent",
                              border: "1px solid rgba(248,113,113,0.2)",
                              borderRadius: "var(--ge-radius)",
                              cursor: "pointer",
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pending invites */}
        {invites.length > 0 && (
          <div style={{ marginTop: "32px" }}>
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "var(--ge-text-primary)",
                marginBottom: "16px",
              }}
            >
              Pending invites
            </h2>
            <div
              style={{
                background: "var(--ge-bg-card)",
                border: "1px solid var(--ge-border)",
                borderRadius: "var(--ge-radius-lg)",
                overflow: "hidden",
              }}
            >
              {invites.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 16px",
                    borderBottom: "1px solid var(--ge-border)",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--ge-text-primary)",
                        fontWeight: 500,
                      }}
                    >
                      {inv.email}
                    </span>
                    <span
                      style={{
                        marginLeft: "10px",
                        padding: "2px 8px",
                        borderRadius: "var(--ge-radius-full)",
                        background: ROLE_COLORS[inv.role as Role]?.bg || "rgba(107,114,128,0.12)",
                        color: ROLE_COLORS[inv.role as Role]?.text || "#9ca3af",
                        fontSize: "0.6875rem",
                        fontWeight: 600,
                      }}
                    >
                      {ROLE_LABELS[inv.role as Role] || inv.role}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--ge-text-muted)",
                    }}
                  >
                    Sent {new Date(inv.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
