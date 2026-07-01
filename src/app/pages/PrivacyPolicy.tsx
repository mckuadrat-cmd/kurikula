import { Link } from "react-router";
import { ArrowLeft, Shield, Lock, FileText, Mail, Globe, Eye } from "lucide-react";
import logoWithText from "../../assets/kurikula.png";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Decorative very subtle gradient backgrounds */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-50/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-purple-50/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={logoWithText} alt="Kurikula Logo" className="h-8" />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 text-xs md:text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-xl border border-gray-200"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
          </Link>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-20 relative z-10">
        {/* Title Section */}
        <div className="text-center mb-16">
          <div className="inline-flex p-3 bg-blue-50 border border-blue-100 rounded-2xl mb-4 text-blue-600">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Kebijakan Privasi
          </h1>
          <p className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto">
            Terakhir diperbarui: {new Date("2026-06-29").toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white border border-gray-150 rounded-3xl p-6 md:p-10 shadow-lg space-y-10">
          
          {/* Section 1 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <Eye className="w-5 h-5" />
              <h2 className="text-xl font-bold text-gray-900">1. Pendahuluan</h2>
            </div>
            <p className="text-gray-600 leading-relaxed text-sm md:text-base">
              Selamat datang di <strong>Kurikula</strong>. Kami berkomitmen untuk melindungi privasi data pribadi Anda saat menggunakan layanan kami. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi informasi Anda sehubungan dengan penggunaan aplikasi Kurikula dan integrasi pihak ketiga, termasuk Google Cloud Console / Google API Services.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <FileText className="w-5 h-5" />
              <h2 className="text-xl font-bold text-gray-900">2. Informasi yang Kami Kumpulkan</h2>
            </div>
            <p className="text-gray-600 leading-relaxed text-sm md:text-base">
              Kami mengumpulkan informasi untuk memberikan layanan manajemen kurikulum, administrasi, dan asisten AI yang lebih baik kepada seluruh pengguna kami. Jenis informasi yang kami kumpulkan meliputi:
            </p>
            <ul className="list-disc list-inside pl-4 text-gray-600 space-y-2 text-sm md:text-base">
              <li>
                <strong className="text-gray-900 font-semibold">Informasi Akun Google:</strong> Ketika Anda masuk ke Kurikula menggunakan layanan Masuk dengan Google (Google OAuth), kami meminta izin untuk mengakses nama Anda, alamat email, dan foto profil Anda.
              </li>
              <li>
                <strong className="text-gray-900 font-semibold">Data Google Sheets (Opsional):</strong> Jika Anda mengaktifkan fitur integrasi Google Sheets, kami meminta izin akses OAuth untuk membaca dan menulis data spreadsheet di Google Drive Anda. Izin ini diperlukan agar aplikasi dapat secara otomatis menyimpan data administrasi kelas, modul ajar, presensi, dan nilai siswa langsung ke akun Google Sheets pribadi Anda.
              </li>
              <li>
                <strong className="text-gray-900 font-semibold">Data Pengguna & Preferensi:</strong> Data yang Anda input secara manual di dalam aplikasi, seperti nama sekolah, kelas, nama siswa, materi pelajaran, dan rancangan kurikulum.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <Globe className="w-5 h-5" />
              <h2 className="text-xl font-bold text-gray-900">3. Integrasi Layanan Google (Google API Services)</h2>
            </div>
            <p className="text-gray-600 leading-relaxed text-sm md:text-base">
              Penggunaan dan pemindahan informasi dari Kurikula ke aplikasi Google API lainnya akan mematuhi kebijakan data pengguna Google API Services (<a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">Google API Services User Data Policy<span className="sr-only">(opens in new tab)</span></a>), termasuk ketentuan Penggunaan Terbatas (Limited Use).
            </p>
            <p className="text-gray-600 leading-relaxed text-sm md:text-base">
              Kami tidak membagikan atau menjual data Google Sheets Anda ke pihak ketiga. Data spreadsheet tersebut sepenuhnya berada di bawah kepemilikan Anda dan disimpan langsung di Google Drive Anda. Kurikula hanya melakukan pembacaan dan penulisan terarah sesuai dengan instruksi serta interaksi Anda di dalam platform Kurikula.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <Lock className="w-5 h-5" />
              <h2 className="text-xl font-bold text-gray-900">4. Keamanan & Penyimpanan Data</h2>
            </div>
            <p className="text-gray-600 leading-relaxed text-sm md:text-base">
              Privasi dan keamanan data Anda adalah prioritas utama kami. Kami menerapkan langkah-langkah keamanan teknis dan organisasional yang kuat untuk melindungi data Anda dari akses tanpa izin, perubahan, pengungkapan, atau pemusnahan yang tidak sah. Data akun dan preferensi Anda disimpan menggunakan basis data terenkripsi yang aman (Supabase).
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <Mail className="w-5 h-5" />
              <h2 className="text-xl font-bold text-gray-900">5. Hak Pengguna</h2>
            </div>
            <p className="text-gray-600 leading-relaxed text-sm md:text-base">
              Anda berhak untuk mengakses, memperbarui, membatasi, atau menghapus informasi pribadi Anda kapan saja. Anda juga dapat mencabut akses integrasi Google API (Google Sheets) melalui halaman pengaturan keamanan akun Google Anda di <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Security Settings</a>.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <Shield className="w-5 h-5" />
              <h2 className="text-xl font-bold text-gray-900">6. Kontak Kami</h2>
            </div>
            <p className="text-gray-600 leading-relaxed text-sm md:text-base">
              Jika Anda memiliki pertanyaan mengenai Kebijakan Privasi ini atau pengelolaan data di Kurikula, Anda dapat menghubungi kami melalui:
            </p>
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-150 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Email Dukungan</p>
                <p className="text-sm font-semibold text-gray-800">mckuadratid@gmail.com</p>
              </div>
              <a
                href="mailto:mckuadratid@gmail.com"
                className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors px-4 py-2.5 rounded-xl flex items-center gap-2"
              >
                Kirim Email <Mail className="w-3.5 h-3.5" />
              </a>
            </div>
          </section>

        </div>
      </main>

      {/* Mini Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-gray-400 text-xs mt-12 bg-gray-50">
        <p>&copy; {new Date().getFullYear()} Kurikula. Hak Cipta Dilindungi.</p>
      </footer>
    </div>
  );
}
