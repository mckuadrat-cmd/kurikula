import { supabase } from "../../utils/supabase/client";

export async function getMyWorkspaces() {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, workspaces:workspace_id (id, name, type, subscription_tier, subscription_status, subscription_expires_at, billing_cycle)")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? [])
    .map((row: any) => ({
      role: row.role as string,
      id: row.workspaces.id as string,
      name: row.workspaces.name as string,
      type: row.workspaces.type as string,
      subscription_tier: row.workspaces.subscription_tier as string,
      subscription_status: row.workspaces.subscription_status as string,
      subscription_expires_at: row.workspaces.subscription_expires_at ? new Date(row.workspaces.subscription_expires_at) : null,
      billing_cycle: row.workspaces.billing_cycle as string
    }));
}

export async function getActiveWorkspaceId() {
  const list = await getMyWorkspaces();
  if (!list.length) return null;

  // prefer localStorage kalau ada
  const saved = localStorage.getItem("active_workspace_id");
  if (saved && list.some((w: any) => w.id === saved)) return saved;

  // fallback: workspace pertama
  localStorage.setItem("active_workspace_id", list[0].id);
  return list[0].id;
}

export function setActiveWorkspaceId(id: string) {
  localStorage.setItem("active_workspace_id", id);
}
