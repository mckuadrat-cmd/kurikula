Lanjutkan pengembangan Kurikula.

PENTING:
Jangan menambah generator AI baru terlebih dahulu.

Fokus sprint ini adalah membangun "Educational Brain" yang akan digunakan oleh seluruh AI Skill yang sudah ada.

Tujuan:
Membuat AI tidak lagi hanya menghasilkan dokumen dari prompt, tetapi berpikir seperti guru profesional saat merancang pembelajaran, asesmen, diferensiasi, karakter, dan refleksi.

==================================================
BAGIAN 1
EDUCATIONAL FRAMEWORK ENGINE
==================================================

Buat folder baru:

/ai/frameworks

Isi:

- learningDesignFramework.ts
- assessmentFramework.ts
- differentiationFramework.ts
- characterFramework.ts
- reflectionFramework.ts

==================================================
1. Learning Design Framework
==================================================

Tujuan:
Membantu AI memilih strategi pembelajaran sebelum membuat dokumen.

Input:

- topik
- tujuan pembelajaran
- jenjang
- kelas
- profil siswa
- jumlah siswa
- target karakter

Output:

{
  recommendedModels: [],
  recommendedActivities: [],
  recommendedAssessmentTypes: [],
  risks: [],
  pedagogicalReasoning: ""
}

Contoh:

Jika siswa pasif:
- hindari ceramah dominan
- rekomendasikan Think Pair Share
- rekomendasikan Gallery Walk

Jika target karakter kolaborasi:
- rekomendasikan Cooperative Learning

Semua skill berikut wajib menggunakan framework ini:

- lessonPlannerSkill
- semesterPlannerSkill
- worksheetSkill
- teachingMaterialSkill

==================================================
2. Assessment Framework
==================================================

Tujuan:
Menentukan asesmen yang paling sesuai.

Input:

- tujuan pembelajaran
- indikator
- level kognitif

Output:

{
  cognitiveLevel: "",
  recommendedAssessmentType: "",
  assessmentReasoning: "",
  alternativeAssessment: []
}

Contoh:

Jika tujuan:
"Menganalisis dampak perubahan iklim"

Maka:

- level = C4
- studi kasus lebih cocok
- proyek lebih cocok
- pilihan ganda bukan pilihan utama

assessmentSkill wajib memakai framework ini.

==================================================
3. Differentiation Framework
==================================================

Tujuan:
Membuat diferensiasi tidak lagi generik.

Input:

- kemampuan awal siswa
- heterogenitas kelas
- jumlah siswa

Output:

{
  fastLearnerStrategy: "",
  regularLearnerStrategy: "",
  supportLearnerStrategy: ""
}

lessonPlannerSkill
semesterPlannerSkill
worksheetSkill

wajib memanggil framework ini.

==================================================
4. Character Framework
==================================================

INI ADALAH KEUNGGULAN MCKUADRAT.

Buat file:

characterFramework.ts

Target karakter default:

- Disiplin
- Tanggung Jawab
- Integritas
- Empati
- Kolaborasi
- Kepemimpinan
- Kemandirian

Output:

{
  behaviorIndicators: [],
  observationMethod: "",
  reflectionQuestions: [],
  reinforcementStrategies: []
}

Contoh:

Karakter:
Disiplin

Output:

Indikator:
- hadir tepat waktu
- menyelesaikan tugas
- mengikuti prosedur

Metode observasi:
Checklist

Pertanyaan refleksi:
- Apa yang sudah saya lakukan tepat waktu hari ini?

Framework ini harus dipakai oleh:

- lessonPlannerSkill
- semesterPlannerSkill
- worksheetSkill
- teacherReflectionSkill

Karakter tidak boleh hanya menjadi tulisan tempelan.

==================================================
5. Reflection Framework
==================================================

Input:

- aktivitas
- hasil
- kendala
- catatan guru

Output:

{
  whatWorked: "",
  whatNeedsImprovement: "",
  nextAction: "",
  reflectionQuestions: []
}

Digunakan oleh:

- teacherReflectionSkill
- educationalReviewerSkill

==================================================
BAGIAN 2
KNOWLEDGE BASE PENDIDIKAN
==================================================

Buat folder:

/knowledge

Isi minimal:

- teachingModels.json
- assessmentMethods.json
- differentiationStrategies.json
- characterIndicators.json
- projectIdeas.json
- iceBreakerIdeas.json

Contoh teachingModels:

PBL
Project Based Learning
Discovery Learning
Inquiry Learning
Think Pair Share
Jigsaw
Gallery Walk

Masing-masing berisi:

- deskripsi
- kapan cocok digunakan
- kelebihan
- kekurangan
- ukuran kelas yang cocok

Framework wajib membaca knowledge ini.

Jangan hardcode semua di prompt.

==================================================
BAGIAN 3
ASISTEN GURU
==================================================

AI Chat jangan lagi diposisikan sebagai chatbot umum.

Ubah menjadi:

"Asisten Guru"

Tujuan:
Membantu guru mengambil keputusan pembelajaran.

Pindahkan dari menu utama.

Buat menjadi:

Floating Assistant
atau
Panel samping kanan.

Menu cepat:

- Review Modul Saya
- Cari Ide Aktivitas
- Cari Pertanyaan Pemantik
- Atasi Masalah Kelas
- Bantu Diferensiasi
- Bantu Remedial
- Bantu Pengayaan
- Bantu Komunikasi Orang Tua

==================================================
KONTEKS ASISTEN GURU
==================================================

Jika tersedia, asisten membaca:

- semester planner aktif
- modul aktif
- kelas aktif
- mapel aktif

Contoh:

Guru sedang membuka Modul SPLDV.

Asisten tahu konteks tersebut.

Pertanyaan:

"Bagaimana membuat siswa lebih aktif?"

Jawaban harus merujuk modul yang sedang dibuka.

==================================================
BAGIAN 4
HISTORY DAN CONTEXT MEMORY
==================================================

Buat sistem percakapan berbasis konteks.

Bukan hanya:

Chat 1
Chat 2
Chat 3

Tetapi:

Semester Planner
 └ Percakapan

Modul
 └ Percakapan

LKPD
 └ Percakapan

Assessment
 └ Percakapan

Learning Analysis
 └ Percakapan

==================================================
Struktur Data
==================================================

ai_conversations

- id
- user_id
- title
- context_type
- context_id
- created_at
- updated_at

context_type:

- general
- semester_plan
- lesson_plan
- worksheet
- assessment
- learning_analysis

ai_messages

- id
- conversation_id
- role
- content
- created_at

==================================================
BAGIAN 5
TEACHER MEMORY
==================================================

Buat memory sederhana.

teacher_memory

- user_id
- jenjang
- mapel
- teaching_style
- preferred_models
- character_focus
- updated_at

Contoh:

Guru SMP IPA
lebih suka PBL
fokus karakter kolaborasi

Asisten Guru boleh menggunakan memory ini.

Jangan menyimpan percakapan biasa.

Simpan hanya preferensi yang relevan.

==================================================
BAGIAN 6
EDUCATIONAL REVIEWER V2
==================================================

Upgrade educationalReviewerSkill.

Tambahkan penilaian:

- Kejelasan tujuan
- Aktivitas pembelajaran
- Asesmen
- Diferensiasi
- Integrasi karakter
- Keterpakaian

Skala:

0-100

Status:

- Sangat Baik
- Layak Digunakan
- Perlu Revisi Minor
- Perlu Revisi Mayor

Output:

{
  scores: {},
  strengths: [],
  weaknesses: [],
  recommendations: [],
  improvedVersionSuggestions: []
}

==================================================
BAGIAN 7
RUBRIC ENGINE
==================================================

Tambahkan skill baru:

rubricSkill.ts

Jenis:

- Presentasi
- Diskusi
- Praktikum
- Produk
- Proyek
- Portofolio

Output:

- indikator
- level penilaian
- deskripsi tiap level
- skor

assessmentSkill dapat memanggil rubricSkill.

==================================================
BAGIAN 8
DIAGNOSTIC CLASS PROFILE
==================================================

Tambahkan skill baru:

classDiagnosticSkill.ts

Input:

- jenjang
- kelas
- mapel
- kemampuan awal
- masalah kelas
- target karakter

Output:

- profil kelas
- kekuatan
- tantangan
- risiko pembelajaran
- rekomendasi strategi semester

Output ini dapat menjadi input Semester Planner.

==================================================
BAGIAN 9
JANGAN TAMBAH FITUR GENERATOR BARU
==================================================

Fokus sprint ini:

- memperdalam kualitas AI
- meningkatkan kecerdasan pendidikan
- memperkuat karakter
- memperkuat asesmen
- memperkuat konteks guru

Bukan menambah generator baru.

==================================================
OUTPUT YANG DIMINTA
==================================================

Setelah selesai tampilkan:

1. File baru yang dibuat
2. File yang diubah
3. Framework yang berhasil dibuat
4. Skill yang sudah menggunakan framework
5. Potensi breaking changes
6. Cara testing manual
7. Roadmap lanjutan yang disarankan