// ================================================
// captionManager.js - Auto-generate caption "Day N"
// Dual persistence: file (lokal) + env CURRENT_DAY
// agar aman di Render.com (filesystem ephemeral)
// ================================================

const fs = require("fs");
const path = require("path");
const logger = require("./logger");

const DATA_DIR = path.join(__dirname, "../data");
const DAY_COUNTER_FILE = path.join(DATA_DIR, "day_counter.json");

// Pastikan direktori data ada
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Load day counter.
 * Prioritas: file lokal → env var CURRENT_DAY → 0
 */
function loadDayCounter() {
  // 1. Coba baca dari file lokal
  if (fs.existsSync(DAY_COUNTER_FILE)) {
    try {
      const raw = fs.readFileSync(DAY_COUNTER_FILE, "utf8");
      const data = JSON.parse(raw);
      if (data.currentDay) {
        logger.info(`Day counter dari file: ${data.currentDay}`);
        return data.currentDay;
      }
    } catch { /* lanjut ke fallback */ }
  }

  // 2. Fallback: baca dari env CURRENT_DAY
  // (set manual di Render dashboard jika redeploy)
  const envDay = parseInt(process.env.CURRENT_DAY);
  if (!isNaN(envDay) && envDay > 0) {
    logger.info(`Day counter dari env CURRENT_DAY: ${envDay}`);
    return envDay;
  }

  logger.info("Day counter mulai dari 0 (pertama kali)");
  return 0;
}

/**
 * Simpan day counter ke file lokal + process.env
 * @param {number} day - Nomor hari yang baru saja diupload
 */
function saveDayCounter(day) {
  const data = {
    currentDay: day,
    lastUpload: new Date().toISOString(),
  };
  try {
    fs.writeFileSync(DAY_COUNTER_FILE, JSON.stringify(data, null, 2), "utf8");
    logger.info(`Day counter disimpan ke file: ${day}`);
  } catch (err) {
    logger.warn(`Gagal simpan counter ke file: ${err.message}`);
  }
  // Simpan juga ke process.env agar bertahan selama proses hidup
  process.env.CURRENT_DAY = String(day);
}

/**
 * Generate caption berurutan untuk hari berikutnya.
 *
 * Format dikustomisasi via .env:
 *   CAPTION_TEMPLATE = "for my self day {day}"
 *   CAPTION_TAGS     = "#everyday #daily"
 *
 * Contoh output:
 *   for my self day 1
 *   #everyday #daily
 *
 * @returns {{ caption: string, day: number }}
 */
function getNextDayCaption() {
  const template = process.env.CAPTION_TEMPLATE || "for my self day {day}";
  const tags = process.env.CAPTION_TAGS || "#everyday #daily";

  const lastDay = loadDayCounter();
  const nextDay = lastDay + 1;

  const captionText = template.replace("{day}", nextDay);
  const caption = `${captionText}\n${tags}`;

  // Simpan progress hari ini
  saveDayCounter(nextDay);

  logger.info(`Caption Day ${nextDay} → "${captionText}"`);

  return { caption, day: nextDay };
}

/**
 * Preview caption hari berikutnya TANPA menaikkan counter
 * @returns {{ caption: string, day: number }}
 */
function previewNextCaption() {
  const template = process.env.CAPTION_TEMPLATE || "for my self day {day}";
  const tags = process.env.CAPTION_TAGS || "#everyday #daily";

  const lastDay = loadDayCounter();
  const nextDay = lastDay + 1;

  const captionText = template.replace("{day}", nextDay);
  const caption = `${captionText}\n${tags}`;

  return { caption, day: nextDay };
}

/**
 * Reset counter ke hari tertentu (untuk koreksi / testing)
 * @param {number} day
 */
function resetDayCounter(day = 0) {
  saveDayCounter(day);
  logger.warn(`Day counter direset ke: ${day}`);
}

module.exports = {
  getNextDayCaption,
  previewNextCaption,
  resetDayCounter,
  loadDayCounter,
};