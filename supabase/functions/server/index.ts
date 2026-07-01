import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.ts";
import { SkillRegistry } from "./ai/utils/skillRegistry.ts";
import { CreditCalculator } from "./ai/utils/creditCalculator.ts";
import { OutputValidator } from "./ai/utils/outputValidator.ts";
import { PromptBuilder } from "./ai/utils/promptBuilder.ts";
import { AISafety } from "./ai/utils/aiSafety.ts";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-84c63b2a/health", (c) => {
  return c.json({ status: "ok" });
});

// Gemini AI generation endpoint
app.post("/make-server-84c63b2a/generate-ai", async (c) => {
  try {
    const { workspaceId, type, model, params } = await c.req.json();
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Verifikasi user
    const user = await verifyUser(c);
    if (!user) {
      return c.json({ error: "Unauthorized. Silakan login kembali." }, 401);
    }

    // 2. Cek keanggotaan workspace
    const { data: member, error: errMem } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member) {
      return c.json({ error: "Forbidden. Anda bukan anggota workspace ini." }, 403);
    }

    // 3. Cek subscription aktif
    const { data: ws, error: errWs } = await supabase
      .from("workspaces")
      .select("subscription_tier, subscription_status, subscription_expires_at")
      .eq("id", workspaceId)
      .single();

    if (errWs || !ws) {
      return c.json({ error: "Workspace tidak ditemukan." }, 404);
    }

    const nowTime = new Date();
    const isSubscriptionActive = ws.subscription_tier && ws.subscription_tier !== "inactive" && (
      ws.subscription_tier === "trial" ||
      ws.subscription_tier === "basic" ||
      ws.subscription_tier === "pro" ||
      ws.subscription_tier === "premium" ||
      ws.subscription_tier === "school"
    ) && (
      !ws.subscription_expires_at || new Date(ws.subscription_expires_at) > nowTime
    );

    if (!isSubscriptionActive) {
      return c.json({ error: "Paket langganan Anda tidak aktif atau sudah kedaluwarsa." }, 400);
    }

    // 4. Validasi Tier & Model AI yang dipilih
    const tierValidation = CreditCalculator.validateTierAndModel(ws.subscription_tier, model);
    if (!tierValidation.allowed) {
      return c.json({ error: tierValidation.reason }, 403);
    }

    // 5. Cek sisa credit cukup
    const { data: credit, error: errCredit } = await supabase
      .from("credits")
      .select("balance, total_spent")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const balance = credit?.balance ?? 0;
    const cost = CreditCalculator.getCreditCost(type, model);

    if (balance < cost) {
      return c.json({ error: `AI Credit tidak cukup. Estimasi biaya ${cost} credit, saldo Anda ${balance} credit. Silakan top up atau upgrade paket.` }, 400);
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return c.json({ error: "Missing GEMINI_API_KEY environment variable" }, 500);
    }

    let requestBody: any = null;

    if (type === "chat") {
      // Chat uses standard streaming or full body payload with context instructions
      const contentsPayload = params.contents;
      
      // Let's add more context if available in params
      let activeContextMsg = "Anda adalah EduGuru AI, asisten guru pintar untuk platform Kurikula. Jawablah pertanyaan guru secara profesional, ramah, dan solutif dalam Bahasa Indonesia. Fokuskan jawaban Anda pada bidang pendidikan, pengajaran, kurikulum Merdeka, dan administrasi sekolah jika relevan. Berikan jawaban yang ringkas dan padat karena ini adalah antarmuka chat sidebar. Hindari format markdown yang terlalu besar (seperti heading # atau ##), gunakan bullet points atau bold secukupnya.";
      
      if (params.context) {
        const { teacherProfile, activeClass, activeSubject, lastDocument, lastSemesterPlan, lastModule } = params.context;
        let details = "\nKonteks tambahan aktif:";
        if (teacherProfile) details += `\n- Profil Guru: ${teacherProfile}`;
        if (activeClass) details += `\n- Kelas Aktif: ${activeClass}`;
        if (activeSubject) details += `\n- Mapel Aktif: ${activeSubject}`;
        if (lastDocument) details += `\n- Dokumen Terakhir: ${lastDocument}`;
        if (lastSemesterPlan) details += `\n- Semester Planner Terakhir: ${lastSemesterPlan}`;
        if (lastModule) details += `\n- Modul Ajar Terakhir: ${lastModule}`;
        
        activeContextMsg += details;
      }
      
      requestBody = {
        contents: contentsPayload,
        systemInstruction: {
          parts: [{ text: activeContextMsg }]
        }
      };
    } else {
      // This is a skill
      const skill = SkillRegistry.getSkill(type);
      if (!skill) {
        return c.json({ error: `Skill "${type}" tidak ditemukan.` }, 400);
      }

      // Check required inputs
      const missingInputs = skill.requiredInputs.filter(req => !params[req]);
      if (missingInputs.length > 0) {
        return c.json({ error: `Input wajib berikut tidak lengkap: ${missingInputs.join(", ")}` }, 400);
      }

      // Prompt injection safety check
      const paramsSerialized = JSON.stringify(params);
      if (!AISafety.isSafe(paramsSerialized)) {
        return c.json({ error: "Peringatan Keamanan: Input mengandung pola mencurigakan atau instruksi berbahaya (prompt injection)." }, 400);
      }
      const skillPrompt = skill.buildPrompt(params);
      const finalPrompt = PromptBuilder.build(skillPrompt, skill.rules);

      requestBody = {
        contents: [
          {
            parts: [
              {
                text: finalPrompt
              }
            ]
          }
        ]
      };

      if (skill.outputFormat && skill.outputFormat.toLowerCase() === "json") {
        requestBody.generationConfig = {
          responseMimeType: "application/json"
        };
      }
    }

    const targetModel = model === "gemini-pro" ? "gemini-2.5-pro" : "gemini-2.5-flash";

    // Panggil Gemini
    let response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      // Simpan log kegagalan ke database (cost = 0, status = failed)
      await supabase.from("ai_credit_usage").insert({
        workspace_id: workspaceId,
        user_id: user.id,
        type: type,
        model: model || "gemini-flash",
        credit_cost: 0,
        status: "failed"
      });
      return c.json({ error: `AI gagal memproses (Gemini API error). Credit tidak dipotong. Silakan coba lagi. Detail: ${errorText}` }, response.status);
    }

    let data = await response.json();
    let generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // 6. Validasi output (bukan chat)
    if (type !== "chat") {
      const validation = OutputValidator.validate(type, generatedText);
      if (!validation.valid) {
        console.log(`Validasi gagal untuk type ${type}. Missing parts:`, validation.missingParts);
        // Lakukan 1 kali retry dengan prompt perbaikan
        const skill = SkillRegistry.getSkill(type);
        const skillPrompt = skill ? skill.buildPrompt(params) : "";
        const retryPrompt = OutputValidator.buildRetryPrompt(PromptBuilder.build(skillPrompt, skill ? skill.rules : []), validation.missingParts);

        const retryRequestBody: any = {
          contents: [
            {
              parts: [{ text: retryPrompt }]
            }
          ]
        };

        if (skill && skill.outputFormat && skill.outputFormat.toLowerCase() === "json") {
          retryRequestBody.generationConfig = {
            responseMimeType: "application/json"
          };
        }

        const retryResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(retryRequestBody),
          }
        );
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          const retryText = retryData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const secondValidation = OutputValidator.validate(type, retryText);
          
          if (secondValidation.valid) {
            generatedText = retryText;
          } else {
            // Jika tetap tidak valid setelah retry, kita return error dan tidak memotong credit
            await supabase.from("ai_credit_usage").insert({
              workspace_id: workspaceId,
              user_id: user.id,
              type: type,
              model: model || "gemini-flash",
              credit_cost: 0,
              status: "failed"
            });
            return c.json({ error: `Hasil AI tidak lengkap setelah 2 kali percobaan (Missing: ${secondValidation.missingParts.join(", ")}). Credit tidak dipotong. Silakan lengkapi data input dan coba lagi.` }, 422);
          }
        } else {
          // Jika retry fetch gagal
          await supabase.from("ai_credit_usage").insert({
            workspace_id: workspaceId,
            user_id: user.id,
            type: type,
            model: model || "gemini-flash",
            credit_cost: 0,
            status: "failed"
          });
          return c.json({ error: "Percobaan perbaikan AI gagal (Gemini API error). Credit tidak dipotong. Silakan coba lagi." }, 500);
        }
      }
    }

    // 7. Potong credit di database
    const newBalance = balance - cost;
    const newSpent = (credit?.total_spent ?? 0) + cost;

    const { error: errUpdateCredit } = await supabase
      .from("credits")
      .update({
        balance: newBalance,
        total_spent: newSpent,
        updated_at: new Date().toISOString()
      })
      .eq("workspace_id", workspaceId);

    if (errUpdateCredit) throw errUpdateCredit;

    // 8. Simpan log penggunaan ke ai_credit_usage
    await supabase.from("ai_credit_usage").insert({
      workspace_id: workspaceId,
      user_id: user.id,
      type: type,
      model: model || "gemini-flash",
      credit_cost: cost,
      status: "success"
    });

    return c.json({ content: generatedText });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Endpoint untuk memproses pemesanan token Snap Midtrans
app.post("/make-server-84c63b2a/charge", async (c) => {
  try {
    const { workspaceId, tierKey } = await c.req.json();

    // Validasi harga server-side
    let amount = 0;
    if (tierKey === "basic") amount = 29000;
    else if (tierKey === "pro") amount = 59000;
    else if (tierKey === "premium") amount = 99000;
    else if (tierKey === "basic-yearly") amount = 290000;
    else if (tierKey === "pro-yearly") amount = 590000;
    else if (tierKey === "premium-yearly") amount = 990000;
    else if (tierKey === "topup-100") amount = 15000;
    else if (tierKey === "topup-250") amount = 30000;
    else if (tierKey === "topup-500") amount = 50000;
    else return c.json({ error: "Paket tidak valid" }, 400);

    const orderId = `KURI-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY");
    if (!serverKey) {
      return c.json({ error: "MIDTRANS_SERVER_KEY environment variable is missing" }, 500);
    }

    const midtransAuth = btoa(serverKey + ":");

    // Panggil Snap API Midtrans
    const response = await fetch("https://app.sandbox.midtrans.com/snap/v1/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Basic ${midtransAuth}`
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: amount
        },
        credit_card: { secure: true }
      })
    });

    const snapData = await response.json();
    if (!response.ok) {
      throw new Error(snapData.error_messages?.join(", ") || "Failed to contact Midtrans");
    }

    // Sambungkan ke database Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const isYearly = tierKey.endsWith("-yearly");
    const isTopUp = tierKey.startsWith("topup-");
    const billingCycle = isTopUp ? null : (isYearly ? "yearly" : "monthly");

    // Catat data transaksi pembayaran awal (pending)
    const { error } = await supabase.from("payment_transactions").insert({
      workspace_id: workspaceId,
      order_id: orderId,
      amount,
      tier_key: tierKey,
      billing_cycle: billingCycle,
      status: "pending",
      payment_url: snapData.redirect_url
    });

    if (error) throw new Error(error.message);

    return c.json({ token: snapData.token, redirectUrl: snapData.redirect_url });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Endpoint webhook/callback notifikasi pembayaran dari Midtrans
app.post("/make-server-84c63b2a/webhook", async (c) => {
  try {
    const body = await c.req.json();
    const { order_id, transaction_status, fraud_status } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (
      transaction_status === "settlement" ||
      (transaction_status === "capture" && fraud_status === "accept")
    ) {
      // Ambil detail transaksi
      const { data: trx, error: errTrx } = await supabase
        .from("payment_transactions")
        .select("*")
        .eq("order_id", order_id)
        .single();

      if (errTrx) throw new Error(errTrx.message);

      if (trx && trx.status === "pending") {
        // A. Ubah status transaksi menjadi 'success'
        await supabase
          .from("payment_transactions")
          .update({ status: "success", updated_at: new Date().toISOString() })
          .eq("order_id", order_id);

        // B. Hitung jumlah credit
        let creditBonus = 0;
        const isTopUp = trx.tier_key.startsWith("topup-");
        if (trx.tier_key === "trial") creditBonus = 50;
        else if (trx.tier_key === "basic") creditBonus = 30;
        else if (trx.tier_key === "basic-yearly") creditBonus = 360;
        else if (trx.tier_key === "pro") creditBonus = 150;
        else if (trx.tier_key === "pro-yearly") creditBonus = 1800;
        else if (trx.tier_key === "premium") creditBonus = 500;
        else if (trx.tier_key === "premium-yearly") creditBonus = 6000;
        else if (trx.tier_key === "topup-100") creditBonus = 100;
        else if (trx.tier_key === "topup-250") creditBonus = 250;
        else if (trx.tier_key === "topup-500") creditBonus = 500;

        // C. Dapatkan data credit saat ini dari tabel credits
        const { data: credit } = await supabase
          .from("credits")
          .select("*")
          .eq("workspace_id", trx.workspace_id)
          .maybeSingle();

        const currentBalance = credit?.balance ?? 0;
        const currentSpent = credit?.total_spent ?? 0;

        // D. Tambahkan credit ke database
        await supabase.from("credits").upsert({
          workspace_id: trx.workspace_id,
          balance: isTopUp ? (currentBalance + creditBonus) : creditBonus,
          total_spent: currentSpent,
          updated_at: new Date().toISOString()
        });

        // E. Perbarui level paket workspace (kolom type di tabel workspaces) hanya jika bukan transaksi top up
        if (!isTopUp) {
          const rawTier = trx.tier_key.replace("-yearly", "");
          const isYearly = trx.tier_key.endsWith("-yearly");
          const expiryDate = new Date();
          if (isYearly) {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          } else {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
          }
          const cycle = isYearly ? "yearly" : "monthly";

          const { error: errWsUpdate } = await supabase
            .from("workspaces")
            .update({
              subscription_tier: rawTier,
              subscription_status: "active",
              subscription_expires_at: expiryDate.toISOString(),
              billing_cycle: cycle
            })
            .eq("id", trx.workspace_id);
          if (errWsUpdate) throw new Error("Failed to update workspace plan: " + errWsUpdate.message);
        }
      }
    } else if (["cancel", "deny", "expire"].includes(transaction_status)) {
      // Tandai transaksi gagal
      await supabase
        .from("payment_transactions")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("order_id", order_id);
    }

    return c.text("OK");
  } catch (err: any) {
    return c.text(`Webhook Error: ${err.message}`, 500);
  }
});

// Endpoint untuk membatalkan pembayaran pending
app.post("/make-server-84c63b2a/cancel", async (c) => {
  try {
    const { workspaceId, orderId } = await c.req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Tandai transaksi sebagai gagal/batal jika sebelumnya masih pending
    const { error } = await supabase
      .from("payment_transactions")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .eq("order_id", orderId)
      .eq("status", "pending");

    if (error) throw new Error(error.message);

    return c.json({ success: true, message: "Transaksi berhasil dibatalkan." });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Endpoint untuk menerjemahkan username menjadi email
app.post("/make-server-84c63b2a/resolve-username", async (c) => {
  try {
    const { username } = await c.req.json();
    if (!username) {
      return c.json({ error: "Username is required." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: email, error } = await supabase
      .rpc("resolve_username_to_email", { search_username: username.toLowerCase().trim() });

    if (error) throw error;

    return c.json({ email: email || null });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Helper untuk verifikasi Super Admin
async function verifySuperAdmin(c: any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return null;
  }

  // Akun Super Admin yang diperbolehkan (case-insensitive)
  if (user.email?.toLowerCase() === "mckuadratid@gmail.com" || user.user_metadata?.role === "superadmin") {
    return user;
  }
  return null;
}

// 1. GET /admin/users - Mendapatkan daftar semua user
app.get("/make-server-84c63b2a/admin/users", async (c) => {
  const admin = await verifySuperAdmin(c);
  if (!admin) {
    return c.json({ error: "Unauthorized. Super Admin only." }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) throw authErr;

    const { data: members, error: memErr } = await supabase
      .from("workspace_members")
      .select("user_id, role, workspace_id, workspaces(id, name, type)");
    if (memErr) throw memErr;

    const { data: credits, error: credErr } = await supabase
      .from("credits")
      .select("workspace_id, balance, total_spent");
    if (credErr) throw credErr;

    const mappedUsers = users.map((u: any) => {
      const userMembers = (members ?? []).filter((m: any) => m.user_id === u.id);
      
      const userWorkspaces = userMembers.map((m: any) => {
        const wsCredits = (credits ?? []).find((c: any) => c.workspace_id === m.workspace_id);
        return {
          workspace_id: m.workspace_id,
          role: m.role,
          name: m.workspaces?.name || "Unknown Workspace",
          type: m.workspaces?.type || "personal",
          balance: wsCredits?.balance ?? 0,
          total_earned: 0,
          total_spent: wsCredits?.total_spent ?? 0,
        };
      });

      const isBanned = u.banned_until && new Date(u.banned_until) > new Date();

      return {
        id: u.id,
        email: u.email,
        name: u.user_metadata?.name || u.email || "Nama Akun",
        school: u.user_metadata?.school || "",
        google_spreadsheet_id: u.user_metadata?.google_spreadsheet_id || null,
        created_at: u.created_at,
        is_active: !isBanned && u.user_metadata?.status !== "inactive",
        role: (u.email?.toLowerCase() === "mckuadratid@gmail.com" || u.user_metadata?.role === "superadmin") ? "superadmin" : "user",
        workspaces: userWorkspaces,
      };
    });

    return c.json({ users: mappedUsers });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 2. POST /admin/users/:id/update-role - Mengubah role global atau mendaftarkan ke workspace sekolah
app.post("/make-server-84c63b2a/admin/users/:id/update-role", async (c) => {
  const admin = await verifySuperAdmin(c);
  if (!admin) return c.json({ error: "Unauthorized. Super Admin only." }, 401);
  const userId = c.req.param("id");
  const { action, globalRole, workspaceId, workspaceName, memberRole } = await c.req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    if (action === "update_global_role") {
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { role: globalRole }
      });
      if (error) throw error;
      return c.json({ success: true, message: `Global role updated to ${globalRole}.` });
    }

    if (action === "assign_school_admin") {
      let activeWsId = workspaceId;
      
      if (!activeWsId && workspaceName) {
        const { data: newWs, error: wsErr } = await supabase
          .from("workspaces")
          .insert({ name: workspaceName, type: "school" })
          .select("id")
          .single();
        if (wsErr) throw wsErr;
        activeWsId = newWs.id;

        await supabase.from("credits").insert({
          workspace_id: activeWsId,
          balance: 50, // start with trial 50 credits
          total_spent: 0
        });
      }

      if (!activeWsId) {
        return c.json({ error: "Workspace ID or Workspace Name is required." }, 400);
      }

      const { error: memErr } = await supabase
        .from("workspace_members")
        .upsert({
          workspace_id: activeWsId,
          user_id: userId,
          role: memberRole || "admin"
        });
      if (memErr) throw memErr;

      if (workspaceName) {
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { school: workspaceName }
        });
      }

      return c.json({ success: true, message: "Workspace member role assigned successfully." });
    }

    return c.json({ error: "Invalid action." }, 400);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 3. POST /admin/users/:id/toggle-status - Menonaktifkan / mengaktifkan akun user
app.post("/make-server-84c63b2a/admin/users/:id/toggle-status", async (c) => {
  const admin = await verifySuperAdmin(c);
  if (!admin) return c.json({ error: "Unauthorized. Super Admin only." }, 401);
  const userId = c.req.param("id");
  const { is_active } = await c.req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const banDuration = is_active ? "none" : "876000h";
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: banDuration,
      user_metadata: { status: is_active ? "active" : "inactive" }
    });
    if (error) throw error;
    return c.json({ success: true, message: `User status changed. Active: ${is_active}` });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 4. POST /admin/users/:id/add-tokens - Menambah token secara manual
app.post("/make-server-84c63b2a/admin/users/:id/add-tokens", async (c) => {
  const admin = await verifySuperAdmin(c);
  if (!admin) return c.json({ error: "Unauthorized. Super Admin only." }, 401);
  const { workspaceId, amount } = await c.req.json();

  if (!workspaceId || amount === undefined) {
    return c.json({ error: "workspaceId and amount are required." }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { data: credit, error: selectErr } = await supabase
      .from("credits")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (selectErr) throw selectErr;

    const currentBalance = credit?.balance ?? 0;
    const currentSpent = credit?.total_spent ?? 0;

    const { error: upsertErr } = await supabase
      .from("credits")
      .upsert({
        workspace_id: workspaceId,
        balance: currentBalance + amount,
        total_spent: currentSpent,
        updated_at: new Date().toISOString()
      });

    if (upsertErr) throw upsertErr;

    return c.json({ success: true, message: `Successfully added ${amount} tokens.` });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 5. DELETE /admin/users/:id - Menghapus user secara permanen
app.delete("/make-server-84c63b2a/admin/users/:id", async (c) => {
  const admin = await verifySuperAdmin(c);
  if (!admin) return c.json({ error: "Unauthorized. Super Admin only." }, 401);
  const userId = c.req.param("id");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    await supabase.from("workspace_members").delete().eq("user_id", userId);
    
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;

    return c.json({ success: true, message: "User deleted permanently from auth and database." });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 6. GET /admin/transactions - Mengambil histori seluruh transaksi billing
app.get("/make-server-84c63b2a/admin/transactions", async (c) => {
  const admin = await verifySuperAdmin(c);
  if (!admin) return c.json({ error: "Unauthorized. Super Admin only." }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { data, error } = await supabase
      .from("payment_transactions")
      .select("*, workspaces:workspace_id(name, type)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return c.json({ transactions: data ?? [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// ENDPOINT ADMIN SEKOLAH (SCHOOL ADMIN)
// ==========================================

// Helper untuk verifikasi status Admin/Owner Sekolah
async function verifySchoolAdmin(c: any, workspaceId: string) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  // Cek apakah user adalah owner atau admin di workspace tersebut
  const { data: memberCheck } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberCheck && (memberCheck.role === "owner" || memberCheck.role === "admin")) {
    return user;
  }
  return null;
}

// 1. GET /workspaces/:id/members - Mengambil daftar guru di sekolah tersebut
app.get("/make-server-84c63b2a/workspaces/:id/members", async (c) => {
  const workspaceId = c.req.param("id");
  const caller = await verifySchoolAdmin(c, workspaceId);
  if (!caller) {
    return c.json({ error: "Forbidden. School Admin/Owner only." }, 403);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { data: members, error: memErr } = await supabase
      .from("workspace_members")
      .select("user_id, role, created_at")
      .eq("workspace_id", workspaceId);
    if (memErr) throw memErr;

    const { data: { users } } = await supabase.auth.admin.listUsers();
    
    const userList = (members ?? []).map((m: any) => {
      const u = users.find((usr: any) => usr.id === m.user_id);
      return {
        id: m.user_id,
        email: u?.email || "unknown@school.com",
        name: u?.user_metadata?.name || u?.email || "Guru Kurikula",
        role: m.role,
        created_at: m.created_at
      };
    });

    return c.json({ members: userList });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 2. POST /workspaces/:id/members - Menambahkan guru ke sekolah lewat email
app.post("/make-server-84c63b2a/workspaces/:id/members", async (c) => {
  const workspaceId = c.req.param("id");
  const caller = await verifySchoolAdmin(c, workspaceId);
  if (!caller) {
    return c.json({ error: "Forbidden. School Admin/Owner only." }, 403);
  }

  const { email } = await c.req.json();
  if (!email) {
    return c.json({ error: "Email guru wajib diisi." }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Cari user di Supabase Auth
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const targetUser = users.find((usr: any) => usr.email?.toLowerCase() === email.toLowerCase());

    if (!targetUser) {
      return c.json({
        error: "Email guru tidak ditemukan. Silakan minta guru tersebut untuk mendaftar akun Kurikula terlebih dahulu."
      }, 404);
    }

    // Masukkan ke workspace_members
    const { error: insertErr } = await supabase
      .from("workspace_members")
      .upsert({
        workspace_id: workspaceId,
        user_id: targetUser.id,
        role: "member"
      });

    if (insertErr) throw insertErr;

    return c.json({ success: true, message: `Berhasil menambahkan guru ${targetUser.email}.` });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 3. DELETE /workspaces/:id/members/:userId - Mengeluarkan guru dari sekolah
app.delete("/make-server-84c63b2a/workspaces/:id/members/:userId", async (c) => {
  const workspaceId = c.req.param("id");
  const targetUserId = c.req.param("userId");
  const caller = await verifySchoolAdmin(c, workspaceId);
  if (!caller) {
    return c.json({ error: "Forbidden. School Admin/Owner only." }, 403);
  }

  if (caller.id === targetUserId) {
    return c.json({ error: "Anda tidak dapat mengeluarkan diri sendiri dari sekolah." }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { error: delErr } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", targetUserId);

    if (delErr) throw delErr;

    return c.json({ success: true, message: "Guru berhasil dikeluarkan dari sekolah." });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Helper untuk verifikasi User login biasa
async function verifyUser(c: any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

// 4. POST /workspaces/:id/invitations - Mengirim undangan gabung ke sekolah via email
app.post("/make-server-84c63b2a/workspaces/:id/invitations", async (c) => {
  const workspaceId = c.req.param("id");
  const caller = await verifySchoolAdmin(c, workspaceId);
  if (!caller) {
    return c.json({ error: "Forbidden. School Admin/Owner only." }, 403);
  }

  const { email, role } = await c.req.json();
  if (!email) {
    return c.json({ error: "Email wajib diisi." }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const targetEmail = email.trim().toLowerCase();

    // Check if user is already a member
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const targetUser = users.find((usr: any) => usr.email?.toLowerCase() === targetEmail);

    if (targetUser) {
      const { data: memberCheck } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", targetUser.id)
        .maybeSingle();

      if (memberCheck) {
        return c.json({ error: "User tersebut sudah bergabung di sekolah ini." }, 400);
      }
    }

    // Insert or update invitation
    const { error: inviteErr } = await supabase
      .from("workspace_invitations")
      .upsert({
        workspace_id: workspaceId,
        inviter_id: caller.id,
        invitee_email: targetEmail,
        role: role || "teacher",
        status: "pending",
        updated_at: new Date().toISOString()
      }, {
        onConflict: "workspace_id,invitee_email"
      });

    if (inviteErr) throw inviteErr;

    return c.json({ success: true, message: `Undangan berhasil dikirim ke ${targetEmail}.` });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 5. GET /workspaces/:id/invitations - Mengambil daftar seluruh undangan dari sekolah
app.get("/make-server-84c63b2a/workspaces/:id/invitations", async (c) => {
  const workspaceId = c.req.param("id");
  const caller = await verifySchoolAdmin(c, workspaceId);
  if (!caller) {
    return c.json({ error: "Forbidden. School Admin/Owner only." }, 403);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { data: invitations, error } = await supabase
      .from("workspace_invitations")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return c.json({ invitations: invitations ?? [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 6. DELETE /workspaces/:id/invitations/:invId - Membatalkan undangan sekolah
app.delete("/make-server-84c63b2a/workspaces/:id/invitations/:invId", async (c) => {
  const workspaceId = c.req.param("id");
  const invitationId = c.req.param("invId");
  const caller = await verifySchoolAdmin(c, workspaceId);
  if (!caller) {
    return c.json({ error: "Forbidden. School Admin/Owner only." }, 403);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { error } = await supabase
      .from("workspace_invitations")
      .delete()
      .eq("id", invitationId)
      .eq("workspace_id", workspaceId);

    if (error) throw error;

    return c.json({ success: true, message: "Undangan berhasil dibatalkan." });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 7. GET /users/me/invitations - Mendapatkan seluruh undangan pending untuk user yang login
app.get("/make-server-84c63b2a/users/me/invitations", async (c) => {
  const user = await verifyUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { data: invitations, error } = await supabase
      .from("workspace_invitations")
      .select("*, workspaces:workspace_id(id, name, type)")
      .eq("invitee_email", user.email?.toLowerCase())
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return c.json({ invitations: invitations ?? [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 8. POST /invitations/:id/accept - Menerima undangan sekolah
app.post("/make-server-84c63b2a/invitations/:id/accept", async (c) => {
  const user = await verifyUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const invitationId = c.req.param("id");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { data: invitation, error: getErr } = await supabase
      .from("workspace_invitations")
      .select("*")
      .eq("id", invitationId)
      .single();

    if (getErr || !invitation) {
      return c.json({ error: "Undangan tidak ditemukan." }, 404);
    }

    if (invitation.invitee_email.toLowerCase() !== user.email?.toLowerCase()) {
      return c.json({ error: "Anda tidak berwenang menerima undangan ini." }, 403);
    }

    if (invitation.status !== "pending") {
      return c.json({ error: "Undangan ini sudah tidak aktif." }, 400);
    }

    // Add user to workspace_members
    const { error: memberErr } = await supabase
      .from("workspace_members")
      .upsert({
        workspace_id: invitation.workspace_id,
        user_id: user.id,
        role: invitation.role || "teacher"
      });

    if (memberErr) throw memberErr;

    // Update status
    const { error: updateErr } = await supabase
      .from("workspace_invitations")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", invitationId);

    if (updateErr) throw updateErr;

    return c.json({ success: true, message: "Berhasil bergabung ke sekolah!" });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 9. POST /invitations/:id/decline - Menolak undangan sekolah
app.post("/make-server-84c63b2a/invitations/:id/decline", async (c) => {
  const user = await verifyUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const invitationId = c.req.param("id");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { data: invitation, error: getErr } = await supabase
      .from("workspace_invitations")
      .select("*")
      .eq("id", invitationId)
      .single();

    if (getErr || !invitation) {
      return c.json({ error: "Undangan tidak ditemukan." }, 404);
    }

    if (invitation.invitee_email.toLowerCase() !== user.email?.toLowerCase()) {
      return c.json({ error: "Anda tidak berwenang menolak undangan ini." }, 403);
    }

    const { error: updateErr } = await supabase
      .from("workspace_invitations")
      .update({ status: "declined", updated_at: new Date().toISOString() })
      .eq("id", invitationId);

    if (updateErr) throw updateErr;

    return c.json({ success: true, message: "Undangan ditolak." });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

Deno.serve((req) => {
  const url = new URL(req.url);
  if (url.pathname.startsWith("/functions/v1/server")) {
    url.pathname = url.pathname.replace(/^\/functions\/v1\/server/, "");
    req = new Request(url.toString(), req);
  } else if (url.pathname.startsWith("/server")) {
    url.pathname = url.pathname.replace(/^\/server/, "");
    req = new Request(url.toString(), req);
  }
  return app.fetch(req);
});
