import { apiFetch } from "./client";

export interface TaskPayload {
  subject: string;
  startDate: string;
  resourceId: string;
  project: string;
  notes?: string;
}

export interface TaskResponse {
  id: string;
  subject: string;
  startDate: string;
  resourceId: string;
  resourceName: string;
  project: string;
  notes?: string;
  status: "pending" | "in-progress" | "completed" | "wanting-requirements";
}

export async function fetchTasks(): Promise<TaskResponse[]> {
  return apiFetch<TaskResponse[]>("/tasks");
}

export async function createTask(payload: TaskPayload): Promise<TaskResponse> {
  return apiFetch<TaskResponse>("/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTask(id: string, payload: Partial<TaskPayload> & { status?: string }): Promise<TaskResponse> {
  return apiFetch<TaskResponse>(`/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteTask(id: string): Promise<{ status: string; message: string }> {
  return apiFetch<{ status: string; message: string }>(`/tasks/${id}`, {
    method: "DELETE",
  });
}

export async function fetchAssignedTasks(resourceId: string): Promise<TaskResponse[]> {
  return apiFetch<TaskResponse[]>(`/tasks/assigned/${resourceId}`);
}

export async function updateTaskStatus(id: string, status: string): Promise<{ task_id: string; status: string; message: string }> {
  return apiFetch<{ task_id: string; status: string; message: string }>(`/tasks/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}
