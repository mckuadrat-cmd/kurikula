import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { motion } from "motion/react";
import { Mail, Lock, User as UserIcon, Building2, Phone, AlertCircle, CheckCircle, Eye, EyeOff, X, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import logoWithText from "../../assets/kurikula.png";
import logoIcon from "../../assets/LOGO.png";

export default function SignUp() {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    whatsapp: "",
    password: "",
    confirmPassword: "",
    school: "",
    schoolCode: "",
  });

  const [countryCode, setCountryCode] = useState("+62");
  const [whatsappInput, setWhatsappInput] = useState("");

  const [subjectsList, setSubjectsList] = useState<{ id: string; name: string }[]>([]);
  const [newSubjectInput, setNewSubjectInput] = useState("");

  const handleAddSubject = () => {
    const val = newSubjectInput.trim();
    if (!val) return;
    const capitalized = val.charAt(0).toUpperCase() + val.slice(1);
    const id = `MP-${capitalized.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`;
    if (subjectsList.some(s => s.id === id)) {
      setError("Mata pelajaran sudah terdaftar.");
      return;
    }
    setSubjectsList([...subjectsList, { id, name: capitalized }]);
    setNewSubjectInput("");
  };

  const handleDeleteSubject = (id: string) => {
    setSubjectsList(subjectsList.filter(s => s.id !== id));
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // State for username check
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");

  useEffect(() => {
    const username = formData.username.trim().toLowerCase();

    if (!username) {
      setUsernameStatus("idle");
      return;
    }

    if (username.length < 3) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");
    const delayDebounceFn = setTimeout(async () => {
      try {
        const resCheck = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/resolve-username`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ username }),
          }
        );

        if (resCheck.ok) {
          const checkData = await resCheck.json();
          if (checkData.email) {
            setUsernameStatus("taken");
          } else {
            setUsernameStatus("available");
          }
        } else {
          setUsernameStatus("idle");
        }
      } catch (err) {
        console.error("Gagal memeriksa keunikan username:", err);
        setUsernameStatus("idle");
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [formData.username]);

  const translateAuthError = (message: string): string => {
    if (!message) return "Terjadi kesalahan. Silakan coba lagi.";
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes("email already registered") || lowerMsg.includes("user already exists")) {
      return "Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.";
    }
    if (lowerMsg.includes("password should be at least")) {
      return "Password minimal terdiri dari 6 karakter.";
    }
    if (lowerMsg.includes("network error") || lowerMsg.includes("failed to fetch")) {
      return "Koneksi jaringan terganggu. Silakan periksa internet Anda.";
    }
    if (lowerMsg.includes("too many requests") || lowerMsg.includes("rate limit")) {
      return "Terlalu banyak permintaan masuk. Silakan coba lagi nanti.";
    }

    return message;
  };

  // Auto-generate school code on component mount
  useEffect(() => {
    const randomCode = "SKL-" + Math.random().toString(36).substring(2, 7).toUpperCase();
    setFormData((prev) => ({ ...prev, schoolCode: randomCode }));
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Konfirmasi password tidak cocok");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    if (subjectsList.length === 0) {
      setError("Harap tambahkan minimal satu mata pelajaran");
      return;
    }

    if (usernameStatus === "taken") {
      setError("Username sudah digunakan oleh pengguna lain.");
      return;
    }

    if (usernameStatus === "invalid") {
      setError("Username minimal 3 karakter.");
      return;
    }

    if (usernameStatus === "checking") {
      setError("Sedang memeriksa ketersediaan username...");
      return;
    }

    setLoading(true);

    try {
      // Pengecekan keunikan username
      try {
        const usernameTrimmed = formData.username.trim().toLowerCase();
        if (!usernameTrimmed) {
          setError("Username wajib diisi.");
          setLoading(false);
          return;
        }

        const resCheck = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/make-server-84c63b2a/resolve-username`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ username: usernameTrimmed }),
          }
        );

        if (resCheck.ok) {
          const checkData = await resCheck.json();
          if (checkData.email) {
            setError("Username sudah digunakan oleh pengguna lain.");
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Gagal memeriksa keunikan username:", err);
      }

      const whatsappFull = countryCode + whatsappInput.trim().replace(/^0+/, "");
      const { error } = await signUp(formData.email, formData.password, formData.name, {
        username: formData.username.trim().toLowerCase(),
        whatsapp: whatsappFull,
        school: formData.school,
        schoolCode: formData.schoolCode,
        subjects: JSON.stringify(subjectsList),
      });

      if (error) {
        setError(translateAuthError(error.message));
      } else {
        setSuccess(true);
        setTimeout(() => {
          navigate("/login");
        }, 2500);
      }
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      console.error("Sign up error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    setLoading(true);

    try {
      const { error } = await signInWithGoogle();

      if (error) {
        setError(translateAuthError(error.message));
      }
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      console.error("Google signup error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#3C405B] via-[#DF7A5E] to-[#F0EAC6] p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[24px] p-10 text-center max-w-md shadow-2xl border border-gray-100"
        >
          <div className="w-20 h-20 bg-[#DF7A5E]/10 rounded-full flex items-center justify-center mx-auto mb-6 text-[#DF7A5E]">
            <Mail className="w-10 h-10 animate-bounce" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Verifikasi Email Anda</h2>
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">
            Link verifikasi telah dikirim ke <strong className="text-gray-900">{formData.email}</strong>.
            Silakan periksa kotak masuk atau folder spam Anda untuk mengaktifkan akun sebelum masuk.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => navigate("/login")}
              className="w-full py-3 bg-[#3C405B] hover:bg-[#3C405B]/90 text-white font-medium rounded-[12px] transition-colors text-sm shadow-md cursor-pointer"
            >
              Lanjut ke Halaman Login
            </button>
            <button
              onClick={() => setSuccess(false)}
              className="w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 font-medium rounded-[12px] transition-colors text-sm cursor-pointer"
            >
              Kembali ke Registrasi
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

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

          <h1 className="text-4xl font-bold mb-4">Bergabung dengan kurikula</h1>
          <p className="text-lg text-white/90">
            Mulai transformasi digital pembelajaran Anda bersama ribuan guru di Indonesia.
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

      {/* Right Side - Sign Up Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white h-full overflow-hidden">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg max-h-full flex flex-col py-4 px-6 overflow-hidden"
        >
          {/* Header */}
          <div className="mb-4 flex-shrink-0">
            <div className="flex items-center gap-3 mb-4">
              <img src={logoWithText} alt="kurikula" className="h-10" />
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-1">Buat Akun Baru</h2>
            <p className="text-gray-600 text-sm">Daftar untuk mengakses semua fitur AI</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignUp} className="flex flex-col min-h-0 overflow-hidden">
            {/* Form Inputs wrapper */}
            <div className="overflow-y-auto px-2 pr-2 space-y-4 py-2 min-h-0">
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
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nama lengkap Anda"
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-bold">@</span>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, "") })}
                    placeholder="username_anda"
                    className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  />
                  {/* Status Indicator */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                    {usernameStatus === "checking" && (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    )}
                    {usernameStatus === "available" && (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    )}
                    {usernameStatus === "taken" && (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    {usernameStatus === "invalid" && (
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                    )}
                  </div>
                </div>
                {/* Status messages */}
                {usernameStatus === "available" && (
                  <p className="text-xs text-emerald-600 mt-1 font-semibold flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Username tersedia
                  </p>
                )}
                {usernameStatus === "taken" && (
                  <p className="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    Username sudah digunakan
                  </p>
                )}
                {usernameStatus === "invalid" && formData.username.trim().length > 0 && (
                  <p className="text-xs text-orange-600 mt-1 font-medium">
                    Minimal 3 karakter (huruf kecil, angka, _, -, .)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="guru@sekolah.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  No Whatsapp
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-shrink-0">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="h-[42px] px-3 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold cursor-pointer text-gray-700"
                    >
                      <option value="+62">🇮🇩 +62</option>
                      <option value="+60">🇲🇾 +60</option>
                      <option value="+65">🇸🇬 +65</option>
                      <option value="+61">🇦🇺 +61</option>
                      <option value="+1">🇺🇸 +1</option>
                    </select>
                  </div>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={whatsappInput}
                      onChange={(e) => setWhatsappInput(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="81234567890"
                      className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Asal Sekolah
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.school}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                    placeholder="SMA Negeri 1 Jakarta"
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Mata Pelajaran yang Diampu
                </label>

                {/* Badge List */}
                <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 border border-gray-200 rounded-[12px] min-h-[42px] items-center">
                  {subjectsList.length === 0 ? (
                    <span className="text-gray-400 text-xs italic pl-1">Belum ada mata pelajaran</span>
                  ) : (
                    subjectsList.map((sub) => (
                      <span
                        key={sub.id}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-full text-xs font-semibold"
                      >
                        {sub.name}
                        <button
                          type="button"
                          onClick={() => handleDeleteSubject(sub.id)}
                          className="hover:text-red-500 font-bold focus:outline-none cursor-pointer"
                        >
                          <X className="w-3 h-3 ml-1" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Input Add */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubjectInput}
                    onChange={(e) => setNewSubjectInput(e.target.value)}
                    placeholder="Contoh: Matematika (Bisa Lebih Dari 1)"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSubject();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddSubject}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Tambah
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                    Konfirmasi
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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
                {loading ? "Memproses..." : "Daftar Sekarang"}
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
                onClick={handleGoogleSignUp}
                disabled={loading}
                className="w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-[12px] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer"
                whileHover={{ scale: loading ? 1 : 1.01 }}
                whileTap={{ scale: loading ? 1 : 0.99 }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Daftar dengan Google
              </motion.button>

              <p className="text-center text-xs text-gray-500 pt-1">
                Sudah punya akun?{" "}
                <Link to="/login" className="text-[#DF7A5E] hover:text-[#DF7A5E]/80 font-medium">
                  Masuk di sini
                </Link>
              </p>

              <div className="flex justify-center gap-3 text-[10px] text-gray-400 mt-2 border-t border-gray-150 pt-3">
                <Link to="/privacy-policy" className="hover:text-[#DF7A5E] transition-colors">Kebijakan Privasi</Link>
                <span>•</span>
                <Link to="/terms-of-service" className="hover:text-[#DF7A5E] transition-colors">Syarat & Ketentuan</Link>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}