import { BaseSkill } from "./baseSkill.ts";
import { AssessmentFramework } from "../frameworks/assessmentFramework.ts";

export class AssessmentSkill extends BaseSkill {
  id = "assessment";
  name = "Assessment Designer";
  description = "Merancang instrumen penilaian, bank soal, kisi-kisi, dan rubrik asesmen Kurikulum Merdeka.";
  purpose = "Membantu membuat instrumen asesmen yang valid, reliabel, selaras dengan tujuan pembelajaran, lengkap dengan kunci, pembahasan, dan rekomendasi remedial/pengayaan.";
  requiredInputs = ["class", "subject", "topic", "learningObjective"];
  optionalInputs = ["difficulty", "questionType", "cognitiveLevel", "numQuestions", "includeAnswerKey", "konteks", "notes"];
  rules = [
    "Evaluasi apakah bentuk asesmen (misal Pilihan Ganda) benar-benar cocok untuk Tujuan Pembelajaran tersebut. Jika TP menyangkut keterampilan tingkat tinggi/praktik, sarankan atau buat bentuk Asesmen Proyek/Portofolio/Studi Kasus.",
    "Pastikan soal bervariasi tingkat kognitifnya (C1 hingga C6) sesuai permintaan.",
    "Setiap soal wajib dilengkapi kunci jawaban dan pembahasan yang jelas.",
    "Jangan gunakan data fiktif."
  ];
  outputFormat = "Markdown";
  qualityChecklist = ["Kisi-kisi soal jelas", "Soal selaras dengan TP", "Kunci dan pembahasan lengkap", "Saran remedial konkret"];

  buildPrompt(input: any): string {
    // Jalankan educational framework
    const assessResult = AssessmentFramework.analyze({
      tujuanPembelajaran: input.learningObjective,
      indikator: input.topic,
      levelKognitif: input.cognitiveLevel
    });

    const typeLower = (input.questionType || "").toLowerCase();
    const isPerformance = ["proyek", "presentasi", "produk", "praktikum", "diskusi", "portofolio", "kinerja"].some(t => 
      typeLower.includes(t)
    );

    let rubricInstruction = "";
    if (isPerformance) {
      rubricInstruction = `
PENTING (Integrasi Rubric Engine): Karena asesmen ini berbentuk kinerja/proyek/praktikum/portofolio/presentasi/produk, Anda WAJIB membuat rubrik penilaian analitik terstruktur pada bagian 5 (Kunci Jawaban & Rubrik Penilaian).
Rubrik harus berbentuk tabel Markdown dengan kolom:
- Kriteria Penilaian (minimal 3 kriteria relevan)
- Skor 4 (Sangat Baik): deskripsi perilaku konkret teramati
- Skor 3 (Baik): deskripsi perilaku konkret teramati
- Skor 2 (Cukup): deskripsi perilaku konkret teramati
- Skor 1 (Perlu Bimbingan): deskripsi perilaku konkret teramati

Tuliskan juga Petunjuk Perhitungan Nilai Akhir dengan rumus: (Skor Perolehan / Skor Maksimal) x 100 beserta interpretasi nilai predikatnya.`;
    }

    return `Anda adalah Assessment Specialist dan Evaluator Pembelajaran bersertifikasi di Indonesia.
Gunakan framework berpikir Guru Profesional berikut:
${this.PedagogicalFramework}

Rekomendasi Penilaian Terstruktur (Educational Brain):
- Level Kognitif Matched: ${assessResult.cognitiveLevel}
- Tipe Asesmen Direkomendasikan: ${assessResult.recommendedAssessmentType}
- Alasan Pedagogis (Reasoning): ${assessResult.assessmentReasoning}
- Asesmen Alternatif: ${assessResult.alternativeAssessment.join(", ")}

Buatlah sebuah Rancangan Asesmen Pembelajaran yang lengkap, valid, dan profesional berdasarkan parameter berikut:

Parameter Input:
- Kelas/Jenjang: ${input.class}
- Mata Pelajaran: ${input.subject}
- Materi/Topik: ${input.topic}
- Tujuan Pembelajaran (TP): ${input.learningObjective}
- Bentuk Asesmen Diinginkan: ${input.questionType || "Pilihan Ganda"}
- Level Kognitif Target: ${assessResult.cognitiveLevel}
- Jumlah Soal/Tugas: ${input.numQuestions || "5"}
- Tingkat Kesulitan: ${input.difficulty || "Sedang"}
- Konteks Siswa: ${input.konteks || "Kontekstual kehidupan sehari-hari"}
- Catatan Tambahan: ${input.notes || "-"}
${rubricInstruction}

Analisis Kecocokan:
- Evaluasi secara profesional: Apakah TP "${input.learningObjective}" paling tepat dinilai dengan ${input.questionType || "Pilihan Ganda"}? Rujuk analisis berikut: ${assessResult.assessmentReasoning}. Jika TP mengarah pada keterampilan praktis, pemecahan masalah kompleks, atau kolaborasi, gunakan bentuk asesmen alternatif yang disarankan: ${assessResult.alternativeAssessment.join(", ")}.

Output Asesmen HARUS terstruktur rapi dengan format Markdown berikut:

1. **IDENTITAS ASESMEN** (Mapel, Kelas, Topik, TP, Target Level Kognitif)
2. **ANALISIS VALIDITAS & REKOMENDASI ASESMEN** (Evaluasi kelayakan bentuk asesmen yang diminta vs alternatifnya berdasarkan analisis kecocokan)
3. **KISI-KISI & INDIKATOR SOAL** (Tabel yang berisi: No, TP, Indikator Soal, Level Kognitif, No. Soal)
4. **BUTIR SOAL / TUGAS ASESMEN** (Tampilkan soal sejumlah ${input.numQuestions || 5} butir. Jika Pilihan Ganda, tampilkan opsi A, B, C, D, E. Jika Proyek/Kinerja/Studi Kasus, tampilkan rincian tugas dan petunjuk kerja secara komprehensif)
5. **KUNCI JAWABAN & RUBRIK PENILAIAN** (Kunci jawaban untuk PG, atau rubrik penilaian kinerja analitik untuk Uraian/Proyek/Kinerja/Studi Kasus)
6. **PEMBAHASAN DETAIL** (Pembahasan langkah demi langkah untuk setiap soal)
7. **KLASIFIKASI SOAL** (Tabel level kognitif & tingkat kesulitan tiap butir)
8. **SARAN STRATEGI REMEDIAL & PENGAYAAN** (Langkah tindak lanjut konkret bagi siswa yang di bawah KKTP atau melampaui)

Jangan berikan teks pembuka atau penutup basa-basi, langsung mulai output dengan judul rancangan.`;
  }
}
