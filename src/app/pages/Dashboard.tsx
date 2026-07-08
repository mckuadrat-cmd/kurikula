import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Sparkles,
  QrCode,
  TrendingUp,
  BookOpen,
  Award,
  Database,
  CheckCircle,
  RefreshCw,
  Building,
  ShieldCheck,
  X,
} from "lucide-react";
import { Link } from "react-router";
import { AIButton } from "../components/AIComponents";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import {
  initGoogleAuth,
  getOrCreateSpreadsheetId,
  logoutGoogle,
  readSheetRange,
  getGoogleConnectionStatus,
} from "../../lib/googleSheetsService";
import { toast } from "sonner";
import { ConfirmModal } from "../components/ui/ConfirmModal";

export default function Dashboard() {
  const { profile, session, isSuperAdmin } = useAuth();
  const {
    subscriptionTier,
    subscriptionExpiresAt,
    refresh: refreshWorkspace
  } = useWorkspace();

  const getHighResAvatar = (url?: string) => {
    if (!url) return "";
    if (url.includes("googleusercontent.com")) {
      if (url.match(/=s\d+(?:-[ch])?$/)) {
        return url.replace(/=s\d+(?:-[ch])?$/, "=s384-c");
      }
      if (url.match(/\/s\d+(?:-[ch])?\//)) {
        return url.replace(/\/s\d+(?:-[ch])?\//, "/s384-c/");
      }
      return `${url}=s384-c`;
    }
    return url;
  };

  const [googleConnection, setGoogleConnection] = useState(() => getGoogleConnectionStatus());
  const [connecting, setConnecting] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState("");
  const [scheduleList, setScheduleList] = useState<any[]>([]);
  const [activitiesList, setActivitiesList] = useState<any[]>([]);

  // Pending school invitations
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [confirmDeclineInviteId, setConfirmDeclineInviteId] = useState<string | null>(null);

  const fetchMyInvitations = async () => {
    if (!session?.access_token) return;
    setLoadingInvitations(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/users/me/invitations`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal mengambil undangan");
      setInvitations(data.invitations || []);
    } catch (e) {
      console.error("Gagal mengambil undangan:", e);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const handleAcceptInvite = async (invId: string, schoolName: string) => {
    if (!session?.access_token) return;

    toast.loading("Menerima undangan...");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/invitations/${invId}/accept`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();
      toast.dismiss();
      if (!response.ok) throw new Error(data.error || "Gagal menerima undangan");

      toast.success(`Selamat! Anda telah bergabung ke ${schoolName}.`);
      await refreshWorkspace();
      fetchMyInvitations();
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Terjadi kesalahan.");
    }
  };

  const handleDeclineInvite = async (invId: string) => {
    if (!session?.access_token) return;

    toast.loading("Menolak undangan...");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/invitations/${invId}/decline`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();
      toast.dismiss();
      if (!response.ok) throw new Error(data.error || "Gagal menolak undangan");

      toast.success("Undangan ditolak.");
      fetchMyInvitations();
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Terjadi kesalahan.");
    }
  };

  useEffect(() => {
    if (session) {
      fetchMyInvitations();
    }
  }, [session]);

  const [config, setConfig] = useState<Record<string, string>>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const dynamicPeriod = month >= 6
      ? { tahunAjaran: `${year}/${year + 1}`, semester: "Ganjil" }
      : { tahunAjaran: `${year - 1}/${year}`, semester: "Genap" };

    return {
      Tahun_Ajaran: dynamicPeriod.tahunAjaran,
      Semester: dynamicPeriod.semester,
    };
  });

  const [statsData, setStatsData] = useState([
    { icon: Users, label: "Total Siswa", value: "-", color: "primary" },
    { icon: UserCheck, label: "Hadir Hari Ini", value: "-", color: "accent" },
    { icon: UserX, label: "Tidak Hadir", value: "-", color: "red" },
    { icon: BookOpen, label: "Modul Tersimpan", value: "-", color: "cream" },
  ]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) {
      return "Selamat Pagi";
    } else if (hour >= 11 && hour < 15) {
      return "Selamat Siang";
    } else if (hour >= 15 && hour < 19) {
      return "Selamat Sore";
    } else {
      return "Selamat Malam";
    }
  };

  const googleConnected = googleConnection.isConnected;
  const hasToken = googleConnection.hasValidToken;

  const refreshGoogleConnection = () => {
    const status = getGoogleConnectionStatus();
    setGoogleConnection(status);
    return status;
  };

  useEffect(() => {
    // Generate tanggal lokal terformat
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    setCurrentDate(today.toLocaleDateString("id-ID", options));

    // Cek koneksi Google
    const initAuth = async () => {
      refreshGoogleConnection();
      const savedId = localStorage.getItem("google_spreadsheet_id");
      if (savedId) setSpreadsheetId(savedId);
    };
    initAuth();
  }, []);

  const loadStats = async () => {
    const status = getGoogleConnectionStatus();
    setGoogleConnection(status);
    if (!status.hasValidToken) {
      setStatsData([
        { icon: Users, label: "Total Siswa", value: "-", color: "primary" },
        { icon: UserCheck, label: "Hadir Hari Ini", value: "-", color: "accent" },
        { icon: UserX, label: "Tidak Hadir", value: "-", color: "red" },
        { icon: BookOpen, label: "Modul Tersimpan", value: "-", color: "cream" },
      ]);
      setActivitiesList([]);
      setScheduleList([]);
      return;
    }

    try {
      // 1. Ambil data Siswa
      let totalSiswa = 0;
      let siswaRows: any[] = [];
      try {
        siswaRows = await readSheetRange("Siswa!A2:G");
        totalSiswa = siswaRows.length;
      } catch (e) {
        console.error("Gagal membaca siswa:", e);
      }

      // 2. Ambil data Absensi
      let absensiRows: any[] = [];
      let presentToday = 0;
      let absentToday = 0;
      const todayStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
      try {
        absensiRows = await readSheetRange("Absensi!A2:I");
        // Filter log hari ini
        const todayLogs = absensiRows.filter((row) => row[1] === todayStr);
        presentToday = todayLogs.filter((row) => row[5]?.toLowerCase() === "hadir").length;
        absentToday = Math.max(0, totalSiswa - presentToday);
      } catch (e) {
        console.error("Gagal membaca absensi:", e);
      }

      // 3. Ambil data Dokumen
      let totalDokumen = 0;
      let dokumenRows: any[] = [];
      try {
        dokumenRows = await readSheetRange("Dokumen!A2:G");
        totalDokumen = dokumenRows.length;
      } catch (e) {
        console.error("Gagal membaca dokumen:", e);
      }

      setStatsData([
        { icon: Users, label: "Total Siswa", value: totalSiswa > 0 ? totalSiswa.toString() : "0", color: "primary" },
        { icon: UserCheck, label: "Hadir Hari Ini", value: presentToday > 0 ? presentToday.toString() : "0", color: "accent" },
        { icon: UserX, label: "Tidak Hadir", value: absentToday > 0 ? absentToday.toString() : "0", color: "red" },
        { icon: BookOpen, label: "Modul Tersimpan", value: totalDokumen > 0 ? totalDokumen.toString() : "0", color: "cream" },
      ]);

      // 4. Bangun data recentActivities secara dinamis
      const activities: any[] = [];

      if (absensiRows.length > 0) {
        const sortedAbsensi = [...absensiRows].slice(-5).reverse();
        sortedAbsensi.forEach((row) => {
          activities.push({
            action: `Absensi QR - ${row[3] || "Siswa"}`,
            subject: `Kelas ${row[4] || "Umum"} • ${row[7] || "Mapel"} • ${row[8] || "Sesi"}`,
            time: `${row[1]} ${row[6] || ""}`,
            type: "attendance",
          });
        });
      }

      if (dokumenRows.length > 0) {
        const sortedDocs = [...dokumenRows].slice(-5).reverse();
        sortedDocs.forEach((row) => {
          activities.push({
            action: `Simpan Dokumen - ${row[1] || "Materi"}`,
            subject: `${row[2] || "Dokumen"}`,
            time: `${row[4] || ""}`,
            type: "ai",
          });
        });
      }

      // Slice the merged list to top 5
      setActivitiesList(activities.slice(0, 5));
      setScheduleList([]); // Schedule remains empty as there is no schedule database table
    } catch (error) {
      console.error("Gagal meload stats dashboard:", error);
    }
  };

  useEffect(() => {
    loadStats();
  }, [googleConnection.status]);

  const handleConnectGoogle = async () => {
    setConnecting(true);
    try {
      await initGoogleAuth(
        async (token) => {
          refreshGoogleConnection();
          toast.success("Berhasil terhubung ke Google Drive!");
          try {
            const id = await getOrCreateSpreadsheetId(true);
            setSpreadsheetId(id);
            toast.success("Database Kurikula_Database siap di Google Sheets!");
            await loadStats();
          } catch (err: any) {
            toast.error("Gagal membuat/mencari spreadsheet database di Drive.");
            console.error(err);
          }
          setConnecting(false);
        },
        (err) => {
          setConnecting(false);
          toast.error("Gagal login dengan Google.");
          console.error(err);
        }
      );
    } catch (error) {
      setConnecting(false);
      toast.error("Gagal memulai Google Auth.");
    }
  };

  const handleDisconnectGoogle = () => {
    logoutGoogle();
    refreshGoogleConnection();
    setSpreadsheetId(null);
    toast.success("Google Drive terputus.");
    loadStats();
  };

  return (
    <div className="p-8 space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#3C405B] via-[#DF7A5E] to-[#F0EAC6] rounded-[12px] p-8 text-white relative overflow-hidden"
      >
        <motion.div
          className="absolute inset-0 opacity-10"
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%"],
          }}
          transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
          style={{
            backgroundImage: "radial-gradient(circle, white 2px, transparent 2px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {getGreeting()}, {profile?.name || "Nama Akun"}!
              </h1>
              <p className="text-white/80 text-lg mb-3">
                {currentDate} • Semester {config.Semester} {config.Tahun_Ajaran}
              </p>

              {/* Active Plan & Expiry Status (Mobile only) */}
              <div className="flex flex-wrap items-center gap-2 mb-4 text-xs font-semibold md:hidden">
                {isSuperAdmin ? (
                  <span className="px-2.5 py-1 rounded-full bg-purple-600/30 backdrop-blur-sm text-purple-100 border border-purple-500/30 flex items-center gap-1.5 animate-pulse">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
                    Super Admin
                  </span>
                ) : (
                  <>
                    <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white border border-white/10 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
                      Paket: {subscriptionTier === "inactive" ? "Tidak Aktif" : (subscriptionTier ? subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1) : "")} Plan
                    </span>
                    {subscriptionExpiresAt && (
                      <span className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/90 border border-white/5">
                        Masa Berlaku: {new Date(subscriptionExpiresAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-4 items-center">
                <Link to="/attendance">
                  <motion.button
                    className="px-6 py-3 bg-white text-[#3C405B] rounded-[12px] font-medium flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <QrCode className="w-5 h-5" />
                    Absensi Cepat
                  </motion.button>
                </Link>

                <Link to="/ai-planner">
                  <AIButton className="bg-white/20 hover:bg-white/30 backdrop-blur-sm">
                    Generate Modul Ajar
                  </AIButton>
                </Link>

                {googleConnected ? (
                  <div className="flex items-center gap-3">
                    {hasToken ? (
                      <div className="px-6 py-3 bg-emerald-600 text-emerald-100 border border-emerald-500/30 rounded-[12px] font-medium flex items-center gap-2 select-none">
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                        Drive Terhubung
                      </div>
                    ) : (
                      <motion.button
                        onClick={handleConnectGoogle}
                        disabled={connecting}
                        className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-[12px] font-medium flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        whileHover={{ scale: connecting ? 1 : 1.05 }}
                        whileTap={{ scale: connecting ? 1 : 0.95 }}
                        title="Klik untuk menghubungkan ulang Google Drive (Sesi Anda telah kedaluwarsa)"
                      >
                        {connecting ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-5 h-5" />
                            Hubungkan Ulang Drive
                          </>
                        )}
                      </motion.button>
                    )}
                    <motion.button
                      onClick={handleDisconnectGoogle}
                      className="p-3 bg-white/10 hover:bg-red-600/20 text-white/80 hover:text-red-200 rounded-[12px] border border-white/10 hover:border-red-500/30 transition-colors cursor-pointer flex items-center justify-center"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Putuskan Koneksi Google Drive"
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  </div>
                ) : (
                  <motion.button
                    onClick={handleConnectGoogle}
                    disabled={connecting}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] font-medium flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    whileHover={{ scale: connecting ? 1 : 1.05 }}
                    whileTap={{ scale: connecting ? 1 : 0.95 }}
                  >
                    {connecting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Database className="w-5 h-5" />
                        Hubungkan Google Drive
                      </>
                    )}
                  </motion.button>
                )}
              </div>

              {googleConnected && spreadsheetId && (
                <p className="text-xs text-white/70 mt-3">
                  Database ID:{" "}
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-white font-medium"
                  >
                    {spreadsheetId.substring(0, 15)}... (Buka Google Sheets)
                  </a>
                </p>
              )}
              {googleConnected && !hasToken && (
                <p className="text-xs text-amber-100 mt-3 max-w-2xl">
                  {googleConnection.message} Fitur AI tetap bisa digunakan, tetapi sinkronisasi data siswa, absensi, nilai, dan dokumen ke Google Sheets perlu koneksi ulang.
                </p>
              )}
            </div>

            {/* Right: Active Plan & Large Profile Picture */}
            <div className="flex-shrink-0 ml-4 mr-6 hidden md:flex flex-row items-center gap-6 text-right">
              {/* Active Plan & Expiry Status (Large) */}
              <div className="flex flex-col items-end gap-2 text-white">
                {isSuperAdmin ? (
                  <span className="px-4 py-1.5 rounded-full bg-purple-600/30 backdrop-blur-md text-purple-100 border border-purple-500/40 text-sm font-black tracking-wide uppercase flex items-center gap-1.5 shadow-md animate-pulse">
                    <ShieldCheck className="w-4 h-4 text-purple-300" />
                    Super Admin
                  </span>
                ) : (
                  <>
                    <span className="px-4 py-1.5 rounded-full bg-white/25 backdrop-blur-md text-white border border-white/30 text-sm font-black tracking-wide uppercase flex items-center gap-1.5 shadow-md">
                      <Sparkles className="w-4 h-4 text-yellow-200" />
                      {subscriptionTier === "inactive" ? "Tidak Aktif" : (subscriptionTier ? `${subscriptionTier.toUpperCase()} PLAN` : "")}
                    </span>
                    {subscriptionExpiresAt && (
                      <span className="text-xs font-bold text-white/95 tracking-wide bg-black/20 px-3.5 py-1 rounded-full border border-white/10 shadow-inner">
                        Exp: {new Date(subscriptionExpiresAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Profile Photo */}
              <div className="w-55 h-55 rounded-full border-4 border-white/30 overflow-hidden shadow-md bg-white/10 flex items-center justify-center">
                {profile?.avatar ? (
                  <img
                    src={getHighResAvatar(profile.avatar)}
                    alt={profile.name || "User Avatar"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-white text-3xl font-bold">
                    {(profile?.name || "Nama Akun").split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Pending School Invitations Banner */}
      {invitations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-purple-50 border border-purple-200 rounded-[12px] p-6 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Undangan Sekolah Baru</h3>
              <p className="text-slate-500 text-xs mt-0.5">Anda diundang untuk bergabung ke grup sekolah institusi di platform Kurikula.</p>
            </div>
          </div>
          <div className="divide-y divide-purple-100 border border-purple-100 bg-white rounded-[12px] overflow-hidden">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                <div>
                  <p className="text-slate-800 font-bold text-sm">
                    {inv.workspaces?.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Peran: <span className="font-bold text-slate-700">{inv.role === "admin" ? "Admin Sekolah" : "Guru"}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleAcceptInvite(inv.id, inv.workspaces?.name)}
                    className="px-4 py-2 bg-[#3C405B] hover:bg-[#3C405B]/90 text-white rounded-[8px] text-xs font-semibold transition-colors cursor-pointer border-0"
                  >
                    Terima
                  </button>
                  <button
                    onClick={() => setConfirmDeclineInviteId(inv.id)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-[8px] text-xs font-semibold transition-colors cursor-pointer bg-white"
                  >
                    Tolak
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          const colors = {
            primary: "from-[#3C405B] to-[#3C405B]/80",
            accent: "from-[#DF7A5E] to-[#DF7A5E]/80",
            red: "from-red-500 to-red-600",
            cream: "from-[#F0EAC6] to-[#F0EAC6]/70",
          };

          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-[12px] p-6 border border-gray-200 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${colors[stat.color as keyof typeof colors]} rounded-[12px] flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white rounded-[12px] p-6 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Jadwal Hari Ini</h2>
            </div>
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-medium">
              {scheduleList.length} Kelas
            </span>
          </div>

          <div className="space-y-3">
            {scheduleList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <Clock className="w-8 h-8 text-gray-300" />
                <p className="text-sm text-gray-400 font-semibold italic">Belum ada jadwal hari ini.</p>
              </div>
            ) : (
              scheduleList.map((schedule, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-[12px] hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-shrink-0 text-center">
                    <div className="text-sm font-semibold text-gray-900">{schedule.time}</div>
                  </div>
                  <div className="w-px h-12 bg-gray-200"></div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{schedule.subject}</div>
                    <div className="text-sm text-gray-500">{schedule.class} • {schedule.room}</div>
                  </div>
                  <Link to="/attendance">
                    <button className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-[12px] transition-colors">
                      Absensi
                    </button>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-[12px] p-6 border border-gray-200"
        >
          <div className="flex items-center gap-3 mb-6">
            <Award className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Aktivitas Terkini</h2>
          </div>

          <div className="space-y-4">
            {activitiesList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <Award className="w-8 h-8 text-gray-300" />
                <p className="text-sm text-gray-400 font-semibold italic">Belum ada aktivitas terkini.</p>
              </div>
            ) : (
              activitiesList.map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex gap-3"
                >
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${activity.type === "ai" ? "bg-purple-500" :
                    activity.type === "attendance" ? "bg-emerald-500" :
                      activity.type === "assessment" ? "bg-blue-500" :
                        "bg-orange-500"
                    }`}></div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm">{activity.action}</div>
                    <div className="text-sm text-gray-500">{activity.subject}</div>
                    <div className="text-xs text-gray-400 mt-1">{activity.time}</div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-[12px] p-6 border border-purple-100"
      >
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">Aksi Cepat AI</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link to="/ai-planner" className="block">
            <motion.div
              className="p-4 bg-white rounded-[12px] border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              whileHover={{ scale: 1.02 }}
            >
              <div className="font-medium text-gray-900 mb-1">Generate RPP</div>
              <div className="text-sm text-gray-500">Buat modul ajar baru</div>
            </motion.div>
          </Link>

          <Link to="/semester-planner" className="block">
            <motion.div
              className="p-4 bg-white rounded-[12px] border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              whileHover={{ scale: 1.02 }}
            >
              <div className="font-medium text-gray-900 mb-1">Auto Planning</div>
              <div className="text-sm text-gray-500">Rencanakan semester</div>
            </motion.div>
          </Link>

          <Link to="/students" className="block">
            <motion.div
              className="p-4 bg-white rounded-[12px] border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              whileHover={{ scale: 1.02 }}
            >
              <div className="font-medium text-gray-900 mb-1">Data Siswa</div>
              <div className="text-sm text-gray-500">Kelola informasi siswa</div>
            </motion.div>
          </Link>

          <Link to="/assessment" className="block">
            <motion.div
              className="p-4 bg-white rounded-[12px] border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              whileHover={{ scale: 1.02 }}
            >
              <div className="font-medium text-gray-900 mb-1">Input Nilai</div>
              <div className="text-sm text-gray-500">Kelola penilaian</div>
            </motion.div>
          </Link>
        </div>
      </motion.div>

      <ConfirmModal
        isOpen={confirmDeclineInviteId !== null}
        title="Tolak Undangan"
        message="Apakah Anda yakin ingin menolak undangan ini?"
        onConfirm={() => {
          if (confirmDeclineInviteId) {
            handleDeclineInvite(confirmDeclineInviteId);
            setConfirmDeclineInviteId(null);
          }
        }}
        onCancel={() => setConfirmDeclineInviteId(null)}
      />
    </div>
  );
}
