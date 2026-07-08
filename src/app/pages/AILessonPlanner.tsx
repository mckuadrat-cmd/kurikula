import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Download, Save, Edit, Copy, RefreshCw, Lock, Star, AlertTriangle, ChevronDown } from "lucide-react";
import { AIGlow, AIButton } from "../components/AIComponents";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useNavigate, useLocation } from "react-router";
import { appendSheetRows, readSheetRange, isAuthorized, hasValidToken } from "../../lib/googleSheetsService";
import { generateAIContent } from "../../lib/aiClient";
import { toast } from "sonner";

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

const generateFallbackLessonPlan = (params: any) => {
  return `# MODUL AJAR (RENCANA PELAKSANAAN PEMBELAJARAN)

## I. INFORMASI UMUM
- **Jenjang Sekolah**: ${params.jenjang || "SMA"}
- **Kelas**: ${params.class || "10"}
- **Mata Pelajaran**: ${params.subject || "Matematika"}
- **Pertemuan ke-**: ${params.pertemuan || "1"}
- **Alokasi Waktu / Durasi**: ${params.duration || "90 menit"}
- **Model Pembelajaran**: ${params.method || "Problem Based Learning"}
- **Target Karakter Pelajar**: ${params.targetKarakter || "Mandiri, Bernalar Kritis, Kreatif"}

---

## II. KOMPONEN INTI

### A. Tujuan Pembelajaran
Pada akhir pembelajaran, peserta didik diharapkan mampu:
${params.objectives ? params.objectives.split('\n').map((line: string) => `- ${line}`).join('\n') : `- Memahami dan menjelaskan konsep dasar tentang ${params.topic || "materi ajar"}\n- Menerapkan pemecahan masalah terkait ${params.topic || "materi ajar"}`}

### B. Materi Pembelajaran
**Topik Utama**: ${params.topic || "Materi Pelajaran"}
- Konsep dasar dan definisi utama
- Studi kasus dan implementasi praktis
- Latihan mandiri dan kelompok

### C. Kegiatan Pembelajaran
1. **Kegiatan Pendahuluan (15 Menit)**:
   - Guru membuka pelajaran dengan salam dan berdoa.
   - Guru memeriksa kehadiran peserta didik dan melakukan apersepsi.
   - Guru menyampaikan tujuan pembelajaran dan mengaitkannya dengan kehidupan sehari-hari.
2. **Kegiatan Inti (60 Menit)**:
   - **Langkah 1 (Orientasi Masalah)**: Peserta didik mengamati paparan singkat mengenai ${params.topic || "materi ajar"}.
   - **Langkah 2 (Mengorganisasi Belajar)**: Guru membagi peserta didik ke dalam kelompok kecil untuk mendiskusikan topik pembelajaran.
   - **Langkah 3 (Penyelidikan)**: Peserta didik mengumpulkan informasi yang relevan dan merumuskan solusi dari masalah yang diajukan.
   - **Langkah 4 (Presentasi Hasil)**: Perwakilan kelompok mempresentasikan hasil diskusi di depan kelas.
3. **Kegiatan Penutup (15 Menit)**:
   - Guru bersama peserta didik melakukan refleksi dan menyimpulkan materi yang dipelajari.
   - Guru menyampaikan penugasan/rencana tindak lanjut untuk pertemuan berikutnya.
   - Pelajaran ditutup dengan doa dan salam.

### D. Instrumen Penilaian
Instrumen penilaian yang diterapkan pada pembelajaran ini adalah:
${params.instruments && params.instruments.length > 0 ? params.instruments.map((i: string) => `- **${i}**: Evaluasi pencapaian kompetensi siswa`).join('\n') : "- Penugasan\n- Observasi Kinerja"}

${params.notes ? `### E. Catatan Tambahan\n${params.notes}` : ''}
`;
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
  const elements: React.ReactNode[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    // Check if line is part of a markdown table
    if (line.trim().startsWith("|")) {
      // Look ahead to see if it has a divider line
      const nextLine = lines[i + 1];
      if (nextLine && nextLine.trim().startsWith("|") && (nextLine.includes("---") || nextLine.includes(":-"))) {
        // We found a table! Let's collect all table lines
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith("|")) {
          tableLines.push(lines[i]);
          i++;
        }
        
        // Parse the table
        elements.push(parseMarkdownTable(tableLines, elements.length));
        continue;
      }
    }
    
    // Standard rendering
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-lg font-bold text-gray-900 mt-4 mb-2">{line.replace("### ", "")}</h3>);
    } else if (line.startsWith("#### ")) {
      elements.push(<h4 key={i} className="text-md font-semibold text-gray-900 mt-3 mb-1.5">{line.replace("#### ", "")}</h4>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-xl font-bold text-gray-950 mt-5 mb-2.5 border-b pb-1.5">{line.replace("## ", "")}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-2xl font-extrabold text-gray-950 mt-6 mb-3 border-b pb-2">{line.replace("# ", "")}</h1>);
    } else if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const content = line.trim().replace(/^[\-\*]\s+/, "");
      elements.push(
        <ul key={i} className="list-disc list-inside ml-4 my-1 text-gray-700 text-sm">
          <li>{parseInlineMarkdown(content)}</li>
        </ul>
      );
    } else if (/^\d+\.\s+/.test(line.trim())) {
      const content = line.trim().replace(/^\d+\.\s+/, "");
      elements.push(
        <ol key={i} className="list-decimal list-inside ml-4 my-1 text-gray-700 text-sm">
          <li>{parseInlineMarkdown(content)}</li>
        </ol>
      );
    } else if (line.trim() === "---") {
      elements.push(<hr key={i} className="my-4 border-gray-200" />);
    } else if (!line.trim()) {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="text-sm text-gray-700 my-1 leading-relaxed">{parseInlineMarkdown(line)}</p>);
    }
    
    i++;
  }
  
  return elements;
}

function parseMarkdownTable(tableLines: string[], keyIndex: number) {
  // Filter out divider lines (e.g. |---|---|)
  const contentLines = tableLines.filter(line => !line.includes("---") && !line.includes(":-"));
  
  if (contentLines.length === 0) return null;
  
  const headers = contentLines[0]
    .split("|")
    .map(cell => cell.trim())
    .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1); // Remove empty ends
    
  const rows = contentLines.slice(1).map(line => {
    return line
      .split("|")
      .map(cell => cell.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
  });
  
  return (
    <div key={`table-${keyIndex}`} className="overflow-x-auto my-4 rounded-[12px] border border-gray-200">
      <table className="min-w-full divide-y divide-gray-250 border-collapse">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((h, idx) => (
              <th key={idx} className="border border-gray-300 px-4 py-2.5 text-left text-xs font-bold text-gray-900 uppercase tracking-wider bg-gray-50">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className={rowIdx % 2 === 1 ? "bg-gray-50/50" : "bg-white"}>
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="border border-gray-300 px-4 py-2.5 text-xs text-gray-700 font-medium">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AILessonPlanner() {
  const { profile } = useAuth();
  const { subscriptionTier, credits, activeWorkspaceId, refresh, aiModels } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();

  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);

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

  // Form states matching user requirements
  const [jenjang, setJenjang] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [pertemuanKe, setPertemuanKe] = useState("1");
  const [tujuanPembelajaran, setTujuanPembelajaran] = useState("");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("90 menit");
  const [targetKarakter, setTargetKarakter] = useState("");
  const [modelPembelajaran, setModelPembelajaran] = useState("Problem Based Learning");
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(["Tes Tertulis", "Penugasan"]);
  const [catatanTambahan, setCatatanTambahan] = useState("");

  // New Form states matching upgraded requirements
  const [kemampuanAwal, setKemampuanAwal] = useState("");
  const [kondisiKelas, setKondisiKelas] = useState("");
  const [jumlahSiswa, setJumlahSiswa] = useState("");
  const [tantanganKelas, setTantanganKelas] = useState("");
  const [saranaPrasarana, setSaranaPrasarana] = useState("");

  const [classList, setClassList] = useState<string[]>([]);
  const [subjectList, setSubjectList] = useState<string[]>([]);

  // Export Dropdown Trigger
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Prefill check from router state (Semester Planner transition)
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

    // Handle prefilled context from router navigation state (e.g. from Semester Planner)
    const navState = location.state as any;
    if (navState && navState.fromMeeting) {
      if (navState.class) setSelectedClass(navState.class);
      if (navState.subject) setSelectedSubject(navState.subject);
      if (navState.pertemuan) setPertemuanKe(navState.pertemuan);
      if (navState.topic) setTopic(navState.topic);
      if (navState.duration) setDuration(navState.duration);
      if (navState.learningObjective) setTujuanPembelajaran(navState.learningObjective);
      if (navState.targetKarakter) setTargetKarakter(navState.targetKarakter);
      if (navState.modelPembelajaran) setModelPembelajaran(navState.modelPembelajaran);
      if (navState.assessmentPlan) {
        const parsedInsts = navState.assessmentPlan.split(",").map((i: string) => i.trim()).filter(Boolean);
        if (parsedInsts.length > 0) setSelectedInstruments(parsedInsts);
      }
      if (navState.teacherNotes) setCatatanTambahan(navState.teacherNotes);
    }
  }, [location.state, profile]);

  const handleToggleInstrument = (inst: string) => {
    if (selectedInstruments.includes(inst)) {
      setSelectedInstruments(selectedInstruments.filter((i) => i !== inst));
    } else {
      setSelectedInstruments([...selectedInstruments, inst]);
    }
  };

  const handleGenerate = async () => {
    if (!topic || !tujuanPembelajaran) {
      toast.error("Topik Pembelajaran dan Tujuan Pembelajaran wajib diisi.");
      return;
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const period = month >= 6
      ? { tahunAjaran: `${year}/${year + 1}`, semester: "Ganjil" }
      : { tahunAjaran: `${year - 1}/${year}`, semester: "Genap" };

    const activeModel = aiModels.find(m => m.id === selectedModel);
    const cost = activeModel ? 10 * Number(activeModel.multiplier) : (selectedModel === "gemini-pro" ? 20 : 10);
    if ((credits?.balance ?? 0) < cost) {
      toast.error("AI Credit tidak cukup. Silakan top up atau upgrade paket.");
      navigate("/billing");
      return;
    }

    setIsGenerating(true);
    setPreviewTab("content");
    try {
      const content = await generateAIContent({
        workspaceId: activeWorkspaceId,
        type: "lesson-plan",
        model: selectedModel,
        params: {
          targetYear: period.tahunAjaran,
          targetSemester: period.semester,
          jenjang: jenjang || "SMA",
          class: selectedClass,
          subject: selectedSubject,
          pertemuan: pertemuanKe,
          topic,
          duration,
          objectives: tujuanPembelajaran,
          targetKarakter,
          method: modelPembelajaran,
          instruments: selectedInstruments,
          notes: catatanTambahan,
          kemampuanAwal,
          kondisiKelas,
          jumlahSiswa,
          tantanganKelas,
          saranaPrasarana
        }
      });
      setGeneratedContent(content);
      setHasGenerated(true);
      toast.success("Modul Ajar berhasil digenerate!");
      if (refresh) {
        await refresh();
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Gagal melakukan generate modul ajar.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!generatedContent) return;
    if (!isAuthorized() || !hasValidToken()) {
      toast.error("Hubungkan ulang Google Drive di Dashboard untuk menyimpan dokumen ke library.");
      return;
    }
    setIsSavingToLibrary(true);
    try {
      const todayStr = new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
      const sizeStr = `${(new Blob([generatedContent]).size / 1024).toFixed(1)} KB`;
      const docId = `DOC-${Date.now()}`;
      const title = `Modul Ajar: ${selectedSubject} - Kelas ${selectedClass} (Pertemuan ${pertemuanKe})`;

      const newRow = [
        docId,
        title,
        "Modul",
        generatedContent,
        todayStr,
        sizeStr,
        "0"
      ];

      await appendSheetRows("Dokumen!A:G", [newRow]);
      toast.success("Dokumen berhasil disimpan ke Library Administrasi Anda!");
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal menyimpan dokumen ke Google Sheets.");
    } finally {
      setIsSavingToLibrary(false);
    }
  };

  // Export Microsoft Word (.doc) formatted properly with tables
  const handleExportWord = () => {
    if (!generatedContent) return;
    const contentEl = document.getElementById("ai-preview-content");
    if (!contentEl) {
      toast.error("Konten tidak ditemukan untuk diekspor.");
      return;
    }
    
    const htmlContent = contentEl.innerHTML;
    
    const header = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:w="urn:schemas-microsoft-com:office:word" 
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <title>Modul Ajar</title>
        <style>
          body {
            font-family: 'Calibri', 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.5;
          }
          h1 {
            font-family: 'Calibri', 'Arial', sans-serif;
            font-size: 18pt;
            font-weight: bold;
            color: #111827;
            border-bottom: 2px solid #374151;
            padding-bottom: 5px;
            margin-top: 24px;
            margin-bottom: 12px;
          }
          h2 {
            font-family: 'Calibri', 'Arial', sans-serif;
            font-size: 14pt;
            font-weight: bold;
            color: #1f2937;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 4px;
            margin-top: 18px;
            margin-bottom: 8px;
          }
          h3 {
            font-family: 'Calibri', 'Arial', sans-serif;
            font-size: 12pt;
            font-weight: bold;
            color: #374151;
            margin-top: 12px;
            margin-bottom: 6px;
          }
          h4 {
            font-family: 'Calibri', 'Arial', sans-serif;
            font-size: 11pt;
            font-weight: bold;
            color: #4b5563;
            margin-top: 8px;
            margin-bottom: 4px;
          }
          p {
            margin-top: 0;
            margin-bottom: 8px;
            color: #374151;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 12px;
            margin-bottom: 12px;
          }
          th {
            border: 1px solid #9ca3af;
            background-color: #f3f4f6;
            padding: 8px;
            font-weight: bold;
            font-size: 10.5pt;
            text-align: left;
            color: #111827;
          }
          td {
            border: 1px solid #d1d5db;
            padding: 8px;
            font-size: 10pt;
            color: #374151;
          }
          tr:nth-child(even) td {
            background-color: #f9fafb;
          }
          ul, ol {
            margin-top: 0;
            margin-bottom: 8px;
            padding-left: 20px;
          }
          li {
            margin-bottom: 4px;
            color: #374151;
          }
        </style>
      </head>
      <body>
        <div style="max-width: 600px; margin: 0 auto;">
          <div style="border-bottom: 3px double #111827; padding-bottom: 10px; margin-bottom: 20px; text-align: center;">
            <h1 style="border:none; margin:0; padding:0; font-size: 20pt; text-transform: uppercase;">MODUL AJAR</h1>
            <p style="margin:5px 0 0 0; font-size: 10pt; color: #6b7280; font-weight: bold;">Dibuat secara otomatis dengan Kurikula AI</p>
          </div>
          ${htmlContent}
        </div>
      </body>
      </html>
    `;
    
    const blob = new Blob(['\ufeff' + header], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const element = document.createElement("a");
    element.href = url;
    element.download = `Modul_Ajar_${topic.replace(/[^a-zA-Z0-9]/g, "_") || "Materi"}.doc`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
    toast.success("Berkas Word (.doc) berhasil diunduh!");
  };

  // Export PDF with customized style (hiding elements)
  const handlePrintPDF = () => {
    if (!generatedContent) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Gagal membuka jendela cetak. Pastikan popup blocker dinonaktifkan.");
      return;
    }
    const htmlContent = `
      <html>
        <head>
          <title>Cetak Modul Ajar</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none; }
            }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #d1d5db; padding: 8px; }
            th { background-color: #f3f4f6; }
          </style>
        </head>
        <body class="p-8 bg-white text-gray-900 font-sans">
          <div class="max-w-3xl mx-auto border p-8 rounded-lg">
            <div class="mb-6 border-b pb-4">
              <h1 class="text-xl font-bold uppercase tracking-wide">KURIKULA - MODUL AJAR (AI GENERATED)</h1>
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

  return (
    <div className="p-6 md:p-8 relative flex-1 flex flex-col lg:overflow-hidden min-h-0 h-full">
      {!["pro", "premium", "school", "trial"].includes(subscriptionTier) && (
        <div className="absolute inset-0 bg-gray-50/40 backdrop-blur-md z-30 flex flex-col items-center justify-center p-8 text-center rounded-[32px]">
          <div className="max-w-md p-8 bg-white border border-gray-200 rounded-[24px] shadow-xl space-y-6">
            <div className="w-20 h-20 bg-gradient-to-tr from-[#3C405B] to-[#DF7A5E] rounded-full flex items-center justify-center mx-auto shadow-md border-2 border-white">
              <Sparkles className="w-10 h-10 text-white animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
                Buka AI Modul Ajar 🔒
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Anda perlu menggunakan paket **Pro** atau **Premium** untuk mengakses asisten AI modul ajar (RPP) ini. Silakan melakukan upgrade paket di menu Billing.
              </p>
            </div>
            <button
              onClick={() => navigate("/billing")}
              className="px-6 py-2.5 bg-[#3C405B] text-white text-sm font-bold rounded-[12px] shadow-md hover:bg-[#3C405B]/90 transition-all cursor-pointer"
            >
              Upgrade Paket Sekarang
            </button>
          </div>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        
        {/* LEFT COLUMN: Input Form */}
        <div className="bg-white rounded-[24px] p-6 border border-gray-200 shadow-sm flex flex-col overflow-y-auto max-h-[calc(100vh-8rem)] text-left">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3.5 mb-5 flex-shrink-0">
            <Sparkles className="w-5 h-5 text-[#DF7A5E]" />
            <h2 className="text-base font-black text-gray-900">Form Parameter Modul Ajar</h2>
          </div>

          <div className="space-y-5 flex-1 pr-1">
            {/* Subject and Class */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Mata Pelajaran</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-950 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  {subjectList.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Kelas</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-950 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  {classList.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pertemuan and Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pertemuan Ke-</label>
                <input
                  type="text"
                  value={pertemuanKe}
                  onChange={(e) => setPertemuanKe(e.target.value)}
                  placeholder="Contoh: 1, 2, atau 3"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-950 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Alokasi Waktu / Durasi</label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Contoh: 2 x 45 menit"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-950 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Topic & Objectives */}
            <div className="space-y-4 bg-gray-50/50 p-4 rounded-[16px] border border-gray-200">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Topik Pembahasan Utama <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Contoh: Pengenalan Sistem Operasi Linux"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-950 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Tujuan Pembelajaran (CP/TP) <span className="text-red-500">*</span></label>
                <textarea
                  value={tujuanPembelajaran}
                  onChange={(e) => setTujuanPembelajaran(e.target.value)}
                  placeholder="Contoh: Siswa mampu mempraktikkan dasar perintah terminal Linux..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                />
              </div>
            </div>

            {/* Pedagogy Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Model Pembelajaran</label>
                <select
                  value={modelPembelajaran}
                  onChange={(e) => setModelPembelajaran(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-950 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                >
                  <option value="Problem Based Learning">Problem Based Learning</option>
                  <option value="Project Based Learning">Project Based Learning</option>
                  <option value="Inquiry Learning">Inquiry Learning</option>
                  <option value="Discovery Learning">Discovery Learning</option>
                  <option value="Direct Instruction">Direct Instruction</option>
                  <option value="Cooperative Learning">Cooperative Learning</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Target Karakter PPP</label>
                <input
                  type="text"
                  value={targetKarakter}
                  onChange={(e) => setTargetKarakter(e.target.value)}
                  placeholder="Contoh: Mandiri, Kreatif, Gotong Royong"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-950 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* UPGRADE: Advanced Classroom Contexts */}
            <div className="p-4 rounded-[16px] bg-[#DF7A5E]/5 border border-[#DF7A5E]/10 space-y-4">
              <span className="block text-xs font-bold text-[#DF7A5E] uppercase tracking-wider">Konteks & Karakteristik Kelas (Opsional)</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Kemampuan Awal Siswa</label>
                  <input
                    type="text"
                    value={kemampuanAwal}
                    onChange={(e) => setKemampuanAwal(e.target.value)}
                    placeholder="Contoh: 60% paham algoritma dasar"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-[8px] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Jumlah Siswa</label>
                  <input
                    type="number"
                    value={jumlahSiswa}
                    onChange={(e) => setJumlahSiswa(e.target.value)}
                    placeholder="Contoh: 36"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-[8px] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Hambatan Utama Kelas</label>
                  <input
                    type="text"
                    value={kondisiKelas}
                    onChange={(e) => setKondisiKelas(e.target.value)}
                    placeholder="Contoh: Mengobrol saat siang"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-[8px] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Sarana & Prasarana</label>
                  <input
                    type="text"
                    value={saranaPrasarana}
                    onChange={(e) => setSaranaPrasarana(e.target.value)}
                    placeholder="Contoh: Proyektor, Lab Komputer"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-[8px] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Assessment Instruments Checkbox Grid */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Instrumen Penilaian</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50 p-4 rounded-[12px] border border-gray-200">
                {assessmentInstruments.map((inst) => {
                  const isChecked = selectedInstruments.includes(inst);
                  return (
                    <label
                      key={inst}
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-[8px] border text-xs font-bold cursor-pointer select-none transition-all ${
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

            {/* Extra Notes */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Catatan Tambahan untuk AI</label>
              <textarea
                value={catatanTambahan}
                onChange={(e) => setCatatanTambahan(e.target.value)}
                placeholder="Rincian tambahan mengenai urutan kegiatan pembelajaran..."
                rows={2}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              />
            </div>

            {/* Model & Credit estimation */}
            <div className="bg-blue-50/50 p-4 rounded-[12px] border border-blue-100 flex items-center justify-between text-xs font-semibold">
              <div>
                <label className="block text-gray-500 mb-1">Model AI:</label>
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    const m = e.target.value;
                    const modelObj = aiModels.find(item => item.id === m);
                    const cleanTier = (subscriptionTier || "inactive").toLowerCase();
                    const isAllowed = modelObj ? modelObj.tier_restriction.map((t: string) => t.toLowerCase()).includes(cleanTier) : true;
                    if (!isAllowed) {
                      toast.error("Model ini tidak tersedia untuk paket Anda. Silakan upgrade paket Anda.");
                      return;
                    }
                    setSelectedModel(m);
                    localStorage.setItem("kurikula_selected_ai_model", m);
                  }}
                  className="px-2 py-1 bg-white border border-gray-200 rounded-[6px]"
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
                      <option value="gemini-pro" disabled={subscriptionTier === "basic"}>
                        Gemini Pro {subscriptionTier === "basic" ? "🔒" : ""}
                      </option>
                    </>
                  )}
                </select>
              </div>
              <div className="text-right">
                <p className="text-gray-400">Estimasi Biaya: <span className="text-blue-700 font-extrabold">{(() => {
                  const activeModel = aiModels.find(m => m.id === selectedModel);
                  return activeModel ? 10 * Number(activeModel.multiplier) : (selectedModel === "gemini-pro" ? 20 : 10);
                })()} Credit</span></p>
                <p className="text-gray-400 mt-0.5">Saldo: {credits?.balance ?? 0} Credit</p>
              </div>
            </div>

            {/* Action button */}
            <AIGlow>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-[12px] font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Generating Modul Ajar...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    Auto Generate Modul Ajar RPP
                  </>
                )}
              </button>
            </AIGlow>
          </div>
        </div>

        {/* RIGHT COLUMN: Output Preview & Actions */}
        <div className="bg-white rounded-[24px] p-6 border border-gray-200 shadow-sm flex flex-col min-h-0 max-h-[calc(100vh-8rem)] text-left">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-shrink-0 mb-4">
            <h2 className="text-base font-black text-gray-900">Hasil Modul Ajar (AI RPP)</h2>
            {hasGenerated && (
              <div className="flex gap-2 bg-gray-150 p-1 rounded-[10px] border border-gray-200">
                <button
                  onClick={() => setPreviewTab("content")}
                  className={`px-3 py-1 rounded-[8px] text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                    previewTab === "content" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Konten
                </button>
              </div>
            )}
          </div>

          {!hasGenerated ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400 space-y-3 bg-gray-50 rounded-[16px] border border-dashed border-gray-200">
              <Sparkles className="w-10 h-10 text-gray-300" />
              <h3 className="font-bold text-gray-900 text-sm">Hasil Modul Ajar Belum Tersedia</h3>
              <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                Silakan lengkapi parameter di kolom kiri dan klik "Auto Generate" untuk membuat Modul Ajar format RPP dengan kecerdasan buatan.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              {/* Document Scroll area */}
              <div className="flex-1 overflow-y-auto pr-1 bg-gray-50/50 p-5 rounded-[16px] border border-gray-150 relative">
                <button
                  onClick={handleCopyContent}
                  className="absolute top-4 right-4 p-2 bg-white hover:bg-gray-100 border border-gray-250 text-gray-500 hover:text-gray-800 rounded-[8px] shadow-sm transition-all cursor-pointer"
                  title="Salin semua konten"
                >
                  <Copy className="w-4 h-4" />
                </button>

                <div id="ai-preview-content" className="space-y-4 prose prose-blue max-w-none text-gray-800 text-sm">
                  {renderSimpleMarkdown(generatedContent)}
                </div>
              </div>

              {/* ACTION BUTTONS (SINKRON DENGAN DUA TOMBOL SAJA: EXPORT & SIMPAN) */}
              <div className="flex gap-3 relative">
                {/* Export Dropdown Trigger Button */}
                <div className="flex-1 relative">
                  <button
                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] font-bold flex items-center justify-center gap-2 transition-colors text-sm cursor-pointer shadow-sm"
                  >
                    <Download className="w-5 h-5" />
                    Export
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </button>

                  <AnimatePresence>
                    {showExportDropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowExportDropdown(false)}></div>
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-[16px] border border-gray-200 shadow-2xl py-2 z-20 text-left overflow-hidden flex flex-col gap-0.5"
                        >
                          <button
                            onClick={() => {
                              setShowExportDropdown(false);
                              handleExportWord();
                            }}
                            className="w-full px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-55 transition-colors text-left"
                          >
                            Word (.doc)
                          </button>
                          <button
                            onClick={() => {
                              setShowExportDropdown(false);
                              handlePrintPDF();
                            }}
                            className="w-full px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-55 transition-colors text-left border-t border-gray-100"
                          >
                            PDF (.pdf)
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveToLibrary}
                  disabled={isSavingToLibrary}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[12px] font-bold flex items-center justify-center gap-2 transition-colors text-sm disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSavingToLibrary ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  Simpan
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
