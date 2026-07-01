import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Download,
  Search,
  Filter,
  FolderOpen,
  Printer,
  Trash2,
  Copy,
  RefreshCw,
  X,
  Info,
  Check
} from "lucide-react";
import { isAuthorized, readSheetRange, updateSheetRange } from "../../lib/googleSheetsService";
import { toast } from "sonner";
import { ConfirmModal } from "../components/ui/ConfirmModal";

interface DocumentItem {
  id: string;
  title: string;
  type: string;
  content: string;
  date: string;
  size: string;
  downloads: number;
}


const typeColors = {
  RPP: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Modul: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  Report: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Silabus: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
};

function parseInlineMarkdown(text: string) {
  if (!text) return "";
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
      const codeParts = subPart.split(/`([^`]+)`/g);
      return codeParts.map((codePart, k) => {
        if (k % 2 === 1) {
          return <code key={k} className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded font-mono text-xs text-pink-600">{codePart}</code>;
        }
        return codePart;
      });
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
    if (line.startsWith("> ")) {
      return (
        <blockquote key={idx} className="border-l-4 border-blue-500 pl-4 py-1 my-2 text-gray-600 italic bg-blue-50/50 rounded-r-md">
          {parseInlineMarkdown(line.replace("> ", ""))}
        </blockquote>
      );
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

export default function Administration() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const authorized = isAuthorized();
      if (authorized) {
        const rows = await readSheetRange("Dokumen!A2:G");
        const formattedDocs = rows.map((row) => ({
          id: row[0] || `DOC-${Math.random()}`,
          title: row[1] || "Dokumen Tanpa Judul",
          type: row[2] || "Report",
          content: row[3] || "",
          date: row[4] || "-",
          size: row[5] || "0 KB",
          downloads: parseInt(row[6]) || 0,
        }));
        setDocuments(formattedDocs);
        setIsDemo(false);
      } else {
        setDocuments([]);
        setIsDemo(false);
      }
    } catch (error) {
      console.error("Gagal meload data dokumen:", error);
      // Fallback ke empty jika sheets error
      setDocuments([]);
      setIsDemo(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteDoc = async (docId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    if (isDemo) {
      // Offline / Demo delete simulation
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
      if (selectedDoc && selectedDoc.id === docId) {
        setIsModalOpen(false);
        setSelectedDoc(null);
      }
      toast.success("Dokumen dihapus (Mode Demo)");
      return;
    }

    setDeletingId(docId);
    try {
      // 1. Baca data paling terupdate
      const rows = await readSheetRange("Dokumen!A2:G");
      // 2. Filter data
      const filtered = rows.filter((row) => row[0] !== docId);
      // 3. Tambahkan baris kosong untuk menimpa baris lama
      const updateData = [...filtered];
      const diff = rows.length - filtered.length;
      for (let i = 0; i < diff; i++) {
        updateData.push(["", "", "", "", "", "", ""]);
      }
      // 4. Update range
      const endRow = rows.length + 1; // Baris terakhir di spreadsheet
      await updateSheetRange(`Dokumen!A2:G${endRow}`, updateData);

      // 5. Update state
      setDocuments(
        filtered.map((row) => ({
          id: row[0] || "",
          title: row[1] || "",
          type: row[2] || "",
          content: row[3] || "",
          date: row[4] || "",
          size: row[5] || "",
          downloads: parseInt(row[6]) || 0,
        }))
      );

      if (selectedDoc && selectedDoc.id === docId) {
        setIsModalOpen(false);
        setSelectedDoc(null);
      }

      toast.success("Dokumen berhasil dihapus dari Google Sheets!");
    } catch (error) {
      console.error(error);
      toast.error("Gagal menghapus dokumen dari Google Sheets.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyContent = (content: string) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setIsCopying(true);
    toast.success("Konten berhasil disalin!");
    setTimeout(() => setIsCopying(false), 2000);
  };

  const handlePrintDoc = () => {
    if (!selectedDoc) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Gagal membuka jendela cetak. Pastikan popup blocker dinonaktifkan.");
      return;
    }
    const htmlContent = `
      <html>
        <head>
          <title>${selectedDoc.title}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { font-size: 12px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body class="p-8 bg-white text-gray-900 font-sans">
          <div class="max-w-3xl mx-auto border p-8 rounded-lg">
            <div class="mb-6 border-b pb-4">
              <h1 class="text-xl font-bold uppercase tracking-wide">KURIKULA - ${selectedDoc.type.toUpperCase()}</h1>
              <p class="text-xs text-gray-500">Judul: ${selectedDoc.title}</p>
              <p class="text-xs text-gray-500">Tanggal Buat: ${selectedDoc.date} | Ukuran: ${selectedDoc.size}</p>
            </div>
            <div class="space-y-4">
              ${document.getElementById("doc-preview-content")?.innerHTML || ""}
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

  const handlePrintAll = () => {
    if (filteredDocs.length === 0) {
      toast.error("Tidak ada dokumen yang dicetak.");
      return;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Gagal membuka jendela cetak.");
      return;
    }

    const docsHTML = filteredDocs.map((doc) => `
      <div class="border p-8 rounded-lg bg-white shadow-sm mb-8" style="page-break-after: always;">
        <div class="mb-6 border-b pb-4">
          <h1 class="text-xl font-bold uppercase tracking-wide">KURIKULA - ${doc.type.toUpperCase()}</h1>
          <p class="text-xs text-gray-500">Judul: ${doc.title}</p>
          <p class="text-xs text-gray-500">Tanggal: ${doc.date} | Ukuran: ${doc.size}</p>
        </div>
        <div class="space-y-4 text-sm leading-relaxed">
          ${doc.content ? doc.content.replace(/\n/g, "<br/>") : "<i>Tidak ada konten</i>"}
        </div>
      </div>
    `).join("");

    const htmlContent = `
      <html>
        <head>
          <title>Cetak Semua Dokumen</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="p-8 bg-gray-50 text-gray-900 font-sans">
          <div class="max-w-3xl mx-auto">
            <h2 class="text-center font-bold text-lg mb-6 uppercase tracking-wider text-gray-600 no-print">Bundel Dokumen Administrasi Kurikula</h2>
            ${docsHTML}
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

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || doc.type === selectedType;
    return matchesSearch && matchesType;
  });

  const openDocDetails = (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setIsModalOpen(true);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
        
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="p-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-[12px] text-gray-700 transition-all font-medium flex items-center justify-center cursor-pointer"
            title="Refresh Data"
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          
          <button
            onClick={handlePrintAll}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm text-sm"
          >
            <Printer className="w-5 h-5" />
            Cetak Hasil Filter
          </button>
        </div>
      </div>

      {/* Demo Warning Banner */}
      {isDemo && !loading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-[12px] p-4 flex items-start gap-3 text-amber-800 text-sm shadow-sm"
        >
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Mode Demo Aktif:</span> Google Drive Anda belum terhubung. Menampilkan dokumen contoh bawaan. Silakan hubungkan Google Drive di halaman <span className="font-semibold text-blue-700">Dashboard</span> untuk mengaktifkan sinkronisasi otomatis library Anda secara cloud!
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-[12px] p-4 border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari dokumen dari library Anda..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium cursor-pointer"
            >
              <option value="all">Semua Tipe</option>
              <option value="RPP">RPP</option>
              <option value="Modul">Modul Ajar</option>
              <option value="Report">Bahan Ajar</option>
              <option value="Silabus">Silabus</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-[12px] p-4 border border-blue-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-6 h-6 text-blue-600" />
            <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider">RPP</div>
          </div>
          <div className="text-3xl font-extrabold text-blue-900">
            {documents.filter((d) => d.type === "RPP").length}
          </div>
        </div>
        <div className="bg-purple-50 rounded-[12px] p-4 border border-purple-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-6 h-6 text-purple-600" />
            <div className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Modul Ajar</div>
          </div>
          <div className="text-3xl font-extrabold text-purple-900">
            {documents.filter((d) => d.type === "Modul").length}
          </div>
        </div>
        <div className="bg-emerald-50 rounded-[12px] p-4 border border-emerald-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-6 h-6 text-emerald-600" />
            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Bahan Ajar</div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-900">
            {documents.filter((d) => d.type === "Report").length}
          </div>
        </div>
        <div className="bg-orange-50 rounded-[12px] p-4 border border-orange-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <FolderOpen className="w-6 h-6 text-orange-600" />
            <div className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Total Library</div>
          </div>
          <div className="text-3xl font-extrabold text-orange-900">{documents.length}</div>
        </div>
      </div>

      {/* Loading Spinner */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Memuat data library dokumen...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Document Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocs.map((doc, index) => {
              const colors = typeColors[doc.type as keyof typeof typeColors] || typeColors.Report;
              
              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.04, 0.4) }}
                  onClick={() => openDocDetails(doc)}
                  className="bg-white rounded-[12px] p-5 border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 ${colors.bg} rounded-[12px] flex items-center justify-center border ${colors.border}`}>
                        <FileText className={`w-6 h-6 ${colors.text}`} />
                      </div>
                      
                      <div className="flex gap-2 items-center">
                        <span className={`px-2.5 py-1 ${colors.bg} ${colors.text} rounded-full text-xs font-bold border ${colors.border} tracking-wide uppercase`}>
                          {doc.type === "Report" ? "Bahan Ajar" : doc.type === "Silabus" ? "Silabus/PPT" : doc.type}
                        </span>
                        
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(doc.id); }}
                          disabled={deletingId === doc.id}
                          className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-[8px] transition-colors hover:scale-105 cursor-pointer disabled:opacity-50"
                          title="Hapus Dokumen"
                        >
                          {deletingId === doc.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 text-md leading-snug group-hover:text-blue-600 transition-colors">
                      {doc.title}
                    </h3>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3 font-medium">
                      <span>{doc.date}</span>
                      <span>•</span>
                      <span>{doc.size}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-400 font-medium">
                      <span>{doc.downloads} unduhan</span>
                      <span className="text-blue-600 font-semibold flex items-center gap-1 group-hover:underline">
                        Buka Dokumen
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filteredDocs.length === 0 && (
            <div className="bg-white rounded-[12px] p-16 border border-gray-200 text-center shadow-sm max-w-xl mx-auto">
              <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Library Anda Kosong</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                {searchQuery || selectedType !== "all" 
                  ? "Tidak ada dokumen yang cocok dengan filter pencarian Anda." 
                  : "Belum ada dokumen yang disimpan. Silakan buat Modul Ajar atau Bahan Ajar Premium di halaman AI lalu klik 'Simpan ke Library'."}
              </p>
            </div>
          )}
        </>
      )}

      {/* Document Details Modal */}
      <AnimatePresence>
        {isModalOpen && selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[16px] w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200"
            >
              {/* Modal Topbar */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${typeColors[selectedDoc.type as keyof typeof typeColors]?.bg || "bg-gray-100"} rounded-[10px] flex items-center justify-center border ${typeColors[selectedDoc.type as keyof typeof typeColors]?.border || "border-gray-200"}`}>
                    <FileText className={`w-5 h-5 ${typeColors[selectedDoc.type as keyof typeof typeColors]?.text || "text-gray-600"}`} />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 text-md leading-tight max-w-xl line-clamp-1">
                      {selectedDoc.title}
                    </h2>
                    <p className="text-xs text-gray-500 font-medium">
                      Tipe: {selectedDoc.type} | Dibuat: {selectedDoc.date} | Ukuran: {selectedDoc.size}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyContent(selectedDoc.content)}
                    className="p-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-[10px] transition-all flex items-center justify-center cursor-pointer"
                    title="Salin Konten"
                  >
                    {isCopying ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={handlePrintDoc}
                    className="p-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-[10px] transition-all flex items-center justify-center cursor-pointer"
                    title="Cetak Dokumen"
                  >
                    <Printer className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => setConfirmDeleteId(selectedDoc.id)}
                    disabled={deletingId === selectedDoc.id}
                    className="p-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-[10px] transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
                    title="Hapus Dokumen"
                  >
                    {deletingId === selectedDoc.id ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setSelectedDoc(null);
                    }}
                    className="p-2 hover:bg-gray-200 rounded-[10px] text-gray-500 hover:text-gray-700 transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body / Markdown content */}
              <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
                <div 
                  id="doc-preview-content" 
                  className="bg-white border border-gray-200 rounded-[12px] p-8 shadow-sm max-w-3xl mx-auto space-y-4 min-h-[50vh]"
                >
                  {selectedDoc.content ? (
                    renderSimpleMarkdown(selectedDoc.content)
                  ) : (
                    <div className="text-center py-20 text-gray-400 italic">
                      Dokumen ini tidak memiliki isi teks.
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedDoc(null);
                  }}
                  className="px-5 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-[10px] text-sm transition-all cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  onClick={handlePrintDoc}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-[10px] text-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Cetak / PDF
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        title="Hapus Dokumen"
        message="Apakah Anda yakin ingin menghapus dokumen ini secara permanen?"
        onConfirm={() => {
          if (confirmDeleteId) {
            handleDeleteDoc(confirmDeleteId);
            setConfirmDeleteId(null);
          }
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}

