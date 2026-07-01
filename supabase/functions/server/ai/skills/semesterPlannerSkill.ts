import { BaseSkill } from "./baseSkill.ts";
import { LearningDesignFramework } from "../frameworks/learningDesignFramework.ts";
import { DifferentiationFramework } from "../frameworks/differentiationFramework.ts";
import { CharacterFramework } from "../frameworks/characterFramework.ts";

export class SemesterPlannerSkill extends BaseSkill {
  id = "semester-planner";
  name = "Rencana Program Semester";
  description = "Membuat Rencana Program Semester (Semester Plan) komprehensif sebagai induk dari workflow guru.";
  purpose = "Merancang peta kompetensi per minggu, alur tujuan pembelajaran, aktivitas inti, asesmen, dan produk belajar siswa.";
  requiredInputs = ["targetYear", "targetSemester", "selectedClass", "selectedSubject", "capaianPembelajaran"];
  optionalInputs = [
    "jenjang", "profilSiswa", "targetKarakter", "modelPembelajaran", "instrumenPenilaian",
    "jumlahPertemuan", "alokasiJam", "mulaiTanggal", "proyekAkhir", "catatanTambahan"
  ];
  rules = [
    "Jadikan program semester terstruktur per minggu/pertemuan.",
    "Pastikan aktivitas teratur sesuai KKM/KKTP dan alokasi waktu.",
    "Sertakan target karakter P3 di tiap minggu/pertemuan.",
    "Jangan gunakan data sekolah fiktif.",
    "Kembalikan data dalam format JSON yang valid."
  ];
  outputFormat = "JSON";
  qualityChecklist = ["JSON valid dan terurai", "Jumlah pertemuan sesuai request", "Setiap pertemuan memiliki tujuan, topik, aktivitas, dan asesmen"];

  buildPrompt(input: any): string {
    // Jalankan educational framework
    const ldResult = LearningDesignFramework.analyze({
      topik: `Program Semester ${input.selectedSubject}`,
      tujuanPembelajaran: input.capaianPembelajaran || "",
      jenjang: input.jenjang || "SMA",
      kelas: input.selectedClass,
      profilSiswa: input.profilSiswa,
      jumlahSiswa: 30, // Default estimate
      targetKarakter: input.targetKarakter
    });

    const diffResult = DifferentiationFramework.analyze({
      kemampuanAwal: "Bervariasi",
      heterogenitas: "Sedang",
      jumlahSiswa: 30
    });

    const charResult = CharacterFramework.analyze({
      targetKarakter: input.targetKarakter || "Kolaborasi"
    });

    return `Anda adalah senior education planner dan ahli kurikulum Indonesia.
Gunakan framework berpikir Guru Profesional berikut:
${this.PedagogicalFramework}

Rekomendasi Rencana Semester Pembelajaran Terstruktur (Educational Brain):
- Model Pembelajaran Utama: ${ldResult.recommendedModels.join(", ")}
- Strategi Aktivitas Inti: ${ldResult.recommendedActivities.join(" / ")}
- Rencana Asesmen: ${ldResult.recommendedAssessmentTypes.join(", ")}
- Pengkondisian Karakter Prioritas: ${charResult.characterName} (Indikator: ${charResult.behaviorIndicators.join(", ")})
- Diferensiasi Pembelajaran:
  * Siswa Cepat (Fast): ${diffResult.fastLearnerStrategy}
  * Siswa Sedang (Regular): ${diffResult.regularLearnerStrategy}
  * Siswa Butuh Bimbingan (Support): ${diffResult.supportLearnerStrategy}

Buatlah sebuah Rencana Program Semester (Semester Plan) Kurikulum Merdeka yang detail berdasarkan parameter berikut:

Identitas & Diagnosis:
- Tahun Ajaran: ${input.targetYear}
- Semester: ${input.targetSemester}
- Jenjang: ${input.jenjang || "SMA"}
- Kelas: ${input.selectedClass}
- Mata Pelajaran: ${input.selectedSubject}
- Capaian Pembelajaran (CP): ${input.capaianPembelajaran}
- Profil/Kondisi Siswa: ${input.profilSiswa || "Bervariasi secara akademik dan gaya belajar."}

Perencanaan Program:
- Jumlah Pertemuan/Minggu: ${input.jumlahPertemuan || 16}
- Alokasi Jam Pelajaran (JP): ${input.alokasiJam || 2} JP
- Mulai Tanggal: ${input.mulaiTanggal || "-"}
- Karakter P3: ${input.targetKarakter || charResult.characterName}
- Model Pembelajaran Utama: ${ldResult.recommendedModels[0] || input.modelPembelajaran}
- Instrumen Penilaian: ${input.instrumenPenilaian ? (Array.isArray(input.instrumenPenilaian) ? input.instrumenPenilaian.join(", ") : input.instrumenPenilaian) : ldResult.recommendedAssessmentTypes.join(", ")}
- Proyek Akhir Semester: ${input.proyekAkhir || "-"}
- Catatan Tambahan: ${input.catatanTambahan || "-"}

Output Semester Planner HARUS dikembalikan dalam format JSON valid dengan skema berikut:
{
  "title": "Rencana Program Semester [Mata Pelajaran] Kelas [Kelas]",
  "schoolYear": "${input.targetYear}",
  "semester": "${input.targetSemester}",
  "jenjang": "${input.jenjang || "SMA"}",
  "kelas": "${input.selectedClass}",
  "mapel": "${input.selectedSubject}",
  "capaianPembelajaran": "${input.capaianPembelajaran}",
  "profilSiswa": "${input.profilSiswa || ""}",
  "targetKarakter": "${input.targetKarakter || ""}",
  "modelPembelajaran": "${input.modelPembelajaran || ""}",
  "assessmentPlan": "${input.instrumenPenilaian ? (Array.isArray(input.instrumenPenilaian) ? input.instrumenPenilaian.join(", ") : input.instrumenPenilaian) : ""}",
  "meetings": [
    {
      "meetingNumber": 1,
      "week": 1,
      "topic": "Topik pembelajaran khusus minggu ke-1",
      "learningObjective": "Tujuan pembelajaran khusus minggu ke-1 yang diturunkan dari Capaian Pembelajaran",
      "keyConcepts": ["Konsep Kunci 1", "Konsep Kunci 2"],
      "learningActivities": "Penjelasan ringkas aktivitas inti pendahuluan, inti, dan penutup",
      "assessmentType": "Jenis/instrumen asesmen khusus pertemuan ini",
      "characterFocus": "Fokus karakter P3 yang dilatih",
      "studentProduct": "Hasil produk/karya/tugas belajar siswa",
      "remedialPlan": "Strategi remedial: ${diffResult.supportLearnerStrategy}",
      "enrichmentPlan": "Strategi pengayaan: ${diffResult.fastLearnerStrategy}",
      "teacherNotes": "Catatan pedagogis guru"
    }
  ]
}

Pastikan jumlah item di dalam array "meetings" sama dengan ${input.jumlahPertemuan || 16} pertemuan.
Kembalikan HANYA objek JSON valid di atas tanpa menyertakan tanda petik backtick (\`\`\`json) atau teks pengantar/penutup apapun.`;
  }
}
