import { useAuth } from "@/lib/store";

export const getApiBaseUrl = () => {
  if (typeof window === "undefined") return "http://localhost:8000/api";
  return `http://${window.location.hostname}:8000/api`;
};

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuth.getState().token;
  const headers = new Headers(options.headers);
  headers.set("Content-Type", headers.get("Content-Type") || "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || "Request failed.");
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}
