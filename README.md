# Kurikula (MCKUADRAT) - AI-Powered Teacher Dashboard

Kurikula adalah platform dashboard pendidikan pintar berbasis AI yang dirancang khusus untuk membantu guru mengotomatiskan dan mempermudah berbagai tugas administrasi, perencanaan pengajaran, penyusunan bahan ajar, serta asesmen siswa secara efisien.

Aplikasi ini menggunakan **Google Drive & Google Sheets sebagai database utama (backend)** untuk menyimpan data siswa, presensi, penilaian, dan dokumen administrasi, serta memanfaatkan **Gemini API (Flash & Pro)** untuk mendukung fungsionalitas AI generatif melalui arsitektur **AI Skills**.

---

## 🚀 Fitur Utama

### 1. Autentikasi, Akun, & Ruang Kerja (Workspace)
*   **Landing Page**: Tampilan premium yang memuat informasi fitur utama, alur kerja, dan skema paket langganan.
*   **Pendaftaran & Login**: Mendukung registrasi/masuk secara tradisional (email/password) dan sosial login menggunakan **Google OAuth (Supabase Auth)**.
*   **Multi-Workspace**: Kemampuan mengelola dan berpindah antar-workspace sekolah secara fleksibel.
*   **Kredit AI & Tingkatan Paket**: Validasi dinamis sisa kredit di dashboard dan pembatasan model AI berdasarkan tingkatan paket pengguna (Trial, Basic, Pro, Premium, School).

### 2. Integrasi Google Drive & Google Sheets Database
*   **Auto-Creation Database**: Secara otomatis mendeteksi atau membuat folder khusus `kurikula-{userId}` dan file spreadsheet `Kurikula_Database` di Google Drive pengguna.
*   **Auto-Inisialisasi Tab**: Membuat tab spreadsheet wajib (`Siswa`, `Absensi`, `Penilaian`, `Konfigurasi`, dan `Dokumen`) lengkap dengan kolom header saat pertama kali dihubungkan.
*   **Manajemen Token Otomatis**: Mendukung pembaruan token secara sunyi (*silent renewal*) tanpa menginterupsi alur kerja guru.

### 3. CRUD Data Pendidikan Berbasis Google Sheets
*   **Data Siswa**: Manajemen lengkap (tambah, edit, hapus, filter, dan cari) yang tersinkronisasi langsung ke Google Sheets.
*   **Presensi & Absensi**: Perekaman dan pemuatan data kehadiran harian berdasarkan kelas dan tanggal secara real-time.
*   **Perpustakaan Administrasi**: Menyimpan dan mencari dokumen administratif guru yang tersimpan di cloud database.

### 4. Alur Perencanaan Semester & Manajemen Ujian
*   **Semester Planner**: Perencanaan detail pertemuan per semester dengan alur transfer data otomatis (*state transfer*) untuk pembuatan RPP atau Soal.
*   **Bank Soal**: Repositori soal yang dapat difilter berdasarkan mata pelajaran, kelas, dan level kognitif (C1-C6).
*   **Paket Ujian & LJK**: Pembuatan paket soal dan penyiapan Lembar Jawaban Komputer (LJK) yang siap dicetak (printable).

### 5. Koreksi Jawaban & Analisis Butir Soal (Deterministik)
*   **Input Jawaban Fleksibel**: Mendukung input manual atau salin-tempel (paste) data CSV nilai siswa.
*   **Koreksi Otomatis & KKTP**: Penilaian otomatis yang membagi siswa ke kelompok Tuntas/Belum Tuntas berdasarkan Kriteria Ketercapaian Tujuan Pembelajaran (KKTP).
*   **Analisis Butir Soal**: Statistik performa soal (tingkat kesulitan, efektivitas distraktor, persentase benar per nomor) tanpa melibatkan AI (kalkulasi murni deterministik).

### 6. Generator & Asisten Berbasis AI (AI Layer)
*   **AI Lesson Planner**: Membuat draf Modul Ajar (RPP) lengkap standar nasional.
*   **AI Teaching Materials & LKPD**: Pembuatan bahan ajar, konsep pembelajaran, miskonsepsi, beserta Lembar Kerja Peserta Didik (LKPD) lengkap dengan rubrik.
*   **AI Assessment & Soal**: Menghasilkan soal pilihan ganda atau uraian beserta kunci dan pembahasan.
*   **AI Analisis Hasil Belajar & Remedial/Pengayaan**: Rekomendasi strategi pengajaran kelas serta program tindak lanjut siswa.
*   **AI Komentar Rapor Massal**: Pembuatan komentar rapor otomatis yang spesifik untuk siswa dan orang tua.

---

## 🛠️ Teknologi yang Digunakan

*   **Framework Frontend**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **Bundler & Build Tool**: [Vite](https://vite.dev/)
*   **Desain & Styling**: [TailwindCSS v4](https://tailwindcss.com/) & [Radix UI Primitives](https://www.radix-ui.com/)
*   **Visualisasi Data**: [Recharts](https://recharts.org/)
*   **Animasi**: [Framer Motion](https://www.framer.com/motion/)
*   **Integrasi Database**: [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction) & [Google API Client](https://developers.google.com/sheets/api)

---

## 💻 Cara Menjalankan Aplikasi Secara Lokal

### 1. Prasyarat (Prerequisites)
Pastikan Anda sudah menginstal [Node.js](https://nodejs.org/) (versi LTS direkomendasikan) di komputer Anda.

### 2. Kloning Repositori & Instal Dependensi
Masuk ke direktori proyek dan instal seluruh pustaka yang dibutuhkan:
```bash
npm install
# atau menggunakan pnpm
pnpm install
```

### 3. Konfigurasi Environment Variables
Salin file `.env.example` menjadi `.env.local` dan lengkapi nilai variabel berikut:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_MIDTRANS_CLIENT_KEY=your_midtrans_client_key
VITE_API_URL=your_backend_api_url
```

### 4. Jalankan Server Pengembangan
Jalankan perintah berikut untuk membuka server lokal:
```bash
npm run dev
```
Buka peramban (browser) Anda dan akses alamat `http://localhost:5173`.

### 5. Kompilasi Produksi (Production Build)
Untuk membangun versi produksi aplikasi, jalankan:
```bash
npm run build
```

---

## 📁 Struktur Direktori Penting

```text
kurikula/
├── src/
│   ├── app/
│   │   ├── components/      # Komponen UI modular reusable
│   │   ├── pages/           # Halaman utama aplikasi (Dashboard, Planner, dsb.)
│   │   └── routes.ts        # Definisi rute navigasi
│   ├── contexts/            # React Context (WorkspaceContext, AuthContext, dll.)
│   ├── lib/                 # Integrasi API client & Utility fungsi (Supabase, Google Sheets)
│   ├── styles/              # Global styles & konfigurasi Tailwind
│   └── main.tsx             # Entry point aplikasi
├── supabase/                # Konfigurasi & Edge Functions Supabase (AI Layer, Auth, dsb.)
├── FITUR_CHECKLIST.md       # Panduan pengetesan & daftar centang fitur
├── AI_SKILL_ARCHITECTURE.md # Dokumentasi sistem AI Skill & Kredit
└── GOOGLE_AUTH_SETUP.md     # Panduan setup Google OAuth API
```

---

## 📖 Rujukan Dokumentasi
*   Untuk mengetahui detail alur pengujian manual seluruh fitur, baca [FITUR_CHECKLIST.md](file:///d:/Buildapps/kurikula/FITUR_CHECKLIST.md).
*   Untuk memahami cara kerja modul AI, biaya kredit, dan penambahan skill baru, baca [AI_SKILL_ARCHITECTURE.md](file:///d:/Buildapps/kurikula/AI_SKILL_ARCHITECTURE.md).
*   For setup Google OAuth API, baca [GOOGLE_AUTH_SETUP.md](file:///d:/Buildapps/kurikula/GOOGLE_AUTH_SETUP.md).