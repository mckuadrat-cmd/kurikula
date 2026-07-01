import teachingModels from "../knowledge/teachingModels.json" assert { type: "json" };

export interface LearningDesignInput {
  topik: string;
  tujuanPembelajaran: string;
  jenjang: string;
  kelas: string;
  profilSiswa?: string;
  jumlahSiswa?: number;
  targetKarakter?: string;
}

export interface LearningDesignOutput {
  recommendedModels: string[];
  recommendedActivities: string[];
  recommendedAssessmentTypes: string[];
  risks: string[];
  pedagogicalReasoning: string;
}

export class LearningDesignFramework {
  static analyze(input: LearningDesignInput): LearningDesignOutput {
    const recommendedModels: string[] = [];
    const recommendedActivities: string[] = [];
    const recommendedAssessmentTypes: string[] = [];
    const risks: string[] = [];
    let pedagogicalReasoning = "";

    const profil = (input.profilSiswa || "").toLowerCase();
    const karakter = (input.targetKarakter || "").toLowerCase();
    const jmlSiswa = input.jumlahSiswa || 30;

    // 1. Analisis Model Pembelajaran berdasarkan Karakteristik Siswa & Karakter Target
    if (profil.includes("pasif") || profil.includes("diam") || profil.includes("malas")) {
      recommendedModels.push(teachingModels.ThinkPairShare.name);
      recommendedModels.push(teachingModels.GalleryWalk.name);
      recommendedActivities.push("Diskusi berpasangan cepat (Think-Pair-Share) untuk memicu keberanian berpendapat.");
      recommendedActivities.push("Gallery Walk: Menempel hasil diskusi kelompok di dinding dan berkeliling memberikan bintang/feedback.");
      pedagogicalReasoning += "Siswa terdeteksi cenderung pasif. Oleh karena itu, dihindari metode ceramah satu arah yang dominan. Direkomendasikan Think-Pair-Share dan Gallery Walk agar seluruh siswa dipaksa aktif bergerak dan berbicara secara bertahap. ";
    } else if (profil.includes("aktif") || profil.includes("kinestetik") || profil.includes("ribut")) {
      recommendedModels.push(teachingModels.GalleryWalk.name);
      recommendedModels.push(teachingModels.ProjectBasedLearning.name);
      recommendedActivities.push("Kegiatan pameran Gallery Walk dinamis yang melibatkan pergerakan fisik keliling kelas.");
      recommendedActivities.push("Penyusunan proyek kelompok nyata (PjBL) untuk menyalurkan energi aktif siswa secara terarah.");
      pedagogicalReasoning += "Siswa tergolong aktif/kinestetik tinggi. Gallery Walk dan pembelajaran berbasis proyek (PjBL) direkomendasikan untuk menyalurkan energi fisik mereka menjadi aksi kolaborasi terstruktur. ";
    } else {
      // Default
      recommendedModels.push(teachingModels.PBL.name);
      recommendedModels.push(teachingModels.DiscoveryLearning.name);
      recommendedActivities.push("Studi analisis kasus pemecahan masalah (PBL) bersama tim.");
      recommendedActivities.push("Eksplorasi penemuan konsep (Discovery) terpandu menggunakan lembar kerja khusus.");
      pedagogicalReasoning += "Berdasarkan profil umum, model Problem Based Learning (PBL) dan Discovery Learning dipilih untuk membangun kemampuan bernalar kritis dan inkuiri ilmiah siswa secara seimbang. ";
    }

    // Tambahan model jika target karakter adalah kolaborasi
    if (karakter.includes("kolaborasi") || karakter.includes("kerja sama") || karakter.includes("sosial")) {
      if (!recommendedModels.includes(teachingModels.Jigsaw.name)) {
        recommendedModels.push(teachingModels.Jigsaw.name);
        recommendedActivities.push("Pembagian peran kelompok asal dan kelompok ahli (Jigsaw) untuk menuntut kerja sama mutlak.");
      }
      pedagogicalReasoning += "Karena fokus karakter adalah Kolaborasi, model kooperatif seperti Jigsaw diintegrasikan agar tanggung jawab keberhasilan belajar dibagi rata ke semua anggota tim. ";
    }

    // 2. Evaluasi Ukuran Kelas
    if (jmlSiswa > 35) {
      risks.push("Ukuran kelas sangat besar (>35 siswa). Risiko kebisingan dan kesulitan pemantauan kelompok belajar secara merata.");
      recommendedAssessmentTypes.push("Peer-assessment (Penilaian antar teman) terstruktur untuk membantu guru memantau keaktifan.");
    } else if (jmlSiswa < 15) {
      recommendedAssessmentTypes.push("Observasi individual mendalam dan penilaian formatif langsung oleh guru.");
    } else {
      recommendedAssessmentTypes.push("Penilaian Formatif Portofolio Kelompok & Jurnal Sikap.");
    }

    // 3. Rekomendasi Asesmen berdasarkan tujuan
    const tujuan = (input.tujuanPembelajaran || "").toLowerCase();
    if (tujuan.includes("analisis") || tujuan.includes("evaluasi") || tujuan.includes("bandingkan")) {
      recommendedAssessmentTypes.push("Analisis Studi Kasus Kontekstual");
      recommendedAssessmentTypes.push("Presentasi Argumentatif Kelompok");
    } else if (tujuan.includes("buat") || tujuan.includes("rancang") || tujuan.includes("buatlah")) {
      recommendedAssessmentTypes.push("Produk Karya Nyata / Prototipe");
      recommendedAssessmentTypes.push("Rubrik Kinerja Proyek");
    } else {
      recommendedAssessmentTypes.push("Tes Tertulis (Pilihan Ganda Kompleks & Isian Singkat)");
    }

    return {
      recommendedModels,
      recommendedActivities,
      recommendedAssessmentTypes,
      risks,
      pedagogicalReasoning
    };
  }
}
