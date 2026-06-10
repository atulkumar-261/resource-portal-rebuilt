import { apiFetch } from "./client";

export interface ProjectPayload {
  name: string;
  client: string;
  startDate: string;
  endDate?: string | null;
  status: "active" | "completed" | "on-hold";
  description?: string;
}

export interface ProjectResponse {
  id: string;
  name: string;
  client: string;
  client_id: string;
  startDate: string;
  endDate?: string | null;
  status: "active" | "completed" | "on-hold";
  description?: string;
}

export async function fetchProjects(): Promise<ProjectResponse[]> {
  return apiFetch<ProjectResponse[]>("/projects");
}

export async function createProject(payload: ProjectPayload): Promise<ProjectResponse> {
  return apiFetch<ProjectResponse>("/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProject(id: string, payload: Partial<ProjectPayload>): Promise<ProjectResponse> {
  return apiFetch<ProjectResponse>(`/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteProject(id: string): Promise<{ status: string; message: string }> {
  return apiFetch<{ status: string; message: string }>(`/projects/${id}`, {
    method: "DELETE",
  });
}

export async function generateProjectTasks(id: string): Promise<{ status: string; message: string }> {
  return apiFetch<{ status: string; message: string }>(`/projects/${id}/generate-tasks`, {
    method: "POST",
  });
}

export async function fetchProjectTasks(id: string): Promise<any[]> {
  return apiFetch<any[]>(`/projects/${id}/tasks`);
}
