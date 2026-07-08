import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageCircle,
  Send,
  Sparkles,
  RefreshCw,
  HelpCircle,
  Plus,
  Trash2,
  Menu,
  ChevronRight,
  User,
  Info,
} from "lucide-react";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { supabase } from "../../../utils/supabase/client";
import { generateAIContent } from "../../lib/aiClient";

// Markdown helper functions
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

    if (line.trim().startsWith("|")) {
      const nextLine = lines[i + 1];
      if (nextLine && nextLine.trim().startsWith("|") && (nextLine.includes("---") || nextLine.includes(":-"))) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith("|")) {
          tableLines.push(lines[i]);
          i++;
        }
        elements.push(parseMarkdownTable(tableLines, elements.length));
        continue;
      }
    }

    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-sm font-bold text-gray-900 mt-2 mb-1">{line.replace("### ", "")}</h3>);
    } else if (line.startsWith("#### ")) {
      elements.push(<h4 key={i} className="text-xs font-semibold text-gray-900 mt-1.5 mb-1">{line.replace("#### ", "")}</h4>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-md font-bold text-gray-950 mt-3 mb-2 border-b pb-1">{line.replace("## ", "")}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-lg font-extrabold text-gray-950 mt-4 mb-2 border-b pb-1">{line.replace("# ", "")}</h1>);
    } else if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const content = line.trim().replace(/^[\-\*]\s+/, "");
      elements.push(
        <ul key={i} className="list-disc list-inside ml-2 my-0.5 text-gray-700 text-sm">
          <li>{parseInlineMarkdown(content)}</li>
        </ul>
      );
    } else if (/^\d+\.\s+/.test(line.trim())) {
      const content = line.trim().replace(/^\d+\.\s+/, "");
      elements.push(
        <ol key={i} className="list-decimal list-inside ml-2 my-0.5 text-gray-700 text-sm">
          <li>{parseInlineMarkdown(content)}</li>
        </ol>
      );
    } else if (line.trim() === "---") {
      elements.push(<hr key={i} className="my-2 border-gray-200" />);
    } else if (!line.trim()) {
      elements.push(<div key={i} className="h-1.5" />);
    } else {
      elements.push(<p key={i} className="text-sm text-gray-700 my-0.5 leading-relaxed">{parseInlineMarkdown(line)}</p>);
    }

    i++;
  }

  return elements;
}

function parseMarkdownTable(tableLines: string[], keyIndex: number) {
  const contentLines = tableLines.filter(line => !line.includes("---") && !line.includes(":-"));
  if (contentLines.length === 0) return null;

  const headers = contentLines[0]
    .split("|")
    .map(cell => cell.trim())
    .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

  const rows = contentLines.slice(1).map(line => {
    return line
      .split("|")
      .map(cell => cell.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
  });

  return (
    <div key={`table-${keyIndex}`} className="overflow-x-auto my-2 rounded-[8px] border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 border-collapse border-slate-200">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((h, idx) => (
              <th key={idx} className="px-2 py-1 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-gray-250">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-250">
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-2 py-1 text-xs text-gray-900 whitespace-pre-wrap border-r border-gray-250">
                  {parseInlineMarkdown(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const quickActionMenus = [
  { label: "Review Rencana Belajar", prompt: "Tolong berikan tinjauan atas modul ajar saya untuk besok dan berikan 3 area saran perbaikan." },
  { label: "Ide Ice Breaker Seru", prompt: "Tuliskan 3 alternatif ice breaker berdurasi 5 menit yang relevan untuk topik pembelajaran sains/matematika." },
  { label: "Buat Pertanyaan Pemantik", prompt: "Berikan 3 pertanyaan pemantik pemantik diskusi kritis untuk materi kolaborasi kelompok di kelas." },
  { label: "Atasi Siswa Mengantuk", prompt: "Ada beberapa siswa di kelas saya yang sering mengantuk saat pelajaran siang. Apa solusi cepat yang bisa saya terapkan?" },
  { label: "Diferensiasi Sederhana", prompt: "Bagaimana cara mendesain diferensiasi produk untuk materi menulis laporan bagi siswa lambat belajar?" },
  { label: "Draf WhatsApp Orang Tua", prompt: "Tuliskan draf pesan WhatsApp hangat untuk mengabarkan bahwa putra/putri mereka berhasil memimpin diskusi hari ini." },
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
  updated_at: string;
}

export default function AIChatPage() {
  const { subscriptionTier, credits, activeWorkspaceId, refresh, aiModels } = useWorkspace();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // UI states
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>(
    localStorage.getItem("kurikula_selected_ai_model") || "gemini-flash"
  );

  const isLocked = subscriptionTier === "inactive";

  // Chat states
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  // Load conversations
  useEffect(() => {
    if (!profile?.id) return;

    const syncConversations = async () => {
      setLoadingHistory(true);
      try {
        const { data: convs, error } = await supabase
          .from("ai_conversations")
          .select("*")
          .eq("user_id", profile.id)
          .order("updated_at", { ascending: false });

        if (error) throw error;
        setConversations(convs || []);

        // Default: select the most recent one or create one
        if (convs && convs.length > 0) {
          handleSelectConversation(convs[0].id);
        } else {
          await handleNewChat(true);
        }
      } catch (err) {
        console.error("Gagal sinkronisasi chat history:", err);
        toast.error("Gagal memuat riwayat obrolan.");
      } finally {
        setLoadingHistory(false);
      }
    };

    syncConversations();
  }, [profile?.id]);

  // Create new conversation
  const handleNewChat = async (isInitial = false) => {
    if (!profile?.id) return;
    try {
      const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      const title = `Percakapan Baru - ${timeStr}`;

      const { data: newConv, error } = await supabase
        .from("ai_conversations")
        .insert({
          user_id: profile.id,
          title: title,
          context_type: "general"
        })
        .select()
        .single();

      if (error) throw error;

      setConversations(prev => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setMessages([
        {
          id: "greeting",
          role: "assistant",
          content: `Hai ${profile.name || ""}! Saya adalah Asisten Kurikula. Hal apa yang ingin anda diskusikan hari ini ?.`
        }
      ]);

      if (!isInitial) {
        toast.success("Percakapan baru dimulai");
      }
    } catch (err) {
      console.error("Gagal membuat chat baru:", err);
      toast.error("Gagal membuat percakapan baru.");
    }
  };

  // Select conversation
  const handleSelectConversation = async (convId: string) => {
    setActiveConversationId(convId);
    setLoadingHistory(true);
    try {
      const { data: msgs, error } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (msgs && msgs.length > 0) {
        setMessages(msgs.map(m => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          created_at: m.created_at
        })));
      } else {
        setMessages([
          {
            id: "greeting",
            role: "assistant",
            content: `Hai ${profile?.name || ""}! Silakan ajukan pertanyaan Anda.`
          }
        ]);
      }
    } catch (err) {
      console.error("Gagal memuat pesan:", err);
      toast.error("Gagal memuat pesan.");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("ai_conversations")
        .delete()
        .eq("id", convId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== convId));

      if (activeConversationId === convId) {
        const remaining = conversations.filter(c => c.id !== convId);
        if (remaining.length > 0) {
          handleSelectConversation(remaining[0].id);
        } else {
          await handleNewChat(true);
        }
      }
      toast.success("Percakapan berhasil dihapus");
    } catch (err) {
      console.error("Gagal menghapus percakapan:", err);
      toast.error("Gagal menghapus percakapan.");
    }
  };

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Send message
  const handleSend = async (customPrompt?: string) => {
    if (isLocked) return;
    const messageText = (customPrompt || input).trim();
    if (!messageText || isTyping || !activeConversationId) return;

    const activeModel = aiModels.find(m => m.id === selectedModel);
    const cost = activeModel ? Number(activeModel.multiplier) : (selectedModel === "gemini-pro" ? 2 : 1);
    if ((credits?.balance ?? 0) < cost) {
      toast.error("AI Credit tidak cukup. Silakan top up atau upgrade paket.");
      return;
    }

    if (!customPrompt) {
      setInput("");
    }

    const userMessageId = Date.now().toString();
    const userMessage: Message = {
      id: userMessageId,
      role: "user",
      content: messageText
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      await supabase.from("ai_messages").insert({
        conversation_id: activeConversationId,
        role: "user",
        content: messageText
      });

      await supabase
        .from("ai_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", activeConversationId);

      // Get Teacher Memory
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

      const content = await generateAIContent({
        workspaceId: activeWorkspaceId,
        type: "chat",
        model: selectedModel,
        params: {
          contents: formattedHistory,
          context: {
            teacherProfile: profile ? `${profile.name || ""} - Guru ${profile.schoolLevel || ""}` : null,
            activeClass: localStorage.getItem("daftar_kelas")?.split(",")?.[0]?.trim() || null,
            activeSubject: localStorage.getItem("mata_pelajaran")?.split(",")?.[0]?.trim() || null,
            lastDocument: "Halaman Tanya Guru AI",
            lastSemesterPlan: localStorage.getItem("rencana_semester_data") ? "Rencana semester telah dikonfigurasi" : null,
            lastModule: null,
            teacherMemory: teacherMemoryContext
          }
        }
      });

      await supabase.from("ai_messages").insert({
        conversation_id: activeConversationId,
        role: "assistant",
        content
      });

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content
        }
      ]);

      if (refresh) {
        await refresh();
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
    <div className="flex flex-1 h-full overflow-hidden bg-white relative">
      {/* Sidebar Panel for Conversation History */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="hidden md:flex flex-col border-r border-slate-200 bg-[#F8FAFC] flex-shrink-0 h-full overflow-hidden"
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-slate-200 space-y-3 bg-white/70">
              <button
                onClick={() => handleNewChat()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#3C405B] to-[#DF7A5E] hover:opacity-95 text-white rounded-[14px] text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Obrolan Baru
              </button>

              {/* Model AI Select dropdown */}
              {!isLocked && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400">Model Asisten AI</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => {
                      const newModel = e.target.value;
                      setSelectedModel(newModel);
                      localStorage.setItem("kurikula_selected_ai_model", newModel);
                    }}
                    className="text-xs px-2.5 py-2 bg-white border border-slate-200 rounded-[10px] focus:outline-none text-slate-700 font-bold cursor-pointer shadow-sm"
                  >
                    {aiModels && aiModels.length > 0 ? (
                      aiModels.map((m) => {
                        const cleanTier = (subscriptionTier || "inactive").toLowerCase();
                        const isAllowed = m.tier_restriction.map((t: string) => t.toLowerCase()).includes(cleanTier);
                        return (
                          <option key={m.id} value={m.id} disabled={!isAllowed}>
                            {m.name} ({m.multiplier} Credit) {!isAllowed ? "🔒" : ""}
                          </option>
                        );
                      })
                    ) : (
                      <>
                        <option value="gemini-flash">Gemini 2.5 Flash (1 Credit)</option>
                        <option value="gemini-pro" disabled={subscriptionTier === "basic"}>
                          Gemini 2.5 Pro (2 Credit) {subscriptionTier === "basic" ? "🔒" : ""}
                        </option>
                      </>
                    )}
                  </select>
                </div>
              )}
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
              <h4 className="text-xs font-black text-slate-450 uppercase tracking-widest px-1 mb-2">Riwayat Percakapan</h4>
              {loadingHistory && conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                  Memuat riwayat...
                </div>
              ) : conversations.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-12">Belum ada riwayat.</p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`group px-3 border transition-all cursor-pointer flex items-center justify-between gap-3 ${activeConversationId === conv.id
                        ? "bg-slate-100 border-slate-200/80 shadow-sm py-2.5 my-1.5 rounded-[12px]"
                        : "bg-transparent border-transparent hover:bg-slate-150/40 py-1 my-0 rounded-[8px]"
                      }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{conv.title}</p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      className="p-1 text-slate-405 hover:text-red-650 hover:bg-red-50 rounded-[8px] transition-colors cursor-pointer shrink-0 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full bg-[#F8FAFC]">
        {/* Chat Header */}
        <header className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-[10px] text-slate-650 transition-colors hidden md:block cursor-pointer"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile history trigger */}
            <div className="flex md:hidden gap-1.5">
              <select
                value={activeConversationId || ""}
                onChange={(e) => handleSelectConversation(e.target.value)}
                className="text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-[8px] max-w-[150px] font-bold text-slate-700"
              >
                {conversations.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <button
                onClick={() => handleNewChat()}
                className="p-2 bg-gradient-to-r from-[#3C405B] to-[#DF7A5E] text-white rounded-[8px]"
                title="Chat Baru"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-[#3C405B] to-[#DF7A5E] rounded-full flex items-center justify-center shadow-md">
                <Sparkles className="w-4.5 h-4.5 text-white animate-pulse" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-800 text-sm">Kurikula Chat</h2>
                <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                  <span>Aktif: {aiModels.find(m => m.id === selectedModel)?.name || "Gemini Flash"}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Credit balance display */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Saldo AI Credit</span>
              <span className="text-xs font-bold text-[#DF7A5E]">{(credits?.balance ?? 0).toLocaleString("id-ID")} Credit</span>
            </div>
            {isLocked && (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-black rounded-full uppercase tracking-tight">TERKUNCI</span>
            )}
          </div>
        </header>

        {/* Message body container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 relative flex justify-center">
          <div className="w-full max-w-3xl space-y-6">
            {isLocked && (
              <div className="p-8 bg-white border border-red-200 rounded-[24px] shadow-sm text-center max-w-md mx-auto mt-12 space-y-4">
                <div className="w-14 h-14 bg-red-50 border border-red-100 rounded-[16px] flex items-center justify-center mx-auto text-xl">
                  🔒
                </div>
                <h4 className="text-md font-bold text-slate-900">AI Chat Terkunci</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Fitur asisten tanya guru AI memerlukan paket langganan aktif. Silakan pilih paket di halaman billing.
                </p>
                <button
                  onClick={() => navigate("/billing")}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs font-bold rounded-[12px] shadow-md transition-all cursor-pointer"
                >
                  Upgrade Sekarang
                </button>
              </div>
            )}

            {/* Greeting when conversation has only one message or is loading */}
            {!isLocked && messages.length === 0 && (
              <div className="text-center py-12 text-slate-450 text-xs italic">
                Mulai percakapan dengan mengajukan pertanyaan di bawah ini.
              </div>
            )}

            {!isLocked && messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3C405B] to-[#DF7A5E] flex items-center justify-center text-white text-xs font-bold shadow flex-shrink-0">
                      AI
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-4 rounded-[20px] text-sm leading-relaxed shadow-sm ${isUser
                        ? "bg-[#3C405B] text-white rounded-tr-none font-medium"
                        : "bg-white text-slate-800 border border-slate-105 rounded-tl-none prose prose-slate max-w-[80%]"
                      }`}
                  >
                    {isUser ? message.content : renderSimpleMarkdown(message.content)}
                  </div>
                  {isUser && (
                    <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-750 text-xs font-bold shadow flex-shrink-0">
                      {profile?.name ? profile?.name.slice(0, 2).toUpperCase() : <User className="w-4 h-4" />}
                    </div>
                  )}
                </div>
              );
            })}

            {isTyping && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3C405B] to-[#DF7A5E] flex items-center justify-center text-white text-xs font-bold shadow flex-shrink-0 animate-pulse">
                  AI
                </div>
                <div className="bg-white border border-slate-100 text-slate-500 p-4 rounded-[20px] rounded-tl-none flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick action buttons & input layout */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col items-center flex-shrink-0">
          <div className="w-full max-w-3xl space-y-3">
            {/* Quick Actions (only if empty or prompt screen) */}
            {messages.length <= 1 && (
              <div className="hidden sm:block">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {quickActionMenus.map((menu) => (
                    <button
                      key={menu.prompt}
                      disabled={isLocked || isTyping || loadingHistory}
                      onClick={() => handleSend(menu.prompt)}
                      className="p-4 bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/10 rounded-[16px] text-sm text-slate-700 hover:text-indigo-700 font-medium transition-all text-left disabled:opacity-50 cursor-pointer shadow-sm hover:shadow-md flex items-start gap-2.5"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                      <span className="leading-relaxed">{menu.prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input bar */}
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                disabled={isLocked || isTyping || loadingHistory}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder={isLocked ? "Fitur terkunci. Silakan berlangganan..." : isTyping ? "Sedang memikirkan solusi..." : "Tuliskan pertanyaan seputar rancangan belajar, diferensiasi, atau manajemen kelas..."}
                className="flex-1 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-[16px] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-semibold shadow-inner"
              />
              <button
                onClick={() => handleSend()}
                disabled={isLocked || isTyping || loadingHistory}
                className="px-5 bg-[#3C405B] hover:bg-[#3C405B]/90 text-white rounded-[16px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-400 text-center">
              <Info className="w-3 h-3 text-indigo-500" />
              <span>Setiap respon menggunakan AI credit sesuai tarif model yang aktif.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
