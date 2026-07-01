import { BaseSkill } from "./baseSkill.ts";

export class StudentCommentSkill extends BaseSkill {
  id = "student-comment";
  name = "Komentar Rapor Murid";
  description = "Membuat komentar rapor (deskripsi capaian belajar) siswa yang konstruktif dan memotivasi.";
  purpose = "Menghasilkan deskripsi kemajuan akademik dan sikap sosial murid secara objektif, humanis, dan bersahabat bagi orang tua.";
  requiredInputs = ["studentName", "subject", "averageScore"];
  optionalInputs = [
    "class", "semester", "highestScore", "lowestScore", "attendance",
    "strengths", "needsImprovement", "teacherNotes", "style"
  ];
  rules = [
    "Gunakan kalimat yang positif, konstruktif, dan memotivasi siswa untuk terus berkembang.",
    "Sesuaikan komentar dengan data nilai rata-rata, kekuatan, dan aspek perbaikan yang diberikan.",
    "Jangan gunakan bahasa yang memojokkan siswa.",
    "Terapkan gaya bahasa yang dipilih (formal, hangat, singkat, detail)."
  ];
  outputFormat = "Markdown";
  qualityChecklist = ["Kalimat pembuka positif", "Menjelaskan kekuatan", "Menyertakan area perbaikan secara santun", "Saran tindak lanjut konkret"];

  buildPrompt(input: any): string {
    const styleDescription = input.style === "hangat"
      ? "Gunakan nada ramah, penuh perhatian, dan bersahabat layaknya orang tua kedua."
      : input.style === "singkat"
      ? "Jawab secara padat, ringkas, langsung pada poin utama (maksimal 3-4 kalimat)."
      : input.style === "detail"
      ? "Ulas secara mendalam aspek kognitif, afektif, dan psikomotorik."
      : "Gunakan bahasa formal, sopan, objektif, dan terstruktur sesuai tata bahasa Indonesia baku.";

    return `Anda adalah wali kelas dan guru bimbingan konseling profesional di Indonesia.
Gunakan framework berpikir Guru Profesional berikut:
${this.PedagogicalFramework}

Buatlah komentar rapor murid berdasarkan parameter berikut:

Parameter Input:
- Nama Murid: ${input.studentName}
- Kelas: ${input.class || "-"}
- Semester: ${input.semester || "-"}
- Mata Pelajaran: ${input.subject}
- Nilai Rata-rata: ${input.averageScore}
- Nilai Tertinggi: ${input.highestScore || "-"}
- Nilai Terendah: ${input.lowestScore || "-"}
- Kehadiran (Absensi): ${input.attendance || "Sangat baik"}
- Kekuatan Siswa (Strengths): ${input.strengths || "Aktif berdiskusi, memahami konsep dasar dengan baik."}
- Aspek Perlu Ditingkatkan (Needs Improvement): ${input.needsImprovement || "Ketelitian dalam mengerjakan soal hitungan."}
- Catatan Guru: ${input.teacherNotes || "-"}
- Gaya Bahasa Pilihan: ${input.style || "formal"} (${styleDescription})

Output Komentar Rapor HARUS memiliki bagian berikut:

1. **KOMENTAR RAPOR SINGKAT** (Satu paragraf padat berisi capaian materi dominan dan saran esensial, cocok untuk kolom terbatas)
2. **KOMENTAR RAPOR DETAIL** (Deskripsi lengkap yang mengulas kekuatan belajar siswa, sikap perilaku di kelas, dan perkembangan keterampilannya)
3. **SARAN TINGKAT LANJUT UNTUK SISWA** (Langkah praktis yang perlu dicoba siswa)
4. **SARAN TINGKAT LANJUT UNTUK ORANG TUA** (Bentuk dukungan konkret yang bisa diberikan di rumah)

Pastikan bahasa yang digunakan santun, memotivasi, dan tidak menyinggung perasaan siswa maupun orang tua. Jangan berikan teks pembuka atau penutup basa-basi.`;
  }
}
