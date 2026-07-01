import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { QrCode, Camera, Download, CheckCircle, XCircle, AlertCircle, Search, RefreshCw, Save } from "lucide-react";
import { isAuthorized, readSheetRange, appendSheetRows, updateSheetRange, checkAndRenewToken, hasValidToken } from "../../lib/googleSheetsService";
import { toast } from "sonner";
import { Link, useLocation, useBlocker } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { Html5Qrcode } from "html5-qrcode";


const statusConfig = {
  hadir: { label: "Hadir", bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle },
  sakit: { label: "Sakit", bg: "bg-red-50", text: "text-red-700", icon: XCircle },
  izin: { label: "Izin", bg: "bg-orange-50", text: "text-orange-700", icon: AlertCircle },
  alpha: { label: "Alpha", bg: "bg-gray-100", text: "text-gray-700", icon: XCircle },
};

export default function Attendance() {
  const location = useLocation();
  const { profile } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);

  const [selectedClass, setSelectedClass] = useState("");
  const [subjectList, setSubjectList] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState("Pertemuan 1");

  const [scannerActive, setScannerActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [classList, setClassList] = useState<string[]>([]);

  // Meeting List options
  const meetingList = Array.from({ length: 20 }, (_, i) => `Pertemuan ${i + 1}`);

  // Scanner simulation input
  const [mockNisInput, setMockNisInput] = useState("");

  // Scanned student highlight
  const [highlightedNis, setHighlightedNis] = useState<string | null>(null);

  // Pending filter change popup state
  const [pendingFilterChange, setPendingFilterChange] = useState<{
    type: "class" | "subject" | "meeting" | "refresh";
    value?: string;
  } | null>(null);

  // Export Daily Attendance to CSV
  const handleExportAttendanceCsv = () => {
    if (attendanceList.length === 0) {
      toast.error("Tidak ada data kehadiran untuk diekspor.");
      return;
    }

    const todayStr = attendanceList.find(s => s.date && s.date !== "-")?.date || new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    const classVal = selectedClass || "Semua-Kelas";
    const meetingVal = selectedMeeting || "Pertemuan";

    let csvContent = `REKAPITULASI KEHADIRAN SISWA\n`;
    csvContent += `Kelas,${classVal}\n`;
    csvContent += `Mata Pelajaran,${selectedSubject || "-"}\n`;
    csvContent += `Pertemuan,${meetingVal}\n`;
    csvContent += `Tanggal,${todayStr}\n\n`;
    csvContent += `No,NIS,Nama Siswa,Status Kehadiran,Waktu/Keterangan\n`;

    attendanceList.forEach((s, idx) => {
      const safeName = s.name.replace(/"/g, '""');
      const escapedName = safeName.includes(",") ? `"${safeName}"` : safeName;
      csvContent += `${idx + 1},${s.nis},${escapedName},${s.status.toUpperCase()},${s.time}\n`;
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Kehadiran_${classVal}_${meetingVal.replace(/\s+/g, "_")}_${todayStr.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Data kehadiran berhasil diekspor ke CSV!");
  };

  // Load configuration from local cache and check navigation state
  useEffect(() => {
    // 1. Load Classes
    let initialClass = "";
    const savedClasses = localStorage.getItem("daftar_kelas");
    if (savedClasses) {
      const parsed = savedClasses.split(",").map(c => c.trim()).filter(Boolean);
      if (parsed.length > 0) {
        setClassList(parsed);
        initialClass = parsed[0];
      }
    }

    // 2. Load Subjects from Profile or localStorage
    let initialSubject = "";
    let parsedSubjects: string[] = [];
    if (profile?.subjects) {
      try {
        const subjectsObj = typeof profile.subjects === "string" ? JSON.parse(profile.subjects) : profile.subjects;
        if (Array.isArray(subjectsObj)) {
          parsedSubjects = subjectsObj.map((item: any) => item.name).filter(Boolean);
        }
      } catch (e) {
        console.error("Gagal memparsing subjects dari profile:", e);
      }
    }

    if (parsedSubjects.length === 0) {
      const savedSubjects = localStorage.getItem("mata_pelajaran");
      if (savedSubjects) {
        parsedSubjects = savedSubjects.split(",").map(s => s.trim()).filter(Boolean);
      }
    }

    if (parsedSubjects.length > 0) {
      setSubjectList(parsedSubjects);
      initialSubject = parsedSubjects[0];
    } else {
      setSubjectList([]);
      initialSubject = "";
    }

    // 3. Apply state parameters from navigation if they exist
    const navState = location.state as { className?: string; subject?: string; meetingName?: string } | null;
    if (navState) {
      if (navState.className) setSelectedClass(navState.className);
      else if (initialClass) setSelectedClass(initialClass);

      if (navState.subject) setSelectedSubject(navState.subject);
      else if (initialSubject) setSelectedSubject(initialSubject);

      if (navState.meetingName) setSelectedMeeting(navState.meetingName);
    } else {
      if (initialClass) setSelectedClass(initialClass);
      if (initialSubject) setSelectedSubject(initialSubject);
    }
  }, [location.state, profile]);

  // Automatically update selectedClass when selectedSubject changes, to match class_subject_mapping
  useEffect(() => {
    if (!selectedSubject) return;
    const localMapping = localStorage.getItem("class_subject_mapping");
    if (localMapping) {
      try {
        const mapping = JSON.parse(localMapping);
        const allowedClasses = classList.filter(c => mapping[c]?.includes(selectedSubject));
        if (allowedClasses.length > 0) {
          if (!allowedClasses.includes(selectedClass)) {
            setSelectedClass(allowedClasses[0]);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [selectedSubject, classList, selectedClass]);

  const loadData = async () => {
    if (!selectedClass || !selectedSubject || !selectedMeeting) {
      setAttendanceList([]);
      return;
    }

    if (!isAuthorized()) {
      setAttendanceList([]);
      setIsDemo(false);
      return;
    }

    setLoading(true);
    setIsDemo(false);
    try {
      // 1. Ambil data Siswa untuk mencocokkan kelas
      const siswaRows = await readSheetRange("Siswa!A2:G");
      const allStudents = siswaRows.map((row) => ({
        nis: row[0] || "",
        nisn: row[1] || "",
        name: row[2] || "",
        class: row[3] || "",
        gender: row[4] || "",
        email: row[5] || "",
        phone: row[6] || "",
      }));
      setStudents(allStudents);

      // Extract unique classes and update state & localStorage
      const uniqueClasses = Array.from(new Set(allStudents.map((s) => s.class).filter(Boolean))) as string[];
      if (uniqueClasses.length > 0) {
        setClassList(uniqueClasses);
        localStorage.setItem("daftar_kelas", uniqueClasses.join(","));
      }

      // 2. Ambil data Absensi
      const absensiRows = await readSheetRange("Absensi!A2:I");

      // Filter log yang cocok dengan Kelas, Mapel, dan Pertemuan yang terpilih
      const classLogs = absensiRows
        .map((row, index) => ({
          rowIndex: index + 2, // Indeks baris asli untuk update
          id: row[0] || "",
          tanggal: row[1] || "",
          nis: row[2] || "",
          name: row[3] || "",
          class: row[4] || "",
          status: row[5] || "",
          time: row[6] || "",
          subject: row[7] || "",
          meeting: row[8] || "",
        }))
        .filter((log) =>
          log.class === selectedClass &&
          log.subject === selectedSubject &&
          log.meeting === selectedMeeting
        );
      setAttendanceLogs(classLogs);

      // 3. Gabungkan data siswa di kelas yang terpilih dengan log absensi terpilih
      const classStudents = allStudents.filter((s) => s.class === selectedClass);

      const mergedList = classStudents.map((student, idx) => {
        const log = classLogs.find((l) => l.nis === student.nis);
        return {
          id: idx + 1,
          studentId: student.nis,
          name: student.name,
          nis: student.nis,
          nisn: student.nisn,
          class: student.class,
          status: log ? log.status : "alpha", // Default ke alpha jika belum ada log pertemuan ini
          time: log ? log.time : "-",
          date: log ? log.tanggal : "-",
          logRowIndex: log ? log.rowIndex : null,
        };
      });

      setAttendanceList(mergedList);
    } catch (error) {
      console.error("Gagal menyinkronkan data absensi dengan Google Sheets:", error);
      toast.error("Gagal menyinkronkan dengan Google Sheets.");
      setAttendanceList([]);
      setIsDemo(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClass, selectedSubject, selectedMeeting]);

  const handleStatusChange = async (nis: string, newStatus: string, customKeterangan?: string) => {
    const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    
    let nowTime = "-";
    if (newStatus === "hadir") {
      nowTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    } else if (customKeterangan !== undefined) {
      nowTime = customKeterangan;
    } else {
      const existing = attendanceList.find(s => s.nis === nis);
      if (existing) {
        nowTime = existing.status === "hadir" ? "-" : existing.time;
      }
    }

    setAttendanceList((prev) =>
      prev.map((s) => (s.nis === nis ? { ...s, status: newStatus, time: nowTime, date: today } : s))
    );
  };

  const processScan = async (queryNis: string) => {
    if (!queryNis) return;

    const student = (isDemo ? attendanceList : students).find((s) => s.nis === queryNis);
    if (!student) {
      toast.error(`Siswa dengan NIS ${queryNis} tidak ditemukan.`);
      return;
    }

    if (!isDemo && student.class !== selectedClass) {
      toast.error(`Siswa ${student.name} terdaftar di kelas ${student.class}, bukan kelas ${selectedClass}.`);
      return;
    }

    try {
      await handleStatusChange(student.nis, "hadir");
      toast.success(`Scan Berhasil: ${student.name} dicatat Hadir!`);

      // Trigger highlight animation
      setHighlightedNis(student.nis);

      // Auto-scroll to the scanned student row
      setTimeout(() => {
        const rowElement = document.getElementById(`student-row-${student.nis}`);
        if (rowElement) {
          rowElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 100);

      // Remove highlight after 3 seconds
      setTimeout(() => {
        setHighlightedNis((current) => current === student.nis ? null : current);
      }, 3000);
    } catch (error) {
      console.error(error);
      toast.error("Gagal merekam kehadiran.");
    }
  };

  const handleMockScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockNisInput.trim()) return;

    const queryNis = mockNisInput.trim();
    setMockNisInput("");
    await processScan(queryNis);
  };

  // Camera QR Scanner via html5-qrcode
  useEffect(() => {
    let html5QrCode: any = null;
    if (scannerActive) {
      const qrCodeSuccessCallback = (decodedText: string) => {
        if (decodedText) {
          processScan(decodedText.trim());
        }
      };

      const config = { fps: 10, qrbox: { width: 220, height: 220 } };

      const timer = setTimeout(() => {
        try {
          html5QrCode = new Html5Qrcode("reader");
          html5QrCode.start(
            { facingMode: "environment" },
            config,
            qrCodeSuccessCallback,
            () => {
              // silent fail on scan failure
            }
          ).catch((err: any) => {
            console.error("Gagal memulai kamera:", err);
            toast.error("Gagal mengakses kamera. Silakan periksa izin kamera.");
            setScannerActive(false);
          });
        } catch (e) {
          console.error("Gagal instansiasi Html5Qrcode:", e);
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (html5QrCode) {
          try {
            if (html5QrCode.isScanning) {
              html5QrCode.stop().catch((err: any) => console.error("Error stopping scanner:", err));
            }
          } catch (e) {
            console.error("Error stopping in cleanup:", e);
          }
        }
      };
    }
  }, [scannerActive]);

  const filteredAttendance = attendanceList.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.nis && student.nis.includes(searchQuery)) ||
      student.nisn.includes(searchQuery)
  );

  const stats = {
    total: attendanceList.length,
    hadir: attendanceList.filter((s) => s.status === "hadir").length,
    sakit: attendanceList.filter((s) => s.status === "sakit").length,
    izin: attendanceList.filter((s) => s.status === "izin").length,
  };

  const unsavedChanges = useMemo(() => {
    return attendanceList.filter((student) => {
      const originalLog = attendanceLogs.find((log) => log.nis === student.nis);
      if (originalLog) {
        return student.status !== originalLog.status || student.time !== originalLog.time;
      } else {
        return student.status !== "alpha" || student.time !== "-";
      }
    });
  }, [attendanceList, attendanceLogs]);

  const hasUnsavedChanges = unsavedChanges.length > 0;

  const handleKeteranganLocalChange = (nis: string, value: string) => {
    setAttendanceList((prev) =>
      prev.map((s) => (s.nis === nis ? { ...s, time: value } : s))
    );
  };

  const saveKeterangan = async (nis: string, value: string) => {
    const student = attendanceList.find((s) => s.nis === nis);
    if (!student) return;
    await handleStatusChange(nis, student.status, value.trim() || "-");
  };

  // Warn before browser unload or tab reload/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "Ada perubahan data absensi yang belum disimpan. Yakin ingin keluar?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Block route transitions using react-router useBlocker
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
  );

  const handleSaveAll = async () => {
    if (unsavedChanges.length === 0) return;
    
    if (isDemo) {
      toast.success("Mode Demo: Perubahan berhasil disimpan (lokal)!");
      setAttendanceLogs(attendanceList.map(s => ({
        nis: s.nis,
        status: s.status,
        time: s.time,
        tanggal: s.date,
        rowIndex: s.logRowIndex
      })));
      return;
    }

    setLoading(true);
    try {
      const updates = unsavedChanges.filter(s => s.logRowIndex !== null);
      const inserts = unsavedChanges.filter(s => s.logRowIndex === null);
      
      // 1. Run all updates (parallelized)
      if (updates.length > 0) {
        await Promise.all(
          updates.map(async (student) => {
            const updateRange = `Absensi!F${student.logRowIndex}:G${student.logRowIndex}`;
            await updateSheetRange(updateRange, [[student.status, student.time]]);
          })
        );
      }
      
      // 2. Run all inserts (single batch append)
      if (inserts.length > 0) {
        const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
        const newRows = inserts.map((student, i) => [
          "ABS-" + (Date.now() + i),
          student.date && student.date !== "-" ? student.date : today,
          student.nis,
          student.name,
          student.class,
          student.status,
          student.time,
          selectedSubject,
          selectedMeeting,
        ]);
        await appendSheetRows("Absensi!A:I", newRows);
      }
      
      toast.success("Semua perubahan berhasil disimpan ke Google Sheets!");
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan perubahan ke Google Sheets.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-4 md:space-y-6 flex flex-col h-screen max-h-screen w-full overflow-hidden min-h-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <h1 className="text-2xl font-black text-[#3C405B]">Absensi QR Siswa</h1>
        <div className="flex flex-wrap gap-2.5">
          {isAuthorized() && (
            <button
              onClick={() => {
                if (hasUnsavedChanges) {
                  setPendingFilterChange({ type: "refresh" });
                } else {
                  loadData();
                }
              }}
              disabled={loading}
              className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[12px] transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
          )}

          {/* Selector Mata Pelajaran */}
          <select
            value={selectedSubject}
            onChange={(e) => {
              const val = e.target.value;
              if (hasUnsavedChanges) {
                setPendingFilterChange({ type: "subject", value: val });
              } else {
                setSelectedSubject(val);
              }
            }}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold cursor-pointer"
          >
            {subjectList.length === 0 ? (
              <option value="">Belum Ada Mapel</option>
            ) : (
              subjectList.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))
            )}
          </select>

          {/* Selector Kelas */}
          <select
            value={selectedClass}
            onChange={(e) => {
              const val = e.target.value;
              if (hasUnsavedChanges) {
                setPendingFilterChange({ type: "class", value: val });
              } else {
                setSelectedClass(val);
              }
            }}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold cursor-pointer"
          >
            {(() => {
              const localMapping = localStorage.getItem("class_subject_mapping");
              let filteredClasses = [...classList];
              if (localMapping) {
                try {
                  const mapping = JSON.parse(localMapping);
                  const allowed = classList.filter(c => mapping[c]?.includes(selectedSubject));
                  if (allowed.length > 0) {
                    filteredClasses = allowed;
                  }
                } catch (e) {}
              }
              
              if (filteredClasses.length === 0) {
                return <option value="">Belum Ada Kelas</option>;
              }
              return filteredClasses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ));
            })()}
          </select>

          {/* Selector Pertemuan */}
          <select
            value={selectedMeeting}
            onChange={(e) => {
              const val = e.target.value;
              if (hasUnsavedChanges) {
                setPendingFilterChange({ type: "meeting", value: val });
              } else {
                setSelectedMeeting(val);
              }
            }}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold cursor-pointer"
          >
            {meetingList.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {hasUnsavedChanges && (
            <button
              onClick={handleSaveAll}
              disabled={loading}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[12px] font-semibold flex items-center gap-2 transition-all text-sm shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 animate-pulse"
            >
              <Save className="w-4 h-4" />
              Simpan ({unsavedChanges.length})
            </button>
          )}

          {isAuthorized() && (
            <a
              href={`https://docs.google.com/spreadsheets/d/${localStorage.getItem("google_spreadsheet_id")}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[12px] font-semibold flex items-center gap-2 transition-colors text-sm border border-gray-200"
            >
              <Download className="w-4 h-4" />
              Buka Spreadsheet
            </a>
          )}

          {attendanceList.length > 0 && (
            <button
              onClick={handleExportAttendanceCsv}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] font-semibold flex items-center gap-2 transition-colors text-sm shadow-md shadow-blue-600/10 border border-blue-600 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Ekspor Absen (CSV)
            </button>
          )}
        </div>
      </div>

      {/* Onboarding Alert */}
      {!isAuthorized() && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-[12px] flex items-center gap-3 flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="text-sm">
            <strong>Database Belum Terhubung:</strong> Hubungkan Google Drive Anda di halaman Dashboard untuk mulai merekam kehadiran siswa secara live.
          </div>
        </div>
      )}

      {isAuthorized() && !hasValidToken() && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-[12px] flex items-center gap-3 flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 animate-pulse" />
          <div className="text-sm flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <strong>Sesi Google Drive Kedaluwarsa:</strong> Sesi koneksi Google Drive Anda telah kedaluwarsa. Silakan hubungkan ulang untuk melanjutkan sinkronisasi data.
            </div>
            <Link
              to="/dashboard"
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors inline-block text-center cursor-pointer whitespace-nowrap self-start sm:self-center font-sans"
            >
              Hubungkan Ulang
            </Link>
          </div>
        </div>
      )}

      {/* Content Area */}
      {!isAuthorized() ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-[12px] border border-gray-200 shadow-sm flex flex-col items-center justify-center space-y-4 flex-1">
          <AlertCircle className="w-12 h-12 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">Google Drive Belum Terhubung</h3>
          <p className="text-gray-600 max-w-md text-sm">
            Untuk mulai menggunakan absensi QR, silakan hubungkan akun Google Drive Anda terlebih dahulu di halaman Dashboard.
          </p>
          <Link
            to="/dashboard"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] font-semibold text-sm transition-colors cursor-pointer inline-block"
          >
            Pergi ke Dashboard
          </Link>
        </div>
      ) : !hasValidToken() ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-[12px] border border-gray-200 shadow-sm flex flex-col items-center justify-center space-y-4 flex-1">
          <RefreshCw className="w-12 h-12 text-amber-500" />
          <h3 className="text-lg font-semibold text-gray-900">Sesi Google Drive Kedaluwarsa</h3>
          <p className="text-gray-600 max-w-md text-sm">
            Koneksi aman Anda ke Google Drive telah berakhir. Silakan hubungkan ulang sesi Anda melalui Dashboard untuk menyinkronkan data absensi.
          </p>
          <Link
            to="/dashboard"
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-[12px] font-semibold text-sm transition-colors cursor-pointer inline-block"
          >
            Hubungkan Ulang di Dashboard
          </Link>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-shrink-0">
            <div className="bg-white rounded-[10px] p-4 border border-gray-200">
              <div className="text-xs md:text-sm text-gray-500 mb-1">Total Siswa</div>
              <div className="text-2xl md:text-3xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-emerald-50 rounded-[10px] p-4 border border-emerald-200">
              <div className="text-xs md:text-sm text-emerald-700 mb-1 font-medium">Hadir</div>
              <div className="text-2xl md:text-3xl font-bold text-emerald-600">{stats.hadir}</div>
            </div>
            <div className="bg-red-50 rounded-[10px] p-4 border border-red-200">
              <div className="text-xs md:text-sm text-red-700 mb-1 font-medium">Sakit</div>
              <div className="text-2xl md:text-3xl font-bold text-red-600">{stats.sakit}</div>
            </div>
            <div className="bg-orange-50 rounded-[10px] p-4 border border-orange-200">
              <div className="text-xs md:text-sm text-orange-700 mb-1 font-medium">Izin</div>
              <div className="text-2xl md:text-3xl font-bold text-orange-600">{stats.izin}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
            {/* QR Scanner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-1 bg-white rounded-[12px] p-6 border border-gray-200 flex flex-col h-full min-h-0"
            >
              <style>{`
                #reader video {
                  width: 100% !important;
                  height: 100% !important;
                  object-fit: cover !important;
                  border-radius: 12px;
                }
              `}</style>

              <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                <QrCode className="w-6 h-6 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">QR Scanner</h2>
              </div>

              {/* Flex container for the Scanner box & Stop/Start button */}
              <div className="flex-1 flex flex-col justify-center min-h-0 mb-4">
                <div className="flex-1 min-h-[180px] max-h-[300px] bg-gradient-to-br from-blue-50 to-purple-50 rounded-[12px] flex items-center justify-center mb-4 relative overflow-hidden">
                  {scannerActive ? (
                    <div id="reader" className="w-full h-full relative z-10"></div>
                  ) : (
                    <div className="text-center p-6">
                      <QrCode className="w-16 h-16 text-blue-300 mx-auto mb-3" />
                      <p className="text-gray-600 text-sm">Klik tombol di bawah untuk mulai scan</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setScannerActive(!scannerActive)}
                  className={`w-full py-2.5 rounded-[12px] font-medium transition-colors cursor-pointer flex-shrink-0 ${
                    scannerActive ? "bg-red-600 hover:bg-red-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {scannerActive ? "Stop Scanner" : "Mulai Scan QR"}
                </button>
              </div>

              {/* Form Input NIS Manual (dibawahnya) */}
              <form
                onSubmit={handleMockScanSubmit}
                className="bg-gray-50 border border-gray-200 p-4 rounded-[12px] flex flex-col items-center w-full space-y-3 flex-shrink-0"
              >
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider text-center">
                  Input NIS Manual / Simulasi
                </p>
                <div className="flex w-full gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={mockNisInput}
                    onChange={(e) => setMockNisInput(e.target.value.replace(/\D/g, ""))}
                    placeholder="Masukkan NIS Siswa (hanya angka)"
                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-[12px] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Kirim
                  </button>
                </div>
              </form>
            </motion.div>

            {/* Attendance List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2 bg-white rounded-[12px] p-6 border border-gray-200 flex flex-col h-full min-h-0"
            >
              <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-gray-900">Daftar Kehadiran</h2>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full">
                    {attendanceList.find(s => s.date && s.date !== "-")?.date || new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari siswa..."
                    className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-[12px] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center text-gray-500 flex-1 flex flex-col justify-center items-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                  Menyinkronkan data kehadiran dengan Google Sheets...
                </div>
              ) : filteredAttendance.length === 0 ? (
                <div className="p-12 text-center text-gray-500 flex-1 flex flex-col justify-center items-center">
                  Tidak ada data siswa untuk kelas ini.
                </div>
              ) : (
                <div className="space-y-2 flex-1 overflow-y-auto pr-1 min-h-0">
                  {filteredAttendance.map((student, index) => {
                    const config = statusConfig[student.status as keyof typeof statusConfig] || statusConfig.alpha;
                    const StatusIcon = config.icon;
                    const isHighlighted = student.nis === highlightedNis;

                    return (
                      <motion.div
                        key={student.nis}
                        id={`student-row-${student.nis}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex items-center gap-4 p-4 rounded-[12px] border transition-all duration-500 ${
                          isHighlighted
                            ? "bg-emerald-100/60 border-transparent scale-[1.01] shadow-sm"
                            : "bg-gray-50 border-gray-100 hover:bg-gray-100"
                        }`}
                      >
                        {/* Area Nama & Avatar */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {student.name.charAt(0)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 truncate">{student.name}</div>
                            <div className="text-sm text-gray-500 font-mono">NIS: {student.nis} • NISN: {student.nisn}</div>
                          </div>
                        </div>

                        {/* Status Buttons Group */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* Hadir Button */}
                          <button
                            onClick={() => handleStatusChange(student.nis, "hadir")}
                            className={`w-[76px] py-1.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              student.status === "hadir"
                                ? "bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-sm font-bold scale-[1.03]"
                                : "border border-gray-200 text-gray-400 bg-white hover:bg-gray-50 hover:text-gray-600"
                            }`}
                          >
                            {student.status === "hadir" && <CheckCircle className="w-3.5 h-3.5" />}
                            Hadir
                          </button>

                          {/* Sakit Button */}
                          <button
                            onClick={() => handleStatusChange(student.nis, "sakit")}
                            className={`w-[76px] py-1.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              student.status === "sakit"
                                ? "bg-red-50 border border-red-200 text-red-700 shadow-sm font-bold scale-[1.03]"
                                : "border border-gray-200 text-gray-400 bg-white hover:bg-gray-50 hover:text-gray-600"
                            }`}
                          >
                            {student.status === "sakit" && <XCircle className="w-3.5 h-3.5" />}
                            Sakit
                          </button>

                          {/* Izin Button */}
                          <button
                            onClick={() => handleStatusChange(student.nis, "izin")}
                            className={`w-[76px] py-1.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              student.status === "izin"
                                ? "bg-orange-50 border border-orange-200 text-orange-700 shadow-sm font-bold scale-[1.03]"
                                : "border border-gray-200 text-gray-400 bg-white hover:bg-gray-50 hover:text-gray-600"
                            }`}
                          >
                            {student.status === "izin" && <AlertCircle className="w-3.5 h-3.5" />}
                            Izin
                          </button>

                          {/* Alpha Button */}
                          <button
                            onClick={() => handleStatusChange(student.nis, "alpha")}
                            className={`w-[76px] py-1.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              student.status === "alpha"
                                ? "bg-gray-100 border border-gray-300 text-gray-700 shadow-sm font-bold scale-[1.03]"
                                : "border border-gray-200 text-gray-400 bg-white hover:bg-gray-50 hover:text-gray-600"
                            }`}
                          >
                            {student.status === "alpha" && <XCircle className="w-3.5 h-3.5" />}
                            Alpha
                          </button>
                        </div>

                        {/* Keterangan Column */}
                        <div className="flex-shrink-0 w-40 flex justify-start">
                          {student.status === "hadir" ? (
                            <div className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-[12px] text-xs text-emerald-600 font-mono font-bold text-left flex items-center justify-start min-h-[34px]">
                              {student.time !== "-" ? student.time : "-"}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={student.time === "-" ? "" : student.time}
                              placeholder="Tulis keterangan..."
                              onChange={(e) => handleKeteranganLocalChange(student.nis, e.target.value)}
                              onBlur={(e) => saveKeterangan(student.nis, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.currentTarget.blur();
                                }
                              }}
                              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-[12px] text-xs text-gray-900 font-medium text-left focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[34px]"
                            />
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}

      {/* Filter Change Blocker Alert Modal */}
      {pendingFilterChange && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] p-6 max-w-sm w-full border border-gray-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-4 flex-shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Perubahan Belum Disimpan</h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Ada data absensi yang belum Anda simpan ke Google Sheets. Jika Anda mengganti filter atau me-refresh, perubahan tersebut akan hilang.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingFilterChange(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-[12px] text-sm transition-colors cursor-pointer"
              >
                Kembali
              </button>
              <button
                onClick={() => {
                  const { type, value } = pendingFilterChange;
                  if (type === "class" && value) setSelectedClass(value);
                  else if (type === "subject" && value) setSelectedSubject(value);
                  else if (type === "meeting" && value) setSelectedMeeting(value);
                  else if (type === "refresh") loadData();
                  setPendingFilterChange(null);
                }}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-[12px] text-sm transition-colors cursor-pointer"
              >
                Buang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Blocker Alert Modal */}
      {blocker.state === "blocked" && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] p-6 max-w-sm w-full border border-gray-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-4 flex-shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Perubahan Belum Disimpan</h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Ada data absensi yang belum Anda simpan ke Google Sheets. Jika Anda meninggalkan halaman ini, perubahan tersebut akan hilang.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => blocker.reset()}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-[12px] text-sm transition-colors cursor-pointer"
              >
                Kembali
              </button>
              <button
                onClick={() => blocker.proceed()}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-[12px] text-sm transition-colors cursor-pointer"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

