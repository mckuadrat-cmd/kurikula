import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Save,
  Download,
  Upload,
  Sparkles,
  RefreshCw,
  AlertCircle,
  X,
  Search,
  FileText,
  BookOpen,
  Star,
  AlertTriangle,
  Play,
  CheckCircle,
  ChevronRight,
  TrendingUp,
  HelpCircle,
  Plus,
  Trash2,
  Edit,
  Printer,
  Clipboard,
  Award,
  ArrowLeft,
  Check,
  Percent,
  Activity,
  Layers,
  ChevronDown,
  Layout,
  Camera,
  Lock
} from "lucide-react";
import {
  isAuthorized,
  readSheetRange,
  appendSheetRows,
  batchUpdateSheetRanges,
  readDatabaseConfig,
  writeDatabaseConfig,
  hasValidToken
} from "../../lib/googleSheetsService";
import { toast } from "sonner";
import { Link, useNavigate, useLocation } from "react-router";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../../utils/supabase/client";

// Interfaces
interface ScoreDetail {
  id: string;
  nilai: number;
  rowIndex: number | null;
  isNew: boolean;
}

interface StudentRow {
  nis: string;
  name: string;
  class: string;
  babScores: Record<string, ScoreDetail>;
}

interface AssessmentColumn {
  id: string; // Format: "Semester|Kategori|Subkategori|TP" or "Kategori|Subkategori|TP"
  semester: string; // "Ganjil" | "Genap"
  kategori: "Formatif" | "Sumatif";
  subkategori: "Kuis" | "Tugas" | "Proyek" | "STP" | "STS" | "SAS";
  tp: string;
}

interface QuestionBankItem {
  id: string;
  subject: string;
  class: string;
  topic: string;
  text: string;
  options: string[]; // e.g. ["A. Pilihan 1", "B. Pilihan 2"...]
  correctAnswer: string; // e.g. "A"
  cognitiveLevel: string;
  createdAt: string;
}

interface ExamPackage {
  id: string;
  name: string;
  subject: string;
  class: string;
  questions: QuestionBankItem[];
  keys: Record<number, string>; // e.g. { 1: "A", 2: "B" }
  createdAt: string;
}

interface StudentAnswer {
  id: string;
  examPackageId: string;
  studentName: string;
  answers: Record<number, string>;
  correctCount: number;
  wrongCount: number;
  emptyCount: number;
  score: number;
  passed: boolean;
}

// Helpers
const parseColumnKey = (key: string, currentSemester: string): AssessmentColumn => {
  if (key.includes("|")) {
    const parts = key.split("|");
    if (parts.length >= 4) {
      const semester = parts[0];
      const kategori = parts[1] === "Sumatif" ? "Sumatif" : "Formatif";
      let subkategori: any = parts[2];
      const validSubs = ["Kuis", "Tugas", "Proyek", "STP", "STS", "SAS"];
      if (!validSubs.includes(subkategori)) {
        subkategori = kategori === "Formatif" ? "Tugas" : "STP";
      }
      return {
        id: key,
        semester,
        kategori,
        subkategori,
        tp: parts[3] || ""
      };
    }

    // Legacy 3-part format
    const semester = "Ganjil";
    const kategori = parts[0] === "Sumatif" ? "Sumatif" : "Formatif";
    let subkategori: any = parts[1];
    const validSubs = ["Kuis", "Tugas", "Proyek", "STP", "STS", "SAS"];
    if (!validSubs.includes(subkategori)) {
      subkategori = kategori === "Formatif" ? "Tugas" : "STP";
    }
    return {
      id: key,
      semester,
      kategori,
      subkategori,
      tp: parts[2] || ""
    };
  }

  const upper = key.toUpperCase();
  if (upper === "UTS" || upper === "STS") {
    return { id: "Sumatif|STS|", semester: "Ganjil", kategori: "Sumatif", subkategori: "STS", tp: "" };
  }
  if (upper === "UAS" || upper === "SAS") {
    return { id: "Sumatif|SAS|", semester: "Ganjil", kategori: "Sumatif", subkategori: "SAS", tp: "" };
  }

  return { id: `Formatif|Tugas|${key}`, semester: "Ganjil", kategori: "Formatif", subkategori: "Tugas", tp: key };
};

const sortColumns = (cols: AssessmentColumn[]): AssessmentColumn[] => {
  const kategoriOrder = { Formatif: 1, Sumatif: 2 };
  const subkategoriOrder = {
    Kuis: 1,
    Tugas: 2,
    Proyek: 3,
    STP: 4,
    STS: 5,
    SAS: 6
  };

  return [...cols].sort((a, b) => {
    if (a.kategori !== b.kategori) {
      return (kategoriOrder[a.kategori] || 99) - (kategoriOrder[b.kategori] || 99);
    }
    if (a.subkategori !== b.subkategori) {
      return (subkategoriOrder[a.subkategori] || 99) - (subkategoriOrder[b.subkategori] || 99);
    }
    return (a.tp || "").localeCompare(b.tp || "", undefined, { numeric: true, sensitivity: 'base' });
  });
};

const getHeaderGroups = (cols: AssessmentColumn[]) => {
  const kategoriGroups: { name: string; colSpan: number }[] = [];
  const subkategoriGroups: { name: string; colSpan: number }[] = [];

  let currentKategori = "";
  let currentKategoriIndex = -1;

  let currentSubkategori = "";
  let currentSubkategoriIndex = -1;

  cols.forEach((col) => {
    if (col.kategori !== currentKategori) {
      currentKategori = col.kategori;
      kategoriGroups.push({ name: col.kategori, colSpan: 1 });
      currentKategoriIndex = kategoriGroups.length - 1;
    } else {
      kategoriGroups[currentKategoriIndex].colSpan++;
    }

    const subKey = `${col.kategori}|${col.subkategori}`;
    if (subKey !== currentSubkategori) {
      currentSubkategori = subKey;
      subkategoriGroups.push({ name: col.subkategori, colSpan: 1 });
      currentSubkategoriIndex = subkategoriGroups.length - 1;
    } else {
      subkategoriGroups[currentSubkategoriIndex].colSpan++;
    }
  });

  return { kategoriGroups, subkategoriGroups };
};

export default function Assessment() {
  const { session } = useAuth();
  const { subscriptionTier, credits, activeWorkspaceId, refresh, aiModels } = useWorkspace();
  const isProOrAbove = ["pro", "premium", "school", "trial"].includes(subscriptionTier);
  const isPremiumOrAbove = ["premium", "school", "trial"].includes(subscriptionTier);
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation views
  const [activeView, setActiveView] = useState<"dashboard" | "sheets">("dashboard");
  const [currentPanel, setCurrentPanel] = useState<string | null>(null);

  const handleColumnAClick = (panel: string) => {
    if (!isProOrAbove) {
      toast.error("Fitur Persiapan Penilaian (Bagian A) hanya tersedia mulai dari Paket Pro. Silakan upgrade paket Anda.");
      return;
    }
    setCurrentPanel(panel);
  };

  const handleColumnBClick = (panel: string) => {
    if (!isPremiumOrAbove) {
      toast.error("Fitur Pelaksanaan Penilaian (Bagian B) hanya tersedia pada Paket Premium. Silakan upgrade paket Anda.");
      return;
    }
    setCurrentPanel(panel);
  };

  const handleColumnCClick = (panel: string) => {
    if (!isPremiumOrAbove) {
      toast.error("Fitur Analisis & Tindak Lanjut (Bagian C) hanya tersedia pada Paket Premium. Silakan upgrade paket Anda.");
      return;
    }
    setCurrentPanel(panel);
  };

  // local storage key loaders
  const [questionBank, setQuestionBank] = useState<QuestionBankItem[]>(() => {
    try {
      const saved = localStorage.getItem("kurikula:questionBank");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [examPackages, setExamPackages] = useState<ExamPackage[]>(() => {
    try {
      const saved = localStorage.getItem("kurikula:examPackages");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [studentAnswers, setStudentAnswers] = useState<StudentAnswer[]>(() => {
    try {
      const saved = localStorage.getItem("kurikula:studentAnswers");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("kurikula:questionBank", JSON.stringify(questionBank));
  }, [questionBank]);

  useEffect(() => {
    localStorage.setItem("kurikula:examPackages", JSON.stringify(examPackages));
  }, [examPackages]);

  useEffect(() => {
    localStorage.setItem("kurikula:studentAnswers", JSON.stringify(studentAnswers));
  }, [studentAnswers]);

  useEffect(() => {
    const wrapper = document.getElementById("main-content-wrapper");
    if (!wrapper) return;
    
    const isTwoColumnPanel = ["buat-soal", "kisi-kisi", "rubrik", "rubric", "ai-analisis"].includes(currentPanel || "");
    
    if (isTwoColumnPanel) {
      wrapper.classList.remove("overflow-y-auto");
      wrapper.classList.add("lg:overflow-hidden");
    } else {
      wrapper.classList.remove("lg:overflow-hidden");
      wrapper.classList.add("overflow-y-auto");
    }
    
    return () => {
      wrapper.classList.remove("lg:overflow-hidden");
      wrapper.classList.add("overflow-y-auto");
    };
  }, [currentPanel]);

  // Tab 2: Buat Soal States
  const [soalTopic, setSoalTopic] = useState("");
  const [soalClass, setSoalClass] = useState("");
  const [soalSubject, setSoalSubject] = useState("");
  const [soalObjective, setSoalObjective] = useState("");
  const [soalQuestionType, setSoalQuestionType] = useState("Pilihan Ganda");
  const [soalCount, setSoalCount] = useState("10");
  const [soalCognitive, setSoalCognitive] = useState("Campuran LOTS-MOTS-HOTS");
  const [soalKonteks, setSoalKonteks] = useState("");
  const [soalNotes, setSoalNotes] = useState("");
  const [soalGeneratedContent, setSoalGeneratedContent] = useState("");
  const [isGeneratingSoal, setIsGeneratingSoal] = useState(false);
  const [hasGeneratedSoal, setHasGeneratedSoal] = useState(false);

  // Soal parsing & preview states
  const [parsedQuestionsPreview, setParsedQuestionsPreview] = useState<QuestionBankItem[]>([]);
  const [showQuestionsPreviewModal, setShowQuestionsPreviewModal] = useState(false);

  // Kisi-kisi states
  const [kisiTopic, setKisiTopic] = useState("");
  const [kisiObjective, setKisiObjective] = useState("");
  const [kisiCount, setKisiCount] = useState("10");
  const [kisiType, setKisiType] = useState("Pilihan Ganda");
  const [kisiGenerated, setKisiGenerated] = useState("");
  const [isGeneratingKisi, setIsGeneratingKisi] = useState(false);

  // Rubrik states
  const [rubricActivity, setRubricActivity] = useState("");
  const [rubricScale, setRubricScale] = useState("4");
  const [rubricGenerated, setRubricGenerated] = useState("");
  const [isGeneratingRubric, setIsGeneratingRubric] = useState(false);

  // Bank Soal View states
  const [selectedQuestionsForPackage, setSelectedQuestionsForPackage] = useState<string[]>([]);
  const [packageName, setPackageName] = useState("");
  const [showPackageCreateModal, setShowPackageCreateModal] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [manualQuestionText, setManualQuestionText] = useState("");
  const [manualOptions, setManualOptions] = useState<string[]>(["", "", "", "", ""]);
  const [manualCorrect, setManualCorrect] = useState("A");
  const [manualLevel, setManualLevel] = useState("C3");

  // Paket Ujian View states
  const [selectedPackageId, setSelectedPackageId] = useState("");

  // LJK States
  const [selectedLjkPackageId, setSelectedLjkPackageId] = useState("");
  const [ljkQuestionCount, setLjkQuestionCount] = useState(30);
  const [ljkOptionsCount, setLjkOptionsCount] = useState(5); // 4 or 5
  const [ljkPacketCode, setLjkPacketCode] = useState("A");

  // Answer Input states
  const [selectedInputPackageId, setSelectedInputPackageId] = useState("");
  const [answerCsvText, setAnswerCsvText] = useState("");
  const [rawImportGradesCsv, setRawImportGradesCsv] = useState("");
  const [showImportGradesModal, setShowImportGradesModal] = useState(false);
  const [bridgeTargetColumn, setBridgeTargetColumn] = useState("");

  // Native OMR LJK Scanner States
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [scanStatus, setScanStatus] = useState<string>("Mencari lembar LJK...");
  const [scannedNIS, setScannedNIS] = useState<string>("");
  const [scannedAnswers, setScannedAnswers] = useState<Record<number, string>>({});
  const [scannedScores, setScannedScores] = useState<{
    correctCount: number;
    wrongCount: number;
    emptyCount: number;
    score: number;
    passed: boolean;
  } | null>(null);
  const [manualMatchedStudentNis, setManualMatchedStudentNis] = useState<string>("");
  const [sessionScannedHistory, setSessionScannedHistory] = useState<Array<{
    nis: string;
    studentName: string;
    score: number;
    correctCount: number;
    wrongCount: number;
    passed: boolean;
  }>>([]);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");


  // Tab 3: Analisis Nilai States
  const [analisisClass, setAnalisisClass] = useState("");
  const [analisisSubject, setAnalisisSubject] = useState("");
  const [analisisTitle, setAnalisisTitle] = useState("");
  const [analisisKktp, setAnalisisKktp] = useState(70);
  const [analisisObjectives, setAnalisisObjectives] = useState("");
  const [analisisIndicators, setAnalisisIndicators] = useState("");
  const [analisisCsvText, setAnalisisCsvText] = useState("");
  const [analisisGeneratedReport, setAnalisisGeneratedReport] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [analisisStats, setAnalisisStats] = useState<any>(null);

  // Downstream actions for Analisis Nilai
  const [activeActionType, setActiveActionType] = useState<"remedial" | "pengayaan" | "orangtua" | "refleksi" | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionModalContent, setActionModalContent] = useState("");
  const [isGeneratingAction, setIsGeneratingAction] = useState(false);

  // Sheets variables
  const [selectedModel, setSelectedModel] = useState<string>(
    localStorage.getItem("kurikula_selected_ai_model") || "gemini-flash"
  );

  // Enforce tier-based locks in local state
  useEffect(() => {
    if (!aiModels || aiModels.length === 0) return;
    const currentModelObj = aiModels.find(m => m.id === selectedModel);
    if (currentModelObj) {
      const cleanTier = (subscriptionTier || "inactive").toLowerCase();
      const allowedTiers = currentModelObj.tier_restriction.map((t: string) => t.toLowerCase());
      if (!allowedTiers.includes(cleanTier)) {
        const firstAllowed = aiModels.find(m => 
          m.tier_restriction.map((t: string) => t.toLowerCase()).includes(cleanTier)
        );
        if (firstAllowed) {
          setSelectedModel(firstAllowed.id);
          localStorage.setItem("kurikula_selected_ai_model", firstAllowed.id);
        }
      }
    }
  }, [subscriptionTier, aiModels, selectedModel]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [columnsList, setColumnsList] = useState<AssessmentColumn[]>([]);
  const [gradesList, setGradesList] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSaved, setLastSaved] = useState("");

  // Sync active class and subject to AI forms
  useEffect(() => {
    if (selectedClass) {
      setSoalClass(prev => prev || selectedClass);
      setAnalisisClass(prev => prev || selectedClass);
      setKisiTopic(prev => prev || `Bab Evaluasi Kelas ${selectedClass}`);
      setRubricActivity(prev => prev || `Presentasi Projek Kelas ${selectedClass}`);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedSubject) {
      setSoalSubject(prev => prev || selectedSubject);
      setAnalisisSubject(prev => prev || selectedSubject);
    }
  }, [selectedSubject]);

  // Modals state
  const [isAddChapterOpen, setIsAddChapterOpen] = useState(false);
  const [newChapterCategory, setNewChapterCategory] = useState("Formatif");
  const [newChapterSubcategory, setNewChapterSubcategory] = useState("Tugas");
  const [selectedTPType, setSelectedTPType] = useState("select");
  const [selectedTPOption, setSelectedTPOption] = useState("");
  const [customTPText, setCustomTPText] = useState("");

  const [isBobotOpen, setIsBobotOpen] = useState(false);
  const [bobotConfig, setBobotConfig] = useState<Record<string, number>>({
    Formatif: 40,
    STP: 20,
    STS: 20,
    SAS: 20,
    Kuis: 30,
    Tugas: 30,
    Proyek: 40
  });
  const [rumusType, setRumusType] = useState<string>("kmerdeka");
  const [bobotForm, setBobotForm] = useState<Record<string, number>>({});
  const [rumusTypeForm, setRumusTypeForm] = useState("kmerdeka");
  const [metodeSTP, setMetodeSTP] = useState<string>("sumatif");
  const [metodeSTPForm, setMetodeSTPForm] = useState<string>("sumatif");
  const [newCategoryName, setNewCategoryName] = useState("");

  // Raport state
  const [selectedRaportStudent, setSelectedRaportStudent] = useState<StudentRow | null>(null);
  const [raportComment, setRaportComment] = useState("");
  const [allRaportComments, setAllRaportComments] = useState<Record<string, string>>({});
  const [isSavingRaport, setIsSavingRaport] = useState(false);
  const [isGeneratingComment, setIsGeneratingComment] = useState(false);

  const [isDirty, setIsDirty] = useState(false);
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
  const [pendingClassChange, setPendingClassChange] = useState<string | null>(null);
  const [pendingSubjectChange, setPendingSubjectChange] = useState<string | null>(null);
  const [pendingSemesterChange, setPendingSemesterChange] = useState<string | null>(null);

  const [selectedSemester, setSelectedSemester] = useState<string>(() => {
    const month = new Date().getMonth();
    return month >= 6 ? "Ganjil" : "Genap";
  });

  const [classList, setClassList] = useState<string[]>([]);
  const [subjectList, setSubjectList] = useState<string[]>([]);

  // Prefill checker
  useEffect(() => {
    if (location.state?.fromMeeting) {
      const s = location.state;
      if (s.meetingType === "soal") {
        setCurrentPanel("buat-soal");
        if (s.topic) setSoalTopic(s.topic);
        if (s.class) setSoalClass(s.class);
        if (s.subject) setSoalSubject(s.subject);
        if (s.learningObjective) setSoalObjective(s.learningObjective);
        if (s.assessmentType) setSoalQuestionType(s.assessmentType);

        let notesText = "";
        if (s.teacherNotes) notesText += `Catatan Pertemuan: ${s.teacherNotes}\n`;
        if (s.assessmentPlan) notesText += `Rencana Asesmen: ${s.assessmentPlan}\n`;
        if (s.capaianPembelajaran) notesText += `Capaian Pembelajaran: ${s.capaianPembelajaran}\n`;
        if (notesText) setSoalNotes(notesText.trim());

        toast.info("Konteks dari Semester Planner berhasil dimuat.");
      }
    }
  }, [location.state]);

  // Load configuration from local cache
  useEffect(() => {
    const savedClasses = localStorage.getItem("daftar_kelas");
    if (savedClasses) {
      const parsed = savedClasses.split(",").map(c => c.trim()).filter(Boolean);
      if (parsed.length > 0) {
        setClassList(parsed);
        setSelectedClass(parsed[0]);
      }
    }
    const savedSubjects = localStorage.getItem("mata_pelajaran");
    if (savedSubjects) {
      const parsed = savedSubjects.split(",").map(s => s.trim()).filter(Boolean);
      if (parsed.length > 0) {
        setSubjectList(parsed);
        setSelectedSubject(parsed[0]);
      }
    }
  }, []);

  // Sync Class and Subject on filter change
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

  // Load live Google Sheets data
  const loadData = async () => {
    if (!selectedClass || !selectedSubject) {
      setGradesList([]);
      return;
    }

    if (!isAuthorized()) {
      setIsDemo(false);
      setColumnsList([
        { id: `${selectedSemester}|Formatif|Tugas|TP 1`, semester: selectedSemester, kategori: "Formatif", subkategori: "Tugas", tp: "TP 1" },
        { id: `${selectedSemester}|Formatif|Tugas|TP 2`, semester: selectedSemester, kategori: "Formatif", subkategori: "Tugas", tp: "TP 2" },
        { id: `${selectedSemester}|Sumatif|STS|`, semester: selectedSemester, kategori: "Sumatif", subkategori: "STS", tp: "" },
        { id: `${selectedSemester}|Sumatif|SAS|`, semester: selectedSemester, kategori: "Sumatif", subkategori: "SAS", tp: "" }
      ]);
      setGradesList([]);
      return;
    }

    setLoading(true);
    setIsDemo(false);
    try {
      const siswaRows = await readSheetRange("Siswa!A2:G");
      const allUniqueClasses = Array.from(new Set(siswaRows.map(row => row[3]).filter(Boolean))) as string[];
      if (allUniqueClasses.length > 0) {
        setClassList(allUniqueClasses);
        localStorage.setItem("daftar_kelas", allUniqueClasses.join(","));
      }

      const classStudents = siswaRows
        .map((row) => ({
          nis: row[0],
          name: row[2] || "",
          class: row[3] || "",
        }))
        .filter((student) => student.class === selectedClass);

      const gradeRows = await readSheetRange("Penilaian!A2:G");
      const parsedGrades: any[] = [];

      gradeRows.forEach((row, index) => {
        const id = row[0];
        const nis = row[1];
        const name = row[2];
        const classVal = row[3];
        const subject = row[4];
        const rawBabName = row[5] || "";

        if (!nis || subject !== selectedSubject) return;

        const colParsed = parseColumnKey(rawBabName, selectedSemester);

        parsedGrades.push({
          rowIndex: index + 2,
          id,
          nis,
          name,
          class: classVal,
          subject,
          babName: colParsed.id,
          nilai: parseInt(row[6]) || 0
        });
      });

      const dbConfig = await readDatabaseConfig();
      let loadedBobot = { Formatif: 40, STP: 20, STS: 20, SAS: 20, Kuis: 30, Tugas: 30, Proyek: 40 };
      let loadedRumus = "kmerdeka";
      let loadedMetodeSTP = "sumatif";

      const bobotKey = `BOBOT_PENILAIAN_${selectedSubject}_${selectedClass}`;
      const rumusKey = `RUMUS_PENILAIAN_${selectedSubject}_${selectedClass}`;
      const stpMethodKey = `METODE_STP_${selectedSubject}_${selectedClass}`;

      if (dbConfig[bobotKey]) {
        try {
          const parsedBobot = JSON.parse(dbConfig[bobotKey]);
          if (parsedBobot.Formatif !== undefined && parsedBobot.STP === undefined) {
            loadedBobot = {
              Formatif: parsedBobot.Formatif,
              STP: Math.round((100 - parsedBobot.Formatif) / 3),
              STS: Math.round((100 - parsedBobot.Formatif) / 3),
              SAS: Math.round((100 - parsedBobot.Formatif) / 3),
              Kuis: 30,
              Tugas: 30,
              Proyek: 40
            };
            const sum = loadedBobot.Formatif + loadedBobot.STP + loadedBobot.STS + loadedBobot.SAS;
            if (sum !== 100) loadedBobot.SAS += (100 - sum);
          } else {
            loadedBobot = { ...loadedBobot, ...parsedBobot };
          }
        } catch { }
      }
      if (dbConfig[rumusKey]) loadedRumus = dbConfig[rumusKey];
      if (dbConfig[stpMethodKey]) loadedMetodeSTP = dbConfig[stpMethodKey];

      if (dbConfig.catatan_raport) {
        try {
          setAllRaportComments(JSON.parse(dbConfig.catatan_raport));
        } catch {
          setAllRaportComments({});
        }
      }

      setBobotConfig(loadedBobot);
      setRumusType(loadedRumus);
      setMetodeSTP(loadedMetodeSTP);

      const uniqueColKeys = Array.from(
        new Set(parsedGrades.map((g) => g.babName))
      ).filter(Boolean);

      let sortedCols: AssessmentColumn[] = [];
      if (uniqueColKeys.length > 0) {
        const parsedCols = uniqueColKeys.map(key => parseColumnKey(key, selectedSemester));
        sortedCols = sortColumns(parsedCols);
      } else {
        const defaultColKeys = [
          `${selectedSemester}|Formatif|Tugas|TP 1`,
          `${selectedSemester}|Sumatif|STP|TP 1`,
          `${selectedSemester}|Formatif|Tugas|TP 2`,
          `${selectedSemester}|Sumatif|STP|TP 2`,
          `${selectedSemester}|Sumatif|STS|`,
          `${selectedSemester}|Sumatif|SAS|`
        ];
        sortedCols = defaultColKeys.map(key => parseColumnKey(key, selectedSemester));
      }

      let filteredCols = sortedCols.filter(col => col.semester === selectedSemester);
      if (filteredCols.length === 0) {
        const defaultColKeys = [
          `${selectedSemester}|Formatif|Tugas|TP 1`,
          `${selectedSemester}|Sumatif|STP|TP 1`,
          `${selectedSemester}|Formatif|Tugas|TP 2`,
          `${selectedSemester}|Sumatif|STP|TP 2`,
          `${selectedSemester}|Sumatif|STS|`,
          `${selectedSemester}|Sumatif|SAS|`
        ];
        filteredCols = defaultColKeys.map(key => parseColumnKey(key, selectedSemester));
      }

      setColumnsList(filteredCols);

      const merged = classStudents.map((student) => {
        const studentScores: Record<string, ScoreDetail> = {};
        sortedCols.forEach((col) => {
          const record = parsedGrades.find(
            (g) => g.nis === student.nis && g.babName === col.id
          );
          if (record) {
            studentScores[col.id] = {
              id: record.id,
              nilai: record.nilai,
              rowIndex: record.rowIndex,
              isNew: false
            };
          } else {
            studentScores[col.id] = {
              id: `PEN-${Date.now()}-${Math.floor(Math.random() * 1000)}-${student.nis}`,
              nilai: 0,
              rowIndex: null,
              isNew: true
            };
          }
        });

        return {
          nis: student.nis,
          name: student.name,
          class: student.class,
          babScores: studentScores
        };
      });

      setGradesList(merged);
      if (filteredCols.length > 0) {
        setBridgeTargetColumn(filteredCols[0].id);
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal menyinkronkan data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClass, selectedSubject, selectedSemester]);

  const calculateStudentAvg = (
    row: StudentRow,
    cols: AssessmentColumn[],
    bobot: Record<string, number>,
    rumus: string
  ) => {
    if (cols.length === 0) return 0;

    const kuisScores: number[] = [];
    const tugasScores: number[] = [];
    const proyekScores: number[] = [];
    const stpScores: number[] = [];
    const stsScores: number[] = [];
    const sasScores: number[] = [];

    cols.forEach((col) => {
      const score = row.babScores[col.id]?.nilai ?? 0;
      if (col.kategori === "Formatif") {
        if (col.subkategori === "Kuis") kuisScores.push(score);
        else if (col.subkategori === "Tugas") tugasScores.push(score);
        else if (col.subkategori === "Proyek") proyekScores.push(score);
        else kuisScores.push(score);
      } else {
        if (col.subkategori === "STP") stpScores.push(score);
        else if (col.subkategori === "STS") stsScores.push(score);
        else if (col.subkategori === "SAS") sasScores.push(score);
      }
    });

    const kuisAvg = kuisScores.length > 0 ? kuisScores.reduce((a, b) => a + b, 0) / kuisScores.length : 0;
    const tugasAvg = tugasScores.length > 0 ? tugasScores.reduce((a, b) => a + b, 0) / tugasScores.length : 0;
    const proyekAvg = proyekScores.length > 0 ? proyekScores.reduce((a, b) => a + b, 0) / proyekScores.length : 0;

    const allFormatifScores = [...kuisScores, ...tugasScores, ...proyekScores];
    const formatifAvg = allFormatifScores.length > 0
      ? allFormatifScores.reduce((a, b) => a + b, 0) / allFormatifScores.length
      : 0;

    let stpAvg = 0;
    let hasStpCols = false;

    if (metodeSTP === "rata_formatif") {
      stpAvg = formatifAvg;
      hasStpCols = allFormatifScores.length > 0;
    } else if (metodeSTP === "bobot_formatif") {
      const wKuis = bobot["Kuis"] ?? 30;
      const wTugas = bobot["Tugas"] ?? 30;
      const wProyek = bobot["Proyek"] ?? 40;

      let weightedSum = 0;
      let activeWeight = 0;

      if (kuisScores.length > 0) {
        weightedSum += kuisAvg * wKuis;
        activeWeight += wKuis;
      }
      if (tugasScores.length > 0) {
        weightedSum += tugasAvg * wTugas;
        activeWeight += wTugas;
      }
      if (proyekScores.length > 0) {
        weightedSum += proyekAvg * wProyek;
        activeWeight += wProyek;
      }
      stpAvg = activeWeight > 0 ? weightedSum / activeWeight : 0;
      hasStpCols = activeWeight > 0;
    } else {
      stpAvg = stpScores.length > 0 ? stpScores.reduce((a, b) => a + b, 0) / stpScores.length : 0;
      hasStpCols = stpScores.length > 0;
    }

    const stsAvg = stsScores.length > 0 ? stsScores.reduce((a, b) => a + b, 0) / stsScores.length : 0;
    const sasAvg = sasScores.length > 0 ? sasScores.reduce((a, b) => a + b, 0) / sasScores.length : 0;

    if (rumus === "kmerdeka" || rumus === "custom") {
      let totalWeighted = 0;
      let totalActiveWeight = 0;

      const components = [
        { key: "Formatif", avg: formatifAvg, hasCols: allFormatifScores.length > 0 },
        { key: "STP", avg: stpAvg, hasCols: hasStpCols },
        { key: "STS", avg: stsAvg, hasCols: stsScores.length > 0 },
        { key: "SAS", avg: sasAvg, hasCols: sasScores.length > 0 },
      ];

      components.forEach((comp) => {
        if (comp.hasCols) {
          const weight = bobot[comp.key] ?? 0;
          totalWeighted += comp.avg * weight;
          totalActiveWeight += weight;
        }
      });

      return totalActiveWeight > 0 ? Math.round(totalWeighted / totalActiveWeight) : 0;
    }

    if (rumus === "k13") {
      const harianScores = [...allFormatifScores];
      if (metodeSTP === "sumatif") {
        harianScores.push(...stpScores);
      }
      const harianAvg = harianScores.length > 0 ? harianScores.reduce((a, b) => a + b, 0) / harianScores.length : 0;

      let totalWeighted = 0;
      let totalActiveWeight = 0;

      if (harianScores.length > 0) {
        totalWeighted += harianAvg * 2;
        totalActiveWeight += 2;
      }
      if (stsScores.length > 0) {
        totalWeighted += stsAvg * 1;
        totalActiveWeight += 1;
      }
      if (sasScores.length > 0) {
        totalWeighted += sasAvg * 1;
        totalActiveWeight += 1;
      }

      return totalActiveWeight > 0 ? Math.round(totalWeighted / totalActiveWeight) : 0;
    }

    const allScores = cols.map((c) => row.babScores[c.id]?.nilai ?? 0);
    return allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
  };

  const handleGradeChange = (nis: string, babName: string, value: string) => {
    setIsDirty(true);
    const rawVal = parseInt(value);
    const score = isNaN(rawVal) ? 0 : Math.min(100, Math.max(0, rawVal));

    setGradesList((prev) =>
      prev.map((student) => {
        if (student.nis === nis) {
          const existing = student.babScores[babName] || {
            id: `PEN-${Date.now()}-${Math.floor(Math.random() * 1000)}-${student.nis}`,
            nilai: 0,
            rowIndex: null,
            isNew: true
          };
          return {
            ...student,
            babScores: {
              ...student.babScores,
              [babName]: {
                ...existing,
                nilai: score
              }
            }
          };
        }
        return student;
      })
    );
  };

  const handleConfirmAddChapter = () => {
    const finalTP = (newChapterSubcategory === "STS" || newChapterSubcategory === "SAS")
      ? ""
      : (selectedTPType === "select" ? selectedTPOption : customTPText.trim());

    if (newChapterSubcategory !== "STS" && newChapterSubcategory !== "SAS" && !finalTP) {
      toast.error("Tujuan Pembelajaran (TP) tidak boleh kosong.");
      return;
    }

    const newId = `${selectedSemester}|${newChapterCategory}|${newChapterSubcategory}|${finalTP}`;
    if (columnsList.some(col => col.id === newId)) {
      toast.error("Kolom penilaian ini sudah ada.");
      return;
    }

    const newCol: AssessmentColumn = {
      id: newId,
      semester: selectedSemester,
      kategori: newChapterCategory as any,
      subkategori: newChapterSubcategory as any,
      tp: finalTP
    };

    setColumnsList((prev) => sortColumns([...prev, newCol]));
    setGradesList((prev) =>
      prev.map((student) => ({
        ...student,
        babScores: {
          ...student.babScores,
          [newId]: {
            id: `PEN-${Date.now()}-${Math.floor(Math.random() * 1000)}-${student.nis}`,
            nilai: 0,
            rowIndex: null,
            isNew: true
          }
        }
      }))
    );

    setIsDirty(true);
    setIsAddChapterOpen(false);
    setCustomTPText("");
    setSelectedTPOption("");
    toast.success("Kolom berhasil ditambahkan!");
  };

  const handleSaveBobotConfig = async () => {
    if (rumusTypeForm !== "k13") {
      const mainKeys = ["Formatif", "STP", "STS", "SAS"];
      const sum = mainKeys.reduce((acc, k) => acc + (bobotForm[k] || 0), 0);
      if (sum !== 100) {
        toast.error(`Total bobot komponen utama harus 100% (saat ini: ${sum}%)`);
        return;
      }
      if (metodeSTPForm === "bobot_formatif") {
        const sumFormatif = (bobotForm["Kuis"] || 0) + (bobotForm["Tugas"] || 0) + (bobotForm["Proyek"] || 0);
        if (sumFormatif !== 100) {
          toast.error(`Total bobot Formatif harus 100% (saat ini: ${sumFormatif}%)`);
          return;
        }
      }
    }

    try {
      const bobotKey = `BOBOT_PENILAIAN_${selectedSubject}_${selectedClass}`;
      const rumusKey = `RUMUS_PENILAIAN_${selectedSubject}_${selectedClass}`;
      const stpMethodKey = `METODE_STP_${selectedSubject}_${selectedClass}`;

      await writeDatabaseConfig({
        [bobotKey]: JSON.stringify(bobotForm),
        [rumusKey]: rumusTypeForm,
        [stpMethodKey]: metodeSTPForm
      });

      setBobotConfig(bobotForm);
      setRumusType(rumusTypeForm);
      setMetodeSTP(metodeSTPForm);
      setIsBobotOpen(false);
      toast.success("Bobot dan rumus penilaian berhasil disimpan!");
    } catch {
      toast.error("Gagal menyimpan konfigurasi bobot.");
    }
  };

  const handleSaveChanges = async () => {
    if (gradesList.length === 0) return;
    setLoading(true);
    try {
      const newRows: any[] = [];
      const updateRows: { range: string; values: any[][] }[] = [];

      gradesList.forEach((student) => {
        columnsList.forEach((col) => {
          const detail = student.babScores[col.id];
          if (!detail) return;

          if (detail.isNew) {
            newRows.push([
              detail.id,
              student.nis,
              student.name,
              student.class,
              selectedSubject,
              col.id,
              detail.nilai
            ]);
          } else if (detail.rowIndex) {
            updateRows.push({
              range: `Penilaian!G${detail.rowIndex}`,
              values: [[detail.nilai]]
            });
          }
        });
      });

      if (newRows.length > 0) {
        await appendSheetRows("Penilaian!A:G", newRows);
      }
      if (updateRows.length > 0) {
        await batchUpdateSheetRanges(updateRows);
      }

      setIsDirty(false);
      setLastSaved(new Date().toLocaleTimeString("id-ID"));
      toast.success("Semua perubahan nilai berhasil disimpan ke Google Drive!");
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan perubahan ke Sheets.");
    } finally {
      setLoading(false);
    }
  };

  // Google Sheets switch prompt checks
  const handleSubjectChangeAttempt = (subj: string) => {
    if (isDirty) {
      setPendingSubjectChange(subj);
      setIsUnsavedModalOpen(true);
    } else {
      setSelectedSubject(subj);
    }
  };

  const handleClassChangeAttempt = (cls: string) => {
    if (isDirty) {
      setPendingClassChange(cls);
      setIsUnsavedModalOpen(true);
    } else {
      setSelectedClass(cls);
    }
  };

  const handleSemesterChangeAttempt = (sem: string) => {
    if (isDirty) {
      setPendingSemesterChange(sem);
      setIsUnsavedModalOpen(true);
    } else {
      setSelectedSemester(sem);
    }
  };

  const handleSaveAndContinue = async () => {
    await handleSaveChanges();
    setIsUnsavedModalOpen(false);
    if (pendingClassChange) {
      setSelectedClass(pendingClassChange);
      setPendingClassChange(null);
    }
    if (pendingSubjectChange) {
      setSelectedSubject(pendingSubjectChange);
      setPendingSubjectChange(null);
    }
    if (pendingSemesterChange) {
      setSelectedSemester(pendingSemesterChange);
      setPendingSemesterChange(null);
    }
  };

  const handleDiscardAndContinue = () => {
    setIsDirty(false);
    setIsUnsavedModalOpen(false);
    if (pendingClassChange) {
      setSelectedClass(pendingClassChange);
      setPendingClassChange(null);
    }
    if (pendingSubjectChange) {
      setSelectedSubject(pendingSubjectChange);
      setPendingSubjectChange(null);
    }
    if (pendingSemesterChange) {
      setSelectedSemester(pendingSemesterChange);
      setPendingSemesterChange(null);
    }
  };

  // AI comments for raport
  const handleOpenRaport = (student: StudentRow) => {
    setSelectedRaportStudent(student);
    const key = `${student.nis}_${selectedSubject}_${selectedSemester}`;
    setRaportComment(allRaportComments[key] || "");
  };

  const handleGenerateAIComment = async () => {
    if (!selectedRaportStudent) return;
    const activeModel = aiModels.find(m => m.id === selectedModel);
    const cost = activeModel ? 1 * Number(activeModel.multiplier) : (selectedModel === "gemini-pro" ? 2 : 1);
    if ((credits?.balance ?? 0) < cost) {
      toast.error("AI Credit tidak cukup.");
      return;
    }
    setIsGeneratingComment(true);
    const avg = calculateStudentAvg(selectedRaportStudent, columnsList, bobotConfig, rumusType);
    let highestCol: any = null;
    let highestVal = -1;
    columnsList.forEach(col => {
      const val = selectedRaportStudent.babScores[col.id]?.nilai ?? 0;
      if (val > highestVal) {
        highestVal = val;
        highestCol = col;
      }
    });

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/generate-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            workspaceId: activeWorkspaceId,
            type: "student-comment",
            model: selectedModel,
            params: {
              studentName: selectedRaportStudent.name,
              subject: selectedSubject,
              averageScore: avg,
              class: selectedClass,
              semester: selectedSemester,
              highestScore: highestVal > 0 ? `${highestVal} (${highestCol.subkategori} ${highestCol.tp || ""})` : "N/A"
            }
          })
        }
      );
      if (response.ok) {
        const res = await response.json();
        setRaportComment(res.content);
        toast.success("Catatan berhasil digenerate!");
        if (refresh) await refresh();
      } else {
        toast.error("Gagal generate comment.");
      }
    } catch {
      toast.error("Gagal memanggil AI.");
    } finally {
      setIsGeneratingComment(false);
    }
  };

  const handleSaveRaportComment = async () => {
    if (!selectedRaportStudent) return;
    setIsSavingRaport(true);
    try {
      const key = `${selectedRaportStudent.nis}_${selectedSubject}_${selectedSemester}`;
      const updatedComments = { ...allRaportComments, [key]: raportComment };
      setAllRaportComments(updatedComments);
      await writeDatabaseConfig({ catatan_raport: JSON.stringify(updatedComments) });
      toast.success("Catatan raport disimpan!");
      setSelectedRaportStudent(null);
    } catch {
      toast.error("Gagal menyimpan.");
    } finally {
      setIsSavingRaport(false);
    }
  };

  const handlePrintPDF = (student: StudentRow) => {
    const avg = calculateStudentAvg(student, columnsList, bobotConfig, rumusType);
    const key = `${student.nis}_${selectedSubject}_${selectedSemester}`;
    const comment = allRaportComments[key] || raportComment || "-";
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const formatifCols = columnsList.filter(c => c.kategori === "Formatif");
    const sumatifCols = columnsList.filter(c => c.kategori === "Sumatif");

    const formatifRowsHtml = formatifCols.map(col => `
      <tr>
        <td class="border border-gray-300 px-4 py-2">${col.subkategori} (${col.tp || "-"})</td>
        <td class="border border-gray-300 px-4 py-2 text-center font-semibold">${student.babScores[col.id]?.nilai ?? 0}</td>
      </tr>
    `).join("");

    const sumatifRowsHtml = sumatifCols.map(col => `
      <tr>
        <td class="border border-gray-300 px-4 py-2">${col.subkategori} (${col.tp || "-"})</td>
        <td class="border border-gray-300 px-4 py-2 text-center font-semibold">${student.babScores[col.id]?.nilai ?? 0}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <html>
        <head><title>Raport - ${student.name}</title><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="p-12 bg-white text-gray-900">
          <div class="max-w-4xl mx-auto border p-8 rounded-lg">
            <h1 class="text-2xl font-bold border-b pb-4 mb-6">LAPORAN HASIL BELAJAR SISWA</h1>
            <p><strong>Nama:</strong> ${student.name} | <strong>NIS:</strong> ${student.nis}</p>
            <p><strong>Mata Pelajaran:</strong> ${selectedSubject} | <strong>Kelas:</strong> ${selectedClass}</p>
            <div class="grid grid-cols-2 gap-6 my-6">
              <div>
                <h3 class="font-bold mb-2">Formatif</h3>
                <table class="w-full border">${formatifRowsHtml}</table>
              </div>
              <div>
                <h3 class="font-bold mb-2">Sumatif</h3>
                <table class="w-full border">${sumatifRowsHtml}</table>
              </div>
            </div>
            <div class="p-4 bg-blue-50 border rounded-lg mb-6">
              <strong>Nilai Akhir: ${avg}</strong>
            </div>
            <div>
              <h3 class="font-bold mb-2">Catatan Guru</h3>
              <p class="italic">"${comment}"</p>
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ==========================================
  // NEW WORKFLOW DASHBOARD UTILITIES
  // ==========================================

  // Parser for AI-generated multiple-choice questions
  const parseGeneratedQuestions = (content: string) => {
    const questions: QuestionBankItem[] = [];
    // Split by question numbers, e.g. "1. ", "2. ", "10. "
    const blocks = content.split(/\n(?=\d+[\.\)]\s)/g);

    blocks.forEach((block, idx) => {
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      const textLine = lines[0].replace(/^\d+[\.\)]\s+/, "");
      const options: string[] = [];
      let correctAnswer = "A";

      lines.slice(1).forEach(line => {
        const optMatch = line.match(/^([A-E])[\.\)]\s+(.+)$/i);
        if (optMatch) {
          options.push(line);
        }
        const keyMatch = line.match(/(?:Kunci|Kunci Jawaban|Answer|Correct|Key):\s*([A-E])/i);
        if (keyMatch) {
          correctAnswer = keyMatch[1].toUpperCase();
        }
      });

      if (options.length > 0) {
        questions.push({
          id: `Q-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
          subject: soalSubject || selectedSubject,
          class: soalClass || selectedClass,
          topic: soalTopic,
          text: textLine,
          options: options,
          correctAnswer: correctAnswer,
          cognitiveLevel: soalCognitive.includes("Campuran") ? "C3" : soalCognitive.split(" ")[0],
          createdAt: new Date().toISOString()
        });
      }
    });

    return questions;
  };

  const handleGenerateSoal = async () => {
    if (!soalTopic.trim()) {
      toast.error("Materi/Topik utama wajib diisi.");
      return;
    }
    if (!soalObjective.trim()) {
      toast.error("Tujuan Pembelajaran wajib diisi.");
      return;
    }

    const activeModel = aiModels.find(m => m.id === selectedModel);
    const cost = activeModel ? 3 * Number(activeModel.multiplier) : (selectedModel === "gemini-pro" ? 6 : 3);
    if ((credits?.balance ?? 0) < cost) {
      toast.error("AI Credit tidak cukup.");
      return;
    }

    setIsGeneratingSoal(true);
    setHasGeneratedSoal(false);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/generate-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            workspaceId: activeWorkspaceId,
            type: "assessment",
            model: selectedModel,
            params: {
              class: soalClass,
              subject: soalSubject,
              topic: soalTopic,
              learningObjective: soalObjective,
              questionType: soalQuestionType,
              numQuestions: soalCount,
              cognitiveLevel: soalCognitive,
              konteks: soalKonteks,
              notes: soalNotes
            }
          })
        }
      );

      if (response.ok) {
        const res = await response.json();
        setSoalGeneratedContent(res.content);
        setHasGeneratedSoal(true);
        toast.success("Soal berhasil dibuat!");
        if (refresh) await refresh();
      } else {
        toast.error("Gagal membuat soal.");
      }
    } catch {
      toast.error("Gagal memanggil AI.");
    } finally {
      setIsGeneratingSoal(false);
    }
  };

  const handleSaveToLocalBank = () => {
    const parsed = parseGeneratedQuestions(soalGeneratedContent);
    if (parsed.length === 0) {
      // Fallback: Save as a single essay question if no options found
      const fallbackItem: QuestionBankItem = {
        id: `Q-${Date.now()}`,
        subject: soalSubject || selectedSubject,
        class: soalClass || selectedClass,
        topic: soalTopic,
        text: soalGeneratedContent,
        options: [],
        correctAnswer: "N/A",
        cognitiveLevel: "C3",
        createdAt: new Date().toISOString()
      };
      setQuestionBank(prev => [...prev, fallbackItem]);
      toast.success("Soal disimpan sebagai instrumen utuh ke Bank Soal!");
    } else {
      setParsedQuestionsPreview(parsed);
      setShowQuestionsPreviewModal(true);
    }
  };

  // Kisi-Kisi Generator
  const handleGenerateKisi = async () => {
    if (!kisiTopic.trim()) {
      toast.error("Topik wajib diisi.");
      return;
    }
    setIsGeneratingKisi(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/generate-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            workspaceId: activeWorkspaceId,
            type: "chat",
            model: selectedModel,
            params: {
              contents: [{
                parts: [{
                  text: `Buatlah matriks Kisi-Kisi Ujian yang terstruktur dalam bentuk tabel Markdown untuk Kelas ${selectedClass}, Mata Pelajaran ${selectedSubject}, dengan topik "${kisiTopic}" dan TP "${kisiObjective || "Mengevaluasi konsep dasar"}". Jumlah soal: ${kisiCount} soal ${kisiType}. Tabel harus memiliki kolom: No, Capaian Pembelajaran / TP, Lingkup Materi, Indikator Soal, Level Kognitif, Bentuk Soal, No Soal. Jangan berikan kalimat pembuka/penutup, langsung output tabel.`
                }]
              }]
            }
          })
        }
      );
      const data = await response.json();
      setKisiGenerated(data.content || "Gagal menghasilkan kisi-kisi.");
    } catch {
      setKisiGenerated("Gagal memanggil AI. Silakan coba lagi.");
    } finally {
      setIsGeneratingKisi(false);
    }
  };

  // Rubrik Generator
  const handleGenerateRubric = async () => {
    if (!rubricActivity.trim()) {
      toast.error("Nama aktivitas wajib diisi.");
      return;
    }
    setIsGeneratingRubric(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/generate-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            workspaceId: activeWorkspaceId,
            type: "rubric-generator",
            model: selectedModel,
            params: {
              class: selectedClass,
              subject: selectedSubject,
              activityName: rubricActivity,
              scale: rubricScale,
              criteria: "Kerjasama Kelompok, Kualitas Hasil Kerja, Kemampuan Komunikasi/Presentasi"
            }
          })
        }
      );
      const data = await response.json();
      setRubricGenerated(data.content || "Gagal menghasilkan rubrik.");
    } catch {
      setRubricGenerated("Gagal memanggil AI. Silakan coba lagi.");
    } finally {
      setIsGeneratingRubric(false);
    }
  };

  // Add Manual question to local bank
  const handleAddManualQuestion = () => {
    if (!manualQuestionText.trim()) {
      toast.error("Teks soal tidak boleh kosong.");
      return;
    }
    const cleanOpts = manualOptions.filter(Boolean);
    const alphabet = ["A", "B", "C", "D", "E"];
    const formattedOpts = cleanOpts.map((opt, i) => `${alphabet[i]}. ${opt}`);

    const item: QuestionBankItem = {
      id: `Q-MAN-${Date.now()}`,
      subject: selectedSubject,
      class: selectedClass,
      topic: "Input Manual",
      text: manualQuestionText,
      options: formattedOpts,
      correctAnswer: manualCorrect,
      cognitiveLevel: manualLevel,
      createdAt: new Date().toISOString()
    };

    setQuestionBank(prev => [...prev, item]);
    setManualQuestionText("");
    setManualOptions(["", "", "", "", ""]);
    setShowAddQuestionModal(false);
    toast.success("Soal manual ditambahkan ke Bank Soal!");
  };

  // Create Package
  const handleCreatePackageFromSelected = () => {
    if (!packageName.trim()) {
      toast.error("Nama paket ujian tidak boleh kosong.");
      return;
    }
    const selectedQ = questionBank.filter(q => selectedQuestionsForPackage.includes(q.id));
    if (selectedQ.length === 0) {
      toast.error("Pilih setidaknya 1 soal.");
      return;
    }

    const keysMap: Record<number, string> = {};
    selectedQ.forEach((q, i) => {
      keysMap[i + 1] = q.correctAnswer;
    });

    const newPackage: ExamPackage = {
      id: `PKG-${Date.now()}`,
      name: packageName,
      subject: selectedSubject,
      class: selectedClass,
      questions: selectedQ,
      keys: keysMap,
      createdAt: new Date().toISOString()
    };

    setExamPackages(prev => [...prev, newPackage]);
    setSelectedQuestionsForPackage([]);
    setPackageName("");
    setShowPackageCreateModal(false);
    toast.success(`Paket Ujian "${packageName}" berhasil dibuat!`);
    setCurrentPanel("paket-ujian");
    setSelectedPackageId(newPackage.id);
  };

  // Shuffle Package
  const handleShufflePackage = (id: string) => {
    setExamPackages(prev => prev.map(p => {
      if (p.id === id) {
        const shuffled = [...p.questions].sort(() => Math.random() - 0.5);
        const keysMap: Record<number, string> = {};
        shuffled.forEach((q, i) => {
          keysMap[i + 1] = q.correctAnswer;
        });
        return {
          ...p,
          questions: shuffled,
          keys: keysMap
        };
      }
      return p;
    }));
    toast.success("Nomor soal diacak!");
  };

  // Print Exam Sheets
  const handlePrintExamSheets = (pkg: ExamPackage) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const questionsHtml = pkg.questions.map((q, idx) => `
      <div class="mb-6 avoid-break">
        <p class="font-semibold">${idx + 1}. ${q.text}</p>
        <div class="grid grid-cols-2 gap-2 mt-2 ml-4">
          ${q.options.map(opt => `<p class="text-sm">${opt}</p>`).join("")}
        </div>
      </div>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>${pkg.name}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              .avoid-break { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body class="p-12 bg-white text-gray-900">
          <div class="max-w-3xl mx-auto">
            <div class="border-b-2 border-gray-900 pb-4 mb-6 text-center">
              <h1 class="text-xl font-bold uppercase tracking-wide">${pkg.name.toUpperCase()}</h1>
              <p class="text-sm">Mata Pelajaran: ${pkg.subject} | Kelas: ${pkg.class}</p>
            </div>
            <div>${questionsHtml}</div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Printable LJK Sheet
  const handlePrintLjk = (pkgName: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const alphabet = ["A", "B", "C", "D", "E"].slice(0, ljkOptionsCount);
    
    // Partition questions (say up to 30) into 3 columns
    const qPerCol = Math.ceil(ljkQuestionCount / 3);
    const yStart = 45;
    const yEnd = 93;
    const rowHeight = qPerCol > 1 ? (yEnd - yStart) / qPerCol : 0;

    // Draw question bubbles in HTML using exact percentage styling
    let questionsHtml = "";
    for (let q = 1; q <= ljkQuestionCount; q++) {
      const colIdx = Math.floor((q - 1) / qPerCol);
      const rowIdx = (q - 1) % qPerCol;
      const colLeft = 5 + colIdx * 31.5;
      const rowTop = yStart + rowIdx * rowHeight;

      let bubblesColHtml = "";
      for (let o = 0; o < ljkOptionsCount; o++) {
        const optLeft = colLeft + 5 + o * 4.2;
        bubblesColHtml += `
          <div style="position: absolute; left: ${optLeft}%; top: ${rowTop}%; width: 3.6%; height: 2.2%; border: 1.5px solid black; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; font-family: monospace; font-weight: bold; background: white; box-sizing: border-box;">
            ${alphabet[o]}
          </div>
        `;
      }

      questionsHtml += `
        <!-- Question ${q} Row -->
        <div style="position: absolute; left: ${colLeft}%; top: ${rowTop}%; width: 5%; height: 2.2%; display: flex; align-items: center; justify-content: flex-start; font-size: 9px; font-weight: bold; font-family: sans-serif;">
          ${q}.
        </div>
        ${bubblesColHtml}
      `;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>LJK - ${pkgName}</title>
          <style>
            @page {
              size: A4;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background-color: white;
              font-family: sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              box-sizing: border-box;
            }
            * {
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          <!-- Main Page Container (centered on A4) -->
          <div style="position: relative; width: 180mm; height: 267mm; background: white; border: 1px solid #ddd; overflow: hidden; box-sizing: border-box;">
            
            <!-- 4 corner anchors (aligned centered to the corners of our coordinate space) -->
            <div style="position: absolute; left: -5mm; top: -5mm; width: 10mm; height: 10mm; background: black;"></div>
            <div style="position: absolute; right: -5mm; top: -5mm; width: 10mm; height: 10mm; background: black;"></div>
            <div style="position: absolute; left: -5mm; bottom: -5mm; width: 10mm; height: 10mm; background: black;"></div>
            <div style="position: absolute; right: -5mm; bottom: -5mm; width: 10mm; height: 10mm; background: black;"></div>

            <!-- Page Header -->
            <div style="position: absolute; left: 5%; top: 1.5%; right: 5%; height: 7%; border-bottom: 3px double black; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h1 style="margin: 0; font-size: 18px; font-weight: 900; letter-spacing: 1px;">LEMBAR JAWABAN KOMPUTER (LJK)</h1>
                <p style="margin: 3px 0 0 0; font-size: 9px; font-weight: bold; color: #555; text-transform: uppercase; letter-spacing: 1px;">SISTEM EVALUASI AKADEMIK KURIKULA</p>
              </div>
              <div style="border: 2px solid black; padding: 4px 10px; font-family: monospace; text-align: center; border-radius: 4px;">
                <span style="font-size: 8px; display: block; font-weight: bold;">PAKET</span>
                <span style="font-size: 16px; font-weight: 900;">${ljkPacketCode}</span>
              </div>
            </div>

            <!-- Left: Student Info Block -->
            <div style="position: absolute; left: 5%; top: 10%; width: 44%; height: 32%; border: 1.5px solid black; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <label style="display: block; font-size: 8px; font-weight: 800; color: #555; margin-bottom: 3px; letter-spacing: 0.5px;">NAMA LENGKAP SISWA</label>
                <div style="height: 25px; border: 1px dashed #ccc; border-radius: 4px; display: flex; align-items: center; padding-left: 8px; font-weight: bold; font-size: 11px;"></div>
              </div>
              
              <div style="display: flex; gap: 8px;">
                <div style="flex: 1;">
                  <label style="display: block; font-size: 8px; font-weight: 800; color: #555; margin-bottom: 3px; letter-spacing: 0.5px;">KELAS</label>
                  <div style="height: 25px; border: 1px dashed #ccc; border-radius: 4px;"></div>
                </div>
                <div style="flex: 1;">
                  <label style="display: block; font-size: 8px; font-weight: 800; color: #555; margin-bottom: 3px; letter-spacing: 0.5px;">TANGGAL</label>
                  <div style="height: 25px; border: 1px dashed #ccc; border-radius: 4px;"></div>
                </div>
              </div>

              <div>
                <label style="display: block; font-size: 8px; font-weight: 800; color: #555; margin-bottom: 3px; letter-spacing: 0.5px;">TANDA TANGAN SISWA</label>
                <div style="height: 45px; border: 1px dashed #ccc; border-radius: 4px;"></div>
              </div>
            </div>

            <!-- Right: NIS Write-in Block -->
            <div style="position: absolute; left: 53%; top: 10%; width: 42%; height: 32%; border: 1.5px solid black; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <label style="display: block; font-size: 8px; font-weight: 800; color: #555; margin-bottom: 3px; letter-spacing: 0.5px;">NOMOR INDUK SISWA (NIS)</label>
                <div style="height: 25px; border: 1px dashed #ccc; border-radius: 4px;"></div>
              </div>
              <div style="font-size: 8px; color: #666; line-height: 1.4;">
                Tuliskan NIS Anda secara lengkap pada kotak di atas. Pastikan angka ditulis dengan jelas agar mudah dibaca oleh guru.
              </div>
            </div>

            <!-- Petunjuk Pengisian -->
            <div style="position: absolute; left: 5%; top: 43.5%; right: 5%; font-size: 8px; color: #666; line-height: 1.3; border: 1px solid #eee; background: #fafafa; padding: 6px 10px; border-radius: 4px;">
              <strong>PETUNJUK PENGISIAN:</strong> Gunakan pensil 2B untuk menghitamkan bulatan jawaban secara penuh. Bersihkan sebersih mungkin jika ingin mengganti jawaban. Pastikan 4 jangkar sudut tidak kotor atau terlipat.
            </div>

            <!-- Questions bubble sheet -->
            ${questionsHtml}

          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Helper to find OMR Anchor Centroids
  const findAnchorCentroid = (
    imgData: ImageData,
    width: number,
    height: number,
    searchX: number,
    searchY: number,
    windowSize = 50
  ) => {
    const minX = Math.max(0, searchX - Math.floor(windowSize / 2));
    const maxX = Math.min(width, searchX + Math.floor(windowSize / 2));
    const minY = Math.max(0, searchY - Math.floor(windowSize / 2));
    const maxY = Math.min(height, searchY + Math.floor(windowSize / 2));

    let minVal = 255;
    const data = imgData.data;

    for (let y = minY; y < maxY; y++) {
      for (let x = minX; x < maxX; x++) {
        const idx = (y * width + x) * 4;
        const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        if (gray < minVal) {
          minVal = gray;
        }
      }
    }

    if (minVal > 110) return null;

    const threshold = Math.min(130, minVal + 25);
    let sumX = 0;
    let sumY = 0;
    let count = 0;

    for (let y = minY; y < maxY; y++) {
      for (let x = minX; x < maxX; x++) {
        const idx = (y * width + x) * 4;
        const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        if (gray <= threshold) {
          sumX += x;
          sumY += y;
          count++;
        }
      }
    }

    if (count < 15 || count > 400) return null;

    return { x: sumX / count, y: sumY / count };
  };

  // Helper to sample grayscale value of a region with bilinear interpolation
  const sampleColor = (
    imgData: ImageData,
    u: number,
    v: number,
    tl: { x: number; y: number },
    tr: { x: number; y: number },
    bl: { x: number; y: number },
    br: { x: number; y: number },
    radius = 2
  ) => {
    const x = (1 - u) * (1 - v) * tl.x + u * (1 - v) * tr.x + (1 - u) * v * bl.x + u * v * br.x;
    const y = (1 - u) * (1 - v) * tl.y + u * (1 - v) * tr.y + (1 - u) * v * bl.y + u * v * br.y;

    let sum = 0;
    let count = 0;
    const data = imgData.data;
    const w = imgData.width;
    const h = imgData.height;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const px = Math.round(x + dx);
        const py = Math.round(y + dy);
        if (px >= 0 && px < w && py >= 0 && py < h) {
          const idx = (py * w + px) * 4;
          sum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          count++;
        }
      }
    }
    return {
      avg: count > 0 ? sum / count : 255,
      x: Math.round(x),
      y: Math.round(y)
    };
  };

  // Get mathematical coordinates for all bubbles
  const getBubbleCoordinates = (questionCount: number, optionsCount: number) => {
    const nisBubbles: Array<{ col: number; val: number; u: number; v: number }> = [];
    for (let col = 0; col < 5; col++) {
      const colLeft = 55 + col * 7.5;
      const u = (colLeft + 3.4) / 100;
      for (let val = 0; val < 10; val++) {
        const rowTop = 15.2 + val * 2.3;
        const v = (rowTop + 1.05) / 100;
        nisBubbles.push({ col, val, u, v });
      }
    }

    const answerBubbles: Array<{ qNum: number; optIdx: number; u: number; v: number; optionLetter: string }> = [];
    const alphabet = ["A", "B", "C", "D", "E"];
    const qPerCol = Math.ceil(questionCount / 3);
    const yStart = 45;
    const yEnd = 93;
    const rowHeight = qPerCol > 1 ? (yEnd - yStart) / qPerCol : 0;

    for (let q = 1; q <= questionCount; q++) {
      const colIdx = Math.floor((q - 1) / qPerCol);
      const rowIdx = (q - 1) % qPerCol;
      const colLeft = 5 + colIdx * 31.5;
      const rowTop = yStart + rowIdx * rowHeight;

      for (let o = 0; o < optionsCount; o++) {
        const optLeft = colLeft + 5 + o * 4.2;
        const u = (optLeft + 1.8) / 100;
        const v = (rowTop + 1.1) / 100;
        answerBubbles.push({ qNum: q, optIdx: o, u, v, optionLetter: alphabet[o] });
      }
    }

    return { nisBubbles, answerBubbles };
  };

  // Web Audio Success Beep
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.error("Audio beep failed", e);
    }
  };

  // Refs for stability detection
  const lastScanRef = useRef<{ nis: string; answers: Record<number, string>; count: number }>({
    nis: "",
    answers: {},
    count: 0
  });
  const scanPausedRef = useRef<boolean>(false);

  // Effect 1: Query Camera Devices
  useEffect(() => {
    if (currentPanel !== "scan-ljk") return;
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const videoDevices = devices.filter(d => d.kind === "videoinput");
      setAvailableDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    });
  }, [currentPanel]);

  // Effect 2: Camera Stream Initiation
  useEffect(() => {
    if (currentPanel !== "scan-ljk") {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
        setActiveStream(null);
      }
      return;
    }

    let isStreamActive = true;
    const constraints: MediaStreamConstraints = {
      video: selectedDeviceId 
        ? { deviceId: { exact: selectedDeviceId }, width: 640, height: 480 } 
        : { facingMode: "environment", width: 640, height: 480 }
    };

    navigator.mediaDevices.getUserMedia(constraints).then(stream => {
      if (isStreamActive) {
        setActiveStream(stream);
        const video = document.getElementById("scanner-video") as HTMLVideoElement;
        if (video) {
          video.srcObject = stream;
          video.play();
        }
      } else {
        stream.getTracks().forEach(track => track.stop());
      }
    }).catch(err => {
      console.error(err);
      toast.error("Gagal mengakses kamera. Pastikan izin kamera telah diberikan.");
    });

    return () => {
      isStreamActive = false;
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [currentPanel, selectedDeviceId]);

  // Effect 3: Scan Loop
  useEffect(() => {
    if (currentPanel !== "scan-ljk" || !activeStream) return;

    let animId: number;
    const video = document.getElementById("scanner-video") as HTMLVideoElement;
    const canvas = document.getElementById("scanner-canvas") as HTMLCanvasElement;
    
    // We get exam package configuration
    const activePkg = examPackages.find(p => p.id === selectedLjkPackageId);
    const qCount = activePkg ? activePkg.questions.length : ljkQuestionCount;
    const oCount = ljkOptionsCount;

    const { nisBubbles, answerBubbles } = getBubbleCoordinates(qCount, oCount);

    const scanFrame = () => {
      if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const width = imgData.width;
          const height = imgData.height;

          // Bounding guide box parameters
          const guideWidth = 300;
          const guideHeight = Math.round(guideWidth * 1.414);
          const guideX = Math.round((width - guideWidth) / 2);
          const guideY = Math.round((height - guideHeight) / 2);

          // Draw the guidelines on screen
          ctx.strokeStyle = "rgba(0, 255, 0, 0.4)";
          ctx.lineWidth = 2;
          ctx.strokeRect(guideX, guideY, guideWidth, guideHeight);

          // Expected anchor coordinates
          const tlExpected = { x: guideX, y: guideY };
          const trExpected = { x: guideX + guideWidth, y: guideY };
          const blExpected = { x: guideX, y: guideY + guideHeight };
          const brExpected = { x: guideX + guideWidth, y: guideY + guideHeight };

          // Detect centroids
          const tl = findAnchorCentroid(imgData, width, height, tlExpected.x, tlExpected.y);
          const tr = findAnchorCentroid(imgData, width, height, trExpected.x, trExpected.y);
          const bl = findAnchorCentroid(imgData, width, height, blExpected.x, blExpected.y);
          const br = findAnchorCentroid(imgData, width, height, brExpected.x, brExpected.y);

          // Check if all anchors are locked
          const allAnchorsLocked = tl && tr && bl && br;
          const useTL = tl || tlExpected;
          const useTR = tr || trExpected;
          const useBL = bl || blExpected;
          const useBR = br || brExpected;

          // Draw search boxes and locking indicators
          const drawCornerIndicator = (expected: { x: number; y: number }, actual: { x: number; y: number } | null) => {
            if (actual) {
              ctx.fillStyle = "#00FF00";
              ctx.beginPath();
              ctx.arc(actual.x, actual.y, 6, 0, 2 * Math.PI);
              ctx.fill();
            } else {
              ctx.strokeStyle = "#FF0000";
              ctx.lineWidth = 1;
              ctx.strokeRect(expected.x - 20, expected.y - 20, 40, 40);
            }
          };

          drawCornerIndicator(tlExpected, tl);
          drawCornerIndicator(trExpected, tr);
          drawCornerIndicator(blExpected, bl);
          drawCornerIndicator(brExpected, br);

          if (allAnchorsLocked) {
            // Draw warped paper outline
            ctx.strokeStyle = "#00FFFF";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(useTL.x, useTL.y);
            ctx.lineTo(useTR.x, useTR.y);
            ctx.lineTo(useBR.x, useBR.y);
            ctx.lineTo(useBL.x, useBL.y);
            ctx.closePath();
            ctx.stroke();
          }

          // Sample paper white reference value in middle of sheet (u=0.5, v=0.42)
          const whiteSample = sampleColor(imgData, 0.5, 0.42, useTL, useTR, useBL, useBR, 3);
          const refWhite = whiteSample.avg;
          const refBlack = 60; // Standard black threshold reference
          const contrast = refWhite - refBlack;

          // Scan status update
          if (scanPausedRef.current) {
            setScanStatus("Scan terkunci. Konfirmasi hasil lalu Simpan.");
          } else if (!allAnchorsLocked) {
            setScanStatus("Sejajarkan 4 sudut LJK dengan kotak jangkar...");
          } else if (contrast < 60) {
            setScanStatus("Pencahayaan kurang baik atau kertas tertutup...");
          } else {
            setScanStatus("Menganalisis lembar jawaban...");

            // Process answers
            const scannedAnsMap: Record<number, string> = {};
            for (let q = 1; q <= qCount; q++) {
              let highestScore = -1;
              let bestLetter = "";
              let secondHighestScore = -1;

              for (let o = 0; o < oCount; o++) {
                const bubbleCoord = answerBubbles.find(b => b.qNum === q && b.optIdx === o);
                if (bubbleCoord) {
                  const sample = sampleColor(imgData, bubbleCoord.u, bubbleCoord.v, useTL, useTR, useBL, useBR, 2);
                  const score = (refWhite - sample.avg) / (refWhite - refBlack);

                  // Visual feed dots
                  ctx.fillStyle = score > 0.45 ? "rgb(239, 68, 68)" : "rgb(234, 179, 8)";
                  ctx.beginPath();
                  ctx.arc(sample.x, sample.y, score > 0.45 ? 4 : 2, 0, 2 * Math.PI);
                  ctx.fill();

                  if (score > highestScore) {
                    secondHighestScore = highestScore;
                    highestScore = score;
                    bestLetter = bubbleCoord.optionLetter;
                  } else if (score > secondHighestScore) {
                    secondHighestScore = score;
                  }
                }
              }

              if (highestScore > 0.45 && highestScore - secondHighestScore > 0.15) {
                scannedAnsMap[q] = bestLetter;
              } else {
                scannedAnsMap[q] = ""; // Empty answer
              }
            }

            const hasFilledBubbles = Object.values(scannedAnsMap).some(ans => ans !== "");

            if (hasFilledBubbles) {
              // Stability checker
              const hist = lastScanRef.current;
              const isMatch = JSON.stringify(hist.answers) === JSON.stringify(scannedAnsMap);

              if (isMatch) {
                hist.count++;
                if (hist.count >= 6) { // Stable for 6 frames (~200ms)
                  // Lock it!
                  scanPausedRef.current = true;
                  playBeep();

                  setScannedAnswers(scannedAnsMap);

                  // Auto-grade against key
                  if (activePkg) {
                    let correct = 0;
                    let wrong = 0;
                    let empty = 0;

                    for (let q = 1; q <= qCount; q++) {
                      const ans = scannedAnsMap[q];
                      const key = activePkg.keys[q];
                      if (!ans) {
                        empty++;
                      } else if (ans === key) {
                        correct++;
                      } else {
                        wrong++;
                      }
                    }

                    const score = qCount > 0 ? Math.round((correct / qCount) * 100) : 0;
                    const passed = score >= 70;

                    setScannedScores({
                      correctCount: correct,
                      wrongCount: wrong,
                      emptyCount: empty,
                      score,
                      passed
                    });

                    // Search for the first student who does not have a grade yet in target column, to auto-suggest
                    const nextStudent = gradesList.find(s => {
                      const scoreObj = s.babScores[bridgeTargetColumn];
                      return !scoreObj || scoreObj.nilai === 0;
                    });
                    if (nextStudent) {
                      setManualMatchedStudentNis(nextStudent.nis);
                      setScannedNIS(nextStudent.nis);
                    } else {
                      setManualMatchedStudentNis("");
                      setScannedNIS("");
                    }
                  }
                }
              } else {
                lastScanRef.current = {
                  nis: "",
                  answers: scannedAnsMap,
                  count: 1
                };
              }
            }
          }
        }
      }
      animId = requestAnimationFrame(scanFrame);
    };

    animId = requestAnimationFrame(scanFrame);
    return () => cancelAnimationFrame(animId);
  }, [currentPanel, activeStream, selectedLjkPackageId, ljkQuestionCount, ljkOptionsCount, gradesList]);

  // Save the currently scanned student score
  const handleSaveScannedResult = () => {
    if (!selectedLjkPackageId) {
      toast.error("Silakan pilih paket ujian terlebih dahulu.");
      return;
    }
    if (!bridgeTargetColumn) {
      toast.error("Silakan pilih Kolom Tujuan Penilaian terlebih dahulu.");
      return;
    }
    if (!scannedScores) {
      toast.error("Tidak ada nilai hasil scan yang siap disimpan.");
      return;
    }

    const targetNis = manualMatchedStudentNis || scannedNIS;
    if (!targetNis) {
      toast.error("NIS siswa belum dipilih.");
      return;
    }

    const matchedStudent = gradesList.find(s => s.nis === targetNis);
    if (!matchedStudent) {
      toast.error("Siswa tidak ditemukan di database kelas ini.");
      return;
    }

    // Update gradesList state
    setGradesList(prev => prev.map(student => {
      if (student.nis === targetNis) {
        const existing = student.babScores[bridgeTargetColumn] || {
          id: `PEN-${Date.now()}-${Math.floor(Math.random() * 1000)}-${student.nis}`,
          nilai: 0,
          rowIndex: null,
          isNew: true
        };
        return {
          ...student,
          babScores: {
            ...student.babScores,
            [bridgeTargetColumn]: {
              ...existing,
              nilai: scannedScores.score
            }
          }
        };
      }
      return student;
    }));

    // Add to local session history
    setSessionScannedHistory(prev => [
      {
        nis: targetNis,
        studentName: matchedStudent.name,
        score: scannedScores.score,
        correctCount: scannedScores.correctCount,
        wrongCount: scannedScores.wrongCount,
        passed: scannedScores.passed
      },
      ...prev.filter(h => h.nis !== targetNis)
    ]);

    setIsDirty(true);
    toast.success(`Nilai ${matchedStudent.name} (${scannedScores.score}) berhasil disimpan secara lokal! Klik "Simpan Perubahan" di atas untuk menyimpan ke Google Drive.`);

    // Reset scanner state for next student
    setScannedNIS("");
    setScannedAnswers({});
    setScannedScores(null);
    setManualMatchedStudentNis("");
    scanPausedRef.current = false;
    lastScanRef.current = { nis: "", answers: {}, count: 0 };
  };

  // Reset the current scan without saving
  const handleResetScanner = () => {
    setScannedNIS("");
    setScannedAnswers({});
    setScannedScores(null);
    setManualMatchedStudentNis("");
    scanPausedRef.current = false;
    lastScanRef.current = { nis: "", answers: {}, count: 0 };
    toast.info("Scanner siap memindai lembar berikutnya.");
  };

  // Deterministic Correction Engine
  const handleProcessAnswerCorrection = () => {
    const pkg = examPackages.find(p => p.id === selectedInputPackageId);
    if (!pkg) {
      toast.error("Ujian belum dipilih.");
      return;
    }
    if (!answerCsvText.trim()) {
      toast.error("Silakan tempel data jawaban siswa.");
      return;
    }

    const lines = answerCsvText.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      toast.error("CSV minimal harus berisi header dan 1 baris siswa.");
      return;
    }

    const results: StudentAnswer[] = [];
    const questionsCount = pkg.questions.length;

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",");
      if (parts.length < 2) continue;

      const name = parts[0];
      const answers: Record<number, string> = {};
      let correct = 0;
      let wrong = 0;
      let empty = 0;

      pkg.questions.forEach((q, idx) => {
        const num = idx + 1;
        const ans = parts[num] ? parts[num].toUpperCase().trim() : "";
        answers[num] = ans;

        if (!ans) {
          empty++;
        } else if (ans === pkg.keys[num]) {
          correct++;
        } else {
          wrong++;
        }
      });

      const score = questionsCount > 0 ? Math.round((correct / questionsCount) * 100) : 0;
      const passed = score >= 70; // Default KKTP 70

      results.push({
        id: `ANS-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
        examPackageId: selectedInputPackageId,
        studentName: name,
        answers,
        correctCount: correct,
        wrongCount: wrong,
        emptyCount: empty,
        score,
        passed
      });
    }

    setStudentAnswers(prev => [
      ...prev.filter(a => a.examPackageId !== selectedInputPackageId),
      ...results
    ]);

    toast.success(`Koreksi selesai! ${results.length} lembar jawaban siswa berhasil dinilai.`);
    setAnswerCsvText("");
    setCurrentPanel("koreksi-otomatis");
  };

  // Bridge Local Workflow results directly into the Active Google Sheets table
  const handleBridgeScoresToSheets = () => {
    const pkgAnswers = studentAnswers.filter(ans => ans.examPackageId === selectedInputPackageId);
    if (pkgAnswers.length === 0) {
      toast.error("Tidak ada data jawaban yang dikoreksi.");
      return;
    }
    if (!bridgeTargetColumn) {
      toast.error("Silakan pilih kolom target di Google Sheets.");
      return;
    }

    setGradesList(prev => prev.map(student => {
      // Fuzzy search by name
      const record = pkgAnswers.find(ans => ans.studentName.toLowerCase().trim() === student.name.toLowerCase().trim());
      if (record) {
        const existing = student.babScores[bridgeTargetColumn] || {
          id: `PEN-${Date.now()}-${Math.floor(Math.random() * 1000)}-${student.nis}`,
          nilai: 0,
          rowIndex: null,
          isNew: true
        };
        return {
          ...student,
          babScores: {
            ...student.babScores,
            [bridgeTargetColumn]: {
              ...existing,
              nilai: record.score
            }
          }
        };
      }
      return student;
    }));

    setIsDirty(true);
    toast.success(`Nilai berhasil disinkronkan ke kolom penilaian lokal! Klik "Simpan Perubahan" di atas untuk menyimpan permanen ke Google Drive.`);
  };

  // AI Analisis Nilai from Local Scores
  const handleAIAnalysisFromLocal = async (packageId: string) => {
    const pkg = examPackages.find(p => p.id === packageId);
    const answers = studentAnswers.filter(a => a.examPackageId === packageId);
    if (!pkg || answers.length === 0) {
      toast.error("Pilih paket ujian yang sudah memiliki data nilai siswa.");
      return;
    }

    const activeModel = aiModels.find(m => m.id === selectedModel);
    const cost = activeModel ? 4 * Number(activeModel.multiplier) : (selectedModel === "gemini-pro" ? 8 : 4);
    if ((credits?.balance ?? 0) < cost) {
      toast.error("AI Credit tidak cukup.");
      return;
    }

    setIsAnalyzing(true);
    setHasAnalyzed(false);

    // Calculate statistical indicators
    const scores = answers.map(a => a.score);
    const totalStudents = answers.length;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const classAverage = Math.round((scores.reduce((a, b) => a + b, 0) / totalStudents) * 10) / 10;

    const passedCount = answers.filter(a => a.score >= 70).length;
    const remedialCount = totalStudents - passedCount;
    const masteryPercentage = Math.round((passedCount / totalStudents) * 100);

    const calculatedStats = {
      totalStudents,
      classAverage,
      highestScore,
      lowestScore,
      passedCount,
      remedialCount,
      masteryPercentage,
      remedialStudents: answers.filter(a => a.score < 70).map(a => a.studentName),
      enrichmentStudents: answers.filter(a => a.score >= 70).map(a => a.studentName)
    };

    setAnalisisStats(calculatedStats);
    setAnalisisClass(pkg.class);
    setAnalisisSubject(pkg.subject);
    setAnalisisTitle(pkg.name);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/generate-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            workspaceId: activeWorkspaceId,
            type: "learning-analysis",
            model: selectedModel,
            params: {
              className: pkg.class,
              subject: pkg.subject,
              assessmentTitle: pkg.name,
              kktp: 70,
              learningObjectives: `Memahami konsep "${pkg.questions[0]?.topic || "materi"}"`,
              indicators: [],
              students: answers.map(a => ({ name: a.studentName, score: a.score })),
              stats: calculatedStats
            }
          })
        }
      );

      if (response.ok) {
        const res = await response.json();
        setAnalisisGeneratedReport(res.content);
        setHasAnalyzed(true);
        toast.success("AI Analisis selesai!");
        if (refresh) await refresh();
      } else {
        toast.error("Gagal melakukan analisis.");
      }
    } catch {
      toast.error("Gagal memanggil AI.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Downstream program generator (Remedial, Pengayaan, Refleksi, Chat)
  const handleGenerateDownstreamAction = async (type: "remedial" | "pengayaan" | "orangtua" | "refleksi") => {
    setActiveActionType(type);
    setActionModalOpen(true);
    setIsGeneratingAction(true);
    setActionModalContent("");

    let actionLabel = "";
    let promptMsg = "";

    if (type === "remedial") {
      actionLabel = "Rencana Program Remedial";
      promptMsg = `Buatlah Rencana Pembelajaran Remedial terperinci untuk kelas ${analisisClass} pada mata pelajaran ${analisisSubject} berdasarkan analisis nilai berikut. Sebutkan nama-nama siswa remedial: ${analisisStats?.remedialStudents?.join(", ") || "tidak ada"}. Rancang aktivitas pengajaran ulang, jadwal, dan asesmen ulangan remedial.`;
    } else if (type === "pengayaan") {
      actionLabel = "Rencana Program Pengayaan";
      promptMsg = `Buatlah Rencana Kegiatan Pengayaan terperinci untuk siswa tuntas di kelas ${analisisClass} pada mata pelajaran ${analisisSubject}. Nama-nama siswa pengayaan: ${analisisStats?.enrichmentStudents?.join(", ") || "tidak ada"}. Rancang proyek mandiri atau penugasan HOTS yang menarik.`;
    } else if (type === "orangtua") {
      actionLabel = "Pesan Informasi untuk Orang Tua";
      promptMsg = `Buatlah draf surat/pesan komunikasi WhatsApp formal dan hangat dari guru kepada orang tua/wali murid mengenai hasil pembelajaran kelas secara umum. Sebutkan rata-rata kelas ${analisisStats?.classAverage || 70} dan persentase ketuntasan ${analisisStats?.masteryPercentage || 0}%. Tuliskan saran bagi orang tua untuk mendampingi belajar anak di rumah.`;
    } else {
      actionLabel = "Refleksi Diri Guru";
      promptMsg = `Buatlah draf Refleksi Diri Guru setelah mengevaluasi hasil belajar kelas ${analisisClass} mata pelajaran ${analisisSubject} dengan rata-rata ${analisisStats?.classAverage || 70} dan ketuntasan ${analisisStats?.masteryPercentage || 0}%. Tuliskan apa kekurangan pembelajaran kemarin, apa yang perlu dipertahankan, dan apa tindakan konkret berikutnya.`;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/generate-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            workspaceId: activeWorkspaceId,
            type: "chat",
            model: selectedModel,
            params: {
              contents: [{
                parts: [{
                  text: `${promptMsg}\n\nLaporan Analisis Acuan:\n${analisisGeneratedReport}`
                }]
              }]
            }
          })
        }
      );

      if (response.ok) {
        const res = await response.json();
        setActionModalContent(res.content);
        if (refresh) await refresh();
      } else {
        toast.error("Gagal men-generate dokumen.");
      }
    } catch {
      toast.error("Gagal memanggil AI.");
    } finally {
      setIsGeneratingAction(false);
    }
  };

  // Simple Markdown Renderer
  const renderSimpleMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      if (line.startsWith("### ")) {
        return <h3 key={idx} className="text-sm font-bold text-gray-900 mt-3 mb-1.5">{line.replace("### ", "")}</h3>;
      }
      if (line.startsWith("## ")) {
        return <h2 key={idx} className="text-base font-bold text-gray-950 mt-4 mb-2 pb-1 border-b">{line.replace("## ", "")}</h2>;
      }
      if (line.startsWith("# ")) {
        return <h1 key={idx} className="text-lg font-extrabold text-gray-950 mt-5 mb-2.5 pb-1 border-b">{line.replace("# ", "")}</h1>;
      }
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        return (
          <ul key={idx} className="list-disc list-inside ml-4 my-1 text-gray-700 text-xs">
            <li>{line.trim().replace(/^[\-\*]\s+/, "")}</li>
          </ul>
        );
      }
      if (/^\d+[\.\)]\s+/.test(line.trim())) {
        return (
          <ol key={idx} className="list-decimal list-inside ml-4 my-1 text-gray-700 text-xs">
            <li>{line.trim().replace(/^\d+[\.\)]\s+/, "")}</li>
          </ol>
        );
      }
      if (line.trim() === "---") {
        return <hr key={idx} className="my-3 border-gray-200" />;
      }
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      return <p key={idx} className="text-xs text-gray-700 my-1 leading-relaxed">{line}</p>;
    });
  };

  // Filter local state
  const classAvgDemo = 70;
  const filteredGrades = searchQuery.trim()
    ? gradesList.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : gradesList;

  const maxScore = gradesList.length > 0
    ? Math.max(...gradesList.map(s => calculateStudentAvg(s, columnsList, bobotConfig, rumusType)))
    : 0;

  const minScore = gradesList.length > 0
    ? Math.min(...gradesList.map(s => calculateStudentAvg(s, columnsList, bobotConfig, rumusType)))
    : 0;

  const gradedCount = gradesList.length > 0
    ? gradesList.filter(s => calculateStudentAvg(s, columnsList, bobotConfig, rumusType) > 0).length
    : 0;

  const classAverage = gradesList.length > 0
    ? Math.round((gradesList.reduce((acc, s) => acc + calculateStudentAvg(s, columnsList, bobotConfig, rumusType), 0) / gradesList.length) * 10) / 10
    : 0;

  return (
    <div className={`p-6 md:p-8 space-y-6 relative flex-1 flex flex-col min-h-0 ${
      ["buat-soal", "kisi-kisi", "rubrik", "rubric", "ai-analisis"].includes(currentPanel || "") ? "lg:overflow-hidden h-full" : ""
    }`}>
      {/* Upper header action group */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Penilaian & Asesmen</h1>
          <p className="text-sm text-gray-600 mt-1">
            Kelola persiapan, pelaksanaan ujian, LJK cetak, koreksi otomatis, dan analisis hasil belajar terpadu.
          </p>
        </div>

        {/* Global toggles and Google Sheets savers */}
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1 border">
            <button
              onClick={() => setActiveView("dashboard")}
              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-1.5 ${activeView === "dashboard" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-850"
                }`}
            >
              <Layout className="w-4 h-4" />
              Workflow
            </button>
            <button
              onClick={() => setActiveView("sheets")}
              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-1.5 ${activeView === "sheets" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-850"
                }`}
            >
              <FileText className="w-4 h-4" />
              Tabel Penilaian
            </button>
          </div>

          {activeView === "sheets" && isAuthorized() && (
            <button
              onClick={handleSaveChanges}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-[10px] font-bold text-sm flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Simpan ke Sheets
            </button>
          )}
        </div>
      </div>

      {/* ONBOARDING ALERT */}
      {!isAuthorized() && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-[12px] flex items-center gap-3 flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="text-sm">
            <strong>Database Google Drive Belum Terhubung:</strong> Beberapa fitur Sheets dan library AI akan berjalan dalam mode simulasi lokal. Hubungkan di Dashboard untuk sinkronisasi penuh.
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

      <AnimatePresence mode="wait">
        {/* VIEW 1: WORKFLOW DASHBOARD */}
        {activeView === "dashboard" && (
          <motion.div
            key="dashboard-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className={`space-y-6 flex-1 flex flex-col min-h-0 ${
              ["buat-soal", "kisi-kisi", "rubrik", "rubric", "ai-analisis"].includes(currentPanel || "") ? "lg:overflow-hidden" : ""
            }`}
          >
            {currentPanel === null ? (
              /* DASHBOARD WORKFLOW GRID (3-COLUMNS) */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

                {/* COLUMN A: PERSIAPAN PENILAIAN */}
                <div className="bg-white rounded-[16px] border border-gray-200 p-5 shadow-sm flex flex-col space-y-4 relative">
                  {!isProOrAbove && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full z-10">
                      <Lock className="w-2.5 h-2.5" /> PRO
                    </div>
                  )}
                  <div className="border-b pb-3 flex items-center gap-2">
                    <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-black text-base">A</div>
                    <div>
                      <h2 className="text-lg font-black text-gray-900">Persiapan Penilaian</h2>
                      <p className="text-sm text-gray-600">Rancang instrumen evaluasi pembelajaran</p>
                    </div>
                  </div>

                  <div className="space-y-3 flex-1">
                    {/* Buat Soal AI */}
                    <div
                      onClick={() => handleColumnAClick("buat-soal")}
                      className="p-4 rounded-[12px] border border-gray-150 hover:border-blue-500 hover:bg-blue-50/5 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                          <Sparkles className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">Buat Soal <span className="px-1.5 py-0.5 bg-gradient-to-r from-[#3C405B] to-[#DF7A5E] text-white text-[10px] font-extrabold rounded-full leading-none select-none">AI</span></h3>
                          <p className="text-sm text-gray-600">Generate bank soal otomatis dengan AI</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </div>

                    {/* Kisi-Kisi AI */}
                    <div
                      onClick={() => handleColumnAClick("kisi-kisi")}
                      className="p-4 rounded-[12px] border border-gray-150 hover:border-blue-500 hover:bg-blue-50/5 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">Kisi-kisi Ujian <span className="px-1.5 py-0.5 bg-gradient-to-r from-[#3C405B] to-[#DF7A5E] text-white text-[10px] font-extrabold rounded-full leading-none select-none">AI</span></h3>
                          <p className="text-sm text-gray-600">Buat matriks pemetaan kisi-kisi ujian</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-teal-500 transition-colors" />
                    </div>

                    {/* Rubrik AI */}
                    <div
                      onClick={() => handleColumnAClick("rubrik")}
                      className="p-4 rounded-[12px] border border-gray-150 hover:border-blue-500 hover:bg-blue-50/5 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                          <Layers className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">Rubrik Penilaian <span className="px-1.5 py-0.5 bg-gradient-to-r from-[#3C405B] to-[#DF7A5E] text-white text-[10px] font-extrabold rounded-full leading-none select-none">AI</span></h3>
                          <p className="text-sm text-gray-600">Rubrik analitik kriteria kinerja siswa</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
                    </div>

                    {/* Bank Soal Repository */}
                    <div
                      onClick={() => handleColumnAClick("bank-soal")}
                      className="p-4 rounded-[12px] border border-gray-150 hover:border-blue-500 hover:bg-blue-50/5 cursor-pointer transition-all flex items-center justify-between group bg-slate-50/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center">
                          <Clipboard className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">Bank Soal</h3>
                          <p className="text-sm text-gray-600">Pustaka soal dan buat paket ujian</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">
                          {questionBank.length} Soal
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-slate-700 transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUMN B: PELAKSANAAN PENILAIAN */}
                <div className="bg-white rounded-[16px] border border-gray-200 p-5 shadow-sm flex flex-col space-y-4 relative">
                  {!isPremiumOrAbove && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full z-10">
                      <Lock className="w-2.5 h-2.5" /> PREMIUM
                    </div>
                  )}
                  <div className="border-b pb-3 flex items-center gap-2">
                    <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center font-black text-base">B</div>
                    <div>
                      <h2 className="text-lg font-black text-gray-900">Pelaksanaan Penilaian</h2>
                      <p className="text-sm text-gray-600">Cetak lembar ujian & input jawaban siswa</p>
                    </div>
                  </div>

                  <div className="space-y-3 flex-1">
                    {/* Paket Ujian */}
                    <div
                      onClick={() => handleColumnBClick("paket-ujian")}
                      className="p-4 rounded-[12px] border border-gray-150 hover:border-amber-500 hover:bg-amber-50/5 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                          <Layers className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">Paket Ujian</h3>
                          <p className="text-sm text-gray-600">Kelola naskah ujian & kunci jawaban</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 w-32">
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-sm font-bold">
                          {examPackages.length} Paket
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors" />
                      </div>
                    </div>

                    {/* Generate LJK */}
                    <div
                      onClick={() => handleColumnBClick("generate-ljk")}
                      className="p-4 rounded-[12px] border border-gray-150 hover:border-amber-500 hover:bg-amber-50/5 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center">
                          <Printer className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">Cetak LJK (HTML)</h3>
                          <p className="text-sm text-gray-600">Buat lembar jawaban komputer siap cetak</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                    </div>

                    {/* Input Jawaban */}
                    <div
                      onClick={() => handleColumnBClick("input-jawaban")}
                      className="p-4 rounded-[12px] border border-gray-150 hover:border-amber-500 hover:bg-amber-50/5 cursor-pointer transition-all flex items-center justify-between group bg-slate-50/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
                          <Edit className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">Input Jawaban Siswa</h3>
                          <p className="text-sm text-gray-600">Tempel CSV atau ketik respon jawaban siswa</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-rose-500 transition-colors" />
                    </div>

                    {/* Scan LJK (Interactive) */}
                    <div
                      onClick={() => handleColumnBClick("scan-ljk")}
                      className="p-4 rounded-[12px] border border-gray-150 hover:border-amber-500 hover:bg-amber-50/5 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                          <Camera className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">Scan Kamera LJK</h3>
                          <p className="text-sm text-gray-600">Scan lembar LJK siswa lewat kamera secara real-time</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
                    </div>
                  </div>
                </div>

                {/* COLUMN C: ANALISIS & TINDAK LANJUT */}
                <div className="bg-white rounded-[16px] border border-gray-200 p-5 shadow-sm flex flex-col space-y-4 relative">
                  {!isPremiumOrAbove && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full z-10">
                      <Lock className="w-2.5 h-2.5" /> PREMIUM
                    </div>
                  )}
                  <div className="border-b pb-3 flex items-center gap-2">
                    <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center font-black text-base">C</div>
                    <div>
                      <h2 className="text-lg font-black text-gray-900">Analisis & Tindak Lanjut</h2>
                      <p className="text-sm text-gray-600">Koreksi otomatis, statistik, & rencana AI</p>
                    </div>
                  </div>

                  <div className="space-y-3 flex-1">
                    {/* Koreksi Otomatis */}
                    <div
                      onClick={() => handleColumnCClick("koreksi-otomatis")}
                      className="p-4 rounded-[12px] border border-gray-150 hover:border-purple-500 hover:bg-purple-50/5 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">Koreksi & Rangkuman Nilai</h3>
                          <p className="text-sm text-gray-600">Hasil koreksi deterministik instan</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                    </div>

                    {/* Analisis Butir Soal */}
                    <div
                      onClick={() => handleColumnCClick("analisis-butir")}
                      className="p-4 rounded-[12px] border border-gray-150 hover:border-purple-500 hover:bg-purple-50/5 cursor-pointer transition-all flex items-center justify-between group bg-slate-50/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                          <Percent className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">Analisis Butir Soal</h3>
                          <p className="text-sm text-gray-600">Tingkat kesulitan soal & daya pengecoh</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                    </div>

                    {/* AI Analisis Nilai */}
                    <div
                      onClick={() => handleColumnCClick("ai-analisis")}
                      className="p-4 rounded-[12px] border border-gray-150 hover:border-purple-500 hover:bg-purple-50/5 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                          <Sparkles className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">Analisis Nilai & Remedial <span className="px-1.5 py-0.5 bg-gradient-to-r from-[#3C405B] to-[#DF7A5E] text-white text-[10px] font-extrabold rounded-full leading-none select-none">AI</span></h3>
                          <p className="text-sm text-gray-600">Refleksi pembelajaran & rekomendasi AI</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* SUB-PANEL CONTAINER WRAPPER WITH BACK BUTTON */
              <div className={`space-y-4 ${
                ["buat-soal", "kisi-kisi", "rubrik", "rubric", "ai-analisis"].includes(currentPanel || "") ? "flex-1 flex flex-col min-h-0 lg:overflow-hidden" : ""
              }`}>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => {
                      setCurrentPanel(null);
                      setKisiGenerated("");
                      setRubricGenerated("");
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-gray-600 flex items-center gap-1.5 text-xs font-bold border"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Kembali ke Dashboard
                  </button>
                </div>

                {/* PANEL 1: BUAT SOAL (AI) */}
                {currentPanel === "buat-soal" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 lg:overflow-hidden">
                    <div className="bg-white rounded-[16px] border border-gray-200 shadow-sm flex flex-col h-full lg:overflow-hidden min-h-0">
                      <div className="p-6 pb-3 border-b border-gray-150 flex-shrink-0 bg-white">
                        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <Sparkles className="w-4.5 h-4.5 text-blue-600 animate-pulse" />
                          Parameter Buat Soal AI
                        </h2>
                      </div>
                      <div className="space-y-3.5 flex-1 overflow-y-auto p-6 min-h-0">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-base font-bold text-gray-600 mb-1">Mata Pelajaran</label>
                            <input
                              type="text"
                              value={soalSubject}
                              onChange={(e) => setSoalSubject(e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg text-base"
                            />
                          </div>
                          <div>
                            <label className="block text-base font-bold text-gray-600 mb-1">Kelas</label>
                            <input
                              type="text"
                              value={soalClass}
                              onChange={(e) => setSoalClass(e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg text-base"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-base font-bold text-gray-600 mb-1">Bentuk Soal</label>
                            <select
                              value={soalQuestionType}
                              onChange={(e) => setSoalQuestionType(e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg text-base"
                            >
                              <option>Pilihan Ganda</option>
                              <option>Essay</option>
                              <option>Isian Singkat</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-base font-bold text-gray-600 mb-1">Jumlah Soal</label>
                            <input
                              type="number"
                              value={soalCount}
                              onChange={(e) => setSoalCount(e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg text-base"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-base font-bold text-gray-600 mb-1">Topik Utama</label>
                          <input
                            type="text"
                            value={soalTopic}
                            onChange={(e) => setSoalTopic(e.target.value)}
                            placeholder="e.g. Bangun Datar Segitiga"
                            className="w-full px-3 py-2 border rounded-lg text-base"
                          />
                        </div>
                        <div>
                          <label className="block text-base font-bold text-gray-600 mb-1">Tujuan Pembelajaran (TP)</label>
                          <textarea
                            value={soalObjective}
                            onChange={(e) => setSoalObjective(e.target.value)}
                            rows={2}
                            placeholder="Siswa mampu menghitung luas segitiga..."
                            className="w-full px-3 py-2 border rounded-lg text-base resize-none"
                          />
                        </div>
                      </div>
                      <div className="p-6 pt-3 border-t border-gray-150 bg-white flex-shrink-0">
                        <button
                          onClick={handleGenerateSoal}
                          disabled={isGeneratingSoal}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[10px] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {isGeneratingSoal ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          Generate dengan AI
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-[16px] border border-gray-200 shadow-sm flex flex-col h-full lg:overflow-hidden min-h-0">
                      <div className="p-6 pb-3 border-b border-gray-150 flex items-center justify-between flex-shrink-0 bg-white">
                        <h3 className="text-xs font-bold text-gray-900">Hasil Output Soal</h3>
                        {hasGeneratedSoal && (
                          <button
                            onClick={handleSaveToLocalBank}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 rounded-[8px] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Save className="w-4 h-4" />
                            Simpan ke Bank Soal
                          </button>
                        )}
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 text-xs leading-relaxed space-y-4 min-h-0">
                        {isGeneratingSoal ? (
                          <div className="h-full flex items-center justify-center flex-col text-center space-y-2">
                            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                            <p className="font-bold text-gray-600">AI sedang menulis instrumen evaluasi...</p>
                          </div>
                        ) : hasGeneratedSoal ? (
                          renderSimpleMarkdown(soalGeneratedContent)
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-400">
                            Belum ada soal ter-generate. Isi parameter di sebelah kiri.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* PANEL 2: KISI-KISI (AI) */}
                {currentPanel === "kisi-kisi" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 lg:overflow-hidden">
                    <div className="bg-white rounded-[16px] border border-gray-200 shadow-sm flex flex-col h-full lg:overflow-hidden min-h-0">
                      <div className="p-6 pb-3 border-b border-gray-150 flex-shrink-0 bg-white">
                        <h2 className="text-sm font-bold text-gray-900">Parameter Kisi-Kisi Ujian</h2>
                      </div>
                      <div className="space-y-3.5 flex-1 overflow-y-auto p-6 min-h-0">
                        <div>
                          <label className="block text-base font-bold text-gray-600 mb-1">Mata Pelajaran / Topik</label>
                          <input
                            type="text"
                            value={kisiTopic}
                            onChange={(e) => setKisiTopic(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-base"
                          />
                        </div>
                        <div>
                          <label className="block text-base font-bold text-gray-600 mb-1">Tujuan Pembelajaran</label>
                          <textarea
                            value={kisiObjective}
                            onChange={(e) => setKisiObjective(e.target.value)}
                            rows={2}
                            placeholder="Siswa mampu mendeskripsikan..."
                            className="w-full px-3 py-2 border rounded-lg text-base resize-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-base font-bold text-gray-600 mb-1">Jumlah Soal</label>
                            <input
                              type="number"
                              value={kisiCount}
                              onChange={(e) => setKisiCount(e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg text-base"
                            />
                          </div>
                          <div>
                            <label className="block text-base font-bold text-gray-600 mb-1">Bentuk Soal</label>
                            <input
                              type="text"
                              value={kisiType}
                              onChange={(e) => setKisiType(e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg text-base"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="p-6 pt-3 border-t border-gray-150 bg-white flex-shrink-0">
                        <button
                          onClick={handleGenerateKisi}
                          disabled={isGeneratingKisi}
                          className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-[10px] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {isGeneratingKisi ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          Generate Kisi-kisi
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-[16px] border border-gray-200 shadow-sm flex flex-col h-full lg:overflow-hidden min-h-0">
                      <div className="p-6 pb-3 border-b border-gray-150 flex items-center justify-between flex-shrink-0 bg-white">
                        <h3 className="text-xs font-bold text-gray-900">Output Kisi-Kisi</h3>
                        {kisiGenerated && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(kisiGenerated);
                              toast.success("Kisi-kisi disalin!");
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer"
                          >
                            <Clipboard className="w-4 h-4 text-gray-500" />
                          </button>
                        )}
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 text-xs leading-relaxed space-y-4 min-h-0">
                        {isGeneratingKisi ? (
                          <div className="h-full flex items-center justify-center flex-col text-center space-y-2">
                            <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
                            <p className="font-bold text-gray-600">AI sedang memetakan kompetensi...</p>
                          </div>
                        ) : kisiGenerated ? (
                          renderSimpleMarkdown(kisiGenerated)
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-400">
                            Masukkan parameter lalu klik Generate.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* PANEL 3: RUBRIK (AI) */}
                {currentPanel === "rubric" || currentPanel === "rubrik" ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 lg:overflow-hidden">
                    <div className="bg-white rounded-[16px] border border-gray-200 shadow-sm flex flex-col h-full lg:overflow-hidden min-h-0">
                      <div className="p-6 pb-3 border-b border-gray-150 flex-shrink-0 bg-white">
                        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          Parameter Rubrik Penilaian
                        </h2>
                      </div>
                      <div className="space-y-3.5 flex-1 overflow-y-auto p-6 min-h-0">
                        <div>
                          <label className="block text-base font-bold text-gray-600 mb-1">Aktivitas / Projek yang Dinilai</label>
                          <input
                            type="text"
                            value={rubricActivity}
                            onChange={(e) => setRubricActivity(e.target.value)}
                            placeholder="e.g. Presentasi Laporan Eksperimen"
                            className="w-full px-3 py-2 border rounded-lg text-base"
                          />
                        </div>
                        <div>
                          <label className="block text-base font-bold text-gray-600 mb-1">Skala Nilai (e.g. 1-4)</label>
                          <input
                            type="number"
                            value={rubricScale}
                            onChange={(e) => setRubricScale(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-base"
                          />
                        </div>
                      </div>
                      <div className="p-6 pt-3 border-t border-gray-150 bg-white flex-shrink-0">
                        <button
                          onClick={handleGenerateRubric}
                          disabled={isGeneratingRubric}
                          className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-[10px] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {isGeneratingRubric ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          Generate Rubrik
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-[16px] border border-gray-200 shadow-sm flex flex-col h-full lg:overflow-hidden min-h-0">
                      <div className="p-6 pb-3 border-b border-gray-150 flex items-center justify-between flex-shrink-0 bg-white">
                        <h3 className="text-xs font-bold text-gray-900">Output Rubrik</h3>
                        {rubricGenerated && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(rubricGenerated);
                              toast.success("Rubrik disalin!");
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer"
                          >
                            <Clipboard className="w-4 h-4 text-gray-500" />
                          </button>
                        )}
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 text-xs leading-relaxed space-y-4 min-h-0">
                        {isGeneratingRubric ? (
                          <div className="h-full flex items-center justify-center flex-col text-center space-y-2">
                            <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
                            <p className="font-bold text-gray-600">AI sedang memformulasikan skala rubrik...</p>
                          </div>
                        ) : rubricGenerated ? (
                          renderSimpleMarkdown(rubricGenerated)
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-400">
                            Masukkan parameter lalu klik Generate.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* PANEL 4: BANK SOAL (LOKAL) */}
                {currentPanel === "bank-soal" && (
                  <div className="bg-white rounded-[16px] border border-gray-200 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <h2 className="text-sm font-bold text-gray-900">Pustaka Bank Soal Lokal</h2>
                        <p className="text-xs text-gray-500">Kumpulan soal yang telah Anda buat atau tambahkan secara manual</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowAddQuestionModal(true)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-[8px] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          Tambah Soal Manual
                        </button>
                        {selectedQuestionsForPackage.length > 0 && (
                          <button
                            onClick={() => setShowPackageCreateModal(true)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[8px] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                          >
                            <Layers className="w-4 h-4" />
                            Buat Paket Ujian ({selectedQuestionsForPackage.length})
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      {questionBank.length === 0 ? (
                        <div className="py-12 text-center text-gray-400 text-xs">
                          Belum ada soal tersimpan di Bank Soal. Gunakan "Buat Soal (AI)" terlebih dahulu.
                        </div>
                      ) : (
                        <table className="w-full border-collapse">
                          <thead className="bg-gray-50 border-b text-left text-xs font-bold text-gray-700">
                            <tr>
                              <th className="px-4 py-2 w-10">Select</th>
                              <th className="px-4 py-2">Pertanyaan / Pilihan</th>
                              <th className="px-4 py-2 w-32">Topik</th>
                              <th className="px-4 py-2 w-20">Kunci</th>
                              <th className="px-4 py-2 w-20">Level</th>
                              <th className="px-4 py-2 w-10">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y text-xs text-gray-800">
                            {questionBank.map(q => (
                              <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3">
                                  {q.correctAnswer !== "N/A" && (
                                    <input
                                      type="checkbox"
                                      checked={selectedQuestionsForPackage.includes(q.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedQuestionsForPackage(prev => [...prev, q.id]);
                                        } else {
                                          setSelectedQuestionsForPackage(prev => prev.filter(id => id !== q.id));
                                        }
                                      }}
                                    />
                                  )}
                                </td>
                                <td className="px-4 py-3 space-y-1 max-w-lg">
                                  <p className="font-semibold text-gray-900">{q.text}</p>
                                  {q.options.length > 0 && (
                                    <div className="grid grid-cols-2 gap-1 text-xs text-gray-500 pl-2">
                                      {q.options.map((o, idx) => <span key={idx}>{o}</span>)}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-gray-500">{q.topic}</td>
                                <td className="px-4 py-3 font-bold text-blue-600">{q.correctAnswer}</td>
                                <td className="px-4 py-3 text-slate-500">{q.cognitiveLevel}</td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => {
                                      setQuestionBank(prev => prev.filter(item => item.id !== q.id));
                                      setSelectedQuestionsForPackage(prev => prev.filter(id => id !== q.id));
                                      toast.success("Soal dihapus!");
                                    }}
                                    className="p-1 hover:bg-red-50 text-red-500 rounded transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* PANEL 5: PAKET UJIAN */}
                {currentPanel === "paket-ujian" && (
                  <div className="bg-white rounded-[16px] border border-gray-200 p-6 shadow-sm space-y-6">
                    <div className="border-b pb-3 flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-bold text-gray-900">Pengelolaan Paket Ujian</h2>
                        <p className="text-xs text-gray-500">Kelola paket soal pilihan Anda untuk dicetak atau dinilai</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Package list */}
                      <div className="border-r pr-4 space-y-2.5">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Daftar Paket</h3>
                        {examPackages.length === 0 ? (
                          <p className="text-xs text-gray-400">Belum ada paket ujian dibuat.</p>
                        ) : (
                          examPackages.map(pkg => (
                            <div
                              key={pkg.id}
                              onClick={() => {
                                setSelectedPackageId(pkg.id);
                                setSelectedLjkPackageId(pkg.id);
                                setSelectedInputPackageId(pkg.id);
                              }}
                              className={`p-3 rounded-lg border cursor-pointer text-xs font-semibold transition-all ${selectedPackageId === pkg.id ? "bg-amber-50/70 border-amber-400 text-amber-900" : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
                                }`}
                            >
                              <p className="font-bold truncate">{pkg.name}</p>
                              <p className="text-xs text-gray-400 mt-1">{pkg.questions.length} Soal • {pkg.subject}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Package details */}
                      <div className="col-span-3 pl-4 space-y-4">
                        {(() => {
                          const pkg = examPackages.find(p => p.id === selectedPackageId);
                          if (!pkg) {
                            return (
                              <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                                Pilih salah satu paket ujian di sebelah kiri.
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between border-b pb-3">
                                <div>
                                  <h3 className="font-extrabold text-sm text-gray-900">{pkg.name}</h3>
                                  <p className="text-xs text-gray-500">Kelas: {pkg.class} | Mapel: {pkg.subject}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleShufflePackage(pkg.id)}
                                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-gray-200 rounded-[8px] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                    title="Acak urutan nomor soal dalam paket"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                    Acak Soal
                                  </button>
                                  <button
                                    onClick={() => handlePrintExamSheets(pkg)}
                                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-[8px] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <Printer className="w-4 h-4" />
                                    Cetak Soal Ujian
                                  </button>
                                  <button
                                    onClick={() => {
                                      setExamPackages(prev => prev.filter(p => p.id !== pkg.id));
                                      setSelectedPackageId("");
                                      toast.success("Paket dihapus.");
                                    }}
                                    className="p-1.5 hover:bg-red-50 text-red-500 rounded border border-red-200 transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kunci Jawaban</h4>
                                <div className="grid grid-cols-5 gap-2.5">
                                  {pkg.questions.map((q, idx) => (
                                    <div key={idx} className="p-2 border rounded-lg text-center bg-gray-50 text-xs">
                                      <span className="text-gray-400 text-xs block">No. {idx + 1}</span>
                                      <strong className="text-blue-600 text-sm">{pkg.keys[idx + 1]}</strong>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2 mt-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Daftar Soal</h4>
                                <div className="max-h-60 overflow-y-auto space-y-2.5 pr-2">
                                  {pkg.questions.map((q, idx) => (
                                    <div key={q.id} className="p-3 border rounded-lg text-xs space-y-1">
                                      <p className="font-semibold text-gray-800">{idx + 1}. {q.text}</p>
                                      {q.options.length > 0 && (
                                        <div className="grid grid-cols-2 gap-1 text-xs text-gray-400 pl-2">
                                          {q.options.map((o, index) => <span key={index}>{o}</span>)}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* PANEL 6: GENERATE LJK */}
                {currentPanel === "generate-ljk" && (
                  <div className="bg-white rounded-[16px] border border-gray-200 p-6 shadow-sm space-y-6">
                    <div className="border-b pb-3">
                      <h2 className="text-sm font-bold text-gray-900">Generator Lembar Jawaban Komputer (LJK)</h2>
                      <p className="text-xs text-gray-500">Cetak lembar jawaban ujian berformat bulat yang kompatibel dengan scanner lokal</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Configuration */}
                      <div className="space-y-4 border-r pr-6">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Atur Layout LJK</h3>

                        <div>
                          <label className="block text-base font-bold text-gray-600 mb-1">Pilih Acuan Paket Ujian</label>
                          <select
                            value={selectedLjkPackageId}
                            onChange={(e) => {
                              setSelectedLjkPackageId(e.target.value);
                              const pkg = examPackages.find(p => p.id === e.target.value);
                              if (pkg) setLjkQuestionCount(pkg.questions.length);
                            }}
                            className="w-full p-2 border rounded-lg text-base"
                          >
                            <option value="">-- Pilih Paket --</option>
                            {examPackages.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-base font-bold text-gray-600 mb-1">Jumlah Pertanyaan</label>
                          <input
                            type="number"
                            value={ljkQuestionCount}
                            onChange={(e) => setLjkQuestionCount(Number(e.target.value))}
                            className="w-full p-2 border rounded-lg text-base"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-base font-bold text-gray-600 mb-1">Jumlah Opsi (A-E)</label>
                            <select
                              value={ljkOptionsCount}
                              onChange={(e) => setLjkOptionsCount(Number(e.target.value))}
                              className="w-full p-2 border rounded-lg text-base"
                            >
                              <option value={4}>4 Pilihan (A-D)</option>
                              <option value={5}>5 Pilihan (A-E)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-base font-bold text-gray-600 mb-1">Kode Paket Ujian</label>
                            <select
                              value={ljkPacketCode}
                              onChange={(e) => setLjkPacketCode(e.target.value)}
                              className="w-full p-2 border rounded-lg text-base"
                            >
                              <option>A</option>
                              <option>B</option>
                              <option>C</option>
                            </select>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const activePkg = examPackages.find(p => p.id === selectedLjkPackageId);
                            handlePrintLjk(activePkg ? activePkg.name : "Ujian Kustom");
                          }}
                          className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-[10px] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                          Cetak LJK (HTML)
                        </button>
                      </div>

                      {/* Mock Sheet Preview */}
                      <div className="col-span-2 bg-slate-50 p-6 rounded-xl border border-dashed flex flex-col items-center justify-center relative min-h-[300px]">
                        <div className="border border-gray-400 bg-white p-4 w-72 rounded shadow-lg text-xs text-gray-400 flex flex-col gap-2">
                          <p className="font-bold border-b pb-1 text-center text-gray-800 text-xs">LEMBAR JAWABAN (PREVIEW)</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>Nama: _________________</div>
                            <div>NIS: _________________</div>
                          </div>
                          <hr />
                          <div className="space-y-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div key={i} className="flex gap-2 items-center">
                                <span className="font-bold">{i + 1}.</span>
                                <div className="flex gap-1">
                                  {["A", "B", "C", "D", "E"].slice(0, ljkOptionsCount).map(l => (
                                    <span key={l} className="w-4 h-4 border rounded-full flex items-center justify-center text-[7px]">{l}</span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* PANEL 10: SCAN KAMERA LJK NATIVE */}
                {currentPanel === "scan-ljk" && (
                  <div className="bg-white rounded-[16px] border border-gray-200 p-6 shadow-sm space-y-6">
                    <div className="border-b pb-3 flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-bold text-gray-900">Pemindai LJK Kamera Native (OMR Reader)</h2>
                        <p className="text-xs text-gray-500">Scan lembar LJK siswa secara langsung menggunakan kamera webcam/HP secara real-time</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* COLUMN 1 & 2: SCANNER FEED */}
                      <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Kamera Preview</label>
                          
                          {/* Device Selector */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Pilih Kamera:</span>
                            <select
                              value={selectedDeviceId}
                              onChange={(e) => setSelectedDeviceId(e.target.value)}
                              className="p-1 border rounded bg-white text-xs font-semibold max-w-[200px]"
                            >
                              {availableDevices.map((d) => (
                                <option key={d.deviceId} value={d.deviceId}>
                                  {d.label || `Kamera ${availableDevices.indexOf(d) + 1}`}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Camera Element Bounding Box */}
                        <div className="relative aspect-[4/3] bg-slate-900 rounded-xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-gray-300">
                          {/* Video Tag (Hidden but playing, providing frame data) */}
                          <video
                            id="scanner-video"
                            className="absolute opacity-0 w-full h-full object-cover pointer-events-none"
                            playsInline
                            muted
                          ></video>
                          
                          {/* Active Canvas containing debug guidelines, video frame and scanned points */}
                          <canvas
                            id="scanner-canvas"
                            className="w-full h-full object-cover"
                          ></canvas>

                          {/* Overlay loading state */}
                          {!activeStream && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 bg-slate-950/80">
                              <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
                              <p className="text-xs font-bold">Mengaktifkan kamera...</p>
                            </div>
                          )}
                        </div>

                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-2.5">
                          <AlertCircle className="w-4.5 h-4.5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-amber-800 space-y-0.5">
                            <p className="font-bold">Panduan Pemindaian:</p>
                            <p>1. Sejajarkan LJK A4 Anda ke dalam kotak panduan hijau.</p>
                            <p>2. Pastikan 4 titik jangkar hitam di sudut terdeteksi (ditandai dengan bulatan hijau menyala).</p>
                            <p>3. Tahan kamera dalam keadaan stabil selama 1-2 detik hingga pemindai berbunyi BEEP dan hasil scan terkunci.</p>
                          </div>
                        </div>
                      </div>

                      {/* COLUMN 3: RESULTS & SAVE */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Parameter Ujian</h3>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Pilih Acuan Ujian</label>
                            <select
                              value={selectedLjkPackageId}
                              onChange={(e) => {
                                setSelectedLjkPackageId(e.target.value);
                                const pkg = examPackages.find(p => p.id === e.target.value);
                                if (pkg) setLjkQuestionCount(pkg.questions.length);
                              }}
                              className="w-full p-2 border rounded-lg text-sm bg-white font-semibold"
                            >
                              <option value="">-- Pilih Paket Ujian --</option>
                              {examPackages.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.class})</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Kolom Tujuan Penilaian (Google Sheets)</label>
                            <select
                              value={bridgeTargetColumn}
                              onChange={(e) => setBridgeTargetColumn(e.target.value)}
                              className="w-full p-2 border rounded-lg text-sm bg-white font-semibold"
                            >
                              <option value="">-- Pilih Kolom Tujuan --</option>
                              {columnsList.map(col => (
                                <option key={col.id} value={col.id}>{col.tp || col.subkategori}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <hr />

                        {/* Scanner Status Box */}
                        <div className="p-3 bg-gray-50 border rounded-lg flex items-center justify-between text-xs">
                          <span className="font-semibold text-gray-500">Status Reader:</span>
                          <span className={`font-bold px-2 py-0.5 rounded-full ${
                            scannedScores ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800 animate-pulse"
                          }`}>
                            {scanStatus}
                          </span>
                        </div>

                        {/* Scanned Results Confirmation Card */}
                        {scannedScores ? (
                          <div className="bg-slate-50 border-2 border-amber-400 p-4 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
                            <div className="border-b pb-2 flex justify-between items-center">
                              <span className="text-xs font-extrabold text-amber-800 tracking-wider uppercase">Lembar Terdeteksi</span>
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">LOCKED</span>
                            </div>                             <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-gray-500 block">NIS Aktif:</span>
                                <span className="font-mono font-black text-lg text-slate-800">{manualMatchedStudentNis || "-"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500 block">Skor Hasil Ujian:</span>
                                <span className={`text-lg font-black block ${scannedScores.passed ? "text-green-600" : "text-rose-600"}`}>
                                  {scannedScores.score} <span className="text-[10px] font-bold">({scannedScores.correctCount} Benar)</span>
                                </span>
                              </div>
                            </div>

                            {/* Dropdown for Student Confirmation */}
                            <div>
                              <label className="block text-[11px] font-bold text-gray-600 mb-1">Pilih Siswa Pemilik Lembar:</label>
                              <select
                                value={manualMatchedStudentNis}
                                onChange={(e) => setManualMatchedStudentNis(e.target.value)}
                                className="w-full p-2 border rounded-lg text-xs bg-white font-bold text-gray-800"
                              >
                                <option value="">-- Hubungkan Siswa --</option>
                                {gradesList.map((std) => (
                                  <option key={std.nis} value={std.nis}>
                                    [{std.nis}] {std.name}
                                  </option>
                                ))}
                              </select>
                              {manualMatchedStudentNis && (
                                <p className="text-[10px] text-green-600 mt-1 font-semibold">
                                  ✓ Nilai akan disimpan untuk: {gradesList.find(s => s.nis === manualMatchedStudentNis)?.name}
                                </p>
                              )}
                              {!manualMatchedStudentNis && (
                                <p className="text-[10px] text-rose-500 mt-1 font-semibold">
                                  ⚠ Pilih siswa penerima nilai!
                                </p>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveScannedResult}
                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
                              >
                                Simpan Nilai
                              </button>
                              <button
                                onClick={handleResetScanner}
                                className="px-3.5 py-2 bg-white hover:bg-gray-150 border rounded-lg text-xs font-bold text-gray-700 transition-all cursor-pointer"
                              >
                                Ulangi
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="h-44 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center p-4 text-gray-400 gap-2 bg-slate-50/50">
                            <Camera className="w-8 h-8 text-gray-300 animate-bounce" />
                            <p className="text-xs font-semibold">Menunggu lembar LJK didekatkan...</p>
                            <p className="text-[10px] text-gray-400">Pilih Ujian & Kolom Tujuan terlebih dahulu di atas</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom: Session Scan History */}
                    {sessionScannedHistory.length > 0 && (
                      <div className="border-t pt-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Daftar Scan Sesi Ini ({sessionScannedHistory.length})</h3>
                          <button
                            onClick={() => setSessionScannedHistory([])}
                            className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer"
                          >
                            Hapus Log Sesi
                          </button>
                        </div>
                        <div className="overflow-x-auto border rounded-lg">
                          <table className="min-w-full text-xs text-left">
                            <thead className="bg-slate-50 border-b">
                              <tr>
                                <th className="p-2 font-bold text-gray-500">NIS</th>
                                <th className="p-2 font-bold text-gray-500">Nama Siswa</th>
                                <th className="p-2 font-bold text-gray-500 text-center">Jawaban Benar</th>
                                <th className="p-2 font-bold text-gray-500 text-center">Nilai</th>
                                <th className="p-2 font-bold text-gray-500 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {sessionScannedHistory.map((hist) => (
                                <tr key={hist.nis} className="hover:bg-slate-50/50">
                                  <td className="p-2 font-mono">{hist.nis}</td>
                                  <td className="p-2 font-semibold text-gray-800">{hist.studentName}</td>
                                  <td className="p-2 text-center font-bold text-gray-600">{hist.correctCount} / {hist.correctCount + hist.wrongCount}</td>
                                  <td className="p-2 text-center font-black text-gray-900">{hist.score}</td>
                                  <td className="p-2 text-center">
                                    <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                                      hist.passed ? "bg-green-100 text-green-800" : "bg-rose-100 text-rose-800"
                                    }`}>
                                      {hist.passed ? "LULUS" : "REMEDIAL"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* PANEL 7: INPUT JAWABAN */}
                {currentPanel === "input-jawaban" && (
                  <div className="bg-white rounded-[16px] border border-gray-200 p-6 shadow-sm space-y-6">
                    <div className="border-b pb-3 flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-bold text-gray-900">Input Lembar Jawaban Siswa</h2>
                        <p className="text-xs text-gray-500">Masukkan pilihan jawaban siswa terhadap paket kunci terpilih</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-4 border-r pr-6">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Parameter Ujian</h3>

                        <div>
                          <label className="block text-base font-bold text-gray-600 mb-1">Pilih Ujian Uji Coba</label>
                          <select
                            value={selectedInputPackageId}
                            onChange={(e) => setSelectedInputPackageId(e.target.value)}
                            className="w-full p-2 border rounded-lg text-base"
                          >
                            <option value="">-- Pilih Paket --</option>
                            {examPackages.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        {selectedInputPackageId && (
                          <div className="p-3 bg-blue-50 border rounded-lg text-xs space-y-1 text-blue-800">
                            <p className="font-bold">Info Kunci Aktif:</p>
                            <p>Jumlah Soal: {examPackages.find(p => p.id === selectedInputPackageId)?.questions.length} Butir</p>
                          </div>
                        )}
                      </div>

                      <div className="col-span-2 space-y-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tempel Data Respon Siswa (CSV)</h3>
                        <textarea
                          value={answerCsvText}
                          onChange={(e) => setAnswerCsvText(e.target.value)}
                          placeholder="Format CSV: Nama,No1,No2,No3...&#10;Contoh:&#10;Nama,1,2,3,4,5&#10;Andi,A,B,C,D,E&#10;Budi,A,A,C,C,E"
                          rows={8}
                          className="w-full p-3 font-mono text-base border rounded-lg bg-gray-50 resize-none focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          onClick={handleProcessAnswerCorrection}
                          className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-[10px] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                        >
                          <Check className="w-4 h-4" />
                          Proses Koreksi & Hitung Nilai
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* PANEL 8: KOREKSI OTOMATIS */}
                {currentPanel === "koreksi-otomatis" && (
                  <div className="bg-white rounded-[16px] border border-gray-200 p-6 shadow-sm space-y-6">
                    <div className="border-b pb-3 flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-bold text-gray-900">Hasil Koreksi Jawaban Siswa</h2>
                        <p className="text-xs text-gray-500">Nilai terhitung otomatis berdasarkan perbandingan kunci paket</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedInputPackageId}
                          onChange={(e) => setSelectedInputPackageId(e.target.value)}
                          className="p-1.5 border rounded-lg text-base font-semibold"
                        >
                          <option value="">-- Pilih Paket --</option>
                          {examPackages.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAIAnalysisFromLocal(selectedInputPackageId)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-[8px] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                          Analisis Kualitas Nilai AI
                        </button>
                      </div>
                    </div>

                    {/* Bridge to sheets section */}
                    <div className="p-4 bg-slate-50 border rounded-lg flex flex-wrap gap-4 items-center justify-between">
                      <div className="text-xs">
                        <p className="font-bold text-gray-800">Bridge Google Sheets Live</p>
                        <p className="text-gray-500 mt-0.5">Kirimkan skor akhir ke kolom daftar nilai spreadsheet Anda</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={bridgeTargetColumn}
                          onChange={(e) => setBridgeTargetColumn(e.target.value)}
                          className="p-1.5 border bg-white rounded-lg text-base font-semibold"
                        >
                          <option value="">-- Pilih Kolom Tujuan --</option>
                          {columnsList.map(col => (
                            <option key={col.id} value={col.id}>{col.tp || col.subkategori}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleBridgeScoresToSheets}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-sm flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          Kirim ke Sheets
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      {studentAnswers.filter(a => a.examPackageId === selectedInputPackageId).length === 0 ? (
                        <p className="py-12 text-center text-gray-400 text-xs">Pilih paket ujian yang sudah diisi lembar jawabannya.</p>
                      ) : (
                        <table className="w-full border-collapse">
                          <thead className="bg-gray-50 text-left text-xs font-bold text-gray-700">
                            <tr>
                              <th className="px-4 py-2">Nama Siswa</th>
                              <th className="px-4 py-2 text-center w-24">Benar</th>
                              <th className="px-4 py-2 text-center w-24">Salah</th>
                              <th className="px-4 py-2 text-center w-24">Kosong</th>
                              <th className="px-4 py-2 text-center w-24">Skor Akhir</th>
                              <th className="px-4 py-2 text-center w-32">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y text-xs text-gray-800">
                            {studentAnswers.filter(a => a.examPackageId === selectedInputPackageId).map((ans, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-semibold text-gray-900">{ans.studentName}</td>
                                <td className="px-4 py-3 text-center text-emerald-600 font-bold">{ans.correctCount}</td>
                                <td className="px-4 py-3 text-center text-red-500">{ans.wrongCount}</td>
                                <td className="px-4 py-3 text-center text-gray-400">{ans.emptyCount}</td>
                                <td className="px-4 py-3 text-center font-black text-sm text-blue-600">{ans.score}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${ans.passed ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                                    }`}>
                                    {ans.passed ? "Tuntas" : "Remedial"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* PANEL 9: ANALISIS BUTIR SOAL */}
                {currentPanel === "analisis-butir" && (
                  <div className="bg-white rounded-[16px] border border-gray-200 p-6 shadow-sm space-y-6">
                    <div className="border-b pb-3 flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-bold text-gray-900">Analisis Butir Soal & Distraktor</h2>
                        <p className="text-xs text-gray-500">Evaluasi efektivitas butir soal PG berdasarkan pola respon murid</p>
                      </div>
                      <div>
                        <select
                          value={selectedInputPackageId}
                          onChange={(e) => setSelectedInputPackageId(e.target.value)}
                          className="p-1.5 border rounded-lg text-base font-semibold"
                        >
                          <option value="">-- Pilih Paket --</option>
                          {examPackages.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      {(() => {
                        const pkg = examPackages.find(p => p.id === selectedInputPackageId);
                        const answers = studentAnswers.filter(a => a.examPackageId === selectedInputPackageId);

                        if (!pkg || answers.length === 0) {
                          return (
                            <p className="py-12 text-center text-gray-400 text-xs">Pilih paket ujian yang sudah dinilai.</p>
                          );
                        }

                        return (
                          <table className="w-full border-collapse">
                            <thead className="bg-gray-50 text-left text-xs font-bold text-gray-700">
                              <tr>
                                <th className="px-4 py-2 w-16 text-center">No</th>
                                <th className="px-4 py-2">Soal / Bahasan</th>
                                <th className="px-4 py-2 text-center w-24">Kunci</th>
                                <th className="px-4 py-2 text-center w-28">Ketuntasan</th>
                                <th className="px-4 py-2 text-center w-24">Tingkat Kesulitan</th>
                                <th className="px-4 py-2 text-center w-40">Distribusi Jawaban</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y text-xs text-gray-800">
                              {pkg.questions.map((q, idx) => {
                                const num = idx + 1;
                                const total = answers.length;
                                const correctCount = answers.filter(a => a.answers[num] === q.correctAnswer).length;
                                const correctPct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

                                // Difficulty label
                                const diffLabel = correctPct >= 70 ? "Mudah" : correctPct >= 30 ? "Sedang" : "Sulit";
                                const diffColor = correctPct >= 70 ? "text-emerald-600 bg-emerald-50" : correctPct >= 30 ? "text-amber-600 bg-amber-50" : "text-rose-600 bg-rose-50";

                                // Distractor counters
                                const optionsCount: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
                                answers.forEach(a => {
                                  const ans = a.answers[num] || "Kosong";
                                  if (optionsCount[ans] !== undefined) {
                                    optionsCount[ans]++;
                                  } else {
                                    optionsCount["Kosong"] = (optionsCount["Kosong"] || 0) + 1;
                                  }
                                });

                                return (
                                  <tr key={q.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-center font-bold">{num}</td>
                                    <td className="px-4 py-3 max-w-md font-medium truncate">{q.text}</td>
                                    <td className="px-4 py-3 text-center font-bold text-blue-600">{q.correctAnswer}</td>
                                    <td className="px-4 py-3 text-center font-bold">{correctPct}%</td>
                                    <td className="px-4 py-3 text-center">
                                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${diffColor}`}>
                                        {diffLabel}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500 font-mono text-center">
                                      {Object.entries(optionsCount).map(([k, v]) => `${k}:${v}`).join(" | ")}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* PANEL 10: AI ANALISIS NILAI */}
                {currentPanel === "ai-analisis" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 lg:overflow-hidden">
                    {/* Left stats block */}
                    <div className="bg-white rounded-[16px] border border-gray-200 shadow-sm flex flex-col justify-between h-full lg:overflow-hidden min-h-0">
                      <div className="p-6 pb-3 border-b border-gray-150 flex-shrink-0 bg-white">
                        <h2 className="text-sm font-bold text-gray-900">Analisis Kualitas Nilai AI</h2>
                        <p className="text-xs text-gray-500">Laporan pedagogis mendalam dengan rencana tindak lanjut</p>
                      </div>

                      <div className="p-6 space-y-4 flex-1 overflow-y-auto min-h-0">
                        {/* Stats counters */}
                        <div className="grid grid-cols-3 gap-3 text-center text-xs">
                          <div className="border p-2 rounded-lg bg-gray-50">
                            <span className="text-xs text-gray-400 block font-bold">RERATA KELAS</span>
                            <strong className="text-blue-600 text-lg mt-0.5 block">{analisisStats?.classAverage || classAvgDemo}</strong>
                          </div>
                          <div className="border p-2 rounded-lg bg-gray-50">
                            <span className="text-xs text-gray-400 block font-bold">KETUNTASAN</span>
                            <strong className="text-emerald-600 text-lg mt-0.5 block">{analisisStats?.masteryPercentage || 80}%</strong>
                          </div>
                          <div className="border p-2 rounded-lg bg-gray-50">
                            <span className="text-xs text-gray-400 block font-bold">REMEDIAL</span>
                            <strong className="text-red-500 text-lg mt-0.5 block">{analisisStats?.remedialCount || 0} Siswa</strong>
                          </div>
                        </div>

                        <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-lg text-xs space-y-1 text-purple-800">
                          <p className="font-bold">Langkah Tindak Lanjut:</p>
                          <p className="text-xs text-purple-700">Gunakan tombol di bawah untuk membuat program remedial, pengayaan, refleksi diri guru, atau draf komentar raport bagi murid.</p>
                        </div>
                      </div>

                      <div className="p-6 pt-3 border-t border-gray-150 bg-white flex-shrink-0 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleGenerateDownstreamAction("remedial")}
                          disabled={!hasAnalyzed}
                          className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-[10px] font-bold flex items-center justify-center gap-1.5 text-xs cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                        >
                          <Sparkles className="w-4 h-4" />
                          Rencana Remedial
                        </button>
                        <button
                          onClick={() => handleGenerateDownstreamAction("pengayaan")}
                          disabled={!hasAnalyzed}
                          className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 rounded-[10px] font-bold flex items-center justify-center gap-1.5 text-xs cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                        >
                          <Sparkles className="w-4 h-4" />
                          Rencana Pengayaan
                        </button>
                        <button
                          onClick={() => handleGenerateDownstreamAction("orangtua")}
                          disabled={!hasAnalyzed}
                          className="py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-[10px] font-bold flex items-center justify-center gap-1.5 text-xs cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                        >
                          <Sparkles className="w-4 h-4" />
                          Pesan Orang Tua
                        </button>
                        <button
                          onClick={() => handleGenerateDownstreamAction("refleksi")}
                          disabled={!hasAnalyzed}
                          className="py-2.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-[10px] font-bold flex items-center justify-center gap-1.5 text-xs cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                        >
                          <Sparkles className="w-4 h-4" />
                          Refleksi Guru
                        </button>
                      </div>
                    </div>

                    {/* Right Output report */}
                    <div className="bg-white rounded-[16px] border border-gray-200 shadow-sm flex flex-col h-full lg:overflow-hidden min-h-0">
                      <div className="p-6 pb-3 border-b border-gray-150 flex items-center justify-between flex-shrink-0 bg-white">
                        <h3 className="text-xs font-bold text-gray-900">Hasil Laporan Evaluasi AI</h3>
                        {hasAnalyzed && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(analisisGeneratedReport);
                              toast.success("Laporan disalin!");
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer"
                          >
                            <Clipboard className="w-4 h-4 text-gray-500" />
                          </button>
                        )}
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 text-xs leading-relaxed space-y-4 min-h-0">
                        {isAnalyzing ? (
                          <div className="h-full flex items-center justify-center flex-col text-center space-y-2">
                            <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
                            <p className="font-bold text-gray-600">AI sedang memproses analisis butir & ketuntasan...</p>
                          </div>
                        ) : hasAnalyzed ? (
                          renderSimpleMarkdown(analisisGeneratedReport)
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-400 text-center flex-col space-y-2">
                            <Star className="w-8 h-8 text-amber-400" />
                            <p>Buka Koreksi & Rangkuman Nilai, lalu klik "Analisis Kualitas Nilai AI" untuk mengaktifkan laporan di sini.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* VIEW 2: GOOGLE SHEETS LIVE EDITOR */}
        {activeView === "sheets" && (
          <motion.div
            key="sheets-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Filters */}
            <div className="bg-white rounded-[12px] p-4 border border-gray-200 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 font-medium">Mata Pelajaran:</span>
                    <select
                      value={selectedSubject}
                      onChange={(e) => handleSubjectChangeAttempt(e.target.value)}
                      className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-[12px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-white cursor-pointer"
                    >
                      {subjectList.length === 0 ? (
                        <option value="">Belum Ada Mapel</option>
                      ) : (
                        subjectList.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 font-medium">Kelas:</span>
                    <select
                      value={selectedClass}
                      onChange={(e) => handleClassChangeAttempt(e.target.value)}
                      className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-[12px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-white cursor-pointer"
                    >
                      {(() => {
                        const localMapping = localStorage.getItem("class_subject_mapping");
                        let filteredClasses = [...classList];
                        if (localMapping) {
                          try {
                            const mapping = JSON.parse(localMapping);
                            const allowed = classList.filter(c => mapping[c]?.includes(selectedSubject));
                            if (allowed.length > 0) filteredClasses = allowed;
                          } catch { }
                        }
                        if (filteredClasses.length === 0) return <option value="">Belum Ada Kelas</option>;
                        return filteredClasses.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ));
                      })()}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 font-medium">Semester:</span>
                    <select
                      value={selectedSemester}
                      onChange={(e) => handleSemesterChangeAttempt(e.target.value)}
                      className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-[12px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-white cursor-pointer"
                    >
                      <option value="Ganjil">Ganjil</option>
                      <option value="Genap">Genap</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setBobotForm({ ...bobotConfig });
                      setRumusTypeForm(rumusType);
                      setMetodeSTPForm(metodeSTP);
                      setIsBobotOpen(true);
                    }}
                    className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-[12px] font-semibold flex items-center gap-1.5 transition-colors text-sm border border-amber-100 cursor-pointer shadow-sm"
                  >
                    Atur Bobot & Rumus
                  </button>
                  <button
                    onClick={() => setIsAddChapterOpen(true)}
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-105 text-blue-700 rounded-[12px] font-semibold flex items-center gap-1.5 transition-colors text-sm border border-blue-100 cursor-pointer shadow-sm"
                  >
                    + Tambah Kolom
                  </button>
                </div>
              </div>
            </div>

            {/* Statistics Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-[12px] p-4 border border-gray-200 shadow-sm">
                <div className="text-xs text-gray-500 mb-1">Rata-rata Kelas</div>
                <div className="text-2xl font-bold text-gray-900">{classAverage}</div>
              </div>
              <div className="bg-emerald-50 rounded-[12px] p-4 border border-emerald-200">
                <div className="text-xs text-emerald-700 mb-1 font-medium">Nilai Tertinggi</div>
                <div className="text-2xl font-bold text-emerald-600">{maxScore}</div>
              </div>
              <div className="bg-blue-50 rounded-[12px] p-4 border border-blue-200">
                <div className="text-xs text-blue-700 mb-1 font-medium">Nilai Terendah</div>
                <div className="text-2xl font-bold text-blue-600">{minScore}</div>
              </div>
              <div className="bg-purple-50 rounded-[12px] p-4 border border-purple-200">
                <div className="text-xs text-purple-700 mb-1 font-medium">Sudah Dinilai</div>
                <div className="text-2xl font-bold text-purple-600">{gradedCount}/{gradesList.length}</div>
              </div>
            </div>

            {/* Live Sheets Table Grid */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[16px] border border-gray-200 overflow-hidden shadow-sm"
            >
              <div className="overflow-auto max-h-[calc(100vh-380px)] border-b">
                {loading ? (
                  <div className="p-12 text-center text-gray-400">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
                    Menghubungkan ke Google Drive...
                  </div>
                ) : gradesList.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 text-xs">
                    Belum ada data siswa ditemukan untuk filter saat ini.
                  </div>
                ) : (
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50 border-b sticky top-0 z-20">
                      {/* Row 1: Kategori */}
                      <tr>
                        <th rowSpan={3} className="px-4 py-3 text-left text-xs font-bold text-gray-900 sticky left-0 top-0 bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r">
                          Nama Siswa
                        </th>
                        <th rowSpan={3} className="px-4 py-3 text-left text-xs font-bold text-gray-900 border-r">
                          NIS
                        </th>
                        {getHeaderGroups(columnsList).kategoriGroups.map((group, idx) => (
                          <th
                            key={`kat-${idx}`}
                            colSpan={group.colSpan}
                            className={`px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wider text-gray-900 border-r ${group.name === "Formatif" ? "bg-amber-50 text-amber-800" : "bg-purple-50 text-purple-800"
                              }`}
                          >
                            {group.name}
                          </th>
                        ))}
                        <th rowSpan={3} className="px-4 py-3 text-center text-xs font-bold text-gray-900 bg-blue-50/50">
                          Nilai Akhir
                        </th>
                        <th rowSpan={3} className="px-4 py-3 text-center text-xs font-bold text-gray-900 border-l">
                          Raport
                        </th>
                      </tr>

                      {/* Row 2: Subkategori */}
                      <tr>
                        {getHeaderGroups(columnsList).subkategoriGroups.map((group, idx) => (
                          <th
                            key={`sub-${idx}`}
                            colSpan={group.colSpan}
                            className="px-3 py-1 text-center text-xs font-bold uppercase text-gray-700 bg-gray-100 border-r"
                          >
                            {group.name}
                          </th>
                        ))}
                      </tr>

                      {/* Row 3: TP */}
                      <tr>
                        {columnsList.map((col, idx) => (
                          <th key={`tp-${idx}`} className="px-3 py-1 text-center text-xs font-medium text-gray-500 border-r whitespace-nowrap min-w-[70px]">
                            {col.tp || "-"}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredGrades.map((student, index) => {
                        const avg = calculateStudentAvg(student, columnsList, bobotConfig, rumusType);
                        return (
                          <tr key={student.nis} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-2.5 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r">
                              <span className="font-semibold text-gray-900 text-xs">{student.name}</span>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-600 border-r">{student.nis}</td>

                            {columnsList.map((col) => (
                              <td key={col.id} className="px-3 py-2.5 text-center border-r">
                                <input
                                  type="number"
                                  value={student.babScores[col.id]?.nilai ?? 0}
                                  onChange={(e) => handleGradeChange(student.nis, col.id, e.target.value)}
                                  min="0"
                                  max="100"
                                  className="w-12 px-1 py-0.5 text-center bg-gray-50 border rounded text-base font-semibold text-gray-900"
                                />
                              </td>
                            ))}

                            <td className="px-4 py-2.5 text-center bg-blue-50/10 font-bold text-xs">
                              <span className={avg >= 70 ? "text-emerald-600" : "text-amber-600"}>{avg}</span>
                            </td>
                            <td className="px-4 py-2.5 text-center border-l bg-white">
                              <button
                                onClick={() => handleOpenRaport(student)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs font-bold cursor-pointer transition-colors"
                              >
                                Raport
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==========================================
          MODALS & DIALOGS
          ========================================== */}

      {/* Modal Preview Questions parsed from AI */}
      {showQuestionsPreviewModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[20px] p-6 max-w-2xl w-full shadow-2xl border flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-sm font-bold text-gray-900">Review & Simpan Soal AI</h3>
              <button onClick={() => setShowQuestionsPreviewModal(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
              <p className="text-xs text-gray-500 mb-2">AI berhasil mengidentifikasi {parsedQuestionsPreview.length} butir soal pilihan ganda.</p>
              {parsedQuestionsPreview.map((q, idx) => (
                <div key={idx} className="p-3 border rounded-lg text-xs space-y-1 bg-slate-50/50">
                  <p className="font-semibold text-gray-800">{idx + 1}. {q.text}</p>
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-500 pl-2">
                    {q.options.map((o, i) => <span key={i}>{o}</span>)}
                  </div>
                  <p className="text-xs font-bold text-blue-600 mt-1">Kunci Jawaban: {q.correctAnswer}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2 border-t">
              <button
                onClick={() => {
                  setQuestionBank(prev => [...prev, ...parsedQuestionsPreview]);
                  setParsedQuestionsPreview([]);
                  setShowQuestionsPreviewModal(false);
                  toast.success("Semua soal berhasil disimpan ke Bank Soal!");
                  setCurrentPanel("bank-soal");
                }}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Konfirmasi Simpan ke Bank Soal
              </button>
              <button
                onClick={() => setShowQuestionsPreviewModal(false)}
                className="px-4 py-2 border rounded-lg text-xs font-bold text-gray-700 cursor-pointer hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Tambah Ujian dari Soal Terpilih */}
      {showPackageCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[20px] p-6 max-w-sm w-full shadow-2xl border space-y-4"
          >
            <h3 className="text-sm font-bold text-gray-900">Buat Paket Ujian Baru</h3>
            <div>
              <label className="block text-base font-bold text-gray-600 mb-1">Nama Paket Ujian</label>
              <input
                type="text"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                placeholder="e.g. Asesmen Sumatif Bab 1"
                className="w-full px-3 py-2 border rounded-lg text-base"
              />
            </div>
            <p className="text-xs text-gray-400">Paket ini akan merangkum {selectedQuestionsForPackage.length} butir soal pilihan ganda yang Anda centang.</p>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={handleCreatePackageFromSelected}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Buat Paket
              </button>
              <button
                onClick={() => setShowPackageCreateModal(false)}
                className="px-4 py-2 border rounded-lg text-xs font-bold text-gray-700 cursor-pointer"
              >
                Batal
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Tambah Soal Manual */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[20px] p-6 max-w-md w-full shadow-2xl border flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-sm font-bold text-gray-900">Tambah Soal Pilihan Ganda Manual</h3>
              <button onClick={() => setShowAddQuestionModal(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
              <div>
                <label className="block text-base font-bold text-gray-600 mb-1">Pertanyaan / Teks Soal</label>
                <textarea
                  value={manualQuestionText}
                  onChange={(e) => setManualQuestionText(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-base resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-base font-bold text-gray-600">Pilihan Jawaban</label>
                {["A", "B", "C", "D", "E"].map((letter, idx) => (
                  <div key={letter} className="flex items-center gap-2">
                    <span className="font-bold text-xs">{letter}.</span>
                    <input
                      type="text"
                      value={manualOptions[idx]}
                      onChange={(e) => {
                        const updated = [...manualOptions];
                        updated[idx] = e.target.value;
                        setManualOptions(updated);
                      }}
                      placeholder={`Isi pilihan ${letter}...`}
                      className="flex-1 px-3 py-1.5 border rounded-lg text-base"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div>
                  <label className="block text-base font-bold text-gray-600 mb-1">Kunci Jawaban</label>
                  <select
                    value={manualCorrect}
                    onChange={(e) => setManualCorrect(e.target.value)}
                    className="w-full p-2 border rounded-lg text-base bg-white"
                  >
                    <option>A</option>
                    <option>B</option>
                    <option>C</option>
                    <option>D</option>
                    <option>E</option>
                  </select>
                </div>
                <div>
                  <label className="block text-base font-bold text-gray-600 mb-1">Level Kognitif</label>
                  <select
                    value={manualLevel}
                    onChange={(e) => setManualLevel(e.target.value)}
                    className="w-full p-2 border rounded-lg text-base bg-white"
                  >
                    <option>C1</option>
                    <option>C2</option>
                    <option>C3</option>
                    <option>C4</option>
                    <option>C5</option>
                    <option>C6</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2.5 pt-2 border-t">
              <button
                onClick={handleAddManualQuestion}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Simpan ke Bank Soal
              </button>
              <button
                onClick={() => setShowAddQuestionModal(false)}
                className="px-4 py-2.5 border rounded-lg text-xs font-bold text-gray-700 cursor-pointer"
              >
                Batal
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Tambah Kolom Penilaian */}
      {isAddChapterOpen && (() => {
        const existingTPs = Array.from(new Set(columnsList.map((col) => col.tp).filter(Boolean))) as string[];
        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[20px] p-6 max-w-sm w-full shadow-2xl border flex flex-col space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Tambah Kolom Penilaian</h3>
                <button
                  onClick={() => {
                    setIsAddChapterOpen(false);
                    setCustomTPText("");
                    setSelectedTPOption("");
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-base font-semibold text-gray-700">Kategori Penilaian</label>
                <select
                  value={newChapterCategory}
                  onChange={(e) => {
                    setNewChapterCategory(e.target.value);
                    setNewChapterSubcategory(e.target.value === "Formatif" ? "Tugas" : "STP");
                  }}
                  className="w-full p-2.5 border rounded-[12px] text-base bg-white cursor-pointer font-semibold text-gray-800 focus:outline-none"
                >
                  <option value="Formatif">Formatif</option>
                  <option value="Sumatif">Sumatif</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-base font-semibold text-gray-700">Subkategori Penilaian</label>
                <select
                  value={newChapterSubcategory}
                  onChange={(e) => setNewChapterSubcategory(e.target.value)}
                  className="w-full p-2.5 border rounded-[12px] text-base bg-white cursor-pointer font-semibold text-gray-800 focus:outline-none"
                >
                  {newChapterCategory === "Formatif" ? (
                    <>
                      <option value="Tugas">Tugas</option>
                      <option value="Kuis">Kuis</option>
                      <option value="Proyek">Proyek</option>
                    </>
                  ) : (
                    <>
                      <option value="STP">STP (Sumatif Harian)</option>
                      <option value="STS">STS (Tengah Semester)</option>
                      <option value="SAS">SAS (Akhir Semester)</option>
                    </>
                  )}
                </select>
              </div>

              {newChapterSubcategory !== "STS" && newChapterSubcategory !== "SAS" && (
                <div className="space-y-2">
                  <label className="block text-base font-semibold text-gray-700">Tujuan Pembelajaran (TP)</label>
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-1.5 text-base text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="tp_type"
                        checked={selectedTPType === "select"}
                        onChange={() => setSelectedTPType("select")}
                      />
                      Pilih TP Ada
                    </label>
                    <label className="flex items-center gap-1.5 text-base text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="tp_type"
                        checked={selectedTPType === "custom"}
                        onChange={() => setSelectedTPType("custom")}
                      />
                      Input TP Baru
                    </label>
                  </div>

                  {selectedTPType === "select" ? (
                    <select
                      value={selectedTPOption}
                      onChange={(e) => setSelectedTPOption(e.target.value)}
                      className="w-full p-2 border rounded-[12px] text-base bg-white focus:outline-none"
                    >
                      <option value="">-- Pilih TP --</option>
                      {existingTPs.map(tp => (
                        <option key={tp} value={tp}>{tp}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={customTPText}
                      onChange={(e) => setCustomTPText(e.target.value)}
                      placeholder="e.g. TP 1: Luas Segitiga"
                      className="w-full p-2 border rounded-[12px] text-base focus:outline-none"
                    />
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleConfirmAddChapter}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] text-xs font-bold cursor-pointer"
                >
                  Tambah
                </button>
                <button
                  onClick={() => setIsAddChapterOpen(false)}
                  className="px-4 py-2.5 border rounded-[12px] text-xs font-bold cursor-pointer hover:bg-gray-50"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* Modal Atur Bobot & Rumus */}
      {isBobotOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[24px] p-6 max-w-md w-full shadow-2xl border flex flex-col space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Atur Bobot & Rumus Penilaian</h3>
              <button onClick={() => setIsBobotOpen(false)} className="text-gray-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-1">Formula Perhitungan</label>
                <select
                  value={rumusTypeForm}
                  onChange={(e) => setRumusTypeForm(e.target.value)}
                  className="w-full p-2.5 border rounded-[12px] text-base bg-white focus:outline-none"
                >
                  <option value="kmerdeka">Kurikulum Merdeka (Pembobotan Kustom)</option>
                  <option value="k13">Kurikulum 2013 (Formula Rata-rata Terbobot)</option>
                  <option value="custom">Kustom Bebas (Semua Kategori)</option>
                </select>
              </div>

              {rumusTypeForm !== "k13" && (
                <div className="pt-1">
                  <label className="block text-base font-semibold text-gray-700 mb-1">Metode Perhitungan Sumatif Harian (STP)</label>
                  <select
                    value={metodeSTPForm}
                    onChange={(e) => setMetodeSTPForm(e.target.value)}
                    className="w-full p-2 border rounded-[12px] text-base bg-white focus:outline-none"
                  >
                    <option value="sumatif">Ambil dari Kolom Sumatif STP Saja</option>
                    <option value="rata_formatif">Rata-rata dari Semua Kolom Formatif (Kuis, Tugas, Proyek)</option>
                    <option value="bobot_formatif">Bobot Kustom Subkategori Formatif (Kuis, Tugas, Proyek)</option>
                  </select>
                </div>
              )}

              {rumusTypeForm !== "k13" && (() => {
                const mainSum = Object.entries(bobotForm)
                  .filter(([cat]) => !["Kuis", "Tugas", "Proyek"].includes(cat))
                  .reduce((sum, [_, w]) => sum + w, 0);
                const formatifSum = (bobotForm["Kuis"] || 0) + (bobotForm["Tugas"] || 0) + (bobotForm["Proyek"] || 0);

                return (
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-700">Daftar Bobot Komponen Utama (%)</span>
                        <span className={`font-bold px-2 py-0.5 rounded-full ${mainSum === 100 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          Total: {mainSum}%
                        </span>
                      </div>
                      {metodeSTPForm === "bobot_formatif" && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 font-medium">Bobot Subkategori Formatif (%)</span>
                          <span className={`font-bold px-2 py-0.5 rounded-full ${formatifSum === 100 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                            Total: {formatifSum}%
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                      {Object.entries(bobotForm)
                        .filter(([cat]) => {
                          const isSub = ["Kuis", "Tugas", "Proyek"].includes(cat);
                          if (isSub) return metodeSTPForm === "bobot_formatif";
                          return true;
                        })
                        .map(([cat, weight]) => (
                          <div key={cat} className="flex items-center gap-3 p-2 bg-gray-50 border rounded-[12px] text-xs">
                            <span className="flex-1 font-medium text-gray-800">{cat}</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={weight}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  setBobotForm({ ...bobotForm, [cat]: val });
                                }}
                                className="w-14 px-1.5 py-0.5 text-center border rounded font-semibold focus:outline-none"
                              />
                              <span className="text-gray-500">%</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-3 pt-3 border-t">
              <button
                onClick={handleSaveBobotConfig}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] text-xs font-bold cursor-pointer text-center"
              >
                Terapkan & Simpan
              </button>
              <button
                onClick={() => setIsBobotOpen(false)}
                className="px-4 py-2.5 border rounded-[12px] text-xs font-bold cursor-pointer hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Peringatan Perubahan Belum Disimpan */}
      {isUnsavedModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[20px] p-6 max-w-sm w-full shadow-2xl border space-y-4"
          >
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle className="w-8 h-8 flex-shrink-0" />
              <h3 className="text-lg font-bold text-gray-900">Perubahan Belum Disimpan</h3>
            </div>
            <p className="text-sm text-gray-600">
              Apakah Anda ingin menyimpannya sebelum berpindah halaman/kelas?
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleSaveAndContinue}
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] text-sm font-semibold flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan & Lanjutkan
              </button>
              <button
                onClick={handleDiscardAndContinue}
                className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-[12px] text-sm font-semibold text-center"
              >
                Abaikan Perubahan
              </button>
              <button
                onClick={() => setIsUnsavedModalOpen(false)}
                className="w-full py-2.5 border rounded-[12px] text-sm font-semibold text-center hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Raport Per Siswa */}
      {selectedRaportStudent && (() => {
        const student = selectedRaportStudent;
        const avg = calculateStudentAvg(student, columnsList, bobotConfig, rumusType);

        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[20px] max-w-2xl w-full shadow-2xl border flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="text-md font-bold text-gray-900">Umpan Balik Raport</h3>
                </div>
                <button onClick={() => setSelectedRaportStudent(null)} className="text-gray-400 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
                <div className="p-4 bg-gray-50 border rounded-xl grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-400 font-medium">Siswa</span>
                    <p className="font-bold text-gray-900 text-sm mt-0.5">{student.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium">Nilai Rerata Akhir</span>
                    <p className="font-extrabold text-blue-600 text-sm mt-0.5">{avg}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-gray-800">Catatan/Komentar Guru</label>
                    <button
                      onClick={handleGenerateAIComment}
                      disabled={isGeneratingComment}
                      className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-150 text-purple-700 rounded-lg font-bold flex items-center gap-1"
                    >
                      {isGeneratingComment ? <RefreshCw className="w-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Generate AI
                    </button>
                  </div>
                  <textarea
                    value={raportComment}
                    onChange={(e) => setRaportComment(e.target.value)}
                    rows={4}
                    placeholder="Ananda menunjukkan hasil belajar yang sangat memuaskan..."
                    className="w-full p-3 border rounded-xl resize-none text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t flex justify-between gap-3 bg-gray-50/50">
                <button
                  onClick={() => handlePrintPDF(student)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Raport PDF
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveRaportComment}
                    disabled={isSavingRaport}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5"
                  >
                    Simpan Catatan
                  </button>
                  <button
                    onClick={() => setSelectedRaportStudent(null)}
                    className="px-4 py-2 border rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* Downstream Actions Modal (Remedial, Pengayaan, Refleksi, Chat) */}
      {actionModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[20px] max-w-2xl w-full shadow-2xl border flex flex-col max-h-[85vh]"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-sm font-bold text-gray-900 uppercase">
                {activeActionType === "remedial" ? "Program Remedial" :
                  activeActionType === "pengayaan" ? "Program Pengayaan" :
                    activeActionType === "orangtua" ? "Surat Wali Murid" : "Jurnal Refleksi Diri Guru"}
              </h3>
              <button onClick={() => setActionModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs leading-relaxed">
              {isGeneratingAction ? (
                <div className="h-40 flex items-center justify-center flex-col text-center space-y-2">
                  <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
                  <p className="font-bold text-gray-600">AI sedang mendraf dokumen program tindak lanjut...</p>
                </div>
              ) : (
                renderSimpleMarkdown(actionModalContent)
              )}
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-2 bg-gray-50">
              {actionModalContent && (
                <>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(actionModalContent);
                      toast.success("Catatan disalin!");
                    }}
                    className="px-4 py-2 border rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100 flex items-center gap-1 cursor-pointer"
                  >
                    <Clipboard className="w-4 h-4" />
                    Salin Konten
                  </button>
                  <button
                    onClick={() => {
                      const element = document.createElement("a");
                      const file = new Blob([actionModalContent], { type: "text/markdown" });
                      element.href = URL.createObjectURL(file);
                      element.download = `Program_${activeActionType}_${selectedSubject}.md`;
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                      toast.success("File MD berhasil diunduh!");
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Download Markdown
                  </button>
                </>
              )}
              <button
                onClick={() => setActionModalOpen(false)}
                className="px-4 py-2 border rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
