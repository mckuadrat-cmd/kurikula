import { useState, useEffect } from "react";
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

  // State Data
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Search & Filter
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all"); // all, active, inactive, drive-connected, drive-disconnected

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

  useEffect(() => {
    if (isSuperAdmin && session) {
      fetchUsers();
    }
  }, [isSuperAdmin, session]);

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
  const tableRows = filteredUsers.flatMap((u) => {
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
              fetchUsers();
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

      <div className="space-y-4">
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
      </div>

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
    </div>
  );
}
