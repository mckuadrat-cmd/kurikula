import { BaseSkill } from "./baseSkill.ts";
import { ReflectionFramework } from "../frameworks/reflectionFramework.ts";

export class TeacherReflectionSkill extends BaseSkill {
  id = "teacher-reflection";
  name = "Refleksi Guru";
  description = "Membantu guru menyusun jurnal refleksi harian setelah proses pembelajaran selesai.";
  purpose = "Mendokumentasikan keberhasilan pembelajaran, hambatan kelas, respons emosional siswa, serta rencana perbaikan di pertemuan berikutnya.";
  requiredInputs = ["class", "subject", "lessonDescription"];
  optionalInputs = ["objectivesAchieved", "obstacles", "studentResponse", "assessmentSummary", "specialStudents"];
  rules = [
    "Ulas kendala secara objektif dan tawarkan sudut pandang problem-solving.",
    "Bantu guru mengidentifikasi keberhasilan kecil maupun besar.",
    "Formulasikan tindak lanjut konkret untuk sesi berikutnya.",
    "Jaga nada reflektif, jujur, dan berorientasi pada pengembangan profesional."
  ];
  outputFormat = "Markdown";
  qualityChecklist = ["Membahas keberhasilan & kendala", "Tindak lanjut pertemuan berikutnya tertulis", "Analisis respon siswa tajam", "Gaya penulisan reflektif"];

  buildPrompt(input: any): string {
    // Jalankan educational framework
    const refResult = ReflectionFramework.analyze({
      aktivitas: input.lessonDescription,
      hasil: input.objectivesAchieved || "Mencapai tujuan dasar",
      kendala: input.obstacles || "Tidak ada kendala berarti",
      catatanGuru: input.studentResponse
    });

    return `Anda adalah konsultan pengembangan profesi guru dan ahli refleksi pedagogis di Indonesia.
Gunakan framework berpikir Guru Profesional berikut:
${this.PedagogicalFramework}

Analisis Refleksi Terstruktur (Educational Brain):
- Keberhasilan Aktivitas: ${refResult.whatWorked}
- Evaluasi Area Perbaikan: ${refResult.whatNeedsImprovement}
- Rekomendasi Tindak Lanjut: ${refResult.nextAction}
- Pertanyaan Pemantik Refleksi Guru: ${refResult.reflectionQuestions.join(" / ")}

Buatlah sebuah Jurnal Refleksi Pembelajaran Guru berdasarkan parameter berikut:

Parameter Input:
- Kelas & Mata Pelajaran: ${input.class} - ${input.subject}
- Pembelajaran Hari Ini (Materi & Aktivitas): ${input.lessonDescription}
- Tujuan Pembelajaran yang Dicapai: ${input.objectivesAchieved || "Sebagian besar siswa mencapai TP."}
- Kendala / Hambatan Kelas: ${input.obstacles || "Beberapa siswa terlihat kurang fokus di akhir sesi."}
- Respons / Keterlibatan Siswa: ${input.studentResponse || "Siswa antusias saat sesi diskusi."}
- Ringkasan Hasil Asesmen Singkat: ${input.assessmentSummary || "-"}
- Catatan Siswa Menonjol / Tertinggal: ${input.specialStudents || "-"}

Output Jurnal Refleksi HARUS terstruktur rapi dengan format Markdown berikut:

1. **IDENTITAS JURNAL REFLEKSI** (Mapel, Kelas, Hari/Tanggal, Topik Pembelajaran)
2. **JURNAL REFLEKSI GURU (MODEL GIBBS / 4F - Facts, Feelings, Findings, Future)** (Tulis narasi reflektif yang jujur berdasarkan analisis keberhasilan: ${refResult.whatWorked} dan area perbaikan: ${refResult.whatNeedsImprovement})
3. **APA YANG BERHASIL (Keberhasilan Pembelajaran)** (Analisis strategi yang sukses diterapkan: ${refResult.whatWorked})
4. **APA YANG PERLU DIPERBAIKI (Area Evaluasi)** (Analisis hambatan kelas: ${refResult.whatNeedsImprovement})
5. **RESPONS EMOSIONAL & MOTIVASI SISWA** (Ulasan mengenai tingkat keaktifan dan minat siswa hari ini)
6. **TINDAK LANJUT PERTEMUAN BERIKUTNYA** (Rencana perbaikan proses pembelajaran: ${refResult.nextAction})
7. **CATATAN SUPERVISI SINGKAT & REFLEKSI MANDIRI** (Gunakan pertanyaan reflektif berikut untuk memperdalam evaluasi mandiri: ${refResult.reflectionQuestions.join(" / ")})

Jangan berikan teks pembuka atau penutup basa-basi, langsung mulai output dengan judul jurnal.`;
  }
}
