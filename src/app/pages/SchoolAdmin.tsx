import { useState, useEffect } from "react";
import { Navigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  School,
  Search,
  UserPlus,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  X,
  Mail,
  Building,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { toast } from "sonner";
import { ConfirmModal } from "../components/ui/ConfirmModal";

export default function SchoolAdmin() {
  const { session, loading: authLoading } = useAuth();
  const { workspaces, activeWorkspaceId } = useWorkspace();

  // Find active workspace & check role
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const isSchoolAdmin = activeWorkspace?.type === "school" && (activeWorkspace?.role === "owner" || activeWorkspace?.role === "admin");

  // State
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Add Teacher Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Workspace Invitations State
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [confirmCancelInvite, setConfirmCancelInvite] = useState<{ id: string; email: string } | null>(null);
  const [confirmRemoveTeacher, setConfirmRemoveTeacher] = useState<any | null>(null);

  // Fetch school members
  const fetchMembers = async () => {
    if (!session?.access_token || !activeWorkspaceId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/workspaces/${activeWorkspaceId}/members`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal mengambil daftar guru");
      setTeachers(data.members || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal memuat data anggota sekolah.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch school invitations
  const fetchInvitations = async () => {
    if (!session?.access_token || !activeWorkspaceId) return;
    setLoadingInvitations(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/workspaces/${activeWorkspaceId}/invitations`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal mengambil daftar undangan");
      setInvitations(data.invitations || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const handleRefreshAll = () => {
    fetchMembers();
    fetchInvitations();
  };

  // Add teacher to school via invitation
  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token || !activeWorkspaceId || !newTeacherEmail.trim()) return;

    setIsAdding(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/workspaces/${activeWorkspaceId}/invitations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ email: newTeacherEmail.trim(), role: "teacher" }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal mengirim undangan");

      toast.success(data.message || "Undangan berhasil dikirim.");
      setIsAddModalOpen(false);
      setNewTeacherEmail("");
      fetchInvitations();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan.");
    } finally {
      setIsAdding(false);
    }
  };

  // Cancel invitation
  const handleCancelInvitation = async (invId: string, email: string) => {
    if (!session?.access_token || !activeWorkspaceId) return;

    toast.loading("Membatalkan undangan...");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/workspaces/${activeWorkspaceId}/invitations/${invId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();
      toast.dismiss();
      if (!response.ok) throw new Error(data.error || "Gagal membatalkan undangan");

      toast.success("Undangan berhasil dibatalkan.");
      fetchInvitations();
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Terjadi kesalahan.");
    }
  };

  // Remove teacher from school
  const handleRemoveTeacher = async (teacher: any) => {
    if (!session?.access_token || !activeWorkspaceId) return;

    toast.loading("Mengeluarkan guru...");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/workspaces/${activeWorkspaceId}/members/${teacher.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();
      toast.dismiss();
      if (!response.ok) throw new Error(data.error || "Gagal mengeluarkan guru");

      toast.success("Guru berhasil dikeluarkan dari sekolah.");
      fetchMembers();
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Terjadi kesalahan.");
    }
  };

  useEffect(() => {
    if (isSchoolAdmin && session) {
      fetchMembers();
      fetchInvitations();
    }
  }, [isSchoolAdmin, activeWorkspaceId, session]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-[#F0EAC6] border-t-[#3C405B] rounded-full animate-spin"></div>
      </div>
    );
  }

  // Guarding
  if (!isSchoolAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Filter teachers
  const filteredTeachers = teachers.filter((t) => {
    return (
      (t.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (t.name?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="w-full p-8 space-y-6 max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
            <School className="w-8 h-8 text-purple-600" />
            Dashboard Admin Sekolah
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Sekolah: <span className="font-bold text-slate-800">{activeWorkspace?.name}</span> • ID Workspace:{" "}
            <span 
              onClick={() => {
                if (activeWorkspaceId) {
                  navigator.clipboard.writeText(activeWorkspaceId);
                  toast.success("ID Workspace berhasil disalin!");
                }
              }}
              className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded cursor-pointer hover:bg-slate-200 transition-colors"
              title="Klik untuk menyalin ID Workspace"
            >
              {activeWorkspaceId}
            </span>
          </p>
        </div>

        <div className="flex gap-2 self-start md:self-auto">
          <button
            onClick={handleRefreshAll}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-[12px] text-slate-600 transition-colors"
            title="Segarkan data guru"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-[12px] text-sm font-semibold transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Tambah Guru
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-[20px] p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Guru</p>
            <p className="text-2xl font-black text-slate-800">{teachers.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Guru terdaftar di sekolah ini</p>
          </div>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Peran Anda</p>
            <p className="text-lg font-bold text-slate-800 capitalize">{activeWorkspace?.role}</p>
            <p className="text-xs text-slate-500 mt-0.5">Memiliki akses penuh manajemen guru</p>
          </div>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tipe Workspace</p>
            <p className="text-lg font-bold text-slate-800">Sekolah Institusi</p>
            <p className="text-xs text-slate-500 mt-0.5">Layanan kolaboratif terintegrasi</p>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-[16px] border border-slate-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari guru berdasarkan nama atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-[12px] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-slate-50 text-slate-800 font-medium"
          />
        </div>
      </div>

      {/* Teachers List Table */}
      <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-20">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium text-sm">Tidak ada guru yang terdaftar di sekolah ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-55 border-b border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Nama Lengkap</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Peran di Sekolah</th>
                  <th className="px-6 py-4">Tanggal Bergabung</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredTeachers.map((t) => {
                  const isSelf = t.id === session?.user?.id;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                            {t.name ? t.name.substring(0, 2).toUpperCase() : "G"}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800">{t.name}</span>
                            {isSelf && (
                              <span className="ml-1.5 px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold rounded">
                                Anda
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-500 font-medium">{t.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          t.role === "owner"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : t.role === "admin"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>
                          {t.role === "owner" ? "Owner" : t.role === "admin" ? "Admin" : "Guru"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-400 text-xs">
                          {new Date(t.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isSelf && (
                          <button
                            onClick={() => setConfirmRemoveTeacher(t)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-[8px] transition-colors"
                            title="Keluarkan Guru dari sekolah"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section: Pending Invitations */}
      <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Mail className="w-5 h-5 text-purple-600" />
          Undangan Menunggu Persetujuan
        </h3>
        
        {loadingInvitations ? (
          <div className="flex items-center justify-center p-8">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin"></div>
          </div>
        ) : invitations.length === 0 ? (
          <p className="text-slate-500 font-medium text-sm text-center py-4">Tidak ada undangan pending.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-55 border-b border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-3">Email Penerima</th>
                  <th className="px-6 py-3">Peran yang Ditawarkan</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Tanggal Dikirim</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{inv.invitee_email}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-200">
                        {inv.role === "admin" ? "Admin Sekolah" : "Guru"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-orange-50 text-orange-700 border-orange-200 animate-pulse">
                        Pending
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {new Date(inv.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setConfirmCancelInvite({ id: inv.id, email: inv.invitee_email })}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-[8px] transition-colors cursor-pointer"
                        title="Batalkan Undangan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD TEACHER MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[24px] border border-slate-200 shadow-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-purple-600" />
                  Tambah Guru ke Sekolah
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddTeacher} className="space-y-4">
                <div className="p-3 bg-purple-50 border border-purple-100 rounded-[12px] text-purple-700 text-xs leading-relaxed">
                  Kirim undangan ke email guru untuk bergabung ke grup sekolah ini. Guru penerima akan melihat undangan ini di dashboard utama mereka untuk dikonfirmasi.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email Guru</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="contoh: guru@kurikula.com"
                      value={newTeacherEmail}
                      onChange={(e) => setNewTeacherEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-[12px] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-slate-50 text-slate-800 font-semibold"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isAdding}
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-[12px] text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {isAdding ? "Memproses..." : "Tambah Guru"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
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
        isOpen={confirmCancelInvite !== null}
        title="Batalkan Undangan"
        message={confirmCancelInvite ? `Apakah Anda yakin ingin membatalkan undangan untuk ${confirmCancelInvite.email}?` : ""}
        onConfirm={() => {
          if (confirmCancelInvite) {
            handleCancelInvitation(confirmCancelInvite.id, confirmCancelInvite.email);
            setConfirmCancelInvite(null);
          }
        }}
        onCancel={() => setConfirmCancelInvite(null)}
      />

      <ConfirmModal
        isOpen={confirmRemoveTeacher !== null}
        title="Keluarkan Guru"
        message={confirmRemoveTeacher ? `Apakah Anda yakin ingin mengeluarkan ${confirmRemoveTeacher.name} (${confirmRemoveTeacher.email}) dari sekolah ini?` : ""}
        onConfirm={() => {
          if (confirmRemoveTeacher) {
            handleRemoveTeacher(confirmRemoveTeacher);
            setConfirmRemoveTeacher(null);
          }
        }}
        onCancel={() => setConfirmRemoveTeacher(null)}
      />
    </div>
  );
}
