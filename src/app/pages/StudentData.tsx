import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Search, Download, QrCode, Edit, Trash2, Plus, RefreshCw, BookOpen } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import {
  isAuthorized,
  readSheetRange,
  appendSheetRows,
  updateSheetRange,
  batchUpdateSheetRanges,
  writeDatabaseConfig,
  readDatabaseConfig,
  hasValidToken
} from "../../lib/googleSheetsService";
import { toast } from "sonner";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { EmptyDataState, GoogleDriveEmptyState, GoogleDriveNotice } from "../components/GoogleDriveState";


export default function StudentData() {
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [classList, setClassList] = useState<string[]>([]);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<any | null>(null);
  const [newStudent, setNewStudent] = useState({
    nis: "",
    name: "",
    nisn: "",
    class: "",
    gender: "L",
    email: "",
    phone: "",
  });
  const [editStudent, setEditStudent] = useState({
    originalNis: "",
    rowIndex: null as number | null,
    nis: "",
    name: "",
    nisn: "",
    class: "",
    gender: "L",
    email: "",
    phone: "",
  });
  const [showCustomClassInput, setShowCustomClassInput] = useState(false);
  const [customClassValue, setCustomClassValue] = useState("");
  const [showEditCustomClassInput, setShowEditCustomClassInput] = useState(false);
  const [editCustomClassValue, setEditCustomClassValue] = useState("");

  // Class Subject Mapping states
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  const [classSubjectMapping, setClassSubjectMapping] = useState<Record<string, string[]>>({});

  // Load configuration from local cache
  useEffect(() => {
    const savedClasses = localStorage.getItem("daftar_kelas");
    if (savedClasses) {
      const parsed = savedClasses.split(",").map(c => c.trim()).filter(Boolean);
      if (parsed.length > 0) {
        setClassList(parsed);
        setNewStudent(prev => ({ ...prev, class: parsed[0] }));
      } else {
        setClassList([]);
        setNewStudent(prev => ({ ...prev, class: "" }));
        setShowCustomClassInput(true); // Automatically show custom input if list is empty
      }
    } else {
      setClassList([]);
      setNewStudent(prev => ({ ...prev, class: "" }));
      setShowCustomClassInput(true); // Automatically show custom input if list is empty
    }

    // Load subjects
    const savedSubjects = localStorage.getItem("mata_pelajaran");
    if (savedSubjects) {
      setAllSubjects(savedSubjects.split(",").map(s => s.trim()).filter(Boolean));
    } else {
      setAllSubjects(["Matematika"]);
    }

    // Load local mapping
    const localMapping = localStorage.getItem("class_subject_mapping");
    if (localMapping) {
      try {
        setClassSubjectMapping(JSON.parse(localMapping));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const loadData = async () => {
    if (!isAuthorized() || !hasValidToken()) {
      setStudents([]);
      return;
    }

    setLoading(true);
    try {
      const siswaRows = await readSheetRange("Siswa!A2:G");

      const parsedSiswa = siswaRows.map((row, index) => ({
        rowIndex: index + 2,
        nis: row[0],
        nisn: row[1] || "",
        name: row[2] || "",
        class: row[3] || "",
        gender: row[4] || "",
        email: row[5] || "",
        phone: row[6] || "",
        avgScore: 0,
      }));

      // Ambil nilai dari tab Penilaian untuk menghitung rata-rata
      try {
        const gradeRows = await readSheetRange("Penilaian!A2:G");
        const studentGradesMap: Record<string, number[]> = {};
        const currentMonth = new Date().getMonth();
        const activeSemester = currentMonth >= 6 ? "Ganjil" : "Genap";

        gradeRows.forEach((row) => {
          const nis = row[1];
          const rawBabName = row[5] || "";
          const score = parseInt(row[6]) || 0;

          if (nis) {
            let rowSemester = "Ganjil"; // Default legacy data to Ganjil
            if (rawBabName.includes("|")) {
              const parts = rawBabName.split("|");
              if (parts.length >= 4) {
                rowSemester = parts[0];
              }
            }
            if (rowSemester === activeSemester) {
              if (!studentGradesMap[nis]) studentGradesMap[nis] = [];
              studentGradesMap[nis].push(score);
            }
          }
        });

        parsedSiswa.forEach((s) => {
          const grades = studentGradesMap[s.nis];
          if (grades && grades.length > 0) {
            const sum = grades.reduce((acc, g) => acc + g, 0);
            s.avgScore = Math.round(sum / grades.length);
          }
        });
      } catch (e) {
        console.error("Gagal meload rata-rata nilai:", e);
      }

      setStudents(parsedSiswa);
      const uniqueClasses = Array.from(new Set(parsedSiswa.map(s => s.class).filter(Boolean)));
      setClassList(uniqueClasses);
      localStorage.setItem("daftar_kelas", uniqueClasses.join(","));

      // Load Class-Subject Mapping from Konfigurasi sheet
      try {
        const configMap = await readDatabaseConfig();
        if (configMap.class_subject_mapping) {
          const parsedMapping = JSON.parse(configMap.class_subject_mapping);
          setClassSubjectMapping(parsedMapping);
          localStorage.setItem("class_subject_mapping", configMap.class_subject_mapping);
        } else {
          const localMapping = localStorage.getItem("class_subject_mapping");
          if (localMapping) {
            setClassSubjectMapping(JSON.parse(localMapping));
          }
        }
      } catch (e) {
        console.error("Gagal meload konfigurasi mapel kelas:", e);
        const localMapping = localStorage.getItem("class_subject_mapping");
        if (localMapping) {
          setClassSubjectMapping(JSON.parse(localMapping));
        }
      }
    } catch (error) {
      console.error("Gagal meload data dari Google Sheets:", error);
      toast.error("Gagal mengambil data dari Google Sheets.");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized()) {
      toast.error("Hubungkan Google Drive Anda terlebih dahulu!");
      return;
    }
    if (!hasValidToken()) {
      toast.error("Sesi Google Drive kedaluwarsa. Silakan hubungkan ulang di Dashboard.");
      return;
    }

    const nisTrimmed = newStudent.nis.trim();
    if (!nisTrimmed) {
      toast.error("NIS wajib diisi.");
      return;
    }

    if (!/^\d+$/.test(nisTrimmed)) {
      toast.error("NIS hanya boleh berisi angka.");
      return;
    }

    const finalClass = (showCustomClassInput ? customClassValue.trim() : newStudent.class).trim();
    if (!finalClass) {
      toast.error("Kelas wajib diisi.");
      return;
    }

    const nisExists = students.some(
      (s) => s.nis.trim() === nisTrimmed
    );
    if (nisExists) {
      toast.error("NIS sudah terdaftar. Gunakan NIS lain yang unik.");
      return;
    }

    setLoading(true);
    try {
      const newRow = [
        newStudent.nis.trim(),
        newStudent.nisn.trim(),
        newStudent.name.trim(),
        finalClass,
        newStudent.gender,
        newStudent.email.trim(),
        newStudent.phone.trim(),
      ];

      // Simpan ke Google Sheets Siswa
      await appendSheetRows("Siswa!A:G", [newRow]);

      // Cek apakah kelas baru perlu ditambahkan ke dropdown lokal
      const classExists = classList.some(c => c.toLowerCase() === finalClass.toLowerCase());
      if (!classExists) {
        const updatedClasses = [...classList, finalClass];
        setClassList(updatedClasses);
        localStorage.setItem("daftar_kelas", updatedClasses.join(","));
        toast.info(`Kelas "${finalClass}" otomatis ditambahkan.`);
      }

      // Inisialisasi baris nilai default untuk siswa tersebut di tab Penilaian (Format Baru: 7 kolom)
      const savedSubjects = localStorage.getItem("mata_pelajaran");
      const subjects = savedSubjects
        ? savedSubjects.split(",").map((s) => s.trim()).filter(Boolean)
        : ["Matematika"];

      const currentMonth = new Date().getMonth();
      const activeSemester = currentMonth >= 6 ? "Ganjil" : "Genap";
      const defaultCols = [
        `${activeSemester}|Formatif|Tugas|TP 1`,
        `${activeSemester}|Sumatif|STP|TP 1`,
        `${activeSemester}|Formatif|Tugas|TP 2`,
        `${activeSemester}|Sumatif|STP|TP 2`,
        `${activeSemester}|Sumatif|STS|`,
        `${activeSemester}|Sumatif|SAS|`
      ];
      const newGradeRows: any[] = [];
      const nowTime = Date.now();
      let index = 0;

      subjects.forEach((subject) => {
        defaultCols.forEach((colId) => {
          newGradeRows.push([
            `PEN-${nowTime}-${index++}`,
            newStudent.nis.trim(),
            newStudent.name.trim(),
            finalClass,
            subject,
            colId,
            "0",
          ]);
        });
      });

      if (newGradeRows.length > 0) {
        await appendSheetRows("Penilaian!A:G", newGradeRows);
      }

      toast.success("Siswa baru berhasil disimpan ke Google Sheets!");
      setIsAddOpen(false);
      setShowCustomClassInput(false);
      setCustomClassValue("");
      setNewStudent({
        nis: "",
        name: "",
        nisn: "",
        class: classList[0] || "",
        gender: "L",
        email: "",
        phone: "",
      });
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan data siswa ke Google Sheets.");
    } finally {
      setLoading(false);
    }
  };

  const openEditStudent = (student: any) => {
    const classExists = classList.includes(student.class || "");
    setEditStudent({
      originalNis: student.nis || "",
      rowIndex: student.rowIndex ?? null,
      nis: student.nis || "",
      name: student.name || "",
      nisn: student.nisn || "",
      class: student.class || "",
      gender: student.gender || "L",
      email: student.email || "",
      phone: student.phone || "",
    });
    setShowEditCustomClassInput(!classExists);
    setEditCustomClassValue(classExists ? "" : student.class || "");
    setIsEditOpen(true);
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasValidToken()) {
      toast.error("Sesi Google Drive kedaluwarsa. Silakan hubungkan ulang di Dashboard.");
      return;
    }

    const rowIndex = editStudent.rowIndex;
    if (!rowIndex) {
      toast.error("Baris data siswa tidak ditemukan. Silakan refresh data lalu coba lagi.");
      return;
    }

    const nisTrimmed = editStudent.nis.trim();
    if (!nisTrimmed || !/^\d+$/.test(nisTrimmed)) {
      toast.error("NIS wajib diisi dan hanya boleh berisi angka.");
      return;
    }

    const finalClass = (showEditCustomClassInput ? editCustomClassValue.trim() : editStudent.class).trim();
    if (!finalClass) {
      toast.error("Kelas wajib diisi.");
      return;
    }

    const duplicateNis = students.some((s) => s.nis === nisTrimmed && s.nis !== editStudent.originalNis);
    if (duplicateNis) {
      toast.error("NIS sudah dipakai siswa lain.");
      return;
    }

    setLoading(true);
    try {
      const updatedRow = [
        nisTrimmed,
        editStudent.nisn.trim(),
        editStudent.name.trim(),
        finalClass,
        editStudent.gender,
        editStudent.email.trim(),
        editStudent.phone.trim(),
      ];

      await updateSheetRange(`Siswa!A${rowIndex}:G${rowIndex}`, [updatedRow]);

      const relatedUpdates: { range: string; values: any[][] }[] = [];

      try {
        const gradeRows = await readSheetRange("Penilaian!A2:G");
        gradeRows.forEach((row, index) => {
          if (row[1] === editStudent.originalNis) {
            const sheetRow = index + 2;
            relatedUpdates.push({
              range: `Penilaian!B${sheetRow}:D${sheetRow}`,
              values: [[nisTrimmed, editStudent.name.trim(), finalClass]]
            });
          }
        });
      } catch (err) {
        console.warn("Gagal menyiapkan sinkronisasi Penilaian:", err);
      }

      try {
        const attendanceRows = await readSheetRange("Absensi!A2:I");
        attendanceRows.forEach((row, index) => {
          if (row[2] === editStudent.originalNis) {
            const sheetRow = index + 2;
            relatedUpdates.push({
              range: `Absensi!C${sheetRow}:E${sheetRow}`,
              values: [[nisTrimmed, editStudent.name.trim(), finalClass]]
            });
          }
        });
      } catch (err) {
        console.warn("Gagal menyiapkan sinkronisasi Absensi:", err);
      }

      if (relatedUpdates.length > 0) {
        await batchUpdateSheetRanges(relatedUpdates);
      }

      toast.success("Data siswa berhasil diperbarui.");
      setIsEditOpen(false);
      setSelectedStudent(null);
      await loadData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Gagal memperbarui data siswa.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    if (!hasValidToken()) {
      toast.error("Sesi Google Drive kedaluwarsa. Silakan hubungkan ulang di Dashboard.");
      return;
    }

    setLoading(true);
    try {
      const siswaRows = await readSheetRange("Siswa!A2:G");
      const filteredStudentsRows = siswaRows.filter((row) => row[0] !== studentToDelete.nis);
      const siswaUpdateRows = [...filteredStudentsRows];
      for (let i = 0; i < siswaRows.length - filteredStudentsRows.length; i++) {
        siswaUpdateRows.push(["", "", "", "", "", "", ""]);
      }
      if (siswaRows.length > 0) {
        await updateSheetRange(`Siswa!A2:G${siswaRows.length + 1}`, siswaUpdateRows);
      }

      try {
        const gradeRows = await readSheetRange("Penilaian!A2:G");
        const filteredGradeRows = gradeRows.filter((row) => row[1] !== studentToDelete.nis);
        const gradeUpdateRows = [...filteredGradeRows];
        for (let i = 0; i < gradeRows.length - filteredGradeRows.length; i++) {
          gradeUpdateRows.push(["", "", "", "", "", "", ""]);
        }
        if (gradeRows.length > 0) {
          await updateSheetRange(`Penilaian!A2:G${gradeRows.length + 1}`, gradeUpdateRows);
        }
      } catch (err) {
        console.warn("Gagal menghapus nilai terkait siswa:", err);
      }

      toast.success(`Siswa ${studentToDelete.name} berhasil dihapus.`);
      setStudentToDelete(null);
      setSelectedStudent(null);
      await loadData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Gagal menghapus data siswa.");
    } finally {
      setLoading(false);
    }
  };

  const downloadBatchQRCodes = async (mode: "filtered" | "all") => {
    const list = mode === "filtered" ? filteredStudents : students;
    if (list.length === 0) {
      toast.error("Tidak ada data siswa untuk diunduh.");
      return;
    }

    toast.info(`Mempersiapkan unduhan ${list.length} QR Code...`);

    for (let i = 0; i < list.length; i++) {
      const student = list[i];
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${student.nis}`;

      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `QR_${student.class}_${student.name.replace(/\s+/g, "_")}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);

        await new Promise((resolve) => setTimeout(resolve, 250));
      } catch (error) {
        console.error("Gagal mendownload QR Code untuk siswa: " + student.name, error);
      }
    }
    toast.success(`Berhasil mengunduh ${list.length} QR Code!`);
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.nis.includes(searchQuery);
    const matchesClass = selectedClass === "all" || student.class === selectedClass;
    return matchesSearch && matchesClass;
  });

  const totalSiswa = students.length;
  const totalLaki = students.filter((s) => s.gender === "L" || s.gender === "Laki-laki").length;
  const totalPerempuan = students.filter((s) => s.gender === "P" || s.gender === "Perempuan").length;
  const avgClassScore =
    students.length > 0
      ? Math.round(students.reduce((acc, s) => acc + (s.avgScore || 0), 0) / students.length)
      : 0;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-[#3C405B]">Data Siswa</h1>
        <div className="flex gap-3">
          {isAuthorized() && (
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[12px] transition-colors disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
          )}

          {isAuthorized() && (
            <button
              onClick={() => {
                // Refresh subjects list in case it changed in Settings
                const savedSubjects = localStorage.getItem("mata_pelajaran");
                if (savedSubjects) {
                  setAllSubjects(savedSubjects.split(",").map(s => s.trim()).filter(Boolean));
                }
                setIsMappingOpen(true);
              }}
              className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-750 rounded-[12px] font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm text-sm"
            >
              <BookOpen className="w-4 h-4 text-gray-500" />
              Atur Mapel Kelas
            </button>
          )}

          {isAuthorized() && (
            <button
              onClick={() => downloadBatchQRCodes("filtered")}
              className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-750 rounded-[12px] font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm text-sm"
            >
              <QrCode className="w-4 h-4 text-blue-500" />
              Download QR ({filteredStudents.length})
            </button>
          )}

          <button
            onClick={() => {
              if (!isAuthorized()) {
                toast.error("Silakan hubungkan Google Drive di Dashboard terlebih dahulu!");
                return;
              }
              if (!hasValidToken()) {
                toast.error("Sesi Google Drive kedaluwarsa. Silakan hubungkan ulang di Dashboard.");
                return;
              }
              setIsAddOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] font-medium flex items-center gap-2 transition-colors cursor-pointer text-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Siswa
          </button>
        </div>
      </div>

      {/* Onboarding Alert */}
      {!isAuthorized() && (
        <GoogleDriveNotice
          state="disconnected"
          message="Hubungkan Google Drive di Dashboard untuk mulai mengisi dan menyinkronkan data siswa."
        />
      )}

      {isAuthorized() && !hasValidToken() && (
        <GoogleDriveNotice state="expired" />
      )}

      {/* Content Area */}
      {!isAuthorized() ? (
        <GoogleDriveEmptyState
          state="disconnected"
          description="Data siswa tersimpan di Google Sheets milik sekolah. Hubungkan Drive sekali, lalu halaman ini akan menampilkan database siswa aktif."
          steps={["Buka Dashboard.", "Klik Hubungkan Google Drive.", "Kembali ke Data Siswa dan klik Tambah Siswa."]}
        />
      ) : !hasValidToken() ? (
        <GoogleDriveEmptyState
          state="expired"
          description="Sesi Google Drive sudah tidak aktif, jadi data siswa tidak bisa dibaca atau disimpan sampai Anda menghubungkan ulang."
          steps={["Klik Hubungkan Ulang.", "Pilih akun Google yang sama.", "Kembali ke halaman ini dan refresh data siswa."]}
        />
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white rounded-[12px] p-4 border border-gray-200">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama atau NIS..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                />
              </div>

              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-[12px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              >
                <option value="all">Semua Kelas</option>
                {classList.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {isAuthorized() && (
                <a
                  href={`https://docs.google.com/spreadsheets/d/${localStorage.getItem("google_spreadsheet_id")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[12px] font-medium flex items-center gap-2 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  Buka Spreadsheet
                </a>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-[12px] p-4 border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">Total Siswa</div>
              <div className="text-3xl font-bold text-gray-900">{totalSiswa}</div>
            </div>
            <div className="bg-blue-50 rounded-[12px] p-4 border border-blue-200">
              <div className="text-sm text-blue-700 mb-1">Laki-laki</div>
              <div className="text-3xl font-bold text-blue-600">{totalLaki}</div>
            </div>
            <div className="bg-pink-50 rounded-[12px] p-4 border border-pink-200">
              <div className="text-sm text-pink-700 mb-1">Perempuan</div>
              <div className="text-3xl font-bold text-pink-600">{totalPerempuan}</div>
            </div>
            <div className="bg-emerald-50 rounded-[12px] p-4 border border-emerald-200">
              <div className="text-sm text-emerald-700 mb-1">Rata-rata Nilai</div>
              <div className="text-3xl font-bold text-emerald-600">{avgClassScore}</div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-[12px] border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                Sedang sinkronisasi data dengan Google Sheets...
              </div>
            ) : filteredStudents.length === 0 ? (
              <EmptyDataState
                icon={<Plus className="w-7 h-7" />}
                title={students.length === 0 ? "Belum Ada Data Siswa" : "Siswa Tidak Ditemukan"}
                description={
                  students.length === 0
                    ? "Database sudah siap, tetapi belum ada siswa yang tercatat. Tambahkan siswa pertama agar absensi, nilai, dan QR bisa dipakai."
                    : "Tidak ada siswa yang cocok dengan pencarian atau filter kelas saat ini."
                }
                steps={
                  students.length === 0
                    ? ["Klik Tambah Siswa.", "Isi identitas dasar dan kelas.", "Gunakan QR siswa untuk absensi."]
                    : undefined
                }
                action={
                  students.length === 0 ? (
                    <button
                      onClick={() => setIsAddOpen(true)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] font-semibold text-sm transition-colors cursor-pointer inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Siswa Pertama
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedClass("all");
                      }}
                      className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-[12px] font-semibold text-sm transition-colors cursor-pointer"
                    >
                      Reset Filter
                    </button>
                  )
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Nama</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">NIS</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Kelas</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">L/P</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Rata-rata</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">QR Code</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStudents.map((student) => (
                      <tr
                        key={student.nis}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedStudent(student)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{student.name}</div>
                              <div className="text-sm text-gray-500">{student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-900">{student.nis}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                            {student.class}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-900">{student.gender}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`font-semibold ${student.avgScore >= 85
                                ? "text-emerald-600"
                                : student.avgScore >= 70
                                  ? "text-blue-600"
                                  : "text-orange-600"
                              }`}
                          >
                            {student.avgScore}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button className="p-2 hover:bg-gray-100 rounded-[12px] transition-colors">
                            <QrCode className="w-5 h-5 text-gray-600" />
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditStudent(student);
                              }}
                              className="p-2 hover:bg-blue-50 text-blue-600 rounded-[12px] transition-colors"
                              title="Edit siswa"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setStudentToDelete(student);
                              }}
                              className="p-2 hover:bg-red-50 text-red-600 rounded-[12px] transition-colors"
                              title="Hapus siswa"
                            >
                              <Trash2 className="w-4 h-4" />
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
        </>
      )}

      {/* Student Detail Sheet */}
      <Sheet open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <SheetContent className="w-[500px] p-6 overflow-y-auto">
          {selectedStudent && (
            <>
              <SheetHeader>
                <SheetTitle>Detail Siswa</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-[12px] flex items-center justify-center text-white text-3xl font-bold">
                    {selectedStudent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedStudent.name}</h3>
                    <p className="text-gray-500">NIS: {selectedStudent.nis}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Kelas</div>
                    <div className="font-medium text-gray-900">{selectedStudent.class}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Email</div>
                    <div className="font-medium text-gray-900">{selectedStudent.email}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Telepon</div>
                    <div className="font-medium text-gray-900">{selectedStudent.phone}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Rata-rata Nilai</div>
                    <div className="text-2xl font-bold text-emerald-600">{selectedStudent.avgScore}</div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-[12px] p-4">
                  <div className="text-sm text-gray-500 mb-3">QR Code Siswa</div>
                  <div className="aspect-square bg-white rounded-[12px] p-4 flex items-center justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedStudent.nis}`}
                      alt={`QR Code ${selectedStudent.name}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <a
                    href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${selectedStudent.nis}`}
                    target="_blank"
                    rel="noreferrer"
                    download={`QR_${selectedStudent.name}.png`}
                    className="w-full mt-3 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] font-medium flex items-center justify-center gap-2 transition-colors text-center text-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Download QR Code
                  </a>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                      onClick={() => openEditStudent(selectedStudent)}
                      className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-[12px] font-semibold flex items-center justify-center gap-2 transition-colors text-sm cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Siswa
                    </button>
                    <button
                      onClick={() => setStudentToDelete(selectedStudent)}
                      className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-[12px] font-semibold flex items-center justify-center gap-2 transition-colors text-sm cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Hapus Siswa
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Student Sheet */}
      <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
        <SheetContent className="w-[500px] p-6 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Tambah Siswa Baru</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleAddStudent} className="mt-6 space-y-4">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Nama Lengkap</label>
              <input
                type="text"
                value={newStudent.name}
                onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                placeholder="Ahmad Fauzi"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                required
              />
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">NIS (Nomor Induk Siswa)</label>
              <input
                type="text"
                inputMode="numeric"
                value={newStudent.nis}
                onChange={(e) => setNewStudent({ ...newStudent, nis: e.target.value.replace(/\D/g, "") })}
                placeholder="Hanya angka, bebas digit (contoh: 1001)"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                required
              />
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">NISN (Opsional)</label>
              <input
                type="text"
                inputMode="numeric"
                value={newStudent.nisn}
                onChange={(e) => setNewStudent({ ...newStudent, nisn: e.target.value.replace(/\D/g, "") })}
                placeholder="Nomor Induk Siswa Nasional"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
            </div>


            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Kelas</label>
              <select
                value={showCustomClassInput ? "custom" : newStudent.class}
                onChange={(e) => {
                  if (e.target.value === "custom") {
                    setShowCustomClassInput(true);
                    setNewStudent({ ...newStudent, class: "" });
                  } else {
                    setShowCustomClassInput(false);
                    setNewStudent({ ...newStudent, class: e.target.value });
                  }
                }}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900 cursor-pointer"
              >
                {classList.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="custom">+ Kelas Baru (Input Manual)</option>
              </select>
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Gender (L/P)</label>
              <select
                value={newStudent.gender}
                onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900"
              >
                <option value="L">Laki-laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>

            {showCustomClassInput && (
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Nama Kelas Baru</label>
                <input
                  type="text"
                  value={customClassValue}
                  onChange={(e) => {
                    setCustomClassValue(e.target.value);
                    setNewStudent({ ...newStudent, class: e.target.value });
                  }}
                  placeholder="Contoh: VII-E"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-blue-300 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900 font-semibold"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={newStudent.email}
                onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                placeholder="siswa@student.com"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                required
              />
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">No Whatsapp</label>
              <input
                type="tel"
                value={newStudent.phone}
                onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                placeholder="081234567890"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm"
            >
              {loading ? "Menyimpan..." : "Simpan ke Google Sheets"}
            </button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Edit Student Sheet */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent className="w-[500px] p-6 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Data Siswa</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleEditStudent} className="mt-6 space-y-4">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Nama Lengkap</label>
              <input
                type="text"
                value={editStudent.name}
                onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                required
              />
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">NIS (Nomor Induk Siswa)</label>
              <input
                type="text"
                inputMode="numeric"
                value={editStudent.nis}
                onChange={(e) => setEditStudent({ ...editStudent, nis: e.target.value.replace(/\D/g, "") })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                required
              />
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">NISN (Opsional)</label>
              <input
                type="text"
                inputMode="numeric"
                value={editStudent.nisn}
                onChange={(e) => setEditStudent({ ...editStudent, nisn: e.target.value.replace(/\D/g, "") })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Kelas</label>
              <select
                value={showEditCustomClassInput ? "custom" : editStudent.class}
                onChange={(e) => {
                  if (e.target.value === "custom") {
                    setShowEditCustomClassInput(true);
                    setEditStudent({ ...editStudent, class: "" });
                  } else {
                    setShowEditCustomClassInput(false);
                    setEditStudent({ ...editStudent, class: e.target.value });
                  }
                }}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900 cursor-pointer"
              >
                {classList.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="custom">+ Kelas Baru (Input Manual)</option>
              </select>
            </div>

            {showEditCustomClassInput && (
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Nama Kelas Baru</label>
                <input
                  type="text"
                  value={editCustomClassValue}
                  onChange={(e) => {
                    setEditCustomClassValue(e.target.value);
                    setEditStudent({ ...editStudent, class: e.target.value });
                  }}
                  placeholder="Contoh: VII-E"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-blue-300 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900 font-semibold"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Gender (L/P)</label>
              <select
                value={editStudent.gender}
                onChange={(e) => setEditStudent({ ...editStudent, gender: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-gray-900"
              >
                <option value="L">Laki-laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={editStudent.email}
                onChange={(e) => setEditStudent({ ...editStudent, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                required
              />
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">No Whatsapp</label>
              <input
                type="tel"
                value={editStudent.phone}
                onChange={(e) => setEditStudent({ ...editStudent, phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm"
            >
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmModal
        isOpen={!!studentToDelete}
        title="Hapus Siswa?"
        message={`Data ${studentToDelete?.name || "siswa"} akan dihapus dari tab Siswa dan nilai terkait di tab Penilaian. Riwayat absensi tetap disimpan sebagai arsip.`}
        confirmText={loading ? "Menghapus..." : "Hapus Siswa"}
        cancelText="Batal"
        onConfirm={handleDeleteStudent}
        onCancel={() => setStudentToDelete(null)}
      />

      {/* Class Subject Mapping Dialog */}
      <Dialog open={isMappingOpen} onOpenChange={setIsMappingOpen}>
        <DialogContent className="max-w-xl p-6 max-h-[85vh] overflow-y-auto rounded-[16px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">Pengaturan Mapel Kelas</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-gray-500 mt-2 mb-6">
            Tentukan kelas mana saja yang mengikuti setiap mata pelajaran di bawah ini. Perubahan akan disinkronkan ke Google Sheets.
          </p>

          <div className="space-y-4">
            {allSubjects.map((subject) => {
              const assignedClasses = classList.filter(c => classSubjectMapping[c]?.includes(subject));
              const isAllSelected = assignedClasses.length === classList.length && classList.length > 0;

              const handleToggleAll = () => {
                setClassSubjectMapping(prev => {
                  const updated = { ...prev };
                  if (isAllSelected) {
                    classList.forEach(c => {
                      if (updated[c]) {
                        updated[c] = updated[c].filter(s => s !== subject);
                      }
                    });
                  } else {
                    classList.forEach(c => {
                      if (!updated[c]) updated[c] = [];
                      if (!updated[c].includes(subject)) {
                        updated[c] = [...updated[c], subject];
                      }
                    });
                  }
                  return updated;
                });
              };

              const handleToggleClass = (className: string) => {
                setClassSubjectMapping(prev => {
                  const updated = { ...prev };
                  if (!updated[className]) updated[className] = [];

                  if (updated[className].includes(subject)) {
                    updated[className] = updated[className].filter(s => s !== subject);
                  } else {
                    updated[className] = [...updated[className], subject];
                  }
                  return updated;
                });
              };

              return (
                <div key={subject} className="p-4 bg-gray-50 rounded-[12px] border border-gray-200/60 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200/50 pb-2">
                    <span className="font-bold text-gray-800 text-sm flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-500" />
                      {subject}
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleAll}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-2.5 py-1 rounded-full transition-all cursor-pointer"
                    >
                      {isAllSelected ? "Hapus Semua" : "Pilih Semua"}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {classList.map((c) => {
                      const isChecked = classSubjectMapping[c]?.includes(subject);
                      return (
                        <label
                          key={c}
                          className={`flex items-center gap-2 px-3 py-2 rounded-[8px] border cursor-pointer select-none transition-all ${isChecked
                              ? "bg-blue-50 border-blue-200 text-blue-700 font-semibold"
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked || false}
                            onChange={() => handleToggleClass(c)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="text-xs font-medium">{c}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={async () => {
              if (!hasValidToken()) {
                toast.error("Sesi Google Drive kedaluwarsa. Silakan hubungkan ulang di Dashboard.");
                return;
              }
              setLoading(true);
              try {
                const mappingStr = JSON.stringify(classSubjectMapping);
                localStorage.setItem("class_subject_mapping", mappingStr);
                await writeDatabaseConfig({ class_subject_mapping: mappingStr });
                toast.success("Konfigurasi mata pelajaran kelas berhasil disimpan!");
                setIsMappingOpen(false);
              } catch (error) {
                console.error(error);
                toast.error("Gagal menyimpan konfigurasi ke Google Sheets.");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full mt-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm"
          >
            {loading ? "Menyimpan..." : "Simpan Konfigurasi"}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
