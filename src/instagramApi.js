// ================================================
// instagramApi.js - Service untuk Instagram Graph API
// ================================================

const axios = require("axios");
const logger = require("./logger");

const BASE_URL = "https://graph.facebook.com/v19.0";

/**
 * Step 1: Membuat media container untuk Reels
 * @param {string} userId - Instagram User ID
 * @param {string} videoUrl - URL publik video
 * @param {string} caption - Caption untuk Reels
 * @param {string} accessToken - Access Token
 * @returns {Promise<string>} - Container ID
 */
async function createMediaContainer(userId, videoUrl, caption, accessToken) {
  logger.info(`Membuat media container untuk video...`);
  logger.info(`Video URL: ${videoUrl}`);
  logger.info(`Caption: ${caption.substring(0, 60)}...`);

  const url = `${BASE_URL}/${userId}/media`;

  const params = new URLSearchParams({
    media_type: "REELS",
    video_url: videoUrl,
    caption: caption,
    share_to_feed: "true",
    access_token: accessToken,
  });

  try {
    const response = await axios.post(url, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 30000,
    });

    const containerId = response.data.id;
    logger.success(`Media container berhasil dibuat. Container ID: ${containerId}`);
    return containerId;
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    const errCode = error.response?.data?.error?.code || "N/A";
    throw new Error(`Gagal membuat media container [Code: ${errCode}]: ${errMsg}`);
  }
}

/**
 * Mengecek status processing media container
 * @param {string} containerId - Container ID
 * @param {string} accessToken - Access Token
 * @returns {Promise<string>} - Status: FINISHED, IN_PROGRESS, ERROR, EXPIRED
 */
async function checkContainerStatus(containerId, accessToken) {
  const url = `${BASE_URL}/${containerId}`;

  try {
    const response = await axios.get(url, {
      params: {
        fields: "status_code,status",
        access_token: accessToken,
      },
      timeout: 15000,
    });

    return {
      statusCode: response.data.status_code,
      status: response.data.status,
    };
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    throw new Error(`Gagal mengecek status container: ${errMsg}`);
  }
}

/**
 * Polling status container hingga FINISHED atau ERROR
 * @param {string} containerId - Container ID
 * @param {string} accessToken - Access Token
 * @param {number} maxAttempts - Maksimal percobaan polling
 * @param {number} interval - Interval polling dalam ms
 * @returns {Promise<boolean>} - true jika FINISHED
 */
async function waitForContainerReady(
  containerId,
  accessToken,
  maxAttempts = 12,
  interval = 10000
) {
  logger.info(`Menunggu video selesai diproses oleh Instagram...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    logger.info(`Polling status... (${attempt}/${maxAttempts})`);

    const { statusCode, status } = await checkContainerStatus(
      containerId,
      accessToken
    );

    logger.info(`Status container: ${statusCode} - ${status || "N/A"}`);

    if (statusCode === "FINISHED") {
      logger.success(`Video berhasil diproses dan siap dipublish!`);
      return true;
    }

    if (statusCode === "ERROR" || statusCode === "EXPIRED") {
      throw new Error(
        `Container gagal diproses. Status: ${statusCode} | Detail: ${status}`
      );
    }

    if (attempt < maxAttempts) {
      logger.info(`Menunggu ${interval / 1000} detik sebelum polling berikutnya...`);
      await sleep(interval);
    }
  }

  throw new Error(
    `Timeout! Container belum FINISHED setelah ${maxAttempts} percobaan polling.`
  );
}

/**
 * Step 2: Mempublish media container yang sudah siap
 * @param {string} userId - Instagram User ID
 * @param {string} containerId - Container ID
 * @param {string} accessToken - Access Token
 * @returns {Promise<string>} - Media ID yang telah dipublish
 */
async function publishMedia(userId, containerId, accessToken) {
  logger.info(`Mempublish Reels ke Instagram...`);

  const url = `${BASE_URL}/${userId}/media_publish`;

  const params = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  });

  try {
    const response = await axios.post(url, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 30000,
    });

    const mediaId = response.data.id;
    logger.success(`Reels berhasil dipublish! Media ID: ${mediaId}`);
    return mediaId;
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    const errCode = error.response?.data?.error?.code || "N/A";
    throw new Error(`Gagal mempublish media [Code: ${errCode}]: ${errMsg}`);
  }
}

/**
 * Mendapatkan informasi akun Instagram
 * @param {string} userId - Instagram User ID
 * @param {string} accessToken - Access Token
 * @returns {Promise<Object>} - Data akun
 */
async function getAccountInfo(userId, accessToken) {
  const url = `${BASE_URL}/${userId}`;

  try {
    const response = await axios.get(url, {
      params: {
        fields: "id,name,username,followers_count,media_count",
        access_token: accessToken,
      },
      timeout: 15000,
    });

    return response.data;
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    throw new Error(`Gagal mendapatkan info akun: ${errMsg}`);
  }
}

/**
 * Memvalidasi Access Token
 * @param {string} accessToken - Access Token
 * @returns {Promise<Object>} - Info token
 */
async function validateToken(accessToken) {
  const url = `${BASE_URL}/debug_token`;

  try {
    const response = await axios.get(url, {
      params: {
        input_token: accessToken,
        access_token: accessToken,
      },
      timeout: 15000,
    });

    return response.data.data;
  } catch (error) {
    logger.warn(`Tidak dapat memvalidasi token: ${error.message}`);
    return null;
  }
}

// Utility: sleep function
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  createMediaContainer,
  checkContainerStatus,
  waitForContainerReady,
  publishMedia,
  getAccountInfo,
  validateToken,
  sleep,
};
