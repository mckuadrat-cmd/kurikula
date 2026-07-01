export class OutputValidator {
  static validate(type: string, content: string): { valid: boolean; missingParts: string[] } {
    if (!content || content.trim().length < 100) {
      return { valid: false, missingParts: ["Konten terlalu pendek atau kosong"] };
    }

    const lower = content.toLowerCase();
    const missingParts: string[] = [];

    const cleanType = type.toLowerCase();

    if (cleanType === "modul_ajar" || cleanType === "lesson-plan" || cleanType === "lesson_plan") {
      const required = ["tujuan", "kegiatan", "asesmen", "diferensiasi"];
      required.forEach(p => {
        if (!lower.includes(p)) missingParts.push(p);
      });
    } else if (cleanType === "assessment" || cleanType === "soal") {
      const required = ["soal", "kunci", "pembahasan", "rubrik"];
      const hasKey = lower.includes("kunci");
      const hasDiscussion = lower.includes("pembahasan") || lower.includes("rubrik");
      const hasQuestion = lower.includes("soal") || lower.includes("tugas");
      
      if (!hasQuestion) missingParts.push("soal/tugas");
      if (!hasKey) missingParts.push("kunci jawaban");
      if (!hasDiscussion) missingParts.push("pembahasan atau rubrik penilaian");
    } else if (cleanType === "semester-plan" || cleanType === "semester_plan") {
      try {
        const parsed = JSON.parse(content);
        if (!parsed.meetings || !Array.isArray(parsed.meetings) || parsed.meetings.length === 0) {
          missingParts.push("tabel alur pertemuan mingguan (JSON meetings array)");
        }
      } catch (e) {
        missingParts.push("format JSON valid");
      }
    } else if (cleanType === "learning-analysis" || cleanType === "learning_analysis" || cleanType === "learninganalysis") {
      const required = ["ringkasan", "ketuntasan", "remedial", "pengayaan", "rekomendasi"];
      required.forEach(p => {
        if (!lower.includes(p)) missingParts.push(p);
      });
    }

    return {
      valid: missingParts.length === 0,
      missingParts
    };
  }

  static buildRetryPrompt(prompt: string, missingParts: string[]): string {
    return `${prompt}

[RETRY REQUEST]: Output sebelumnya kurang lengkap dan tidak memenuhi standar validasi kualitas kami karena tidak menyertakan bagian berikut:
${missingParts.map(p => `- ${p.toUpperCase()}`).join("\n")}

Tolong generate ulang dokumen secara lengkap dan pastikan semua bagian di atas tersusun dengan rapi.`;
  }
}
