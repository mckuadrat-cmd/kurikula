import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { User, Bell, Lock, Globe, Palette, Database, Save, X, BookOpen, Camera } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { isAuthorized, readDatabaseConfig, writeDatabaseConfig, checkAndRenewToken, readSheetRange } from "../../lib/googleSheetsService";
import { supabase } from "../../../utils/supabase/client";

export default function Settings() {
  const { profile, updateProfile } = useAuth();
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nip, setNip] = useState("");
  const [school, setSchool] = useState("");
  const [schoolLevel, setSchoolLevel] = useState<"SD" | "SMP" | "SMA">("SMA");
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState("");

  const [subjectsList, setSubjectsList] = useState<{ id: string; name: string }[]>([]);
  const [newSubjectInput, setNewSubjectInput] = useState("");

  const [teachingStyle, setTeachingStyle] = useState("Konstruktivisme");
  const [preferredModels, setPreferredModels] = useState<string[]>(["PBL"]);
  const [characterFocus, setCharacterFocus] = useState<string[]>(["Kolaborasi"]);

  useEffect(() => {
    if (profile?.id) {
      supabase
        .from("teacher_memory")
        .select("*")
        .eq("user_id", profile.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (data && !error) {
            setTeachingStyle(data.teaching_style || "Konstruktivisme");
            setPreferredModels(data.preferred_models || ["PBL"]);
            setCharacterFocus(data.character_focus || ["Kolaborasi"]);
          }
        });
    }
  }, [profile]);


  const syncSubjectsFromSheet = async () => {
    if (!isAuthorized()) return;
    try {
      const gradeRows = await readSheetRange("Penilaian!A2:G");
      const uniqueSubjects = Array.from(new Set(gradeRows.map(row => row[4]).filter(Boolean))) as string[];
      if (uniqueSubjects.length > 0) {
        const formattedSubjects = uniqueSubjects.map(name => {
          const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
          const id = `MP-${capitalized.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`;
          return { id, name: capitalized };
        });
        setSubjectsList(formattedSubjects);
        
        // Simpan langsung ke Supabase
        await updateProfile({
          subjects: JSON.stringify(formattedSubjects)
        });
        
        const names = formattedSubjects.map(s => s.name).join(", ");
        localStorage.setItem("mata_pelajaran", names);
        toast.info("Mata pelajaran disinkronkan otomatis dari database Penilaian.");
      }
    } catch (e) {
      console.error("Gagal sinkronisasi mapel dari sheet:", e);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Berkas harus berupa gambar.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 150;
        const MAX_HEIGHT = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          setAvatar(dataUrl);
          
          // Autosave avatar immediately to local cache and Supabase
          if (profile) {
            try {
              localStorage.setItem(`kurikula_avatar_${profile.id}`, dataUrl);
            } catch (err) {
              console.error("Failed to save avatar to localStorage:", err);
            }

            toast.promise(
              updateProfile({
                avatar: dataUrl,
                avatar_url: dataUrl
              }),
              {
                loading: 'Menyimpan foto profil...',
                success: 'Foto profil berhasil disimpan secara permanen!',
                error: 'Gagal menyimpan foto profil ke cloud.'
              }
            );
          } else {
            toast.success("Foto profil berhasil dipilih! Silakan klik 'Simpan Perubahan' di bawah untuk menyimpannya.");
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setPhone(profile.phone || "");
      setNip(profile.nip || "");
      setSchool(profile.school || "");
      setSchoolLevel(profile.schoolLevel || "SMA");
      setAvatar(profile.avatar || "");
      
      if (profile.subjects) {
        try {
          const parsed = JSON.parse(profile.subjects);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSubjectsList(parsed);
          } else {
            syncSubjectsFromSheet();
          }
        } catch (e) {
          console.error("Gagal memparse subjects:", e);
          syncSubjectsFromSheet();
        }
      } else {
        syncSubjectsFromSheet();
      }
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await updateProfile({
        name,
        whatsapp: phone,
        phone,
        nip,
        school,
        schoolLevel,
        subjects: JSON.stringify(subjectsList),
        avatar: avatar,
        avatar_url: avatar
      });

      if (error) {
        toast.error("Gagal menyimpan profil: " + (error.message || error));
      } else {
        localStorage.setItem("mata_pelajaran", subjectsList.map(s => s.name).join(", "));
        
        // Upsert teacher memory
        if (profile?.id) {
          const { error: memError } = await supabase
            .from("teacher_memory")
            .upsert({
              user_id: profile.id,
              jenjang: schoolLevel,
              mapel: subjectsList.map(s => s.name).join(", "),
              teaching_style: teachingStyle,
              preferred_models: preferredModels,
              character_focus: characterFocus,
              updated_at: new Date().toISOString()
            });
          if (memError) {
            console.error("Gagal menyimpan preferensi pengajaran:", memError);
          }
        }

        toast.success("Profil berhasil diperbarui secara permanen!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan saat menyimpan profil.");
    } finally {
      setSaving(false);
    }
  };

  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
    : "G";

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Pengaturan</h1>
        <p className="text-gray-600">Kelola preferensi akun dan data profil Anda</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[12px] p-6 border border-gray-200 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <User className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Profil Guru</h2>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div 
                  onClick={() => document.getElementById("avatar-upload")?.click()}
                  className="w-24 h-24 bg-gradient-to-br from-[#DF7A5E] to-[#3C405B] rounded-full flex items-center justify-center text-white text-3xl font-bold overflow-hidden cursor-pointer shadow-md border-2 border-white relative"
                  title="Klik untuk ubah foto profil"
                >
                  {avatar ? (
                    <img src={avatar} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{initials}</span>
                  )}
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-semibold gap-1">
                    <Camera className="w-5 h-5" />
                    <span>Ubah Foto</span>
                  </div>
                </div>
                <input 
                  type="file" 
                  id="avatar-upload" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarChange} 
                />
              </div>
              
              <div className="flex-1">
                <div className="text-xl font-bold text-gray-900">{name || "Nama Guru"}</div>
                <div className="text-sm text-gray-500 mb-1">{profile?.email || "email@school.com"}</div>
                <button
                  type="button"
                  onClick={() => document.getElementById("avatar-upload")?.click()}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  Ganti Foto Profil
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Nama Lengkap</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Email (Tidak dapat diubah)</label>
                <input
                  type="email"
                  value={profile?.email || ""}
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-[12px] text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">No. Whatsapp / Telepon</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">NIP</label>
                <input
                  type="text"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Nama Sekolah</label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Jenjang Sekolah</label>
                <select
                  value={schoolLevel}
                  onChange={(e) => setSchoolLevel(e.target.value as any)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                >
                  <option value="SD">SD (Sekolah Dasar)</option>
                  <option value="SMP">SMP (Sekolah Menengah Pertama)</option>
                  <option value="SMA">SMA/SMK (Sekolah Menengah Atas)</option>
                </select>
              </div>

              <div className="md:col-span-2 border-t border-gray-100 pt-4">
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Mata Pelajaran yang Diampu (Tambahkan satu per satu)
                </label>
                
                {/* Badge List */}
                <div className="flex flex-wrap gap-2 mb-2.5 p-3 bg-gray-50 border border-gray-200 rounded-[12px] min-h-[46px] items-center">
                  {subjectsList.length === 0 ? (
                    <span className="text-gray-400 text-xs italic pl-1">Belum ada mata pelajaran yang ditambahkan</span>
                  ) : (
                    subjectsList.map((sub) => (
                      <span
                        key={sub.id}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-full text-xs font-semibold"
                      >
                        {sub.name}
                        <button
                          type="button"
                          onClick={() => setSubjectsList(subjectsList.filter(s => s.id !== sub.id))}
                          className="hover:text-red-500 font-bold focus:outline-none cursor-pointer"
                        >
                          <X className="w-3 h-3 ml-1" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Input Add */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubjectInput}
                    onChange={(e) => setNewSubjectInput(e.target.value)}
                    placeholder="Contoh: Matematika"
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-white text-gray-900"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = newSubjectInput.trim();
                        if (val) {
                          const capitalized = val.charAt(0).toUpperCase() + val.slice(1);
                          const id = `MP-${capitalized.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`;
                          if (!subjectsList.some(s => s.id === id)) {
                            setSubjectsList([...subjectsList, { id, name: capitalized }]);
                          }
                          setNewSubjectInput("");
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = newSubjectInput.trim();
                      if (val) {
                        const capitalized = val.charAt(0).toUpperCase() + val.slice(1);
                        const id = `MP-${capitalized.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`;
                        if (!subjectsList.some(s => s.id === id)) {
                          setSubjectsList([...subjectsList, { id, name: capitalized }]);
                        }
                        setNewSubjectInput("");
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Tambah
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Preferensi Pengajaran AI (Teacher Memory) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[12px] p-6 border border-gray-200 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">Preferensi Pengajaran AI (Teacher Memory)</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">Gaya Pengajaran Default</label>
              <select
                value={teachingStyle}
                onChange={(e) => setTeachingStyle(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-950 font-semibold text-base cursor-pointer"
              >
                <option value="Konstruktivisme">Konstruktivisme (Aktif menemukan konsep)</option>
                <option value="Kolaboratif">Kolaboratif (Berorientasi kerja kelompok)</option>
                <option value="Kontekstual">Kontekstual (Mengaitkan kehidupan nyata)</option>
                <option value="Direct Instruction">Direct Instruction (Penjelasan terarah)</option>
                <option value="Socratic Method">Socratic Method (Tanya jawab kritis)</option>
                <option value="Inquiry-Based">Inquiry-Based (Penyelidikan ilmiah)</option>
              </select>
            </div>

            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">Model Pembelajaran Favorit (Boleh Pilih Lebih dari Satu)</label>
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-[12px]">
                {["PBL", "Project Based Learning", "Discovery Learning", "Inquiry Learning", "Jigsaw", "Think Pair Share", "Gallery Walk"].map((model) => {
                  const isChecked = preferredModels.includes(model);
                  return (
                    <button
                      type="button"
                      key={model}
                      onClick={() => {
                        if (isChecked) {
                          setPreferredModels(preferredModels.filter(m => m !== model));
                        } else {
                          setPreferredModels([...preferredModels, model]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold"
                          : "bg-white border-gray-200 text-gray-700 hover:border-indigo-150"
                      }`}
                    >
                      {model}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">Fokus Karakter Siswa Utama (Boleh Pilih Lebih dari Satu)</label>
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-[12px]">
                {["Disiplin", "Tanggung Jawab", "Integritas", "Empati", "Kolaborasi", "Kepemimpinan", "Kemandirian"].map((char) => {
                  const isChecked = characterFocus.includes(char);
                  return (
                    <button
                      type="button"
                      key={char}
                      onClick={() => {
                        if (isChecked) {
                          setCharacterFocus(characterFocus.filter(c => c !== char));
                        } else {
                          setCharacterFocus([...characterFocus, char]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-purple-50 border-purple-200 text-purple-700 font-bold"
                          : "bg-white border-gray-200 text-gray-700 hover:border-purple-150"
                      }`}
                    >
                      {char}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>


        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[12px] p-6 border border-gray-200 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Notifikasi</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Email Notifications</div>
                <div className="text-sm text-gray-500">Terima notifikasi rekap penilaian via email</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" onChange={() => toast.info("Preferensi notifikasi diperbarui.")}/>
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Push Notifications</div>
                <div className="text-sm text-gray-500">Terima notifikasi langsung absensi siswa</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" onChange={() => toast.info("Preferensi notifikasi diperbarui.")}/>
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </motion.div>

        {/* Security */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-[12px] p-6 border border-gray-200 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-semibold text-gray-900">Keamanan</h2>
          </div>

          <div className="space-y-4">
            <div>
              <button 
                type="button"
                onClick={() => toast.info("Ubah password dapat diakses melalui link email reset password.")}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 text-[#3C405B] rounded-[12px] font-semibold text-left transition-colors border border-gray-100"
              >
                Kirim Email Reset Password
              </button>
            </div>
          </div>
        </motion.div>

        {/* Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-[12px] p-6 border border-gray-200 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900">Preferensi</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Bahasa</label>
              <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900">
                <option>Bahasa Indonesia</option>
                <option>English</option>
              </select>
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Zona Waktu (Timezone)</label>
              <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900">
                <option>WIB (GMT+7)</option>
                <option>WITA (GMT+8)</option>
                <option>WIT (GMT+9)</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Data & Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-[12px] p-6 border border-gray-200 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">Data & Privacy</h2>
          </div>

          <div className="space-y-4">
            <div>
              <button 
                type="button"
                onClick={() => toast.info("Fitur ekspor data sedang dipersiapkan.")}
                className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-[12px] font-semibold text-left transition-colors border border-blue-100"
              >
                Export Data Saya
              </button>
            </div>
          </div>
        </motion.div>

        {/* Save Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Save className="w-5 h-5" />
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (profile) {
                setName(profile.name || "");
                setPhone(profile.phone || "");
                setNip(profile.nip || "");
                setSchool(profile.school || "");
                setSchoolLevel(profile.schoolLevel || "SMA");
                toast.success("Perubahan dibatalkan.");
              }
            }}
            className="px-6 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-[12px] font-semibold transition-colors cursor-pointer"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
