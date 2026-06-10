import { apiFetch } from "./client";

export interface DailyEntry {
  work_date: string;
  hours: number;
  remarks?: string;
}

export interface TimesheetRow {
  project_id: string;
  daily_entries: DailyEntry[];
}

export interface TimesheetSubmitRequest {
  week_end_date: string;
  rows: TimesheetRow[];
}

export interface TimesheetEntryResponse {
  id: string;
  projectId: string;
  projectName: string;
  workDate: string;
  hours: number;
  remarks?: string;
}

export interface TimesheetResponse {
  id: string;
  resourceId: string;
  resourceName: string;
  weekNumber: number;
  weekEndDate: string;
  totalHours: number;
  status: "pending" | "approved" | "rejected" | "deleted" | "in draft";
  projectName?: string;
  dailyHours?: number[];
  entries?: TimesheetEntryResponse[];
}

export async function fetchTimesheets(): Promise<TimesheetResponse[]> {
  return apiFetch<TimesheetResponse[]>("/timesheets");
}

export async function fetchTimesheet(id: string): Promise<TimesheetResponse> {
  return apiFetch<TimesheetResponse>(`/timesheets/${id}`);
}

export async function submitTimesheet(payload: TimesheetSubmitRequest): Promise<TimesheetResponse> {
  return apiFetch<TimesheetResponse>("/timesheets", {
    method: "POST",
    body: JSON.stringify({
      week_end_date: payload.week_end_date,
      rows: payload.rows,
    }),
  });
}

export async function fetchPersonalTimesheets(): Promise<TimesheetResponse[]> {
  return apiFetch<TimesheetResponse[]>("/timesheets/my-history");
}

export async function approveTimesheet(id: string, status: "approved" | "rejected", remarks?: string): Promise<TimesheetResponse> {
  return apiFetch<TimesheetResponse>(`/timesheets/${id}/approve`, {
    method: "PUT",
    body: JSON.stringify({ status, remarks }),
  });
}

export async function deleteTimesheet(id: string): Promise<{ status: string; message: string }> {
  return apiFetch<{ status: string; message: string }>(`/timesheets/${id}`, {
    method: "DELETE",
  });
}
