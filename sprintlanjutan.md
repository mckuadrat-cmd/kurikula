Saya ingin merapikan dan mengembangkan halaman:
- AITeachingMaterials.tsx
- Assessment.tsx

Tujuan sprint:
1. Menghapus duplikasi fitur “Bank Soal” di halaman Bahan Ajar.
2. Mengubah Assessment menjadi workflow penilaian lengkap seperti konsep EvalBee, tetapi versi Kurikula.
3. Bank Soal tidak lagi menjadi generator, tetapi repository soal.
4. Penilaian tidak hanya membuat soal, tetapi mendukung guru dari membuat soal sampai analisis nilai dan tindak lanjut.

PENTING:
Jangan membuat fitur scan kamera / OMR dulu.
Jangan meniru brand EvalBee.
Ambil konsep workflow penilaiannya saja:
Buat Soal → LJK → Input Jawaban → Koreksi Otomatis → Analisis Nilai → Remedial/Pengayaan.

==================================================
BAGIAN 1 — PERBAIKI HALAMAN BAHAN AJAR
==================================================

File:
- AITeachingMaterials.tsx

Tugas:

1. Hapus fitur/menu/tab “Bank Soal” dari halaman Bahan Ajar.
Bank Soal tidak boleh berada di halaman Bahan Ajar.

2. Halaman Bahan Ajar hanya fokus pada kebutuhan mengajar:
- Bahan Ajar
- LKPD
- Aktivitas Pembelajaran
- Pertanyaan Pemantik
- Presentasi/PPT jika sudah ada
- Praktikum/Eksperimen jika sudah ada

3. Jika ada logic generate soal di AITeachingMaterials.tsx, pindahkan ke Assessment.tsx atau hapus jika sudah ada fitur serupa di Assessment.

4. Pastikan tidak ada dua tombol yang sama-sama menghasilkan soal dengan nama berbeda.

5. Ubah copywriting halaman:
Dari:
“AI Bahan Ajar & Bank Soal”
Menjadi:
“Bahan Ajar & Aktivitas Pembelajaran”

6. Struktur mental halaman:
Mengajar, bukan menilai.

==================================================
BAGIAN 2 — REDESIGN HALAMAN ASSESSMENT
==================================================

File:
- Assessment.tsx

Ubah halaman Assessment menjadi dashboard workflow penilaian.

Layout utama harus terdiri dari 3 kelompok besar:

A. Persiapan Penilaian
- Buat Soal
- Kisi-Kisi
- Rubrik
- Bank Soal

B. Pelaksanaan Penilaian
- Paket Ujian
- Generate LJK
- Input Jawaban Siswa
- Import Jawaban CSV
- Import Nilai CSV/Excel
- Scan LJK (Coming Soon, disabled)

C. Analisis & Tindak Lanjut
- Auto Scoring
- Analisis Butir Soal
- AI Analisis Nilai
- Program Remedial
- Program Pengayaan
- Komentar Rapor
- Refleksi Guru

Gunakan UI yang rapi:
- boleh menggunakan tab
- boleh menggunakan stepper
- boleh menggunakan card dashboard

Prioritas UX:
Guru harus paham alurnya:
1. Buat soal
2. Simpan ke bank soal
3. Buat paket ujian
4. Generate LJK
5. Input jawaban
6. Nilai otomatis
7. Analisis
8. Tindak lanjut

==================================================
BAGIAN 3 — BANK SOAL
==================================================

Bank Soal bukan generator.

Definisi:
Bank Soal adalah tempat menyimpan, mengedit, mencari, memfilter, dan menggunakan ulang soal.

Buat struktur data:

type QuestionBankItem = {
  id: string;
  userId?: string;
  subject: string;
  grade: string;
  topic: string;
  chapter?: string;
  questionType: "pilihan_ganda" | "uraian" | "benar_salah" | "menjodohkan";
  cognitiveLevel?: "C1" | "C2" | "C3" | "C4" | "C5" | "C6";
  difficulty?: "mudah" | "sedang" | "sulit";
  indicator?: string;
  question: string;
  options?: string[];
  answer: string;
  explanation?: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
};

Fitur Bank Soal:
- tampilkan daftar soal
- filter mapel
- filter kelas
- filter topik
- filter jenis soal
- filter level kognitif
- filter tingkat kesulitan
- cari soal
- edit soal
- hapus soal
- pilih beberapa soal
- buat paket ujian dari soal terpilih

Setelah user membuat soal dengan AI, tampilkan tombol:
“Simpan ke Bank Soal”.

==================================================
BAGIAN 4 — BUAT SOAL
==================================================

Buat Soal = generator soal AI.

Input:
- mapel
- kelas
- topik
- tujuan pembelajaran
- indikator
- jenis soal
- jumlah soal
- level kognitif
- tingkat kesulitan
- konteks siswa
- catatan guru

Output wajib:
- soal
- pilihan jawaban jika pilihan ganda
- kunci jawaban
- pembahasan
- indikator
- level kognitif
- tingkat kesulitan

Setelah soal berhasil dibuat:
- tampilkan preview
- tombol “Simpan ke Bank Soal”
- tombol “Buat Paket Ujian dari Soal Ini”

==================================================
BAGIAN 5 — PAKET UJIAN
==================================================

Buat konsep Exam Package.

type ExamPackage = {
  id: string;
  userId?: string;
  title: string;
  subject: string;
  grade: string;
  topic?: string;
  packageCode?: "A" | "B" | "C";
  questionIds: string[];
  questions?: QuestionBankItem[];
  createdAt: string;
  updatedAt?: string;
};

Fitur:
- buat paket ujian baru
- pilih soal dari Bank Soal
- hapus soal dari paket
- ubah urutan soal
- acak urutan soal
- buat Paket A/B jika memungkinkan
- tampilkan kunci jawaban
- tampilkan jumlah soal

Output Paket Ujian:
- naskah soal
- kunci jawaban
- kisi-kisi ringkas
- rubrik jika ada soal uraian/proyek

==================================================
BAGIAN 6 — GENERATE LJK
==================================================

Tambahkan fitur Generate Lembar Jawaban.

Input:
- paket ujian
- jumlah soal
- jumlah opsi jawaban: 4 atau 5
- kode paket: A/B/C
- nama sekolah opsional
- logo sekolah opsional jika sudah tersedia

Output:
- preview LJK
- tombol export/print jika project mendukung
- minimal tampilkan HTML printable

Format LJK:
Nama:
Kelas:
No. Absen:
Kode Paket:

1. ○ A  ○ B  ○ C  ○ D
2. ○ A  ○ B  ○ C  ○ D
3. ○ A  ○ B  ○ C  ○ D

PENTING:
Belum perlu scan kamera.
Tambahkan label:
“Scan LJK: Coming Soon”

==================================================
BAGIAN 7 — INPUT JAWABAN SISWA
==================================================

Tambahkan fitur input jawaban siswa.

Cara input minimal:

1. Paste CSV

Format:
Nama,1,2,3,4,5
Ahmad,A,B,C,D,A
Siti,A,C,C,D,B

2. Input manual tabel sederhana jika memungkinkan.

3. Import CSV jika project sudah mendukung upload file.

Buat parser CSV sederhana.

Validasi:
- nama tidak boleh kosong
- jawaban hanya A/B/C/D/E atau kosong
- jumlah jawaban sesuai jumlah soal paket
- minimal 1 siswa

Struktur:

type StudentAnswer = {
  studentName: string;
  answers: Record<number, string>;
};

==================================================
BAGIAN 8 — AUTO SCORING
==================================================

Koreksi jawaban harus deterministic.
Jangan gunakan AI untuk menghitung nilai.

Input:
- kunci jawaban dari paket ujian
- jawaban siswa

Hitung:
- jumlah benar
- jumlah salah
- jumlah kosong
- skor akhir 0-100

Struktur:

type StudentScoreResult = {
  studentName: string;
  correct: number;
  wrong: number;
  blank: number;
  score: number;
  answers: Record<number, string>;
};

Tampilkan tabel:
Nama | Benar | Salah | Kosong | Nilai | Status

Status:
- Tuntas jika nilai >= KKTP/KKM
- Belum Tuntas jika nilai < KKTP/KKM

==================================================
BAGIAN 9 — ANALISIS BUTIR SOAL
==================================================

Tambahkan item analysis.

Hitung tanpa AI:
- persentase benar per nomor
- persentase salah per nomor
- soal tersulit
- soal termudah
- distribusi jawaban A/B/C/D/E
- distraktor paling banyak dipilih jika pilihan ganda

Struktur:

type ItemAnalysis = {
  questionNumber: number;
  correctPercentage: number;
  wrongPercentage: number;
  blankPercentage: number;
  optionDistribution?: Record<string, number>;
  mostChosenWrongOption?: string;
};

Tampilkan ringkasan:
- Nomor soal paling sulit
- Nomor soal paling mudah
- Soal yang perlu direvisi
- Distraktor yang bekerja/tidak bekerja

==================================================
BAGIAN 10 — AI ANALISIS NILAI
==================================================

AI hanya boleh menganalisis data yang sudah dihitung sistem.
AI tidak boleh menghitung ulang.

Input ke AI:
- jumlah siswa
- rata-rata
- nilai tertinggi
- nilai terendah
- jumlah tuntas
- jumlah belum tuntas
- persentase ketuntasan
- daftar siswa remedial
- daftar siswa pengayaan
- soal tersulit
- indikator lemah jika tersedia
- catatan guru

Output AI:
- ringkasan kelas
- analisis penyebab kemungkinan
- rekomendasi remedial
- rekomendasi pengayaan
- strategi pembelajaran berikutnya
- catatan untuk wali kelas/kepala sekolah
- catatan komunikasi ke orang tua jika diperlukan
- refleksi guru singkat

Tambahkan tombol:
“Buat Program Remedial”
“Buat Program Pengayaan”
“Buat Komentar Rapor”
“Buat Refleksi Guru”

==================================================
BAGIAN 11 — PROGRAM REMEDIAL
==================================================

Buat fitur generate program remedial dari hasil analisis.

Input:
- siswa belum tuntas
- indikator/soal lemah
- topik
- mapel
- kelas
- catatan guru

Output:
- tujuan remedial
- daftar siswa
- materi fokus
- aktivitas remedial
- asesmen ulang
- estimasi waktu
- catatan guru

==================================================
BAGIAN 12 — PROGRAM PENGAYAAN
==================================================

Buat fitur generate program pengayaan dari hasil analisis.

Input:
- siswa tuntas tinggi
- topik
- mapel
- kelas
- karakteristik siswa

Output:
- tujuan pengayaan
- aktivitas menantang
- studi kasus/proyek kecil
- produk siswa
- rubrik singkat
- estimasi waktu

==================================================
BAGIAN 13 — KOMENTAR RAPOR MASSAL
==================================================

Buat komentar rapor massal berdasarkan hasil nilai.

Input:
- nama siswa
- nilai
- status tuntas
- kekuatan
- kelemahan
- catatan guru opsional

Output:
- komentar singkat
- komentar detail
- saran untuk siswa
- saran untuk orang tua

Jangan hanya berdasarkan rata-rata.
Gunakan hasil analisis jika tersedia.

==================================================
BAGIAN 14 — REVIEW KUALITAS SOAL
==================================================

Tambahkan Educational Reviewer untuk paket soal.

AI menilai:
- kesesuaian soal dengan indikator
- kejelasan bahasa
- level kognitif
- tingkat kesulitan
- variasi soal
- kualitas opsi/distraktor
- kesesuaian pembahasan

Output:
- skor 0-100
- kekuatan
- kelemahan
- saran revisi
- status:
  Sangat Baik
  Layak Digunakan
  Revisi Minor
  Revisi Mayor

==================================================
BAGIAN 15 — RUBRIK
==================================================

Rubrik berada di Assessment, bukan Bahan Ajar.

Jenis rubrik:
- presentasi
- diskusi
- proyek
- produk
- praktikum
- portofolio

Output:
- indikator
- level 1-4
- deskripsi tiap level
- skor
- catatan penilaian

==================================================
BAGIAN 16 — PENYIMPANAN DATA
==================================================

Jika project belum memakai database untuk fitur ini, gunakan localStorage sementara dengan key:

kurikula:questionBank
kurikula:examPackages
kurikula:studentAnswers
kurikula:scoreResults
kurikula:itemAnalysis
kurikula:learningAnalysisResults

Tetapi buat struktur kode agar mudah diganti ke database nanti.

Jangan hardcode data sekolah tertentu.

==================================================
BAGIAN 17 — UX DAN COPYWRITING
==================================================

Gunakan istilah yang mudah untuk guru:

Bukan:
“Assessment Engine”

Gunakan:
“Penilaian”

Bukan:
“Auto Scoring”

Gunakan:
“Koreksi Otomatis”

Bukan:
“Item Analysis”

Gunakan:
“Analisis Butir Soal”

Bukan:
“Repository”

Gunakan:
“Bank Soal”

Bukan:
“Exam Package”

Gunakan:
“Paket Ujian”

Halaman Assessment harus terasa seperti alur kerja, bukan kumpulan fitur acak.

==================================================
BAGIAN 18 — YANG TIDAK BOLEH
==================================================

- Jangan membuat scan kamera dulu.
- Jangan membuat OMR detection.
- Jangan pakai AI untuk menghitung nilai.
- Jangan meletakkan Bank Soal di Bahan Ajar.
- Jangan membuat dua fitur generator soal dengan nama berbeda.
- Jangan menghapus fitur lama yang masih dipakai tanpa pengganti.
- Jangan hardcode nama sekolah tertentu.
- Jangan membuat UI terlalu ramai.

==================================================
BAGIAN 19 — HASIL AKHIR YANG DIHARAPKAN
==================================================

Setelah selesai, alur guru harus bisa seperti ini:

1. Guru masuk halaman Penilaian.
2. Guru klik Buat Soal.
3. Guru menyimpan soal ke Bank Soal.
4. Guru memilih soal dari Bank Soal.
5. Guru membuat Paket Ujian.
6. Guru generate LJK.
7. Guru input/paste jawaban siswa.
8. Sistem mengoreksi otomatis.
9. Sistem menampilkan nilai.
10. Sistem menampilkan analisis butir soal.
11. AI membuat analisis hasil belajar.
12. Guru membuat remedial/pengayaan/komentar rapor dari hasil analisis.

==================================================
BAGIAN 20 — OUTPUT LAPORAN DARI AI CODE
==================================================

Setelah selesai, tampilkan:

1. File yang diubah
2. File baru yang dibuat
3. Fitur yang dihapus dari Bahan Ajar
4. Struktur data Bank Soal
5. Struktur data Paket Ujian
6. Cara testing manual
7. Bagian yang masih Coming Soon
8. Potensi error atau bagian yang perlu polish