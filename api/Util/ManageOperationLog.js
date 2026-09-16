import Database from "./Database.js";
import DB from "./database/DB.js";
import Helper from "./Helper.js";

const TABLE_NAME = "admin_operation_log";
const MAX_JSON_LENGTH = 60000;
const SENSITIVE_KEYS = new Set([
  "authorization",
  "password",
  "old_password",
  "new_password",
  "confirm_password",
  "token",
  "refreshtoken",
  "refresh_token",
  "secret",
  "google_secret",
  "google_code",
  "googlecode",
  "code",
  "private_key",
  "privatekey",
  "mnemonic",
  "seed",
  "signature"
]);
const WRITE_PATH_PATTERNS = [
  /\/create$/u,
  /\/update(?:-[^/]+)?$/u,
  /\/delete$/u,
  /\/remove$/u,
  /\/save$/u,
  /\/grant$/u,
  /\/bind$/u,
  /\/unbind$/u,
  /\/batch-import$/u,
  /\/import$/u,
  /\/reset(?:-[^/]+)?$/u,
  /\/destroy$/u,
  /\/cancel(?:-[^/]+)?$/u,
  /\/activate(?:-[^/]+)?$/u,
  /\/logout$/u
];

let tableReady = false;

function normalizePath(value) {
  const path = String(value || "").split("?")[0].trim() || "/";
  return path.length > 1 ? path.replace(/\/+$/u, "") : path;
}

function shouldLogPath(pathValue) {
  const path = normalizePath(pathValue);

  if (path === "/user/info" || path.startsWith("/admin-operation-log")) {
    return false;
  }

  return WRITE_PATH_PATTERNS.some((pattern) => pattern.test(path));
}

function normalizeKey(value) {
  return String(value || "").replace(/[^a-zA-Z0-9]/gu, "").toLowerCase();
}

function isSensitiveKey(key) {
  const normalized = normalizeKey(key);
  return SENSITIVE_KEYS.has(normalized)
    || normalized.includes("password")
    || normalized.includes("secret")
    || normalized.includes("token")
    || normalized.includes("privatekey")
    || normalized.includes("mnemonic");
}

function sanitizeValue(value, key = "") {
  if (isSensitiveKey(key)) {
    return "***";
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [childKey, sanitizeValue(childValue, childKey)])
    );
  }

  return value;
}

function stringifyLimited(value) {
  const text = JSON.stringify(value ?? {});
  if (text.length <= MAX_JSON_LENGTH) {
    return text;
  }

  return `${text.slice(0, MAX_JSON_LENGTH)}...`;
}

function parseResponsePayload(payload) {
  if (payload && typeof payload === "object" && !Buffer.isBuffer(payload)) {
    return payload;
  }

  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }

  return null;
}

async function write(req, responsePayload, durationMs = 0) {
  const path = normalizePath(req.path || req._parsedOriginalUrl?.pathname || "");
  if (!shouldLogPath(path)) {
    return;
  }

  try {

    const response = parseResponsePayload(responsePayload);
    const params = sanitizeValue({
      query: req.query || {},
      body: req.body || {}
    });

    await DB.query().table(TABLE_NAME).insert({
      admin_id: Number(req.auth?.id?.() || 0),
      admin_username: String(req.auth?.username?.() || req.auth?.user?.username || "").slice(0, 64),
      method: String(req.method || "").slice(0, 10),
      path: path.slice(0, 191),
      request_params: stringifyLimited(params),
      response_code: Number(response?.code ?? resStatusToCode(req.res?.statusCode)),
      response_message: String(response?.message || "").slice(0, 255),
      ip: String(Helper.getClientIp(req)).slice(0, 64),
      user_agent: String(req.headers?.["user-agent"] || "").slice(0, 512),
      duration_ms: Math.max(0, Number(durationMs || 0)),
      created_at: Helper.dateFormat("YYYY-mm-dd HH:MM:SS", new Date())
    });
  } catch (error) {
    console.error("[ManageOperationLog] write failed:", error);
  }
}

function resStatusToCode(statusCode) {
  const status = Number(statusCode || 200);
  return status >= 400 ? status : 0;
}

function capture(req, res, next) {
  const startedAt = Date.now();
  const originalSend = res.send.bind(res);

  res.send = function sendWithOperationLog(payload) {
    Promise.resolve(write(req, payload, Date.now() - startedAt)).catch((error) => {
      console.error("[ManageOperationLog] capture failed:", error);
    });

    return originalSend(payload);
  };

  return next();
}

export default {
  TABLE_NAME,
  capture,
  shouldLogPath
};
