import { supabase } from "../../utils/supabase/client";

type GenerateAIRequest = {
  workspaceId: string | null;
  type: string;
  model: string;
  params: Record<string, unknown>;
};

type GenerateAIResponse = {
  content?: string;
  error?: string;
};

export async function generateAIContent({
  workspaceId,
  type,
  model,
  params,
}: GenerateAIRequest): Promise<string> {
  if (!workspaceId) {
    throw new Error("Workspace aktif tidak ditemukan. Silakan pilih workspace terlebih dahulu.");
  }

  const functionBaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!functionBaseUrl) {
    throw new Error("Konfigurasi Supabase belum lengkap.");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    throw new Error("Sesi login Anda berakhir. Silakan login ulang.");
  }

  const response = await fetch(
    `${functionBaseUrl}/functions/v1/server/make-server-84c63b2a/generate-ai`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        workspaceId,
        type,
        model,
        params,
      }),
    }
  );

  const result = (await response.json().catch(() => ({}))) as GenerateAIResponse;

  if (!response.ok) {
    throw new Error(result.error || "Gagal memproses permintaan AI.");
  }

  if (!result.content) {
    throw new Error("Respons AI kosong dari server.");
  }

  return result.content;
}
