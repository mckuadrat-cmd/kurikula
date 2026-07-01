# Setup Google OAuth untuk kurikula

Untuk mengaktifkan fitur **Login dengan Google**, Anda perlu melakukan konfigurasi di Supabase Dashboard.

## Langkah-langkah Setup Google OAuth

### 1. Buka Supabase Dashboard
- Pergi ke: https://supabase.com/dashboard
- Login ke akun Anda
- Pilih project kurikula Anda

### 2. Aktifkan Google Provider
1. Di sidebar, klik **Authentication** > **Providers**
2. Scroll ke bagian **Google**
3. Toggle **Enable Sign in with Google**

### 3. Konfigurasi Google Cloud Console
Ikuti panduan lengkap di dokumentasi Supabase:
👉 **https://supabase.com/docs/guides/auth/social-login/auth-google**

Ringkasan langkah:
1. Buka Google Cloud Console: https://console.cloud.google.com/
2. Buat project baru atau pilih existing project
3. Aktifkan Google+ API
4. Buat OAuth 2.0 Credentials
5. Tambahkan Authorized redirect URIs:
   ```
   https://<YOUR_PROJECT_ID>.supabase.co/auth/v1/callback
   ```
6. Copy **Client ID** dan **Client Secret**

### 4. Masukkan Credentials ke Supabase
1. Kembali ke Supabase Dashboard > Authentication > Providers > Google
2. Paste **Client ID** dari Google Cloud Console
3. Paste **Client Secret** dari Google Cloud Console
4. Klik **Save**

### 5. Test Login
Setelah setup selesai, coba fitur "Masuk dengan Google" di halaman login aplikasi Anda.

## Catatan Penting
- ⚠️ Jika tidak melakukan setup ini, akan muncul error "**provider is not enabled**" saat user mencoba login dengan Google
- ✅ Setup ini hanya perlu dilakukan **satu kali**
- 🔒 Pastikan Authorized redirect URIs sesuai dengan project Supabase Anda

## Troubleshooting
- **Error: Invalid redirect URI** → Periksa kembali redirect URI di Google Cloud Console
- **Error: Provider not enabled** → Pastikan Google provider sudah di-enable di Supabase
- **Error: Invalid client** → Periksa Client ID dan Secret sudah benar

---

Jika mengalami masalah, silakan hubungi tim support atau lihat dokumentasi Supabase.