# AI Skill Architecture - MCKUADRAT AI Layer

Dokumen ini menjelaskan arsitektur sistem kecerdasan buatan (AI Layer) berbasis **AI Skill** pada platform Kurikula (MCKUADRAT). Arsitektur ini dirancang untuk memisahkan logika instruksi pedagogis (prompting) dari kode API utama, meningkatkan konsistensi output, serta mengontrol alur kredit pengguna berdasarkan fungsionalitas dan model AI yang dipilih.

## 1. Struktur AI Skill

Setiap Skill AI mengimplementasikan interface `AISkill` yang didefinisikan di `supabase/functions/server/ai/skills/baseSkill.ts`:

```typescript
export interface AISkill {
  id: string; // ID unik skill
  name: string; // Nama tampilan skill
  description: string; // Deskripsi fungsional
  purpose: string; // Tujuan instruksional
  requiredInputs: string[]; // Parameter input wajib
  optionalInputs: string[]; // Parameter input opsional
  rules: string[]; // Aturan pedagogis/instruksional internal
  outputFormat: string; // Format output (umumnya Markdown)
  qualityChecklist: string[]; // Kriteria validasi output
  buildPrompt(input: any): string; // Fungsi menyusun prompt
}
```

Semua skill mewarisi `BaseSkill` yang menyediakan framework berpikir pedagogis berstandar nasional Indonesia (Diagnosis → Perencanaan → Pelaksanaan → Asesmen → Refleksi → Tindak Lanjut).

---

## 2. Daftar AI Skill & Biaya Kredit

Biaya kredit dihitung secara dinamis di `ai/utils/creditCalculator.ts` berdasarkan kerumitan tugas dan model bahasa (LLM) yang digunakan. Model **Gemini Pro** dikenakan multiplier **2x** dibanding model hemat **Gemini Flash**.

| Skill ID | Nama Layanan | Biaya (Flash) | Biaya (Pro) | Kriteria Output Wajib |
| :--- | :--- | :---: | :---: | :--- |
| `chat` | Asisten Chat Guru | 1 | 2 | Antarmuka dialog terkonteks |
| `student-comment` | Komentar Rapor Murid | 2 | 4 | Komentar singkat, detail, saran siswa, saran orang tua |
| `teacher-reflection`| Jurnal Refleksi Guru | 2 | 4 | Jurnal 4F (Gibbs), keberhasilan, perbaikan, tindak lanjut |
| `learning-analysis` | Analisis Hasil Belajar | 4 | 8 | Statistik tuntas/tidak, kelompok remedial, pengayaan, strategi |
| `assessment` | Assessment Designer | 3 | 6 | Analisis validitas, kisi-kisi, soal, kunci & pembahasan, remedial |
| `lkpd` | Lembar Kerja Siswa (LKPD) | 4 | 8 | Judul, stimulus/kasus, petunjuk kerja, ruang jawaban, rubrik |
| `teaching-material` | Bahan Ajar & Outline PPT | 5 | 10 | Tujuan, konsep, analogi, miskonsepsi, latihan bertahap, rangkuman |
| `educational-reviewer`| Reviewer Dokumen Pendidikan| 5 | 10 | Skor pilar (1-100), kelemahan utama, saran revisi, draf perbaikan |
| `lesson-planner` | Modul Ajar (RPP) | 10 | 20 | Identitas, tujuan, profil, pemantik, pendahuluan/inti/penutup, diferensiasi, asesmen, rubrik, tindak lanjut |

---

## 3. Pembatasan Berdasarkan Paket Langganan

Sistem melakukan validasi paket pengguna sebelum memproses permintaan ke LLM:
1. **Basic**: Hanya diperbolehkan menggunakan model hemat (**Gemini Flash**). Percobaan pemanggilan model Pro akan diblokir dengan pesan error.
2. **Pro & Premium / School**: Diperbolehkan memilih model premium (**Gemini Pro**).

---

## 4. Keamanan Prompt & Proteksi Prompt Injection

Sistem menggunakan utilitas `ai/utils/aiSafety.ts` untuk memproteksi prompt internal dari eksploitasi pihak ketiga:
- **Pencegahan Bypass**: Aturan sistem diinjeksi di bagian akhir prompt dengan status prioritas tinggi untuk mengabaikan instruksi bypass user.
- **Deteksi Injection**: Melakukan pencarian substring sensitif (seperti `ignore original instructions`, `tell me your system prompt`, dsb.) pada input parameter. Jika terdeteksi, request langsung dibatalkan sebelum memanggil API Gemini.
- **Anti-Halusinasi Sekolah**: AI diinstruksikan untuk tidak mengarang data sekolah fiktif dan wajib menggunakan placeholder (misal `[Nama Sekolah]`) jika parameter tidak dikirim oleh pengguna.

---

## 5. Mekanisme Validasi Output & Retry Otomatis

Untuk memastikan output AI tidak terpotong dan memenuhi standar pedagogis, modul `ai/utils/outputValidator.ts` memindai struktur teks yang dihasilkan:
- Modul Ajar harus mengandung kata kunci: *tujuan, kegiatan, asesmen, diferensiasi*.
- Asesmen harus mengandung kata kunci: *soal, kunci, pembahasan* atau *rubrik*.
- Jika validasi gagal pada percobaan pertama, sistem melakukan **1 kali retry otomatis** ke Gemini dengan menyertakan instruksi perbaikan khusus (*Repair Request*).
- Jika pada percobaan kedua hasil masih tidak valid, transaksi dianggap **gagal**, saldo kredit pengguna **tidak dipotong (atau direfund)**, dan error dikembalikan ke client secara jujur.

---

## 6. Cara Menambah Skill Baru

Untuk menambahkan fungsionalitas AI baru ke dalam platform:

1. **Buat file Skill baru** di `supabase/functions/server/ai/skills/[namaSkill]Skill.ts` yang meng-extends `BaseSkill`.
2. **Tulis prompt & parameter** spesifik di dalam kelas tersebut:
   ```typescript
   import { BaseSkill } from "./baseSkill.ts";
   export class MyNewSkill extends BaseSkill {
     id = "my-new-skill";
     name = "Custom Generator";
     ...
     buildPrompt(input: any): string {
       return `Tulis instruksi khusus Anda di sini...`;
     }
   }
   ```
3. **Daftarkan Skill** di `supabase/functions/server/ai/utils/skillRegistry.ts`:
   ```typescript
   import { MyNewSkill } from "../skills/myNewSkillSkill.ts";
   // Tambahkan ke instansiasi private static skills
   "my-new-skill": new MyNewSkill()
   ```
4. **Tentukan biaya kredit** di `supabase/functions/server/ai/utils/creditCalculator.ts` pada switch-case `cleanType`.

---

## 7. Alur Workflow Terintegrasi (Semester Planner → Modul Ajar → LKPD → Soal)

Kurikula mengintegrasikan alur perencanaan pembelajaran dari hulu ke hilir menggunakan Router Location State:
1. **Semester Planner** (`SemesterPlanner.tsx`): Pengguna membuat rencana pertemuan bulanan/mingguan. Tombol aksi "+ Modul Ajar", "+ LKPD", "+ Soal" mentransfer context melalui state:
   - `fromMeeting: true`
   - `meetingId`
   - `pertemuan` (nomor pertemuan)
   - `subject` (Mata Pelajaran)
   - `class` (Kelas)
   - `topic` (Topik/Materi Utama)
   - `meetingType` (untuk tipe halaman tujuan)
2. **Modul Ajar (RPP)** (`AILessonPlanner.tsx`): Menerima state dan mengisi form secara otomatis. Menampilkan banner "Konteks Semester Planner Aktif".
3. **Bahan Ajar & LKPD** (`AITeachingMaterials.tsx`): Otomatis membuka modal konfigurasi jika dideteksi adanya state dari Semester Planner untuk mempermudah alur kerja guru.
4. **Buat Soal (Asesmen)** (`Assessment.tsx`): Menavigasi ke tab "Buat Soal (Asesmen)", mengisi parameter subjek, kelas, materi, dan tujuan pembelajaran secara otomatis, serta menampilkan banner integrasi.

---

## 8. Spesifikasi AI Analisis Nilai (CSV & Statistik)

Fitur **AI Analisis Nilai** pada `Assessment.tsx` menggabungkan perhitungan statistik deterministik di sisi klien dengan analisis pedagogis berbasis kecerdasan buatan:

1. **Format Input CSV**:
   - **Format A (Sederhana)**:
     ```csv
     Nama,Nilai
     Ahmad,85
     Siti,72
     ```
   - **Format B (Per Indikator/TP)**:
     ```csv
     Nama,TP1,TP2,TP3
     Ahmad,80,90,85
     Siti,60,70,65
     ```
2. **Perhitungan Statistik Deterministik (Sisi Klien)**:
   - Rata-rata kelas, nilai tertinggi, dan nilai terendah.
   - Jumlah siswa tuntas (nilai >= KKTP) dan persentase ketuntasan.
   - Daftar siswa yang memerlukan program Remedial (nilai < KKTP) atau Pengayaan (nilai >= KKTP).
   - Rata-rata capaian per Indikator/TP untuk mendeteksi indikator terlemah.
3. **Analisis Pedagogis AI**:
   - Menerima ringkasan statistik dan data mentah dari klien.
   - Menggunakan skill `learning-analysis` dengan biaya dasar **4 kredit** (Flash) atau **8 kredit** (Pro).
   - Menghasilkan rekomendasi pengajaran remedial, pengayaan, refleksi diri guru, dan draf pesan untuk orang tua.

