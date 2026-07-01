import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle, X, Send, Sparkles, BookOpen, ChevronRight, RefreshCw, HelpCircle } from "lucide-react";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useAuth } from "../../contexts/AuthContext";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { supabase } from "../../../utils/supabase/client";

// Menu cepat sesuai BAGIAN 3 LANJUTAN.md
const quickActionMenus = [
  { label: "Review Modul Saya", prompt: "Tolong review rancangan modul ajar yang sedang saya buka dan berikan saran peningkatan kualitasnya." },
  { label: "Cari Ide Aktivitas", prompt: "Berikan ide aktivitas pembelajaran aktif (seperti game/ice breaker) yang cocok untuk topik bahasan ini." },
  { label: "Cari Pertanyaan Pemantik", prompt: "Tuliskan 3 pertanyaan pemantik yang menarik dan kontekstual untuk memulai pembelajaran topik ini." },
  { label: "Atasi Masalah Kelas", prompt: "Siswa di kelas saya cenderung pasif dan kurang termotivasi belajar hari ini. Bagaimana solusi taktis menghidupkan kelas?" },
  { label: "Bantu Diferensiasi", prompt: "Bagaimana cara menyusun strategi diferensiasi (konten, proses, produk) untuk siswa berkemampuan rendah dan tinggi?" },
  { label: "Bantu Remedial", prompt: "Tolong buatkan draf aktivitas remedial ringkas untuk siswa yang belum tuntas di indikator ini." },
  { label: "Bantu Pengayaan", prompt: "Rancang sebuah proyek mandiri/tugas HOTS yang menantang sebagai pengayaan bagi siswa cepat." },
  { label: "Bantu Komunikasi Orang Tua", prompt: "Buat draf pesan WhatsApp hangat untuk mengabarkan hasil belajar siswa kepada orang tuanya." }
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

interface Conversation {
  id: string;
  title: string;
  context_type: string;
  context_id?: string;
  updated_at: string;
}

export function AIChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { subscriptionTier, credits, activeWorkspaceId, refresh } = useWorkspace();
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close panel on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        isOpen &&
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        (!buttonRef.current || !buttonRef.current.contains(event.target as Node))
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);


  const [selectedModel, setSelectedModel] = useState<"gemini-flash" | "gemini-pro">(
    (localStorage.getItem("kurikula_selected_ai_model") as any) || "gemini-flash"
  );

  const isLocked = subscriptionTier === "inactive";

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Deteksi context_type berdasarkan route saat ini
  const getContextInfo = () => {
    const path = location.pathname;
    if (path.includes("semester-planner")) {
      return { type: "semester_plan", title: "Semester Planner" };
    } else if (path.includes("ai-planner")) {
      return { type: "lesson_plan", title: "Modul Ajar" };
    } else if (path.includes("ai-materials")) {
      return { type: "worksheet", title: "Bahan Ajar & LKPD" };
    } else if (path.includes("assessment")) {
      // Cek apakah user sedang membuka analisis nilai (bisa dicek dari URL/hash atau localstorage jika diperlukan)
      // Default ke assessment
      return { type: "assessment", title: "Penilaian & Rapor" };
    }
    return { type: "general", title: "Asisten Guru Umum" };
  };

  const contextInfo = getContextInfo();

  // Load list of conversations and find/create active one
  useEffect(() => {
    if (!profile?.id || !isOpen) return;

    const syncConversation = async () => {
      setLoadingHistory(true);
      try {
        // Fetch all conversations for user
        const { data: convs, error } = await supabase
          .from("ai_conversations")
          .select("*")
          .eq("user_id", profile.id)
          .order("updated_at", { ascending: false });

        if (error) throw error;
        setConversations(convs || []);

        // Cari percakapan aktif yang sesuai context_type saat ini
        let activeConv = convs?.find(c => c.context_type === contextInfo.type);

        if (!activeConv) {
          // Jika belum ada, buat percakapan baru di database
          const { data: newConv, error: createErr } = await supabase
            .from("ai_conversations")
            .insert({
              user_id: profile.id,
              title: `Asisten: ${contextInfo.title}`,
              context_type: contextInfo.type
            })
            .select()
            .single();

          if (createErr) throw createErr;
          activeConv = newConv;
          setConversations(prev => [newConv, ...prev]);
        }

        setActiveConversationId(activeConv.id);
        
        // Fetch messages for active conversation
        const { data: msgs, error: msgsErr } = await supabase
          .from("ai_messages")
          .select("*")
          .eq("conversation_id", activeConv.id)
          .order("created_at", { ascending: true });

        if (msgsErr) throw msgsErr;
        
        if (msgs && msgs.length > 0) {
          setMessages(msgs.map(m => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            created_at: m.created_at
          })));
        } else {
          // Default greeting
          setMessages([
            {
              id: "greeting",
              role: "assistant",
              content: `Halo Guru ${profile.name || ""}! Saya adalah Asisten Guru khusus untuk halaman **${contextInfo.title}**. Saya siap membantu Anda merancang aktivitas, diferensiasi, mereview konten, maupun mengatasi masalah belajar di kelas ini.`
            }
          ]);
        }
      } catch (err) {
        console.error("Gagal sinkronisasi chat history:", err);
        toast.error("Gagal memuat riwayat obrolan.");
      } finally {
        setLoadingHistory(false);
      }
    };

    syncConversation();
  }, [profile?.id, contextInfo.type, isOpen]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isOpen]);

  const handleSend = async (customPrompt?: string) => {
    if (isLocked) return;
    const messageText = (customPrompt || input).trim();
    if (!messageText || isTyping || !activeConversationId) return;

    const cost = selectedModel === "gemini-pro" ? 2 : 1;
    if ((credits?.balance ?? 0) < cost) {
      toast.error("AI Credit tidak cukup. Silakan top up atau upgrade paket.");
      return;
    }

    if (!customPrompt) {
      setInput("");
    }

    // 1. Simpan pesan user ke local state
    const userMessageId = Date.now().toString();
    const userMessage: Message = {
      id: userMessageId,
      role: "user",
      content: messageText
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // 2. Simpan pesan user ke database
      await supabase.from("ai_messages").insert({
        conversation_id: activeConversationId,
        role: "user",
        content: messageText
      });

      // Update timestamp percakapan
      await supabase
        .from("ai_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", activeConversationId);

      // 3. Ambil data Teacher Memory untuk dikirim sebagai konteks ke AI
      let teacherMemoryContext: any = null;
      if (profile?.id) {
        const { data: memData } = await supabase
          .from("teacher_memory")
          .select("*")
          .eq("user_id", profile.id)
          .maybeSingle();
        if (memData) {
          teacherMemoryContext = {
            jenjang: memData.jenjang,
            mapel: memData.mapel,
            style: memData.teaching_style,
            preferredModels: memData.preferred_models,
            characterFocus: memData.character_focus
          };
        }
      }

      // Map local message history ke API format
      const formattedHistory = messages
        .filter(m => m.id !== "greeting")
        .map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        }));

      formattedHistory.push({
        role: "user",
        parts: [{ text: messageText }],
      });

      const { data: sessionData } = await supabase.auth.getSession();
      const tokenUser = sessionData?.session?.access_token;

      // 4. Hubungi server endpoint generate-ai
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
            type: "chat",
            model: selectedModel,
            params: {
              contents: formattedHistory,
              context: {
                teacherProfile: profile ? `${profile.name || ""} - Guru ${profile.schoolLevel || ""}` : null,
                activeClass: localStorage.getItem("daftar_kelas")?.split(",")?.[0]?.trim() || null,
                activeSubject: localStorage.getItem("mata_pelajaran")?.split(",")?.[0]?.trim() || null,
                lastDocument: contextInfo.title,
                lastSemesterPlan: localStorage.getItem("rencana_semester_data") ? "Rencana semester telah dikonfigurasi" : null,
                lastModule: null,
                teacherMemory: teacherMemoryContext
              }
            }
          })
        }
      );

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal mendapatkan respons AI.");
      }

      const res = await response.json();
      if (res.content) {
        // 5. Simpan pesan asisten ke database
        await supabase.from("ai_messages").insert({
          conversation_id: activeConversationId,
          role: "assistant",
          content: res.content
        });

        // Simpan ke local state
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: res.content
          }
        ]);

        if (refresh) {
          await refresh();
        }
      } else {
        throw new Error("Respons kosong dari server.");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Gagal menghubungi AI Assistant.");
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Maaf, koneksi saya sedang terganggu. Silakan coba sesaat lagi."
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            ref={buttonRef}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-[#3C405B] to-[#DF7A5E] rounded-full shadow-lg flex items-center justify-center z-50 cursor-pointer"
            onClick={() => setIsOpen(true)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <MessageCircle className="w-6 h-6 text-white" />
            <motion.div
              className="absolute inset-0 rounded-full bg-white/30"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed top-0 right-0 h-screen w-full sm:w-[400px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-[#F0EAC6]/30 to-[#DF7A5E]/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#3C405B] to-[#DF7A5E] rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Asisten Guru AI</h3>
                    <p className="text-xs text-[#DF7A5E] font-extrabold flex items-center gap-1">
                      <span>Saldo: {(credits?.balance ?? 0).toLocaleString("id-ID")} Credit</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-700 bg-white/80 px-1 rounded uppercase">{contextInfo.type.replace("_", " ")}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/50 rounded-[12px] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Model Dropdown Selector */}
              {!isLocked && (
                <div className="mt-3 flex items-center justify-between bg-white/70 p-2 rounded-[12px] border border-gray-100 shadow-sm">
                  <span className="text-xs text-gray-600 font-extrabold uppercase">Model AI:</span>
                  <select
                    value={selectedModel}
                    onChange={(e) => {
                      const newModel = e.target.value as any;
                      setSelectedModel(newModel);
                      localStorage.setItem("kurikula_selected_ai_model", newModel);
                    }}
                    className="text-xs px-2 py-1 bg-white border border-gray-200 rounded-[8px] focus:outline-none text-gray-700 font-bold cursor-pointer"
                  >
                    <option value="gemini-flash">Gemini Flash (1 Credit)</option>
                    <option value="gemini-pro">Gemini Pro (2 Credit)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 relative bg-[#F8FAFC]">
              {isLocked && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-10">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-50 to-red-100 rounded-[16px] flex items-center justify-center mb-4 border border-red-200 shadow-sm animate-bounce">
                    <span className="text-xl">🔒</span>
                  </div>
                  <h4 className="text-md font-bold text-gray-950 mb-1">AI Chat Terkunci</h4>
                  <p className="text-xs text-gray-500 max-w-xs mb-4 leading-relaxed">
                    Fitur Chat Assistant memerlukan paket aktif. Silakan aktifkan paket Anda di menu Billing.
                  </p>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate("/billing");
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs font-semibold rounded-[12px] shadow-sm transition-colors cursor-pointer"
                  >
                    Upgrade Sekarang
                  </button>
                </div>
              )}

              {loadingHistory ? (
                <div className="flex items-center justify-center h-full text-gray-500 text-xs gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                  Memuat riwayat percakapan...
                </div>
              ) : (
                messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-[16px] text-xs leading-relaxed shadow-sm ${
                        message.role === "user"
                          ? "bg-[#3C405B] text-white rounded-br-none"
                          : "bg-white text-gray-900 border border-gray-100 rounded-bl-none prose prose-slate"
                      }`}
                    >
                      {message.content}
                    </div>
                  </motion.div>
                ))
              )}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 text-gray-500 p-3 rounded-[16px] rounded-bl-none flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions Menu - Accordion/Slide-up */}
            <div className="px-4 py-2 border-t border-gray-200 bg-white max-h-36 overflow-y-auto">
              <p className="text-xs text-gray-400 font-bold uppercase mb-1.5 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                Menu Cepat Asisten:
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {quickActionMenus.map((menu) => (
                  <button
                    key={menu.label}
                    disabled={isLocked || isTyping || loadingHistory}
                    onClick={() => handleSend(menu.prompt)}
                    className="px-2.5 py-1.5 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-[10px] text-xs text-gray-700 hover:text-indigo-700 font-bold transition-all text-left truncate disabled:opacity-50 cursor-pointer flex items-center justify-between"
                  >
                    <span>{menu.label}</span>
                    <ChevronRight className="w-3 h-3 opacity-50 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  disabled={isLocked || isTyping || loadingHistory}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  placeholder={isLocked ? "Fitur terkunci..." : isTyping ? "Sedang memikirkan solusi..." : "Tanya asisten guru..."}
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-[12px] text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-medium"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={isLocked || isTyping || loadingHistory}
                  className="p-2 bg-[#3C405B] hover:bg-[#3C405B]/90 text-white rounded-[12px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}