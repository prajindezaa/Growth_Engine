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
  invoice_sequence: number;
  plan: string;
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
  refreshBusiness: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  business: null,
  membership: null,
  role: null,
  refreshBusiness: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<Business | null>(null);
  const [membership, setMembership] = useState<BusinessMember | null>(null);

  const fetchBusinessContext = async (currentUserId: string) => {
    try {
      // 1. Get active membership
      const { data: memberData, error: memberErr } = await supabase
        .from("business_members")
        .select("*")
        .eq("user_id", currentUserId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (memberErr || !memberData) {
        // Check if there is an unattached or default business we can attach or fallback to
        const { data: bizList } = await supabase.from("businesses").select("*").limit(1);
        if (bizList && bizList.length > 0) {
          setBusiness(bizList[0] as Business);
          setMembership({
            id: "fallback-member",
            business_id: bizList[0].id,
            user_id: currentUserId,
            role: "owner",
            status: "active",
          });
        } else {
          setBusiness(null);
          setMembership(null);
        }
        return;
      }

      setMembership(memberData as BusinessMember);

      // 2. Fetch business details
      const { data: bizData, error: bizErr } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", memberData.business_id)
        .single();

      if (!bizErr && bizData) {
        setBusiness(bizData as Business);
      }
    } catch (err) {
      console.error("Error fetching business context:", err);
    }
  };

  const refreshBusiness = async () => {
    if (user) {
      await fetchBusinessContext(user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setBusiness(null);
    setMembership(null);
  };

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchBusinessContext(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchBusinessContext(session.user.id);
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
        refreshBusiness,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
