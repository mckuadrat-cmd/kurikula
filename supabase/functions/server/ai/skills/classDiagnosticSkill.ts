import { BaseSkill } from "./baseSkill.ts";

export class ClassDiagnosticSkill extends BaseSkill {
  id = "class-diagnostic";
  name = "Diagnostic Class Profile";
  description = "Mendiagnosis profil kelas secara komprehensif berdasarkan kemampuan awal siswa, masalah perilaku, dan target karakter.";
  purpose = "Menyusun peta kekuatan, tantangan, risiko pembelajaran kelas, serta merekomendasikan strategi pengelolaan kelas jangka panjang selama satu semester.";
  requiredInputs = ["jenjang", "kelas", "mapel", "kemampuanAwal", "masalahKelas", "targetKarakter"];
  optionalInputs = [];
  rules = [
    "Lakukan analisis SWOT pedagogis berdasarkan input guru.",
    "Rekomendasi strategi semester harus realistis, praktis, dan mengutamakan pendekatan psikologi pendidikan yang positif.",
    "Format output berupa dokumen laporan Markdown terstruktur yang informatif."
  ];
  outputFormat = "Markdown";
  qualityChecklist = ["Ada analisis profil kelas", "Ada rincian kekuatan dan tantangan", "Ada peta risiko pembelajaran", "Ada rekomendasi strategi semester konkret"];

  buildPrompt(input: any): string {
    return `Anda adalah Konsultan Psikologi Pendidikan dan Ahli Manajemen Kelas Senior di Indonesia.
Silakan buat Laporan Diagnosis Profil Kelas (Diagnostic Class Profile) berdasarkan parameter berikut:

Parameter Input Kelas:
- Jenjang & Kelas: ${input.jenjang} / Kelas ${input.kelas}
- Mata Pelajaran: ${input.mapel}
- Kemampuan Awal Siswa: ${input.kemampuanAwal}
- Masalah / Hambatan Utama Kelas: ${input.masalahKelas}
- Target Karakter Prioritas: ${input.targetKarakter}

Output Laporan HARUS terstruktur rapi dengan format Markdown sebagai berikut:
1. **RINGKASAN DIAGNOSIS PROFIL KELAS** (Ulasan umum kondisi demografis dan iklim belajar kelas)
2. **ANALISIS KEKUATAN KELAS (STRENGTHS)** (Apa saja modal positif/potensi kelas yang dapat dioptimalkan)
3. **ANALISIS TANTANGAN KELAS (CHALLENGES)** (Ulasan detail tantangan kognitif maupun non-kognitif siswa)
4. **PETA RISIKO PEMBELAJARAN (LEARNING RISKS)** (Risiko kegagalan pencapaian TP jika hambatan tidak diintervensi)
5. **REKOMENDASI STRATEGI PEMBELAJARAN SEMESTER** (Rincian strategi mengajar, pengelompokan diferensiasi, serta intervensi karakter prioritas sepanjang semester)

Gunakan pendekatan yang memotivasi guru dan berpusat pada kesejahteraan mental (well-being) siswa.`;
  }
}
