export class CreditCalculator {
  static getCreditCost(type: string, model: string): number {
    let baseCost = 0;
    const cleanType = type.toLowerCase();
    
    switch (cleanType) {
      case "chat":
        baseCost = 1;
        break;
      case "ringkasan":
      case "kisi_kisi":
      case "kisi":
      case "student-comment":
      case "student_comment":
      case "studentcomment":
      case "teacher-reflection":
      case "teacher_reflection":
      case "teacherreflection":
        baseCost = 2;
        break;
      case "soal":
      case "assessment":
      case "rubric-generator":
      case "rubric_generator":
      case "rubricgenerator":
        baseCost = 3;
        break;
      case "lkpd":
      case "learning-analysis":
      case "learning_analysis":
      case "learninganalysis":
      case "class-diagnostic":
      case "class_diagnostic":
      case "classdiagnostic":
        baseCost = 4;
        break;
      case "bahan_ajar":
      case "teaching-material":
      case "teaching_material":
      case "educational-reviewer":
      case "educational_reviewer":
      case "educationalreviewer":
        baseCost = 5;
        break;
      case "modul_ajar":
      case "lesson-plan":
      case "lesson_plan":
      case "semester-plan":
      case "semester_plan":
        baseCost = 10;
        break;
      default:
        baseCost = 1;
    }
    
    const multiplier = (model === "gemini-pro" || model === "gemini-2.5-pro") ? 2 : 1;
    return baseCost * multiplier;
  }

  static validateTierAndModel(tier: string, model: string): { allowed: boolean; reason?: string } {
    const cleanTier = (tier || "inactive").toLowerCase();
    const isProModel = model === "gemini-pro" || model === "gemini-2.5-pro";

    if (cleanTier === "inactive") {
      return { allowed: false, reason: "Paket langganan Anda tidak aktif. Silakan aktifkan di menu Billing." };
    }

    if (isProModel && cleanTier === "basic") {
      return { allowed: false, reason: "Model Gemini Pro hanya tersedia untuk pengguna paket Pro dan Premium." };
    }

    return { allowed: true };
  }
}
