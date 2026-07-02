import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { motion } from "motion/react";
import { Lock, AlertCircle, Eye, EyeOff, CheckCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import logoWithText from "../../assets/kurikula.png";
import logoIcon from "../../assets/LOGO.png";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword, signOut } = useAuth();
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const translateAuthError = (message: string): string => {
    if (!message) return "Terjadi kesalahan. Silakan coba lagi.";
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes("password should be at least")) {
      return "Password minimal terdiri dari 6 karakter.";
    }
    if (lowerMsg.includes("network error") || lowerMsg.includes("failed to fetch")) {
      return "Koneksi jaringan terganggu. Silakan periksa internet Anda.";
    }
    
    return message;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password harus minimal 6 karakter.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await updatePassword(newPassword);
      
      if (error) {
        setError(translateAuthError(error.message));
      } else {
        setSuccess(true);
        toast.success("Password Anda berhasil diperbarui!");
        
        // Hapus sesi sementara setelah reset
        await signOut();
        
        // Arahkan ke login setelah 3 detik
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      console.error("Reset password error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gray-50">
      {/* Left Side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#3C405B] via-[#DF7A5E] to-[#F0EAC6] p-12 items-center justify-center relative overflow-hidden h-full">
        <motion.div
          className="absolute inset-0 opacity-10"
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%"],
          }}
          transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 text-white text-center max-w-md"
        >
          <motion.div
            animate={{
              y: [0, -10, 0],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="mb-8"
          >
            <div className="w-48 h-48 mx-auto bg-white/10 backdrop-blur-sm rounded-3xl p-8 flex items-center justify-center">
              <img src={logoIcon} alt="kurikula" className="w-32 h-32" />
            </div>
          </motion.div>
          
          <h1 className="text-4xl font-bold mb-4">Keamanan Akun Anda</h1>
          <p className="text-lg text-white/90">
            Pastikan password baru Anda kuat, unik, dan mudah Anda ingat untuk melindungi data mengajar Anda.
          </p>
        </motion.div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white h-full overflow-hidden">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg max-h-full flex flex-col py-6 px-6 overflow-hidden"
        >
          {/* Header */}
          <div className="mb-6 flex-shrink-0">
            <div className="flex items-center gap-3 mb-6">
              <img src={logoWithText} alt="kurikula" className="h-10" />
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Atur Ulang Password</h2>
            <p className="text-gray-600 text-sm">Masukkan password baru untuk akun Anda</p>
          </div>

          {success ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center p-8 bg-emerald-50 border border-emerald-100 rounded-[12px] text-emerald-800 space-y-4 w-full"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2 text-emerald-900">Password Berhasil Diubah</h3>
                <p className="text-sm text-emerald-700">
                  Password baru Anda telah berhasil disimpan. Anda akan diarahkan ke halaman masuk dalam beberapa detik...
                </p>
              </div>
              <Link 
                to="/login"
                className="w-full py-3 bg-[#3C405B] hover:bg-[#3C405B]/90 text-white font-medium rounded-[12px] text-center transition-colors text-sm"
              >
                Masuk Sekarang
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleResetPassword} className="flex flex-col min-h-0 overflow-hidden">
              <div className="overflow-y-auto px-2 pr-2 space-y-5 py-2 min-h-0">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-[12px] text-red-700"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                  </motion.div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password Baru
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Konfirmasi Password Baru
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Masukkan kembali password baru"
                      className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 flex-shrink-0 bg-white space-y-4">
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#3C405B] hover:bg-[#3C405B]/90 text-white font-medium rounded-[12px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer"
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.99 }}
                >
                  {loading ? "Menyimpan..." : "Simpan Password Baru"}
                </motion.button>

                <p className="text-center text-xs text-gray-500 pt-1">
                  Ingat password Anda?{" "}
                  <Link to="/login" className="text-[#DF7A5E] hover:text-[#DF7A5E]/80 font-medium">
                    Masuk Sekarang
                  </Link>
                </p>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
