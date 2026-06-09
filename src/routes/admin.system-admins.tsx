import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Edit, Plus, Power, PowerOff, Trash2, KeyRound } from "lucide-react";

import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PageCard } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  activateAdmin,
  createAdmin,
  deactivateAdmin,
  deleteAdmin,
  resetAdminPassword,
  fetchAdminAuditLogs,
  fetchAdmins,
  updateAdmin,
  type AdminCreatePayload,
} from "@/lib/api/adminUsers";
import type { AdminUser } from "@/lib/types";

export const Route = createFileRoute("/admin/system-admins")({
  component: SystemAdminsPage,
});

const adminQueryKey = ["admin-users"];
const auditQueryKey = ["admin-audit-logs"];

function SystemAdminsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [showCreds, setShowCreds] = useState<AdminUser | null>(null);

  const currentUserRole = useAuth((s) => s.role);
  const adminsQuery = useQuery({ queryKey: adminQueryKey, queryFn: fetchAdmins });
  const auditQuery = useQuery({ queryKey: auditQueryKey, queryFn: fetchAdminAuditLogs });

  const invalidateAdminData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminQueryKey }),
      queryClient.invalidateQueries({ queryKey: auditQueryKey }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: createAdmin,
    onSuccess: async (data) => {
      toast.success("Admin created successfully.");
      setCreateOpen(false);
      setShowCreds(data);
      await invalidateAdminData();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { email: string; full_name: string } }) =>
      updateAdmin(id, payload),
    onSuccess: async () => {
      toast.success("Admin updated successfully.");
      setEditing(null);
      await invalidateAdminData();
    },
    onError: (error) => toast.error(error.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? activateAdmin(id) : deactivateAdmin(id),
    onSuccess: async (_, variables) => {
      toast.success(variables.active ? "Admin reactivated successfully." : "Admin deactivated successfully.");
      await invalidateAdminData();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdmin,
    onSuccess: async () => {
      toast.success("Admin deleted successfully.");
      await invalidateAdminData();
    },
    onError: (error) => toast.error(error.message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: resetAdminPassword,
    onSuccess: async (data) => {
      toast.success("Admin password reset successfully.");
      setShowCreds(data);
      await invalidateAdminData();
    },
    onError: (error) => toast.error(error.message),
  });

  const admins = adminsQuery.data ?? [];
  const superAdminCount = useMemo(
    () => admins.filter((admin) => admin.role === "super_admin" && admin.isActive).length,
    [admins],
  );

  // Enforce access control check
  if (currentUserRole !== "super_admin") {
    return (
      <div className="bg-white rounded-lg border border-slate-300 p-8 max-w-4xl shadow-sm text-center">
        <h2 className="text-red-500 font-medium text-lg">Access Denied</h2>
        <p className="text-slate-500 mt-2">Only Super Admins can manage System Admin users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageCard
        title="System Admins"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Admin / Super Admin
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3 font-semibold">User ID / Username</th>
                <th className="py-2 pr-3 font-semibold">Full Name</th>
                <th className="py-2 pr-3 font-semibold">Email</th>
                <th className="py-2 pr-3 font-semibold">Role</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 pr-3 font-semibold">Created At</th>
                <th className="py-2 pr-3 font-semibold">Last Login</th>
                <th className="py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminsQuery.isLoading && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Loading admins...
                  </td>
                </tr>
              )}
              {!adminsQuery.isLoading && admins.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No admin users found.
                  </td>
                </tr>
              )}
              {admins.map((admin) => (
                <tr key={admin.id} className="border-b last:border-0">
                  <td className="py-3 pr-3 font-medium text-slate-800">{admin.username}</td>
                  <td className="py-3 pr-3">{admin.fullName || "-"}</td>
                  <td className="py-3 pr-3">{admin.email || "-"}</td>
                  <td className="py-3 pr-3">
                    <Badge variant={admin.role === "super_admin" ? "default" : "secondary"}>
                      {admin.role === "super_admin" ? "Super Admin" : "Admin"}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3">
                    <Badge variant={admin.isActive ? "default" : "outline"}>
                      {admin.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3">{formatDate(admin.createdAt)}</td>
                  <td className="py-3 pr-3">{admin.lastLogin ? formatDate(admin.lastLogin) : "-"}</td>
                  <td className="py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditing(admin)} title="Edit admin">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <ConfirmDialog
                        title="Reset password?"
                        description={`Generate new password for ${admin.username}?`}
                        onConfirm={() => resetPasswordMutation.mutate(admin.id)}
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={resetPasswordMutation.isPending}
                            title="Reset password"
                          >
                            <KeyRound className="h-4 w-4 text-amber-600" />
                          </Button>
                        }
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => statusMutation.mutate({ id: admin.id, active: !admin.isActive })}
                        disabled={statusMutation.isPending || (admin.role === "super_admin" && admin.isActive && superAdminCount <= 1)}
                        title={admin.isActive ? "Deactivate admin" : "Reactivate admin"}
                      >
                        {admin.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </Button>
                      <ConfirmDialog
                        title="Delete admin?"
                        description={`Delete ${admin.username}? This action is final.`}
                        onConfirm={() => deleteMutation.mutate(admin.id)}
                        trigger={
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deleteMutation.isPending || (admin.role === "super_admin" && admin.isActive && superAdminCount <= 1)}
                            title="Delete admin"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageCard>

      <PageCard title="Admin Activity">
        <div className="space-y-3">
          {auditQuery.isLoading && <p className="text-sm text-slate-500">Loading activity...</p>}
          {!auditQuery.isLoading && (auditQuery.data ?? []).length === 0 && (
            <p className="text-sm text-slate-500">No admin activity recorded yet.</p>
          )}
          {(auditQuery.data ?? []).map((log) => (
            <div key={log.id} className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 text-sm last:border-0 last:pb-0">
              <div>
                <div className="font-medium text-slate-800">{humanizeAction(log.action)}</div>
                <div className="text-slate-500">
                  {log.actorUsername || "System"} {"->"} {log.targetUsername || log.entityId}
                </div>
              </div>
              <span className="text-xs text-slate-500">{formatDate(log.createdAt)}</span>
            </div>
          ))}
        </div>
      </PageCard>

      <CreateAdminDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(payload) => createMutation.mutate(payload)}
        loading={createMutation.isPending}
      />
      <EditAdminDialog
        admin={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSubmit={(payload) => editing && updateMutation.mutate({ id: editing.id, payload })}
        loading={updateMutation.isPending}
      />

      {/* Stylized Secure Dialog displaying credentials generated ONCE */}
      <Dialog open={!!showCreds} onOpenChange={(open) => !open && setShowCreds(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Credentials Generated Successfully</DialogTitle>
          </DialogHeader>
          <div className="bg-slate-50 border rounded p-4 space-y-3 font-mono text-sm">
            <div>
              <span className="font-semibold text-slate-500 block">Full Name:</span>
              <span className="text-slate-800 font-medium">{showCreds?.fullName}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500 block">Login ID (Username):</span>
              <span className="text-slate-800 font-bold select-all bg-slate-200 px-2 py-0.5 rounded border">{showCreds?.username}</span>
            </div>
            {showCreds?.email && (
              <div>
                <span className="font-semibold text-slate-500 block">Contact Email:</span>
                <span className="text-slate-800 select-all">{showCreds?.email}</span>
              </div>
            )}
            {showCreds?.generatedPassword && (
              <div>
                <span className="font-semibold text-slate-500 block">Temporary Password:</span>
                <span className="text-emerald-700 font-bold select-all bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {showCreds?.generatedPassword}
                </span>
                <p className="text-[10px] text-rose-500 mt-1 italic font-sans">
                  *This password will only be displayed ONCE. Please copy it now.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowCreds(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateAdminDialog({
  open,
  onOpenChange,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: AdminCreatePayload) => void;
  loading: boolean;
}) {
  const [role, setRole] = useState<"admin" | "super_admin" >("admin");
  const [form, setForm] = useState({
    username: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!open) {
      setForm({
        username: "",
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      setRole("admin");
    }
  }, [open]);

  const submit = () => {
    if (role === "super_admin") {
      if (!form.username.trim()) {
        toast.error("Username is required.");
        return;
      }
      if (!form.email.trim()) {
        toast.error("Email is required.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        toast.error("Passwords do not match.");
        return;
      }
      if (!isStrongPassword(form.password)) {
        toast.error("Weak password detected. Must include uppercase, lowercase, number, and special character.");
        return;
      }
    } else {
      if (!form.email.trim()) {
        toast.error("Email is required.");
        return;
      }
    }

    onSubmit({
      role,
      full_name: form.fullName.trim(),
      email: form.email.trim(),
      username: role === "super_admin" ? form.username.trim() : undefined,
      password: role === "super_admin" ? form.password : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Admin User</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Role</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="border border-slate-300 rounded p-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="admin">Admin (Auto-generated credentials)</option>
              <option value="super_admin">Super Admin (Manual credentials)</option>
            </select>
          </div>
          <Field label="Full Name" value={form.fullName} onChange={(fullName) => setForm((s) => ({ ...s, fullName }))} />
          <Field label="Email (Compulsory)" value={form.email} type="email" onChange={(email) => setForm((s) => ({ ...s, email }))} />
          {role === "super_admin" && (
            <>
              <Field label="Username (Login ID)" value={form.username} onChange={(username) => setForm((s) => ({ ...s, username }))} />
              <Field label="Password" value={form.password} type="password" onChange={(password) => setForm((s) => ({ ...s, password }))} />
              <Field label="Confirm Password" value={form.confirmPassword} type="password" onChange={(confirmPassword) => setForm((s) => ({ ...s, confirmPassword }))} />
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditAdminDialog({
  admin,
  onOpenChange,
  onSubmit,
  loading,
}: {
  admin: AdminUser | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { email: string; full_name: string }) => void;
  loading: boolean;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    setFullName(admin?.fullName || "");
    setEmail(admin?.email || "");
  }, [admin]);

  const close = (open: boolean) => {
    if (!open) {
      setFullName("");
      setEmail("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={!!admin} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Admin</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Full Name" value={fullName} onChange={setFullName} />
          <Field label="Email" value={email} type="email" onChange={setEmail} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>Cancel</Button>
          <Button onClick={() => onSubmit({ full_name: fullName.trim(), email: email.trim() })} disabled={loading}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input value={value} type={type} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function isStrongPassword(value: string) {
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function humanizeAction(action: string) {
  return action
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
