import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useRMS } from "@/lib/store";
import { isResourceAssignable } from "@/lib/types";
import { Search, MapPin, FileWarning, Plane, ShieldAlert, User, Shield, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchResources, approveResourceOnboarding, fetchResourceWorkload, type ResourceResponse, fetchAddressChanges } from "@/lib/api/resources";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

function AdminDashboard() {
  const resources = useRMS((s) => s.resources);
  const [searchQuery, setSearchQuery] = useState("");

  // Helper to parse DD-MM-YYYY dates
  const parseDate = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split("-");
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  };

  // Helper to calculate days remaining from a fixed reference date (June 5, 2026)
  const calculateDays = (dateStr: string) => {
    const exp = parseDate(dateStr);
    if (!exp) return 0;
    const ref = new Date("2026-06-05");
    const diffTime = exp.getTime() - ref.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // 1. Visa Expiry Alerts (filtered to resources with visaExpiry & sorted by days remaining)
  const visaAlerts = resources
    .filter((r) => r.visaExpiry)
    .map((r) => ({
      ...r,
      daysLeft: calculateDays(r.visaExpiry),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // 2. Passport Expiry Alerts (filtered to resources with passportExpiry & sorted)
  const passportAlerts = resources
    .filter((r) => r.passportExpiry)
    .map((r) => ({
      ...r,
      daysLeft: calculateDays(r.passportExpiry),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // 3. Address Change Log (Fetched from backend database audit logs)
  const addressChangesQuery = useQuery({
    queryKey: ["address-changes"],
    queryFn: fetchAddressChanges,
  });

  const addressChanges = (addressChangesQuery.data || [])
    .slice(0, 5)
    .map((log) => ({
      resourceId: log.resource_id,
      resourceName: log.resource_name,
      currentAddress: log.current_address,
      oldAddress: log.old_address,
    }));

  // 4. Sidebar: Active Resources (searchable)
  const activeResources = resources.filter(isResourceAssignable);

  const filteredActive = activeResources.filter((r) => {
    const query = searchQuery.toLowerCase();
    return (
      r.fullName.toLowerCase().includes(query) ||
      r.jobTitle.toLowerCase().includes(query) ||
      r.skillset.toLowerCase().includes(query)
    );
  });

  // Backend resources for onboarding widgets
  const queryClient = useQueryClient();
  const backendResources = useQuery({
    queryKey: ["resources-dashboard"],
    queryFn: fetchResources,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveResourceOnboarding(id),
    onSuccess: () => {
      toast.success("Resource approved!");
      queryClient.invalidateQueries({ queryKey: ["resources-dashboard"] });
    },
    onError: (error: any) => toast.error(error.message || "Failed to approve."),
  });

  const dbResources = backendResources.data ?? [];
  const pendingOnboarding = dbResources.filter(
    (r: ResourceResponse) => (r.onboarding_status === "pending" || !r.onboarding_status) && (r.profile_completion_percentage ?? 0) < 80
  );
  const pendingApproval = dbResources.filter(
    (r: ResourceResponse) => r.onboarding_status === "completed" && r.approval_status !== "approved"
  );

  // Workload Data (Current Week)
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 4); // Friday

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const workloadQuery = useQuery({
    queryKey: ["resources-workload", formatDate(startOfWeek)],
    queryFn: () => fetchResourceWorkload(formatDate(startOfWeek), formatDate(endOfWeek)),
  });

  const overutilized = (workloadQuery.data ?? [])
    .filter((w) => w.utilization_percentage > 90 || w.is_overloaded)
    .sort((a, b) => b.utilization_percentage - a.utilization_percentage);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 max-w-7xl mx-auto">
      {/* Main Column */}
      <div className="lg:col-span-8 space-y-8 min-w-0">

        {/* ── Onboarding & Utilization Widgets Row ── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Pending Onboarding Widget */}
          {pendingOnboarding.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden">
                <div className="bg-amber-50 px-5 py-3 border-b border-amber-200 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Pending Onboarding
                  </h3>
                  <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {pendingOnboarding.length}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 max-h-[240px] overflow-y-auto">
                  {pendingOnboarding.slice(0, 8).map((r: ResourceResponse) => (
                    <Link
                      key={r.id}
                      to="/admin/resources/$id"
                      params={{ id: r.id }}
                      className="flex items-center justify-between px-5 py-2.5 hover:bg-amber-50/60 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-800 truncate">{r.full_name}</div>
                        <div className="text-[11px] text-slate-500">{r.employee_id}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${r.profile_completion_percentage ?? 0}%`,
                              background: (r.profile_completion_percentage ?? 0) >= 40 ? "#d97706" : "#dc2626",
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-amber-700 w-8 text-right">
                          {r.profile_completion_percentage ?? 0}%
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Pending Approval Widget */}
            {pendingApproval.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm border border-teal-200 overflow-hidden">
                <div className="bg-teal-50 px-5 py-3 border-b border-teal-200 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-teal-800 flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    Ready for Approval
                  </h3>
                  <span className="bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {pendingApproval.length}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 max-h-[240px] overflow-y-auto">
                  {pendingApproval.slice(0, 8).map((r: ResourceResponse) => (
                    <div key={r.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-teal-50/60 transition-colors">
                      <Link
                        to="/admin/resources/$id"
                        params={{ id: r.id }}
                        className="min-w-0 flex-1"
                      >
                        <div className="text-sm font-semibold text-slate-800 truncate">{r.full_name}</div>
                        <div className="text-[11px] text-green-600 font-medium">
                          ✓ {r.profile_completion_percentage ?? 0}% complete
                        </div>
                      </Link>
                      <button
                        onClick={() => approveMutation.mutate(r.id)}
                        disabled={approveMutation.isPending}
                        className="bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold px-2.5 py-1 rounded transition-colors disabled:opacity-50 flex-shrink-0 ml-2"
                      >
                        Approve
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Overutilized Widget */}
            {overutilized.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm border border-rose-200 overflow-hidden">
                <div className="bg-rose-50 px-5 py-3 border-b border-rose-200 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-rose-800 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    Overutilized
                  </h3>
                  <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {overutilized.length}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 max-h-[240px] overflow-y-auto">
                  {overutilized.slice(0, 8).map((w) => (
                    <Link
                      key={w.resource_id}
                      to="/admin/resources/$id"
                      params={{ id: w.resource_id }}
                      className="flex items-center justify-between px-5 py-2.5 hover:bg-rose-50/60 transition-colors block"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-800 truncate">{w.resource_name}</div>
                        <div className="text-[11px] text-slate-500">
                          {w.planned_hours} / {w.total_capacity_hours} hrs
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                        {w.utilization_percentage.toFixed(0)}%
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

        {/* Visa Expiry Alerts */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-teal-700/5 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Plane className="w-5 h-5 text-teal-700" />
            <h2 className="text-lg font-bold text-teal-800">Visa Expiry Alerts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-600 text-stone-100 uppercase tracking-wider text-xs">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Resource Name</th>
                  <th className="text-left px-6 py-3 font-semibold">Visa Ex. Date</th>
                  <th className="text-left px-6 py-3 font-semibold">Visa Number</th>
                  <th className="text-left px-6 py-3 font-semibold">Days to Expire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-stone-50/50">
                {visaAlerts.slice(0, 5).map((r) => (
                  <tr key={r.id} className="hover:bg-teal-50/30 transition-colors">
                    <td className="px-6 py-3.5">
                      <Link
                        to="/admin/resources/$id"
                        params={{ id: r.id }}
                        className="font-bold text-teal-700 hover:text-teal-900 hover:underline"
                      >
                        {r.fullName}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 text-slate-700 font-medium">{r.visaExpiry}</td>
                    <td className="px-6 py-3.5 text-slate-600 font-mono">{r.visaNumber || "N/A"}</td>
                    <td className="px-6 py-3.5 font-bold">
                      <span className={r.daysLeft < 365 ? "text-rose-600" : "text-slate-800"}>
                        {r.daysLeft}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Passport Expiry Alerts */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-teal-700/5 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <FileWarning className="w-5 h-5 text-teal-700" />
            <h2 className="text-lg font-bold text-teal-800">Passport Expiry Alerts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-600 text-stone-100 uppercase tracking-wider text-xs">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Resource Name</th>
                  <th className="text-left px-6 py-3 font-semibold">Passport Ex. Date</th>
                  <th className="text-left px-6 py-3 font-semibold">Passport Number</th>
                  <th className="text-left px-6 py-3 font-semibold">Days to Expire</th>
                  <th className="text-left px-6 py-3 font-semibold">Citizen Ship</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-stone-50/50">
                {passportAlerts.slice(0, 5).map((r) => (
                  <tr key={r.id} className="hover:bg-teal-50/30 transition-colors">
                    <td className="px-6 py-3.5">
                      <Link
                        to="/admin/resources/$id"
                        params={{ id: r.id }}
                        className="font-bold text-teal-700 hover:text-teal-900 hover:underline"
                      >
                        {r.fullName}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 text-slate-700 font-medium">{r.passportExpiry}</td>
                    <td className="px-6 py-3.5 text-slate-600 font-mono">{r.passportNumber}</td>
                    <td className="px-6 py-3.5 font-bold">
                      <span className={r.daysLeft < 365 ? "text-rose-600" : "text-slate-800"}>
                        {r.daysLeft}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-700 font-medium">{r.citizenOf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Address Change Log */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-teal-700/5 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-700" />
            <h2 className="text-lg font-bold text-teal-800">Address Change Log</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-600 text-stone-100 uppercase tracking-wider text-xs">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Resource Name</th>
                  <th className="text-left px-6 py-3 font-semibold">Current Address</th>
                  <th className="text-left px-6 py-3 font-semibold">Old Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-stone-50/50">
                {addressChanges.map((log) => (
                  <tr key={log.resourceId} className="hover:bg-teal-50/30 transition-colors">
                    <td className="px-6 py-3.5">
                      <Link
                        to="/admin/resources/$id"
                        params={{ id: log.resourceId }}
                        className="font-bold text-teal-700 hover:text-teal-900 hover:underline"
                      >
                        {log.resourceName}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 text-slate-700 font-medium max-w-xs truncate">
                      {log.currentAddress}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 max-w-xs truncate">
                      {log.oldAddress || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Sidebar Column */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[600px]">
          <h2 className="text-lg font-bold text-teal-800 mb-4 tracking-wide">Active Resources</h2>

          {/* Search Box */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search active resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-shadow"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>

          {/* Resources List (scrollable) */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {filteredActive.length > 0 ? (
              filteredActive.map((r) => (
                <Link
                  key={r.id}
                  to="/admin/resources/$id"
                  params={{ id: r.id }}
                  className="flex gap-4 p-3 bg-stone-50 hover:bg-teal-50/40 rounded-lg border border-slate-100 hover:border-teal-100 transition-all group block text-left"
                >
                  {/* Avatar Circle */}
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 font-bold text-sm flex-shrink-0 overflow-hidden group-hover:bg-teal-200 transition-colors">
                    {r.avatarUrl ? (
                      <img src={r.avatarUrl} alt={r.fullName} className="w-full h-full object-cover" />
                    ) : (
                      r.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() || <User className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-slate-900 group-hover:text-teal-700 transition-colors truncate">
                      {r.fullName}
                    </div>
                    <div className="text-xs text-slate-700 font-semibold truncate mb-0.5">
                      {r.jobTitle}
                    </div>
                    <div className="text-xs text-slate-600 truncate">{r.skillset}</div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500 font-medium text-sm">
                No active resources found
              </div>
            )}
          </div>

          {/* View All footer link */}
          <div className="pt-4 border-t border-slate-100 mt-4 text-right">
            <Link
              to="/admin/resources"
              className="text-sm font-semibold text-teal-600 hover:text-teal-800 hover:underline inline-flex items-center gap-1"
            >
              View all &gt;&gt;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
