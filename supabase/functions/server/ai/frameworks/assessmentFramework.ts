import assessmentMethods from "../knowledge/assessmentMethods.json" assert { type: "json" };

export interface AssessmentInput {
  tujuanPembelajaran: string;
  indikator: string;
  levelKognitif?: string; // e.g. "C4", "C2", or "Campuran"
}

export interface AssessmentOutput {
  cognitiveLevel: string;
  recommendedAssessmentType: string;
  assessmentReasoning: string;
  alternativeAssessment: string[];
}

export class AssessmentFramework {
  static analyze(input: AssessmentInput): AssessmentOutput {
    let cognitiveLevel = input.levelKognitif || "C3";
    const tujuan = (input.tujuanPembelajaran || "").toLowerCase();

    // Deteksi otomatis jika level kognitif diatur Campuran atau tidak ada
    if (cognitiveLevel.toLowerCase().includes("campuran") || !input.levelKognitif) {
      if (tujuan.includes("mengingat") || tujuan.includes("sebutkan") || tujuan.includes("hafalkan")) {
        cognitiveLevel = "C1";
      } else if (tujuan.includes("jelaskan") || tujuan.includes("identifikasi") || tujuan.includes("pahami")) {
        cognitiveLevel = "C2";
      } else if (tujuan.includes("gunakan") || tujuan.includes("terapkan") || tujuan.includes("hitung") || tujuan.includes("selesaikan")) {
        cognitiveLevel = "C3";
      } else if (tujuan.includes("analisis") || tujuan.includes("uraikan") || tujuan.includes("temukan pola")) {
        cognitiveLevel = "C4";
      } else if (tujuan.includes("evaluasi") || tujuan.includes("kritik") || tujuan.includes("nilai") || tujuan.includes("kaji")) {
        cognitiveLevel = "C5";
      } else if (tujuan.includes("cipta") || tujuan.includes("buat") || tujuan.includes("rancang") || tujuan.includes("susun")) {
        cognitiveLevel = "C6";
      } else {
        cognitiveLevel = "C3"; // Default
      }
    }

    // Ambil data dari knowledge base JSON
    const methodData = (assessmentMethods as any)[cognitiveLevel] || (assessmentMethods as any)["C3"];

    let recommendedAssessmentType = methodData.recommended_assessment;
    let assessmentReasoning = methodData.reasoning;
    let alternativeAssessment = [...methodData.alternatives];

    // Logika tambahan khusus tujuan analitis
    if (tujuan.includes("analisis") || tujuan.includes("iklim") || tujuan.includes("dampak")) {
      recommendedAssessmentType = "Studi Kasus Analitis & Proyek Pemecahan Masalah";
      assessmentReasoning = "Tujuan pembelajaran berfokus pada kemampuan menganalisis dampak lingkungan/sosial. Oleh karena itu, penilaian autentik berbasis kasus nyata dan penyusunan proyek kelayakan jauh lebih relevan dibandingkan ujian pilihan ganda biasa.";
      alternativeAssessment = ["Pembuatan Esai Argumentatif", "Debat Ilmiah", "Presentasi Infografis Kelompok"];
    }

    return {
      cognitiveLevel: `${cognitiveLevel} - ${methodData.level_name.split(" ")[0]}`,
      recommendedAssessmentType,
      assessmentReasoning,
      alternativeAssessment
    };
  }
}
