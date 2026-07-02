import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { motion } from "motion/react";
import { Mail, Lock, AlertCircle, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import logoWithText from "../../assets/kurikula.png";
import logoIcon from "../../assets/LOGO.png";

export default function Login() {
  const navigate = useNavigate();
  const { signInWithEmail, signInWithGoogle, resetPasswordForEmail } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await resetPasswordForEmail(forgotEmail.trim());
      if (error) {
        setError(translateAuthError(error.message));
      } else {
        setResetEmailSent(true);
        toast.success("Link atur ulang password telah dikirim ke email Anda.");
      }
    } catch (err: any) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      console.error("Forgot password error:", err);
    } finally {
      setLoading(false);
    }
  };

  const translateAuthError = (message: string): string => {
    if (!message) return "Terjadi kesalahan. Silakan coba lagi.";
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes("invalid login credentials") || lowerMsg.includes("invalid credentials")) {
      return "Email atau password salah. Silakan periksa kembali.";
    }
    if (lowerMsg.includes("email not confirmed")) {
      return "Email Anda belum dikonfirmasi. Silakan periksa kotak masuk email Anda.";
    }
    if (lowerMsg.includes("user not found")) {
      return "Akun dengan email ini tidak terdaftar.";
    }
    if (lowerMsg.includes("network error") || lowerMsg.includes("failed to fetch")) {
      return "Koneksi jaringan terganggu. Silakan periksa internet Anda.";
    }
    if (lowerMsg.includes("too many requests") || lowerMsg.includes("rate limit")) {
      return "Terlalu banyak permintaan masuk. Silakan coba lagi nanti.";
    }
    
    return message;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let loginEmail = emailOrUsername.trim();

      // Jika tidak mengandung '@', diasumsikan sebagai username
      if (!loginEmail.includes("@")) {
        try {
          const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/resolve-username`,
            {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
              },
              body: JSON.stringify({ username: loginEmail.toLowerCase() }),
            }
          );
          if (!res.ok) {
            throw new Error("Username tidak ditemukan.");
          }
          const data = await res.json();
          if (!data.email) {
            throw new Error("Username tidak ditemukan.");
          }
          loginEmail = data.email;
        } catch (err: any) {
          setError(err.message || "Username tidak ditemukan.");
          setLoading(false);
          return;
        }
      }

      const { error } = await signInWithEmail(loginEmail, password);
      
      if (error) {
        setError(translateAuthError(error.message));
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const { error } = await signInWithGoogle();
      
      if (error) {
        setError(translateAuthError(error.message));
      }
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      console.error("Google login error:", err);
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
          
          <h1 className="text-4xl font-bold mb-4">Selamat Datang di kurikula</h1>
          <p className="text-lg text-white/90">
            Platform AI terlengkap untuk membantu guru dalam mengajar, mengelola siswa, dan merencanakan pembelajaran dengan mudah.
          </p>
          
          <div className="mt-12 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold">5,000+</div>
              <div className="text-sm text-white/80">Guru Aktif</div>
            </div>
            <div>
              <div className="text-3xl font-bold">500+</div>
              <div className="text-sm text-white/80">Sekolah</div>
            </div>
            <div>
              <div className="text-3xl font-bold">1 Menit</div>
              <div className="text-sm text-white/80">Generate RPP</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Login Form */}
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
            
            {isForgotPassword ? (
              <>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Lupa Password?</h2>
                <p className="text-gray-600 text-sm">Masukkan email Anda untuk menerima link atur ulang password</p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Masuk ke Dashboard</h2>
                <p className="text-gray-600 text-sm">Kelola pembelajaran Anda dengan AI</p>
              </>
            )}
          </div>

          {isForgotPassword ? (
            /* Forgot Password Form */
            <form onSubmit={handleForgotPassword} className="flex flex-col min-h-0 overflow-hidden">
              {/* Form Inputs wrapper */}
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

                {resetEmailSent ? (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center text-center p-6 bg-emerald-50 border border-emerald-100 rounded-[12px] text-emerald-800"
                  >
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                      <Mail className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">Email Pemulihan Terkirim</h3>
                    <p className="text-sm text-emerald-700 mb-4">
                      Kami telah mengirimkan instruksi atur ulang password ke:
                      <br />
                      <strong>{forgotEmail}</strong>
                    </p>
                    <p className="text-xs text-emerald-600">
                      Silakan periksa kotak masuk atau folder spam email Anda.
                    </p>
                  </motion.div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Terdaftar
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="nama@sekolah.com"
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Fixed Action Area */}
              <div className="pt-4 mt-4 border-t border-gray-100 flex-shrink-0 bg-white space-y-4">
                {!resetEmailSent && (
                  <motion.button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#3C405B] hover:bg-[#3C405B]/90 text-white font-medium rounded-[12px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer"
                    whileHover={{ scale: loading ? 1 : 1.01 }}
                    whileTap={{ scale: loading ? 1 : 0.99 }}
                  >
                    {loading ? "Mengirim..." : "Kirim Link Atur Ulang"}
                  </motion.button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError("");
                    setResetEmailSent(false);
                  }}
                  className="w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-[12px] transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Kembali ke Login
                </button>
              </div>
            </form>
          ) : (
            /* Standard Login Form */
            <form onSubmit={handleLogin} className="flex flex-col min-h-0 overflow-hidden">
              {/* Form Inputs wrapper */}
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
                    Email atau Username
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={emailOrUsername}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                      placeholder="guru@sekolah.com atau username"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError("");
                        setResetEmailSent(false);
                      }}
                      className="text-xs text-[#DF7A5E] hover:text-[#DF7A5E]/80 font-medium cursor-pointer"
                    >
                      Lupa Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
              </div>

              {/* Fixed Action Area */}
              <div className="pt-4 mt-4 border-t border-gray-100 flex-shrink-0 bg-white space-y-4">
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#3C405B] hover:bg-[#3C405B]/90 text-white font-medium rounded-[12px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer"
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.99 }}
                >
                  {loading ? "Memproses..." : "Masuk ke Dashboard"}
                </motion.button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-4 bg-white text-gray-500">atau</span>
                  </div>
                </div>

                <motion.button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-[12px] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer"
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.99 }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Masuk dengan Google
                </motion.button>

                <p className="text-center text-xs text-gray-500 pt-1">
                  Belum punya akun?{" "}
                  <Link to="/signup" className="text-[#DF7A5E] hover:text-[#DF7A5E]/80 font-medium">
                    Daftar Sekarang
                  </Link>
                </p>

                <div className="flex justify-center gap-3 text-[10px] text-gray-400 mt-2 border-t border-gray-150 pt-3">
                  <Link to="/privacy-policy" className="hover:text-[#DF7A5E] transition-colors">Kebijakan Privasi</Link>
                  <span>•</span>
                  <Link to="/terms-of-service" className="hover:text-[#DF7A5E] transition-colors">Syarat & Ketentuan</Link>
                </div>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}