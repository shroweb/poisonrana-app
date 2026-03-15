import * as SecureStore from "expo-secure-store";

const BASE = "https://www.poisonrana.com/api/v1";

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  });
  return res.json();
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | number>) => {
    let url = path;
    if (params) {
      const qs = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString();
      url = `${path}?${qs}`;
    }
    return request<T>(url);
  },
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string, params?: Record<string, string>) => {
    let url = path;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      url = `${path}?${qs}`;
    }
    return request<T>(url, { method: "DELETE" });
  },
};
