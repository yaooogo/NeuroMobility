import axios from "axios";

export const AUTH_EXPIRED_EVENT = "app-auth-expired";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  timeout: 30000,
  headers: { "Content-Type": "application/x-www-form-urlencoded" }
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || "";
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let authExpiredHandling = false;

function handleExpiredSession(response) {
  const requestUrl = String(response?.config?.url || "");
  if (Number(response?.data?.code) !== 401 || requestUrl.startsWith("/login")) return;

  localStorage.removeItem("token");
  localStorage.removeItem("auth_address");
  localStorage.removeItem("auth_expires_at");

  if (authExpiredHandling) return;
  authExpiredHandling = true;
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, {
    detail: { message: response?.data?.message || "Authentication failed" }
  }));
  window.setTimeout(() => { authExpiredHandling = false; }, 0);
}

http.interceptors.response.use(
  (response) => {
    handleExpiredSession(response);
    return response;
  },
  (error) => {
    handleExpiredSession(error?.response);
    return Promise.reject(error);
  }
);

function unwrap(response) {
  const body = response?.data;
  if (!body || Number(body.code) !== 0) {
    throw Object.assign(new Error(body?.message || "Request failed"), {
      code: Number(body?.code ?? -1),
      data: body?.data
    });
  }
  return body.data;
}

export async function requestLoginNonce(address) {
  return unwrap(await http.post("/login/nonce", { address }));
}

export async function requestResolveInviter(refCode) {
  return unwrap(await http.post("/login/inviter", { ref_code: refCode }));
}

export async function requestLogin(address, signature, refCode = "") {
  return unwrap(await http.post("/login", { address, signature, ref_code: refCode }));
}

export async function requestLogout() {
  return unwrap(await http.post("/logout", {}));
}

export async function requestAnnouncements(language = "zh") {
  const data = unwrap(await http.get("/content/announcements", { params: { language } }));
  return Array.isArray(data?.items) ? data.items : [];
}

export async function requestHelpArticles(language = "zh") {
  const data = unwrap(await http.get("/content/help-articles", { params: { language } }));
  return Array.isArray(data?.items) ? data.items : [];
}

export async function requestAboutArticles(language = "zh") {
  const data = unwrap(await http.get("/content/about", { params: { language } }));
  return Array.isArray(data?.items) ? data.items : [];
}

export async function requestVehicles(language = "zh") {
  const data = unwrap(await http.get("/content/vehicles", { params: { language } }));
  return Array.isArray(data?.items) ? data.items : [];
}

export async function requestAssetOverview() {
  return unwrap(await http.get("/asset/overview"));
}

export async function requestPrepareWithdrawal(amount, address) {
  return unwrap(await http.post("/asset/withdraw/prepare", { amount, address }));
}

export async function requestWithdrawalSubmitted(orderId, txHash) {
  return unwrap(await http.post("/asset/withdraw/submitted", {
    order_id: orderId,
    tx_hash: txHash
  }));
}

export async function requestAssetRecords() {
  const data = unwrap(await http.get("/asset/records"));
  return Array.isArray(data?.items) ? data.items : [];
}
