"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export interface Business {
  id: string;
  name: string;
  trade_type: "retail" | "wholesale" | "distributor" | "manufacturer";
  gstin?: string;
  phone: string;
  email?: string;
  city: string;
  state: string;
  address?: string;
  currency: string;
  logo_url?: string;
  invoice_sequence?: number;
  plan?: string;
}

export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  role: "owner" | "admin" | "manager" | "sales" | "accountant" | "cashier" | "delivery";
  status: "active" | "invited" | "suspended";
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  business: Business | null;
  membership: BusinessMember | null;
  role: BusinessMember["role"] | null;
  hasBusiness: boolean;
  refreshBusiness: () => Promise<boolean>;
  sendEmailOtp: (email: string) => Promise<{ error: Error | null }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ data: any; error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  business: null,
  membership: null,
  role: null,
  hasBusiness: false,
  refreshBusiness: async () => false,
  sendEmailOtp: async () => ({ error: null }),
  verifyEmailOtp: async () => ({ data: null, error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<Business | null>(null);
  const [membership, setMembership] = useState<BusinessMember | null>(null);

  const fetchBusinessContext = async (currentUserId: string, currentAccessToken?: string): Promise<boolean> => {
    try {
      const headers: Record<string, string> = {};
      if (currentAccessToken) {
        headers["Authorization"] = `Bearer ${currentAccessToken}`;
      }

      // Query server route to reliably get business status with authorization
      const res = await fetch(
        `/api/auth/profile-status?userId=${encodeURIComponent(currentUserId)}`,
        { headers }
      );

      if (res.ok) {
        const json = await res.json();
        if (json.hasBusiness && json.business) {
          setBusiness(json.business as Business);
          setMembership(json.membership as BusinessMember);
          return true;
        }
      }

      // Fallback: client Supabase query if RLS allows
      const { data: memberData } = await supabase
        .from("business_members")
        .select("*")
        .eq("user_id", currentUserId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (memberData) {
        setMembership(memberData as BusinessMember);
        const { data: bizData } = await supabase
          .from("businesses")
          .select("*")
          .eq("id", memberData.business_id)
          .single();

        if (bizData) {
          setBusiness(bizData as Business);
          return true;
        }
      }

      setBusiness(null);
      setMembership(null);
      return false;
    } catch (err) {
      console.error("Error fetching business context:", err);
      setBusiness(null);
      setMembership(null);
      return false;
    }
  };

  const refreshBusiness = async (): Promise<boolean> => {
    if (user) {
      return await fetchBusinessContext(user.id, session?.access_token);
    }
    return false;
  };

  const sendEmailOtp = async (emailToVerify: string) => {
    try {
      const cleanEmail = emailToVerify.trim().toLowerCase();
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
        },
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const verifyEmailOtp = async (emailToVerify: string, token: string) => {
    try {
      const cleanEmail = emailToVerify.trim().toLowerCase();
      const cleanToken = token.trim();
      const res = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: "email",
      });
      if (!res.error && res.data?.user) {
        setUser(res.data.user);
        setSession(res.data.session);
        await fetchBusinessContext(res.data.user.id, res.data.session?.access_token);
      }
      return { data: res.data, error: res.error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : "/auth/callback";

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Sign out err:", e);
    } finally {
      setUser(null);
      setSession(null);
      setBusiness(null);
      setMembership(null);
    }
  };

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchBusinessContext(session.user.id, session.access_token);
      }
      setLoading(false);
    });

    // Auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchBusinessContext(session.user.id, session.access_token);
      } else {
        setBusiness(null);
        setMembership(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        business,
        membership,
        role: membership?.role ?? null,
        hasBusiness: !!business,
        refreshBusiness,
        sendEmailOtp,
        verifyEmailOtp,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
