"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DetailPanel } from "@/components/ui/detail-panel";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";
import {
  Users,
  Shield,
  Plus,
  Key,
  Smartphone,
  CheckCircle2,
  Trash2,
  ShieldAlert,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { ExportService } from "@/lib/services/export";

interface TeamMember {
  id: string;
  name: string;
  phone: string;
  role: "owner" | "admin" | "manager" | "sales" | "accountant" | "cashier";
  status: "active" | "invited";
  lastActive: string;
  permissions: string[];
}

export default function TeamPage() {
  const { business, user } = useAuth();
  const { success, error } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: "mem_01",
      name: "Ramasamy S (You)",
      phone: "98401 23456",
      role: "owner",
      status: "active",
      lastActive: "Now",
      permissions: ["Full Business Access", "Bank & Ledger Accounts", "Approvals", "Tax Filing"],
    },
    {
      id: "mem_02",
      name: "Senthil Nathan",
      phone: "98421 99011",
      role: "sales",
      status: "active",
      lastActive: "20 mins ago",
      permissions: ["POS Billing", "Customer Inquiries", "Draft Quotations"],
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<TeamMember["role"]>("sales");
  const [activeInviteLink, setActiveInviteLink] = useState<string | null>(null);

  useEffect(() => {
    async function loadMembers() {
      if (!business?.id) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("business_members")
          .select("*")
          .eq("business_id", business.id)
          .order("created_at");

        if (data && data.length > 0) {
          setMembers(
            data.map((m) => ({
              id: m.id,
              name: m.user_id === user?.id ? `${business?.name || "Store"} (Owner)` : `Staff Member (${m.role})`,
              phone: "Registered User",
              role: m.role,
              status: m.status || "active",
              lastActive: "Today",
              permissions:
                m.role === "owner"
                  ? ["Full Business Access", "Bank & Ledger Accounts", "Approvals", "Tax Filing"]
                  : m.role === "sales"
                  ? ["POS Billing", "Customer Directory", "Draft Quotations"]
                  : m.role === "accountant"
                  ? ["Khata Ledgers", "Financial Reports", "Tax Summary"]
                  : ["Staff Member Access"],
            }))
          );
        }
      } catch (err) {
        console.warn("Failed to load business members:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadMembers();
  }, [business?.id]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    const token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const inviteUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${token}?role=${role}&biz=${encodeURIComponent(business?.name || "GrowthEngine")}`;
    setActiveInviteLink(inviteUrl);

    const tempId = `mem_${Date.now()}`;
    const newMem: TeamMember = {
      id: tempId,
      name,
      phone,
      role,
      status: "invited",
      lastActive: "Invitation Link Generated",
      permissions:
        role === "sales"
          ? ["POS Billing", "Customer Directory"]
          : role === "accountant"
          ? ["Khata Ledgers", "Reports"]
          : ["Standard Staff Access"],
    };

    setMembers([...members, newMem]);

    try {
      if (business?.id) {
        await supabase.from("business_members").insert({
          business_id: business.id,
          user_id: user?.id || `invited_${Date.now()}`,
          role: role,
          status: "invited",
        });
      }

      const inviteMsg = `Vanakkam ${name},\nYou have been invited to join ${business?.name || "GrowthEngine"} as ${role.toUpperCase()}.\nTap your secure activation link to set up your account:\n${inviteUrl}`;
      window.open(ExportService.getWhatsAppUrl(phone, inviteMsg), "_blank");
      success(`Invite link generated & WhatsApp opened for ${name}`);
    } catch (err: any) {
      error(err.message || "Failed to invite member");
    }
  };

  const getRoleBadgeVariant = (role: TeamMember["role"]) => {
    switch (role) {
      case "owner":
        return "primary";
      case "admin":
      case "manager":
        return "warning";
      case "accountant":
        return "success";
      default:
        return "neutral";
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Team & Role-Based Access
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage staff members, roles, and granular data access permissions
          </p>
        </div>

        <Button onClick={() => setIsAddOpen(true)} className="self-start sm:self-auto font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          <span>Add Staff Member</span>
        </Button>
      </div>

      {/* RLS Security Notice */}
      <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200/80 flex items-start gap-3">
        <Shield className="w-5 h-5 text-[#4F46E5] shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-indigo-950">
            Postgres Row-Level Security Enforced:
          </span>
          <p className="text-indigo-900 mt-0.5 leading-relaxed">
            Staff members only see data allowed by their role. Cashiers cannot see wholesale profit margins, and sales reps cannot modify locked financial ledgers.
          </p>
        </div>
      </div>

      {/* Member Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {members.map((mem) => (
          <Card key={mem.id} className="p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">{mem.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>+91 {mem.phone}</span>
                  </p>
                </div>
                <Badge variant={getRoleBadgeVariant(mem.role)} className="uppercase font-bold text-[10px]">
                  {mem.role}
                </Badge>
              </div>

              {/* Permissions Pills */}
              <div className="mt-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Allowed Access
                </span>
                <div className="flex flex-wrap gap-1">
                  {mem.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Status: <strong className="text-slate-800 capitalize">{mem.status}</strong></span>
              <span>Active: {mem.lastActive}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Staff Drawer */}
      <DetailPanel
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Invite Staff Member"
        subtitle="Grant role-based access to your store"
        footerActions={
          <div className="flex items-center gap-2 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleAddMember}>
              Send Invitation
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <Input
            label="Staff Name *"
            placeholder="e.g. Senthil Kumar"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Mobile Number (for OTP Login) *"
            placeholder="10-digit mobile"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <div>
            <label className="text-xs font-semibold text-slate-700 tracking-wide mb-1.5 block">
              Assign Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="sales">Sales Executive (POS & Orders)</option>
              <option value="cashier">Cashier (Counter Checkout Only)</option>
              <option value="accountant">Accountant (Khata, Payments, Tax)</option>
              <option value="manager">Store Manager (Inventory & Approvals)</option>
              <option value="admin">Administrator (Full Access)</option>
            </select>
          </div>

          {activeInviteLink && (
            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Invite Link Active</span>
              </div>
              <p className="text-[11px] font-mono text-emerald-900 break-all bg-white p-2 rounded-lg border border-emerald-200">
                {activeInviteLink}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(activeInviteLink);
                    success("Invite link copied to clipboard!");
                  }}
                >
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  <span>Copy Link</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  onClick={() => {
                    const inviteMsg = `Vanakkam ${name},\nYou have been invited to join ${business?.name || "GrowthEngine"} as ${role.toUpperCase()}.\nTap your secure activation link to set up your account:\n${activeInviteLink}`;
                    window.open(ExportService.getWhatsAppUrl(phone, inviteMsg), "_blank");
                  }}
                >
                  <Share2 className="w-3.5 h-3.5 mr-1" />
                  <span>WhatsApp Invite</span>
                </Button>
              </div>
            </div>
          )}
        </form>
      </DetailPanel>

    </div>
  );
}
