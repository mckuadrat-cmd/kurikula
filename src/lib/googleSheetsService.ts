import { supabase } from "../../utils/supabase/client";

// Interface untuk data mentah baris
export type SheetRow = any[];

declare global {
  interface Window {
    google: any;
  }
}

// Global state untuk menyimpan token client instance
let tokenClient: any = null;

export type GoogleConnectionStatus = {
  status: "disconnected" | "connected" | "expired";
  isConnected: boolean;
  hasValidToken: boolean;
  needsReconnect: boolean;
  expiresAt: number | null;
  message: string;
};

/**
 * Meload script Google Identity Services secara dinamis
 */
export function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      resolve();
    };
    script.onerror = (err) => reject(new Error("Gagal memuat Google SDK script"));
    document.body.appendChild(script);
  });
}

/**
 * Menginisialisasi Token Client untuk Google OAuth
 */
export async function initGoogleAuth(
  onSuccess: (accessToken: string) => void,
  onError?: (error: any) => void,
  prompt: "consent" | "none" = "consent"
): Promise<void> {
  try {
    await loadGoogleScript();

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error("Client ID Google belum diset di .env.local (VITE_GOOGLE_CLIENT_ID)");
    }

    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file",
      callback: (response: any) => {
        if (response.error) {
          if (onError) onError(response);
          return;
        }

        // Simpan token ke localStorage
        localStorage.setItem("google_access_token", response.access_token);
        const expiresAt = Date.now() + parseInt(response.expires_in) * 1000;
        localStorage.setItem("google_token_expires_at", expiresAt.toString());
        localStorage.setItem("google_connected_flag", "true");

        onSuccess(response.access_token);
      },
    });

    tokenClient.requestAccessToken({ prompt });
  } catch (error) {
    console.error("Inisialisasi OAuth gagal:", error);
    if (onError) onError(error);
  }
}

/**
 * Mengecek apakah user memiliki token aktif. GIS token client di browser tidak
 * menyediakan refresh token permanen, jadi token expired tetap perlu reconnect.
 */
export async function checkAndRenewToken(onSuccess?: (token: string) => void): Promise<string | null> {
  const activeToken = getAccessToken();
  if (activeToken) {
    if (onSuccess) onSuccess(activeToken);
    return activeToken;
  }
  return null;
}

/**
 * Mengambil Access Token yang tersimpan di localStorage (jika belum expired)
 */
export function getAccessToken(): string | null {
  const token = localStorage.getItem("google_access_token");
  const expiresAtStr = localStorage.getItem("google_token_expires_at");

  if (!token || !expiresAtStr) return null;

  const expiresAt = parseInt(expiresAtStr);
  if (Date.now() >= expiresAt) {
    // Token sudah kedaluwarsa
    localStorage.removeItem("google_access_token");
    localStorage.removeItem("google_token_expires_at");
    return null;
  }

  return token;
}

/**
 * Status koneksi Google yang eksplisit untuk UI.
 * - disconnected: belum pernah connect / sudah disconnect
 * - expired: pernah connect, tapi token browser sudah habis/hilang
 * - connected: token aktif dan bisa dipakai untuk API Google
 */
export function getGoogleConnectionStatus(): GoogleConnectionStatus {
  const connectedFlag = localStorage.getItem("google_connected_flag") === "true";
  const token = localStorage.getItem("google_access_token");
  const expiresAtStr = localStorage.getItem("google_token_expires_at");
  const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : null;

  if (!connectedFlag) {
    return {
      status: "disconnected",
      isConnected: false,
      hasValidToken: false,
      needsReconnect: false,
      expiresAt: null,
      message: "Google Drive belum terhubung.",
    };
  }

  if (!token || !expiresAt || Number.isNaN(expiresAt) || Date.now() >= expiresAt) {
    localStorage.removeItem("google_access_token");
    localStorage.removeItem("google_token_expires_at");
    return {
      status: "expired",
      isConnected: true,
      hasValidToken: false,
      needsReconnect: true,
      expiresAt: Number.isNaN(expiresAt) ? null : expiresAt,
      message: "Sesi Google Drive kedaluwarsa. Silakan hubungkan ulang.",
    };
  }

  return {
    status: "connected",
    isConnected: true,
    hasValidToken: true,
    needsReconnect: false,
    expiresAt,
    message: "Google Drive terhubung dan siap digunakan.",
  };
}

/**
 * Mengecek apakah pengguna terhubung/terotorisasi dengan Google Drive
 */
export function isAuthorized(): boolean {
  return localStorage.getItem("google_connected_flag") === "true";
}

/**
 * Mengecek apakah pengguna memiliki token aktif yang belum kedaluwarsa
 */
export function hasValidToken(): boolean {
  return getGoogleConnectionStatus().hasValidToken;
}

/**
 * Melakukan logout / hapus token dari local storage
 */
export function logoutGoogle(): void {
  const token = getAccessToken();
  if (token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(token, () => {
      console.log("Token Google dicabut");
    });
  }
  localStorage.removeItem("google_access_token");
  localStorage.removeItem("google_token_expires_at");
  localStorage.removeItem("google_spreadsheet_id");
  localStorage.removeItem("google_connected_flag");
  localStorage.removeItem("tahun_ajaran");
  localStorage.removeItem("semester");
  localStorage.removeItem("daftar_kelas");
  localStorage.removeItem("mata_pelajaran");
}

/**
 * Melakukan fetch HTTP terautentikasi ke Google API
 */
async function fetchGoogleAPI(url: string, options: RequestInit = {}): Promise<any> {
  const status = getGoogleConnectionStatus();
  let token = status.hasValidToken ? getAccessToken() : null;
  if (!token) {
    throw new Error(status.message);
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");

  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    // Kredensial tidak valid / token kedaluwarsa
    localStorage.removeItem("google_access_token");
    localStorage.removeItem("google_token_expires_at");
    throw new Error("Sesi Google OAuth kedaluwarsa. Silakan login kembali.");
  }

  if (response.status === 403) {
    throw new Error("Izin Google Sheets/Drive ditolak. Silakan putuskan & hubungkan ulang Google Drive di Dashboard dan centang semua kotak izin.");
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google API Error: ${response.status} - ${errText}`);
  }

  // Jika content-type bukan JSON, return text saja
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await response.json();
  }
  return await response.text();
}

/**
 * Mencari atau membuat folder kurikula-{user_id} di Google Drive
 */
export async function findOrCreateFolder(userId: string): Promise<string> {
  const folderName = `kurikula-${userId}`;
  const q = encodeURIComponent(
    `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`;
  try {
    const data = await fetchGoogleAPI(url);
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }

    // Jika tidak ditemukan, buat folder baru
    const createUrl = "https://www.googleapis.com/drive/v3/files";
    const body = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    };
    const folder = await fetchGoogleAPI(createUrl, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return folder.id;
  } catch (error) {
    console.error("Gagal mencari atau membuat folder kurikula-user:", error);
    throw error;
  }
}

/**
 * Mencari spreadsheet database Kurikula di Google Drive di dalam folder kurikula-user
 */
export async function findDatabaseSpreadsheet(folderId?: string): Promise<string | null> {
  let query = "name = 'Kurikula_Database' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false";
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  }
  const q = encodeURIComponent(query);
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`;
  
  try {
    const data = await fetchGoogleAPI(url);
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (error) {
    console.error("Gagal mencari database spreadsheet:", error);
    throw error;
  }
}

/**
 * Membuat spreadsheet database baru di dalam folder kurikula-user beserta tab dan header kolom default
 */
export async function createDatabaseSpreadsheet(folderId: string): Promise<string> {
  const createUrl = "https://www.googleapis.com/drive/v3/files";
  const driveBody = {
    name: "Kurikula_Database",
    mimeType: "application/vnd.google-apps.spreadsheet",
    parents: [folderId]
  };

  try {
    // 1. Buat file spreadsheet kosong di Drive dengan folder parent
    const file = await fetchGoogleAPI(createUrl, {
      method: "POST",
      body: JSON.stringify(driveBody)
    });

    const spreadsheetId = file.id;

    // 2. Dapatkan sheet bawaan yang dibuat Google
    const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.sheetId,sheets.properties.title`;
    const meta = await fetchGoogleAPI(getUrl);
    const defaultSheetId = meta.sheets?.[0]?.properties?.sheetId;
    const defaultSheetTitle = meta.sheets?.[0]?.properties?.title;

    // 3. Tambahkan tab-tab yang kita inginkan
    const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const requests: any[] = [
      { addSheet: { properties: { title: "Siswa" } } },
      { addSheet: { properties: { title: "Absensi" } } },
      { addSheet: { properties: { title: "Penilaian" } } },
      { addSheet: { properties: { title: "Konfigurasi" } } },
      { addSheet: { properties: { title: "Dokumen" } } }
    ];

    // Jika tab bawaan ada dan namanya bukan 'Siswa', hapus agar rapi
    if (defaultSheetTitle !== "Siswa" && defaultSheetId !== undefined) {
      requests.push({ deleteSheet: { sheetId: defaultSheetId } });
    }

    await fetchGoogleAPI(batchUrl, {
      method: "POST",
      body: JSON.stringify({ requests })
    });

    // 4. Inisialisasi header kolom default di setiap Sheet
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
    const headerBody = {
      valueInputOption: "USER_ENTERED",
      data: [
        {
          range: "Siswa!A1:G1",
          values: [["NIS", "NISN", "Nama Lengkap", "Kelas", "Gender", "Email", "No Whatsapp"]],
        },
        {
          range: "Absensi!A1:I1",
          values: [["ID_Absensi", "Tanggal", "NIS", "Nama", "Kelas", "Status", "Waktu_Scan", "Mata_Pelajaran", "Pertemuan"]],
        },
        {
          range: "Penilaian!A1:G1",
          values: [["ID_Penilaian", "NIS", "Nama", "Kelas", "Mata_Pelajaran", "Nama_Bab", "Nilai"]],
        },
        {
          range: "Konfigurasi!A1:B1",
          values: [["Kunci", "Nilai"]],
        },
        {
          range: "Dokumen!A1:G1",
          values: [["ID_Dokumen", "Judul", "Tipe", "Konten", "Tanggal", "Ukuran", "Downloads"]],
        },
      ],
    };

    await fetchGoogleAPI(updateUrl, {
      method: "POST",
      body: JSON.stringify(headerBody),
    });

    return spreadsheetId;
  } catch (error) {
    console.error("Gagal membuat database spreadsheet di folder:", error);
    throw error;
  }
}

/**
 * Memastikan semua tab yang diperlukan ada di spreadsheet, jika tidak maka buat tab tersebut
 */
export async function ensureSpreadsheetTabsExist(spreadsheetId: string): Promise<void> {
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  try {
    const meta = await fetchGoogleAPI(getUrl);
    const existingTitles: string[] = (meta.sheets || []).map((s: any) => s.properties?.title);

    const requiredSheets = [
      { title: "Siswa", headers: ["NIS", "NISN", "Nama Lengkap", "Kelas", "Gender", "Email", "No Whatsapp"] },
      { title: "Absensi", headers: ["ID_Absensi", "Tanggal", "NIS", "Nama", "Kelas", "Status", "Waktu_Scan", "Mata_Pelajaran", "Pertemuan"] },
      { title: "Penilaian", headers: ["ID_Penilaian", "NIS", "Nama", "Kelas", "Mata_Pelajaran", "Nama_Bab", "Nilai"] },
      { title: "Konfigurasi", headers: ["Kunci", "Nilai"] },
      { title: "Dokumen", headers: ["ID_Dokumen", "Judul", "Tipe", "Konten", "Tanggal", "Ukuran", "Downloads"] }
    ];

    const missingSheets = requiredSheets.filter(req => !existingTitles.includes(req.title));

    if (missingSheets.length > 0) {
      // 1. Buat sheet baru yang belum ada
      const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
      const requests = missingSheets.map(sheet => ({
        addSheet: {
          properties: {
            title: sheet.title
          }
        }
      }));

      await fetchGoogleAPI(batchUrl, {
        method: "POST",
        body: JSON.stringify({ requests })
      });

      // 2. Inisialisasi header kolom pada sheet yang baru dibuat
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
      const data = missingSheets.map(sheet => ({
        range: `${sheet.title}!A1:${String.fromCharCode(65 + sheet.headers.length - 1)}1`,
        values: [sheet.headers]
      }));

      await fetchGoogleAPI(updateUrl, {
        method: "POST",
        body: JSON.stringify({
          valueInputOption: "USER_ENTERED",
          data
        })
      });
    }
  } catch (error) {
    console.error("Gagal memverifikasi / membuat tab spreadsheet yang hilang:", error);
    throw error;
  }
}

/**
 * Menjamin tersedianya spreadsheet database (Mencari atau Membuat jika tidak ada)
 */
export async function getOrCreateSpreadsheetId(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    // 1. Coba dari cache local storage
    const cachedId = localStorage.getItem("google_spreadsheet_id");
    if (cachedId) {
      // Pastikan semua tab ada
      ensureSpreadsheetTabsExist(cachedId).catch(err => console.error(err));
      return cachedId;
    }

    // 2. Coba dari user metadata Supabase
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseSpreadsheetId = session?.user?.user_metadata?.google_spreadsheet_id;
      if (supabaseSpreadsheetId) {
        localStorage.setItem("google_spreadsheet_id", supabaseSpreadsheetId);
        ensureSpreadsheetTabsExist(supabaseSpreadsheetId).catch(err => console.error(err));
        return supabaseSpreadsheetId;
      }
    } catch (e) {
      console.error("Gagal mendapatkan spreadsheet ID dari Supabase:", e);
    }
  }

  // 3. Cari di Google Drive atau buat baru di dalam folder kurikula-{user_id}
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("Pengguna tidak terotentikasi. Gagal mengakses Google Drive.");
  }

  const folderId = await findOrCreateFolder(userId);
  let id = await findDatabaseSpreadsheet(folderId);
  if (!id) {
    id = await createDatabaseSpreadsheet(folderId);
  } else {
    // Jika spreadsheet sudah ada, pastikan semua tab baru juga ada
    await ensureSpreadsheetTabsExist(id);
  }

  localStorage.setItem("google_spreadsheet_id", id);

  // Simpan ke metadata Supabase agar sinkron di semua device/browser!
  try {
    await supabase.auth.updateUser({
      data: {
        google_spreadsheet_id: id
      }
    });
  } catch (e) {
    console.error("Gagal menyimpan spreadsheet ID ke Supabase:", e);
  }

  return id;
}

/**
 * Membaca data dari range sel tertentu di Spreadsheet
 * Contoh range: "Siswa!A2:G"
 */
/**
 * Menangani error terkait Spreadsheet (misal: spreadsheet tidak ditemukan / 404, terlarang / 403)
 * dengan membersihkan cache dan Supabase agar dapat dibuat/dicari ulang secara otomatis.
 * Mengembalikan boolean true jika cache dibersihkan dan operasi perlu dicoba ulang.
 */
async function handleSheetError(error: any): Promise<boolean> {
  const errMsg = error?.message || "";
  if (
    errMsg.includes("404") || 
    errMsg.includes("403") || 
    errMsg.includes("File not found") || 
    errMsg.includes("NotFound") ||
    errMsg.includes("Requested entity was not found")
  ) {
    console.warn("Spreadsheet ID tidak valid atau telah dihapus. Menghapus cache...");
    localStorage.removeItem("google_spreadsheet_id");
    
    // Hapus juga dari metadata Supabase
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.auth.updateUser({
          data: {
            google_spreadsheet_id: null
          }
        });
      }
    } catch (e) {
      console.error("Gagal mereset spreadsheet ID di Supabase:", e);
    }
    return true; // Perlu dicoba ulang
  }
  return false;
}

/**
 * Membaca data dari range sel tertentu di Spreadsheet
 * Contoh range: "Siswa!A2:G"
 */
export async function readSheetRange(range: string): Promise<SheetRow[]> {
  let spreadsheetId = await getOrCreateSpreadsheetId();
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  
  try {
    const data = await fetchGoogleAPI(url);
    return data.values || [];
  } catch (error) {
    const cleared = await handleSheetError(error);
    if (cleared) {
      console.log("Mencoba ulang operasi read setelah mereset spreadsheet...");
      spreadsheetId = await getOrCreateSpreadsheetId(true);
      url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
      const data = await fetchGoogleAPI(url);
      return data.values || [];
    }
    console.error(`Gagal membaca range ${range}:`, error);
    throw error;
  }
}

/**
 * Menambahkan baris baru ke range tertentu di Spreadsheet
 * Contoh range: "Siswa!A:G"
 */
export async function appendSheetRows(range: string, values: SheetRow[]): Promise<void> {
  let spreadsheetId = await getOrCreateSpreadsheetId();
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}:append?valueInputOption=USER_ENTERED`;

  try {
    await fetchGoogleAPI(url, {
      method: "POST",
      body: JSON.stringify({ values }),
    });
  } catch (error) {
    const cleared = await handleSheetError(error);
    if (cleared) {
      console.log("Mencoba ulang operasi append setelah mereset spreadsheet...");
      spreadsheetId = await getOrCreateSpreadsheetId(true);
      url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        range
      )}:append?valueInputOption=USER_ENTERED`;
      await fetchGoogleAPI(url, {
        method: "POST",
        body: JSON.stringify({ values }),
      });
      return;
    }
    console.error(`Gagal append range ${range}:`, error);
    throw error;
  }
}

/**
 * Memperbarui data range sel tertentu di Spreadsheet
 * Contoh range: "Siswa!A5:G5"
 */
export async function updateSheetRange(range: string, values: SheetRow[]): Promise<void> {
  let spreadsheetId = await getOrCreateSpreadsheetId();
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}?valueInputOption=USER_ENTERED`;

  try {
    await fetchGoogleAPI(url, {
      method: "PUT",
      body: JSON.stringify({ values }),
    });
  } catch (error) {
    const cleared = await handleSheetError(error);
    if (cleared) {
      console.log("Mencoba ulang operasi update setelah mereset spreadsheet...");
      spreadsheetId = await getOrCreateSpreadsheetId(true);
      url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        range
      )}?valueInputOption=USER_ENTERED`;
      await fetchGoogleAPI(url, {
        method: "PUT",
        body: JSON.stringify({ values }),
      });
      return;
    }
    console.error(`Gagal update range ${range}:`, error);
    throw error;
  }
}

/**
 * Melakukan batch update ke beberapa range sekaligus
 */
export async function batchUpdateSheetRanges(data: { range: string; values: SheetRow[] }[]): Promise<void> {
  let spreadsheetId = await getOrCreateSpreadsheetId();
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const body = {
    valueInputOption: "USER_ENTERED",
    data: data.map(item => ({
      range: item.range,
      values: item.values
    }))
  };

  try {
    await fetchGoogleAPI(url, {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (error) {
    const cleared = await handleSheetError(error);
    if (cleared) {
      console.log("Mencoba ulang operasi batchUpdate setelah mereset spreadsheet...");
      spreadsheetId = await getOrCreateSpreadsheetId(true);
      url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
      await fetchGoogleAPI(url, {
        method: "POST",
        body: JSON.stringify(body),
      });
      return;
    }
    console.error("Gagal melakukan batch update:", error);
    throw error;
  }
}

/**
 * Membaca seluruh data konfigurasi dari tab Konfigurasi Google Sheets
 */
export async function readDatabaseConfig(): Promise<Record<string, string>> {
  try {
    const rows = await readSheetRange("Konfigurasi!A2:B");
    const config: Record<string, string> = {};
    rows.forEach(row => {
      if (row[0]) config[row[0]] = row[1] || "";
    });
    return config;
  } catch (e) {
    console.error("Gagal membaca konfigurasi dari Google Sheets:", e);
    return {};
  }
}

/**
 * Menulis data konfigurasi ke tab Konfigurasi Google Sheets
 */
export async function writeDatabaseConfig(config: Record<string, string>): Promise<void> {
  let spreadsheetId = await getOrCreateSpreadsheetId();
  
  // Baca config lama terlebih dahulu untuk menggabungkannya
  let existingConfig: Record<string, string> = {};
  try {
    existingConfig = await readDatabaseConfig();
  } catch (e) {
    // Abaikan jika kosong/error
  }
  
  const merged = { ...existingConfig, ...config };
  const values = Object.entries(merged).map(([key, val]) => [key, val]);
  const endRow = values.length + 1; // A2 dimulai dari index 2
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Konfigurasi!A2:B${endRow}?valueInputOption=USER_ENTERED`;
  
  try {
    await fetchGoogleAPI(url, {
      method: "PUT",
      body: JSON.stringify({ values }),
    });
  } catch (error) {
    const cleared = await handleSheetError(error);
    if (cleared) {
      console.log("Mencoba ulang operasi writeDatabaseConfig setelah mereset spreadsheet...");
      spreadsheetId = await getOrCreateSpreadsheetId(true);
      url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Konfigurasi!A2:B${endRow}?valueInputOption=USER_ENTERED`;
      await fetchGoogleAPI(url, {
        method: "PUT",
        body: JSON.stringify({ values }),
      });
      return;
    }
    console.error("Gagal menyimpan konfigurasi ke Google Sheets:", error);
    throw error;
  }
}
