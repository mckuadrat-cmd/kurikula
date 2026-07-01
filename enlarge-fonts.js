import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = [
  path.join(__dirname, 'src/app/pages/AILessonPlanner.tsx'),
  path.join(__dirname, 'src/app/pages/AITeachingMaterials.tsx'),
  path.join(__dirname, 'src/app/pages/SemesterPlanner.tsx'),
  path.join(__dirname, 'src/app/pages/Assessment.tsx')
];

console.log("Starting targeted font enlargement (minimal 12px -> 14px / 16px)...");

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // If this is Assessment.tsx, we first update the workflow grid section (lines 1968 - 2205 approx)
  if (filePath.endsWith('Assessment.tsx')) {
    // We want to replace specific workflow card text classes
    // Persiapan Penilaian headers
    content = content.replace(
      /<h2 className="text-sm font-bold text-gray-900">Persiapan Penilaian<\/h2>/g,
      '<h2 className="text-base font-extrabold text-gray-900">Persiapan Penilaian</h2>'
    );
    content = content.replace(
      /<h2 className="text-sm font-bold text-gray-900">Pelaksanaan Penilaian<\/h2>/g,
      '<h2 className="text-base font-extrabold text-gray-900">Pelaksanaan Penilaian</h2>'
    );
    content = content.replace(
      /<h2 className="text-sm font-bold text-gray-900">Analisis & Tindak Lanjut<\/h2>/g,
      '<h2 className="text-base font-extrabold text-gray-900">Analisis & Tindak Lanjut</h2>'
    );
    content = content.replace(
      /<p className="text-xs text-gray-500">Rancang instrumen evaluasi pembelajaran<\/p>/g,
      '<p className="text-sm text-gray-500">Rancang instrumen evaluasi pembelajaran</p>'
    );
    content = content.replace(
      /<p className="text-xs text-gray-500">Cetak lembar ujian & input jawaban siswa<\/p>/g,
      '<p className="text-sm text-gray-500">Cetak lembar ujian & input jawaban siswa</p>'
    );
    content = content.replace(
      /<p className="text-xs text-gray-500">Koreksi otomatis, statistik, & rencana AI<\/p>/g,
      '<p className="text-sm text-gray-500">Koreksi otomatis, statistik, & rencana AI</p>'
    );

    // Card titles & descriptions
    content = content.replace(
      /<h3 className="text-xs font-bold text-gray-800">Buat Soal \(AI\)<\/h3>/g,
      '<h3 className="text-base font-bold text-gray-800">Buat Soal (AI)</h3>'
    );
    content = content.replace(
      /<p className="text-xs text-gray-400">Generate bank soal otomatis dengan AI<\/p>/g,
      '<p className="text-sm text-gray-500">Generate bank soal otomatis dengan AI</p>'
    );

    content = content.replace(
      /<h3 className="text-xs font-bold text-gray-800">Kisi-kisi Ujian \(AI\)<\/h3>/g,
      '<h3 className="text-base font-bold text-gray-800">Kisi-kisi Ujian (AI)</h3>'
    );
    content = content.replace(
      /<p className="text-xs text-gray-400">Buat matriks pemetaan kisi-kisi ujian<\/p>/g,
      '<p className="text-sm text-gray-500">Buat matriks pemetaan kisi-kisi ujian</p>'
    );

    content = content.replace(
      /<h3 className="text-xs font-bold text-gray-800">Rubrik Penilaian \(AI\)<\/h3>/g,
      '<h3 className="text-base font-bold text-gray-800">Rubrik Penilaian (AI)</h3>'
    );
    content = content.replace(
      /<p className="text-xs text-gray-400">Rubrik analitik kriteria kinerja siswa<\/p>/g,
      '<p className="text-sm text-gray-500">Rubrik analitik kriteria kinerja siswa</p>'
    );

    content = content.replace(
      /<h3 className="text-xs font-bold text-gray-800">Bank Soal \(Lokal\)<\/h3>/g,
      '<h3 className="text-base font-bold text-gray-800">Bank Soal (Lokal)</h3>'
    );
    content = content.replace(
      /<p className="text-xs text-gray-400">Pustaka soal dan buat paket ujian<\/p>/g,
      '<p className="text-sm text-gray-500">Pustaka soal dan buat paket ujian</p>'
    );

    content = content.replace(
      /<h3 className="text-xs font-bold text-gray-800">Paket Ujian<\/h3>/g,
      '<h3 className="text-base font-bold text-gray-800">Paket Ujian</h3>'
    );
    content = content.replace(
      /<p className="text-xs text-gray-400">Kelola naskah ujian & kunci jawaban<\/p>/g,
      '<p className="text-sm text-gray-500">Kelola naskah ujian & kunci jawaban</p>'
    );

    content = content.replace(
      /<h3 className="text-xs font-bold text-gray-800">Cetak LJK \(HTML\)<\/h3>/g,
      '<h3 className="text-base font-bold text-gray-800">Cetak LJK (HTML)</h3>'
    );
    content = content.replace(
      /<p className="text-xs text-gray-400">Buat lembar jawaban komputer siap cetak<\/p>/g,
      '<p className="text-sm text-gray-500">Buat lembar jawaban komputer siap cetak</p>'
    );

    content = content.replace(
      /<h3 className="text-xs font-bold text-gray-800">Input Jawaban Siswa<\/h3>/g,
      '<h3 className="text-base font-bold text-gray-800">Input Jawaban Siswa</h3>'
    );
    content = content.replace(
      /<p className="text-xs text-gray-400">Tempel CSV atau ketik respon jawaban siswa<\/p>/g,
      '<p className="text-sm text-gray-500">Tempel CSV atau ketik respon jawaban siswa</p>'
    );

    content = content.replace(
      /<h3 className="text-xs font-bold text-gray-500">Scan Kamera LJK<\/h3>/g,
      '<h3 className="text-base font-bold text-gray-500">Scan Kamera LJK</h3>'
    );
    content = content.replace(
      /<p className="text-xs text-gray-450">Coming Soon - Scan LJK lewat kamera<\/p>/g,
      '<p className="text-sm text-gray-500">Coming Soon - Scan LJK lewat kamera</p>'
    );

    content = content.replace(
      /<h3 className="text-xs font-bold text-gray-800">Koreksi & Rangkuman Nilai<\/h3>/g,
      '<h3 className="text-base font-bold text-gray-800">Koreksi & Rangkuman Nilai</h3>'
    );
    content = content.replace(
      /<p className="text-xs text-gray-400">Hasil koreksi deterministik instan<\/p>/g,
      '<p className="text-sm text-gray-500">Hasil koreksi deterministik instan</p>'
    );

    content = content.replace(
      /<h3 className="text-xs font-bold text-gray-800">Analisis Butir Soal<\/h3>/g,
      '<h3 className="text-base font-bold text-gray-800">Analisis Butir Soal</h3>'
    );
    content = content.replace(
      /<p className="text-xs text-gray-400">Tingkat kesulitan soal & daya pengecoh<\/p>/g,
      '<p className="text-sm text-gray-500">Tingkat kesulitan soal & daya pengecoh</p>'
    );

    content = content.replace(
      /<h3 className="text-xs font-bold text-gray-800">AI Analisis Nilai & Remedial<\/h3>/g,
      '<h3 className="text-base font-bold text-gray-800">AI Analisis Nilai & Remedial</h3>'
    );
    content = content.replace(
      /<p className="text-xs text-gray-400">Refleksi pembelajaran & rekomendasi AI<\/p>/g,
      '<p className="text-sm text-gray-500">Refleksi pembelajaran & rekomendasi AI</p>'
    );
  }

  // GENERAL REPLACEMENTS FOR LABELS AND INPUTS (to scale up sizes in form sections)
  // Form Labels: text-sm font-semibold/font-bold mb-1.5/mb-2 -> text-base font-semibold/font-bold
  content = content.replace(/className="block text-sm font-semibold text-gray-700/g, 'className="block text-base font-semibold text-gray-700');
  content = content.replace(/className="block text-sm font-bold text-gray-700/g, 'className="block text-base font-bold text-gray-700');
  content = content.replace(/label className="block text-sm font-semibold text-gray-700/g, 'label className="block text-base font-semibold text-gray-700');
  content = content.replace(/label className="block text-sm font-bold/g, 'label className="block text-base font-bold');

  // Input select and textarea class adjustments from text-sm/text-xs to text-base (which is standard 16px/12pt)
  // Let's specifically target classes inside <input>, <select>, and <textarea> definitions
  content = content.replace(/(<input[^>]*className="[^"]*)text-sm([^"]*")/g, '$1text-base$2');
  content = content.replace(/(<select[^>]*className="[^"]*)text-sm([^"]*")/g, '$1text-base$2');
  content = content.replace(/(<textarea[^>]*className="[^"]*)text-sm([^"]*")/g, '$1text-base$2');

  content = content.replace(/(<input[^>]*className="[^"]*)text-xs([^"]*")/g, '$1text-base$2');
  content = content.replace(/(<select[^>]*className="[^"]*)text-xs([^"]*")/g, '$1text-base$2');
  content = content.replace(/(<textarea[^>]*className="[^"]*)text-xs([^"]*")/g, '$1text-base$2');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Enlarged font styles in: ${path.relative(__dirname, filePath)}`);
  }
});

console.log("Finished targeted font enlargement!");
