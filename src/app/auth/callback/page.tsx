"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { refreshBusiness } = useAuth();
  const [statusText, setStatusText] = useState("Verifying your Google session...");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function handleAuthCallback() {
      try {
        // Supabase client automatically processes URL hash or query params
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session || !session.user) {
          // If no immediate session, give onAuthStateChange a brief moment
          const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (currentSession?.user) {
              authListener.subscription.unsubscribe();
              await proceedWithUser(currentSession.user.id, currentSession.access_token);
            }
          });

          // Timeout fallback
          setTimeout(() => {
            if (isMounted && !errorText) {
              setErrorText("Authentication timed out. Please return to login.");
            }
          }, 6000);
          return;
        }

        await proceedWithUser(session.user.id, session.access_token);
      } catch (err: any) {
        console.error("Auth callback error:", err);
        if (isMounted) {
          setErrorText(err.message || "Failed to complete authentication");
        }
      }
    }

    async function proceedWithUser(userId: string, accessToken?: string) {
      if (!isMounted) return;
      setStatusText("Checking your business profile...");

      try {
        const headers: Record<string, string> = {};
        if (accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }

        const res = await fetch(`/api/auth/profile-status?userId=${encodeURIComponent(userId)}`, {
          headers,
        });

        let hasBusiness = false;
        if (res.ok) {
          const json = await res.json();
          hasBusiness = json.hasBusiness === true;
        }

        await refreshBusiness();

        if (hasBusiness) {
          router.replace("/");
        } else {
          router.replace("/onboarding");
        }
      } catch (err) {
        console.error("Error in proceedWithUser:", err);
        router.replace("/onboarding");
      }
    }

    handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [router, refreshBusiness, errorText]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center shadow-xl border-slate-200/80 rounded-3xl bg-white/95">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4F46E5] mx-auto mb-4 animate-pulse">
          <Sparkles className="w-7 h-7" />
        </div>

        {errorText ? (
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-rose-600">Authentication Error</h2>
            <p className="text-xs text-slate-500">{errorText}</p>
            <button
              onClick={() => router.replace("/login")}
              className="mt-4 px-4 py-2 rounded-xl bg-[#4F46E5] text-white text-xs font-bold shadow-sm"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Connecting GrowthEngine...
            </h2>
            <p className="text-xs text-slate-500">{statusText}</p>
            <div className="w-36 h-1.5 bg-slate-100 rounded-full mx-auto mt-4 overflow-hidden">
              <div className="h-full bg-[#4F46E5] rounded-full animate-indeterminate" />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
