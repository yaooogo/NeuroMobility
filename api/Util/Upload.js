import fs from "fs/promises";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import Config from "./Config.js";
import Helper from "./Helper.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const API_ROOT = path.resolve(__dirname, "..");
const UPLOAD_ROOT = Config.UPLOAD_ROOT || path.join(API_ROOT, "upload");
const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const IMAGE_EXTENSION_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp"
};

function getUploadDomain() {
  return String(
    Config.UPLOAD_DOMAIN
      || Config.uploadDomain
      || Config.APP_DOMAIN
      || Config.APP_URL
      || Config.API_DOMAIN
      || Config.API_URL
      || ""
  ).trim().replace(/\/+$/u, "");
}

function getMaxImageUploadBytes() {
  const configuredMb = Number(Config.UPLOAD_MAX_SIZE_MB || Config.uploadMaxSizeMb || 5);
  const safeMb = Number.isFinite(configuredMb) && configuredMb > 0 ? configuredMb : 5;

  return safeMb * 1024 * 1024;
}

function resolveImageExtension(file) {
  const originalExtension = path.extname(String(file?.originalname || "")).toLowerCase();

  if (ALLOWED_IMAGE_EXTENSIONS.has(originalExtension)) {
    return originalExtension === ".jpeg" ? ".jpg" : originalExtension;
  }

  return IMAGE_EXTENSION_BY_MIME[String(file?.mimetype || "").toLowerCase()] || "";
}

function assertImageFile(file) {
  if (!file) {
    throw new Error("Please select an image file");
  }

  const extension = resolveImageExtension(file);
  const mime = String(file.mimetype || "").toLowerCase();

  if (!extension || !IMAGE_EXTENSION_BY_MIME[mime]) {
    throw new Error("Only jpg, png, gif and webp images are supported");
  }

  return extension;
}

async function saveImage(file) {
  const uploadDomain = getUploadDomain();

  if (!uploadDomain) {
    throw new Error("UPLOAD_DOMAIN is required in .env");
  }

  const extension = assertImageFile(file);
  const now = new Date();
  const year = Helper.dateFormat("YYYY", now);
  const month = Helper.dateFormat("mm", now);
  const day = Helper.dateFormat("dd", now);
  const relativeDir = `/${year}/${month}/${day}`;
  const outputDir = path.join(UPLOAD_ROOT, year, month, day);
  const filename = `${Helper.dateFormat("YYYYmmddHHMMSS", now)}_${Helper.randomStr(16)}${extension}`;

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, filename), file.buffer);

  return {
    filename,
    key: `${relativeDir}/${filename}`,
    url: `${uploadDomain}${relativeDir}/${filename}`
  };
}

function setStaticHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
}

export default {
  UPLOAD_ROOT,
  getMaxImageUploadBytes,
  getUploadDomain,
  saveImage,
  setStaticHeaders
};
