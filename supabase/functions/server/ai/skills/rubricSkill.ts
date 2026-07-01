import { BaseSkill } from "./baseSkill.ts";

export class RubricSkill extends BaseSkill {
  id = "rubric-generator";
  name = "Rubric Engine";
  description = "Membuat rubrik penilaian kinerja siswa secara otomatis untuk presentasi, produk, proyek, praktikum, dll.";
  purpose = "Menghasilkan kriteria penilaian yang jelas, level pencapaian (misal: Perlu Bimbingan, Cukup, Baik, Sangat Baik), deskripsi indikator perilaku, dan skor.";
  requiredInputs = ["rubricType", "topic"];
  optionalInputs = ["classLevel", "learningObjective"];
  rules = [
    "Sesuaikan rubrik dengan standar penilaian Kurikulum Merdeka (Kriteria Ketuntasan Tujuan Pembelajaran - KKTP).",
    "Gunakan 4 tingkat pencapaian: 1 (Perlu Bimbingan), 2 (Cukup), 3 (Baik), 4 (Sangat Baik).",
    "Deskripsikan perilaku konkret yang teramati (observable behavior) untuk masing-masing kriteria pada setiap tingkat pencapaian.",
    "Format output berupa tabel Markdown yang rapi dan mudah dibaca."
  ];
  outputFormat = "Markdown";
  qualityChecklist = ["Ada tabel kriteria penilaian", "Deskripsi setiap tingkat pencapaian jelas", "Pilihan skor logis", "Ada petunjuk penghitungan nilai akhir"];

  buildPrompt(input: any): string {
    return `Anda adalah Asesor Pendidikan dan Ahli Evaluasi Pembelajaran Nasional di Indonesia.
Silakan rancang Rubrik Penilaian Kinerja Siswa yang komprehensif berdasarkan parameter berikut:

Parameter Input:
- Jenis Rubrik: ${input.rubricType} (Pilihan: Presentasi, Diskusi, Praktikum, Produk, Proyek, Portofolio)
- Topik / Aktivitas: ${input.topic}
- Jenjang / Kelas: ${input.classLevel || "Umum"}
- Tujuan Pembelajaran Terkait: ${input.learningObjective || "Umum"}

Output Rubrik HARUS diformat dalam Markdown terstruktur dengan bagian:
1. **INFORMASI RUBRIK** (Jenis Rubrik, Aktivitas, Jenjang)
2. **TABEL RUBRIK PENILAIAN** (Tabel dengan kolom: No, Kriteria Penilaian, Skor 1 (Perlu Bimbingan), Skor 2 (Cukup), Skor 3 (Baik), Skor 4 (Sangat Baik))
3. **PANDUAN PENSKORAN & NILAI AKHIR** (Rumus perhitungan Nilai Akhir: (Skor Perolehan / Skor Maksimal) x 100 beserta interpretasi predikatnya)

Pastikan deskripsi indikator pada skor 4 benar-benar menggambarkan pencapaian tingkat tinggi (HOTS/Sangat Baik) dan skor 1 menggambarkan keterbatasan/butuh bantuan guru.`;
  }
}
