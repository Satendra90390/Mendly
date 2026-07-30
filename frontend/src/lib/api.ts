import { API_BASE } from "./config";

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, opts);
  return res.json();
}

export async function authApiFetch(path: string, token: string, opts: RequestInit = {}) {
  const headers = new Headers(opts.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (res.status === 401) throw new Error("Session expired");
  return res.json();
}
