import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, Bell, Settings, LogOut, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../contexts/AuthContext";

export function AppRightSidebar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dynamic Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  
  const getFirstDayOfMonth = (y: number, m: number) => {
    const day = new Date(y, m, 1).getDay();
    return day === 0 ? 6 : day - 1; // Adjust so Monday is 0
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  // Generate blank spaces and days
  const calendarCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push(i);
  }

  const handlePrevMonth = () => {
    setCalendarDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(year, month + 1, 1));
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await signOut();
    navigate("/login");
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userName = profile?.name || "Ridwan Setiawan";
  const schoolName = profile?.school || "SMA Sukahati Makasar";
  const avatar = profile?.avatar;

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

  // Highlights: Current day
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Reminders list matching the Learnthru mockup style
  const [reminders, setReminders] = useState([
    { id: 1, title: "Input Nilai Harian Matematika", desc: "Batas Akhir: Jum'at, 19 Juni 2026", active: true },
    { id: 2, title: "Rapat Guru & Kurikulum", desc: "Senin, 22 Juni 2026 • 13:00 WIB", active: true },
    { id: 3, title: "Upload AI Modul RPP Semester", desc: "Kamis, 25 Juni 2026", active: false },
  ]);

  const toggleReminder = (id: number) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  return (
    <div className="w-[300px] p-6 flex flex-col gap-8 hidden xl:flex select-none shadow-none">
      
      {/* 1. Profile section at the top matching Stella Walton card */}
      <div className="flex flex-col items-center text-center relative py-4">
        <div className="relative w-28 h-28 rounded-full bg-white border border-slate-100 p-1 flex items-center justify-center mb-4 shadow-sm">
          <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-[#DF7A5E] to-[#3C405B] shadow-inner">
            {avatar ? (
              <img src={getHighResAvatar(avatar)} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl">
                {userName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>
        
        <h2 className="text-base font-extrabold text-slate-800 leading-tight mb-1">{userName}</h2>
        <p className="text-xs text-slate-400 font-extrabold uppercase tracking-wider mb-4">Guru</p>

        {/* Profile / Dropdown Action Button */}
        <div className="relative w-full px-8" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full py-2 bg-[#3C405B]/10 hover:bg-[#3C405B]/15 rounded-full text-xs font-bold text-[#3C405B] border-0 cursor-pointer flex items-center justify-center gap-2 transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
            Menu Akun
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute left-8 right-8 mt-2 bg-white rounded-[16px] shadow-lg border border-slate-100 py-1.5 z-50 overflow-hidden text-left"
              >
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs font-bold text-gray-900 truncate">{userName}</p>
                  <p className="text-xs text-gray-500 truncate">{schoolName}</p>
                </div>
                
                <Link
                  to="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-55 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-gray-500" />
                  <span>Pengaturan Akun</span>
                </Link>
                
                <div className="border-t border-gray-100 my-1"></div>
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer border-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2. Mini Calendar Widget matching December 2022 block */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <button 
            onClick={handlePrevMonth}
            className="w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 border-0 cursor-pointer text-xs transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            {monthNames[month]} {year}
          </span>
          <button 
            onClick={handleNextMonth}
            className="w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 border-0 cursor-pointer text-xs transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-black text-slate-400">
          {daysOfWeek.map(day => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* Calendar Grid Cells */}
        <div className="grid grid-cols-7 gap-y-2.5 gap-x-1 text-center text-xs">
          {calendarCells.map((day, idx) => {
            const isToday = isCurrentMonth && day === today.getDate();
            const isClassDay = day && (idx % 7 === 2 || idx % 7 === 4);

            return (
              <div key={idx} className="aspect-square flex items-center justify-center relative">
                {day ? (
                  <button
                    className={`w-7 h-7 rounded-full text-xs font-extrabold transition-all border-0 flex items-center justify-center ${
                      isToday
                        ? "bg-[#DF7A5E] text-white shadow-sm"
                        : isClassDay
                        ? "bg-[#3C405B]/10 text-[#3C405B]"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {day}
                  </button>
                ) : (
                  <span />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Reminders list matching Reminders block */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider px-1">Reminders</h3>
        <div className="space-y-3">
          {reminders.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-3.5 p-3.5 bg-white border border-slate-50 rounded-[20px] shadow-sm transition-all hover:shadow-md"
            >
              <button
                onClick={() => toggleReminder(item.id)}
                className={`w-10 h-10 rounded-[14px] flex items-center justify-center border transition-all duration-200 cursor-pointer ${
                  item.active 
                    ? "bg-[#3C405B] border-[#3C405B] text-white shadow-sm" 
                    : "bg-[#F4F6F9] border-slate-100 text-slate-400"
                }`}
              >
                <Bell className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-bold leading-snug truncate ${item.active ? "text-slate-700" : "text-slate-400 line-through"}`}>
                  {item.title}
                </div>
                <div className="text-xs text-slate-400 font-semibold mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
