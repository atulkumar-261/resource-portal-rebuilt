import { apiFetch } from "./client";

export interface LeavePayload {
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  reason?: string;
}

export interface LeaveResponse {
  id: string;
  resourceId: string;
  resourceName: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  type: string;
  reason?: string;
  status: "pending" | "approved" | "rejected";
}

export interface LeaveBalanceResponse {
  id: string;
  leave_type_id: string;
  leave_type_name: string;
  balance: number;
}

export async function fetchLeaves(): Promise<LeaveResponse[]> {
  return apiFetch<LeaveResponse[]>("/leaves");
}

export async function applyLeave(payload: LeavePayload): Promise<LeaveResponse> {
  return apiFetch<LeaveResponse>("/leaves/apply", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateLeaveStatus(id: string, status: "approved" | "rejected", remarks?: string): Promise<LeaveResponse> {
  return apiFetch<LeaveResponse>(`/leaves/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, remarks }),
  });
}

export async function deleteLeave(id: string): Promise<{ status: string; message: string }> {
  return apiFetch<{ status: string; message: string }>(`/leaves/${id}`, {
    method: "DELETE",
  });
}

export async function fetchLeaveBalances(resourceId: string): Promise<LeaveBalanceResponse[]> {
  return apiFetch<LeaveBalanceResponse[]>(`/leaves/balances/${resourceId}`);
}

export async function fetchLeaveHistory(resourceId: string): Promise<LeaveResponse[]> {
  return apiFetch<LeaveResponse[]>(`/leaves/my-history/${resourceId}`);
}
