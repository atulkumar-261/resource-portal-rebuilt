import type { AdminUser, AuditLog } from "@/lib/types";
import { apiFetch } from "./client";

type AdminUserResponse = {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  role: "super_admin" | "admin";
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  generated_password?: string | null;
};

type AuditLogResponse = {
  id: string;
  actor_user_id: string | null;
  actor_username: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  target_username: string | null;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  changed_fields?: Record<string, unknown> | null;
  created_at: string;
};

export type AdminCreatePayload = {
  full_name: string;
  role: "super_admin" | "admin";
  username?: string;
  email: string;
  password?: string;
};

export type AdminUpdatePayload = {
  email?: string;
  full_name?: string;
};

const mapAdminUser = (user: AdminUserResponse): AdminUser => ({
  id: user.id,
  username: user.username,
  email: user.email,
  fullName: user.full_name,
  role: user.role,
  isActive: user.is_active,
  createdAt: user.created_at,
  lastLogin: user.last_login,
  generatedPassword: user.generated_password,
});

const mapAuditLog = (log: AuditLogResponse): AuditLog => ({
  id: log.id,
  actorUserId: log.actor_user_id,
  actorUsername: log.actor_username,
  action: log.action,
  entityType: log.entity_type,
  entityId: log.entity_id,
  targetUsername: log.target_username,
  oldValue: log.old_value,
  newValue: log.new_value,
  changedFields: log.changed_fields,
  createdAt: log.created_at,
});

export async function fetchAdmins() {
  const users = await apiFetch<AdminUserResponse[]>("/admin/users");
  return users.map(mapAdminUser);
}

export async function createAdmin(payload: AdminCreatePayload) {
  const user = await apiFetch<AdminUserResponse>("/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapAdminUser(user);
}

export async function updateAdmin(id: string, payload: AdminUpdatePayload) {
  const user = await apiFetch<AdminUserResponse>(`/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapAdminUser(user);
}

export async function activateAdmin(id: string) {
  const user = await apiFetch<AdminUserResponse>(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: true }),
  });
  return mapAdminUser(user);
}

export async function deactivateAdmin(id: string) {
  const user = await apiFetch<AdminUserResponse>(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: false }),
  });
  return mapAdminUser(user);
}

export async function deleteAdmin(id: string) {
  return apiFetch<{ status: string; message: string }>(`/admin/users/${id}`, {
    method: "DELETE",
  });
}

export async function resetAdminPassword(id: string) {
  const user = await apiFetch<AdminUserResponse>(`/admin/users/${id}/reset-password`, {
    method: "POST",
  });
  return mapAdminUser(user);
}

export async function fetchAdminAuditLogs() {
  const logs = await apiFetch<AuditLogResponse[]>("/admin/audit-logs");
  return logs.map(mapAuditLog);
}
