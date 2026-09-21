import { clearAuth, getToken } from './auth.js';

const apiBase = (import.meta.env.VITE_MANAGE_API_BASE || 'http://127.0.0.1:3001').replace(/\/+$/, '');

export async function post(path, data = {}, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (options.auth !== false && getToken()) {
    headers.Authorization = `Bearer ${getToken()}`;
  }

  let response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
  } catch {
    throw new Error('无法连接后台接口，请检查 API 服务和地址');
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`后台返回了无效响应（HTTP ${response.status}）`);
  }

  if (result?.code === 401 && options.auth !== false) {
    clearAuth();
    if (window.location.pathname !== '/login') window.location.assign('/login');
  }
  if (!response.ok || result?.code !== 0) {
    throw new Error(result?.message || `请求失败（HTTP ${response.status}）`);
  }
  return result.data;
}

export async function postForm(path, formData, options = {}) {
  const headers = {};
  if (options.auth !== false && getToken()) headers.Authorization = `Bearer ${getToken()}`;

  let response;
  try {
    response = await fetch(`${apiBase}${path}`, { method: 'POST', headers, body: formData });
  } catch {
    throw new Error('无法连接后台接口，请检查 API 服务和地址');
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`后台返回了无效响应（HTTP ${response.status}）`);
  }
  if (result?.code === 401 && options.auth !== false) {
    clearAuth();
    if (window.location.pathname !== '/login') window.location.assign('/login');
  }
  if (!response.ok || result?.code !== 0) throw new Error(result?.message || `请求失败（HTTP ${response.status}）`);
  return result.data;
}

function downloadFilename(value) {
  const utf8 = String(value || '').match(/filename\*=UTF-8''([^;]+)/iu);
  if (utf8?.[1]) return decodeURIComponent(utf8[1]);
  return String(value || '').match(/filename="?([^";]+)"?/iu)?.[1] || '';
}

export async function postBlob(path, data = {}, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (options.auth !== false && getToken()) headers.Authorization = `Bearer ${getToken()}`;

  let response;
  try {
    response = await fetch(`${apiBase}${path}`, { method: 'POST', headers, body: JSON.stringify(data) });
  } catch {
    throw new Error('无法连接后台接口，请检查 API 服务和地址');
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const result = await response.json();
    if (result?.code === 401 && options.auth !== false) {
      clearAuth();
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    if (!response.ok || result?.code !== 0) throw new Error(result?.message || `请求失败（HTTP ${response.status}）`);
  }
  if (!response.ok) throw new Error(`请求失败（HTTP ${response.status}）`);
  return {
    blob: await response.blob(),
    filename: downloadFilename(response.headers.get('content-disposition'))
  };
}
