import { Link } from "react-router";
import { ArrowLeft, FileText, CheckCircle, Scale, AlertTriangle, ShieldAlert, Mail } from "lucide-react";
import logoWithText from "../../assets/kurikula.png";

export default function TermsOfService() {
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
            <FileText className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Syarat & Ketentuan Layanan
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
              <CheckCircle className="w-5 h-5" />
              <h2 className="text-xl font-bold text-gray-900">1. Penerimaan Syarat</h2>
            </div>
            <p className="text-gray-600 leading-relaxed text-sm md:text-base">
              Dengan mengakses dan menggunakan platform <strong>Kurikula</strong>, Anda menyatakan bahwa Anda telah membaca, memahami, dan menyetujui untuk terikat oleh Syarat dan Ketentuan Layanan ini. Jika Anda tidak menyetujui bagian mana pun dari ketentuan ini, Anda tidak diperkenankan menggunakan platform kami.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <FileText className="w-5 h-5" />
              <h2 className="text-xl font-bold text-gray-900">2. Deskripsi Layanan</h2>
            </div>
            <p className="text-gray-600 leading-relaxed text-sm md:text-base">
              Kurikula menyediakan platform berbasis web yang dirancang untuk membantu pendidik dan instansi sekolah dalam menyusun Rencana Pelaksanaan Pembelajaran (RPP/Modul Ajar) dengan dukungan Kecerdasan Buatan (AI), merencanakan kurikulum semester, mencatat presensi siswa, mengelola penilaian, dan mengintegrasikannya dengan Google Sheets untuk kemudahan penyimpanan administrasi mandiri.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <Scale className="w-5 h-5" />
              <h2 className="text-xl font-bold text-gray-900">3. Pendaftaran Akun & Keamanan</h2>
            </div>
            <p className="text-gray-600 leading-relaxed text-sm md:text-base">
              Untuk mengakses beberapa fitur platform, Anda diharuskan mendaftar akun langsung atau menggunakan layanan OAuth (Masuk dengan Google). Anda bertanggung jawab penuh untuk menjaga kerahasiaan informasi akun dan kata sandi Anda. Anda juga menyetujui untuk segera memberitahukan kami atas setiap penggunaan tidak sah dari akun Anda.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="text-xl font-bold text-gray-900">4. Ketentuan Penggunaan Google API</h2>
            </div>
            <p className="text-gray-600 leading-relaxed text-sm md:text-base">
              Layanan kami menyediakan opsi integrasi dengan Google Sheets untuk menyimpan dan mensinkronisasikan draf modul ajar serta daftar presensi siswa Anda. Saat menggunakan fitur ini:
            </p>
            <ul className="list-disc list-inside pl-4 text-gray-600 space-y-2 text-sm md:text-base">
              <li>Anda memberikan izin kepada Kurikula untuk mengakses akun Google Drive Anda guna membuat, membaca, dan memperbarui spreadsheet spesifik yang digunakan oleh platform.</li>
              <li>Akses ini murni berjalan di latar depan/belakang berdasarkan permintaan dan aktivitas ekspor/simpan yang Anda lakukan secara sadar dalam aplikasi.</li>
              <li>Kami mematuhi penuh <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google API Services User Data Policy</a> dalam mengelola data autentikasi Anda.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <ShieldAlert className="w-5 h-5" />
              <h2 className="text-xl font-bold text-gray-900">5. Pembatasan Tanggung Jawab</h2>
            </div>
            <p className="text-gray-600 leading-relaxed text-sm md:text-base">
              Kurikula disediakan "sebagaimana adanya" dan "sebagaimana tersedia" tanpa jaminan dalam bentuk apa pun. Kami tidak menjamin bahwa asisten AI akan selalu menghasilkan konten akademis yang 100% sempurna tanpa revisi. Guru dan pendidik disarankan untuk meninjau kembali setiap hasil draf modul ajar yang dibuat oleh asisten AI sebelum diaplikasikan di ruang kelas.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <Mail className="w-5 h-5" />
              <h2 className="text-xl font-bold text-gray-900">6. Kontak Kami</h2>
            </div>
            <p className="text-gray-600 leading-relaxed text-sm md:text-base">
              Apabila terdapat ketidakjelasan atau perselisihan mengenai Syarat & Ketentuan Layanan ini, Anda dapat menghubungi tim kami di:
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
                Hubungi Kami <Mail className="w-3.5 h-3.5" />
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
