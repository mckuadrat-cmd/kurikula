import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  BookOpen, 
  Calendar, 
  Users, 
  QrCode, 
  ClipboardList, 
  Check, 
  ChevronDown, 
  ArrowRight, 
  Menu, 
  X, 
  MessageSquare,
  ShieldCheck,
  Zap,
  Star,
  Clock
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import logoWithText from "../../assets/kurikula.png";

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);
  const [activeTab, setActiveTab] = useState<"planner" | "materials" | "attendance" | "assessment">("planner");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const features = {
    planner: {
      title: "AI Modul Ajar (RPP)",
      subtitle: "Susun RPP/Modul Ajar Kurikulum Merdeka Secara Instan",
      desc: "Tidak perlu lagi begadang semalaman menyusun modul ajar. AI kami menyesuaikan materi dengan CP (Capaian Pembelajaran), TP (Tujuan Pembelajaran), Profil Pelajar Pancasila, dan metode asesmen yang sesuai secara otomatis dalam 30 detik.",
      points: [
        "Sesuai standar terbaru Kemendikbudristek",
        "Penyesuaian otomatis dengan jenjang sekolah (SD, SMP, SMA)",
        "Bisa diekspor langsung ke format PDF/Word",
        "Dilengkapi saran rubrik penilaian & lembar kerja siswa"
      ],
      color: "from-purple-500 to-indigo-600",
      badge: "AI Powered",
      bgClass: "bg-purple-50 border-purple-100"
    },
    materials: {
      title: "AI Bahan Ajar",
      subtitle: "Rancang Ringkasan Materi & Kuis Interaktif Sekali Klik",
      desc: "Ubah topik apa saja menjadi bahan ajar yang siap pakai. AI akan membuat ringkasan materi yang mudah dipahami siswa, contoh kasus kehidupan nyata, hingga kuis pilihan ganda lengkap dengan kunci jawaban.",
      points: [
        "Pembuatan slide materi & narasi penjelasan",
        "Diferensiasi materi otomatis untuk siswa lambat & cepat belajar",
        "Bank soal kuis interaktif dengan pembahasan lengkap",
        "Mendukung berbagai mata pelajaran dan topik tematik"
      ],
      color: "from-[#DF7A5E] to-red-600",
      badge: "Hemat Waktu",
      bgClass: "bg-orange-50 border-orange-100"
    },
    attendance: {
      title: "Absensi QR Praktis",
      subtitle: "Ucapkan Selamat Tinggal pada Absensi Manual",
      desc: "Siswa cukup memindai kode QR yang ditampilkan di kelas menggunakan handphone mereka, atau guru melakukan scan kartu QR siswa. Absensi langsung terekap secara real-time di sistem cloud.",
      points: [
        "Anti-titip absen dengan verifikasi lokasi",
        "Laporan kehadiran otomatis harian, minggu, & bulanan",
        "Notifikasi otomatis ke wali murid jika siswa tidak hadir",
        "Bisa berjalan lancar dengan perangkat apa saja"
      ],
      color: "from-emerald-500 to-teal-600",
      badge: "Sistem Pintar",
      bgClass: "bg-emerald-50 border-emerald-100"
    },
    assessment: {
      title: "Penilaian & Rapor",
      subtitle: "Olah Nilai Formatif & Sumatif Tanpa Excel Rumit",
      desc: "Input nilai harian dan ujian Anda, lalu biarkan sistem menghitung rata-rata, merumuskan deskripsi capaian kompetensi secara otomatis, dan mempersiapkannya ke format rapor Kurikulum Merdeka.",
      points: [
        "Auto-generate kalimat deskripsi rapor (Capaian Kompetensi)",
        "Grafik perkembangan belajar siswa yang mudah dipahami",
        "Mendukung penilaian asesmen formatif & sumatif",
        "Ekspor nilai ke Excel yang siap disalin ke e-Rapor"
      ],
      color: "from-[#3C405B] to-slate-800",
      badge: "Akurat & Cepat",
      bgClass: "bg-slate-50 border-slate-100"
    }
  };

  const pricingTiers = [
    {
      name: "Basic",
      priceMonthly: "29.000",
      priceYearly: "290.000",
      tokens: 30,
      features: [
        "30 AI Credit / bulan",
        "Chat / Percakapan AI Umum",
        "Fitur AI Khusus RPP & Bahan Ajar Terkunci 🔒",
        "Model AI Standar (Gemini Flash)",
        "Absensi QR Tanpa Batas",
        "Data Siswa & Kelas",
        "Penilaian Manual Rapor"
      ],
      ctaText: "Mulai Trial 1 Bulan",
      ctaLink: "/signup?plan=basic",
      badge: "Free Trial",
      popular: false,
      color: "border-purple-200 hover:border-purple-400 bg-white"
    },
    {
      name: "Pro",
      priceMonthly: "59.000",
      priceYearly: "590.000",
      tokens: 150,
      features: [
        "150 AI Credit / bulan",
        "Akses Model Gemini PRO",
        "Penilaian: Persiapan AI (Bagian A)",
        "Bisa Top Up Token Tambahan",
        "Akses Penuh AI Planner (RPP)",
        "Absensi QR & Penilaian Rapor",
        "Dukungan Prioritas WA"
      ],
      ctaText: "Mulai Trial 1 Bulan",
      ctaLink: "/signup?plan=pro",
      badge: "Paling Populer",
      popular: true,
      color: "border-[#DF7A5E] hover:border-[#DF7A5E] bg-white ring-2 ring-[#DF7A5E]/20"
    },
    {
      name: "Premium",
      priceMonthly: "99.000",
      priceYearly: "990.000",
      tokens: 500,
      features: [
        "500 AI Credit / bulan",
        "Semester: Diagnostik Kelas",
        "Bahan Ajar: PPT & Tanya Pemantik",
        "Penilaian: Alur Lengkap (Bagian B & C)",
        "Bisa Top Up Token Tambahan",
        "Prioritas Kecepatan AI",
        "Semua Fitur Pro Termasuk",
        "Dedicated Customer Support"
      ],
      ctaText: "Mulai Trial 1 Bulan",
      ctaLink: "/signup?plan=premium",
      badge: "Paling Hemat",
      popular: false,
      color: "border-[#3C405B] hover:border-[#3C405B] bg-white"
    },
    {
      name: "School",
      priceMonthly: "Custom",
      priceYearly: "Custom",
      tokens: "Custom",
      features: [
        "AI Credit Sesuai Kebutuhan",
        "Jumlah Guru Tanpa Batas",
        "Multi-School Admin Dashboard",
        "Custom Integrasi & Training",
        "Sosialisasi Langsung ke Sekolah",
        "Kontrak Kerja Sama Formal"
      ],
      ctaText: "Hubungi Sales (WA)",
      ctaLink: `https://wa.me/62818393931?text=${encodeURIComponent("Halo Admin Kurikula, saya tertarik dengan paket School untuk sekolah saya.")}`,
      badge: "Untuk Sekolah / Yayasan",
      popular: false,
      color: "border-emerald-200 hover:border-emerald-400 bg-emerald-50/10"
    }
  ];

  const faqs = [
    {
      q: "Bagaimana cara kerja Free Trial 1 bulan?",
      a: "Setelah mendaftar, Anda langsung mendapatkan status Free Trial selama 30 hari. Anda bisa mencoba seluruh fitur individu (Basic, Pro, Premium) secara gratis dan mendapatkan AI credit untuk dicoba tanpa biaya sepeser pun."
    },
    {
      q: "Apakah AI Credit itu dan bagaimana cara pemakaiannya?",
      a: "AI Credit digunakan setiap kali Anda meminta bantuan AI untuk menyusun Modul Ajar (RPP) atau merancang Bahan Ajar. 1 kali generate Modul Ajar lengkap rata-rata memakan 1-2 credit saja. Jika credit bulanan habis, Anda bisa melakukan Top Up (khusus paket Pro & Premium)."
    },
    {
      q: "Bagaimana cara pembayaran setelah masa trial berakhir?",
      a: "Anda bisa memilih untuk melanjutkan ke paket Basic, Pro, atau Premium secara berlangganan bulanan atau tahunan. Pembayaran didukung oleh metode transfer bank lokal, e-wallet (GOPAY, OVO, Dana), dan QRIS secara otomatis & instan melalui Midtrans."
    },
    {
      q: "Apakah paket School bisa digunakan untuk satu yayasan dengan beberapa unit sekolah?",
      a: "Sangat bisa. Paket School dilengkapi dengan Multi-School Dashboard yang memungkinkan Admin Yayasan memantau absensi, data guru, dan penggunaan AI di berbagai jenjang sekolah (SD, SMP, SMA) di bawah satu naungan yayasan."
    },
    {
      q: "Apakah Kurikula sudah sesuai dengan panduan Kemendikbudristek?",
      a: "Ya, format Modul Ajar (RPP), Asesmen, dan deskripsi capaian rapor yang dihasilkan oleh sistem Kurikula dirancang mengacu pada panduan Kurikulum Merdeka yang diterbitkan oleh BSKAP Kemendikbudristek."
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const getPriceText = (tier: typeof pricingTiers[0]) => {
    if (tier.priceMonthly === "Custom") return "Custom";
    return billingCycle === "monthly" 
      ? `Rp ${tier.priceMonthly}`
      : `Rp ${tier.priceYearly}`;
  };

  const getPriceSubtext = (tier: typeof pricingTiers[0]) => {
    if (tier.priceMonthly === "Custom") return "Hubungi kami";
    return billingCycle === "monthly" ? "/ bulan" : "/ tahun";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-[#DF7A5E]/20 selection:text-[#DF7A5E] overflow-x-hidden">
      
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoWithText} alt="Kurikula" className="h-9" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-[#3C405B] transition-colors">Fitur</a>
            <a href="#benefits" className="text-sm font-semibold text-slate-600 hover:text-[#3C405B] transition-colors">Manfaat</a>
            <a href="#pricing" className="text-sm font-semibold text-slate-600 hover:text-[#3C405B] transition-colors">Harga Paket</a>
            <a href="#faq" className="text-sm font-semibold text-slate-600 hover:text-[#3C405B] transition-colors">FAQ</a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <Link to="/dashboard" className="px-5 py-2.5 bg-[#3C405B] hover:bg-[#3C405B]/90 text-white rounded-[12px] text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2">
                Ke Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-bold text-[#3C405B] hover:text-[#3C405B]/85 px-4 py-2 transition-colors">
                  Masuk
                </Link>
                <Link to="/signup" className="px-5 py-2.5 bg-[#DF7A5E] hover:bg-[#DF7A5E]/90 text-white rounded-[12px] text-sm font-bold shadow-md hover:shadow-lg transition-all">
                  Coba Gratis 1 Bulan
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.15 }}
              className="absolute top-20 left-0 w-full bg-white border-b border-slate-100 shadow-lg px-6 py-6 flex flex-col gap-4 md:hidden"
            >
              <a 
                href="#features" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-semibold text-slate-700 py-2 border-b border-slate-50"
              >
                Fitur
              </a>
              <a 
                href="#benefits" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-semibold text-slate-700 py-2 border-b border-slate-50"
              >
                Manfaat
              </a>
              <a 
                href="#pricing" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-semibold text-slate-700 py-2 border-b border-slate-50"
              >
                Harga Paket
              </a>
              <a 
                href="#faq" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-semibold text-slate-700 py-2"
              >
                FAQ
              </a>
              <hr className="border-slate-100" />
              {user ? (
                <Link 
                  to="/dashboard" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 bg-[#3C405B] text-white rounded-[12px] text-sm font-bold shadow-md"
                >
                  Ke Dashboard
                </Link>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link 
                    to="/login" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-3 border border-slate-200 text-[#3C405B] rounded-[12px] text-sm font-bold"
                  >
                    Masuk
                  </Link>
                  <Link 
                    to="/signup" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-3 bg-[#DF7A5E] text-white rounded-[12px] text-sm font-bold shadow-md"
                  >
                    Coba Gratis 1 Bulan
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-12 pb-24 md:pt-20 md:pb-32 overflow-hidden bg-gradient-to-b from-white to-slate-50">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#F0EAC6]/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-[#DF7A5E]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Hook Badge */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#DF7A5E]/10 border border-[#DF7A5E]/20 text-[#DF7A5E] rounded-full text-xs md:text-sm font-bold mb-8 uppercase tracking-wider"
            >
              <Sparkles className="w-4 h-4 fill-current animate-pulse" />
              Satu-Satunya Asisten AI Guru yang Terintegrasi Penuh
            </motion.div>

            {/* Hook Title */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-6xl font-black text-[#3C405B] tracking-tight leading-[1.1] mb-6"
            >
              Guru Juga Manusia: Kurangi Beban Administrasi Hingga <span className="text-[#DF7A5E] bg-gradient-to-r from-[#DF7A5E] to-red-500 bg-clip-text text-transparent">80% dengan AI</span>
            </motion.h1>

            {/* Hook Subtitle */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto mb-10"
            >
              Kurikula membantu guru membuat Modul Ajar (RPP), presentasi bahan ajar, absensi QR otomatis, dan rekap nilai rapor Kurikulum Merdeka secara instan dalam 30 detik.
            </motion.p>

            {/* CTAs */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            >
              <Link 
                to="/signup" 
                className="w-full sm:w-auto px-8 py-4 bg-[#DF7A5E] hover:bg-[#DF7A5E]/90 text-white rounded-[16px] text-base font-extrabold shadow-xl hover:shadow-2xl hover:shadow-[#DF7A5E]/20 transition-all flex items-center justify-center gap-2 group"
              >
                Mulai Trial Gratis 1 Bulan 
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a 
                href="#features" 
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-[#3C405B] border border-slate-200 rounded-[16px] text-base font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center"
              >
                Lihat Demo Fitur
              </a>
            </motion.div>

            {/* Floating UI Elements Showcase */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl max-w-5xl mx-auto"
            >
              {/* Mockup Top Bar */}
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-4 text-xs font-semibold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                  kurikula.id/dashboard
                </span>
              </div>
              
              {/* Mockup Dashboard Content */}
              <div className="grid grid-cols-1 md:grid-cols-3 bg-[#F8FAFC] rounded-b-xl overflow-hidden text-left divide-y md:divide-y-0 md:divide-x divide-slate-100">
                <div className="p-6 flex flex-col gap-4">
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 w-fit">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-base font-bold text-[#3C405B]">AI Modul Ajar (RPP)</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    AI merumuskan RPP dalam hitungan detik. Cukup masukkan mata pelajaran, kelas, dan topik bahasan.
                  </p>
                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Selesai dalam 30s</span>
                    <span className="text-slate-400">PDF & Word</span>
                  </div>
                </div>

                <div className="p-6 flex flex-col gap-4">
                  <div className="p-3 bg-orange-50 rounded-xl border border-orange-100 w-fit">
                    <QrCode className="w-6 h-6 text-[#DF7A5E]" />
                  </div>
                  <h3 className="text-base font-bold text-[#3C405B]">Absensi QR & Wali</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Absensi kelas digital. Sekali pindai, laporan kehadiran terisi otomatis dan tersinkronisasi ke orang tua.
                  </p>
                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Real-time Cloud</span>
                    <span className="text-slate-400">Anti-Titip</span>
                  </div>
                </div>

                <div className="p-6 flex flex-col gap-4">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 w-fit">
                    <ClipboardList className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="text-base font-bold text-[#3C405B]">Deskripsi Rapor Otomatis</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Ubah nilai angka menjadi kalimat capaian kompetensi secara otomatis sesuai panduan Kurikulum Merdeka.
                  </p>
                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Kurikulum Merdeka</span>
                    <span className="text-slate-400">Auto e-Rapor</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* PAIN POINTS SECTION */}
      <section id="benefits" className="py-20 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#DF7A5E] mb-3">Tantangan Guru Saat Ini</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-[#3C405B] tracking-tight">
              Apakah Anda Merasakan Hal Ini Setiap Hari?
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-md transition-all flex flex-col">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mb-6 font-black text-lg">
                1
              </div>
              <h4 className="text-lg font-bold text-[#3C405B] mb-3">Waktu Mengajar Habis untuk Berkas</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Alih-alih fokus mendidik anak di kelas, waktu Anda tersita berjam-jam untuk mengetik dokumen RPP/Modul Ajar, analisis asesmen, dan rekap administrasi yang rumit.
              </p>
            </div>

            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-md transition-all flex flex-col">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mb-6 font-black text-lg">
                2
              </div>
              <h4 className="text-lg font-bold text-[#3C405B] mb-3">Bingung Menyesuaikan Kurikulum</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Panduan Kurikulum Merdeka yang dinamis menuntut guru menyesuaikan Capaian Pembelajaran (CP) dan Alur Tujuan Pembelajaran (ATP) secara mendetail untuk setiap kelas.
              </p>
            </div>

            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-md transition-all flex flex-col">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mb-6 font-black text-lg">
                3
              </div>
              <h4 className="text-lg font-bold text-[#3C405B] mb-3">Kelelahan Menyusun Deskripsi Rapor</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Ketika musim rapor tiba, Anda harus memikirkan narasi deskriptif untuk puluhan siswa satu per satu berdasarkan nilai formatif dan sumatif mereka.
              </p>
            </div>
          </div>

          {/* Solution Banner */}
          <div className="mt-16 bg-[#3C405B] text-white rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-xl">
            <div className="absolute right-0 bottom-0 translate-x-20 translate-y-20 w-[400px] h-[400px] bg-[#DF7A5E]/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
              <div className="lg:col-span-2">
                <span className="inline-block px-3 py-1 bg-[#DF7A5E] text-white text-xs font-bold rounded-full uppercase tracking-wider mb-4">
                  Solusi Pintar
                </span>
                <h4 className="text-2xl md:text-3xl font-black mb-4">Saatnya Beralih ke Cara Kerja Pintar</h4>
                <p className="text-sm md:text-base text-slate-300 leading-relaxed">
                  Kurikula dirancang khusus oleh praktisi pendidikan untuk membantu guru mengotomatiskan pekerjaan administratif. Biarkan AI kami yang melakukan pekerjaan berat, sementara Anda fokus mendidik dan menginspirasi siswa Anda.
                </p>
              </div>
              <div className="flex justify-start lg:justify-end">
                <Link to="/signup" className="px-8 py-4 bg-[#DF7A5E] hover:bg-[#DF7A5E]/90 text-white rounded-xl text-base font-extrabold shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
                  Dapatkan Akses Gratis Sekarang <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE FEATURES SECTION (TABBED INTERACTIVE VIEW) */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#DF7A5E] mb-3">Fitur & Tools Unggulan</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-[#3C405B] tracking-tight">
              Semua yang Dibutuhkan Guru, Terintegrasi dalam Satu Platform
            </h3>
            <p className="text-slate-600 mt-4">
              Tidak perlu menggunakan berbagai macam aplikasi. Kelola RPP, bahan ajar, absensi, hingga nilai rapor siswa Anda di satu tempat yang nyaman.
            </p>
          </div>

          {/* Interactive Feature Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 mb-12">
            <button
              onClick={() => setActiveTab("planner")}
              className={`px-5 py-3 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 border ${
                activeTab === "planner" 
                  ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/10"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              AI Modul Ajar
            </button>
            <button
              onClick={() => setActiveTab("materials")}
              className={`px-5 py-3 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 border ${
                activeTab === "materials" 
                  ? "bg-[#DF7A5E] text-white border-[#DF7A5E] shadow-md shadow-[#DF7A5E]/10"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              AI Bahan Ajar
            </button>
            <button
              onClick={() => setActiveTab("attendance")}
              className={`px-5 py-3 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 border ${
                activeTab === "attendance" 
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/10"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              <QrCode className="w-4 h-4" />
              Absensi QR
            </button>
            <button
              onClick={() => setActiveTab("assessment")}
              className={`px-5 py-3 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 border ${
                activeTab === "assessment" 
                  ? "bg-[#3C405B] text-white border-[#3C405B] shadow-md shadow-[#3C405B]/10"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Penilaian & Rapor
            </button>
          </div>

          {/* Interactive Feature Display */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-12 shadow-xl overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
              >
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <span className={`px-3.5 py-1 text-xs font-black uppercase rounded-full tracking-wider bg-slate-100 text-slate-700 border border-slate-200`}>
                      {features[activeTab].badge}
                    </span>
                  </div>
                  <h4 className="text-2xl md:text-3xl font-extrabold text-[#3C405B] tracking-tight mb-3">
                    {features[activeTab].subtitle}
                  </h4>
                  <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-8">
                    {features[activeTab].desc}
                  </p>
                  
                  <ul className="space-y-3">
                    {features[activeTab].points.map((point, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{point}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-10 flex flex-wrap gap-4">
                    <Link to="/signup" className="px-6 py-3 bg-[#DF7A5E] hover:bg-[#DF7A5E]/90 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2">
                      Coba Fitur Gratis <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                <div className={`rounded-2xl border p-8 flex flex-col gap-6 shadow-inner ${features[activeTab].bgClass}`}>
                  {/* Interactive UI Mockup inside Showcase */}
                  <div className="flex items-center justify-between border-b border-slate-200/50 pb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${features[activeTab].color}`} />
                      <span className="text-xs font-bold text-slate-700">{features[activeTab].title} Panel</span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">Draft Status: Ready</span>
                  </div>

                  {activeTab === "planner" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-lg border border-slate-100">
                          <span className="text-xs text-slate-400 font-bold block mb-1">MATA PELAJARAN</span>
                          <span className="text-xs font-bold text-slate-700">Bahasa Indonesia</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-100">
                          <span className="text-xs text-slate-400 font-bold block mb-1">KELAS / SEMESTER</span>
                          <span className="text-xs font-bold text-slate-700">Kelas VII / Ganjil</span>
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-100">
                        <span className="text-xs text-slate-400 font-bold block mb-1">TOPIK MATERI</span>
                        <span className="text-xs font-bold text-slate-700">Menulis Teks Prosedur Kreatif</span>
                      </div>
                      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Sparkles className="w-5 h-5 animate-spin" />
                          <div>
                            <span className="text-xs font-bold block">Menyusun RPP/Modul...</span>
                            <span className="text-xs text-purple-100">AI merumuskan langkah diferensiasi</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full">30%</span>
                      </div>
                    </div>
                  )}

                  {activeTab === "materials" && (
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-red-500 font-bold uppercase">Materi Ringkas</span>
                          <span className="text-xs text-slate-400">1 Slide Presentasi</span>
                        </div>
                        <h5 className="text-sm font-bold text-slate-800">Apa itu Teks Prosedur?</h5>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Teks prosedur adalah teks yang berisi petunjuk untuk melakukan sesuatu secara berurutan agar mencapai tujuan yang diinginkan.
                        </p>
                      </div>
                      
                      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                        <span className="text-xs text-[#DF7A5E] font-bold uppercase">Kuis Pilihan Ganda</span>
                        <div className="text-xs font-bold text-slate-700">1. Manakah yang termasuk kalimat perintah?</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 border border-[#DF7A5E]/20 bg-[#DF7A5E]/5 rounded text-[#DF7A5E] font-bold">A. Campurkan tepung! (Benar)</div>
                          <div className="p-2 border border-slate-100 rounded text-slate-500">B. Saya sedang memasak.</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "attendance" && (
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                        <div>
                          <span className="text-xs text-emerald-600 font-bold block mb-1">SESI ABSEN AKTIF</span>
                          <span className="text-sm font-bold text-slate-700">Bahasa Indonesia - Kelas VII A</span>
                        </div>
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100 animate-pulse">
                          Sedang Berlangsung
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                          <span className="text-xl font-black text-emerald-600">32</span>
                          <span className="text-xs text-slate-400 font-bold block">HADIR</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                          <span className="text-xl font-black text-amber-500">1</span>
                          <span className="text-xs text-slate-400 font-bold block">IZIN</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                          <span className="text-xl font-black text-red-500">0</span>
                          <span className="text-xs text-slate-400 font-bold block">ALPA</span>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-bold text-xs">
                          AS
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">Ahmad Subardjo</p>
                          <p className="text-xs text-slate-400">Absen masuk via QR Kartu Siswa • 07:15</p>
                        </div>
                        <span className="text-xs font-bold text-emerald-600">✓ Sukses</span>
                      </div>
                    </div>
                  )}

                  {activeTab === "assessment" && (
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400 font-bold">DESKRIPSI CAPAIAN KOMPETENSI</span>
                          <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">Format Rapor</span>
                        </div>
                        <h6 className="text-xs font-bold text-slate-800">Siswa: Annisa Fitriani</h6>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 leading-relaxed">
                          "Menunjukkan penguasaan yang sangat baik dalam menulis teks prosedur secara kreatif, namun perlu bimbingan lebih lanjut dalam membedakan konjungsi kronologis dalam teks."
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                        <span>Berdasarkan Nilai Formatif: 88, Sumatif: 79</span>
                        <span className="font-bold text-[#3C405B] hover:underline cursor-pointer">Edit Narasi</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* PRICING PLANS SECTION */}
      <section id="pricing" className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#DF7A5E] mb-3">Rencana Langganan</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-[#3C405B] tracking-tight">
              Investasi Kecil untuk Waktu Istirahat yang Berharga
            </h3>
            <p className="text-slate-600 mt-4">
              Mulai gratis selama 30 hari. Tidak ada biaya tersembunyi. Batalkan langganan atau ganti paket kapan saja Anda mau.
            </p>

            {/* Monthly / Yearly Toggle */}
            <div className="inline-flex items-center justify-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 mt-10">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  billingCycle === "monthly" 
                    ? "bg-white text-[#3C405B] shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Bayar Bulanan
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  billingCycle === "yearly" 
                    ? "bg-[#3C405B] text-white shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Bayar Tahunan
                <span className="px-2 py-0.5 bg-[#DF7A5E] text-white text-xs font-black rounded-full uppercase">Hemat 2 Bulan</span>
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {pricingTiers.map((tier, index) => {
              const isSchool = tier.name === "School";
              return (
                <div 
                  key={index} 
                  className={`rounded-3xl border p-8 flex flex-col transition-all relative ${tier.color} ${
                    tier.popular ? "shadow-xl hover:shadow-2xl translate-y-[-4px] md:translate-y-[-8px]" : "hover:shadow-lg"
                  }`}
                >
                  {/* Popular Badge */}
                  {tier.popular && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-[#DF7A5E] to-red-500 text-white text-xs font-black rounded-full uppercase tracking-wider shadow-md">
                      {tier.badge}
                    </span>
                  )}

                  {/* Header */}
                  <div className="mb-6">
                    <span className={`text-xs font-black uppercase tracking-wider block mb-2 ${
                      tier.popular ? "text-[#DF7A5E]" : "text-slate-400"
                    }`}>
                      {tier.name !== "Pro" ? tier.badge : "Pilihan Utama"}
                    </span>
                    <h4 className="text-2xl font-black text-[#3C405B]">{tier.name}</h4>
                  </div>

                  {/* Pricing Info */}
                  <div className="flex items-baseline mb-6 border-b border-slate-100 pb-6">
                    <span className="text-xs font-bold text-slate-400 mr-1">
                      {tier.priceMonthly !== "Custom" ? "Rp" : ""}
                    </span>
                    <span className="text-3xl font-black text-[#3C405B]">
                      {getPriceText(tier)}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 ml-1.5">
                      {getPriceSubtext(tier)}
                    </span>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-4 mb-8 flex-1">
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-bold text-slate-700">
                        Token AI: {tier.tokens} / bln
                      </span>
                    </li>
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-medium text-slate-600 leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Call to Action Button */}
                  {isSchool ? (
                    <a
                      href={tier.ctaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-4 text-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      {tier.ctaText}
                    </a>
                  ) : (
                    <Link
                      to={tier.ctaLink}
                      className={`w-full py-4 text-center rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition-all uppercase tracking-wider block ${
                        tier.popular
                          ? "bg-[#DF7A5E] hover:bg-[#DF7A5E]/90 text-white shadow-xl hover:shadow-[#DF7A5E]/20"
                          : "bg-slate-100 hover:bg-slate-200 text-[#3C405B]"
                      }`}
                    >
                      {tier.ctaText}
                    </Link>
                  )}

                  {!isSchool && (
                    <span className="text-xs text-center text-slate-400 font-bold block mt-3">
                      Free trial 1 bulan • Batalkan kapan saja
                    </span>
                  )}
                  {isSchool && (
                    <span className="text-xs text-center text-slate-400 font-bold block mt-3">
                      SLA Kontrak Kerja Sama & Sosialisasi
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* BENEFITS DETAILS SECTION (STATS/SOCIAL PROOF) */}
      <section className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-block px-3 py-1 bg-[#DF7A5E]/10 text-[#DF7A5E] text-xs font-bold rounded-full uppercase tracking-wider mb-4">
                Bukti Nyata Efisiensi
              </span>
              <h3 className="text-3xl md:text-4xl font-extrabold text-[#3C405B] tracking-tight mb-6">
                Lebih dari Sekadar Aplikasi Administrasi Biasa
              </h3>
              <p className="text-slate-600 leading-relaxed mb-8">
                Kurikula dirancang untuk memberikan kemudahan penuh bagi guru di seluruh Indonesia. Dari RPP hingga rapor, kami telah terbukti membantu guru menghemat puluhan jam kerja lembur di sekolah atau di rumah.
              </p>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                  <div className="text-3xl font-black text-[#DF7A5E] mb-1">&gt; 15 Jam</div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Hemat Waktu Per Minggu</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                  <div className="text-3xl font-black text-purple-600 mb-1">98%</div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Guru Merasa Terbantu</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                  <div className="text-3xl font-black text-emerald-600 mb-1">30 Detik</div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Rata-rata Susun RPP</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                  <div className="text-3xl font-black text-[#3C405B] mb-1">100%</div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Kurikulum Merdeka Sesuai</div>
                </div>
              </div>
            </div>

            <div className="relative">
              {/* Decorative Circle Elements */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#DF7A5E]/5 rounded-full blur-3xl pointer-events-none" />
              
              {/* Teacher Quote Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl relative z-10 space-y-6">
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="w-5 h-5 fill-current" />
                  <Star className="w-5 h-5 fill-current" />
                  <Star className="w-5 h-5 fill-current" />
                  <Star className="w-5 h-5 fill-current" />
                  <Star className="w-5 h-5 fill-current" />
                </div>
                
                <blockquote className="text-base md:text-lg text-slate-700 italic font-medium leading-relaxed">
                  "Semenjak sekolah kami menggunakan Kurikula, saya tidak perlu lagi membawa pulang berkas RPP ke rumah. Cukup luangkan waktu 5 menit di sekolah bersama asisten AI, semua administrasi Modul Ajar dan Bahan Ajar saya sudah beres seminggu ke depan!"
                </blockquote>

                <hr className="border-slate-100" />

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#DF7A5E] to-purple-600 rounded-full flex items-center justify-center text-white font-extrabold">
                    BH
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-[#3C405B]">Bu Herlina, S.Pd.</h5>
                    <p className="text-xs text-slate-500 font-medium">Guru Kelas VII - SMP Negeri di Bandung</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#DF7A5E] mb-3">Tanya Jawab Umum</h2>
            <h3 className="text-3xl font-extrabold text-[#3C405B] tracking-tight">
              Pertanyaan yang Sering Diajukan
            </h3>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div 
                  key={index}
                  className="bg-slate-50 rounded-2xl border border-slate-200/60 overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                  >
                    <span className="font-bold text-sm md:text-base text-[#3C405B] pr-4">
                      {faq.q}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-[#DF7A5E]" : ""
                    }`} />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-6 pb-6 pt-1 text-slate-600 text-xs md:text-sm leading-relaxed border-t border-slate-100">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA FINAL SECTION */}
      <section className="py-20 bg-gradient-to-br from-[#3C405B] to-slate-900 text-white text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#DF7A5E]/10 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6 relative z-10 space-y-8">
          <h3 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Kembalikan Waktu Berharga Anda Untuk Mengajar
          </h3>
          <p className="text-slate-300 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Dapatkan uji coba gratis selama 1 bulan penuh. Tanpa perlu kartu kredit. Batalkan kapan saja jika Anda merasa platform ini tidak cocok.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/signup" className="w-full sm:w-auto px-8 py-4 bg-[#DF7A5E] hover:bg-[#DF7A5E]/90 text-white rounded-2xl text-base font-extrabold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group">
              Mulai Free Trial 1 Bulan <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#pricing" className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-2xl text-base font-bold transition-all">
              Lihat Skema Harga
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-slate-400 text-xs font-bold pt-8">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#DF7A5E]" /> 30-Day Free Trial
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Aman & Terenkripsi
            </span>
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Aktivasi Instan
            </span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 border-t border-white/5 py-12 text-slate-500 text-xs md:text-sm">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src={logoWithText} alt="Kurikula" className="h-7 brightness-200 opacity-60" />
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 font-semibold text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Fitur</a>
            <a href="#benefits" className="hover:text-white transition-colors">Manfaat</a>
            <a href="#pricing" className="hover:text-white transition-colors">Harga</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <Link to="/privacy-policy" className="hover:text-white transition-colors">Kebijakan Privasi</Link>
            <Link to="/terms-of-service" className="hover:text-white transition-colors">Syarat & Ketentuan</Link>
          </div>

          <div>
            &copy; {new Date().getFullYear()} Kurikula. Hak Cipta Dilindungi.
          </div>
        </div>
      </footer>

    </div>
  );
}
