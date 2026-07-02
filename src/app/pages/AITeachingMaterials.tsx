import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  FileText,
  Download,
  Save,
  Copy,
  RefreshCw,
  Presentation,
  FileQuestion,
  Lightbulb,
  CheckSquare,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  X,
  ArrowRight,
  Star,
  AlertTriangle,
  Lock
} from "lucide-react";
import { AIGlow } from "../components/AIComponents";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useNavigate, useLocation } from "react-router";
import { isAuthorized, appendSheetRows, readSheetRange } from "../../lib/googleSheetsService";
import { toast } from "sonner";
import { supabase } from "../../../utils/supabase/client";

const docTypeMapping: Record<string, string> = {
  bahan_ajar: "Report",
  lkpd: "Report",
  aktivitas: "Report",
  pemantik: "Report",
  ppt: "Silabus",
  experiment: "Report"
};

const materialTypes = [
  {
    id: "bahan_ajar",
    name: "Bahan Ajar",
    desc: "Rangkuman materi ajar terstruktur untuk mempermudah penyampaian materi.",
    icon: FileText,
    color: "blue",
    colorClass: "from-blue-500 to-blue-600",
    bgLight: "bg-blue-50/50"
  },
  {
    id: "lkpd",
    name: "LKPD (Lembar Kerja)",
    desc: "Lembar aktivitas terstruktur untuk mengukur pemahaman konsep siswa.",
    icon: CheckSquare,
    color: "emerald",
    colorClass: "from-emerald-500 to-emerald-600",
    bgLight: "bg-emerald-50/50"
  },
  {
    id: "aktivitas",
    name: "Aktivitas Pembelajaran",
    desc: "Rancangan aktivitas belajar aktif interaktif di kelas (kelompok/game).",
    icon: Layers,
    color: "pink",
    colorClass: "from-pink-500 to-pink-600",
    bgLight: "bg-pink-50/50"
  },
  {
    id: "pemantik",
    name: "Pertanyaan Pemantik",
    desc: "Daftar pertanyaan diskusi pemancing rasa ingin tahu siswa.",
    icon: FileQuestion,
    color: "purple",
    colorClass: "from-purple-500 to-purple-600",
    bgLight: "bg-purple-50/50"
  },
  {
    id: "ppt",
    name: "Materi PPT / Slide",
    desc: "Draft outline struktur slide presentasi interaktif dan kuis kelas.",
    icon: Presentation,
    color: "orange",
    colorClass: "from-orange-500 to-orange-600",
    bgLight: "bg-orange-50/50"
  },
  {
    id: "experiment",
    name: "Panduan Praktikum",
    desc: "Panduan eksperimen laboratorium/lapangan beserta daftar alat & bahan.",
    icon: Lightbulb,
    color: "indigo",
    colorClass: "from-indigo-500 to-indigo-600",
    bgLight: "bg-indigo-50/50"
  },
];

const difficultyLevels = ["Mudah", "Sedang", "Sulit", "Campuran"];
const contextOptions = [
  "Kehidupan Sehari-hari",
  "Lingkungan Sekolah",
  "Dunia Kerja",
  "Teknologi",
  "Kewirausahaan",
  "Keislaman"
];

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
    if (schoolLevel === "SMP") {
      return ["7", "8", "9"];
    } else {
      return ["10", "11", "12"];
    }
  }
  return Array.from(numbers).sort((a, b) => Number(a) - Number(b));
};

const generateFallbackTeachingMaterial = (type: string, params: any) => {
  const commonHeader = `# ${type.toUpperCase()}: ${params.topic || "Materi Ajar"}
**Mata Pelajaran**: ${params.subject || "Matematika"} | **Kelas**: ${params.class || "10"}
**Tingkat Kesulitan**: ${params.difficulty || "Sedang"}
**Tujuan Pembelajaran**: ${params.learningObjective || "Mempelajari konsep dan aplikasinya."}
${params.karakter ? `**Karakter yang Dikuatkan**: ${params.karakter}\n` : ""}${params.konteks ? `**Konteks Pembelajaran**: ${params.konteks}\n` : ""}
---
`;

  switch (type) {
    case "bahan_ajar":
      return `${commonHeader}
## MATERI AJAR PENDUKUNG
Materi ini disusun untuk memfasilitasi pemahaman mendalam tentang **${params.topic || "Materi"}**.

### A. Konsep Dasar
Pemahaman dasar mengenai ${params.topic} sangat penting untuk diaplikasikan dalam *${params.konteks || "kehidupan sehari-hari"}*. Konsep ini mencakup prinsip utama yang menghubungkan teori dengan kasus riil.

### B. Analogi Sederhana
Bayangkan konsep ini seperti sistem transportasi kota di mana setiap komponen memiliki peran krusial. Jika salah satu jalur terhambat, seluruh sistem akan terpengaruh.

### C. Miskonsepsi Umum
1. *Miskonsepsi*: Menganggap konsep ini hanya berlaku dalam skala teoretis laboratorium.
   *Fakta*: Sebenarnya, penerapannya dapat ditemukan di berbagai aspek teknologi sekitar kita.

### D. Rangkuman Poin Kunci
* **Prinsip Utama**: Integrasi komponen yang terstruktur.
* **Aplikasi**: Digunakan untuk mengoptimalkan efisiensi proses kerja.
`;
    case "lkpd":
      return `${commonHeader}
## LEMBAR KERJA PESERTA DIDIK (LKPD)
**Jenis Aktivitas**: ${params.lkpdActivity || "Kelompok"} | **Durasi**: ${params.duration || "45 Menit"}
**Output Siswa**: ${params.lkpdOutput || "Laporan dan Presentasi"}

### A. Stimulus Fenomena
Bacalah dengan saksama studi kasus berikut tentang penerapan **${params.topic}** di *${params.konteks || "masyarakat"}*. Diskusikan dalam kelompok apa saja faktor-faktor kunci yang mempengaruhi keberhasilan fenomena tersebut.

### B. Petunjuk Kerja
1. Berkumpullah bersama kelompok Anda (4-5 orang).
2. Lakukan pengumpulan data atau analisis terhadap permasalahan yang disajikan.
3. Tuliskan jawaban Anda pada ruang yang disediakan.

### C. Pertanyaan Analisis & Diskusi (HOTS)
1. Analisislah dampak kegagalan sistem ${params.topic} jika tidak dikelola dengan baik.
2. Bagaimana kelompok Anda menyarankan solusi yang berkelanjutan dan berbasis teknologi?
`;
    case "aktivitas":
      return `${commonHeader}
## RENCANA AKTIVITAS PEMBELAJARAN
**Tipe Aktivitas**: ${params.aktivitasType || "Game / Kuis"} | **Durasi**: ${params.duration || "40 menit"}

### A. Persiapan Guru
- Siapkan kartu pertanyaan dan papan skor di depan kelas.
- Kelompokkan siswa menjadi 4 tim besar secara heterogen.

### B. Langkah Kerja Aktivitas
1. **Pendahuluan (5 menit)**: Guru menjelaskan aturan main game terkait ${params.topic} dan cara mencetak skor.
2. **Kegiatan Inti (25 menit)**: Setiap tim secara bergiliran menjawab pertanyaan bertingkat dan berdiskusi memecahkan tantangan.
3. **Refleksi & Penutup (10 menit)**: Penyerahan penghargaan kepada tim teraktif dan kesimpulan bersama.

### C. Kriteria Penilaian
- Kerjasama tim (30%)
- Ketepatan jawaban konseptual (50%)
- Keaktifan berpartisipasi (20%)
`;
    case "pemantik":
      return `${commonHeader}
## PERTANYAAN PEMANTIK DISKUSI
**Jumlah Pertanyaan**: ${params.pemantikCount || "5"} Butir Pertanyaan

### A. Stimulus Diskusi Awal
Sebelum kita mempelajari konsep **${params.topic}**, mari luangkan waktu sejenak untuk memikirkan fenomena berikut di lingkungan kita.

### B. Daftar Pertanyaan Pemantik
${Array.from({ length: Number(params.pemantikCount) || 5 }).map((_, i) => `
#### Pertanyaan ${i + 1}
Bagaimana pendapatmu jika ${params.topic} tiba-tiba tidak berfungsi atau hilang dari *${params.konteks || "kehidupan sehari-hari kita"}*? Apa alternatif solusi yang bisa kamu tawarkan?
`).join("\n")}
`;
    case "ppt":
      return `${commonHeader}
## OUTLINE PRESENTASI (SLIDE PRESENTASI)
**Gaya Penyampaian**: ${params.pptStyle || "Interaktif"} | **Jumlah Slide**: ${params.pptSlides || "8"} Slide
${params.pptDiscussion ? "- *Termasuk Aktivitas Diskusi Kelompok*" : ""}${params.pptQuiz ? "\n- *Termasuk Slide Kuis Interaktif*" : ""}

### RENCANA ALUR SLIDE
${Array.from({ length: Number(params.pptSlides) || 8 }).map((_, i) => `
#### Slide ${i + 1}: ${i === 0 ? "Judul & Orientasi Topik" : i === 1 ? "Tujuan Pembelajaran" : i === (Number(params.pptSlides) || 8) - 1 ? "Penutup & Kuis Ringkas" : `Pembahasan Konsep Bagian ${i}`}
- **Visual**: Ilustrasi atau diagram pendukung konsep ${params.topic}.
- **Poin Presentasi**: Poin-poin penjelasan penting mengenai sub-materi.
- **Catatan Pemateri**: Gunakan analogi sehari-hari dan ajak siswa berpartisipasi aktif.
`).join("\n")}
`;
    case "experiment":
      return `${commonHeader}
## PANDUAN PRAKTIKUM / EKSPERIMEN
**Nama Praktikum**: ${params.labName || `Eksperimen ${params.topic}`}
**Durasi**: ${params.duration || "60 Menit"} | **Tingkat Kesulitan**: ${params.labDifficulty || "Sedang"}

### A. Alat dan Bahan
${params.labMaterials ? params.labMaterials.split('\n').map((line: string) => `- ${line}`).join('\n') : "- Perlengkapan standar praktikum kelas\n- Lembar catatan pengamatan"}

### B. Prosedur Kerja
1. Letakkan alat praktikum pada permukaan datar yang aman.
2. Ikuti instruksi pencampuran atau pengukuran sesuai dengan petunjuk guru.
3. Amati perubahan secara konstan selama durasi praktikum dan catat hasilnya.

### C. Lembar Pengamatan & Analisis Data
Sajikan data hasil pengamatan Anda dalam bentuk tabel, kemudian jawablah pertanyaan pembahasan di akhir panduan ini.
`;
    default:
      return `${commonHeader}
## MATERI BANTU BELAJAR
Silakan baca materi ajar mengenai **${params.topic}** secara saksama.
`;
  }
};

function parseInlineMarkdown(text: string) {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} className="font-bold text-gray-950">{part}</strong>;
    }
    const italicParts = part.split(/\*([^*]+)\*/g);
    return italicParts.map((subPart, j) => {
      if (j % 2 === 1) {
        return <em key={j} className="italic text-gray-800">{subPart}</em>;
      }
      return subPart;
    });
  });
}

function renderSimpleMarkdown(text: string) {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    if (line.startsWith("### ")) {
      return <h3 key={idx} className="text-lg font-bold text-gray-900 mt-4 mb-2">{line.replace("### ", "")}</h3>;
    }
    if (line.startsWith("#### ")) {
      return <h4 key={idx} className="text-md font-semibold text-gray-900 mt-3 mb-1.5">{line.replace("#### ", "")}</h4>;
    }
    if (line.startsWith("## ")) {
      return <h2 key={idx} className="text-xl font-bold text-gray-900 mt-5 mb-2.5 border-b pb-1">{line.replace("## ", "")}</h2>;
    }
    if (line.startsWith("# ")) {
      return <h1 key={idx} className="text-2xl font-extrabold text-gray-950 mt-6 mb-3 border-b pb-1">{line.replace("# ", "")}</h1>;
    }
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const content = line.trim().replace(/^[\-\*]\s+/, "");
      return (
        <ul key={idx} className="list-disc list-inside ml-4 my-1 text-gray-700 text-sm">
          <li>{parseInlineMarkdown(content)}</li>
        </ul>
      );
    }
    if (/^\d+\.\s+/.test(line.trim())) {
      const content = line.trim().replace(/^\d+\.\s+/, "");
      return (
        <ol key={idx} className="list-decimal list-inside ml-4 my-1 text-gray-700 text-sm">
          <li>{parseInlineMarkdown(content)}</li>
        </ol>
      );
    }
    if (line.trim() === "---") {
      return <hr key={idx} className="my-4 border-gray-200" />;
    }
    if (!line.trim()) {
      return <div key={idx} className="h-2" />;
    }
    return <p key={idx} className="text-sm text-gray-700 my-1 leading-relaxed">{parseInlineMarkdown(line)}</p>;
  });
}

export default function AITeachingMaterials() {
  const { profile } = useAuth();
  const { subscriptionTier, credits, activeWorkspaceId, refresh, aiModels } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedType, setSelectedType] = useState("lkpd");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isReviewing, setIsReviewing] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [reviewContent, setReviewContent] = useState("");
  const [previewTab, setPreviewTab] = useState<"content" | "review">("content");

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

  const getMaterialCost = (type: string, model: string): number => {
    let base = 5;
    if (type === "lkpd") base = 4;
    else if (type === "pemantik") base = 2;
    else if (type === "aktivitas") base = 5;
    else if (type === "experiment") base = 5;
    else if (type === "ppt") base = 5;
    else if (type === "bahan_ajar") base = 5;

    const activeModel = aiModels.find(m => m.id === model);
    const mult = activeModel ? Number(activeModel.multiplier) : (model === "gemini-pro" ? 2 : 1);
    return base * mult;
  };

  // Core Form Fields
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [learningObjective, setLearningObjective] = useState("");
  const [difficulty, setDifficulty] = useState("Sedang");
  const [notes, setNotes] = useState("");

  // Optional/Advanced Accordion Fields
  const [karakter, setKarakter] = useState("");
  const [konteks, setKonteks] = useState("");

  // Dynamic Fields based on Material Type
  // 1. LKPD
  const [lkpdActivity, setLkpdActivity] = useState("Kelompok");
  const [lkpdDuration, setLkpdDuration] = useState("45 menit");
  const [lkpdOutput, setLkpdOutput] = useState("Laporan Analisis");

  // 2. Aktivitas Pembelajaran
  const [aktivitasType, setAktivitasType] = useState("Game / Kuis");
  const [aktivitasDuration, setAktivitasDuration] = useState("40 menit");

  // 3. Pertanyaan Pemantik
  const [pemantikCount, setPemantikCount] = useState("5");

  // 4. PPT
  const [pptSlides, setPptSlides] = useState("8");
  const [pptStyle, setPptStyle] = useState("Interaktif");
  const [pptDiscussion, setPptDiscussion] = useState(true);
  const [pptQuiz, setPptQuiz] = useState(true);

  // 5. Panduan Praktikum
  const [labName, setLabName] = useState("");
  const [labMaterials, setLabMaterials] = useState("");
  const [labDuration, setLabDuration] = useState("60 menit");
  const [labDifficulty, setLabDifficulty] = useState("Sedang");

  const [classList, setClassList] = useState<string[]>([]);
  const [subjectList, setSubjectList] = useState<string[]>([]);

  useEffect(() => {
    const level = profile?.schoolLevel || "SMA";

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

    // Load from Sheets database
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
        console.warn("Gagal memuat kelas/mapel langsung dari Sheets:", e);
      }
    };
    loadDatabaseData();
  }, [profile]);

  useEffect(() => {
    if (location.state?.fromMeeting) {
      const s = location.state;
      if (s.meetingType === "lkpd") {
        setSelectedType("lkpd");
      } else if (s.meetingType === "bahan_ajar") {
        setSelectedType("ppt");
      }
      if (s.topic) setTopic(s.topic);
      if (s.class) setSelectedClass(s.class);
      if (s.subject) setSelectedSubject(s.subject);
      if (s.duration) {
        setLkpdDuration(s.duration);
        setAktivitasDuration(s.duration);
      }

      // Detailed Context Prefill
      if (s.learningObjective) setLearningObjective(s.learningObjective);
      if (s.characterFocus) setKarakter(s.characterFocus);
      else if (s.targetKarakter) setKarakter(s.targetKarakter);

      if (s.learningActivities) {
        setLkpdActivity(s.learningActivities);
        setAktivitasType(s.learningActivities);
      }
      if (s.studentProduct) setLkpdOutput(s.studentProduct);

      // Load specific experiment fields from meeting context
      if (s.experimentName) setLabName(s.experimentName);
      if (s.experimentMaterials) setLabMaterials(s.experimentMaterials);
      if (s.experimentDuration) setLabDuration(s.experimentDuration);

      // Open the configuration modal automatically
      setIsModalOpen(true);
    }
  }, [location.state]);

  const handleReview = async () => {
    if (!generatedContent) {
      toast.error("Harap generate dokumen terlebih dahulu.");
      return;
    }
    const cost = selectedModel === "gemini-pro" ? 10 : 5;
    if ((credits?.balance ?? 0) < cost) {
      toast.error("AI Credit tidak cukup untuk mereview dokumen.");
      return;
    }

    setIsReviewing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const tokenUser = sessionData?.session?.access_token;

      let docTypeLabel = "Bahan Ajar";
      if (selectedType === "lkpd") docTypeLabel = "Lembar Kerja Peserta Didik (LKPD)";
      else if (selectedType === "aktivitas") docTypeLabel = "Aktivitas Pembelajaran";
      else if (selectedType === "pemantik") docTypeLabel = "Pertanyaan Pemantik";
      else if (selectedType === "ppt") docTypeLabel = "Materi Presentasi PPT";
      else if (selectedType === "experiment") docTypeLabel = "Panduan Praktikum";

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
            type: "educational-reviewer",
            model: selectedModel,
            params: {
              documentType: docTypeLabel,
              documentContent: generatedContent,
              documentGoal: learningObjective || "Meningkatkan pemahaman siswa",
              classContext: `Kelas ${selectedClass}, Mapel ${selectedSubject}`
            }
          })
        }
      );

      if (response.ok) {
        const res = await response.json();
        if (res.content) {
          setReviewContent(res.content);
          setPreviewTab("review");
          toast.success("Dokumen berhasil direview oleh AI Reviewer!");
          if (refresh) await refresh();
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        toast.error(errJson.error || "Gagal mereview dokumen.");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Gagal mereview dokumen.");
    } finally {
      setIsReviewing(false);
    }
  };

  const handleImprove = async () => {
    if (!generatedContent || !reviewContent) {
      toast.error("Harap lakukan review dokumen terlebih dahulu.");
      return;
    }
    const cost = getMaterialCost(selectedType, selectedModel);
    if ((credits?.balance ?? 0) < cost) {
      toast.error("AI Credit tidak cukup untuk melakukan improvement.");
      return;
    }

    setIsImproving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const tokenUser = sessionData?.session?.access_token;

      let docTypeLabel = "Bahan Ajar";
      if (selectedType === "lkpd") docTypeLabel = "Lembar Kerja Peserta Didik (LKPD)";
      else if (selectedType === "aktivitas") docTypeLabel = "Aktivitas Pembelajaran";
      else if (selectedType === "pemantik") docTypeLabel = "Pertanyaan Pemantik";
      else if (selectedType === "ppt") docTypeLabel = "Materi Presentasi PPT";
      else if (selectedType === "experiment") docTypeLabel = "Panduan Praktikum";

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
            type: "educational-reviewer",
            model: selectedModel,
            params: {
              documentType: docTypeLabel,
              documentContent: generatedContent,
              documentGoal: learningObjective || "Meningkatkan pemahaman siswa",
              classContext: `Kelas ${selectedClass}, Mapel ${selectedSubject}`,
              improveRequested: true
            }
          })
        }
      );

      if (response.ok) {
        const res = await response.json();
        if (res.content) {
          setGeneratedContent(res.content);
          setPreviewTab("content");
          setReviewContent("");
          toast.success("Dokumen berhasil diperbaiki berdasarkan saran AI!");
          if (refresh) await refresh();
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        toast.error(errJson.error || "Gagal memperbaiki dokumen.");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Gagal memperbaiki dokumen.");
    } finally {
      setIsImproving(false);
    }
  };

  const estimateTokens = () => {
    let textLength = (topic || "").length + (learningObjective || "").length + (notes || "").length + (karakter || "").length + (konteks || "").length;
    let baseMultiplier = 1.3;
    if (selectedType === "lkpd") textLength += lkpdActivity.length + lkpdDuration.length + lkpdOutput.length;
    else if (selectedType === "ppt") textLength += pptStyle.length + Number(pptSlides) * 12;
    else if (selectedType === "aktivitas") textLength += aktivitasType.length + aktivitasDuration.length;
    else if (selectedType === "pemantik") textLength += pemantikCount.length;

    const approxWordCount = textLength / 5;
    return Math.max(1200, Math.min(3500, Math.round(900 + approxWordCount * baseMultiplier * 10)));
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Materi/Topik utama wajib diisi.");
      return;
    }

    let backendType = "bahan_ajar";
    if (selectedType === "lkpd") backendType = "lkpd";

    const cost = getMaterialCost(selectedType, selectedModel);
    if ((credits?.balance ?? 0) < cost) {
      toast.error("AI Credit tidak cukup. Silakan top up atau upgrade paket.");
      navigate("/billing");
      return;
    }

    setIsGenerating(true);
    setHasGenerated(false);
    setIsModalOpen(false); // Close the popup form when generating starts

    // Build params for payload
    const params: Record<string, any> = {
      jenjang: profile?.schoolLevel || "SMA",
      class: selectedClass,
      subject: selectedSubject,
      topic,
      learningObjective,
      difficulty,
      notes,
      karakter,
      konteks,
      materialType: selectedType
    };

    if (selectedType === "lkpd") {
      params.lkpdActivity = lkpdActivity;
      params.duration = lkpdDuration;
      params.lkpdOutput = lkpdOutput;
    } else if (selectedType === "aktivitas") {
      params.aktivitasType = aktivitasType;
      params.duration = aktivitasDuration;
    } else if (selectedType === "pemantik") {
      params.pemantikCount = pemantikCount;
    } else if (selectedType === "ppt") {
      params.pptSlides = pptSlides;
      params.pptStyle = pptStyle;
      params.pptDiscussion = pptDiscussion;
      params.pptQuiz = pptQuiz;
    } else if (selectedType === "experiment") {
      params.labName = labName;
      params.labMaterials = labMaterials;
      params.duration = labDuration;
      params.labDifficulty = labDifficulty;
    }

    try {
      let finalContent = "";
      if (isAuthorized() && import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
        try {
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
                type: backendType,
                model: selectedModel,
                params
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
            toast.error(errJson.error || "Gagal menghasilkan bahan ajar.");
          }
        } catch (e) {
          console.warn("AI Function failed, falling back to local model template:", e);
        }
      }

      if (!finalContent) {
        finalContent = generateFallbackTeachingMaterial(selectedType, params);
      }

      setGeneratedContent(finalContent);
      setHasGenerated(true);
      toast.success("Bahan Ajar berhasil digenerate!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Gagal memanggil AI. Silakan coba lagi.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadMd = () => {
    if (!generatedContent) return;
    const element = document.createElement("a");
    const file = new Blob([generatedContent], { type: "text/markdown" });
    element.href = URL.createObjectURL(file);
    const typeLabel = selectedMaterial ? selectedMaterial.name.replace(/[^a-zA-Z0-9]/g, "_") : "Bahan_Ajar";
    element.download = `${typeLabel}_${topic.replace(/[^a-zA-Z0-9]/g, "_") || "Materi"}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("File Markdown (.md) berhasil diunduh!");
  };

  const handleDownloadDocx = () => {
    if (!generatedContent) return;
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <title>Export DOCX</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            h1 { font-size: 20pt; color: #1a365d; margin-top: 18pt; margin-bottom: 6pt; }
            h2 { font-size: 16pt; color: #2b6cb0; margin-top: 14pt; margin-bottom: 6pt; }
            h3 { font-size: 14pt; color: #2d3748; margin-top: 12pt; margin-bottom: 6pt; }
            p, li { font-size: 12px; color: #2d3748; }
            table { border-collapse: collapse; width: 100%; margin: 12pt 0; }
            th, td { border: 1px solid #cbd5e0; padding: 8px; text-align: left; }
            th { background-color: #f7fafc; }
          </style>
        </head>
        <body>
          ${document.getElementById("ai-preview-content")?.innerHTML || ""}
        </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + htmlContent], {
      type: 'application/msword'
    });
    const url = URL.createObjectURL(blob);
    const element = document.createElement("a");
    element.href = url;
    const typeLabel = selectedMaterial ? selectedMaterial.name.replace(/[^a-zA-Z0-9]/g, "_") : "Bahan_Ajar";
    element.download = `${typeLabel}_${topic.replace(/[^a-zA-Z0-9]/g, "_") || "Materi"}.doc`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("File Word (.doc) berhasil diunduh!");
  };

  const handlePrintPDF = () => {
    if (!generatedContent) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Gagal membuka jendela cetak. Pastikan popup blocker dinonaktifkan.");
      return;
    }
    const typeLabel = selectedMaterial?.name || "Bahan Ajar";
    const htmlContent = `
      <html>
        <head>
          <title>Cetak ${typeLabel}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body class="p-8 bg-white text-gray-900 font-sans">
          <div class="max-w-3xl mx-auto border p-8 rounded-lg">
            <div class="mb-6 border-b pb-4">
              <h1 class="text-xl font-bold uppercase tracking-wide">KURIKULA - ${typeLabel.toUpperCase()}</h1>
              <p class="text-xs text-gray-500">Dicetak pada: ${new Date().toLocaleDateString("id-ID")}</p>
            </div>
            <div class="space-y-4">
              ${document.getElementById("ai-preview-content")?.innerHTML || ""}
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleCopyContent = () => {
    if (!generatedContent) return;
    navigator.clipboard.writeText(generatedContent);
    toast.success("Konten berhasil disalin ke clipboard!");
  };

  const handleCardClick = (id: string) => {
    if (id === "pemantik" || id === "ppt") {
      const isEligible = ["premium", "school", "trial"].includes(subscriptionTier);
      if (!isEligible) {
        toast.error(`Fitur ${id === "pemantik" ? "Pertanyaan Pemantik" : "Materi PPT / Slide"} hanya tersedia pada Paket Premium. Silakan upgrade paket Anda.`);
        return;
      }
    }
    setSelectedType(id);
    setIsModalOpen(true);
  };

  const selectedMaterial = materialTypes.find((m) => m.id === selectedType);

  return (
    <div className="p-6 md:p-8 space-y-6 relative flex-1 flex flex-col lg:overflow-hidden min-h-0 h-full">
      {!["pro", "premium", "school", "trial"].includes(subscriptionTier) && (
        <div className="absolute inset-0 bg-gray-50/40 backdrop-blur-md z-30 flex flex-col items-center justify-center p-8 text-center rounded-[32px]">
          <div className="max-w-md p-8 bg-white border border-gray-200 rounded-[24px] shadow-xl space-y-6">
            <div className="w-20 h-20 bg-gradient-to-tr from-[#3C405B] to-[#DF7A5E] rounded-full flex items-center justify-center mx-auto shadow-md border-2 border-white">
              <Sparkles className="w-10 h-10 text-white animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
                Buka Bahan Ajar & Aktivitas 🔒
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Anda perlu menggunakan paket **Pro** atau **Premium** untuk mengakses asisten AI Bahan Ajar ini. Silakan melakukan upgrade paket di menu Billing.
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

      {/* 2-Column Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 lg:overflow-hidden">
        {/* Left Column: Material Cards Selection */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-[12px] border border-gray-200 shadow-sm flex flex-col h-full lg:overflow-hidden min-h-0"
        >
          <div className="p-6 pb-3 border-b border-gray-150 flex-shrink-0 bg-white">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
              Pilih Jenis Bahan Ajar & Aktivitas Pembelajaran
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Rancang dan kembangkan konten pengajaran secara instan.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-4 min-h-0">
            {materialTypes.map((type) => {
              const Icon = type.icon;
              const isLocked = (type.id === "pemantik" || type.id === "ppt") && !["premium", "school", "trial"].includes(subscriptionTier);
              return (
                <motion.div
                  key={type.id}
                  onClick={() => handleCardClick(type.id)}
                  className="p-5 rounded-[16px] border border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50/10 cursor-pointer transition-all flex flex-col items-center justify-center group shadow-sm text-center relative"
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isLocked && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full z-10">
                      <Lock className="w-2.5 h-2.5" /> PREMIUM
                    </div>
                  )}
                  <div
                    className={`w-25 h-25 bg-gradient-to-br ${type.colorClass} rounded-[12px] flex items-center justify-center shadow-md text-white mb-3`}
                  >
                    <Icon className="w-10 h-10" />
                  </div>
                  <h3 className="text-m font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {type.name}
                  </h3>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Right Column: Live Output Preview */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-[12px] border border-gray-200 shadow-sm flex flex-col h-full lg:overflow-hidden min-h-0"
        >
          <div className="p-6 pb-3 border-b border-gray-150 flex-shrink-0 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setPreviewTab("content")}
                className={`px-3 py-1.5 text-xs font-bold rounded-[8px] transition-all cursor-pointer ${previewTab === "content"
                  ? "bg-[#3C405B] text-white"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
              >
                Hasil AI
              </button>
              {hasGenerated && (
                <button
                  onClick={() => setPreviewTab("review")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-[8px] transition-all cursor-pointer flex items-center gap-1.5 ${previewTab === "review"
                    ? "bg-[#DF7A5E] text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                >
                  <Star className="w-3.5 h-3.5 fill-current text-amber-300" />
                  AI Reviewer
                </button>
              )}
            </div>
            {hasGenerated && (
              <div className="flex gap-2">
                <button
                  onClick={handleCopyContent}
                  className="p-1.5 hover:bg-gray-100 rounded-[8px] transition-colors cursor-pointer"
                  title="Copy ke Clipboard"
                >
                  <Copy className="w-4.5 h-4.5 text-gray-600" />
                </button>
              </div>
            )}
          </div>

          {!hasGenerated && !isGenerating ? (
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
                  <Sparkles className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-gray-500 font-semibold text-xs leading-relaxed max-w-xs mx-auto">
                  Pilih jenis bahan ajar di sebelah kiri untuk membuka form konfigurasi.
                </p>
              </div>
            </div>
          ) : isGenerating ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full mx-auto mb-4"
                />
                <p className="text-gray-600 font-bold text-xs">AI sedang membuat bahan ajar...</p>
                <p className="text-xs text-gray-400 mt-1">Ini biasanya membutuhkan waktu kurang dari 1 menit.</p>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col justify-between overflow-hidden"
            >
              {/* Markdown Preview Area */}
              <div className="flex-1 overflow-y-auto pr-2 mb-4 space-y-4 prose prose-blue max-w-none text-gray-800 text-xs leading-relaxed">
                {previewTab === "content" ? (
                  <div id="ai-preview-content" className="space-y-3">
                    {renderSimpleMarkdown(generatedContent)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {isReviewing ? (
                      <div className="min-h-[200px] flex flex-col items-center justify-center text-center">
                        <RefreshCw className="w-8 h-8 text-[#DF7A5E] animate-spin mb-3" />
                        <p className="text-xs font-semibold text-gray-700">AI sedang mereview bahan ajar Anda...</p>
                      </div>
                    ) : reviewContent ? (
                      <div className="prose prose-pink max-w-none text-gray-800 text-xs leading-relaxed bg-pink-50/20 p-4 rounded-[12px] border border-pink-100">
                        <div className="flex items-center gap-2 mb-3 border-b border-pink-100 pb-2 text-pink-700 font-bold">
                          <AlertTriangle className="w-4 h-4 text-pink-600" />
                          Hasil Review Kualitas Pendidikan
                        </div>
                        {renderSimpleMarkdown(reviewContent)}
                      </div>
                    ) : (
                      <div className="min-h-[200px] flex flex-col items-center justify-center text-center p-6 bg-amber-50/20 rounded-[12px] border border-dashed border-amber-200">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mb-2 animate-pulse" />
                        <p className="text-xs font-semibold text-gray-800 mb-1">Dokumen belum direview</p>
                        <p className="text-xs text-gray-500 max-w-xs leading-relaxed mb-3">
                          Analisis tingkat diferensiasi, kelayakan P3, dan keselarasan dengan TP dokumen ini dengan satu kali klik.
                        </p>
                        <button
                          onClick={handleReview}
                          className="px-3.5 py-1.5 bg-[#DF7A5E] hover:bg-[#DF7A5E]/90 text-white rounded-[8px] text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Mulai Review Sekarang
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AI Workflow Action Group: Review & Improve */}
              {hasGenerated && (
                <div className="mt-2 mb-3 pt-3 border-t border-gray-150 flex flex-wrap gap-2">
                  {!reviewContent && !isReviewing && (
                    <button
                      onClick={handleReview}
                      className="flex-1 py-2 px-3 bg-gradient-to-r from-[#DF7A5E] to-[#DF7A5E]/90 hover:from-[#DF7A5E]/95 hover:to-[#DF7A5E] text-white rounded-[8px] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm border border-[#DF7A5E]/20"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Review Kualitas dengan AI
                    </button>
                  )}
                  {reviewContent && (
                    <button
                      onClick={handleImprove}
                      disabled={isImproving}
                      className="flex-1 py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-[8px] text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      {isImproving ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Memperbaiki Dokumen...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Terapkan Perbaikan AI (Improve)
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-4 border-t border-gray-150 bg-white">
                <button
                  onClick={handleDownloadDocx}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors text-xs cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Download DOCX
                </button>
                <button
                  onClick={handlePrintPDF}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors text-xs cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors text-xs cursor-pointer shadow-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Konfigurasi Ulang
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* POPUP CONFIGURATION MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[16px] border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  {selectedMaterial && (
                    <>
                      <div className={`w-9 h-9 bg-gradient-to-br ${selectedMaterial.colorClass} rounded-[8px] flex items-center justify-center text-white shadow-sm`}>
                        <selectedMaterial.icon className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-gray-900">
                          Konfigurasi {selectedMaterial.name}
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Sesuaikan parameter di bawah untuk memandu AI.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body (Scrollable Form Fields) */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4 pb-20">
                {location.state?.fromMeeting && (
                  <div className="bg-blue-50/75 border border-blue-150 rounded-[12px] p-3 text-xs text-blue-800 font-semibold mb-4">
                    📌 Dokumen ini dibuat dari Semester Planner: Pertemuan {location.state.pertemuan || "1"} — {location.state.topic}
                  </div>
                )}
                {/* Row 1: Kelas & Mapel */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-base font-bold text-gray-700 mb-1.5">
                      Kelas
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base font-semibold text-gray-800"
                    >
                      {classList.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-base font-bold text-gray-700 mb-1.5">
                      Mata Pelajaran
                    </label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base font-semibold text-gray-800"
                    >
                      {subjectList.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Topic */}
                <div>
                  <label className="block text-base font-bold text-gray-700 mb-1.5">
                    Topik / Materi Utama
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Contoh: Trigonometri Dasar, Sistem Pencernaan Manusia"
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base font-medium"
                  />
                </div>

                {/* Learning Objective */}
                <div>
                  <label className="block text-base font-bold text-gray-700 mb-1.5">
                    Tujuan Pembelajaran
                  </label>
                  <textarea
                    value={learningObjective}
                    onChange={(e) => setLearningObjective(e.target.value)}
                    placeholder="Contoh: Siswa mampu mendeskripsikan organ-organ penyusun sistem pencernaan..."
                    rows={2}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base font-medium resize-none"
                  />
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-base font-bold text-gray-700 mb-1.5">
                    Tingkat Kesulitan
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {difficultyLevels.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setDifficulty(level)}
                        className={`py-2 px-3 rounded-[10px] text-xs font-semibold border transition-all cursor-pointer ${difficulty === level
                          ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* DYNAMIC FIELDS PER MATERIAL TYPE */}
                {selectedType === "lkpd" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-blue-50/50 rounded-[12px] border border-blue-100 space-y-3"
                  >
                    <h4 className="text-xs font-bold text-blue-800">Spesifikasi LKPD</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-base font-bold text-gray-600 mb-1">Jenis Aktivitas</label>
                        <select
                          value={lkpdActivity}
                          onChange={(e) => setLkpdActivity(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-[8px] text-base font-semibold"
                        >
                          <option>Individu</option>
                          <option>Kelompok</option>
                          <option>Diskusi</option>
                          <option>Eksperimen</option>
                          <option>Studi Kasus</option>
                          <option>Proyek</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-base font-bold text-gray-600 mb-1">Durasi Pengerjaan</label>
                        <input
                          type="text"
                          value={lkpdDuration}
                          onChange={(e) => setLkpdDuration(e.target.value)}
                          placeholder="e.g. 45 menit"
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-[8px] text-base font-medium"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-base font-bold text-gray-600 mb-1">Output Siswa</label>
                      <input
                        type="text"
                        value={lkpdOutput}
                        onChange={(e) => setLkpdOutput(e.target.value)}
                        placeholder="Contoh: Mind map, Infografis, Laporan tertulis"
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-[8px] text-base font-medium"
                      />
                    </div>
                  </motion.div>
                )}

                {selectedType === "aktivitas" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-pink-50/50 rounded-[12px] border border-pink-100 space-y-3"
                  >
                    <h4 className="text-xs font-bold text-pink-800">Spesifikasi Aktivitas Pembelajaran</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-base font-bold text-gray-600 mb-1">Jenis Aktivitas</label>
                        <select
                          value={aktivitasType}
                          onChange={(e) => setAktivitasType(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-[8px] text-base font-semibold"
                        >
                          <option>Game / Kuis</option>
                          <option>Diskusi Kelompok</option>
                          <option>Roleplay / Sosiodrama</option>
                          <option>Studi Kasus</option>
                          <option>Proyek Mini</option>
                          <option>Debat Kelas</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-base font-bold text-gray-600 mb-1">Durasi Aktivitas</label>
                        <input
                          type="text"
                          value={aktivitasDuration}
                          onChange={(e) => setAktivitasDuration(e.target.value)}
                          placeholder="e.g. 40 menit"
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-[8px] text-base font-medium"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {selectedType === "pemantik" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-purple-50/50 rounded-[12px] border border-purple-100 space-y-3"
                  >
                    <h4 className="text-xs font-bold text-purple-800">Spesifikasi Pertanyaan Pemantik</h4>
                    <div>
                      <label className="block text-base font-bold text-gray-600 mb-1">Jumlah Pertanyaan</label>
                      <input
                        type="number"
                        value={pemantikCount}
                        onChange={(e) => setPemantikCount(e.target.value)}
                        min="1"
                        max="15"
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-[8px] text-base font-medium"
                      />
                    </div>
                  </motion.div>
                )}

                {selectedType === "ppt" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-orange-50/50 rounded-[12px] border border-orange-100 space-y-3"
                  >
                    <h4 className="text-xs font-bold text-orange-800">Spesifikasi Materi PPT</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-base font-bold text-gray-600 mb-1">Jumlah Slide</label>
                        <input
                          type="number"
                          value={pptSlides}
                          onChange={(e) => setPptSlides(e.target.value)}
                          min="1"
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-[8px] text-base font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-base font-bold text-gray-600 mb-1">Gaya Penyampaian</label>
                        <select
                          value={pptStyle}
                          onChange={(e) => setPptStyle(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-[8px] text-base font-semibold"
                        >
                          <option>Formal</option>
                          <option>Interaktif</option>
                          <option>Storytelling</option>
                          <option>Dunia Kerja</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-6 pt-1">
                      <label className="flex items-center gap-2 text-base font-semibold text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pptDiscussion}
                          onChange={(e) => setPptDiscussion(e.target.checked)}
                          className="rounded text-blue-600 border-gray-300 w-3.5 h-3.5 focus:ring-blue-500"
                        />
                        Aktivitas Diskusi
                      </label>
                      <label className="flex items-center gap-2 text-base font-semibold text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pptQuiz}
                          onChange={(e) => setPptQuiz(e.target.checked)}
                          className="rounded text-blue-600 border-gray-300 w-3.5 h-3.5 focus:ring-blue-500"
                        />
                        Sertakan Kuis
                      </label>
                    </div>
                  </motion.div>
                )}

                {selectedType === "experiment" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-indigo-50/50 rounded-[12px] border border-indigo-100 space-y-3"
                  >
                    <h4 className="text-xs font-bold text-indigo-800">Spesifikasi Praktikum</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-base font-bold text-gray-600 mb-1">Nama Praktikum</label>
                        <input
                          type="text"
                          value={labName}
                          onChange={(e) => setLabName(e.target.value)}
                          placeholder="e.g. Uji Karbohidrat"
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-[8px] text-base font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-base font-bold text-gray-600 mb-1">Durasi</label>
                        <input
                          type="text"
                          value={labDuration}
                          onChange={(e) => setLabDuration(e.target.value)}
                          placeholder="e.g. 60 menit"
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-[8px] text-base font-medium"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-base font-bold text-gray-600 mb-1">Alat dan Bahan</label>
                      <textarea
                        value={labMaterials}
                        onChange={(e) => setLabMaterials(e.target.value)}
                        placeholder="e.g. Tabung reaksi, Larutan Lugol..."
                        rows={2}
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-[8px] text-base font-medium resize-none"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Catatan Tambahan */}
                <div>
                  <label className="block text-base font-bold text-gray-700 mb-1.5">
                    Catatan Tambahan
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Sesuaikan penjelasan untuk murid yang memiliki kesulitan membaca..."
                    rows={2}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base font-medium resize-none"
                  />
                </div>

                {/* ACCORDION (FIELD TAMBAHAN / OPSIONAL) */}
                <div className="border border-gray-150 rounded-[10px] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                    className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between font-bold text-xs text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <span>Pengaturan Tambahan (Opsional)</span>
                    {isAccordionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <AnimatePresence>
                    {isAccordionOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-150 bg-white p-4 space-y-4 overflow-hidden"
                      >
                        <div>
                          <label className="block text-base font-bold text-gray-600 mb-1">
                            Karakter yang Dikuatkan (Profil Pelajar Pancasila)
                          </label>
                          <input
                            type="text"
                            value={karakter}
                            onChange={(e) => setKarakter(e.target.value)}
                            placeholder="Contoh: Mandiri, Bernalar Kritis, Gotong Royong"
                            className="w-full px-3.5 py-2 border border-gray-200 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-base font-bold text-gray-600 mb-1.5">
                            Konteks Pembelajaran
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {contextOptions.map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setKonteks(konteks === opt ? "" : opt)}
                                className={`px-3 py-1.5 rounded-[8px] border text-center text-xs font-semibold transition-all cursor-pointer ${konteks === opt
                                  ? "bg-purple-600 border-purple-600 text-white"
                                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                  }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {/* Model AI & Estimasi Credit */}
                  <div className="bg-blue-50/50 p-3.5 rounded-[12px] border border-blue-100/60 flex items-center justify-between mt-4">
                    <div>
                      <label className="block text-base text-gray-500 font-bold mb-1">
                        Pilih Model AI:
                      </label>
                      <select
                        value={selectedModel}
                        onChange={(e) => {
                          const newModel = e.target.value;
                          const modelObj = aiModels.find(item => item.id === newModel);
                          const cleanTier = (subscriptionTier || "inactive").toLowerCase();
                          const isAllowed = modelObj ? modelObj.tier_restriction.map((t: string) => t.toLowerCase()).includes(cleanTier) : true;
                          if (!isAllowed) {
                            toast.error("Model ini tidak tersedia untuk paket Anda. Silakan upgrade paket Anda.");
                            return;
                          }
                          setSelectedModel(newModel);
                          localStorage.setItem("kurikula_selected_ai_model", newModel);
                        }}
                        className="text-base px-2 py-1.5 bg-white border border-gray-200 rounded-[8px] focus:outline-none text-gray-700 font-bold shadow-sm"
                      >
                        {aiModels && aiModels.length > 0 ? (
                          aiModels.map((m) => {
                            const cleanTier = (subscriptionTier || "inactive").toLowerCase();
                            const isAllowed = m.tier_restriction.map((t: string) => t.toLowerCase()).includes(cleanTier);
                            return (
                              <option key={m.id} value={m.id} disabled={!isAllowed}>
                                {m.name} {!isAllowed ? "🔒" : ""}
                              </option>
                            );
                          })
                        ) : (
                          <>
                            <option value="gemini-flash">Gemini Flash</option>
                            <option value="gemini-pro">
                              Gemini Pro (Kualitas Tinggi) {subscriptionTier === "basic" ? "🔒" : ""}
                            </option>
                          </>
                        )}
                      </select>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 font-semibold">Estimasi Biaya:</p>
                      <p className="text-sm font-extrabold text-blue-700">
                        {getMaterialCost(selectedType, selectedModel)} Credit
                      </p>
                      <p className="text-xs text-gray-400">Saldo: {(credits?.balance ?? 0).toLocaleString("id-ID")} Credit</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Modal Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-150 flex items-center justify-between rounded-b-[16px]">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                  <Info className="w-4 h-4 text-blue-500" />
                  <span>Biaya akan dikurangi dari saldo AI Credit Anda</span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-200 hover:bg-gray-105 rounded-[10px] text-xs font-bold text-gray-700 cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                  <AIGlow>
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-[10px] font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-md"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate dengan AI
                        </>
                      )}
                    </button>
                  </AIGlow>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
