import { useState, useEffect, useMemo } from "react";
import { Navigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  ShieldAlert,
  Coins,
  CreditCard,
  Search,
  Plus,
  Trash2,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  Database,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  X,
  School,
  Building,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { toast } from "sonner";
import { supabase } from "../../../utils/supabase/client";
import { ConfirmModal } from "../components/ui/ConfirmModal";

export default function SuperAdmin() {
  const { isSuperAdmin, loading: authLoading, session } = useAuth();
  const { activeWorkspaceId } = useWorkspace();

  // Tab State
  const [activeTab, setActiveTab] = useState<"users" | "ai_usage" | "ai_models">("users");

  // State Data Users
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // State Data AI Usage
  const [aiUsage, setAiUsage] = useState<any[]>([]);
  const [loadingUsage, setLoadingUsage] = useState(false);

  // Search & Filter Users
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all"); // all, active, inactive, drive-connected, drive-disconnected

  // Search & Filter AI Usage
  const [usageSearch, setUsageSearch] = useState("");
  const [usageModelFilter, setUsageModelFilter] = useState("all"); // all, gemini-flash, gemini-pro
  const [usageStatusFilter, setUsageStatusFilter] = useState("all"); // all, success, failed
  const [usageTypeFilter, setUsageTypeFilter] = useState("all"); // all, chat, etc.

  // Modal States
  const [selectedUserForToken, setSelectedUserForToken] = useState<any | null>(null);
  const [selectedWorkspaceForToken, setSelectedWorkspaceForToken] = useState<string>("");
  const [tokenAmountInput, setTokenAmountInput] = useState<number>(100);
  const [isTokenLoading, setIsTokenLoading] = useState(false);

  const [selectedUserForPromote, setSelectedUserForPromote] = useState<any | null>(null);
  const [schoolNameInput, setSchoolNameInput] = useState("");
  const [existingWorkspaceIdInput, setExistingWorkspaceIdInput] = useState("");
  const [promoteMode, setPromoteMode] = useState<"new" | "existing">("new");
  const [promoteRole, setPromoteRole] = useState<"member" | "admin" | "owner">("admin");
  const [isPromoteLoading, setIsPromoteLoading] = useState(false);
  const [confirmToggleUser, setConfirmToggleUser] = useState<any | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<any | null>(null);

  // State Data AI Models
  const [aiModels, setAiModels] = useState<any[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [isMigrated, setIsMigrated] = useState(true);

  // Modal State for AI Model Edit/Add
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<any | null>(null);
  const [modelForm, setModelForm] = useState({
    id: "",
    name: "",
    api_string: "",
    multiplier: 1,
    is_active: true,
    tier_restriction: [] as string[]
  });
  const [isSavingModel, setIsSavingModel] = useState(false);
  const [confirmDeleteModel, setConfirmDeleteModel] = useState<any | null>(null);

  // Helper Pemetaan Fitur ramah pengguna
  const getFriendlyTypeName = (type: string) => {
    switch (type) {
      case "chat": return "Asisten Chat Guru";
      case "student-comment": return "Komentar Rapor Murid";
      case "teacher-reflection": return "Jurnal Refleksi Guru";
      case "learning-analysis": return "AI Analisis Nilai & Hasil Belajar";
      case "assessment": return "Generator Soal & Asesmen";
      case "lkpd": return "Lembar Kerja Siswa (LKPD)";
      case "teaching-material": return "Bahan Ajar & Materi";
      case "educational-reviewer": return "Reviewer RPP/Dokumen";
      case "lesson-planner": return "Modul Ajar (RPP)";
      case "worksheet": return "LKPD / Worksheet";
      default: return type;
    }
  };

  // Helper Rupiah Formatter
  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(num);
  };

  // Fetch all users via Edge Function
  const fetchUsers = async () => {
    if (!session?.access_token) return;
    setLoadingUsers(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/admin/users`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal mengambil data user");
      setUsers(data.users || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal memuat daftar user.");
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch AI Usage Logs
  const fetchAIUsage = async () => {
    if (!session?.access_token) return;
    setLoadingUsage(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/admin/ai-usage`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal mengambil data penggunaan AI");
      setAiUsage(data.usage || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal memuat log penggunaan AI.");
    } finally {
      setLoadingUsage(false);
    }
  };



  // Toggle user active/inactive status
  const handleToggleStatus = async (user: any) => {
    if (!session?.access_token) return;
    const newStatus = !user.is_active;

    toast.loading("Memperbarui status user...");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/admin/users/${user.id}/toggle-status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ is_active: newStatus }),
        }
      );

      const data = await response.json();
      toast.dismiss();
      if (!response.ok) throw new Error(data.error || "Gagal memperbarui status");

      toast.success(`Akun ${user.email} berhasil ${newStatus ? "diaktifkan" : "dinonaktifkan"}.`);
      fetchUsers();
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Terjadi kesalahan.");
    }
  };

  // Delete user permanently
  const handleDeleteUser = async (user: any) => {
    if (!session?.access_token) return;

    toast.loading("Menghapus user...");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/admin/users/${user.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();
      toast.dismiss();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus user");

      toast.success(`User ${user.email} berhasil dihapus secara permanen.`);
      fetchUsers();
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Terjadi kesalahan.");
    }
  };

  // Manual token addition
  const handleAddTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token || !selectedUserForToken || !selectedWorkspaceForToken) return;

    setIsTokenLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/admin/users/${selectedUserForToken.id}/add-tokens`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            workspaceId: selectedWorkspaceForToken,
            amount: tokenAmountInput,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menambahkan token");

      toast.success(`Berhasil menambahkan ${tokenAmountInput} token.`);
      setSelectedUserForToken(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan.");
    } finally {
      setIsTokenLoading(false);
    }
  };

  // Promoting user to School Admin (Direct confirmation)
  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token || !selectedUserForPromote) return;

    const targetWorkspaceName = (selectedUserForPromote.school || schoolNameInput).trim();

    if (!targetWorkspaceName) {
      toast.error("Nama Sekolah wajib diisi.");
      return;
    }

    setIsPromoteLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/admin/users/${selectedUserForPromote.id}/update-role`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "assign_school_admin",
            workspaceId: "", // Always create new school workspace
            workspaceName: targetWorkspaceName,
            memberRole: "admin", // Default role as admin
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal mempromosikan user");

      toast.success(`Berhasil mempromosikan user sebagai Admin Sekolah untuk ${targetWorkspaceName}.`);
      setSelectedUserForPromote(null);
      setSchoolNameInput("");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan.");
    } finally {
      setIsPromoteLoading(false);
    }
  };

  // Fetch AI Models List
  const fetchAIModels = async () => {
    if (!session?.access_token) return;
    setLoadingModels(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/admin/ai-models`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.status === 404) {
        setIsMigrated(false);
        setAiModels([]);
        return;
      }

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error(`Server merespon dengan status ${response.status} (bukan format JSON)`);
      }

      if (!response.ok) throw new Error(data.error || "Gagal mengambil data model AI");
      setAiModels(data.models || []);
      setIsMigrated(data.is_migrated !== false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal memuat daftar model AI.");
    } finally {
      setLoadingModels(false);
    }
  };

  // Simpan Model AI (Add/Edit)
  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    setIsSavingModel(true);
    try {
      const url = selectedModel
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/admin/ai-models/${selectedModel.id}`
        : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/admin/ai-models`;

      const method = selectedModel ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(modelForm),
      });

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error(`Server merespon dengan status ${response.status}`);
      }

      if (!response.ok) throw new Error(data.error || "Gagal menyimpan model");

      toast.success(selectedModel ? "Model AI berhasil diperbarui" : "Model AI baru berhasil ditambahkan");
      setIsModelModalOpen(false);
      fetchAIModels();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal menyimpan model AI.");
    } finally {
      setIsSavingModel(false);
    }
  };

  // Toggle Aktif/Nonaktif Model
  const handleToggleModelStatus = async (model: any) => {
    if (!session?.access_token) return;
    const newStatus = !model.is_active;

    toast.loading("Memperbarui status model...");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/admin/ai-models/${model.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ is_active: newStatus }),
        }
      );

      let data;
      try {
        data = await response.json();
      } catch {
        toast.dismiss();
        throw new Error(`Server merespon dengan status ${response.status}`);
      }

      toast.dismiss();
      if (!response.ok) throw new Error(data.error || "Gagal memperbarui status model");

      toast.success(`Model ${model.name} berhasil ${newStatus ? "diaktifkan" : "dinonaktifkan"}`);
      fetchAIModels();
    } catch (err: any) {
      toast.dismiss();
      console.error(err);
      toast.error(err.message || "Gagal memperbarui status.");
    }
  };

  // Hapus Model AI
  const handleDeleteModel = async (modelId: string) => {
    if (!session?.access_token) return;

    toast.loading("Menghapus model AI...");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/admin/ai-models/${modelId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      let data;
      try {
        data = await response.json();
      } catch {
        toast.dismiss();
        throw new Error(`Server merespon dengan status ${response.status}`);
      }

      toast.dismiss();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus model");

      toast.success("Model AI berhasil dihapus secara permanen.");
      fetchAIModels();
    } catch (err: any) {
      toast.dismiss();
      console.error(err);
      toast.error(err.message || "Gagal menghapus model AI.");
    }
  };

  useEffect(() => {
    if (isSuperAdmin && session) {
      fetchUsers();
    }
  }, [isSuperAdmin, session]);

  useEffect(() => {
    if (activeTab === "ai_usage" && isSuperAdmin && session) {
      fetchAIUsage();
    } else if (activeTab === "ai_models" && isSuperAdmin && session) {
      fetchAIModels();
    }
  }, [activeTab, isSuperAdmin, session]);

  // Statistics calculation for AI usage
  const stats = useMemo(() => {
    const successLogs = aiUsage.filter(u => u.status === "success");
    const totalCost = successLogs.reduce((acc, u) => acc + (u.estimated_cost_idr || 0), 0);
    const totalCredits = successLogs.reduce((acc, u) => acc + (u.credit_cost || 0), 0);
    const totalTokens = successLogs.reduce((acc, u) => acc + (u.total_tokens || 0), 0);
    const successCount = successLogs.length;
    const failedCount = aiUsage.filter(u => u.status === "failed").length;

    return {
      totalCost,
      totalCredits,
      totalTokens,
      successCount,
      failedCount
    };
  }, [aiUsage]);

  // Filtering AI Usage Logs
  const filteredUsage = useMemo(() => {
    return aiUsage.filter((u) => {
      const matchesSearch =
        (u.user_email?.toLowerCase() || "").includes(usageSearch.toLowerCase()) ||
        (u.user_name?.toLowerCase() || "").includes(usageSearch.toLowerCase()) ||
        (u.workspace_name?.toLowerCase() || "").includes(usageSearch.toLowerCase()) ||
        (getFriendlyTypeName(u.type).toLowerCase() || "").includes(usageSearch.toLowerCase());

      if (!matchesSearch) return false;

      if (usageModelFilter !== "all") {
        const matchPro = usageModelFilter === "gemini-pro";
        const uPro = u.model.includes("pro") || u.model.includes("2.5-pro");
        if (matchPro !== uPro) return false;
      }

      if (usageStatusFilter !== "all") {
        if (u.status !== usageStatusFilter) return false;
      }

      if (usageTypeFilter !== "all") {
        if (u.type !== usageTypeFilter) return false;
      }

      return true;
    });
  }, [aiUsage, usageSearch, usageModelFilter, usageStatusFilter, usageTypeFilter]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-[#F0EAC6] border-t-[#3C405B] rounded-full animate-spin"></div>
      </div>
    );
  }

  // Guarding
  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Filtering users
  const filteredUsers = users.filter((u) => {
    // Exclude Super Admin from the list
    if (u.email?.toLowerCase() === "mckuadratid@gmail.com" || u.role === "superadmin") return false;

    const matchesSearch =
      (u.email?.toLowerCase() || "").includes(userSearch.toLowerCase()) ||
      (u.name?.toLowerCase() || "").includes(userSearch.toLowerCase()) ||
      (u.school?.toLowerCase() || "").includes(userSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (userFilter === "active") return u.is_active;
    if (userFilter === "inactive") return !u.is_active;
    if (userFilter === "drive-connected") return !!u.google_spreadsheet_id;
    if (userFilter === "drive-disconnected") return !u.google_spreadsheet_id;

    return true;
  });

  // Flatten users workspaces into individual table rows
  const tableRows = filteredUsers.flatMap((u: any) => {
    if (!u.workspaces || u.workspaces.length === 0) {
      return [
        {
          key: `${u.id}-none`,
          user: u,
          workspace_id: "",
          workspace_name: "",
          workspace_type: "",
          workspace_role: "",
          balance: 0,
          is_first: true,
        },
      ];
    }
    return u.workspaces.map((w: any, idx: number) => ({
      key: `${u.id}-${w.workspace_id || idx}`,
      user: u,
      workspace_id: w.workspace_id,
      workspace_name: w.name,
      workspace_type: w.type,
      workspace_role: w.role,
      balance: w.balance,
      is_first: idx === 0,
    }));
  });

  return (
    <div className="w-full p-8 space-y-6 max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-[#DF7A5E]" />
            Konsol Super Admin
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Portal kontrol pemilik aplikasi Kurikula untuk memantau semua user.
          </p>
        </div>
        <div className="flex gap-3 self-start md:self-auto">
          <button
            onClick={() => {
              if (activeTab === "users") {
                fetchUsers();
              } else if (activeTab === "ai_usage") {
                fetchAIUsage();
              } else {
                fetchAIModels();
              }
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#3C405B] hover:bg-[#3C405B]/90 text-white rounded-[12px] text-sm font-semibold transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Segarkan Data
          </button>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-[12px] text-sm font-semibold transition-colors shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 flex-shrink-0">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "users"
              ? "border-[#DF7A5E] text-[#DF7A5E]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Kelola Pengguna
        </button>
        <button
          onClick={() => setActiveTab("ai_usage")}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "ai_usage"
              ? "border-[#DF7A5E] text-[#DF7A5E]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Penggunaan AI & Biaya Gemini
        </button>
        <button
          onClick={() => setActiveTab("ai_models")}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "ai_models"
              ? "border-[#DF7A5E] text-[#DF7A5E]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Pengaturan Model AI
        </button>
      </div>

      {activeTab === "users" && (
        <>
          {/* Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-[16px] border border-slate-200 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari user berdasarkan nama, email, sekolah..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-[12px] text-sm focus:outline-none focus:ring-2 focus:ring-[#DF7A5E]/20 bg-slate-55 text-slate-800 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Filter Status:</label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="border border-slate-200 rounded-[12px] px-3 py-2 text-sm bg-white font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">Semua Akun</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif (Banned)</option>
              <option value="drive-connected">Google Drive Connected</option>
              <option value="drive-disconnected">Google Drive Disconnected</option>
            </select>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm overflow-hidden">
          {loadingUsers ? (
            <div className="flex items-center justify-center p-20">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
            </div>
          ) : tableRows.length === 0 ? (
            <div className="p-16 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium text-sm">Tidak ada pengguna yang cocok dengan kriteria pencarian.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-55 border-b border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Profil User</th>
                    <th className="px-6 py-4">Sekolah</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Token</th>
                    <th className="px-6 py-4">Google Drive</th>
                    <th className="px-6 py-4">Status Akun</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {tableRows.map((row) => {
                    const u = row.user;
                    return (
                      <tr key={row.key} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-[#3C405B]">
                              {u.name ? u.name.substring(0, 2).toUpperCase() : "U"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate">{u.name}</p>
                              <p className="text-xs text-slate-400 truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {row.workspace_type === "school" ? (
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-slate-800 truncate max-w-[200px]" title={row.workspace_name}>
                                {row.workspace_name}
                              </span>
                              <span 
                                onClick={() => {
                                  navigator.clipboard.writeText(row.workspace_id);
                                  toast.success("ID Workspace berhasil disalin!");
                                }}
                                className="text-xs font-mono text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors w-max"
                                title={`Klik untuk menyalin Workspace ID: ${row.workspace_id}`}
                              >
                                ID: {row.workspace_id.substring(0, 8)}...
                              </span>
                            </div>
                          ) : (
                            <span className="font-medium text-slate-600">
                              {u.school || "-"}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {row.workspace_type === "school" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100">
                              School
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-100">
                              Personal
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {row.workspace_role === "owner" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                              Owner
                            </span>
                          ) : row.workspace_role === "admin" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                              Admin
                            </span>
                          ) : row.workspace_role === "principal" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100">
                              Principal
                            </span>
                          ) : row.workspace_role === "teacher" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Teacher
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 capitalize">
                              {row.workspace_role || "-"}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-[#DF7A5E] bg-orange-50 px-2 py-0.5 rounded text-xs border border-orange-100">
                            {row.balance.toLocaleString("id-ID")} Tkn
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {u.google_spreadsheet_id ? (
                            <a
                              href={`https://docs.google.com/spreadsheets/d/${u.google_spreadsheet_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 hover:bg-emerald-100 transition-colors"
                              title={`Buka Google Spreadsheet\nID: ${u.google_spreadsheet_id}`}
                            >
                              Terhubung
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 text-xs font-semibold border border-slate-200">
                              Belum Terhubung
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {u.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
                              Nonaktif (Banned)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Add Token */}
                            {row.workspace_id && (
                              <button
                                onClick={() => {
                                  setSelectedUserForToken(u);
                                  setSelectedWorkspaceForToken(row.workspace_id);
                                }}
                                className="p-2 text-[#3C405B] hover:bg-[#3C405B]/10 rounded-[8px] transition-colors"
                                title="Tambah Token Manual"
                              >
                                <Coins className="w-4 h-4" />
                              </button>
                            )}

                            {row.is_first && (
                              <>
                                {/* Promote to School Admin */}
                                <button
                                  onClick={() => {
                                    setSelectedUserForPromote(u);
                                    setSchoolNameInput(u.school || "");
                                  }}
                                  className="p-2 text-purple-700 hover:bg-purple-100/60 rounded-[8px] transition-colors"
                                  title="Jadikan Admin Sekolah"
                                >
                                  <School className="w-4 h-4" />
                                </button>

                                {/* Lock / Unlock Status */}
                                <button
                                  onClick={() => setConfirmToggleUser(u)}
                                  className={`p-2 rounded-[8px] transition-colors ${
                                    u.is_active 
                                      ? "text-orange-600 hover:bg-orange-100/60" 
                                      : "text-blue-600 hover:bg-blue-100/60"
                                  }`}
                                  title={u.is_active ? "Nonaktifkan Akun" : "Aktifkan Akun"}
                                >
                                  {u.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                </button>

                                {/* Delete Account */}
                                <button
                                  onClick={() => setConfirmDeleteUser(u)}
                                  className="p-2 text-red-600 hover:bg-red-100/60 rounded-[8px] transition-colors"
                                  title="Hapus User Permanen"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
      )}

      {activeTab === "ai_usage" && (
        <div className="space-y-6">
          {/* AI Usage Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Real Gemini cost */}
            <div className="bg-white p-5 rounded-[16px] border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-red-50 rounded-xl text-red-600">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Biaya Real Gemini</span>
                <span className="text-xl font-black text-slate-800">{formatRupiah(stats.totalCost)}</span>
              </div>
            </div>

            {/* Application Credits spent */}
            <div className="bg-white p-5 rounded-[16px] border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-orange-50 rounded-xl text-[#DF7A5E]">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Kredit Terpakai</span>
                <span className="text-xl font-black text-slate-800">{stats.totalCredits.toLocaleString("id-ID")} Kredit</span>
              </div>
            </div>

            {/* Gemini Tokens consumed */}
            <div className="bg-white p-5 rounded-[16px] border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Token Gemini</span>
                <span className="text-xl font-black text-slate-800">{stats.totalTokens.toLocaleString("id-ID")} Tok</span>
              </div>
            </div>

            {/* Request Summary count */}
            <div className="bg-white p-5 rounded-[16px] border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total AI Request</span>
                <span className="text-xl font-black text-slate-800">{stats.successCount} <span className="text-xs text-green-600 font-bold">({stats.successCount} Sukses)</span> / {stats.failedCount} <span className="text-xs text-red-500 font-bold">({stats.failedCount} Gagal)</span></span>
              </div>
            </div>
          </div>

          {/* AI Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-[16px] border border-slate-200 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari log berdasarkan nama, email, workspace, fitur..."
                value={usageSearch}
                onChange={(e) => setUsageSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-[12px] text-sm focus:outline-none focus:ring-2 focus:ring-[#DF7A5E]/20 bg-slate-55 text-slate-800 font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Model:</label>
                <select
                  value={usageModelFilter}
                  onChange={(e) => setUsageModelFilter(e.target.value)}
                  className="border border-slate-200 rounded-[12px] px-3 py-2 text-sm bg-white font-medium text-slate-700 focus:outline-none"
                >
                  <option value="all">Semua Model</option>
                  <option value="gemini-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-pro">Gemini 2.5 Pro</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Status:</label>
                <select
                  value={usageStatusFilter}
                  onChange={(e) => setUsageStatusFilter(e.target.value)}
                  className="border border-slate-200 rounded-[12px] px-3 py-2 text-sm bg-white font-medium text-slate-700 focus:outline-none"
                >
                  <option value="all">Semua Status</option>
                  <option value="success">Sukses</option>
                  <option value="failed">Gagal</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Fitur:</label>
                <select
                  value={usageTypeFilter}
                  onChange={(e) => setUsageTypeFilter(e.target.value)}
                  className="border border-slate-200 rounded-[12px] px-3 py-2 text-sm bg-white font-medium text-slate-700 focus:outline-none"
                >
                  <option value="all">Semua Fitur</option>
                  <option value="chat">Asisten Chat Guru</option>
                  <option value="lesson-planner">Modul Ajar (RPP)</option>
                  <option value="teaching-material">Bahan Ajar & Materi</option>
                  <option value="lkpd">Lembar Kerja Siswa (LKPD)</option>
                  <option value="assessment">Generator Soal & Asesmen</option>
                  <option value="learning-analysis">AI Analisis Nilai</option>
                  <option value="student-comment">Komentar Rapor Murid</option>
                  <option value="teacher-reflection">Jurnal Refleksi Guru</option>
                  <option value="educational-reviewer">Reviewer RPP/Dokumen</option>
                </select>
              </div>
            </div>
          </div>

          {/* AI Usage Table */}
          <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm overflow-hidden font-medium text-slate-700">
            {loadingUsage ? (
              <div className="flex items-center justify-center p-20">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
              </div>
            ) : filteredUsage.length === 0 ? (
              <div className="p-16 text-center">
                <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium text-sm">Tidak ada log penggunaan AI yang sesuai kriteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-55 border-b border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Pengguna</th>
                      <th className="px-6 py-4">Workspace</th>
                      <th className="px-6 py-4">Fitur AI</th>
                      <th className="px-6 py-4">Model AI</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Kredit App</th>
                      <th className="px-6 py-4 text-right">Gemini Tokens (In / Out / Tot)</th>
                      <th className="px-6 py-4 text-right">Biaya Gemini (Rupiah)</th>
                      <th className="px-6 py-4 text-right font-semibold">Waktu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredUsage.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-slate-800">{u.user_name}</p>
                            <p className="text-xs text-slate-400">{u.user_email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-600">{u.workspace_name}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{getFriendlyTypeName(u.type)}</td>
                        <td className="px-6 py-4">
                          {u.model.includes("pro") ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100">
                              Gemini Pro
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                              Gemini Flash
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {u.status === "success" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                              Sukses
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                              Gagal
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-800">
                          {u.credit_cost > 0 ? `${u.credit_cost} Tkn` : "-"}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-xs text-slate-500">
                          {u.total_tokens > 0 ? (
                            <div>
                              <span>{u.prompt_tokens.toLocaleString("id-ID")}</span>
                              <span className="mx-1 text-slate-300">/</span>
                              <span>{u.completion_tokens.toLocaleString("id-ID")}</span>
                              <span className="mx-1 text-slate-300">/</span>
                              <span className="font-bold text-slate-700">{u.total_tokens.toLocaleString("id-ID")}</span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-red-600">
                          {u.estimated_cost_idr > 0 ? formatRupiah(u.estimated_cost_idr) : "-"}
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-slate-400 font-medium">
                          {new Date(u.created_at).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "ai_models" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  Daftar Model AI
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Kelola model Google Gemini yang tersedia untuk digunakan oleh asisten guru di Kurikula.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedModel(null);
                  setModelForm({
                    id: "",
                    name: "",
                    api_string: "",
                    multiplier: 1,
                    is_active: true,
                    tier_restriction: ["basic", "pro", "premium", "school", "trial"]
                  });
                  setIsModelModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[12px] text-xs font-bold transition-all shadow-sm cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Tambah Model Baru
              </button>
            </div>

            {!isMigrated && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-[16px] text-amber-900 text-xs leading-relaxed">
                <strong>⚠️ Migrasi Database Diperlukan:</strong> Tabel <code>ai_models</code> belum terdeteksi di database. Jajaran model yang tampil di bawah merupakan fallback default bawaan aplikasi. Pastikan Anda telah menjalankan file migrasi SQL <code>20260702020000_create_ai_models.sql</code> di database Supabase Anda agar pengaturan ini dapat disimpan secara permanen.
              </div>
            )}

            {loadingModels ? (
              <div className="flex items-center justify-center py-12 text-slate-400 text-xs gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                Memuat konfigurasi model...
              </div>
            ) : aiModels.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs italic">
                Belum ada model AI terdaftar di database.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[16px] border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">ID Model / Slug</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Tampilan</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">API String (Google)</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Multiplier Kredit</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Batasan Tier Paket</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white text-xs text-slate-700">
                    {aiModels.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">{m.id}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{m.name}</td>
                        <td className="px-6 py-4 font-mono text-slate-500">{m.api_string}</td>
                        <td className="px-6 py-4 text-center font-black text-slate-800">{m.multiplier}x</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {m.tier_restriction.map((t: string) => (
                              <span key={t} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-extrabold uppercase text-[9px] tracking-tight border border-slate-200">
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleToggleModelStatus(m)}
                            disabled={!isMigrated}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer disabled:opacity-50 ${
                              m.is_active
                                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                            }`}
                          >
                            {m.is_active ? "Aktif" : "Nonaktif"}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedModel(m);
                                setModelForm({
                                  id: m.id,
                                  name: m.name,
                                  api_string: m.api_string,
                                  multiplier: m.multiplier,
                                  is_active: m.is_active,
                                  tier_restriction: [...m.tier_restriction]
                                });
                                setIsModelModalOpen(true);
                              }}
                              disabled={!isMigrated}
                              className="px-2.5 py-1.5 border border-slate-200 rounded-[8px] hover:bg-slate-50 font-bold transition-all text-slate-600 cursor-pointer disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setConfirmDeleteModel(m)}
                              disabled={!isMigrated}
                              className="px-2.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-[8px] font-bold transition-all cursor-pointer disabled:opacity-50"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD TOKENS */}
      <AnimatePresence>
        {selectedUserForToken && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[24px] border border-slate-200 shadow-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-orange-500" />
                  Tambah Token Manual
                </h3>
                <button
                  onClick={() => setSelectedUserForToken(null)}
                  className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddTokens} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Penerima</label>
                  <input
                    type="text"
                    disabled
                    value={`${selectedUserForToken.name} (${selectedUserForToken.email})`}
                    className="w-full px-4 py-2 bg-slate-55 border border-slate-200 rounded-[12px] text-slate-500 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pilih Workspace</label>
                  <select
                    value={selectedWorkspaceForToken}
                    onChange={(e) => setSelectedWorkspaceForToken(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-[12px] text-slate-700 text-sm font-semibold bg-white"
                  >
                    {selectedUserForToken.workspaces?.map((w: any) => (
                      <option key={w.workspace_id} value={w.workspace_id}>
                        {w.name} ({w.type === "school" ? "Sekolah" : "Personal"}) - Saldo: {w.balance}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Jumlah Token</label>
                  <input
                    type="number"
                    min="1"
                    value={tokenAmountInput}
                    onChange={(e) => setTokenAmountInput(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-[12px] text-slate-800 text-sm font-bold bg-slate-50 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isTokenLoading}
                    className="flex-1 py-3 bg-[#DF7A5E] hover:bg-[#DF7A5E]/90 text-white rounded-[12px] text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {isTokenLoading ? "Memproses..." : "Tambahkan Token"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUserForToken(null)}
                    className="px-5 py-3 border border-slate-200 rounded-[12px] text-sm font-semibold hover:bg-slate-50 text-slate-600"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: PROMOTE TO SCHOOL ADMIN */}
      <AnimatePresence>
        {selectedUserForPromote && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[24px] border border-slate-200 shadow-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <School className="w-5 h-5 text-purple-600" />
                  Konfirmasi Promosi Admin Sekolah
                </h3>
                <button
                  onClick={() => setSelectedUserForPromote(null)}
                  className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handlePromote} className="space-y-4">
                <div className="text-slate-600 text-sm leading-relaxed space-y-3">
                  <p>
                    Apakah Anda yakin ingin mempromosikan <strong>{selectedUserForPromote.name}</strong> (<strong>{selectedUserForPromote.email}</strong>) sebagai Admin Sekolah?
                  </p>
                  
                  {selectedUserForPromote.school ? (
                    <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-[12px] text-purple-900">
                      <span className="text-xs font-bold text-purple-500 uppercase tracking-wider block mb-0.5">Nama Sekolah (Profil User)</span>
                      <strong className="text-base">{selectedUserForPromote.school}</strong>
                      <p className="text-xs text-purple-600 mt-1">Sistem akan otomatis membuat workspace dengan nama sekolah ini.</p>
                    </div>
                  ) : (
                    <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-[12px]">
                      <span className="text-xs font-bold text-orange-600 uppercase tracking-wider block mb-2">Nama Sekolah Kosong di Profil</span>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Harap masukkan nama sekolah secara manual:</label>
                      <input
                        type="text"
                        placeholder="Contoh: SMA Negeri 1 Jakarta"
                        value={schoolNameInput}
                        onChange={(e) => setSchoolNameInput(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-[12px] text-slate-800 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isPromoteLoading}
                    className="flex-1 py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-[12px] text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {isPromoteLoading ? "Memproses..." : "Ya, Promosikan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUserForPromote(null)}
                    className="px-5 py-3 border border-slate-200 rounded-[12px] text-sm font-semibold hover:bg-slate-50 text-slate-600"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={confirmToggleUser !== null}
        title={confirmToggleUser && !confirmToggleUser.is_active ? "Aktifkan Akun" : "Nonaktifkan Akun"}
        message={
          confirmToggleUser 
            ? confirmToggleUser.is_active 
              ? `Apakah Anda yakin ingin menonaktifkan akun ${confirmToggleUser.email}? User tidak akan bisa login ke aplikasi.`
              : `Apakah Anda yakin ingin mengaktifkan kembali akun ${confirmToggleUser.email}?`
            : ""
        }
        onConfirm={() => {
          if (confirmToggleUser) {
            handleToggleStatus(confirmToggleUser);
            setConfirmToggleUser(null);
          }
        }}
        onCancel={() => setConfirmToggleUser(null)}
      />

      <ConfirmModal
        isOpen={confirmDeleteUser !== null}
        title="Hapus Akun Permanen"
        message={confirmDeleteUser ? `Peringatan Kritis! Apakah Anda yakin ingin menghapus user ${confirmDeleteUser.email} secara PERMANEN? Aksi ini tidak dapat dibatalkan.` : ""}
        onConfirm={() => {
          if (confirmDeleteUser) {
            handleDeleteUser(confirmDeleteUser);
            setConfirmDeleteUser(null);
          }
        }}
        onCancel={() => setConfirmDeleteUser(null)}
      />

      {/* MODAL 3: ADD/EDIT AI MODEL */}
      <AnimatePresence>
        {isModelModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[24px] border border-slate-200 shadow-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  {selectedModel ? "Edit Model AI" : "Tambah Model AI Baru"}
                </h3>
                <button
                  onClick={() => setIsModelModalOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-full text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveModel} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ID Model / Slug</label>
                  <input
                    type="text"
                    disabled={!!selectedModel}
                    placeholder="Contoh: gemini-3.5-flash"
                    value={modelForm.id}
                    onChange={(e) => setModelForm(prev => ({ ...prev, id: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-[12px] text-slate-800 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-400"
                    required
                  />
                  {!selectedModel && <span className="text-[10px] text-slate-400 mt-1 block">ID model ini harus unik dan hanya berupa huruf kecil/strip (e.g. gemini-3.5-flash)</span>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Tampilan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Gemini 3.5 Flash"
                    value={modelForm.name}
                    onChange={(e) => setModelForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-[12px] text-slate-800 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">API String (Google AI)</label>
                  <input
                    type="text"
                    placeholder="Contoh: gemini-3.5-flash"
                    value={modelForm.api_string}
                    onChange={(e) => setModelForm(prev => ({ ...prev, api_string: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-[12px] text-slate-800 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">String model resmi yang dikirim ke Google API</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Multiplier Kredit</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Contoh: 1.5"
                    value={modelForm.multiplier}
                    onChange={(e) => setModelForm(prev => ({ ...prev, multiplier: Number(e.target.value) || 1 }))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-[12px] text-slate-800 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Multiplier biaya kredit fitur (e.g. 1.5x, 2x)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Batasan Tier Paket</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["trial", "basic", "pro", "premium", "school"].map((tier) => {
                      const isChecked = modelForm.tier_restriction.includes(tier);
                      return (
                        <label key={tier} className="flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-[8px] cursor-pointer hover:bg-slate-100 transition-all">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setModelForm(prev => ({ ...prev, tier_restriction: [...prev.tier_restriction, tier] }));
                              } else {
                                setModelForm(prev => ({ ...prev, tier_restriction: prev.tier_restriction.filter(t => t !== tier) }));
                              }
                            }}
                            className="cursor-pointer"
                          />
                          <span className="text-xs uppercase font-extrabold text-slate-700 tracking-tight">{tier}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="model_is_active"
                    checked={modelForm.is_active}
                    onChange={(e) => setModelForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="cursor-pointer"
                  />
                  <label htmlFor="model_is_active" className="text-xs font-bold text-slate-650 cursor-pointer select-none">
                    Aktifkan Model AI ini langsung untuk pengguna
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSavingModel}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[12px] text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
                  >
                    {isSavingModel ? "Menyimpan..." : "Simpan Konfigurasi"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModelModalOpen(false)}
                    className="px-5 py-3 border border-slate-200 rounded-[12px] text-sm font-semibold hover:bg-slate-50 text-slate-600 cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={confirmDeleteModel !== null}
        title="Hapus Model AI"
        message={confirmDeleteModel ? `Apakah Anda yakin ingin menghapus model AI ${confirmDeleteModel.name} (${confirmDeleteModel.id})? Pengguna tidak akan bisa menggunakan model ini lagi.` : ""}
        onConfirm={() => {
          if (confirmDeleteModel) {
            handleDeleteModel(confirmDeleteModel.id);
            setConfirmDeleteModel(null);
          }
        }}
        onCancel={() => setConfirmDeleteModel(null)}
      />
    </div>
  );
}
