import { BaseSkill } from "./baseSkill.ts";
import { LearningDesignFramework } from "../frameworks/learningDesignFramework.ts";
import { DifferentiationFramework } from "../frameworks/differentiationFramework.ts";
import { CharacterFramework } from "../frameworks/characterFramework.ts";

export class LessonPlannerSkill extends BaseSkill {
  id = "lesson-planner";
  name = "Modul Ajar / RPP";
  description = "Membantu membuat modul ajar Kurikulum Merdeka yang lengkap, berorientasi siswa, dan sesuai standar Kemendikbud.";
  purpose = "Menyusun modul ajar interaktif dengan analisis diagnostik, rencana diferensiasi, asesmen yang pas, dan refleksi pembelajaran.";
  requiredInputs = ["class", "subject", "topic", "duration"];
  optionalInputs = [
    "objectives", "pertemuan", "targetKarakter", "method", "instruments",
    "notes", "kemampuanAwal", "kondisiKelas", "jumlahSiswa", "tantanganKelas", "saranaPrasarana"
  ];
  rules = [
    "Pahami kemampuan awal siswa dan kondisi kelas.",
    "Terapkan diferensiasi konten/proses/produk untuk siswa cepat, sedang, dan butuh bantuan.",
    "Integrasikan Projek Penguatan Profil Pelajar Pancasila (P3) secara bermakna.",
    "Jangan gunakan data sekolah fiktif.",
    "Jawab dalam Bahasa Indonesia yang formal dan mudah dipahami guru."
  ];
  outputFormat = "Markdown";
  qualityChecklist = ["Tujuan Pembelajaran jelas", "Langkah diferensiasi ada", "Karakter P3 terintegrasi", "Asesmen dan rubrik lengkap"];

  buildPrompt(input: any): string {
    // Jalankan educational framework
    const ldResult = LearningDesignFramework.analyze({
      topik: input.topic,
      tujuanPembelajaran: input.objectives || "",
      jenjang: input.jenjang || "SMA",
      kelas: input.class,
      profilSiswa: `${input.kondisiKelas || ""} ${input.tantanganKelas || ""}`,
      jumlahSiswa: Number(input.jumlahSiswa) || 30,
      targetKarakter: input.targetKarakter
    });

    const diffResult = DifferentiationFramework.analyze({
      kemampuanAwal: input.kemampuanAwal,
      heterogenitas: input.tantanganKelas,
      jumlahSiswa: Number(input.jumlahSiswa) || 30
    });

    const charResult = CharacterFramework.analyze({
      targetKarakter: input.targetKarakter || "Kolaborasi"
    });

    return `Anda adalah senior education specialist dan perancang kurikulum Indonesia.
Gunakan framework berpikir Guru Profesional berikut:
${this.PedagogicalFramework}

Rekomendasi Desain Pembelajaran Terstruktur (Educational Brain):
- Model Pembelajaran Direkomendasikan: ${ldResult.recommendedModels.join(", ")}
- Kegiatan Utama: ${ldResult.recommendedActivities.join(" / ")}
- Strategi Asesmen Terpilih: ${ldResult.recommendedAssessmentTypes.join(", ")}
- Risiko Pembelajaran: ${ldResult.risks.join(" / ") || "Normal"}
- Rencana Diferensiasi:
  * Siswa Cepat (Fast): ${diffResult.fastLearnerStrategy}
  * Siswa Sedang (Regular): ${diffResult.regularLearnerStrategy}
  * Siswa Butuh Bimbingan (Support): ${diffResult.supportLearnerStrategy}
- Integrasi Karakter: ${charResult.characterName}
  * Indikator Perilaku: ${charResult.behaviorIndicators.join(", ")}
  * Metode Observasi: ${charResult.observationMethod}
  * Penguatan Karakter: ${charResult.reinforcementStrategies.join(", ")}

Buatlah sebuah Modul Ajar (RPP) Kurikulum Merdeka yang lengkap, profesional, dan siap pakai dalam Bahasa Indonesia berdasarkan parameter berikut:

Identitas & Diagnosis:
- Jenjang: ${input.jenjang || "SMA"}
- Kelas: ${input.class}
- Mata Pelajaran: ${input.subject}
- Topik/Materi: ${input.topic}
- Durasi: ${input.duration} menit
- Jumlah Siswa: ${input.jumlahSiswa || "-"} siswa
- Kemampuan Awal Siswa: ${input.kemampuanAwal || "Bervariasi, sebagian memahami konsep dasar topik ini."}
- Kondisi Kelas: ${input.kondisiKelas || "Kondusif, gaya belajar campuran visual dan kinestetik."}
- Tantangan Kelas: ${input.tantanganKelas || "Fokus siswa menurun di pertengahan sesi."}

Perencanaan & Pembelajaran:
- Tujuan Pembelajaran: ${input.objectives || "Siswa memahami konsep dan relevansi praktis topik ini."}
- Karakter Profil Pelajar Pancasila (P3): ${input.targetKarakter || "Mandiri, Bernalar Kritis, Kreatif"}
- Model/Metode Pembelajaran: ${ldResult.recommendedModels.join(", ")} (Gunakan rekomendasi ini secara dominan)
- Sarana dan Prasarana: ${input.saranaPrasarana || "Buku teks, Laptop, Proyektor, Alat Tulis"}
- Catatan Tambahan: ${input.notes || "-"}

Asesmen:
- Bentuk Asesmen Pilihan: ${input.instruments ? (Array.isArray(input.instruments) ? input.instruments.join(", ") : input.instruments) : ldResult.recommendedAssessmentTypes.join(", ")}

Output Modul Ajar HARUS terstruktur rapi dengan format Markdown berikut:

1. **IDENTITAS MODUL** (Mapel, Kelas, Alokasi Waktu, Model, Karakter P3)
2. **KONDISI AWAL & TANTANGAN SISWA** (Diagnosis profil siswa, kemampuan awal, tantangan kelas)
3. **TUJUAN PEMBELAJARAN & PEMAHAMAN BERMAKNA**
4. **PERTANYAAN PEMANTIK** (2-3 pertanyaan kontekstual)
5. **KEGIATAN PEMBELAJARAN**:
    - **Pendahuluan**: Kegiatan awal pembukaan kelas, apersepsi, motivasi, dan penyampaian tujuan (cantumkan perkiraan durasi).
    - **Kegiatan Inti**: Langkah-langkah detail eksplorasi konsep, demonstrasi, latihan, atau kerja kelompok menggunakan metode pembelajaran pilihan (cantumkan perkiraan durasi).
    - **Penutup**: Kegiatan refleksi bersama, kesimpulan materi, evaluasi singkat, dan tindak lanjut/penugasan (cantumkan perkiraan durasi).
6. **RENCANA DIFERENSIASI**:
    - Untuk Siswa Cepat (Pengayaan): Jabarkan ${diffResult.fastLearnerStrategy} secara konkret.
    - Untuk Siswa Sedang (Reguler): Jabarkan ${diffResult.regularLearnerStrategy} secara konkret.
    - Untuk Siswa yang Butuh Bimbingan (Remedial/Scaffolding): Jabarkan ${diffResult.supportLearnerStrategy} secara konkret.
7. **ASESMEN PEMBELAJARAN**:
    - Asesmen Diagnostik (sebelum belajar)
    - Asesmen Formatif (proses belajar)
    - Asesmen Sumatif (akhir belajar)
8. **RUBRIK PENILAIAN SEDERHANA** (untuk menilai sikap, keterampilan, atau pengetahuan)
9. **TINDAK LANJUT** (Strategi remedial dan pengayaan konkret)
10. **REFLEKSI** (Pertanyaan refleksi untuk Guru dan Siswa. Integrasikan pertanyaan refleksi karakter: ${charResult.reflectionQuestions.join(" / ")})

Jangan berikan teks pembuka atau penutup basa-basi, langsung mulai output dengan judul modul.`;
  }
}
