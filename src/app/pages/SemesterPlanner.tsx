import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  Sparkles,
  Download,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  ArrowLeft,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Info,
  Clock,
  CheckCircle,
  FileText,
  Lock
} from "lucide-react";
import { AIGlow } from "../components/AIComponents";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useNavigate } from "react-router";
import { isAuthorized, readSheetRange } from "../../lib/googleSheetsService";
import { toast } from "sonner";
import { supabase } from "../../../utils/supabase/client";

// Interfaces
interface SemesterMeeting {
  id: string;
  week: string;
  topic: string;
  date: string;
  status: "completed" | "ongoing" | "upcoming";
  learningObjective?: string;
  keyConcepts?: string[];
  learningActivities?: string;
  assessmentType?: string;
  characterFocus?: string;
  studentProduct?: string;
  remedialPlan?: string;
  enrichmentPlan?: string;
  teacherNotes?: string;
  capaianPembelajaran?: string;
  kelas?: string;
  mapel?: string;
  jenjang?: string;
  schoolYear?: string;
  semester?: string;
}

interface SemesterPlan {
  id: string;
  title: string;
  subject: string;
  class: string;
  tahunAjaran: string;
  semester: string;
  jenjang: string;
  mulaiTanggal: string;
  pertemuanMinggu: number;
  hariPertemuan: string[];
  jumlahPertemuan: number;
  alokasiJam: number;
  capaianPembelajaran: string;
  profilSiswa: string;
  targetKarakter: string;
  modelPembelajaran: string;
  selectedInstruments: string[];
  outputDiinginkan: string;
  proyekAkhir?: string;
  catatanTambahan?: string;
  meetings: SemesterMeeting[];
  createdAt: string;
}

const assessmentInstruments = [
  "Tes Tertulis",
  "Tes Lisan",
  "Penugasan",
  "Observasi",
  "Praktik/Kinerja",
  "Proyek",
  "Produk",
  "Presentasi",
  "Portofolio",
  "Penilaian Diri",
  "Penilaian Teman Sebaya"
];

const dayIndexMap: Record<string, number> = {
  "Minggu": 0, "Senin": 1, "Selasa": 2, "Rabu": 3, "Kamis": 4, "Jumat": 5, "Sabtu": 6
};

const indonesianDays = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// Clean local date parser
const parseLocalDate = (dateStr: string) => {
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  return new Date();
};

// Meeting dates calculator based on days of week
const getMeetingDates = (startDate: Date, count: number, targetDays: string[]) => {
  const dates: string[] = [];
  if (!targetDays || targetDays.length === 0) {
    // Fallback: 1 meeting per week (7 days interval)
    for (let i = 0; i < count; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i * 7);
      dates.push(d.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }));
    }
    return dates;
  }

  const dayIndices = targetDays.map(d => dayIndexMap[d]).sort((a, b) => a - b);
  let current = new Date(startDate);
  
  for (let i = 0; i < count; i++) {
    if (i > 0) {
      current.setDate(current.getDate() + 1);
    }
    // Find the next day landing on target days
    while (!dayIndices.includes(current.getDay())) {
      current.setDate(current.getDate() + 1);
    }
    dates.push(new Date(current).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }));
  }
  return dates;
};

const getCleanClasses = (rawClasses: string[], schoolLevel: string = "SMA") => {
  const numbers = new Set<string>();
  rawClasses.forEach(c => {
    const upper = c.toUpperCase();
    if (/\bXII\b/.test(upper) || /\b12\b/.test(upper)) numbers.add("12");
    else if (/\bXI\b/.test(upper) || /\b11\b/.test(upper)) numbers.add("11");
    else if (/\bX\b/.test(upper) || /\b10\b/.test(upper)) numbers.add("10");
    else if (/\bIX\b/.test(upper) || /\b9\b/.test(upper)) numbers.add("9");
    else if (/\bVIII\b/.test(upper) || /\b8\b/.test(upper)) numbers.add("8");
    else if (/\bVII\b/.test(upper) || /\b7\b/.test(upper)) numbers.add("7");
    else {
      const match = c.match(/\b(7|8|9|10|11|12)\b/);
      if (match) numbers.add(match[1]);
    }
  });
  if (numbers.size === 0) {
    return schoolLevel === "SMP" ? ["7", "8", "9"] : ["10", "11", "12"];
  }
  return Array.from(numbers).sort((a, b) => Number(a) - Number(b));
};

export default function SemesterPlanner() {
  const { profile } = useAuth();
  const { credits, activeWorkspaceId, refresh, subscriptionTier } = useWorkspace();
  const navigate = useNavigate();

  // Plans List & Selected Active Plan
  const [plansList, setPlansList] = useState<SemesterPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  // Form Modal & Dropdowns
  const [showFormModal, setShowFormModal] = useState(false);
  const [formCreatorType, setFormCreatorType] = useState<"AI" | "Manual">("AI");
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);

  // General States
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"gemini-flash" | "gemini-pro">(
    (localStorage.getItem("kurikula_selected_ai_model") as any) || "gemini-flash"
  );
  const [classList, setClassList] = useState<string[]>([]);
  const [subjectList, setSubjectList] = useState<string[]>([]);

  // Dynamic Academic Period
  const getDynamicAcademicPeriod = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    if (month >= 6) {
      return { tahunAjaran: `${year}/${year + 1}`, semester: "Ganjil" };
    } else {
      return { tahunAjaran: `${year - 1}/${year}`, semester: "Genap" };
    }
  };

  const period = getDynamicAcademicPeriod();

  // Form States
  const [targetYear, setTargetYear] = useState(period.tahunAjaran);
  const [targetSemester, setTargetSemester] = useState(period.semester);
  const [jenjang, setJenjang] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [capaianPembelajaran, setCapaianPembelajaran] = useState("");
  const [profilSiswa, setProfilSiswa] = useState("");
  const [targetKarakter, setTargetKarakter] = useState("");
  const [modelPembelajaran, setModelPembelajaran] = useState("Problem Based Learning");
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(["Tes Tertulis", "Penugasan"]);
  const [outputDiinginkan, setOutputDiinginkan] = useState("");
  const [jumlahPertemuan, setJumlahPertemuan] = useState(16);
  const [alokasiJam, setAlokasiJam] = useState(2);
  const [mulaiTanggal, setMulaiTanggal] = useState("");
  const [proyekAkhir, setProyekAkhir] = useState("");
  const [catatanTambahan, setCatatanTambahan] = useState("");

  // Short Schedule Fields
  const [pertemuanMinggu, setPertemuanMinggu] = useState<number>(1);
  const [hariPertemuan, setHariPertemuan] = useState<string[]>(["Senin"]);

  // Details Expanded Accordion
  const [infoExpanded, setInfoExpanded] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"prosem" | "diagnostic">("prosem");

  // Class Diagnostic Form States
  const [diagKemampuanAwal, setDiagKemampuanAwal] = useState("");
  const [diagMasalahKelas, setDiagMasalahKelas] = useState("");
  const [diagTargetKarakter, setDiagTargetKarakter] = useState("Mandiri, Kreatif, Bergotong Royong");
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagOutput, setDiagOutput] = useState("");
  const [hasGeneratedDiag, setHasGeneratedDiag] = useState(false);

  // Custom Confirm Popup Modal State
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: (() => void) | null;
  }>({
    open: false,
    title: "",
    message: "",
    onConfirm: null
  });

  // Custom Edit Meeting Modal State
  const [editMeetingModal, setEditMeetingModal] = useState<{
    open: boolean;
    meetingId: string;
    topic: string;
    objective: string;
    activities: string;
  }>({
    open: false,
    meetingId: "",
    topic: "",
    objective: "",
    activities: ""
  });

  // Load configuration and cached plans on mount
  useEffect(() => {
    const level = profile?.schoolLevel || "SMA";
    setJenjang(level);

    // Initial load from localStorage
    const savedClasses = localStorage.getItem("daftar_kelas");
    let currentClasses: string[] = [];
    if (savedClasses) {
      const parsed = savedClasses.split(",").map(c => c.trim()).filter(Boolean);
      if (parsed.length > 0) {
        currentClasses = getCleanClasses(parsed, level);
      }
    }
    if (currentClasses.length === 0) {
      currentClasses = level === "SMP" ? ["7", "8", "9"] : ["10", "11", "12"];
    }
    setClassList(currentClasses);
    setSelectedClass(currentClasses[0]);

    const savedSubjects = localStorage.getItem("mata_pelajaran");
    let currentSubjects: string[] = [];
    if (savedSubjects) {
      const parsed = savedSubjects.split(",").map(s => s.trim()).filter(Boolean);
      if (parsed.length > 0) {
        currentSubjects = parsed;
      }
    }
    if (currentSubjects.length === 0) {
      currentSubjects = ["Matematika", "Fisika", "Kimia", "Biologi", "Informatika"];
    }
    setSubjectList(currentSubjects);
    setSelectedSubject(currentSubjects[0]);

    // Set default date to today
    const today = new Date().toISOString().split("T")[0];
    setMulaiTanggal(today);

    // Load plans list
    const savedPlans = localStorage.getItem("rencana_semester_list");
    if (savedPlans) {
      try {
        setPlansList(JSON.parse(savedPlans));
      } catch (e) {
        setPlansList([]);
      }
    }

    // Async load from Google Sheets
    const loadDatabaseData = async () => {
      if (!isAuthorized()) return;
      try {
        const siswaRows = await readSheetRange("Siswa!A2:G");
        const rawClasses = Array.from(new Set(siswaRows.map(row => row[3]).filter(Boolean))) as string[];
        if (rawClasses.length > 0) {
          const cleaned = getCleanClasses(rawClasses, level);
          setClassList(cleaned);
          setSelectedClass(prev => cleaned.includes(prev) ? prev : cleaned[0]);
        }

        const gradeRows = await readSheetRange("Penilaian!A2:G");
        const rawSubjects = Array.from(new Set(gradeRows.map(row => row[4]).filter(Boolean))) as string[];
        if (rawSubjects.length > 0) {
          setSubjectList(rawSubjects);
          setSelectedSubject(prev => rawSubjects.includes(prev) ? prev : rawSubjects[0]);
        }
      } catch (e) {
        console.warn("Gagal memuat data kelas/mapel langsung dari Google Sheets:", e);
      }
    };
    loadDatabaseData();
  }, [profile]);

  const activePlan = plansList.find((p) => p.id === activePlanId);

  const handleToggleInstrument = (inst: string) => {
    if (selectedInstruments.includes(inst)) {
      setSelectedInstruments(selectedInstruments.filter((i) => i !== inst));
    } else {
      setSelectedInstruments([...selectedInstruments, inst]);
    }
  };

  const handleToggleDay = (day: string) => {
    if (hariPertemuan.includes(day)) {
      if (hariPertemuan.length > 1) {
        setHariPertemuan(hariPertemuan.filter(d => d !== day));
      } else {
        toast.warning("Minimal harus memilih satu hari pertemuan.");
      }
    } else {
      if (hariPertemuan.length < pertemuanMinggu) {
        setHariPertemuan([...hariPertemuan, day]);
      } else {
        // Shift first element and add new
        const nextDays = [...hariPertemuan.slice(1), day];
        setHariPertemuan(nextDays);
      }
    }
  };

  // Keep hariPertemuan aligned with pertemuanMinggu count
  useEffect(() => {
    if (hariPertemuan.length > pertemuanMinggu) {
      setHariPertemuan(hariPertemuan.slice(0, pertemuanMinggu));
    }
  }, [pertemuanMinggu]);

  const handleGenerateDiagnostic = async () => {
    const cost = selectedModel === "gemini-pro" ? 8 : 4;
    if ((credits?.balance ?? 0) < cost) {
      toast.error("AI Credit tidak cukup. Silakan top up atau upgrade paket.");
      navigate("/billing");
      return;
    }

    setIsDiagnosing(true);
    try {
      if (isAuthorized() && import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
        const { data: sessionData } = await supabase.auth.getSession();
        const tokenUser = sessionData?.session?.access_token;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/generate-ai`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${tokenUser || import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              workspaceId: activeWorkspaceId,
              type: "diagnostic",
              model: selectedModel,
              params: {
                jenjang: jenjang || "SMA",
                kelas: selectedClass,
                mapel: selectedSubject,
                kemampuanAwal: diagKemampuanAwal,
                masalahKelas: diagMasalahKelas,
                targetKarakter: diagTargetKarakter
              }
            })
          }
        );
        if (response.ok) {
          const res = await response.json();
          if (res.content) {
            setDiagOutput(res.content);
            setHasGeneratedDiag(true);
            toast.success("Diagnostik Kelas AI berhasil dibuat!");
          }
        } else {
          const errJson = await response.json().catch(() => ({}));
          toast.error(errJson.error || "Gagal membuat laporan diagnostik kelas.");
        }
      } else {
        // Fallback demo response
        setTimeout(() => {
          setDiagOutput(`## LAPORAN DIAGNOSTIK KELAS AI (DEMO)
Mapel: ${selectedSubject} | Kelas: ${selectedClass}

### Analisis Kesiapan Belajar:
- **Kemampuan Awal:** Mayoritas siswa sudah memiliki dasar pemahaman awal, namun memerlukan review terfokus di bagian awal.
- **Rekomendasi Aktivitas:** Gunakan model pembelajaran bermakna (Project Based Learning) untuk menstimulasi kolaborasi siswa.

### Rekomendasi Program Pembelajaran:
1. Sediakan scaffolding khusus untuk kelompok siswa dengan kemampuan awal rendah.
2. Fokuskan target karakter: ${diagTargetKarakter} lewat pembiasaan diskusi kelompok.
`);
          setHasGeneratedDiag(true);
          toast.success("Diagnostik Kelas AI berhasil dibuat (Mode Demo)!");
        }, 1500);
      }
    } catch (e) {
      console.error(e);
      toast.error("Gagal mendiagnosis kelas.");
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleApplyDiagnostic = () => {
    if (!diagOutput) return;
    setProfilSiswa(prev => (prev ? prev + "\n" : "") + "Hasil Diagnostik AI: " + diagKemampuanAwal);
    setTargetKarakter(diagTargetKarakter);
    setActiveTab("prosem");
    toast.success("Rekomendasi diagnostik kelas berhasil ditempelkan ke form Semester Planner!");
  };

  const handleCreateNewPlanTrigger = (mode: "AI" | "Manual") => {
    setFormCreatorType(mode);
    setShowMethodDropdown(false);
    setShowFormModal(true);
  };

  // Client-side Manual Plan Creator
  const handleCreateManualPlan = () => {
    if (!selectedSubject || !selectedClass) {
      toast.error("Silakan tentukan mata pelajaran dan kelas.");
      return;
    }

    const meetingDates = getMeetingDates(parseLocalDate(mulaiTanggal), jumlahPertemuan, hariPertemuan);
    const generatedMeetings: SemesterMeeting[] = [];

    for (let i = 1; i <= jumlahPertemuan; i++) {
      generatedMeetings.push({
        id: `SESSION-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        week: `Pertemuan ${i}`,
        topic: `Topik Pembelajaran Pertemuan ${i}`,
        date: meetingDates[i - 1],
        status: i === 1 ? "ongoing" : "upcoming",
        learningObjective: `Tujuan Pembelajaran Pertemuan ${i}`,
        keyConcepts: ["Konsep Utama"],
        learningActivities: "Kegiatan Awal, Inti, dan Penutup Pembelajaran.",
        assessmentType: selectedInstruments[0] || "Penugasan",
        characterFocus: targetKarakter || "Mandiri",
        studentProduct: "Hasil Karya/Lembar Kerja Siswa",
        remedialPlan: "Bimbingan individu dan pemberian soal latihan sejenis.",
        enrichmentPlan: "Pemberian materi pengayaan mandiri tingkat lanjut.",
        teacherNotes: "",
        capaianPembelajaran,
        kelas: selectedClass,
        mapel: selectedSubject,
        jenjang,
        schoolYear: targetYear,
        semester: targetSemester
      });
    }

    const newPlan: SemesterPlan = {
      id: `PLAN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: `${selectedSubject} - Kelas ${selectedClass} (${targetSemester} ${targetYear})`,
      subject: selectedSubject,
      class: selectedClass,
      tahunAjaran: targetYear,
      semester: targetSemester,
      jenjang: jenjang || "SMA",
      mulaiTanggal,
      pertemuanMinggu,
      hariPertemuan,
      jumlahPertemuan,
      alokasiJam,
      capaianPembelajaran,
      profilSiswa,
      targetKarakter,
      modelPembelajaran,
      selectedInstruments,
      outputDiinginkan,
      proyekAkhir,
      catatanTambahan,
      meetings: generatedMeetings,
      createdAt: new Date().toISOString()
    };

    const updatedPlans = [newPlan, ...plansList];
    setPlansList(updatedPlans);
    localStorage.setItem("rencana_semester_list", JSON.stringify(updatedPlans));
    setActivePlanId(newPlan.id);
    setShowFormModal(false);
    toast.success("Rencana Semester Manual berhasil dibuat!");
  };

  // AI-Assisted Generator
  const handleGenerateAIPlan = async () => {
    const cost = selectedModel === "gemini-pro" ? 2 : 1;
    if ((credits?.balance ?? 0) < cost) {
      toast.error("AI Credit tidak cukup. Silakan top up atau upgrade paket.");
      navigate("/billing");
      return;
    }

    setIsGenerating(true);
    try {
      let finalContent = "";
      if (isAuthorized() && import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
        const { data: sessionData } = await supabase.auth.getSession();
        const tokenUser = sessionData?.session?.access_token;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/generate-ai`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${tokenUser || import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              workspaceId: activeWorkspaceId,
              type: "semester-plan",
              model: selectedModel,
              params: {
                targetYear,
                targetSemester,
                jenjang,
                selectedClass,
                selectedSubject,
                capaianPembelajaran,
                profilSiswa,
                targetKarakter,
                modelPembelajaran,
                instrumenPenilaian: selectedInstruments,
                outputDiinginkan,
                jumlahPertemuan,
                alokasiJam,
                mulaiTanggal,
                proyekAkhir,
                catatanTambahan
              }
            })
          }
        );
        if (response.ok) {
          const res = await response.json();
          if (res.content) {
            finalContent = res.content;
            if (refresh) {
              await refresh();
            }
          }
        } else {
          const errJson = await response.json().catch(() => ({}));
          toast.error(errJson.error || "Gagal membuat rencana semester.");
        }
      }

      // Generate sessions array
      const generatedMeetings: SemesterMeeting[] = [];
      const meetingDates = getMeetingDates(parseLocalDate(mulaiTanggal), jumlahPertemuan, hariPertemuan);

      let parsedPlan: any = null;
      if (finalContent) {
        try {
          let cleanJson = finalContent.trim();
          if (cleanJson.startsWith("```json")) cleanJson = cleanJson.substring(7);
          if (cleanJson.startsWith("```")) cleanJson = cleanJson.substring(3);
          if (cleanJson.endsWith("```")) cleanJson = cleanJson.substring(0, cleanJson.length - 3);
          parsedPlan = JSON.parse(cleanJson.trim());
        } catch (e) {
          console.warn("Failed to parse AI output as JSON, trying markdown fallback:", e);
        }
      }

      if (parsedPlan && parsedPlan.meetings && Array.isArray(parsedPlan.meetings)) {
        parsedPlan.meetings.forEach((meet: any, idx: number) => {
          const meetNum = meet.meetingNumber || idx + 1;
          const dateString = meetingDates[idx] || meetingDates[meetingDates.length - 1];
          generatedMeetings.push({
            id: `SESSION-${Date.now()}-${meetNum}-${Math.random().toString(36).substr(2, 4)}`,
            week: `Pertemuan ${meetNum}`,
            topic: meet.topic || `Materi Minggu ${meetNum}`,
            date: dateString,
            status: meetNum === 1 ? "ongoing" : "upcoming",
            learningObjective: meet.learningObjective || "",
            keyConcepts: meet.keyConcepts || [],
            learningActivities: meet.learningActivities || "",
            assessmentType: meet.assessmentType || "",
            characterFocus: meet.characterFocus || "",
            studentProduct: meet.studentProduct || "",
            remedialPlan: meet.remedialPlan || "",
            enrichmentPlan: meet.enrichmentPlan || "",
            teacherNotes: meet.teacherNotes || "",
            capaianPembelajaran: parsedPlan.capaianPembelajaran || capaianPembelajaran,
            profilSiswa: parsedPlan.profilSiswa || profilSiswa,
            targetKarakter: parsedPlan.targetKarakter || targetKarakter,
            modelPembelajaran: parsedPlan.modelPembelajaran || modelPembelajaran,
            kelas: parsedPlan.kelas || selectedClass,
            mapel: parsedPlan.mapel || selectedSubject,
            jenjang: parsedPlan.jenjang || jenjang,
            schoolYear: parsedPlan.schoolYear || targetYear,
            semester: parsedPlan.semester || targetSemester
          });
        });
      } else {
        // Simple fallback topic pools
        const defaultTopics: Record<string, string[]> = {
          Matematika: [
            "Pengenalan Aljabar & Variabel",
            "Persamaan dan Pertidaksamaan Linear Satu Variabel",
            "Sistem Persamaan Linear Dua Variabel (SPLDV)",
            "Fungsi Kuadrat & Grafik",
            "Trigonometri Dasar & Segitiga Siku-siku",
            "Aturan Sinus dan Cosinus",
            "Statistika: Penyajian Data & Distribusi Frekuensi",
            "Peluang Kejadian Saling Bebas"
          ],
          Fisika: [
            "Besaran, Satuan, dan Pengukuran",
            "Vektor dan Operasi Vektor",
            "Gerak Lurus Beraturan & Gerak Lurus Berubah Beraturan",
            "Hukum Newton tentang Gerak",
            "Usaha dan Energi",
            "Momentum dan Impuls",
            "Rotasi Benda Tegar",
            "Termodinamika Dasar"
          ],
          Informatika: [
            "Berpikir Komputasional & Dekomposisi",
            "Pengenalan Algoritma & Flowchart",
            "Dasar Pemrograman menggunakan Python/Blockly",
            "Struktur Data: List, Array, dan Dictionary",
            "Jaringan Komputer & Internet",
            "Analisis Data & Visualisasi Sederhana",
            "Dampak Sosial Informatika",
            "Praktik Lintas Bidang (Proyek)"
          ]
        };

        const topicsPool = defaultTopics[selectedSubject] || [
          "Pengenalan materi dan orientasi pembelajaran",
          "Pemahaman konsep dasar dan teori",
          "Eksplorasi mendalam sub-kompetensi 1",
          "Studi kasus dan analisis kelompok",
          "Evaluasi tengah semester (UTS)",
          "Implementasi praktis dan latihan",
          "Penyusunan portofolio pembelajaran",
          "Review umum dan persiapan akhir"
        ];

        for (let i = 1; i <= jumlahPertemuan; i++) {
          const dateString = meetingDates[i - 1] || meetingDates[meetingDates.length - 1];
          let topic = "";
          if (capaianPembelajaran && capaianPembelajaran.length > 15) {
            topic = `Eksplorasi ${capaianPembelajaran.slice(0, 35)}... - Bagian ${i}`;
          } else {
            const poolIndex = (i - 1) % topicsPool.length;
            topic = topicsPool[poolIndex];
          }

          generatedMeetings.push({
            id: `SESSION-${Date.now()}-${i}`,
            week: `Pertemuan ${i}`,
            topic,
            date: dateString,
            status: i === 1 ? "ongoing" : "upcoming",
            learningObjective: `Tujuan pembelajaran topik ${topic}`,
            keyConcepts: [topic],
            learningActivities: "Kegiatan pembelajaran terpadu menggunakan model " + modelPembelajaran,
            assessmentType: selectedInstruments.join(", "),
            characterFocus: targetKarakter || "Mandiri",
            studentProduct: outputDiinginkan || "Laporan Tugas",
            remedialPlan: "Tutor sebaya dan penugasan khusus.",
            enrichmentPlan: "Studi kasus problem-solving tingkat lanjut.",
            teacherNotes: "",
            capaianPembelajaran,
            kelas: selectedClass,
            mapel: selectedSubject,
            jenjang,
            schoolYear: targetYear,
            semester: targetSemester
          });
        }
      }

      const newPlan: SemesterPlan = {
        id: `PLAN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: `${selectedSubject} - Kelas ${selectedClass} (${targetSemester} ${targetYear})`,
        subject: selectedSubject,
        class: selectedClass,
        tahunAjaran: targetYear,
        semester: targetSemester,
        jenjang: jenjang || "SMA",
        mulaiTanggal,
        pertemuanMinggu,
        hariPertemuan,
        jumlahPertemuan,
        alokasiJam,
        capaianPembelajaran,
        profilSiswa,
        targetKarakter,
        modelPembelajaran,
        selectedInstruments,
        outputDiinginkan,
        proyekAkhir,
        catatanTambahan,
        meetings: generatedMeetings,
        createdAt: new Date().toISOString()
      };

      const updatedPlans = [newPlan, ...plansList];
      setPlansList(updatedPlans);
      localStorage.setItem("rencana_semester_list", JSON.stringify(updatedPlans));
      setActivePlanId(newPlan.id);
      setShowFormModal(false);
      toast.success("Rencana Semester AI berhasil dibuat!");
    } catch (error) {
      console.error(error);
      toast.error("Gagal men-generate rencana semester.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditLesson = (id: string, currentTopic: string) => {
    const meet = activePlan?.meetings.find(m => m.id === id);
    setEditMeetingModal({
      open: true,
      meetingId: id,
      topic: currentTopic,
      objective: meet?.learningObjective || "",
      activities: meet?.learningActivities || ""
    });
  };

  const handleSaveEditedMeeting = () => {
    if (!activePlanId || !editMeetingModal.meetingId) return;
    const updatedPlans = plansList.map(plan => {
      if (plan.id === activePlanId) {
        const updatedMeetings = plan.meetings.map(m => {
          if (m.id === editMeetingModal.meetingId) {
            return {
              ...m,
              topic: editMeetingModal.topic,
              learningObjective: editMeetingModal.objective,
              learningActivities: editMeetingModal.activities
            };
          }
          return m;
        });
        return { ...plan, meetings: updatedMeetings };
      }
      return plan;
    });

    setPlansList(updatedPlans);
    localStorage.setItem("rencana_semester_list", JSON.stringify(updatedPlans));
    setEditMeetingModal(prev => ({ ...prev, open: false }));
    toast.success("Detail pertemuan berhasil disimpan!");
  };

  const handleDeleteLesson = (id: string) => {
    setConfirmModal({
      open: true,
      title: "Hapus Pertemuan",
      message: "Apakah Anda yakin ingin menghapus pertemuan ini dari rencana semester?",
      onConfirm: () => {
        const updatedPlans = plansList.map(plan => {
          if (plan.id === activePlanId) {
            return {
              ...plan,
              meetings: plan.meetings.filter(m => m.id !== id)
            };
          }
          return plan;
        });
        setPlansList(updatedPlans);
        localStorage.setItem("rencana_semester_list", JSON.stringify(updatedPlans));
        toast.success("Pertemuan berhasil dihapus");
      }
    });
  };

  const handleDeletePlan = (planId: string, planTitle: string) => {
    setConfirmModal({
      open: true,
      title: "Hapus Rencana Semester",
      message: `Apakah Anda yakin ingin menghapus seluruh rencana semester "${planTitle}"? Tindakan ini menghapus semua draft pertemuan dan tidak bisa dibatalkan.`,
      onConfirm: () => {
        const updatedPlans = plansList.filter(p => p.id !== planId);
        setPlansList(updatedPlans);
        localStorage.setItem("rencana_semester_list", JSON.stringify(updatedPlans));
        if (activePlanId === planId) {
          setActivePlanId(null);
        }
        toast.success("Rencana semester berhasil dihapus");
      }
    });
  };

  const handleCreateFromMeeting = (type: "modul" | "lkpd" | "soal" | "bahan_ajar", lesson: any) => {
    const targetPath = type === "modul" ? "/ai-planner" : type === "soal" ? "/assessment" : "/ai-materials";
    navigate(targetPath, {
      state: {
        fromMeeting: true,
        meetingType: type,
        topic: lesson.topic,
        class: lesson.kelas || activePlan?.class || selectedClass,
        subject: lesson.mapel || activePlan?.subject || selectedSubject,
        duration: activePlan?.alokasiJam ? `${activePlan.alokasiJam * 45} menit` : "90 menit",
        pertemuan: lesson.week ? lesson.week.replace("Pertemuan ", "") : "",
        learningObjective: lesson.learningObjective || "",
        keyConcepts: lesson.keyConcepts || [],
        learningActivities: lesson.learningActivities || "",
        assessmentType: lesson.assessmentType || "",
        characterFocus: lesson.characterFocus || "",
        studentProduct: lesson.studentProduct || "",
        remedialPlan: lesson.remedialPlan || "",
        enrichmentPlan: lesson.enrichmentPlan || "",
        teacherNotes: lesson.teacherNotes || "",
        capaianPembelajaran: lesson.capaianPembelajaran || activePlan?.capaianPembelajaran,
        profilSiswa: lesson.profilSiswa || activePlan?.profilSiswa,
        targetKarakter: lesson.targetKarakter || activePlan?.targetKarakter,
        modelPembelajaran: lesson.modelPembelajaran || activePlan?.modelPembelajaran,
        assessmentPlan: lesson.assessmentPlan || activePlan?.selectedInstruments.join(", "),
        jenjang: lesson.jenjang || activePlan?.jenjang,
        schoolYear: lesson.schoolYear || activePlan?.tahunAjaran,
        semester: lesson.semester || activePlan?.semester
      }
    });
    toast.info(`Membuka pembuat ${type} dengan topik "${lesson.topic}"`);
  };

  const handleExportPDF = () => {
    if (!activePlan || activePlan.meetings.length === 0) {
      toast.error("Belum ada rencana pertemuan untuk diexport.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Gagal membuka jendela cetak. Pastikan popup blocker dinonaktifkan.");
      return;
    }

    const todayStr = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    const rowsHtml = activePlan.meetings.map((lesson, idx) => `
      <tr class="${idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}">
        <td class="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">${lesson.week}</td>
        <td class="border border-gray-300 px-4 py-3 text-sm text-gray-800">${lesson.topic}</td>
        <td class="border border-gray-300 px-4 py-3 text-sm text-gray-600">${lesson.date}</td>
      </tr>
    `).join("");

    const htmlContent = `
      <html>
        <head>
          <title>Rencana Pembelajaran Semester - ${activePlan.subject}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body class="p-12 bg-white text-gray-900 font-sans">
          <div class="max-w-4xl mx-auto">
            <!-- Kop Surat -->
            <div class="flex items-center justify-between border-b-2 border-gray-900 pb-4 mb-6">
              <div class="flex items-center gap-4">
                <div class="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-2xl shadow-sm">
                  K
                </div>
                <div>
                  <h1 class="text-xl font-bold uppercase tracking-wide text-gray-900">Rencana Program Semester (RPS)</h1>
                  <p class="text-sm text-gray-600">Kurikula AI Semester Planner • Tahun Ajaran ${activePlan.tahunAjaran}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-xs text-gray-500">Tanggal: ${todayStr}</p>
              </div>
            </div>

            <!-- Detail Program -->
            <div class="grid grid-cols-2 gap-6 mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div>
                <table class="w-full text-sm">
                  <tr>
                    <td class="font-medium text-gray-500 py-1 w-32">Mata Pelajaran</td>
                    <td class="text-gray-950 py-1 font-semibold">: ${activePlan.subject}</td>
                  </tr>
                  <tr>
                    <td class="font-medium text-gray-500 py-1">Kelas / Semester</td>
                    <td class="text-gray-950 py-1 font-semibold">: ${activePlan.class} / ${activePlan.semester}</td>
                  </tr>
                  <tr>
                    <td class="font-medium text-gray-500 py-1">Jenjang</td>
                    <td class="text-gray-950 py-1 font-semibold">: ${activePlan.jenjang || "SMA"}</td>
                  </tr>
                </table>
              </div>
              <div>
                <table class="w-full text-sm">
                  <tr>
                    <td class="font-medium text-gray-500 py-1 w-36">Model Pembelajaran</td>
                    <td class="text-gray-950 py-1 font-semibold">: ${activePlan.modelPembelajaran}</td>
                  </tr>
                  <tr>
                    <td class="font-medium text-gray-500 py-1">Instrumen Penilaian</td>
                    <td class="text-gray-950 py-1 font-semibold">: ${activePlan.selectedInstruments.join(", ") || "-"}</td>
                  </tr>
                  <tr>
                    <td class="font-medium text-gray-500 py-1">Alokasi Waktu</td>
                    <td class="text-gray-950 py-1 font-semibold">: ${activePlan.alokasiJam} JP / Pertemuan</td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- Target Capaian -->
            <div class="space-y-4 mb-8">
              ${activePlan.capaianPembelajaran ? `
                <div>
                  <h2 class="text-sm font-bold text-gray-800 uppercase tracking-wide">Capaian Pembelajaran</h2>
                  <p class="text-sm text-gray-600 mt-1 leading-relaxed">${activePlan.capaianPembelajaran}</p>
                </div>
              ` : ""}
              ${activePlan.profilSiswa ? `
                <div>
                  <h2 class="text-sm font-bold text-gray-800 uppercase tracking-wide">Karakteristik & Profil Siswa</h2>
                  <p class="text-sm text-gray-600 mt-1 leading-relaxed">${activePlan.profilSiswa}</p>
                </div>
              ` : ""}
            </div>

            <!-- Tabel Agenda -->
            <div>
              <h2 class="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Jadwal Pertemuan Pembelajaran</h2>
              <table class="w-full border-collapse border border-gray-300">
                <thead>
                  <tr class="bg-gray-100">
                    <th class="border border-gray-300 px-4 py-2.5 text-center text-sm font-bold text-gray-700 w-32">Pertemuan</th>
                    <th class="border border-gray-300 px-4 py-2.5 text-left text-sm font-bold text-gray-700">Topik Pembahasan / Pembelajaran</th>
                    <th class="border border-gray-300 px-4 py-2.5 text-left text-sm font-bold text-gray-700 w-56">Rencana Tanggal Pelaksanaan</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>

            <!-- Tanda Tangan Mandiri -->
            <div class="flex justify-between items-center mt-12 pt-8 border-t border-gray-200">
              <div>
                <p class="text-xs text-gray-400">Dicetak melalui platform Kurikula AI</p>
              </div>
              <div class="text-center font-semibold">
                <p class="text-sm text-gray-500 mb-12">Guru Pengampu</p>
                <p class="text-sm text-gray-900 underline">${profile?.name || "Nama Lengkap Guru"}</p>
                <p class="text-xs text-gray-500">NIP. __________________</p>
              </div>
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 max-w-7xl mx-auto w-full relative">
      {!["pro", "premium", "school", "trial"].includes(subscriptionTier) && (
        <div className="absolute inset-0 bg-gray-50/40 backdrop-blur-md z-30 flex flex-col items-center justify-center p-8 text-center rounded-[32px]">
          <div className="max-w-md p-8 bg-white border border-gray-200 rounded-[24px] shadow-xl space-y-6">
            <div className="w-20 h-20 bg-gradient-to-tr from-[#3C405B] to-[#DF7A5E] rounded-full flex items-center justify-center mx-auto shadow-md border-2 border-white">
              <Sparkles className="w-10 h-10 text-white animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
                Buka AI Semester Planner 🔒
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Anda perlu menggunakan paket **Pro** atau **Premium** untuk mengakses asisten AI Perencanaan Semester ini. Silakan melakukan upgrade paket di menu Billing.
              </p>
            </div>
            <button
              onClick={() => navigate("/billing")}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-[12px] font-semibold text-sm shadow-md transition-all cursor-pointer transform hover:scale-[1.02]"
            >
              Upgrade Paket Sekarang
            </button>
          </div>
        </div>
      )}
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#DF7A5E] uppercase tracking-widest mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Perencanaan Kurikulum</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Rencana Program Semester (RPS)</h1>
          <p className="text-gray-500 text-sm mt-0.5">Kelola draf rancangan pertemuan, modul, dan bahan ajar 1 semester Anda.</p>
        </div>

        {/* Tab selection */}
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 p-1.5 rounded-[16px] border border-gray-200 flex">
            <button
              onClick={() => { setActiveTab("prosem"); setActivePlanId(null); }}
              className={`px-4 py-2 rounded-[12px] font-bold text-xs transition-all cursor-pointer ${
                activeTab === "prosem"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Agenda Semester
            </button>
            <button
              onClick={() => {
                const isEligible = ["premium", "school", "trial"].includes(subscriptionTier);
                if (!isEligible) {
                  toast.error("Fitur Diagnostik Kesiapan Kelas hanya tersedia pada Paket Premium. Silakan upgrade paket Anda.");
                  return;
                }
                setActiveTab("diagnostic");
              }}
              className={`px-4 py-2 rounded-[12px] font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "diagnostic"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <Sparkles className="w-3 h-3 text-purple-500 animate-pulse" />
              Diagnostik Kelas
              {!["premium", "school", "trial"].includes(subscriptionTier) && (
                <Lock className="w-3 h-3 text-amber-500" />
              )}
            </button>
          </div>

          {activeTab === "prosem" && !activePlanId && (
            <div className="relative">
              <button
                onClick={() => setShowMethodDropdown(!showMethodDropdown)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-sm text-xs"
              >
                <Plus className="w-4 h-4" />
                Buat Rencana Baru
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>

              <AnimatePresence>
                {showMethodDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMethodDropdown(false)}></div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-[16px] border border-gray-200 shadow-xl py-2 z-20 text-left"
                    >
                      <button
                        onClick={() => handleCreateNewPlanTrigger("AI")}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors text-left"
                      >
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        Gunakan Asisten AI
                      </button>
                      <button
                        onClick={() => handleCreateNewPlanTrigger("Manual")}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors text-left border-t border-gray-100"
                      >
                        <Edit className="w-4 h-4 text-gray-400" />
                        Tulis Secara Manual
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Main View Area */}
      {activeTab === "prosem" ? (
        <>
          {/* Active plan selected (Details View) */}
          {activePlan ? (
            <div className="space-y-6">
              {/* Back Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-[16px] border border-gray-200">
                <button
                  onClick={() => setActivePlanId(null)}
                  className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900 cursor-pointer self-start sm:self-center"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Kembali ke Daftar Rencana
                </button>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-150 rounded-full text-xs font-bold">
                    {activePlan.semester} ({activePlan.tahunAjaran})
                  </span>
                  <button
                    onClick={handleExportPDF}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[12px] font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export PDF
                  </button>
                </div>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-[16px] p-5 border border-gray-200 shadow-sm">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Pertemuan</div>
                  <div className="text-2xl font-black text-gray-900">{activePlan.meetings.length}</div>
                </div>
                <div className="bg-emerald-50/50 rounded-[16px] p-5 border border-emerald-100">
                  <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">Selesai</div>
                  <div className="text-2xl font-black text-emerald-600">
                    {activePlan.meetings.filter(m => m.status === "completed").length}
                  </div>
                </div>
                <div className="bg-blue-50/50 rounded-[16px] p-5 border border-blue-150">
                  <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">Sedang Berjalan</div>
                  <div className="text-2xl font-black text-blue-600">
                    {activePlan.meetings.filter(m => m.status === "ongoing").length}
                  </div>
                </div>
                <div className="bg-purple-50/50 rounded-[16px] p-5 border border-purple-100">
                  <div className="text-xs font-semibold text-purple-700 uppercase tracking-wider mb-1">Akan Datang</div>
                  <div className="text-2xl font-black text-purple-600">
                    {activePlan.meetings.filter(m => m.status === "upcoming").length}
                  </div>
                </div>
              </div>

              {/* Expandable Plan Info */}
              <div className="bg-white rounded-[16px] border border-gray-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => setInfoExpanded(!infoExpanded)}
                  className="w-full px-6 py-4 flex items-center justify-between font-bold text-sm text-gray-800 bg-gray-50/50 hover:bg-gray-55 cursor-pointer border-b border-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-500" />
                    <span>Rincian Kurikulum & Jadwal Rencana</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${infoExpanded ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {infoExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm border-t border-gray-100">
                        <div className="space-y-4">
                          <div>
                            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Mata Pelajaran & Kelas</span>
                            <p className="text-gray-900 font-bold mt-0.5">{activePlan.subject} (Kelas {activePlan.class} - {activePlan.jenjang})</p>
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Jadwal Pelaksanaan</span>
                            <p className="text-gray-900 font-semibold mt-0.5">
                              {activePlan.pertemuanMinggu}x / Minggu (Hari: {activePlan.hariPertemuan.join(", ")})
                            </p>
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Model Pembelajaran</span>
                            <p className="text-gray-900 font-semibold mt-0.5">{activePlan.modelPembelajaran}</p>
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Capaian Pembelajaran</span>
                            <p className="text-gray-700 mt-1 leading-relaxed bg-gray-50 p-3 rounded-[8px] border border-gray-150">{activePlan.capaianPembelajaran || "Belum ditentukan."}</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Profil & Kondisi Siswa</span>
                            <p className="text-gray-700 mt-1 leading-relaxed">{activePlan.profilSiswa || "-"}</p>
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Target Karakter Pelajar Pancasila</span>
                            <p className="text-gray-900 font-semibold mt-0.5">{activePlan.targetKarakter || "-"}</p>
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Instrumen Penilaian</span>
                            <p className="text-gray-900 font-semibold mt-0.5">{activePlan.selectedInstruments.join(", ") || "-"}</p>
                          </div>
                          {activePlan.catatanTambahan && (
                            <div>
                              <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Catatan Tambahan</span>
                              <p className="text-gray-750 mt-1 text-xs leading-relaxed italic">{activePlan.catatanTambahan}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Meetings Timeline */}
              <div className="bg-white rounded-[16px] p-6 border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3.5 mb-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">Agenda Pertemuan Mingguan</h2>
                </div>

                <div className="space-y-3">
                  {activePlan.meetings.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 bg-gray-50 rounded-[12px] border border-dashed border-gray-200 text-sm">
                      Belum ada sesi pertemuan. Silakan tambahkan manual atau generate ulang.
                    </div>
                  ) : (
                    activePlan.meetings.map((meet, index) => (
                      <motion.div
                        key={meet.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`flex items-start sm:items-center gap-4 p-4 rounded-[12px] border transition-all ${
                          meet.status === "completed"
                            ? "bg-emerald-50/20 border-emerald-150"
                            : meet.status === "ongoing"
                            ? "bg-blue-50/20 border-blue-200"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        {/* Number circle */}
                        <div className="flex-shrink-0">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                              meet.status === "completed"
                                ? "bg-emerald-500 text-white"
                                : meet.status === "ongoing"
                                ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                                : "bg-gray-100 text-gray-500 border border-gray-200"
                            }`}
                          >
                            {index + 1}
                          </div>
                        </div>

                        {/* Middle info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 text-sm truncate">{meet.topic}</div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-gray-400 font-semibold uppercase">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              {meet.date}
                            </span>
                            <span>•</span>
                            <span className="text-gray-400">{meet.week}</span>
                          </div>

                          {/* Quick AI Generators */}
                          <div className="flex flex-wrap gap-2 mt-3.5">
                            <button
                              onClick={() => handleCreateFromMeeting("modul", meet)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-[8px] text-[11px] font-bold border border-blue-150 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              + Modul Ajar
                            </button>
                            <button
                              onClick={() => handleCreateFromMeeting("lkpd", meet)}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-[8px] text-[11px] font-bold border border-purple-150 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              + LKPD
                            </button>
                            <button
                              onClick={() => handleCreateFromMeeting("soal", meet)}
                              className="px-2.5 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-[8px] text-[11px] font-bold border border-pink-150 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              + Soal
                            </button>
                            <button
                              onClick={() => handleCreateFromMeeting("bahan_ajar", meet)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-[8px] text-[11px] font-bold border border-amber-150 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              + Bahan Ajar
                            </button>
                          </div>
                        </div>

                        {/* Status tag */}
                        <div className="flex-shrink-0 hidden sm:block">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                              meet.status === "completed"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-250"
                                : meet.status === "ongoing"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-gray-50 text-gray-500 border-gray-200"
                            }`}
                          >
                            {meet.status === "completed" ? "Selesai" : meet.status === "ongoing" ? "Berjalan" : "Datang"}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditLesson(meet.id, meet.topic)}
                            className="p-2 hover:bg-gray-55 rounded-[8px] transition-colors cursor-pointer"
                            title="Edit rincian pertemuan"
                          >
                            <Edit className="w-4 h-4 text-gray-400 hover:text-gray-700" />
                          </button>
                          <button
                            onClick={() => handleDeleteLesson(meet.id)}
                            className="p-2 hover:bg-red-50 rounded-[8px] transition-colors cursor-pointer"
                            title="Hapus pertemuan"
                          >
                            <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Cards list of all plans (Cards View) */
            <div className="space-y-6">
              {plansList.length === 0 ? (
                <div className="p-16 text-center text-gray-500 bg-white rounded-[24px] border border-gray-200 shadow-sm flex flex-col items-center justify-center space-y-4">
                  <Calendar className="w-12 h-12 text-[#DF7A5E]/40" />
                  <h3 className="text-base font-bold text-gray-900">Belum Ada Program Semester</h3>
                  <p className="text-gray-500 text-sm max-w-sm">
                    Buat perencanaan kurikulum semester baru Anda menggunakan bantuan asisten AI atau tulis manual untuk menjadwalkan agenda kelas.
                  </p>
                  <button
                    onClick={() => handleCreateNewPlanTrigger("AI")}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Buat Rencana Sekarang
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {plansList.map((plan) => (
                    <motion.div
                      key={plan.id}
                      whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}
                      className="bg-white rounded-[20px] p-6 border border-gray-200 shadow-sm flex flex-col justify-between cursor-pointer hover:border-blue-200 transition-all group"
                      onClick={() => setActivePlanId(plan.id)}
                    >
                      <div>
                        {/* Title & Subject */}
                        <div className="flex justify-between items-start gap-2 mb-3">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-[12px]">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePlan(plan.id, plan.title);
                            }}
                            className="p-1.5 hover:bg-red-50 rounded-[8px] text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Hapus Rencana"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <h3 className="font-black text-gray-900 text-base leading-snug group-hover:text-blue-700 transition-colors">
                          {plan.subject}
                        </h3>
                        <p className="text-gray-500 text-xs font-semibold mt-1">
                          Kelas {plan.class} • {plan.jenjang}
                        </p>

                        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-y-3 gap-x-2 text-xs font-medium text-gray-500">
                          <div>
                            <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Semester</span>
                            <span className="text-gray-800 font-semibold">{plan.semester}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Tahun Ajaran</span>
                            <span className="text-gray-800 font-semibold">{plan.tahunAjaran}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Frekuensi</span>
                            <span className="text-gray-800 font-semibold">{plan.pertemuanMinggu}x/Minggu</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Hari Kelas</span>
                            <span className="text-gray-800 font-semibold truncate block" title={plan.hariPertemuan.join(", ")}>
                              {plan.hariPertemuan.join(", ")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          {plan.meetings.length} Pertemuan
                        </span>
                        <div className="flex items-center gap-1 text-[#DF7A5E] font-bold text-xs">
                          <span>Buka Detail</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Diagnostic Tab View (Tab 2) */
        <div className="space-y-6">
          <div className="bg-white rounded-[16px] p-6 border border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
              <h2 className="text-lg font-bold text-gray-900">Asisten Diagnostik Kesiapan Kelas</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Jenjang</label>
                <input
                  type="text"
                  value={jenjang || profile?.schoolLevel || "SMA"}
                  readOnly
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] text-gray-500 font-semibold text-sm outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Kelas</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-semibold text-sm cursor-pointer transition-all"
                >
                  {classList.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Mata Pelajaran</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-semibold text-sm cursor-pointer transition-all"
                >
                  {subjectList.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Kemampuan Awal Siswa</label>
                <textarea
                  value={diagKemampuanAwal}
                  onChange={(e) => setDiagKemampuanAwal(e.target.value)}
                  placeholder="Deskripsikan secara singkat kemampuan awal atau prasyarat yang dimiliki siswa..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium text-sm transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Hambatan Utama / Masalah Kelas</label>
                <textarea
                  value={diagMasalahKelas}
                  onChange={(e) => setDiagMasalahKelas(e.target.value)}
                  placeholder="Sebutkan kendala atau masalah utama yang dihadapi di dalam kelas..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium text-sm transition-all resize-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Target Karakter Prioritas</label>
                <input
                  type="text"
                  value={diagTargetKarakter}
                  onChange={(e) => setDiagTargetKarakter(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-semibold text-sm transition-all"
                />
              </div>
            </div>

            {/* Model & cost info */}
            <div className="bg-blue-50/50 p-4 rounded-[12px] border border-blue-100 flex items-center justify-between text-xs font-semibold">
              <div>
                <label className="block text-gray-500 mb-1">Model AI:</label>
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    const m = e.target.value as any;
                    if (m === "gemini-pro" && !["pro", "premium", "school", "trial"].includes(subscriptionTier)) {
                      toast.error("Model Gemini Pro hanya tersedia pada Paket Pro atau Premium. Silakan upgrade paket Anda.");
                      return;
                    }
                    setSelectedModel(m);
                    localStorage.setItem("kurikula_selected_ai_model", m);
                  }}
                  className="px-2 py-1 bg-white border border-gray-200 rounded-[6px]"
                >
                  <option value="gemini-flash">Gemini Flash</option>
                  <option value="gemini-pro">
                    Gemini Pro {!["pro", "premium", "school", "trial"].includes(subscriptionTier) ? "🔒" : ""}
                  </option>
                </select>
              </div>
              <div className="text-right">
                <p className="text-gray-400">Estimasi Biaya: <span className="text-blue-700 font-extrabold">{selectedModel === "gemini-pro" ? "8" : "4"} Credit</span></p>
                <p className="text-gray-400 mt-0.5">Saldo: {credits?.balance ?? 0} Credit</p>
              </div>
            </div>

            <AIGlow>
              <button
                onClick={handleGenerateDiagnostic}
                disabled={isDiagnosing || !diagKemampuanAwal || !diagMasalahKelas}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-[12px] font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md"
              >
                {isDiagnosing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Mendiagnosis Kelas...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Mulai Diagnostik Kelas AI
                  </>
                )}
              </button>
            </AIGlow>
          </div>

          {hasGeneratedDiag && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[16px] p-6 border border-gray-200 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-150 pb-3 gap-2">
                <h3 className="font-bold text-gray-900 text-sm">Laporan Analisis Diagnostik Kelas</h3>
                <button
                  onClick={handleApplyDiagnostic}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-95 text-white rounded-[12px] font-bold text-[11px] shadow-sm cursor-pointer"
                >
                  Tempelkan ke Draf Form Semester
                </button>
              </div>
              <div className="bg-gray-50/50 p-5 rounded-[12px] border border-gray-150 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {diagOutput}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* NEW PLAN CREATOR FORM MODAL */}
      <AnimatePresence>
        {showFormModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[24px] max-w-4xl w-full p-8 shadow-2xl relative border border-gray-100 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b border-gray-155 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  {formCreatorType === "AI" ? (
                    <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
                  ) : (
                    <Edit className="w-5 h-5 text-blue-500" />
                  )}
                  <h2 className="text-lg font-black text-gray-900">
                    {formCreatorType === "AI"
                      ? "Buat Rencana Semester Baru (Asisten AI)"
                      : "Buat Rencana Semester Baru (Manual)"}
                  </h2>
                </div>
                <button
                  onClick={() => setShowFormModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors cursor-pointer"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="overflow-y-auto pr-2 space-y-6 flex-1 text-left">
                
                {/* Section 1: Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tahun Ajaran</label>
                    <input
                      type="text"
                      value={targetYear}
                      onChange={(e) => setTargetYear(e.target.value)}
                      placeholder="TA 2026/2027"
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Semester</label>
                    <select
                      value={targetSemester}
                      onChange={(e) => setTargetSemester(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
                    >
                      <option value="Ganjil">Ganjil</option>
                      <option value="Genap">Genap</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Mata Pelajaran</label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
                    >
                      {subjectList.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Kelas</label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
                    >
                      {classList.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Section 2: Short Schedule Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-gray-50/50 p-4 rounded-[16px] border border-gray-250">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pertemuan/Minggu</label>
                    <input
                      type="number"
                      value={pertemuanMinggu}
                      onChange={(e) => setPertemuanMinggu(Math.max(1, Math.min(6, Number(e.target.value))))}
                      min="1"
                      max="6"
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Hari Pertemuan</label>
                    <div className="flex flex-wrap gap-2">
                      {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map((day) => {
                        const isChecked = hariPertemuan.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => handleToggleDay(day)}
                            className={`px-3 py-1.5 rounded-[8px] border text-xs font-bold transition-all cursor-pointer ${
                              isChecked
                                ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Section 3: Quantity & Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Mulai Tanggal</label>
                    <input
                      type="date"
                      value={mulaiTanggal}
                      onChange={(e) => setMulaiTanggal(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Jumlah Pertemuan</label>
                    <input
                      type="number"
                      value={jumlahPertemuan}
                      onChange={(e) => setJumlahPertemuan(Number(e.target.value))}
                      min="1"
                      max="40"
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Alokasi Waktu (JP)</label>
                    <input
                      type="number"
                      value={alokasiJam}
                      onChange={(e) => setAlokasiJam(Number(e.target.value))}
                      min="1"
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Section 4: Text Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Capaian Pembelajaran (CP)</label>
                    <textarea
                      value={capaianPembelajaran}
                      onChange={(e) => setCapaianPembelajaran(e.target.value)}
                      placeholder="Salin atau ketik Capaian Pembelajaran mata pelajaran..."
                      rows={3}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-800 transition-all resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Profil Pelajar Pancasila</label>
                      <textarea
                        value={targetKarakter}
                        onChange={(e) => setTargetKarakter(e.target.value)}
                        placeholder="Contoh: Mandiri, Kreatif, Bergotong Royong..."
                        rows={2}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-800 transition-all resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Model Pembelajaran</label>
                      <select
                        value={modelPembelajaran}
                        onChange={(e) => setModelPembelajaran(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
                      >
                        <option value="Problem Based Learning">Problem Based Learning</option>
                        <option value="Project Based Learning">Project Based Learning</option>
                        <option value="Inquiry Learning">Inquiry Learning</option>
                        <option value="Discovery Learning">Discovery Learning</option>
                        <option value="Direct Instruction">Direct Instruction</option>
                        <option value="Cooperative Learning">Cooperative Learning</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Profil & Karakteristik Kelas</label>
                      <textarea
                        value={profilSiswa}
                        onChange={(e) => setProfilSiswa(e.target.value)}
                        placeholder="Info umum kelompok kemampuan siswa..."
                        rows={2}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-800 transition-all resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Output/Produk Siswa</label>
                      <textarea
                        value={outputDiinginkan}
                        onChange={(e) => setOutputDiinginkan(e.target.value)}
                        placeholder="Format produk tugas siswa..."
                        rows={2}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-800 transition-all resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Proyek Akhir Semester (Opsional)</label>
                      <textarea
                        value={proyekAkhir}
                        onChange={(e) => setProyekAkhir(e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-800 transition-all resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Catatan Tambahan</label>
                      <textarea
                        value={catatanTambahan}
                        onChange={(e) => setCatatanTambahan(e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-800 transition-all resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 5: Assessment Checkboxes */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Instrumen Penilaian</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50 p-4 rounded-[16px] border border-gray-200">
                    {assessmentInstruments.map((inst) => {
                      const isChecked = selectedInstruments.includes(inst);
                      return (
                        <label
                          key={inst}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-[8px] border text-xs font-bold cursor-pointer select-none transition-all ${
                            isChecked
                              ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleInstrument(inst)}
                            className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 w-3.5 h-3.5"
                          />
                          <span>{inst}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Model AI selection (AI Mode only) */}
                {formCreatorType === "AI" && (
                  <div className="bg-blue-50/50 p-4 rounded-[16px] border border-blue-150 flex items-center justify-between text-xs font-semibold">
                    <div>
                      <label className="block text-gray-500 mb-1">Pilih Model AI:</label>
                      <select
                        value={selectedModel}
                        onChange={(e) => {
                          const m = e.target.value as any;
                          if (m === "gemini-pro" && !["pro", "premium", "school", "trial"].includes(subscriptionTier)) {
                            toast.error("Model Gemini Pro hanya tersedia pada Paket Pro atau Premium. Silakan upgrade paket Anda.");
                            return;
                          }
                          setSelectedModel(m);
                          localStorage.setItem("kurikula_selected_ai_model", m);
                        }}
                        className="px-2 py-1 bg-white border border-gray-200 rounded-[6px]"
                      >
                        <option value="gemini-flash">Gemini Flash</option>
                        <option value="gemini-pro">
                          Gemini Pro (Kualitas Tinggi) {!["pro", "premium", "school", "trial"].includes(subscriptionTier) ? "🔒" : ""}
                        </option>
                      </select>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400">Estimasi Biaya: <span className="text-blue-700 font-extrabold">{selectedModel === "gemini-pro" ? "2" : "1"} Credit</span></p>
                      <p className="text-gray-400 mt-0.5">Saldo: {credits?.balance ?? 0} Credit</p>
                    </div>
                  </div>
                )}

              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 border-t border-gray-150 pt-4 mt-6">
                <button
                  onClick={() => setShowFormModal(false)}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[12px] font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                {formCreatorType === "AI" ? (
                  <AIGlow>
                    <button
                      onClick={handleGenerateAIPlan}
                      disabled={isGenerating}
                      className="px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-[12px] font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Generate dengan AI
                        </>
                      )}
                    </button>
                  </AIGlow>
                ) : (
                  <button
                    onClick={handleCreateManualPlan}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    Buat Secara Manual
                  </button>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MEETING DETAIL MODAL */}
      <AnimatePresence>
        {editMeetingModal.open && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[24px] max-w-lg w-full p-6 shadow-2xl border border-gray-100 text-left"
            >
              <h3 className="text-base font-black text-gray-900 border-b border-gray-100 pb-3 mb-4">Edit Rincian Pertemuan</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Topik Pembahasan</label>
                  <input
                    type="text"
                    value={editMeetingModal.topic}
                    onChange={(e) => setEditMeetingModal(prev => ({ ...prev, topic: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-[10px] text-sm text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Tujuan Pembelajaran</label>
                  <textarea
                    value={editMeetingModal.objective}
                    onChange={(e) => setEditMeetingModal(prev => ({ ...prev, objective: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-[10px] text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Aktivitas Utama</label>
                  <textarea
                    value={editMeetingModal.activities}
                    onChange={(e) => setEditMeetingModal(prev => ({ ...prev, activities: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-[10px] text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2.5 mt-6 border-t border-gray-100 pt-4">
                <button
                  onClick={() => setEditMeetingModal(prev => ({ ...prev, open: false }))}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[12px] font-bold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveEditedMeeting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] font-bold text-xs cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM CONFIRMATION POPUP MODAL */}
      <AnimatePresence>
        {confirmModal.open && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[20px] p-6 max-w-sm w-full shadow-2xl border border-gray-100 text-left"
            >
              <h3 className="text-base font-black text-gray-950 mb-2">{confirmModal.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-6">{confirmModal.message}</p>
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[10px] font-bold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    confirmModal.onConfirm?.();
                    setConfirmModal(prev => ({ ...prev, open: false }));
                  }}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-[10px] font-bold text-xs cursor-pointer"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Simple Helper Icon components
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
