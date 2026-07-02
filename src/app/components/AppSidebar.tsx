import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  QrCode,
  Users,
  ClipboardList,
  Sparkles,
  Calendar,
  FolderOpen,
  CreditCard,
  Settings as SettingsIcon,
  BookOpen,
  LogOut,
  User,
  ChevronRight,
  ShieldCheck,
  School,
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { toast } from "sonner";
import logoWithText from "../../assets/kurikula.png";
import logoIcon from "../../assets/LOGO.png";


export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, isSuperAdmin } = useAuth();
  const {
    workspaces,
    activeWorkspaceId,
    switchWorkspace,
    subscriptionTier,
    credits
  } = useWorkspace();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

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

  // Collapsible state persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("sidebar_collapsed") === "true";
  });

  // Close dropdown menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const isSchoolAdmin = activeWorkspace?.type === "school" && (activeWorkspace?.role === "owner" || activeWorkspace?.role === "admin");

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const sidebarItems = [
    ...(isSuperAdmin ? [{ icon: ShieldCheck, label: "User Management", path: "/admin" }] : []),
    ...(isSchoolAdmin ? [{ icon: School, label: "Dashboard Sekolah", path: "/school-admin" }] : []),
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: MessageCircle, label: "Tanya Guru AI", path: "/ai-chat", isAI: true },
    { icon: Users, label: "Data Siswa", path: "/students" },
    { icon: QrCode, label: "Absensi", path: "/attendance" },
    { icon: Calendar, label: "Rencana Semester", path: "/semester-planner", isAI: true },
    { icon: Sparkles, label: "Modul Ajar", path: "/ai-planner", isAI: true },
    { icon: BookOpen, label: "Bahan Ajar", path: "/ai-materials", isAI: true },
    { icon: ClipboardList, label: "Penilaian", path: "/assessment" },
    { icon: FolderOpen, label: "Administrasi", path: "/administration" },
  ];

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 80 : 288 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="my-4 ml-4 bg-white border border-gray-200 flex flex-col rounded-[24px] shadow-sm relative sticky top-4 h-[calc(100vh-2rem)] z-30 flex-shrink-0"
    >
      {/* Chevron Collapse Toggle Button */}
      <button
        onClick={() => {
          const nextState = !isCollapsed;
          setIsCollapsed(nextState);
          localStorage.setItem("sidebar_collapsed", String(nextState));
        }}
        className="absolute -right-3.5 top-12 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md hover:bg-gray-55 transition-colors z-40 text-gray-500 cursor-pointer animate-none"
        title={isCollapsed ? "Buka Sidebar" : "Tutup Sidebar"}
      >
        <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? "" : "rotate-180"}`} />
      </button>

      {/* Header Logo */}
      <div className={`p-6 pb-4 flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
        <Link to="/dashboard" className="flex items-center gap-3">
          <img
            src={isCollapsed ? logoIcon : logoWithText}
            alt="kurikula"
            className={`${isCollapsed ? "h-7 w-7" : "h-8"} transition-all`}
          />
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto pt-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const isInactiveLock = subscriptionTier === "inactive" && item.path !== "/billing" && item.path !== "/";
          const isCreditHabisLock = item.isAI && (credits?.balance ?? 0) <= 0;
          const isLocked = !isSuperAdmin && (isInactiveLock || isCreditHabisLock);

          const handleClick = (e: React.MouseEvent) => {
            if (isLocked) {
              e.preventDefault();
              if (isInactiveLock) {
                toast.error("Silakan aktifkan salah satu paket langganan terlebih dahulu di menu Billing.");
              } else if (isCreditHabisLock) {
                toast.error("AI Credit Anda habis. Silakan top up atau upgrade paket di menu Billing.");
              }
              navigate("/billing");
            }
          };

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleClick}
              title={isCollapsed ? item.label : undefined}
            >
              <motion.div
                className={`flex items-center ${isCollapsed ? "justify-center w-12 h-12 mx-auto" : "gap-3 px-4 py-2.5"} rounded-[12px] transition-colors relative ${isActive
                  ? "bg-[#F0EAC6] text-[#3C405B]"
                  : isLocked
                    ? "text-gray-400 cursor-not-allowed hover:bg-transparent"
                    : "text-gray-700 hover:bg-gray-55"
                  }`}
                whileHover={isLocked ? {} : { x: isCollapsed ? 0 : 4 }}
                transition={{ duration: 0.2 }}
              >
                {isActive && (
                  <motion.div
                    className={`absolute ${isCollapsed ? "left-1 top-2 bottom-2 w-1" : "left-0 top-0 bottom-0 w-1"} bg-[#DF7A5E] rounded-r-full`}
                    layoutId="activeTab"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
                <Icon className={`w-5 h-5 flex-shrink-0 ${isLocked ? "text-gray-300" : ""}`} />

                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                      className="font-medium text-base whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {!isCollapsed && (item.isAI || (isInactiveLock && isLocked)) && (
                  isLocked ? (
                    <span className="ml-auto text-gray-400 text-xs" title="Terkunci (Upgrade ke Pro)">
                      🔒
                    </span>
                  ) : (
                    <span className="ml-auto px-2 py-0.5 bg-gradient-to-r from-[#3C405B] to-[#DF7A5E] text-white text-xs rounded-full">
                      AI
                    </span>
                  )
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User Profile, Workspace Switcher, & Token Info */}
      <div className="p-4 border-t border-gray-200" ref={profileMenuRef}>

        {/* Profile Card Trigger Button & Dropdown Menu */}
        <div className="relative mb-3">
          <AnimatePresence>
            {profileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, x: -15, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -15, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute left-[calc(100%+12px)] bottom-[12px] w-48 bg-white rounded-[16px] shadow-2xl border border-gray-200 py-2.5 z-50 overflow-hidden text-left flex flex-col gap-0.5"
              >
                {/* Header */}
                <div className="px-3.5 py-1">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Pilih Workspace</span>
                </div>

                {/* Workspaces List */}
                <div className="max-h-40 overflow-y-auto px-1 flex flex-col gap-0.5">
                  {workspaces.map((w) => {
                    const isActive = w.id === activeWorkspaceId;
                    return (
                      <button
                        key={w.id}
                        title={w.name}
                        onClick={async () => {
                          setProfileMenuOpen(false);
                          if (w.id !== activeWorkspaceId) {
                            await switchWorkspace(w.id);
                            toast.success(`Berhasil beralih ke workspace ${w.type === "school" ? "Sekolah" : "Personal"}`);
                            navigate("/dashboard");
                          }
                        }}
                        className={`w-full flex items-center px-3.5 py-2 rounded-[8px] text-sm font-semibold transition-colors text-left ${isActive
                          ? "bg-[#F0EAC6] text-[#3C405B]"
                          : "text-gray-700 hover:bg-gray-55"
                          }`}
                      >
                        {w.type === "school" ? "Sekolah" : "Personal"}
                      </button>
                    );
                  })}
                </div>

                <hr className="border-gray-100 my-1" />

                {/* Settings Link */}
                <Link
                  to="/settings"
                  onClick={() => setProfileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-[8px] mx-1 text-sm font-semibold transition-colors ${location.pathname === "/settings"
                    ? "bg-[#F0EAC6] text-[#3C405B]"
                    : "text-gray-700 hover:bg-gray-55"
                    }`}
                >
                  <SettingsIcon className="w-4.5 h-4.5 text-gray-500" />
                  <span>Pengaturan</span>
                </Link>

                {/* Billing Link */}
                <Link
                  to="/billing"
                  onClick={() => setProfileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-[8px] mx-1 text-sm font-semibold transition-colors ${location.pathname === "/billing"
                    ? "bg-[#F0EAC6] text-[#3C405B]"
                    : "text-gray-700 hover:bg-gray-55"
                    }`}
                >
                  <CreditCard className="w-4.5 h-4.5 text-gray-500" />
                  <span>Billing & Paket</span>
                </Link>

                <hr className="border-gray-100 my-1" />

                {/* Logout Button */}
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-[8px] mx-1 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer border-0"
                >
                  <LogOut className="w-4.5 h-4.5 text-red-500" />
                  <span>Logout</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Profile Card Trigger Button */}
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className={`w-full bg-gray-50 hover:bg-gray-100 rounded-[12px] ${isCollapsed ? "p-2 justify-center" : "p-3 justify-between"} border border-gray-200 transition-all flex items-center text-left ${profileMenuOpen ? "ring-2 ring-[#DF7A5E]/20 bg-gray-100" : ""}`}
            title={isCollapsed ? profile?.name || "Nama Akun" : activeWorkspace?.name || undefined}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1 justify-center">
              <div className="w-9 h-9 bg-gradient-to-br from-[#DF7A5E] to-[#3C405B] rounded-full flex items-center justify-center flex-shrink-0">
                {profile?.avatar ? (
                  <img src={getHighResAvatar(profile.avatar)} alt={profile.name} className="w-9 h-9 rounded-full" />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="min-w-0 flex-1 overflow-hidden"
                  >
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {profile?.name || "Nama Akun"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {profile?.school || "Personal"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1.5 ml-2 flex-shrink-0"
                >
                  {activeWorkspace?.type === "school" ? (
                    <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 text-xs font-bold rounded-full">
                      Sekolah
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 border border-orange-100 text-xs font-bold rounded-full">
                      Personal
                    </span>
                  )}
                  <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${profileMenuOpen ? "rotate-90" : ""}`} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Subscription / Credit Balance Status */}
        <AnimatePresence mode="wait">
          {isCollapsed ? (
            <motion.div
              key="collapsed-status"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center justify-center pt-2"
            >
              {isSuperAdmin ? (
                <div
                  className="w-12 h-12 bg-purple-50 border border-purple-200 rounded-[12px] flex items-center justify-center text-purple-700 cursor-help"
                  title="Super Admin - Akses Sistem Penuh"
                >
                  <ShieldCheck className="w-6 h-6" />
                </div>
              ) : subscriptionTier === "inactive" ? (
                <Link
                  to="/billing"
                  className="w-12 h-12 bg-red-50 border border-red-200 rounded-[12px] flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
                  title="Semua Fitur Terkunci - Silakan Aktifkan Paket"
                >
                  <span className="text-sm">🔒</span>
                </Link>
              ) : (
                <Link
                  to="/billing"
                  className="w-12 h-12 bg-gradient-to-br from-[#F0EAC6] to-[#DF7A5E]/20 rounded-[12px] flex flex-col items-center justify-center text-[#3C405B] hover:brightness-95 transition-all"
                  title={`AI Credit Tersisa: ${(credits?.balance ?? 0).toLocaleString("id-ID")}`}
                >
                  <Sparkles className="w-4 h-4 mb-0.5 text-[#DF7A5E]" />
                  <span className="text-xs font-bold">
                    {credits?.balance !== undefined
                      ? credits.balance >= 1000
                        ? `${(credits.balance / 1000).toFixed(1)}k`
                        : credits.balance
                      : 0}
                  </span>
                </Link>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="expanded-status"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {isSuperAdmin ? (
                <div className="bg-gradient-to-br from-purple-50 to-blue-50/30 rounded-[12px] p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2 text-purple-700">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold uppercase tracking-wider">Super Admin</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 mb-1">Akses Sistem Penuh</p>
                  <p className="text-xs text-slate-500">Anda mengelola seluruh data platform Kurikula.</p>
                </div>
              ) : subscriptionTier === "inactive" ? (
                <div className="bg-red-50/50 rounded-[12px] p-4 border border-red-200">
                  <div className="flex items-center gap-2 mb-2 text-red-500">
                    <Sparkles className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-semibold">Semua Fitur Terkunci 🔒</span>
                  </div>
                  <p className="text-xl font-bold text-red-400 mb-1">0 AI Credit</p>
                  <p className="text-xs text-gray-500 mb-3">Belum Ada Paket Aktif</p>
                  <Link to="/billing">
                    <button className="w-full px-4 py-2 bg-gradient-to-r from-red-500 to-[#DF7A5E] hover:from-red-600 hover:to-[#DF7A5E]/90 text-white rounded-[12px] text-xs font-semibold transition-colors shadow-sm cursor-pointer">
                      Aktifkan Paket
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-[#F0EAC6] to-[#DF7A5E]/20 rounded-[12px] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-[#3C405B]" />
                    <span className="text-sm font-semibold text-gray-900">AI Credit Tersisa</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">
                    {(credits?.balance ?? 0).toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs text-gray-600 mb-3">
                    dari {(
                      subscriptionTier === "trial" ? 50 :
                        subscriptionTier === "basic" ? 30 :
                          subscriptionTier === "pro" ? 150 :
                            subscriptionTier === "premium" ? 500 : 10000
                    ).toLocaleString("id-ID")} AI Credit
                  </p>
                  <Link to="/billing">
                    <button className="w-full px-4 py-2 bg-[#3C405B] hover:bg-[#3C405B]/90 text-white rounded-[12px] text-sm font-medium transition-colors cursor-pointer">
                      {subscriptionTier === "basic" ? "Upgrade Paket" : "Top Up / Upgrade"}
                    </button>
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}