import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getActiveWorkspaceId, getMyWorkspaces, setActiveWorkspaceId } from "@/lib/workspace";
import { getWorkspaceCredits } from "@/lib/credits";
import { supabase } from "../../utils/supabase/client";
import { useAuth } from "./AuthContext";

type Workspace = {
  id: string;
  name: string;
  type: string;
  role: string;
  subscription_tier?: string;
  subscription_status?: string;
  subscription_expires_at?: Date | null;
  billing_cycle?: string;
};
type Credits = { balance: number; total_earned: number; total_spent: number };

type Ctx = {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  credits: Credits | null;
  subscriptionTier: string;
  subscriptionExpiresAt: Date | null;
  latestSubscriptionTrx: any | null;
  aiModels: any[];
  setSubscriptionTier: (tier: string) => void;
  refresh: () => Promise<void>;
  switchWorkspace: (id: string) => Promise<void>;
};

const WorkspaceContext = createContext<Ctx | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActive] = useState<string | null>(null);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [latestSubscriptionTrx, setLatestSubscriptionTrx] = useState<any | null>(null);
  const [subscriptionTierOverride, setTierOverride] = useState<string | null>(null);
  const [aiModels, setAiModels] = useState<any[]>([]);

  const activeWorkspace = useMemo(() => {
    return workspaces.find((w) => w.id === activeWorkspaceId) || null;
  }, [workspaces, activeWorkspaceId]);

  const subscriptionExpiresAt = useMemo(() => {
    if (!activeWorkspace) return null;
    return activeWorkspace.subscription_expires_at ? new Date(activeWorkspace.subscription_expires_at) : null;
  }, [activeWorkspace]);

  const subscriptionTier = useMemo(() => {
    if (subscriptionTierOverride) return subscriptionTierOverride;
    if (!activeWorkspace) return "inactive";

    // Cek jika kedaluwarsa
    if (activeWorkspace.subscription_expires_at && new Date() > new Date(activeWorkspace.subscription_expires_at)) {
      return "inactive";
    }

    return activeWorkspace.subscription_tier || "inactive";
  }, [activeWorkspace, subscriptionTierOverride]);

  const setSubscriptionTier = (tier: string) => {
    setTierOverride(tier);
  };

  async function fetchLatestSubscriptionTrx(workspaceId: string) {
    try {
      const { data, error } = await supabase
        .from("payment_transactions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "success")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []).find((t: any) => !t.tier_key.startsWith("topup-")) || null;
    } catch (e) {
      console.warn("Gagal mengambil transaksi langganan:", e);
      return null;
    }
  }

  async function refresh() {
    setTierOverride(null); // Reset local override to load updated DB value
    const ws = await getMyWorkspaces();
    setWorkspaces(ws);

    const active = await getActiveWorkspaceId();
    setActive(active);

    if (active) {
      try {
        const c = await getWorkspaceCredits(active);
        setCredits(c);

        const trx = await fetchLatestSubscriptionTrx(active);
        setLatestSubscriptionTrx(trx);
      } catch (e) {
        console.warn("Gagal mengambil credits dari DB:", e);
      }
    } else {
      setCredits(null);
      setLatestSubscriptionTrx(null);
    }

    // Fetch AI Models
    try {
      const { data, error } = await supabase
        .from("ai_models")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true });
      if (!error && data && data.length > 0) {
        setAiModels(data);
      } else {
        // Fallback models
        setAiModels([
          { id: "gemini-flash", name: "Gemini 2.5 Flash", api_string: "gemini-2.5-flash", multiplier: 1, tier_restriction: ["basic", "pro", "premium", "school", "trial"] },
          { id: "gemini-pro", name: "Gemini 2.5 Pro", api_string: "gemini-2.5-pro", multiplier: 2, tier_restriction: ["pro", "premium", "school", "trial"] },
          { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", api_string: "gemini-3.5-flash", multiplier: 1, tier_restriction: ["basic", "pro", "premium", "school", "trial"] },
          { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", api_string: "gemini-3.1-pro", multiplier: 2, tier_restriction: ["pro", "premium", "school", "trial"] }
        ]);
      }
    } catch {
      setAiModels([
        { id: "gemini-flash", name: "Gemini 2.5 Flash", api_string: "gemini-2.5-flash", multiplier: 1, tier_restriction: ["basic", "pro", "premium", "school", "trial"] },
        { id: "gemini-pro", name: "Gemini 2.5 Pro", api_string: "gemini-2.5-pro", multiplier: 2, tier_restriction: ["pro", "premium", "school", "trial"] },
        { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", api_string: "gemini-3.5-flash", multiplier: 1, tier_restriction: ["basic", "pro", "premium", "school", "trial"] },
        { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", api_string: "gemini-3.1-pro", multiplier: 2, tier_restriction: ["pro", "premium", "school", "trial"] }
      ]);
    }
  }

  async function switchWorkspace(id: string) {
    setTierOverride(null); // Reset override on switch
    setActiveWorkspaceId(id);
    setActive(id);
    try {
      const c = await getWorkspaceCredits(id);
      setCredits(c);

      const trx = await fetchLatestSubscriptionTrx(id);
      setLatestSubscriptionTrx(trx);
    } catch (e) {
      console.warn("Gagal mengambil data saat switch workspace:", e);
    }
  }

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      refresh().catch(console.error);
    } else {
      setWorkspaces([]);
      setActive(null);
      setCredits(null);
      setLatestSubscriptionTrx(null);
      setTierOverride(null);
    }
  }, [user]);

  const activeCredits = useMemo(() => {
    // 1. Prioritaskan data real dari database jika ada
    if (credits) {
      return credits;
    }
    
    // 2. Jika belum ada di DB, gunakan fallback mockup berdasarkan tier
    if (subscriptionTier === "trial") {
      return { balance: 50, total_earned: 50, total_spent: 0 };
    }
    if (subscriptionTier === "basic") {
      return { balance: 30, total_earned: 30, total_spent: 0 };
    }
    if (subscriptionTier === "pro") {
      return { balance: 150, total_earned: 150, total_spent: 0 };
    }
    if (subscriptionTier === "premium") {
      return { balance: 500, total_earned: 500, total_spent: 0 };
    }
    if (subscriptionTier === "school") {
      return { balance: 10000, total_earned: 10000, total_spent: 0 };
    }
    return { balance: 0, total_earned: 0, total_spent: 0 };
  }, [subscriptionTier, credits]);

  const value = useMemo(() => ({
    workspaces,
    activeWorkspaceId,
    credits: activeCredits,
    subscriptionTier,
    subscriptionExpiresAt,
    latestSubscriptionTrx,
    aiModels,
    setSubscriptionTier,
    refresh,
    switchWorkspace
  }), [
    workspaces,
    activeWorkspaceId,
    activeCredits,
    subscriptionTier,
    subscriptionExpiresAt,
    latestSubscriptionTrx,
    aiModels,
  ]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
