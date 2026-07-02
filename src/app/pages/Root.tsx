import { useState, useEffect } from "react";
import { Outlet, Navigate, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";
import { AppSidebar } from "../components/AppSidebar";
import { AIChatPanel } from "../components/AIChatPanel";
import { useAuth } from "../../contexts/AuthContext";
import logoWithText from "../../assets/kurikula.png";

export default function Root() {
  const { user, profile, loading, isSuperAdmin } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-close mobile sidebar drawer on page navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3f6fa]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#F0EAC6] border-t-[#3C405B] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect Super Admin to /admin if they land on "/dashboard"
  if (isSuperAdmin && location.pathname === "/dashboard") {
    return <Navigate to="/admin" replace />;
  }

  // Full-screen layout for the Super Admin panel
  if (location.pathname === "/admin") {
    return (
      <div className="flex h-screen bg-[#F4F6F9] overflow-hidden">
        <main className="flex-1 overflow-y-auto flex flex-col p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden relative">
      
      {/* Sidebar - Desktop (Static) */}
      <div className="hidden md:block flex-shrink-0 relative z-20">
        <AppSidebar />
      </div>

      {/* Sidebar - Mobile (Drawer Overlay) */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black z-40 md:hidden"
            />
            {/* Sidebar drawer container */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-64 bg-white z-50 shadow-2xl md:hidden flex flex-col"
            >
              {/* Close Button overlay */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 z-50 p-2 hover:bg-gray-100 rounded-full text-gray-700 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
              <AppSidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 py-0 md:py-4 md:pr-4 md:pl-2 bg-white h-full relative">
        <div id="main-content-wrapper" className={`flex-1 bg-[#F4F6F9] md:rounded-[32px] flex flex-col shadow-inner ${
          location.pathname === "/ai-planner" || location.pathname === "/ai-materials" || location.pathname === "/ai-chat"
            ? "overflow-y-auto lg:overflow-hidden"
            : "overflow-y-auto"
        }`}>
          
          {/* Mobile Top Navbar (Visible only on screens smaller than md) */}
          <header className="md:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-gray-150 flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <img src={logoWithText} alt="kurikula" className="h-7" />
            <div className="w-9"></div> {/* spacing placeholder to center logo */}
          </header>

          <main className="flex-1 flex flex-col min-h-0">
            <Outlet />
          </main>
        </div>
      </div>

      <AIChatPanel />
    </div>
  );
}