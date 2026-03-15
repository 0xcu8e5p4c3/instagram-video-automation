// ================================================
// uploader.js - Service utama untuk upload Reels
// ================================================

const logger = require("./logger");
const {
  createMediaContainer,
  waitForContainerReady,
  publishMedia,
  getAccountInfo,
  validateToken,
  sleep,
} = require("./instagramApi");
const { getNextDayCaption } = require("./captionManager");

/**
 * Fungsi utama untuk upload Reels dengan retry mechanism
 * @param {Object} config - Konfigurasi upload
 * @returns {Promise<Object>} - Hasil upload
 */
async function uploadReels(config) {
  const {
    userId,
    accessToken,
    videoUrl,
    maxRetry = 3,
    retryDelay = 5000,
    pollingInterval = 10000,
    maxPollingAttempts = 12,
  } = config;

  let lastError = null;

  for (let attempt = 1; attempt <= maxRetry; attempt++) {
    logger.divider();
    logger.info(
      `🎬 Memulai upload Reels... (Percobaan ${attempt}/${maxRetry})`
    );
    logger.divider();

    try {
      // Ambil caption hari berikutnya (Day N)
      const { caption, day } = getNextDayCaption();
      logger.info(`Posting untuk Day ${day}`);

      // Step 1: Buat media container
      const containerId = await createMediaContainer(
        userId,
        videoUrl,
        caption,
        accessToken
      );

      // Tunggu video selesai diproses
      await waitForContainerReady(
        containerId,
        accessToken,
        maxPollingAttempts,
        pollingInterval
      );

      // Step 2: Publish media
      const mediaId = await publishMedia(userId, containerId, accessToken);

      // Hasil sukses
      const result = {
        success: true,
        mediaId,
        containerId,
        caption,
        day,
        timestamp: new Date().toISOString(),
        attempt,
      };

      logger.divider();
      logger.success(`🎉 Reels berhasil diupload!`);
      logger.success(`   Day         : ${day}`);
      logger.success(`   Media ID    : ${mediaId}`);
      logger.success(`   Container ID: ${containerId}`);
      logger.success(`   Timestamp   : ${result.timestamp}`);
      logger.divider();

      return result;
    } catch (error) {
      lastError = error;
      logger.error(`Percobaan ${attempt} gagal`, error);

      if (attempt < maxRetry) {
        logger.warn(
          `Menunggu ${retryDelay / 1000} detik sebelum retry...`
        );
        await sleep(retryDelay);
      }
    }
  }

  // Semua percobaan gagal
  const result = {
    success: false,
    error: lastError?.message || "Unknown error",
    timestamp: new Date().toISOString(),
    totalAttempts: maxRetry,
  };

  logger.divider();
  logger.error(
    `💀 Upload gagal setelah ${maxRetry} percobaan! Error: ${result.error}`
  );
  logger.divider();

  return result;
}

/**
 * Validasi konfigurasi sebelum upload
 * @param {Object} config - Konfigurasi
 * @throws {Error} - Jika konfigurasi tidak valid
 */
async function validateConfig(config) {
  const { userId, accessToken, videoUrl } = config;
  const errors = [];

  if (!userId || userId === "your_instagram_user_id_here") {
    errors.push("IG_USER_ID belum dikonfigurasi di file .env");
  }

  if (!accessToken || accessToken === "your_access_token_here") {
    errors.push("ACCESS_TOKEN belum dikonfigurasi di file .env");
  }

  if (!videoUrl || videoUrl.includes("example.com")) {
    errors.push("VIDEO_URL belum dikonfigurasi di file .env");
  }

  if (!videoUrl?.startsWith("https://")) {
    errors.push("VIDEO_URL harus menggunakan HTTPS");
  }

  if (errors.length > 0) {
    throw new Error(
      `Konfigurasi tidak valid:\n${errors.map((e) => `  - ${e}`).join("\n")}`
    );
  }

  // Validasi token (opsional, tidak memblokir jika gagal)
  logger.info("Memvalidasi access token...");
  const tokenInfo = await validateToken(accessToken);
  if (tokenInfo) {
    if (!tokenInfo.is_valid) {
      logger.warn("⚠️  Access token mungkin tidak valid atau sudah expired!");
    } else {
      const expiryDate = tokenInfo.expires_at
        ? new Date(tokenInfo.expires_at * 1000).toLocaleDateString("id-ID")
        : "Tidak ada expiry";
      logger.info(`Token valid. Expired: ${expiryDate}`);
    }
  }

  // Tampilkan info akun
  logger.info("Mengambil info akun Instagram...");
  try {
    const accountInfo = await getAccountInfo(userId, accessToken);
    logger.info(`Akun  : @${accountInfo.username} (${accountInfo.name})`);
    logger.info(`Followers: ${accountInfo.followers_count?.toLocaleString() || "N/A"}`);
    logger.info(`Total Media: ${accountInfo.media_count || "N/A"}`);
  } catch (error) {
    logger.warn(`Tidak dapat mengambil info akun: ${error.message}`);
  }
}

module.exports = {
  uploadReels,
  validateConfig,
};
