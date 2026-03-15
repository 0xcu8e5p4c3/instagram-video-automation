// ================================================
// bot.js - Script utama Instagram Reels Auto-Upload
// ================================================

require("dotenv").config();
const cron = require("node-cron");
const http = require("http");
const logger = require("./src/logger");
const { uploadReels, validateConfig } = require("./src/uploader");

// ============ HTTP SERVER (Render free plan) ============
// Render free plan butuh web service dengan port terbuka.
// Server ini hanya menjawab ping agar bot tidak di-sleep.
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  const { loadDayCounter } = require("./src/captionManager");
  const day = loadDayCounter();
  const uptime = Math.floor(process.uptime() / 60);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status: "running",
      bot: "Instagram Reels Auto-Upload",
      currentDay: day,
      nextUpload: process.env.CRON_SCHEDULE || "0 9 * * *",
      timezone: process.env.TIMEZONE || "Asia/Jakarta",
      uptimeMinutes: uptime,
      timestamp: new Date().toISOString(),
    })
  );
});
server.listen(PORT, () => {
  logger.info(`🌐 HTTP server aktif di port ${PORT} (untuk Render keep-alive)`);
});

// ============ KONFIGURASI ============
const CONFIG = {
  userId: process.env.IG_USER_ID,
  accessToken: process.env.ACCESS_TOKEN,
  videoUrl: process.env.VIDEO_URL,
  maxRetry: parseInt(process.env.MAX_RETRY) || 3,
  retryDelay: parseInt(process.env.RETRY_DELAY) || 5000,
  pollingInterval: parseInt(process.env.POLLING_INTERVAL) || 10000,
  maxPollingAttempts: parseInt(process.env.MAX_POLLING_ATTEMPTS) || 12,
};

const CRON_SCHEDULE = process.env.CRON_SCHEDULE || "0 9 * * *";
const TIMEZONE = process.env.TIMEZONE || "Asia/Jakarta";

// ============ BANNER ============
function printBanner() {
  console.log("\x1b[35m");
  console.log("╔═══════════════════════════════════════════════╗");
  console.log("║     📸 Instagram Reels Auto-Upload Bot 📸     ║");
  console.log("║          Powered by Instagram Graph API        ║");
  console.log("╚═══════════════════════════════════════════════╝");
  console.log("\x1b[0m");
}

// ============ JOB UPLOAD ============
async function runUploadJob() {
  logger.info("🚀 Menjalankan job upload Reels...");

  try {
    // Validasi konfigurasi
    await validateConfig(CONFIG);

    // Jalankan upload
    const result = await uploadReels(CONFIG);

    if (result.success) {
      logger.success(
        `Job selesai. Media ID: ${result.mediaId} | ` +
          `Percobaan ke-${result.attempt}`
      );
    } else {
      logger.error(
        `Job gagal setelah ${result.totalAttempts} percobaan. ` +
          `Error: ${result.error}`
      );
    }

    return result;
  } catch (error) {
    logger.error("Job upload gagal dengan error kritis", error);
    return { success: false, error: error.message };
  }
}

// ============ SETUP CRON ============
function setupCronJob() {
  // Validasi format cron
  if (!cron.validate(CRON_SCHEDULE)) {
    logger.error(`Format CRON_SCHEDULE tidak valid: "${CRON_SCHEDULE}"`);
    process.exit(1);
  }

  logger.info(
    `⏰ Cron job aktif dengan jadwal: "${CRON_SCHEDULE}" (${TIMEZONE})`
  );

  // Konversi ke format yang mudah dibaca
  const schedule = parseCronSchedule(CRON_SCHEDULE);
  logger.info(`   Jadwal: ${schedule}`);

  const task = cron.schedule(
    CRON_SCHEDULE,
    async () => {
      logger.divider();
      logger.info("🕘 Cron job triggered!");
      await runUploadJob();
    },
    {
      timezone: TIMEZONE,
      scheduled: true,
    }
  );

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    logger.warn("\nMenerima SIGINT, menghentikan bot...");
    task.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    logger.warn("Menerima SIGTERM, menghentikan bot...");
    task.stop();
    process.exit(0);
  });

  return task;
}

// ============ HELPER: PARSE CRON ============
function parseCronSchedule(cronExpr) {
  const parts = cronExpr.split(" ");
  if (parts.length !== 5) return cronExpr;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  if (
    dayOfMonth === "*" &&
    month === "*" &&
    dayOfWeek === "*" &&
    minute !== "*" &&
    hour !== "*"
  ) {
    return `Setiap hari jam ${hour.padStart(2, "0")}:${minute.padStart(
      2,
      "0"
    )} ${TIMEZONE}`;
  }

  return cronExpr;
}

// ============ ENTRY POINT ============
async function main() {
  printBanner();

  const args = process.argv.slice(2);
  const isTestMode = args.includes("--test") || args.includes("-t");
  const isNowMode = args.includes("--now") || args.includes("-n");
  const isValidateMode = args.includes("--validate") || args.includes("-v");

  // Mode validasi saja
  if (isValidateMode) {
    logger.info("🔍 Mode validasi konfigurasi...");
    try {
      await validateConfig(CONFIG);
      logger.success("Konfigurasi valid!");
    } catch (error) {
      logger.error("Konfigurasi tidak valid!", error);
      process.exit(1);
    }
    return;
  }

  // Mode test: upload sekali lalu exit
  if (isTestMode || isNowMode) {
    logger.info(
      isTestMode
        ? "🧪 Mode TEST - Upload langsung (tidak menggunakan cron)..."
        : "⚡ Mode NOW - Upload langsung..."
    );
    const result = await runUploadJob();
    process.exit(result.success ? 0 : 1);
    return;
  }

  // Mode normal: jalankan cron job
  logger.info("🤖 Bot berjalan dalam mode cron scheduler...");
  setupCronJob();

  logger.info("Bot aktif dan menunggu jadwal cron berikutnya...");
  logger.info("Tekan Ctrl+C untuk menghentikan bot.\n");

  // Tampilkan waktu sekarang
  const now = new Date().toLocaleString("id-ID", {
    timeZone: TIMEZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  logger.info(`Waktu sekarang: ${now}`);
}

// Jalankan
main().catch((error) => {
  logger.error("Error fatal pada aplikasi", error);
  process.exit(1);
});