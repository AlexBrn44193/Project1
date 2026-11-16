const API_BASE = "http://localhost:5000";

export function getToken() {
  return sessionStorage.getItem("authToken");
}

export function authFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}