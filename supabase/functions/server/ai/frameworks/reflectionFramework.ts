export interface ReflectionInput {
  aktivitas: string;
  hasil: string;
  kendala: string;
  catatanGuru?: string;
}

export interface ReflectionOutput {
  whatWorked: string;
  whatNeedsImprovement: string;
  nextAction: string;
  reflectionQuestions: string[];
}

export class ReflectionFramework {
  static analyze(input: ReflectionInput): ReflectionOutput {
    const hasil = input.hasil.toLowerCase();
    const kendala = input.kendala.toLowerCase();
    const catatan = (input.catatanGuru || "").toLowerCase();

    let whatWorked = `Aktivitas '${input.aktivitas}' secara umum terlaksana. `;
    if (hasil.includes("tuntas") || hasil.includes("baik") || hasil.includes("berhasil")) {
      whatWorked += "Siswa berpartisipasi aktif, menunjukkan minat yang tinggi, dan sebagian besar mampu mencapai kriteria ketuntasan minimal yang diharapkan.";
    } else {
      whatWorked += "Siswa dapat mengikuti instruksi dasar guru dan mencoba beradaptasi dengan materi baru.";
    }

    let whatNeedsImprovement = "Beberapa area kelas perlu pengkondisian lebih tertata. ";
    if (kendala.trim() !== "") {
      whatNeedsImprovement += `Mengatasi kendala: ${input.kendala}. Manajemen alokasi waktu kelompok perlu diperketat agar tidak menghambat sintaks pembelajaran berikutnya.`;
    } else {
      whatNeedsImprovement += "Peningkatan pemantauan individual terhadap kelompok belajar siswa yang pasif agar tidak tertinggal.";
    }

    let nextAction = "Melakukan review ulang konsep dasar pada 10 menit awal pertemuan berikutnya. ";
    if (kendala.includes("waktu") || kendala.includes("terlambat")) {
      nextAction += "Menyederhanakan lembar aktivitas LKPD kelompok dan membatasi sesi tanya jawab per kelompok.";
    } else if (catatan.includes("pbl") || catatan.includes("kelompok")) {
      nextAction += "Menetapkan pembagian peran kelompok secara tertulis sejak awal dan memperketat rubrik penilaian kolaborasi.";
    } else {
      nextAction += "Memberikan latihan mandiri terstruktur tambahan dan mengoptimalkan program tutor sebaya.";
    }

    const reflectionQuestions = [
      "Apakah alokasi waktu untuk masing-masing fase kegiatan sudah proporsional?",
      "Fase mana dalam pembelajaran ini yang membuat siswa paling bersemangat dan berpartisipasi?",
      "Bagaimana saya bisa mengorganisasi kelompok secara lebih merata pada kesempatan berikutnya?"
    ];

    return {
      whatWorked,
      whatNeedsImprovement,
      nextAction,
      reflectionQuestions
    };
  }
}
