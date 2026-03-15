# 📸 Instagram Reels Auto-Upload Bot

Bot Node.js untuk mengupload Instagram Reels secara otomatis setiap hari menggunakan Instagram Graph API.

---

## 📁 Struktur Folder

```
instagram-reels-bot/
├── bot.js                  # Script utama (entry point)
├── package.json
├── .env                    # Konfigurasi (buat dari .env.example)
├── .env.example            # Template konfigurasi
├── .gitignore
├── captions.json           # Daftar caption Reels
├── src/
│   ├── instagramApi.js     # Service Instagram Graph API
│   ├── captionManager.js   # Manager caption acak
│   ├── uploader.js         # Logika upload dengan retry
│   └── logger.js           # Utility logging
├── data/
│   └── used_captions.json  # Tracking caption yang sudah dipakai (auto-generated)
└── logs/
    └── bot-YYYY-MM-DD.log  # Log harian (auto-generated)
```

---

## ⚙️ Prasyarat

- **Node.js** v16 atau lebih baru
- **Akun Instagram Business/Creator**
- **Meta Developer App** dengan izin:
  - `instagram_content_publish`
  - `instagram_basic`
- **Video Reels** yang dihosting di URL publik (HTTPS)

---

## 🚀 Cara Instalasi

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Konfigurasi

Salin file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Edit file `.env`:

```env
IG_USER_ID=123456789012345
ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx
VIDEO_URL=https://your-server.com/videos/reels.mp4
CRON_SCHEDULE=0 9 * * *
TIMEZONE=Asia/Jakarta
MAX_RETRY=3
RETRY_DELAY=5000
POLLING_INTERVAL=10000
MAX_POLLING_ATTEMPTS=12
```

### 3. Edit Caption

Edit file `captions.json` dengan caption yang ingin digunakan:

```json
[
  "Caption pertama #hashtag1 #hashtag2",
  "Caption kedua #hashtag1 #hashtag2",
  "Caption ketiga #hashtag1 #hashtag2"
]
```

---

## ▶️ Cara Menjalankan

### Validasi Konfigurasi

```bash
npm run validate
```

### Upload Langsung (Test)

```bash
npm run now
```

### Jalankan Bot (Mode Cron)

```bash
npm start
```

Bot akan berjalan di background dan mengupload Reels sesuai jadwal cron.

---

## ⏰ Contoh Jadwal Cron

| Jadwal               | Keterangan                    |
|----------------------|-------------------------------|
| `0 9 * * *`          | Setiap hari jam 09:00         |
| `0 18 * * *`         | Setiap hari jam 18:00         |
| `0 9,18 * * *`       | Dua kali sehari (09:00 & 18:00) |
| `0 9 * * 1`          | Setiap Senin jam 09:00        |
| `0 9 * * 1,3,5`      | Senin, Rabu, Jumat jam 09:00  |

---

## 🔄 Menjalankan Otomatis dengan PM2

Agar bot berjalan terus-menerus di server:

```bash
# Install PM2
npm install -g pm2

# Jalankan bot dengan PM2
pm2 start bot.js --name "instagram-reels-bot"

# Simpan konfigurasi PM2
pm2 save

# Aktifkan auto-start saat server restart
pm2 startup
```

Perintah PM2 berguna:

```bash
pm2 status                              # Cek status
pm2 logs instagram-reels-bot           # Lihat log
pm2 restart instagram-reels-bot        # Restart bot
pm2 stop instagram-reels-bot           # Stop bot
```

---

## 📋 Flow Upload

```
1. Cron job triggered
      ↓
2. Ambil caption acak dari captions.json
      ↓
3. POST /media → Buat media container
   (media_type=REELS, video_url, caption)
      ↓
4. Polling status container hingga FINISHED
   (setiap 10 detik, max 12x = 2 menit)
      ↓
5. POST /media_publish → Publish Reels
      ↓
6. Log hasil (sukses/gagal)
      ↓
7. Retry jika gagal (max 3x)
```

---

## ⚠️ Catatan Penting

- Video harus berformat **MP4** dan dihosting di URL **HTTPS** yang dapat diakses publik
- Access Token harus memiliki permission `instagram_content_publish`
- Gunakan **Long-lived Access Token** agar tidak cepat expired
- Instagram membatasi upload: maksimal **50 API calls per jam**
- Pastikan video memenuhi syarat Reels Instagram (rasio 9:16, durasi 3-90 detik)

---

## 🔑 Cara Mendapatkan Access Token

1. Buka [Meta Developer Dashboard](https://developers.facebook.com)
2. Buat aplikasi baru atau pilih yang sudah ada
3. Tambahkan produk **Instagram Graph API**
4. Di **Instagram Basic Display**, generate token untuk akun Anda
5. Gunakan **Graph API Explorer** untuk generate **Long-lived Token**

---

## 📝 Log

Log disimpan di folder `logs/` dengan format nama `bot-YYYY-MM-DD.log`.

Contoh output log:

```
[17/03/2024, 09:00:01] ✅ [SUCCESS] Media container berhasil dibuat. Container ID: 17841234567
[17/03/2024, 09:00:11] ℹ️  [INFO]    Polling status... (1/12)
[17/03/2024, 09:00:11] ℹ️  [INFO]    Status container: IN_PROGRESS
[17/03/2024, 09:00:21] ℹ️  [INFO]    Polling status... (2/12)
[17/03/2024, 09:00:21] ✅ [SUCCESS] Video berhasil diproses dan siap dipublish!
[17/03/2024, 09:00:23] ✅ [SUCCESS] Reels berhasil dipublish! Media ID: 17841234568
```
