import axios from "axios";

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
