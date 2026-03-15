// ================================================
// captionManager.js - Auto-generate caption "Day N"
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
 * Load day counter dari file
 * @returns {number} - Hari terakhir yang sudah diupload
 */
function loadDayCounter() {
  if (!fs.existsSync(DAY_COUNTER_FILE)) {
    return 0; // Belum pernah upload, mulai dari 0
  }
  try {
    const raw = fs.readFileSync(DAY_COUNTER_FILE, "utf8");
    const data = JSON.parse(raw);
    return data.currentDay || 0;
  } catch {
    return 0;
  }
}

/**
 * Simpan day counter ke file
 * @param {number} day - Nomor hari yang baru saja diupload
 */
function saveDayCounter(day) {
  const data = {
    currentDay: day,
    lastUpload: new Date().toISOString(),
  };
  fs.writeFileSync(DAY_COUNTER_FILE, JSON.stringify(data, null, 2), "utf8");
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
