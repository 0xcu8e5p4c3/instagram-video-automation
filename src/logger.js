// ================================================
// logger.js - Utility untuk logging dengan timestamp
// ================================================

const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "logs");
const LOG_FILE = path.join(LOG_DIR, `bot-${getDateString()}.log`);

// Buat direktori logs jika belum ada
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function getDateString() {
  return new Date().toISOString().split("T")[0];
}

function getTimestamp() {
  return new Date().toLocaleString("id-ID", {
    timeZone: process.env.TIMEZONE || "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function writeToFile(level, message) {
  const logEntry = `[${getTimestamp()}] [${level}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, logEntry, "utf8");
}

const logger = {
  info: (message) => {
    const formatted = `ℹ️  [INFO] ${message}`;
    console.log(`\x1b[36m[${getTimestamp()}]\x1b[0m ${formatted}`);
    writeToFile("INFO", message);
  },

  success: (message) => {
    const formatted = `✅ [SUCCESS] ${message}`;
    console.log(`\x1b[32m[${getTimestamp()}]\x1b[0m ${formatted}`);
    writeToFile("SUCCESS", message);
  },

  warn: (message) => {
    const formatted = `⚠️  [WARN] ${message}`;
    console.log(`\x1b[33m[${getTimestamp()}]\x1b[0m ${formatted}`);
    writeToFile("WARN", message);
  },

  error: (message, err = null) => {
    const errDetail = err
      ? ` | Error: ${err.message || JSON.stringify(err)}`
      : "";
    const formatted = `❌ [ERROR] ${message}${errDetail}`;
    console.error(`\x1b[31m[${getTimestamp()}]\x1b[0m ${formatted}`);
    writeToFile("ERROR", `${message}${errDetail}`);
  },

  divider: () => {
    const line = "─".repeat(60);
    console.log(`\x1b[90m${line}\x1b[0m`);
    writeToFile("---", line);
  },
};

module.exports = logger;
