import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useRMS } from "@/lib/store";
import { User as UserIcon, XCircle, Shield, KeyRound, Copy, AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchResource, fetchResourceLogin, updateResourceStatus, resetResourcePassword, updateResourceProfile, approveResourceOnboarding } from "@/lib/api/resources";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export const Route = createFileRoute("/admin/resources/$id")({
  component: ResourceDetail,
});

function ResourceDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const resources = useRMS((s) => s.resources);
  const projects = useRMS((s) => s.projects);
  const updateResource = useRMS((s) => s.updateResource);

  const isUuid = id.includes("-");

  const resourceQuery = useQuery({
    queryKey: ["resource-detail", id],
    queryFn: () => fetchResource(id),
    enabled: isUuid,
  });

  const queryClient = useQueryClient();

  const updateProfileMutation = useMutation({
    mutationFn: (payload: any) => updateResourceProfile(id, payload),
    onSuccess: () => {
      toast.success("Resource profile updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["resource-detail", id] });
      router.navigate({ to: "/admin/resources" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update resource.");
    },
  });

  const dbResource = resourceQuery.data;
  const mockResource = resources.find((x) => x.id === id);
  const rawR = isUuid ? dbResource : mockResource;

  const r = useMemo(() => {
    if (!rawR) return undefined;
    return {
      id: rawR.id,
      fullName: rawR.fullName ?? rawR.full_name ?? "",
      email: rawR.email ?? "",
      employeeId: rawR.employeeId ?? rawR.employee_id ?? "",
      skillset: rawR.skillset ?? "",
      phone: rawR.phone ?? "",
      address: rawR.address ?? "",
      citizenOf: rawR.citizenOf ?? rawR.citizen_of ?? "",
      passportNumber: rawR.passportNumber ?? rawR.passport_number ?? "",
      passportExpiry: rawR.passportExpiry ?? rawR.passport_expiry ?? "",
      visaNumber: rawR.visaNumber ?? rawR.visa_number ?? "",
      visaExpiry: rawR.visaExpiry ?? rawR.visa_expiry ?? "",
      niNumber: rawR.niNumber ?? rawR.ni_number ?? "",
      dob: rawR.dob ?? "",
      bankAccount: rawR.bankAccount ?? rawR.bank_account ?? "",
      sortCode: rawR.sortCode ?? rawR.sort_code ?? "",
      bankName: rawR.bankName ?? rawR.bank_name ?? "",
      emergencyName: rawR.emergencyName ?? rawR.emergency_name ?? "",
      emergencyPhone: rawR.emergencyPhone ?? rawR.emergency_phone ?? "",
      emergencyEmail: rawR.emergencyEmail ?? rawR.emergency_email ?? "",
      emergencyAddress: rawR.emergencyAddress ?? rawR.emergency_address ?? "",
      status: rawR.status ?? "active",
      avatarUrl: rawR.avatarUrl ?? rawR.avatar_url ?? undefined,
      totalLeaves: rawR.totalLeaves ?? rawR.total_leaves ?? 20,
      weeklyAllowedHours: rawR.weeklyAllowedHours ?? rawR.weekly_allowed_hours ?? 40,
      oldAddressLog: rawR.oldAddressLog ?? rawR.old_address_log ?? "",
      performanceNotes: rawR.performanceNotes ?? rawR.performance_notes ?? "",
      assignedProjects: rawR.assignedProjects ?? rawR.assigned_projects ?? [],
    };
  }, [rawR]);

  const [showResetCreds, setShowResetCreds] = useState<any | null>(null);

  const loginQuery = useQuery({
    queryKey: ["resource-login", id],
    queryFn: () => fetchResourceLogin(id),
  });

  const statusMutation = useMutation({
    mutationFn: (active: boolean) => updateResourceStatus(id, { is_active: active }),
    onSuccess: () => {
      toast.success("Login account status updated.");
      queryClient.invalidateQueries({ queryKey: ["resource-login", id] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update status.");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => resetResourcePassword(id),
    onSuccess: (data) => {
      toast.success("Password reset successfully.");
      setShowResetCreds(data);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reset password.");
    },
  });

  // Form States
  const [skillset, setSkillset] = useState("");
  const [status, setStatus] = useState<"active" | "pending" | "resigned" | "terminated">("active");
  const [totalLeaves, setTotalLeaves] = useState("20");
  const [weeklyHours, setWeeklyHours] = useState("40");
  const [addressLog, setAddressLog] = useState("");
  const [performanceNotes, setPerformanceNotes] = useState("");
  const [assignedProjects, setAssignedProjects] = useState<string[]>([]);

  useEffect(() => {
    if (r) {
      setSkillset(r.skillset || "");
      setStatus(r.status || "active");
      setTotalLeaves(String(r.totalLeaves ?? "20"));
      setWeeklyHours(String(r.weeklyAllowedHours ?? "40"));
      setAddressLog(r.oldAddressLog || "");
      setPerformanceNotes(r.performanceNotes || "");
      setAssignedProjects(r.assignedProjects || []);
    }
  }, [r]);

  if (isUuid && resourceQuery.isLoading) {
    return (
      <div className="bg-white rounded-lg border border-slate-300 p-8 max-w-5xl shadow-sm flex items-center justify-center min-h-[300px]">
        <div className="text-center text-slate-500 font-medium">Loading resource details...</div>
      </div>
    );
  }

  if (!r) {
    return (
      <div className="bg-white rounded-lg border border-slate-300 p-8 max-w-4xl shadow-sm">
        <h2 className="text-red-500 font-medium">Resource not found.</h2>
        <button
          onClick={() => router.navigate({ to: "/admin/resources" })}
          className="text-teal-600 underline mt-2 inline-block focus:outline-none"
        >
          Back to Resources
        </button>
      </div>
    );
  }

  // Handle saving the edits
  const handleSave = () => {
    if (isUuid) {
      updateProfileMutation.mutate({
        skillset,
        status,
        weekly_allowed_hours: Number(weeklyHours) || 0,
        performance_notes: performanceNotes,
      });
    } else {
      updateResource(r.id, {
        skillset,
        status,
        totalLeaves: Number(totalLeaves) || 0,
        weeklyAllowedHours: Number(weeklyHours) || 0,
        oldAddressLog: addressLog,
        performanceNotes,
        assignedProjects,
      });
      router.navigate({ to: "/admin/resources" });
    }
  };

  // Assign a new project from dropdown selection
  const handleAssignProject = (projectName: string) => {
    if (projectName && projectName !== "None") {
      if (!assignedProjects.includes(projectName)) {
        setAssignedProjects([...assignedProjects, projectName]);
      }
    }
  };

  // Unassign project
  const handleUnassignProject = (projectName: string) => {
    setAssignedProjects(assignedProjects.filter((p) => p !== projectName));
  };

  // Utility to display values or "Not Entered"
  const valOrEmpty = (val?: string) => val?.trim() || "Not Entered";

  // Extract enriched onboarding data from backend (available when isUuid)
  const enrichedData = useMemo(() => {
    if (!isUuid || !dbResource) return null;
    return {
      completionPct: dbResource.profile_completion_percentage ?? 0,
      onboardingStatus: dbResource.onboarding_status ?? "pending",
      approvalStatus: dbResource.approval_status ?? "pending_approval",
      missingFields: dbResource.missing_fields ?? [],
      utilization: dbResource.current_utilization ?? 0,
      availableHours: dbResource.available_capacity_hours ?? 0,
    };
  }, [isUuid, dbResource]);

  const approveMutation = useMutation({
    mutationFn: () => approveResourceOnboarding(id),
    onSuccess: () => {
      toast.success("Resource onboarding approved!");
      queryClient.invalidateQueries({ queryKey: ["resource-detail", id] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to approve.");
    },
  });

  return (
    <div className="bg-white rounded-lg border border-slate-300 p-8 max-w-5xl shadow-sm">
      <h2 className="text-[28px] text-[#0d7a70] font-normal mb-4 border-b pb-4">Resource view</h2>

      {/* ── Onboarding & Utilization Card ── */}
      {enrichedData && (
        <div className="mb-6 grid sm:grid-cols-2 gap-4">
          {/* Onboarding Progress */}
          <div className="border border-slate-200 rounded-md p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-teal-600" />
                Onboarding Status
              </h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                enrichedData.onboardingStatus === "completed"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}>
                {enrichedData.onboardingStatus}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-200 rounded-full h-2.5 mb-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${enrichedData.completionPct}%`,
                  background: enrichedData.completionPct >= 80 ? "#16a34a" : enrichedData.completionPct >= 40 ? "#d97706" : "#dc2626",
                }}
              />
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Profile: <strong>{enrichedData.completionPct}%</strong> complete
            </p>
            {/* Missing fields */}
            {enrichedData.missingFields.length > 0 && (
              <div className="text-[11px] text-slate-600">
                <span className="font-semibold">Missing: </span>
                {enrichedData.missingFields.join(", ")}
              </div>
            )}
            {/* Approval section */}
            <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {enrichedData.approvalStatus === "approved" ? (
                  <><ShieldCheck className="w-4 h-4 text-green-600" /><span className="text-xs font-semibold text-green-700">Approved</span></>
                ) : (
                  <><AlertTriangle className="w-4 h-4 text-amber-500" /><span className="text-xs font-semibold text-amber-700">Pending Approval</span></>
                )}
              </div>
              {enrichedData.approvalStatus !== "approved" && enrichedData.onboardingStatus === "completed" && (
                <button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold px-3 py-1 rounded transition-colors disabled:opacity-50"
                >
                  {approveMutation.isPending ? "Approving…" : "Approve Onboarding"}
                </button>
              )}
            </div>
          </div>

          {/* Utilization Widget */}
          <div className="border border-slate-200 rounded-md p-4 bg-slate-50">
            <h4 className="text-sm font-bold text-slate-700 mb-2">Current Utilization</h4>
            <div className="flex items-end gap-3 mb-2">
              <span className={`text-3xl font-bold ${
                enrichedData.utilization >= 100 ? "text-red-600" : enrichedData.utilization >= 70 ? "text-amber-600" : "text-green-600"
              }`}>
                {enrichedData.utilization.toFixed(0)}%
              </span>
              <span className="text-xs text-slate-500 mb-1">utilized this week</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 mb-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(enrichedData.utilization, 100)}%`,
                  background: enrichedData.utilization >= 100 ? "#dc2626" : enrichedData.utilization >= 70 ? "#d97706" : "#16a34a",
                }}
              />
            </div>
            <p className="text-xs text-slate-500">
              Available capacity: <strong>{enrichedData.availableHours.toFixed(1)} hrs/week</strong>
            </p>
            {enrichedData.utilization >= 100 && (
              <div className="mt-2 flex items-center gap-1 text-[11px] text-red-600 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" /> Over-allocated — will not appear in AI recommendations
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-12 gap-8 items-start text-sm">
        {/* Left Column: Avatar, read-only stats & form fields */}
        <div className="md:col-span-8 space-y-6">
          {/* Avatar and name */}
          <div className="flex gap-4 items-start">
            <div className="w-24 h-28 border border-slate-300 bg-stone-100 flex items-center justify-center flex-shrink-0 text-stone-400 overflow-hidden">
              {r.avatarUrl ? (
                <img src={r.avatarUrl} alt={r.fullName} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-12 h-12 text-stone-500" />
              )}
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-800">{r.fullName}</h3>
              <p className="text-stone-500 font-semibold">CV Not Uploaded</p>
            </div>
          </div>

          {/* Key-Value Details */}
          <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 text-stone-600 border-b border-dashed pb-6">
            <div className="font-bold">Notes:</div>
            <div>{valOrEmpty(r.skillset ? "" : "Not Entered")}</div>

            <div className="font-bold">Account #:</div>
            <div>{valOrEmpty(r.bankAccount)}</div>

            <div className="font-bold">Sort Code:</div>
            <div>{valOrEmpty(r.sortCode)}</div>

            <div className="font-bold">Bank:</div>
            <div>{valOrEmpty(r.bankName)}</div>

            <div className="font-bold">Date of Birth:</div>
            <div>{valOrEmpty(r.dob)}</div>

            <div className="font-bold">Passport Number:</div>
            <div>{valOrEmpty(r.passportNumber)}</div>

            <div className="font-bold">Visa Number:</div>
            <div>{valOrEmpty(r.visaNumber)}</div>

            <div className="font-bold">NI Number:</div>
            <div>{valOrEmpty(r.niNumber)}</div>

            <div className="font-bold">Nationality:</div>
            <div>{valOrEmpty(r.citizenOf)}</div>

            <div className="font-bold">Contact Phone:</div>
            <div>{valOrEmpty(r.phone)}</div>

            <div className="font-bold">Contact Address:</div>
            <div>{valOrEmpty(r.address)}</div>

            <div className="font-bold">Email Address:</div>
            <div className="text-sky-700 underline break-all">{r.email}</div>

            {/* Emergency Details */}
            <div className="col-span-2 font-bold text-slate-800 pt-3 text-base">
              Emergency Contact Details:
            </div>

            <div className="font-bold pl-2">Name:</div>
            <div>{valOrEmpty(r.emergencyName)}</div>

            <div className="font-bold pl-2">Phone:</div>
            <div>{valOrEmpty(r.emergencyPhone)}</div>

            <div className="font-bold pl-2">Mail Address:</div>
            <div>{valOrEmpty(r.emergencyEmail)}</div>

            <div className="font-bold pl-2">Address:</div>
            <div>{valOrEmpty(r.emergencyAddress)}</div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4 max-w-xl">
            {/* Skillset */}
            <div className="grid grid-cols-[160px_1fr] gap-4 items-center">
              <span className="text-stone-700 font-semibold">Skillset:</span>
              <input
                type="text"
                value={skillset}
                onChange={(e) => setSkillset(e.target.value)}
                className="border border-black rounded px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Status */}
            <div className="grid grid-cols-[160px_1fr] gap-4 items-center">
              <span className="text-stone-700 font-semibold">Status:</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="border border-black rounded px-3 py-1.5 text-sm w-full bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="resigned">Resigned</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>

            {/* Assign a project */}
            <div className="grid grid-cols-[160px_1fr] gap-4 items-center">
              <span className="text-stone-700 font-semibold">Assign a project:</span>
              <select
                value="None"
                onChange={(e) => handleAssignProject(e.target.value)}
                className="border border-black rounded px-3 py-1.5 text-sm w-full bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="None">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Total Leaves */}
            <div className="grid grid-cols-[160px_1fr] gap-4 items-center">
              <span className="text-stone-700 font-semibold">Total Leaves:</span>
              <input
                type="text"
                value={totalLeaves}
                onChange={(e) => setTotalLeaves(e.target.value)}
                className="border border-black rounded px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Weekly Allowed Hours */}
            <div className="grid grid-cols-[160px_1fr] gap-4 items-center">
              <span className="text-stone-700 font-semibold">Weekly Allowed Hours:</span>
              <input
                type="text"
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(e.target.value)}
                className="border border-black rounded px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Old Address Log */}
            <div className="grid grid-cols-[160px_1fr] gap-4 items-start">
              <span className="text-stone-700 font-semibold pt-1.5">Old Address Log</span>
              <textarea
                rows={3}
                value={addressLog}
                onChange={(e) => setAddressLog(e.target.value)}
                className="border border-black rounded px-3 py-1.5 text-sm w-full h-24 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Performance Review Notes */}
            <div className="grid grid-cols-[160px_1fr] gap-4 items-start">
              <span className="text-stone-700 font-semibold pt-1.5">Performance Review Notes:</span>
              <textarea
                rows={3}
                value={performanceNotes}
                onChange={(e) => setPerformanceNotes(e.target.value)}
                className="border border-black rounded px-3 py-1.5 text-sm w-full h-24 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Save / Cancel buttons */}
            <div className="grid grid-cols-[160px_1fr] gap-4 items-center">
              <div></div>
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={handleSave}
                  className="bg-[#0d7a70] text-white hover:bg-[#0b665d] px-4 py-2 font-semibold text-sm rounded shadow-sm transition-colors focus:outline-none"
                >
                  Save
                </button>
                <button
                  onClick={() => router.navigate({ to: "/admin/resources" })}
                  className="bg-[#0d7a70] text-white hover:bg-[#0b665d] px-4 py-2 font-semibold text-sm rounded shadow-sm transition-colors focus:outline-none"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Credentials, redirects, assigned projects, and documents */}
        <div className="md:col-span-4 space-y-6">
          {/* Credentials Management Block */}
          <div className="border border-slate-200 bg-slate-50 p-4 rounded-lg space-y-3.5 text-slate-700 text-left">
            <div className="flex items-center gap-2 border-b pb-2">
              <Shield className="w-5 h-5 text-[#0d7a70]" />
              <h4 className="font-bold text-stone-700 text-sm uppercase tracking-wide">Login Credentials</h4>
            </div>

            {loginQuery.isLoading ? (
              <div className="text-xs text-slate-500">Loading credentials info...</div>
            ) : !loginQuery.data || !loginQuery.data.has_account ? (
              <div className="text-xs text-rose-500 italic">No linked User account found for this resource.</div>
            ) : (
              <>
                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="font-bold text-slate-500 block uppercase tracking-wider text-[9px]">Login ID (Username)</span>
                    <span className="font-mono text-slate-800 text-[12px] font-semibold select-all bg-slate-200 px-2 py-0.5 rounded border border-slate-300 inline-block mt-0.5">
                      {loginQuery.data.username}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block uppercase tracking-wider text-[9px]">Email Address</span>
                    <span className="text-slate-800 font-semibold select-all break-all">{loginQuery.data.email}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block uppercase tracking-wider text-[9px]">Account Role</span>
                    <span className="text-slate-800 font-semibold capitalize">{loginQuery.data.role}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block uppercase tracking-wider text-[9px]">Last Login</span>
                    <span className="text-slate-800 font-semibold">
                      {loginQuery.data.last_login ? new Date(loginQuery.data.last_login).toLocaleString() : "-"}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider text-[9px]">Login Status</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={loginQuery.data.is_active}
                        onChange={(e) => statusMutation.mutate(e.target.checked)}
                        className="sr-only peer"
                        disabled={statusMutation.isPending}
                      />
                      <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#0d7a70]"></div>
                      <span className="ml-2 text-xs font-semibold text-slate-700">
                        {loginQuery.data.is_active ? "Active" : "Inactive"}
                      </span>
                    </label>
                  </div>

                  <ConfirmDialog
                    title="Reset Password?"
                    description={`Are you sure you want to generate a new password for ${loginQuery.data.username}?`}
                    onConfirm={() => resetPasswordMutation.mutate()}
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs gap-1.5 border-[#0d7a70] text-[#0d7a70] hover:bg-[#0d7a70]/5"
                        disabled={resetPasswordMutation.isPending}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        Reset Password
                      </Button>
                    }
                  />
                </div>
              </>
            )}
          </div>

          {/* Quick redirect links */}
          <div className="flex flex-col gap-2 pt-2">
            <Link
              to="/admin/timesheets"
              className="text-[#0d7a70] hover:underline font-semibold text-base block text-left"
            >
              Timesheet Management
            </Link>
            <Link
              to="/admin/leaves"
              className="text-[#0d7a70] hover:underline font-semibold text-base block text-left"
            >
              Leave management
            </Link>
          </div>

          {/* Project Assigned container */}
          <div className="space-y-2">
            <h4 className="font-bold text-stone-700">project assigned</h4>
            <div className="border border-slate-400 bg-white p-4 min-h-[160px] w-full rounded shadow-inner space-y-2">
              {assignedProjects.length > 0 ? (
                assignedProjects.map((pName) => (
                  <div
                    key={pName}
                    className="flex justify-between items-center bg-stone-50 border border-stone-200 rounded px-2.5 py-1 text-stone-800"
                  >
                    <span className="font-medium text-xs truncate max-w-[180px]">{pName}</span>
                    <button
                      onClick={() => handleUnassignProject(pName)}
                      className="text-rose-600 hover:text-rose-800 transition-colors focus:outline-none"
                      title="Unassign Project"
                    >
                      <XCircle className="w-4 h-4 fill-current text-white stroke-rose-600" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-xs text-stone-400 italic">No project assigned</div>
              )}
            </div>
          </div>

          {/* Documents status */}
          <div className="space-y-4 pt-4 border-t border-slate-100 text-left">
            <div>
              <div className="font-bold text-stone-800">Passport Copy:</div>
              <div className="text-xs text-stone-500 mt-0.5">Not Uploaded</div>
            </div>
            <div>
              <div className="font-bold text-stone-800">Visa Copy:</div>
              <div className="text-xs text-stone-500 mt-0.5">Not Uploaded</div>
            </div>
            <div>
              <div className="font-bold text-stone-800">Holdiay Sheet:</div>
              <div className="text-xs text-stone-500 mt-0.5">Not Uploaded</div>
            </div>
            <div>
              <div className="font-bold text-stone-800">Other Documents:</div>
              <div className="text-xs text-stone-500 mt-0.5">Not uploaded</div>
            </div>
          </div>
        </div>
      </div>

      {/* Password reset success dialog */}
      <Dialog open={!!showResetCreds} onOpenChange={(open) => !open && setShowResetCreds(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0d7a70]">Password Reset Successfully</DialogTitle>
          </DialogHeader>
          <div className="bg-slate-50 border rounded-lg p-5 space-y-4 font-mono text-sm text-left">
            <div>
              <span className="font-bold text-slate-500 text-xs block uppercase tracking-wider mb-0.5">Username:</span>
              <span className="text-slate-800 font-bold select-all bg-slate-200 px-2 py-0.5 rounded border inline-block">{loginQuery.data?.username}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 text-xs block uppercase tracking-wider mb-0.5">New Temporary Password:</span>
              <span className="text-emerald-800 font-bold select-all bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-300 block w-fit">
                {showResetCreds?.password}
              </span>
              <p className="text-[11px] text-rose-600 mt-2 italic font-sans font-medium">
                * This password will only be displayed ONCE. Please copy it immediately.
              </p>
            </div>
          </div>
          <DialogFooter className="flex sm:justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => {
                const text = `Username: ${loginQuery.data?.username}\nNew Password: ${showResetCreds?.password}`;
                navigator.clipboard.writeText(text);
                toast.success("Credentials copied to clipboard.");
              }}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy Credentials
            </Button>
            <Button onClick={() => setShowResetCreds(null)} className="bg-[#0d7a70] hover:bg-[#0b665d]">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
