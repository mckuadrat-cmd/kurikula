import { Navigate } from "react-router";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../../contexts/AuthContext";

export default function PaymentFailed() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id") || "N/A";
  const { user, loading } = useAuth();

  useEffect(() => {
    // Set Page Title
    document.title = "Pembayaran Gagal | Kurikula";
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#F0EAC6] border-t-[#3C405B] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memverifikasi Sesi...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-[32px] p-8 md:p-12 max-w-lg w-full border border-gray-100 shadow-2xl text-center space-y-8 relative overflow-hidden"
      >
        {/* Top Accent Line */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-red-500 via-orange-500 to-red-600" />

        {/* Animated Warning Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
          className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner"
        >
          <AlertCircle className="w-12 h-12" />
        </motion.div>

        {/* Text Details */}
        <div className="space-y-3">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Pembayaran Gagal</h1>
          <p className="text-gray-500 text-sm md:text-base leading-relaxed">
            Mohon maaf, transaksi pembayaran Anda tidak berhasil diproses, dibatalkan, atau telah kedaluwarsa. Silakan coba kembali.
          </p>
        </div>

        {/* Order Info Badge if present */}
        {orderId !== "N/A" && (
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-[20px] text-left">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order ID Referensi</p>
            <p className="text-sm font-bold text-slate-800">{orderId}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            id="btn-retry-payment"
            onClick={() => navigate("/billing")}
            className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-[16px] text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Coba Bayar Lagi
          </button>
          <button
            id="btn-back-dashboard"
            onClick={() => navigate("/dashboard")}
            className="flex-1 py-3.5 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-[16px] text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
        </div>
      </motion.div>
    </div>
  );
}
