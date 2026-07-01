import { BaseSkill } from "./baseSkill.ts";
import { LearningDesignFramework } from "../frameworks/learningDesignFramework.ts";

export class TeachingMaterialSkill extends BaseSkill {
  id = "teaching-material";
  name = "Bahan Ajar Pendukung";
  description = "Membuat bahan ajar pendukung, aktivitas pembelajaran, kuis pemantik, outline PPT, dan panduan praktikum.";
  purpose = "Menyediakan dokumen pembelajaran bermutu tinggi.";
  requiredInputs = ["class", "subject", "topic"];
  optionalInputs = ["learningObjective", "difficulty", "notes", "karakter", "konteks", "materialType", "aktivitasType", "pemantikCount", "pptSlides", "pptStyle", "pptDiscussion", "pptQuiz", "labName", "labMaterials", "labDifficulty"];
  rules = [
    "Sajikan konsep dengan penjelasan yang mudah dicerna, hindari bahasa yang terlalu akademis tanpa contoh.",
    "Gunakan bahasa Indonesia yang baik, benar, komunikatif, dan menarik bagi siswa.",
    "Pastikan output rapi terstruktur dalam Markdown."
  ];
  outputFormat = "Markdown";
  qualityChecklist = ["Struktur rapi", "Relevan dengan topik", "Instruksi jelas"];

  buildPrompt(input: any): string {
    const materialType = input.materialType || "bahan_ajar";

    // Jalankan educational framework
    const ldResult = LearningDesignFramework.analyze({
      topik: input.topic,
      tujuanPembelajaran: input.learningObjective || "",
      jenjang: "SMA", // Default estimate
      kelas: input.class,
      profilSiswa: input.konteks,
      jumlahSiswa: 30,
      targetKarakter: input.karakter
    });

    const commonHeader = `Anda adalah pendidik profesional dan content creator edukasi terkemuka di Indonesia.
Gunakan framework berpikir Guru Profesional berikut:
${this.PedagogicalFramework}

Rekomendasi Desain Pedagogis (Educational Brain):
- Model Penyampaian: ${ldResult.recommendedModels.join(", ")}
- Contoh Aktivitas Konseptual: ${ldResult.recommendedActivities.join(" / ")}
- Rekomendasi Struktur Latihan: ${ldResult.recommendedAssessmentTypes.join(", ")}

Parameter Input:
- Kelas: ${input.class}
- Mata Pelajaran: ${input.subject}
- Topik Utama: ${input.topic}
- Tingkat Kesulitan: ${input.difficulty || "Sedang"}
- Tujuan Belajar: ${input.learningObjective || "Memahami esensi materi secara komprehensif."}
- Konteks Relevan: ${input.konteks || "Kehidupan Sehari-hari / Lingkungan Siswa"}
- Catatan Tambahan: ${input.notes || "-"}
`;

    if (materialType === "aktivitas") {
      return `${commonHeader}
Buatlah sebuah **Rencana Aktivitas Pembelajaran** interaktif yang dirancang untuk pembelajaran aktif di kelas.
- Tipe Aktivitas: ${input.aktivitasType || "Game / Kuis"}
- Alokasi Waktu: ${input.duration || "40 menit"}

Output harus terstruktur rapi dengan format Markdown berikut:
1. **IDENTITAS AKTIVITAS** (Mapel, Kelas, Topik, Durasi, Model Belajar)
2. **TUJUAN AKTIVITAS & TARGET KARAKTER** (Profil Pelajar Pancasila, misalnya Bernalar Kritis, Gotong Royong)
3. **PERSIAPAN GURU** (Alat/Bahan, Pengaturan Kelas, Media Ajar yang perlu disiapkan sebelum kelas mulai)
4. **LANGKAH-LANGKAH AKTIVITAS** (Detail kegiatan bertahap dari Pendahuluan/Ice Breaking, Kegiatan Inti/Game/Roleplay/Diskusi kelompok, hingga Penutup/Refleksi)
5. **FORMAT PENILAIAN & EVALUASI SINGKAT** (Cara guru mengobservasi dan menilai kerja siswa/kelompok)
6. **STRATEGI DIFERENSIASI** (Alternatif penyesuaian aktivitas untuk siswa cepat & siswa lambat)
7. **TIPS PENGELOLAAN KELAS & KESELAMATAN** (Tips agar aktivitas tetap tertib dan kondusif)

Jangan berikan teks pembuka atau penutup basa-basi, langsung mulai output dengan judul Rencana Aktivitas Pembelajaran.`;
    }

    if (materialType === "pemantik") {
      return `${commonHeader}
Buatlah daftar **Pertanyaan Pemantik Pembelajaran** yang dapat memicu ketertarikan, diskusi, dan nalar kritis siswa di awal bab.
- Jumlah Pertanyaan Utama: ${input.pemantikCount || "5"} pertanyaan

Output harus terstruktur rapi dengan format Markdown berikut:
1. **IDENTITAS PEMANTIK** (Mapel, Kelas, Topik, TP)
2. **STIMULUS FENOMENA** (Studi kasus pendek, dilema sosial, atau cerita kejadian sehari-hari yang menggugah rasa ingin tahu siswa terkait topik ini)
3. **DAFTAR PERTANYAAN PEMANTIK UTAMA** (Sajikan ${input.pemantikCount || "5"} pertanyaan terbuka, filosofis, dan esensial yang tidak memiliki satu jawaban benar mutlak)
4. **PERTANYAAN EKSPLORASI LANJUTAN** (Pertanyaan bertahap untuk menuntun siswa dari konsep sederhana ke tingkat analisis lebih tinggi)
5. **SKENARIO DISKUSI KELAS** (Panduan singkat bagi guru untuk memoderasi kelas atau memicu debat konstruktif berdasarkan pertanyaan tersebut)
6. **MISKONSEPSI YANG MUNGKIN MUNCUL** (Hal-hal yang perlu diantisipasi guru agar pemantik tidak memicu salah pemahaman konsep)
7. **REFLEKSI BELAJAR SISWA** (Pertanyaan refleksi akhir sesi)

Jangan berikan teks pembuka atau penutup basa-basi, langsung mulai output dengan judul Pertanyaan Pemantik Pembelajaran.`;
    }

    if (materialType === "ppt") {
      return `${commonHeader}
Buatlah sebuah **Rencana Outline Slide Presentasi (PPT)** yang kebih komunikatif, menarik, dan informatif untuk diajarkan di kelas.
- Target Jumlah Slide: ${input.pptSlides || "8"} slide
- Gaya Penyampaian: ${input.pptStyle || "Interaktif"}
- Termasuk Diskusi: ${input.pptDiscussion ? "Ya" : "Tidak"}
- Termasuk Kuis Cepat: ${input.pptQuiz ? "Ya" : "Tidak"}

Output harus terstruktur rapi dengan format Markdown berikut:
1. **IDENTITAS STRUKTUR SLIDE** (Mapel, Kelas, Topik, Target Slide, Gaya Penyampaian)
2. **RENCANA OUTLINE SLIDE-BY-SLIDE**:
   Untuk setiap slide (dari slide 1 hingga ${input.pptSlides || "8"}), sertakan:
   - **Slide [Nomor]: [Judul Slide]**
   - **Visual/Media**: Rekomendasi gambar, ikon, atau tata letak yang menarik.
   - **Konten Utama**: Poin-poin teks singkat (bullet points) yang akan tampil di layar.
   - **Catatan Pemateri (Speaker Notes)**: Naskah/penjelasan lisan guru saat menampilkan slide ini, lengkap dengan analogi dan pertanyaan interaktif untuk siswa.
3. **TIPS DESAIN PRESENTASI & SKEMA WARNA** (Rekomendasi visualisasi dan palette warna yang harmonis untuk topik ini)

Jangan berikan teks pembuka atau penutup basa-basi, langsung mulai output dengan judul Rencana Outline Slide Presentasi.`;
    }

    if (materialType === "experiment") {
      return `${commonHeader}
Buatlah sebuah **Panduan Praktikum & Eksperimen** laboratorium atau lapangan yang aman, operasional, dan menantang siswa dalam penyelidikan ilmiah.
- Nama Praktikum: ${input.labName || "Eksperimen " + input.topic}
- Estimasi Durasi: ${input.duration || "60 menit"}
- Tingkat Kesulitan Lab: ${input.labDifficulty || "Sedang"}

Output harus terstruktur rapi dengan format Markdown berikut:
1. **IDENTITAS EKSPERIMEN** (Nama Praktikum, Mapel, Kelas, Alokasi Waktu)
2. **TUJUAN PRAKTIKUM & PRINSIP DASAR** (Teori singkat di balik eksperimen)
3. **DAFTAR ALAT & BAHAN** (Peralatan dan zat yang dibutuhkan, diutamakan yang mudah didapat di laboratorium sekolah atau kehidupan sehari-hari)
4. **PROSEDUR KERJA & LANGKAH KESELAMATAN** (Instruksi langkah demi langkah yang aman, jelas, dan berurutan. Berikan highlight khusus untuk langkah keselamatan kerja)
5. **TABEL PENGAMATAN DATA** (Format tabel kosong yang siap disalin oleh siswa untuk mencatat data kuantitatif/kualitatif)
6. **PERTANYAAN PEMBAHASAN & DISKUSI (HOTS)** (3-4 pertanyaan analisis data untuk menuntut siswa menghubungkan data dengan konsep teori)
7. **KESIMPULAN & REFLEKSI PRAKTIKUM** (Ruang kesimpulan dan evaluasi diri)

Jangan berikan teks pembuka atau penutup basa-basi, langsung mulai output dengan judul Panduan Praktikum.`;
    }

    // Default: bahan_ajar
    return `${commonHeader}
Buatlah sebuah **Bahan Ajar Pendukung Pembelajaran** yang lengkap, profesional, dan interaktif dalam Bahasa Indonesia.

Output Bahan Ajar HARUS terstruktur rapi dengan format Markdown berikut:
1. **IDENTITAS BAHAN AJAR** (Mapel, Kelas, Topik, Tujuan Belajar)
2. **PENGANTAR & PERTANYAAN PEMANTIK** (Menarik perhatian siswa berdasarkan konteks: ${input.konteks || "kehidupan sehari-hari"})
3. **PENJELASAN KONSEP** (Ulasan materi yang mendalam, terperinci, namun mudah dipahami. Gunakan gaya ${ldResult.recommendedModels[0] || "PBL"} untuk memantik inisiatif belajar)
4. **ANALOGI SEDERHANA** (Membantu visualisasi konsep abstrak menggunakan contoh yang dekat dengan kehidupan siswa)
5. **CONTOH KONTEKSTUAL** (Contoh nyata implementasi materi di masyarakat/teknologi/lingkungan)
6. **MISKONSEPSI UMUM SISWA** (Ulas 2-3 kesalahan pemahaman yang sering terjadi beserta pembetulannya)
7. **AKTIVITAS SINGKAT / EKSPERIMEN MANDIRI** (Aktivitas aktif 5-10 menit untuk dicoba siswa di rumah/kelas. Gunakan ide aktivitas: ${ldResult.recommendedActivities[0] || "Eksperimen mandiri"})
8. **LATIHAN BERTAHAP** (3-5 soal latihan bergradasi: Mudah -> Sedang -> Menantang, lengkap dengan petunjuk pengerjaan)
9. **RANGKUMAN MATERI** (Kesimpulan inti pembelajaran dalam bentuk poin-poin/bullet list)
10. **REFLEKSI BELAJAR SISWA** (Pertanyaan evaluasi diri untuk mengukur pemahaman siswa secara mandiri)

Jangan berikan teks pembuka atau penutup basa-basi, langsung mulai output dengan judul Bahan Ajar.`;
  }
}
