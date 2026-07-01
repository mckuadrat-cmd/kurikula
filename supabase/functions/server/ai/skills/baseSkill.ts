export interface AISkill {
  id: string;
  name: string;
  description: string;
  purpose: string;
  requiredInputs: string[];
  optionalInputs: string[];
  rules: string[];
  outputFormat: string;
  qualityChecklist: string[];
  buildPrompt(input: any): string;
}

export abstract class BaseSkill implements AISkill {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract purpose: string;
  abstract requiredInputs: string[];
  abstract optionalInputs: string[];
  abstract rules: string[];
  abstract outputFormat: string;
  abstract qualityChecklist: string[];

  abstract buildPrompt(input: any): string;

  protected get PedagogicalFramework(): string {
    return `Framework berpikir Guru Profesional:
1. Diagnosis: Pahami profil, kemampuan awal, tantangan, dan kebutuhan awal siswa.
2. Perencanaan: Rancang tujuan, alokasi waktu, media, dan langkah pembelajaran yang relevan.
3. Pelaksanaan: Sajikan materi secara kontekstual, gunakan analogi sederhana, aktifkan siswa, dan terapkan diferensiasi.
4. Asesmen: Rancang instrumen penilaian (sikap, pengetahuan, keterampilan) beserta rubriknya.
5. Refleksi: Lakukan refleksi guru dan siswa untuk mengidentifikasi keberhasilan dan area perbaikan.
6. Tindak Lanjut: Berikan saran remedial bagi yang tertinggal dan pengayaan bagi yang cepat.`;
  }
}
