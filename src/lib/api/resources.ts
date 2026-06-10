import { apiFetch, getApiBaseUrl } from "./client";
import { useAuth } from "@/lib/store";

export type ResourceResponse = {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  dob?: string | null;
  status_id: string;
  avatar_url?: string | null;
  weekly_allowed_hours: number;
  performance_notes?: string | null;
  other_info?: string | null;
  skillset?: string | null;
  profile_completion_percentage?: number;
  onboarding_status?: string;
  approval_status?: string;
  nationality?: string | null;
  passport_number?: string | null;
  passport_expiry?: string | null;
  visa_number?: string | null;
  visa_expiry?: string | null;
  department_id: string;
  designation_id: string;
};

export type ResourceDetailResponse = {
  resource: ResourceResponse;
  profile_completion_percentage: number;
  onboarding_status: string;
  missing_fields: string[];
  current_utilization: number;
  available_capacity_hours: number;
};

export type ProfileCompletionResponse = {
  resource_id: string;
  profile_completion_percentage: number;
  onboarding_status: string;
  missing_fields: string[];
};

export type SelfProfilePayload = {
  phone?: string;
  dob?: string;
  ni_number?: string;
  nationality?: string;
  passport_number?: string;
  passport_expiry?: string;
  visa_number?: string;
  visa_expiry?: string;
  skillset?: string;
  other_info?: string;
  current_address?: string;
  city_id?: string;
  citizen_of_id?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_email?: string;
  emergency_contact_address?: string;
  bank_name?: string;
  account_number?: string;
  sort_code?: string;
};

export async function fetchResources(): Promise<ResourceResponse[]> {
  return apiFetch<ResourceResponse[]>("/resources");
}

export type ResourceLoginInfo = {
  has_account: boolean;
  username?: string;
  is_active?: boolean;
  last_login?: string | null;
};

export type Department = {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
};

export type Designation = {
  id: string;
  title: string;
  description?: string;
  is_active: boolean;
};

export async function fetchDepartments(includeInactive = false): Promise<Department[]> {
  const activeParam = includeInactive === true;
  return apiFetch<Department[]>(`/resources/meta/departments?include_inactive=${activeParam}`);
}

export async function fetchDesignations(includeInactive = false): Promise<Designation[]> {
  const activeParam = includeInactive === true;
  return apiFetch<Designation[]>(`/resources/meta/designations?include_inactive=${activeParam}`);
}

export async function createDepartment(payload: { name: string; description?: string }): Promise<Department> {
  return apiFetch<Department>("/resources/meta/departments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateDepartment(id: string, payload: { name: string; description?: string }): Promise<Department> {
  return apiFetch<Department>(`/resources/meta/departments/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function updateDepartmentStatus(id: string, is_active: boolean): Promise<Department> {
  return apiFetch<Department>(`/resources/meta/departments/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ is_active }),
  });
}

export async function createDesignation(payload: { title: string; description?: string }): Promise<Designation> {
  return apiFetch<Designation>("/resources/meta/designations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateDesignation(id: string, payload: { title: string; description?: string }): Promise<Designation> {
  return apiFetch<Designation>(`/resources/meta/designations/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function updateDesignationStatus(id: string, is_active: boolean): Promise<Designation> {
  return apiFetch<Designation>(`/resources/meta/designations/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ is_active }),
  });
}


export async function fetchResource(resourceId: string): Promise<ResourceDetailResponse> {
  return apiFetch<ResourceDetailResponse>(`/resources/${resourceId}`);
}

export async function fetchResourceLogin(resourceId: string): Promise<ResourceLoginInfo> {
  return apiFetch<ResourceLoginInfo>(`/resources/${resourceId}/login`);
}

export async function createResource(payload: {
  full_name: string;
  email: string;
  department_id: string;
  designation_id: string;
  skills?: string;
}) {
  return apiFetch<{
    resource: {
      id: string;
      employee_id: string;
      full_name: string;
      email: string;
      skillset: string;
      status: string;
    };
    credentials: {
      username: string;
      email: string;
      password: string;
    };
  }>("/resources", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateResourceStatus(resourceId: string, payload: { is_active: boolean }) {
  return apiFetch<{ status: string; is_active: boolean }>(`/resources/${resourceId}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function resetResourcePassword(resourceId: string) {
  return apiFetch<{ status: string; password: string }>(`/resources/${resourceId}/reset-password`, {
    method: "POST",
  });
}

export async function deleteResource(resourceId: string) {
  return apiFetch<{ status: string; message: string }>(`/resources/${resourceId}`, {
    method: "DELETE",
  });
}

export async function updateResourceProfile(
  resourceId: string,
  payload: {
    skillset?: string;
    status?: string;
    weekly_allowed_hours?: number;
    performance_notes?: string;
  }
): Promise<any> {
  return apiFetch<any>(`/resources/${resourceId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ── Self-Service Profile Endpoints ──

export async function updateSelfProfile(payload: SelfProfilePayload) {
  return apiFetch<{
    status: string;
    resource_id: string;
    profile_completion_percentage: number;
    onboarding_status: string;
    missing_fields: string[];
  }>("/resources/profile/self", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function fetchSelfProfileCompletion(): Promise<ProfileCompletionResponse> {
  return apiFetch<ProfileCompletionResponse>("/resources/profile/self/completion");
}

export async function approveResourceOnboarding(resourceId: string) {
  return apiFetch<{ status: string; resource_id: string; approval_status: string }>(
    `/resources/${resourceId}/approve-onboarding`,
    { method: "PUT" }
  );
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ status: string; message: string }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export type WorkloadSummary = {
  resource_id: string;
  resource_name: string;
  total_capacity_hours: number;
  planned_hours: number;
  utilization_percentage: number;
  is_overloaded: boolean;
};

export async function fetchResourceWorkload(startDate: string, endDate: string): Promise<WorkloadSummary[]> {
  return apiFetch<WorkloadSummary[]>(`/resources/workload?start_date=${startDate}&end_date=${endDate}`);
}

export type ResourceDocument = {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  uploaded_at: string;
};

export async function uploadResourceDocument(resourceId: string, documentType: string, file: File): Promise<ResourceDocument> {
  const formData = new FormData();
  formData.append("resource_id", resourceId);
  formData.append("document_type", documentType);
  formData.append("file", file);

  const token = useAuth.getState().token;
  const response = await fetch(`${getApiBaseUrl()}/resources/documents/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData, // Do not set Content-Type header for FormData, browser sets it with boundary
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Upload failed");
  }

  return response.json();
}

export async function fetchResourceDocuments(resourceId: string): Promise<ResourceDocument[]> {
  return apiFetch<ResourceDocument[]>(`/resources/documents/${resourceId}`);
}

export async function deleteResourceDocument(documentId: string): Promise<{ status: string }> {
  return apiFetch<{ status: string }>(`/resources/documents/${documentId}`, { method: "DELETE" });
}
