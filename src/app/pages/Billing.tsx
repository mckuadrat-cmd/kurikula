import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { CreditCard, Sparkles, Check, TrendingUp, Download, Calendar, ShieldCheck } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { toast } from "sonner";
import { supabase } from "../../../utils/supabase/client";
import { useAuth } from "../../contexts/AuthContext";


const pricingTiers = [
  {
    key: "basic",
    name: "Basic",
    monthlyPrice: "29.000",
    yearlyPrice: "290.000",
    monthlyTokens: 30,
    yearlyTokens: 360,
    features: [
      "AI Credit: 30/bulan atau 360/tahun",
      "Chat / Percakapan AI Umum",
      "Fitur AI Khusus (RPP & Bahan Ajar) Terkunci 🔒",
      "Model AI Standar (Gemini Flash)",
      "Tidak bisa melakukan Top Up",
      "Absensi QR unlimited",
      "Data siswa & Penilaian Rapor",
      "Penilaian Rapor manual"
    ],
    color: "purple",
    popular: false,
  },
  {
    key: "pro",
    name: "Pro",
    monthlyPrice: "59.000",
    yearlyPrice: "590.000",
    monthlyTokens: 150,
    yearlyTokens: 1800,
    features: [
      "AI Credit: 150/bulan atau 1.800/tahun",
      "Akses Model Gemini PRO",
      "Penilaian: Persiapan AI (Bagian A)",
      "Bisa melakukan Top Up Credit",
      "Akses Penuh AI Planner & Chat",
      "Absensi QR unlimited",
      "Priority Support"
    ],
    color: "pink",
    popular: true,
  },
  {
    key: "premium",
    name: "Premium",
    monthlyPrice: "99.000",
    yearlyPrice: "990.000",
    monthlyTokens: 500,
    yearlyTokens: 6000,
    features: [
      "AI Credit: 500/bulan atau 6.000/tahun",
      "Semester: Diagnostik Kelas",
      "Bahan Ajar: PPT & Tanya Pemantik",
      "Penilaian: Alur Lengkap (Bagian B & C)",
      "Bisa melakukan Top Up Credit",
      "Prioritas Kecepatan Respon AI",
      "Semua fitur Pro",
      "Dedicated Support"
    ],
    color: "indigo",
    popular: false,
  },
  {
    key: "school",
    name: "School",
    monthlyPrice: "Custom",
    yearlyPrice: "Custom",
    monthlyTokens: "Custom",
    yearlyTokens: "Custom",
    features: [
      "Custom AI credits/tahun",
      "Untuk sekolah, pesantren, yayasan",
      "Unlimited teachers",
      "Multi-school dashboard",
      "Custom integration & training"
    ],
    color: "emerald",
    popular: false,
  },
];

const topUpPackages = [
  { key: "topup-100", tokens: 100, price: "15.000", label: "Top Up 100 Credit" },
  { key: "topup-250", tokens: 250, price: "30.000", label: "Top Up 250 Credit" },
  { key: "topup-500", tokens: 500, price: "50.000", label: "Top Up 500 Credit" },
];

export default function Billing() {
  const { subscriptionTier, credits, activeWorkspaceId, refresh, subscriptionExpiresAt, workspaces } = useWorkspace();
  const { user } = useAuth();
  const [selectedTierToBuy, setSelectedTierToBuy] = useState<{ key: string; name: string; price: string } | null>(null);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [dbTransactions, setDbTransactions] = useState<any[]>([]);
  const [isLoadingTrx, setIsLoadingTrx] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [successModalData, setSuccessModalData] = useState<{ name: string; key: string } | null>(null);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null);

  const canTopUp = ["pro", "premium", "school"].includes(subscriptionTier);
  const pendingTransactions = dbTransactions.filter((t) => t.status === "pending");

  const fetchTransactions = async () => {
    if (!activeWorkspaceId) return;
    setIsLoadingTrx(true);
    try {
      const { data, error } = await supabase
        .from("payment_transactions")
        .select("*")
        .eq("workspace_id", activeWorkspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDbTransactions(data || []);
    } catch (e: any) {
      console.error("Gagal mengambil riwayat transaksi:", e);
    } finally {
      setIsLoadingTrx(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [activeWorkspaceId]);

  // Polling otomatis jika ada transaksi pending
  useEffect(() => {
    const hasPending = dbTransactions.some((t) => t.status === "pending");
    if (!hasPending) return;

    const interval = setInterval(() => {
      fetchTransactions();
      if (refresh) {
        refresh();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [dbTransactions, refresh]);

  const activePlanName = subscriptionTier === "inactive" 
    ? "Tidak Aktif" 
    : subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1);

  const actualCycle = workspaces?.find(w => w.id === activeWorkspaceId)?.billing_cycle || "monthly";
  const totalTokensForTier = 
    subscriptionTier === "trial" ? 50 :
    subscriptionTier === "basic" ? (actualCycle === "yearly" ? 360 : 30) :
    subscriptionTier === "pro" ? (actualCycle === "yearly" ? 1800 : 150) :
    subscriptionTier === "premium" ? (actualCycle === "yearly" ? 6000 : 500) :
    subscriptionTier === "school" ? 10000 : 0;
  
  const percentage = totalTokensForTier > 0 
    ? Math.round(((credits?.balance ?? 0) / totalTokensForTier) * 100) 
    : 0;

  const usageData = [
    { date: "Awal Bulan", usage: 0 },
    { date: "Hari Ini", usage: credits?.total_spent ?? 0 }
  ];

  const scrollToPricing = () => {
    document.getElementById("pricing-tiers")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleTopUpClick = () => {
    if (!activeWorkspaceId) {
      toast.error("Workspace aktif tidak ditemukan. Silakan pilih workspace terlebih dahulu.");
      return;
    }
    if (!canTopUp) {
      toast.error("Top Up Credit hanya tersedia untuk paket Pro dan Premium. Silakan upgrade terlebih dahulu.");
      scrollToPricing();
      return;
    }
    setIsTopUpModalOpen(true);
  };

  const handleSelectPlan = (baseKey: string, tierName: string, tierPrice: string) => {
    if (!activeWorkspaceId) {
      toast.error("Workspace aktif tidak ditemukan. Silakan pilih workspace terlebih dahulu.");
      return;
    }
    if (baseKey === "school") {
      const message = encodeURIComponent("Halo Admin Kurikula, saya tertarik dengan paket School untuk sekolah saya.");
      window.open(`https://wa.me/62818393931?text=${message}`, "_blank");
      return;
    }
    if (baseKey.startsWith("topup-")) {
      if (!canTopUp) {
        toast.error("Top Up Credit hanya tersedia untuk paket Pro dan Premium yang aktif.");
        scrollToPricing();
        return;
      }
      setSelectedTierToBuy({ key: baseKey, name: tierName, price: `Rp ${tierPrice}` });
      return;
    }

    const actualKey = billingCycle === "yearly" ? `${baseKey}-yearly` : baseKey;
    const formattedPrice = billingCycle === "yearly" ? `Rp ${tierPrice}/tahun` : `Rp ${tierPrice}/bulan`;
    setSelectedTierToBuy({ 
      key: actualKey, 
      name: `${tierName} (${billingCycle === "yearly" ? "Tahunan" : "Bulanan"})`, 
      price: formattedPrice 
    });
  };

  const handleConfirmPayment = async () => {
    if (!selectedTierToBuy || isPaymentProcessing) return;
    if (!activeWorkspaceId) {
      toast.error("Workspace aktif tidak ditemukan.");
      return;
    }
    if (!user) {
      toast.error("Sesi login tidak ditemukan. Silakan login ulang.");
      return;
    }
    if (selectedTierToBuy.key.startsWith("topup-") && !canTopUp) {
      toast.error("Top Up hanya tersedia untuk paket Pro dan Premium yang aktif.");
      setSelectedTierToBuy(null);
      return;
    }
    if (typeof (window as any).snap?.pay !== "function") {
      toast.error("Payment gateway belum siap. Muat ulang halaman lalu coba lagi.");
      return;
    }

    const { key: tierKey, name: tierName } = selectedTierToBuy;
    setSelectedTierToBuy(null); // Tutup modal
    setIsPaymentProcessing(true);

    const toastId = toast.loading("Menyiapkan tagihan pembayaran...");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const tokenUser = sessionData?.session?.access_token;
      if (!tokenUser) {
        throw new Error("Sesi login tidak ditemukan. Silakan login ulang.");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/charge`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${tokenUser}`
          },
          body: JSON.stringify({
            workspaceId: activeWorkspaceId,
            tierKey: tierKey
          })
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = "Gagal memproses pembayaran";
        try {
          const errJson = JSON.parse(errText);
          errMsg = errJson.error || errMsg;
        } catch (_) {
          errMsg = errText || errMsg;
        }
        throw new Error(errMsg);
      }

      const { token } = await response.json();
      toast.dismiss(toastId);
      fetchTransactions(); // Tampilkan transaksi pending di background langsung

      (window as any).snap.pay(token, {
        onSuccess: function (result: any) {
          toast.success("Pembayaran Berhasil!");
          setSuccessModalData({
            name: tierName,
            key: tierKey
          });
          if (refresh) {
            refresh();
          }
        },
        onPending: function (result: any) {
          toast.info("Menunggu pembayaran dari Anda.");
          fetchTransactions();
        },
        onError: function (result: any) {
          toast.error("Pembayaran Gagal. Silakan coba lagi.");
          fetchTransactions();
        },
        onClose: function () {
          toast.info("Anda menutup halaman pembayaran.");
          fetchTransactions();
        }
      });
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || "Gagal memproses tagihan.");
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  const handleCancelTransaction = async (orderId: string) => {
    if (!activeWorkspaceId) {
      toast.error("Workspace aktif tidak ditemukan.");
      return;
    }
    if (cancelingOrderId) return;

    const toastId = toast.loading("Membatalkan tagihan pending...");
    setCancelingOrderId(orderId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const tokenUser = sessionData?.session?.access_token;
      if (!tokenUser) {
        throw new Error("Sesi login tidak ditemukan. Silakan login ulang.");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${tokenUser}`
          },
          body: JSON.stringify({
            workspaceId: activeWorkspaceId,
            orderId: orderId
          })
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Gagal membatalkan tagihan.");
      }

      toast.dismiss(toastId);
      toast.success("Tagihan berhasil dibatalkan.");
      fetchTransactions();
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || "Gagal membatalkan tagihan.");
    } finally {
      setCancelingOrderId(null);
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Current Balance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 rounded-[12px] p-8 text-white relative overflow-hidden"
      >
        <motion.div
          className="absolute inset-0 opacity-10"
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%"],
          }}
          transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
          style={{
            backgroundImage: "radial-gradient(circle, white 2px, transparent 2px)",
            backgroundSize: "40px 40px",
          }}
        />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-6 h-6" />
                <span className="text-blue-100">Saldo AI Credit Anda</span>
              </div>
              <div className="text-5xl font-bold mb-2">
                {(credits?.balance ?? 0).toLocaleString("id-ID")} / {totalTokensForTier.toLocaleString("id-ID")} AI Credit
              </div>
              <p className="text-sm text-blue-100 font-semibold mb-2 leading-relaxed">
                Setara ±{(credits?.balance ?? 0).toLocaleString("id-ID")} Chat AI, ±{Math.floor((credits?.balance ?? 0) / 5).toLocaleString("id-ID")} Bahan Ajar, atau ±{Math.floor((credits?.balance ?? 0) / 10).toLocaleString("id-ID")} Modul Ajar
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-blue-100 mb-1">Paket Aktif</div>
              <div className="text-2xl font-bold">{activePlanName} Plan</div>
              <div className="text-sm text-blue-100 mt-1">
                {subscriptionTier === "inactive" 
                  ? "Belum Ada Paket Aktif" 
                  : subscriptionTier === "school"
                  ? "Aktif"
                  : subscriptionExpiresAt
                  ? `Berlaku hingga ${new Date(subscriptionExpiresAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}`
                  : ""}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleTopUpClick}
              className="px-6 py-3 bg-white text-blue-600 rounded-[12px] font-medium hover:bg-blue-50 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <CreditCard className="w-5 h-5" />
              Top Up Credit
            </button>
            <button 
              onClick={scrollToPricing}
              className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-[12px] font-medium transition-colors cursor-pointer"
            >
              Upgrade Plan
            </button>
          </div>
        </div>
      </motion.div>

      <div className="bg-white border border-emerald-100 rounded-[12px] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">Pembayaran diverifikasi server</div>
            <p className="text-xs text-gray-500 mt-0.5">
              Aktivasi paket hanya dilakukan setelah webhook Midtrans tervalidasi. Refresh otomatis aktif selama ada tagihan pending.
            </p>
          </div>
        </div>
        {pendingTransactions.length > 0 && (
          <div className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-[10px] text-xs font-bold">
            {pendingTransactions.length} tagihan menunggu pembayaran
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Usage Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white rounded-[12px] p-6 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Penggunaan AI Credit</h2>
            </div>
            <select className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-[12px] text-sm focus:outline-none">
              <option>7 Hari Terakhir</option>
              <option>30 Hari Terakhir</option>
              <option>Bulan Ini</option>
            </select>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="usage"
                stroke="#2563EB"
                strokeWidth={3}
                dot={{ fill: "#2563EB", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-[12px] p-6 border border-gray-200"
        >
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Riwayat</h2>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {isLoadingTrx ? (
              <div className="text-center py-8 text-sm text-gray-500">Memuat riwayat...</div>
            ) : dbTransactions.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500">Belum ada riwayat transaksi.</div>
            ) : (
              dbTransactions.map((trx) => {
                const dateStr = new Date(trx.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                });
                
                let friendlyType = trx.tier_key;
                if (trx.tier_key === "trial") friendlyType = "Paket Trial";
                else if (trx.tier_key === "basic") friendlyType = "Paket Basic";
                else if (trx.tier_key === "basic-yearly") friendlyType = "Paket Basic (Tahunan)";
                else if (trx.tier_key === "pro") friendlyType = "Paket Pro";
                else if (trx.tier_key === "pro-yearly") friendlyType = "Paket Pro (Tahunan)";
                else if (trx.tier_key === "premium") friendlyType = "Paket Premium";
                else if (trx.tier_key === "premium-yearly") friendlyType = "Paket Premium (Tahunan)";
                else if (trx.tier_key === "topup-100") friendlyType = "Top Up 100 Credit";
                else if (trx.tier_key === "topup-250") friendlyType = "Top Up 250 Credit";
                else if (trx.tier_key === "topup-500") friendlyType = "Top Up 500 Credit";

                const isPending = trx.status === "pending";
                const isSuccess = trx.status === "success";
                const isFailed = ["failed", "expired", "deny", "cancel"].includes(trx.status);

                return (
                  <div key={trx.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-[12px] border border-gray-100 hover:border-gray-200 transition-colors">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      isSuccess ? "bg-emerald-500" :
                      isPending ? "bg-amber-500" : "bg-red-400"
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-xs truncate">{friendlyType}</div>
                      <div className="text-xs text-gray-400">{dateStr}</div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <div className="font-bold text-xs text-gray-900">
                        Rp {Number(trx.amount).toLocaleString("id-ID")}
                      </div>
                      {isPending && (
                        <div className="flex items-center gap-1.5 mt-1">
                          {trx.payment_url && (
                            <a 
                              href={trx.payment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded-[6px] text-xs font-bold transition-colors shadow-sm"
                            >
                              Bayar
                            </a>
                          )}
                          <button
                            onClick={() => handleCancelTransaction(trx.order_id)}
                            disabled={cancelingOrderId === trx.order_id}
                            className="px-2 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-[6px] text-xs font-bold transition-colors border border-gray-300 cursor-pointer"
                          >
                            {cancelingOrderId === trx.order_id ? "..." : "Batalkan"}
                          </button>
                        </div>
                      )}
                      {isSuccess && (
                        <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-[4px]">
                          Sukses
                        </span>
                      )}
                      {isFailed && (
                        <span className="text-xs text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded-[4px]">
                          Gagal
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </motion.div>
      </div>

      {/* Pricing Tiers */}
      <div id="pricing-tiers" className="scroll-mt-8">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Pilih Paket yang Tepat</h2>
          <p className="text-gray-600 mb-6">Upgrade untuk mendapatkan lebih banyak AI Credit dan fitur</p>
          
          {/* Toggle Bulanan / Tahunan */}
          <div className="inline-flex items-center gap-2 bg-gray-100 p-1.5 rounded-[16px] border border-gray-200 shadow-inner">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2.5 rounded-[12px] text-sm font-semibold transition-all cursor-pointer ${
                billingCycle === "monthly"
                  ? "bg-white text-gray-900 shadow-sm font-bold"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-5 py-2.5 rounded-[12px] text-sm font-semibold transition-all relative flex items-center gap-1.5 cursor-pointer ${
                billingCycle === "yearly"
                  ? "bg-white text-gray-900 shadow-sm font-bold"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Tahunan
              <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-extrabold animate-pulse">
                Hemat 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {pricingTiers.map((tier, index) => {
            const isYearly = billingCycle === "yearly";
            const price = isYearly ? tier.yearlyPrice : tier.monthlyPrice;
            const tokens = isYearly ? tier.yearlyTokens : tier.monthlyTokens;
            const period = isYearly ? "tahun" : "bulan";
            
            // Check active plan
            const isCurrentActive = subscriptionTier === tier.key;

            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className={`bg-white rounded-[20px] p-6 border-2 relative flex flex-col justify-between ${
                  isCurrentActive
                    ? "border-emerald-500 shadow-lg scale-105"
                    : tier.popular
                    ? "border-purple-500 shadow-md scale-105"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {isCurrentActive && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-emerald-600 text-white rounded-full text-xs font-semibold shadow-sm">
                      Paket Aktif
                    </span>
                  </div>
                )}
                {!isCurrentActive && tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full text-xs font-semibold shadow-sm">
                      Terpopuler
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    {price === "Hubungi Admin" ? (
                      <span className="text-2xl font-bold text-gray-900">{price}</span>
                    ) : (
                      <>
                        <span className="text-sm text-gray-500">Rp</span>
                        <span className="text-4xl font-bold text-gray-900">{price}</span>
                        <span className="text-sm text-gray-500">/{period}</span>
                      </>
                    )}
                  </div>
                  <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold inline-block">
                    {tokens === "Custom" ? "Custom Credits" : `${typeof tokens === "number" ? tokens.toLocaleString("id-ID") : tokens} AI Credit`}
                  </div>
                </div>

                <ul className="space-y-3 mb-6 flex-1">
                  {tier.key !== "basic" && tier.key !== "school" && tier.key !== "trial" && (
                    <li className="flex items-center gap-3">
                      <Check className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                      <span className="text-xs text-gray-700 font-semibold text-blue-600">
                        {isYearly 
                          ? `${typeof tier.yearlyTokens === "number" ? tier.yearlyTokens.toLocaleString("id-ID") : tier.yearlyTokens} AI Credit /tahun` 
                          : `${typeof tier.monthlyTokens === "number" ? tier.monthlyTokens.toLocaleString("id-ID") : tier.monthlyTokens} AI Credit /bulan`}
                      </span>
                    </li>
                  )}
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Check className={`w-4 h-4 flex-shrink-0 ${feature.includes("🔒") ? "text-red-500" : "text-emerald-500"}`} />
                      <span className="text-xs text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(tier.key, tier.name, price)}
                  disabled={isCurrentActive}
                  className={`w-full py-2.5 rounded-[12px] font-semibold text-sm transition-all cursor-pointer ${
                    isCurrentActive
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default"
                      : tier.key === "school"
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm"
                      : tier.popular
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-sm"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-200"
                  }`}
                >
                  {isCurrentActive
                    ? "Paket Aktif"
                    : tier.key === "school"
                    ? "Hubungi Admin"
                    : "Pilih Paket"}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-[12px] p-4 border border-gray-200">
          <div className="text-sm text-gray-500 mb-1">Total Digunakan</div>
          <div className="text-3xl font-bold text-gray-900">{(credits?.total_spent ?? 0).toLocaleString("id-ID")}</div>
          <div className="text-xs text-gray-500 mt-1">Bulan ini</div>
        </div>
        <div className="bg-blue-50 rounded-[12px] p-4 border border-blue-200">
          <div className="text-sm text-blue-700 mb-1">AI Generation</div>
          <div className="text-3xl font-bold text-blue-900">{Math.round((credits?.total_spent ?? 0) * 0.8).toLocaleString("id-ID")}</div>
          <div className="text-xs text-blue-600 mt-1">80% dari total spent</div>
        </div>
        <div className="bg-purple-50 rounded-[12px] p-4 border border-purple-200">
          <div className="text-sm text-purple-700 mb-1">AI Chat</div>
          <div className="text-3xl font-bold text-purple-900">{Math.round((credits?.total_spent ?? 0) * 0.2).toLocaleString("id-ID")}</div>
          <div className="text-xs text-purple-600 mt-1">20% dari total spent</div>
        </div>
        <div className="bg-emerald-50 rounded-[12px] p-4 border border-emerald-200">
          <div className="text-sm text-emerald-700 mb-1">Lainnya</div>
          <div className="text-3xl font-bold text-emerald-900">0</div>
          <div className="text-xs text-emerald-600 mt-1">0% dari total spent</div>
        </div>
      </div>
      {/* Confirmation Modal */}
      {selectedTierToBuy && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[24px] p-6 max-w-sm w-full border border-gray-200 shadow-2xl space-y-6"
          >
            <div className="w-14 h-14 bg-gradient-to-tr from-[#3C405B] to-[#DF7A5E] rounded-full flex items-center justify-center mx-auto shadow-sm text-white text-xl">
              💰
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-gray-900">Konfirmasi Paket</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Apakah Anda yakin ingin mengaktifkan paket <strong className="text-gray-800">{selectedTierToBuy.name}</strong> dengan biaya <strong className="text-gray-800">{selectedTierToBuy.price}</strong>?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedTierToBuy(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[12px] font-semibold text-xs transition-colors cursor-pointer border border-gray-200"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={isPaymentProcessing}
                className="flex-1 py-2.5 bg-[#3C405B] hover:bg-[#3C405B]/90 text-white rounded-[12px] font-semibold text-xs transition-colors cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPaymentProcessing ? "Memproses..." : "Lanjutkan"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Success Celebration Modal */}
      {successModalData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[24px] p-8 max-w-md w-full border border-gray-200 shadow-2xl space-y-6 text-center relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
            
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto shadow-inner text-4xl animate-bounce">
              🎉
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-gray-900">Selamat! Paket Aktif</h3>
              <p className="text-sm text-gray-500">
                Pembayaran Anda berhasil diverifikasi. Workspace Anda sekarang memiliki paket:
              </p>
              <p className="text-lg font-extrabold text-[#3C405B] bg-[#F0EAC6]/30 py-2 px-4 rounded-full inline-block">
                {successModalData.name}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-[16px] border border-gray-100 text-left space-y-3">
              <p className="text-xs font-bold text-gray-900 border-b border-gray-200 pb-2">Fitur yang Terbuka:</p>
              <ul className="space-y-2 text-xs text-gray-600">
                {successModalData.key.includes("basic") ? (
                  <>
                    <li className="flex items-center gap-2 font-semibold text-[#DF7A5E]">
                      <span className="text-emerald-500 font-bold">✓</span> {successModalData.key.includes("yearly") ? "360" : "30"} AI Credit
                    </li>
                    <li className="flex items-center gap-2 text-emerald-600 font-semibold">
                      <span className="text-emerald-500 font-bold">✓</span> Chat / Percakapan AI Umum Aktif
                    </li>
                    <li className="flex items-center gap-2 text-red-500">
                      <span className="text-red-500 font-bold">🔒</span> Fitur AI Khusus RPP & Bahan Ajar Terkunci
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span> Absensi QR Code Unlimited
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span> Manajemen Data Siswa & Rapor Manual
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-center gap-2 font-semibold text-blue-600">
                      <span className="text-emerald-500 font-bold">✓</span> {successModalData.key.includes("yearly") ? "6.000" : "500"} AI Credit
                    </li>
                    <li className="flex items-center gap-2 font-semibold text-blue-600">
                      <span className="text-emerald-500 font-bold">✓</span> Akumulasi Saldo Credit Berlanjut
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span> Akses Penuh AI Modul Ajar (RPP)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span> Akses Penuh AI Bahan Ajar
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span> Absensi QR Code & Data Siswa
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span> Layanan Dukungan Prioritas
                    </li>
                  </>
                )}
              </ul>
            </div>

            <button
              onClick={() => {
                setSuccessModalData(null);
                if (refresh) {
                  refresh();
                } else {
                  window.location.reload();
                }
              }}
              className="w-full py-3 bg-[#3C405B] hover:bg-[#3C405B]/90 text-white rounded-[16px] font-bold text-sm transition-all cursor-pointer shadow-md"
            >
              Ok, Mulai Gunakan Fitur
            </button>
          </motion.div>
        </div>
      )}

      {/* Top Up Selection Modal */}
      {isTopUpModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[24px] p-6 max-w-sm w-full border border-gray-200 shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-md font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 animate-spin" />
                Pilih Nominal Top Up
              </h3>
              <button 
                onClick={() => setIsTopUpModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {topUpPackages.map((pkg) => (
                <div 
                  key={pkg.key}
                  onClick={() => {
                    setIsTopUpModalOpen(false);
                    handleSelectPlan(pkg.key, pkg.label, pkg.price);
                  }}
                  className="p-4 bg-gray-50 hover:bg-blue-50/30 border border-gray-200 hover:border-blue-300 rounded-[16px] flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {pkg.tokens} AI Credit
                    </p>
                    <p className="text-xs text-gray-400">Saldo tambahan instan</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-gray-950">Rp {pkg.price}</p>
                    <p className="text-xs text-gray-400">Sekali beli</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50/50 p-3 rounded-[12px] border border-blue-100 text-center">
              <p className="text-xs text-blue-700 leading-normal">
                *Credit yang dibeli via Top Up bersifat akumulatif dan **tidak akan hangus** di akhir bulan.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
