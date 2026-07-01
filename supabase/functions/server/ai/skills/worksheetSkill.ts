import { BaseSkill } from "./baseSkill.ts";
import { LearningDesignFramework } from "../frameworks/learningDesignFramework.ts";
import { DifferentiationFramework } from "../frameworks/differentiationFramework.ts";
import { CharacterFramework } from "../frameworks/characterFramework.ts";

export class WorksheetSkill extends BaseSkill {
  id = "lkpd";
  name = "Lembar Kerja Peserta Didik (LKPD)";
  description = "Membuat Lembar Kerja Peserta Didik (LKPD) yang menarik dan menuntut keaktifan siswa.";
  purpose = "Menyediakan panduan aktivitas siswa berbasis inquiry, problem solving, atau proyek dengan instruksi jelas dan rubrik penilaian.";
  requiredInputs = ["class", "subject", "topic"];
  optionalInputs = ["learningObjective", "difficulty", "notes", "lkpdActivity", "duration", "lkpdOutput", "konteks", "targetKarakter"];
  rules = [
    "Sajikan stimulus atau kasus pemantik (dapat berupa berita singkat, grafik, atau cerita) sebagai dasar aktivitas.",
    "Instruksi pengerjaan bagi siswa harus operasional dan bertahap.",
    "Sediakan area jawaban atau instruksi pengisian yang jelas.",
    "Sertakan rubrik penilaian agar siswa tahu kriteria penilaian."
  ];
  outputFormat = "Markdown";
  qualityChecklist = ["Stimulus menarik", "Langkah kerja logis", "Pertanyaan analisis menuntut nalar kritis", "Rubrik terdefinisi"];

  buildPrompt(input: any): string {
    // Jalankan educational framework
    const ldResult = LearningDesignFramework.analyze({
      topik: input.topic,
      tujuanPembelajaran: input.learningObjective || "",
      jenjang: "SMA", // Default estimate
      kelas: input.class,
      profilSiswa: input.lkpdActivity,
      jumlahSiswa: 30,
      targetKarakter: input.targetKarakter
    });

    const diffResult = DifferentiationFramework.analyze({
      kemampuanAwal: "Campuran",
      heterogenitas: "Bervariasi",
      jumlahSiswa: 30
    });

    const charResult = CharacterFramework.analyze({
      targetKarakter: input.targetKarakter || "Kolaborasi"
    });

    return `Anda adalah perancang modul aktivitas siswa (LKPD) berpengalaman di Indonesia.
Gunakan framework berpikir Guru Profesional berikut:
${this.PedagogicalFramework}

Rekomendasi Aktivitas & Scaffolding (Educational Brain):
- Model Aktivitas: ${ldResult.recommendedModels.join(", ")}
- Strategi Diferensiasi LKPD:
  * Siswa Cepat (Fast): ${diffResult.fastLearnerStrategy} (Rancang pertanyaan pengayaan)
  * Siswa Butuh Bimbingan (Support): ${diffResult.supportLearnerStrategy} (Berikan perancah tambahan)
- Fokus Karakter: ${charResult.characterName} (Indikator: ${charResult.behaviorIndicators.join(", ")})

Buatlah sebuah Lembar Kerja Peserta Didik (LKPD) yang terstruktur, menantang, dan siap pakai dalam Bahasa Indonesia berdasarkan parameter berikut:

Parameter Input:
- Kelas: ${input.class}
- Mata Pelajaran: ${input.subject}
- Topik LKPD: ${input.topic}
- Tujuan Aktivitas: ${input.learningObjective || "Mengeksplorasi secara kritis topik bahasan."}
- Tipe Aktivitas: ${input.lkpdActivity || "Kelompok / Mandiri"}
- Durasi Pengerjaan: ${input.duration || "40 menit"}
- Output Target Siswa: ${input.lkpdOutput || "Laporan dan Presentasi Kelompok"}
- Konteks Stimulus: ${input.konteks || "Kasus kehidupan sehari-hari"}
- Catatan Tambahan: ${input.notes || "-"}

Output LKPD HARUS terstruktur rapi dengan format Markdown berikut:

1. **IDENTITAS LKPD** (Judul LKPD, Mapel, Kelas, Alokasi Waktu, Nama Anggota Kelompok/Mandiri)
2. **TUJUAN AKTIVITAS & INDIKATOR PENCAPAIAN** (Integrasikan fokus karakter: ${charResult.characterName})
3. **STIMULUS / KASUS / FENOMENA** (Cerita singkat, studi kasus, atau data sederhana yang menarik siswa bernalar kritis terkait ${input.topic} dalam konteks ${input.konteks})
4. **ALAT DAN BAHAN** (Jika ada eksperimen/aktivitas fisik)
5. **PETUNJUK & INSTRUKSI KERJA** (Langkah-langkah detail dan bertahap apa yang harus dilakukan siswa. Terapkan strategi diferensiasi: berikan petunjuk terperinci/scaffolding bagi yang kesulitan, dan tantangan mandiri bagi yang cepat)
6. **LANGKAH KERJA / PROSES PENYELIDIKAN**
7. **RUANG JAWABAN & TABEL PENGAMATAN** (Bentuk tabel atau kotak kosong yang siap diisi siswa)
8. **PERTANYAAN ANALISIS & DISKUSI** (3-5 pertanyaan berbobot High Order Thinking Skills (HOTS) untuk menganalisis stimulus. Sertakan minimal 1 soal pengayaan lanjutan)
9. **KESIMPULAN & REFLEKSI GURU & SISWA** (Ruang bagi siswa menyimpulkan pembelajarannya. Sertakan pertanyaan reflektif: ${charResult.reflectionQuestions.join(" / ")})
10. **RUBRIK PENILAIAN SEDERHANA** (Rubrik kriteria penilaian untuk aspek Kerja Sama, Ketepatan Jawaban, Presentasi)

Jangan berikan teks pembuka atau penutup basa-basi, langsung mulai output dengan judul LKPD.`;
  }
}
