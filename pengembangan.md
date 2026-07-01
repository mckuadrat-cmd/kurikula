Lanjutkan pengembangan Kurikula:

Fokus pekerjaan kali ini hanya 2 hal:
1. Hubungkan workflow Semester Planner → Modul Ajar → LKPD → Soal
2. Bangun fitur AI Analisis Nilai

Jangan menambah fitur lain di luar dua fokus ini kecuali diperlukan untuk integrasi.

==================================================
BAGIAN 1 — HUBUNGKAN SEMESTER PLANNER → MODUL → LKPD → SOAL
==================================================

Tujuan:
Semester Planner harus menjadi induk workflow. Guru tidak perlu input ulang data yang sama berkali-kali. Dari hasil semester planner, guru bisa memilih satu pertemuan lalu membuat Modul Ajar, LKPD, Bahan Ajar jika sudah ada, dan Soal berdasarkan konteks pertemuan tersebut.

File yang perlu dicek dan diubah:
- SemesterPlanner.tsx
- AILessonPlanner.tsx
- AITeachingMaterials.tsx
- Assessment.tsx
- AIComponents.tsx
- index.ts
- folder /ai/skills jika sudah dibuat
- skillRegistry.ts jika sudah dibuat

Tugas teknis:

1. Pastikan output Semester Planner punya struktur data yang bisa dipakai ulang.
Jika saat ini output hanya markdown/text, tambahkan format structured output.

Buat tipe data:

type SemesterPlan = {
  id?: string;
  title: string;
  schoolYear?: string;
  semester?: string;
  jenjang?: string;
  kelas?: string;
  mapel?: string;
  capaianPembelajaran?: string;
  profilSiswa?: string;
  targetKarakter?: string;
  modelPembelajaran?: string;
  assessmentPlan?: string;
  meetings: SemesterMeeting[];
};

type SemesterMeeting = {
  meetingNumber: number;
  week?: number;
  topic: string;
  learningObjective: string;
  keyConcepts?: string[];
  learningActivities?: string;
  assessmentType?: string;
  characterFocus?: string;
  studentProduct?: string;
  remedialPlan?: string;
  enrichmentPlan?: string;
  teacherNotes?: string;
};

2. Jika AI tetap menghasilkan markdown untuk ditampilkan, simpan juga structured data di state/local storage/database jika sudah tersedia.

3. Di setiap baris/pertemuan hasil Semester Planner, tambahkan action:
- Buat Modul
- Buat LKPD
- Buat Soal

Jika UI tabel belum rapi, minimal tambahkan tombol di bawah setiap pertemuan.

4. Saat user klik “Buat Modul”, buka/gunakan AILessonPlanner dengan prefilled context dari pertemuan:
- jenjang
- kelas
- mapel
- capaian pembelajaran
- topik
- tujuan pembelajaran
- profil siswa
- target karakter
- model pembelajaran
- asesmen
- remedial/pengayaan
- catatan guru

Jangan minta user mengisi ulang data yang sudah ada.

5. Saat user klik “Buat LKPD”, panggil worksheetSkill dengan konteks:
- mapel
- kelas
- topik
- tujuan pembelajaran
- aktivitas inti
- produk siswa
- karakter
- asesmen
- tingkat kesulitan default “sedang”
- catatan guru

Output LKPD wajib sesuai struktur:
- judul
- tujuan
- stimulus/kasus
- instruksi
- langkah kerja
- ruang jawaban
- pertanyaan analisis
- refleksi siswa
- rubrik sederhana

6. Saat user klik “Buat Soal”, panggil assessmentSkill dengan konteks:
- mapel
- kelas
- topik
- tujuan pembelajaran
- bentuk asesmen dari meeting.assessmentType jika ada
- jumlah soal default 10
- level kognitif campuran LOTS-MOTS-HOTS
- karakteristik siswa jika ada
- catatan guru

Output soal wajib:
- kisi-kisi ringkas
- indikator soal
- soal
- kunci jawaban
- pembahasan
- level kognitif
- tingkat kesulitan

7. Tambahkan mekanisme passing context antar halaman/komponen.
Pilih salah satu yang paling cocok dengan struktur project:
- React state/context
- query params
- localStorage/sessionStorage
- shared store
- router state

Prioritaskan yang paling aman dan tidak merusak struktur existing.

Contoh key localStorage jika dipakai:
- kurikula:selectedSemesterPlan
- kurikula:selectedMeetingContext
- kurikula:generatedLessonDraft
- kurikula:generatedWorksheetDraft
- kurikula:generatedAssessmentDraft

8. Tambahkan komponen ringkas bernama “Context Preview” di Modul/LKPD/Soal.
Fungsinya menampilkan:
“Dokumen ini dibuat dari Semester Planner: Pertemuan X — [Topik]”

User boleh mengedit input sebelum generate.

9. Jangan hardcode sekolah tertentu.
Semua data harus berasal dari input user atau konteks Semester Planner.

10. Pastikan tetap kompatibel dengan penggunaan manual.
AILessonPlanner, LKPD, dan Assessment tetap bisa dipakai tanpa Semester Planner.

11. Tambahkan empty state:
Jika user masuk Modul/LKPD/Soal tanpa konteks Semester Planner, tampilkan normal seperti biasa.
Jika ada konteks, tampilkan notifikasi:
“Konteks dari Semester Planner berhasil dimuat. Silakan cek dan sesuaikan sebelum generate.”

12. Tambahkan dokumentasi singkat di AI_SKILL_ARCHITECTURE.md:
- cara workflow Semester Planner → Modul → LKPD → Soal bekerja
- data apa saja yang diteruskan
- cara menambah action turunan baru

==================================================
BAGIAN 2 — BANGUN AI ANALISIS NILAI
==================================================

Tujuan:
Bangun fitur AI Analisis Nilai agar guru bisa memasukkan data nilai siswa dan mendapatkan analisis ketuntasan, remedial, pengayaan, TP/indikator lemah, serta rekomendasi tindak lanjut pembelajaran.

File yang perlu dicek dan diubah:
- Assessment.tsx
- StudentData.tsx jika perlu
- AIComponents.tsx
- index.ts
- /ai/skills/learningAnalysisSkill.ts
- /ai/utils/outputValidator.ts
- /ai/utils/creditCalculator.ts
- Billing.tsx jika credit display perlu update

Tugas teknis:

1. Buat skill baru:
learningAnalysisSkill

Skill id:
learning-analysis

Nama:
AI Analisis Hasil Belajar

Purpose:
Menganalisis nilai siswa untuk membantu guru menentukan ketuntasan, remedial, pengayaan, kelemahan indikator, dan strategi pembelajaran berikutnya.

Input schema:
type LearningAnalysisInput = {
  className?: string;
  subject?: string;
  gradeLevel?: string;
  assessmentTitle?: string;
  kkmOrKktp: number;
  learningObjectives?: string;
  indicators?: string[];
  scoreScale?: "0-100" | "0-10" | "custom";
  students: StudentScore[];
  teacherNotes?: string;
};

type StudentScore = {
  name: string;
  score: number;
  indicatorScores?: Record<string, number>;
  attendanceNote?: string;
  teacherNote?: string;
};

2. Buat UI input AI Analisis Nilai.
Tempatkan di Assessment.tsx sebagai tab/menu baru:
- Buat Soal
- Kisi-Kisi/Rubrik jika sudah ada
- Analisis Nilai

Input minimal:
- Nama kelas
- Mapel
- Judul asesmen
- KKTP/KKM
- Tujuan pembelajaran
- Indikator/TP, bisa textarea satu baris per indikator
- Data nilai siswa

3. Data nilai siswa bisa dimasukkan dengan 3 cara:
Minimal wajib implement salah satu:
- textarea paste CSV sederhana
- tabel input manual
- import dari data Assessment existing jika ada

Prioritaskan textarea paste CSV karena cepat.

Format CSV sederhana:
Nama,Nilai
Ahmad,85
Siti,72
Budi,55

Jika indikator digunakan:
Nama,TP1,TP2,TP3
Ahmad,80,75,90
Siti,60,70,65

4. Buat parser CSV sederhana.
Validasi:
- nama tidak kosong
- nilai angka
- nilai berada di rentang 0-100
- minimal 1 siswa
- KKM/KKTP wajib angka

Jika data invalid, tampilkan error jelas.

5. Output AI Analisis Nilai wajib memuat:
- ringkasan kelas
- jumlah siswa
- rata-rata kelas
- nilai tertinggi
- nilai terendah
- jumlah siswa tuntas
- jumlah siswa belum tuntas
- persentase ketuntasan
- daftar siswa remedial
- daftar siswa pengayaan
- indikator/TP yang paling lemah jika data indikator tersedia
- analisis kemungkinan penyebab
- rekomendasi remedial
- rekomendasi pengayaan
- strategi pembelajaran berikutnya
- ringkasan singkat untuk wali kelas/kepala sekolah
- catatan komunikasi ke orang tua jika diperlukan

6. Jangan biarkan AI mengarang.
Jika data indikator tidak tersedia, AI harus menulis:
“Analisis indikator belum dapat dibuat karena data nilai per indikator belum tersedia.”

7. Tambahkan output terstruktur jika memungkinkan:
type LearningAnalysisResult = {
  summary: string;
  totalStudents: number;
  classAverage: number;
  highestScore: number;
  lowestScore: number;
  passedCount: number;
  remedialCount: number;
  masteryPercentage: number;
  remedialStudents: string[];
  enrichmentStudents: string[];
  weakestIndicators?: string[];
  analysis: string;
  remedialRecommendation: string;
  enrichmentRecommendation: string;
  nextTeachingStrategy: string;
  leadershipSummary: string;
  parentCommunicationNote?: string;
};

8. Hitung statistik dasar di frontend/backend sebelum dikirim ke AI.
Jangan serahkan semua hitungan ke AI.

Hitung secara deterministik:
- total siswa
- rata-rata
- nilai tertinggi
- nilai terendah
- tuntas
- belum tuntas
- persentase ketuntasan
- daftar remedial
- daftar pengayaan

AI hanya bertugas membaca, menyimpulkan, dan memberi rekomendasi pedagogis.

9. Credit:
Tambahkan credit type:
learning-analysis = 4 atau 5 credit

Rekomendasi:
- Basic: boleh 3x/bulan atau sesuai credit
- Pro/Premium: sesuai credit
- Gemini Flash cukup untuk analisis nilai
- Gemini Pro tidak wajib

10. Tambahkan validasi output.
Output harus mengandung:
- Ringkasan Kelas
- Ketuntasan
- Siswa Remedial
- Siswa Pengayaan
- Rekomendasi Tindak Lanjut

Jika tidak lengkap, retry satu kali.

11. Tambahkan tombol lanjutan setelah hasil analisis:
- Buat Rencana Remedial
- Buat Rencana Pengayaan
- Buat Pesan untuk Orang Tua
- Buat Refleksi Guru

Jika belum sempat implement penuh, siapkan action placeholder yang membawa konteks analisis.

12. Buat prompt learningAnalysisSkill dengan prinsip:
AI adalah assessment designer dan instructional coach.
AI tidak hanya menyebut angka, tapi menjelaskan tindakan guru berikutnya.
Bahasa harus praktis, tidak terlalu teoritis.
Fokus ke kebutuhan guru Indonesia.

13. Pastikan data siswa aman.
Jangan tampilkan instruksi yang menyimpan data sensitif di prompt lebih dari kebutuhan.
Jangan mengirim data yang tidak diperlukan.
Jangan hardcode nama sekolah tertentu.

14. Tambahkan dokumentasi ke AI_SKILL_ARCHITECTURE.md:
- cara memakai AI Analisis Nilai
- format input CSV
- credit cost
- contoh output
- batasan: analisis bukan keputusan final, guru tetap perlu validasi

==================================================
KRITERIA SELESAI
==================================================

Pekerjaan dianggap selesai jika:

1. Dari Semester Planner, user bisa memilih pertemuan dan membuat:
- Modul Ajar
- LKPD
- Soal

2. Data dari pertemuan otomatis terbawa ke fitur turunan.

3. Fitur turunan tetap bisa dipakai manual tanpa Semester Planner.

4. Ada fitur/tab AI Analisis Nilai.

5. User bisa paste data nilai sederhana.

6. Sistem menghitung statistik dasar secara akurat.

7. AI memberi rekomendasi remedial, pengayaan, dan strategi pembelajaran berikutnya.

8. Credit system mengenali learning-analysis.

9. Tidak ada data sekolah tertentu yang di-hardcode.

10. Build tidak error.

Setelah selesai, tampilkan ringkasan:
- file yang dibuat
- file yang diubah
- cara testing manual
- potensi bagian yang masih perlu polish