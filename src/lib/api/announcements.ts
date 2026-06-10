import { apiFetch, getApiBaseUrl } from "./client";
import { useAuth } from "@/lib/store";

export interface AnnouncementPayload {
  subject: string;
  message: string;
  date: string;
}

export interface AnnouncementResponse {
  id: string;
  subject: string;
  message: string;
  date: string;
  attachment_name?: string | null;
  attachment_key?: string | null;
}

export async function fetchAnnouncements(): Promise<AnnouncementResponse[]> {
  return apiFetch<AnnouncementResponse[]>("/announcements");
}

export async function createAnnouncement(payload: AnnouncementPayload): Promise<AnnouncementResponse> {
  return apiFetch<AnnouncementResponse>("/announcements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteAnnouncement(id: string): Promise<{ status: string; message: string }> {
  return apiFetch<{ status: string; message: string }>(`/announcements/${id}`, {
    method: "DELETE",
  });
}

export async function uploadAnnouncementFile(id: string, file: File): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);
  const token = useAuth.getState().token;
  const response = await fetch(`${getApiBaseUrl()}/announcements/${id}/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || "Upload failed.");
  }
  return response.json();
}
