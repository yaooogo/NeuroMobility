const TOKEN_KEY = "manage_token";
const USER_KEY = "manage_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function hasToken() {
  return Boolean(getToken());
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token || "");
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user || null));
}

export function clearUser() {
  localStorage.removeItem(USER_KEY);
}

export function clearAuth() {
  clearToken();
  clearUser();
}
