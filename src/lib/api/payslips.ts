import { apiFetch, getApiBaseUrl } from "./client";
import { useAuth } from "@/lib/store";

export interface PayslipResponse {
  id: string;
  resourceId: string;
  resourceName: string;
  month: string;
  days: number;
  notes?: string;
  amount: number;
  fileAttachmentId?: string | null;
}

export async function fetchPayslips(): Promise<PayslipResponse[]> {
  return apiFetch<PayslipResponse[]>("/payslips");
}

export async function createPayslip(payload: {
  month: string;
  days: number;
  notes: string;
  resourceId: string;
  amount: number;
  file: File;
}): Promise<PayslipResponse> {
  const formData = new FormData();
  formData.append("month", payload.month);
  formData.append("days", String(payload.days));
  formData.append("notes", payload.notes);
  formData.append("resource_id", payload.resourceId);
  formData.append("amount", String(payload.amount));
  formData.append("file", payload.file);

  const token = useAuth.getState().token;
  const response = await fetch(`${getApiBaseUrl()}/payslips`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || "Create payslip failed.");
  }
  return response.json();
}

export async function deletePayslip(id: string): Promise<{ status: string; message: string }> {
  return apiFetch<{ status: string; message: string }>(`/payslips/${id}`, {
    method: "DELETE",
  });
}
