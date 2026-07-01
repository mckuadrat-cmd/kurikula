import { BaseSkill } from "./baseSkill.ts";

export class LearningAnalysisSkill extends BaseSkill {
  id = "learning-analysis";
  name = "Analisis Hasil Belajar";
  description = "Menganalisis hasil ulangan/tugas siswa untuk menentukan tindak lanjut remedial dan pengayaan.";
  purpose = "Mengidentifikasi siswa yang belum tuntas, memetakan indikator/tujuan pembelajaran yang paling lemah, serta merekomendasikan strategi perbaikan kelas.";
  requiredInputs = ["students", "kktp"];
  optionalInputs = ["subject", "class", "indicators", "teacherNotes"];
  rules = [
    "Hitung persentase ketuntasan kelas secara tepat.",
    "Klasifikasikan siswa ke dalam kelompok remedial dan pengayaan.",
    "Analisis indikator mana yang paling banyak gagal dikuasai siswa.",
    "Rancang saran remedial kelompok maupun individual secara praktis."
  ];
  outputFormat = "Markdown";
  qualityChecklist = ["Statistik ketuntasan tepat", "Daftar remedial dan pengayaan terpisah", "Rekomendasi remedial operasional", "Catatan kepala sekolah tersedia"];

  buildPrompt(input: any): string {
    const studentsFormatted = Array.isArray(input.students) 
      ? input.students.map((s: any) => `- Name: ${s.name || s.studentName}, Score: ${s.score || s.nilai}`).join("\n")
      : input.students;

    return `Anda adalah Education Analyst dan Guru Senior berpengalaman di Indonesia.
Gunakan framework berpikir Guru Profesional berikut:
${this.PedagogicalFramework}

Lakukan analisis hasil belajar (analisis nilai kelas) berdasarkan parameter berikut:

Parameter Input:
- Mata Pelajaran: ${input.subject || "-"}
- Kelas: ${input.class || "-"}
- KKM / Kriteria Ketercapaian Tujuan Pembelajaran (KKTP): ${input.kktp}
- Indikator / Tujuan Pembelajaran yang Diuji: ${input.indicators || "Umum"}
- Daftar Nilai Siswa:\n${studentsFormatted}
- Catatan Tambahan Guru: ${input.teacherNotes || "-"}

Output Analisis Hasil Belajar HARUS terstruktur rapi dengan format Markdown berikut:

1. **STATISTIK KETUNTASAN BELAJAR** (Jumlah siswa tuntas, jumlah belum tuntas, nilai tertinggi, nilai terendah, rata-rata kelas, persentase ketuntasan klasikal)
2. **DAFTAR SISWA KELOMPOK REMEDIAL** (Siswa dengan nilai < KKTP, beserta besarnya selisih nilai)
3. **DAFTAR SISWA KELOMPOK PENGAYAAN** (Siswa dengan nilai >= KKTP)
4. **ANALISIS INDIKATOR SOAL & TP PALING LEMAH** (Analisis konseptual mengenai bagian TP mana yang paling menyulitkan siswa)
5. **REKOMENDASI PROGRAM REMEDIAL** (Strategi tutor sebaya, penugasan khusus, atau pengajaran ulang terstruktur)
6. **REKOMENDASI PROGRAM PENGAYAAN** (Materi perluasan, proyek mandiri, atau penugasan HOTS)
7. **STRATEGI PEMBELAJARAN BERIKUTNYA** (Perubahan apa yang perlu dilakukan guru di kelas untuk topik berikutnya)
8. **RINGKASAN UNTUK KEPALA SEKOLAH / WALI KELAS** (Laporan formal satu paragraf mengenai kondisi ketuntasan kelas)

Jangan berikan teks pembuka atau penutup basa-basi.`;
  }
}
