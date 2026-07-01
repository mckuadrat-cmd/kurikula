import differentiationStrategies from "../knowledge/differentiationStrategies.json" assert { type: "json" };

export interface DifferentiationInput {
  kemampuanAwal?: string;
  heterogenitas?: string;
  jumlahSiswa?: number;
}

export interface DifferentiationOutput {
  fastLearnerStrategy: string;
  regularLearnerStrategy: string;
  supportLearnerStrategy: string;
}

export class DifferentiationFramework {
  static analyze(input: DifferentiationInput): DifferentiationOutput {
    const heterogen = (input.heterogenitas || "").toLowerCase();
    const kemampuan = (input.kemampuanAwal || "").toLowerCase();
    const jmlSiswa = input.jumlahSiswa || 30;

    let fastLearnerStrategy = differentiationStrategies.diferensiasi_konten.fast_learner;
    let regularLearnerStrategy = differentiationStrategies.diferensiasi_konten.regular_learner;
    let supportLearnerStrategy = differentiationStrategies.diferensiasi_konten.support_learner;

    // Tambahkan variasi proses/produk berdasarkan input heterogenitas dan tingkat siswa
    if (heterogen.includes("tinggi") || heterogen.includes("sangat beragam") || kemampuan.includes("rendah")) {
      supportLearnerStrategy = `${differentiationStrategies.diferensiasi_konten.support_learner} ${differentiationStrategies.diferensiasi_proses.support_learner} ${differentiationStrategies.diferensiasi_produk.support_learner}`;
      regularLearnerStrategy = `${differentiationStrategies.diferensiasi_konten.regular_learner} ${differentiationStrategies.diferensiasi_proses.regular_learner}`;
      fastLearnerStrategy = `${differentiationStrategies.diferensiasi_konten.fast_learner} ${differentiationStrategies.diferensiasi_proses.fast_learner} ${differentiationStrategies.diferensiasi_produk.fast_learner}`;
    } else {
      // Pembagian standar
      supportLearnerStrategy = `${differentiationStrategies.diferensiasi_konten.support_learner} Pendampingan kelompok terfokus (guided instruction) oleh guru selama proses belajar.`;
      regularLearnerStrategy = `${differentiationStrategies.diferensiasi_konten.regular_learner} Mengerjakan LKPD secara kelompok mandiri terarah.`;
      fastLearnerStrategy = `${differentiationStrategies.diferensiasi_konten.fast_learner} Tugas tambahan bertindak sebagai tutor sebaya bagi kelompok reguler/support.`;
    }

    // Penyesuaian berdasarkan ukuran kelas besar
    if (jmlSiswa > 32) {
      supportLearnerStrategy += " Gunakan tutor sebaya secara aktif untuk membantu guru mengawasi kelompok bimbingan khusus.";
      fastLearnerStrategy += " Diberikan proyek eksploratif mandiri di pojok baca kelas agar tidak bosan menunggu siswa lain selesai.";
    }

    return {
      fastLearnerStrategy,
      regularLearnerStrategy,
      supportLearnerStrategy
    };
  }
}
