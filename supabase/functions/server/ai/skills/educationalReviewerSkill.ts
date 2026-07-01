import { BaseSkill } from "./baseSkill.ts";
import { ReflectionFramework } from "../frameworks/reflectionFramework.ts";

export class EducationalReviewerSkill extends BaseSkill {
  id = "educational-reviewer";
  name = "Educational Reviewer V2";
  description = "Mereview dokumen kurikulum sekolah (RPP, LKPD, bahan ajar, asesmen) dan memberikan skor pilar terstruktur serta perbaikan otomatis.";
  purpose = "Memberikan penilaian skor pilar numerik kritis, kekuatan, kelemahan, rekomendasi, dan draf versi perbaikan penuh dalam format JSON.";
  requiredInputs = ["documentType", "documentContent"];
  optionalInputs = ["documentGoal", "classContext", "improveRequested"];
  rules = [
    "Evaluasi secara objektif dan kritis menggunakan standar nasional Kurikulum Merdeka.",
    "Skor pilar harus berupa integer antara 0 hingga 100.",
    "Nilai pilar wajib dievaluasi: kejelasan_tujuan, aktivitas_pembelajaran, asesmen, diferensiasi, integrasi_karakter, keterpakaian.",
    "Tentukan status dokumen berdasarkan rata-rata skor pilar: Rerata >= 85: 'Sangat Baik'; 70-84: 'Layak Digunakan'; 55-69: 'Perlu Revisi Minor'; <55: 'Perlu Revisi Mayor'.",
    "Gunakan bahasa Indonesia baku, formal, ramah, dan mendidik.",
    "Kembalikan data HANYA dalam format JSON valid sesuai skema yang diminta."
  ];
  outputFormat = "JSON";
  qualityChecklist = [
    "Skor pilar lengkap 0-100",
    "Ada status kelayakan yang sesuai",
    "Strengths, weaknesses, dan recommendations terisi lengkap",
    "Ada improvedVersionSuggestions"
  ];

  buildPrompt(input: any): string {
    // Jalankan refleksi internal jika ada catatan kendala/hasil untuk memperkaya reviewer
    let reflectionNotes = "";
    if (input.classContext) {
      const reflectionResult = ReflectionFramework.analyze({
        aktivitas: input.documentType,
        hasil: "Proses evaluasi dokumen review",
        kendala: input.classContext,
        catatanGuru: input.documentGoal
      });
      reflectionNotes = `\nCatatan Evaluasi Awal Konteks:\n- Kekuatan Teridentifikasi: ${reflectionResult.whatWorked}\n- Kelemahan Konteks: ${reflectionResult.whatNeedsImprovement}\n- Tindakan Berikutnya: ${reflectionResult.nextAction}\n`;
    }

    return `Anda adalah Reviewer Kurikulum Senior dan Dewan Pendidikan Nasional Indonesia.
Tugas Anda adalah meninjau secara mendalam dan terstruktur dokumen pendidikan berikut:

Parameter Input Dokumen:
- Jenis Dokumen: ${input.documentType}
- Tujuan/Goal: ${input.documentGoal || "Umum"}
- Konteks Kelas: ${input.classContext || "Bervariasi"}
- Isi Dokumen Yang Ditinjau:\n"""\n${input.documentContent}\n"""
${reflectionNotes}

Anda harus membalas HANYA dengan dokumen JSON valid yang mengikuti skema berikut:
{
  "scores": {
    "kejelasan_tujuan": 85, // skor integer 0-100
    "aktivitas_pembelajaran": 70,
    "asesmen": 75,
    "diferensiasi": 60,
    "integrasi_karakter": 65,
    "keterpakaian": 75
  },
  "status": "Layak Digunakan", // Pilihan: 'Sangat Baik', 'Layak Digunakan', 'Perlu Revisi Minor', 'Perlu Revisi Mayor'
  "strengths": [
    "Deskripsi kekuatan dokumen ke-1",
    "Deskripsi kekuatan dokumen ke-2"
  ],
  "weaknesses": [
    "Deskripsi kelemahan dokumen ke-1 beserta dampaknya",
    "Deskripsi kelemahan dokumen ke-2 beserta dampaknya"
  ],
  "recommendations": [
    "Rekomendasi spesifik perbaikan ke-1",
    "Rekomendasi spesifik perbaikan ke-2"
  ],
  "improvedVersionSuggestions": [
    "Tuliskan draf lengkap atau versi revisi penuh dari bagian/dokumen tersebut di sini agar berkualitas tinggi memenuhi standar Kurikulum Merdeka."
  ]
}

Aturan Tambahan: Jangan menambahkan pembuka markdown seperti \`\`\`json atau penutup apa pun. Kembalikan raw JSON saja agar bisa langsung di-parse.`;
  }
}
