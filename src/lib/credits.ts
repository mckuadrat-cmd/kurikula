import { supabase } from "../../utils/supabase/client";

export async function getWorkspaceCredits(workspaceId: string) {
  const { data, error } = await supabase
    .from("credits")
    .select("balance, total_spent")
    .eq("workspace_id", workspaceId);

  if (error) throw error;
  return data && data.length > 0 ? {
    balance: data[0].balance,
    total_spent: data[0].total_spent,
    total_earned: data[0].balance + data[0].total_spent
  } : null;
}
