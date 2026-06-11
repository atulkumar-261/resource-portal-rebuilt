import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useRMS } from "@/lib/store";
import { Search, User } from "lucide-react";
import { isResourceAssignable } from "@/lib/types";

export const Route = createFileRoute("/admin/timesheets/")({
  component: AdminTimesheetsIndex,
});

function AdminTimesheetsIndex() {
  const timesheets = useRMS((s) => s.timesheets);
  const resources = useRMS((s) => s.resources);

  // State for timesheet filtering
  const [selectedResource, setSelectedResource] = useState<string>("ALL");

  // State for sidebar search
  const [searchQuery, setSearchQuery] = useState("");

  // Filter timesheets
  const filteredTimesheets = timesheets.filter((ts) => {
    if (selectedResource === "ALL") return true;
    return ts.resourceName === selectedResource;
  });

  // Sidebar active resources filter
  const activeResources = resources.filter(isResourceAssignable);
  const filteredActive = activeResources.filter(
    (r) =>
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="grid lg:grid-cols-12 gap-8">
      {/* Left Column: Current Timesheets */}
      <div className="lg:col-span-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-teal-800 mb-6">Current Timesheets</h2>

          {/* Select Resource Dropdown */}
          <div className="flex items-center justify-end gap-3 mb-6">
            <span className="text-sm font-semibold text-slate-700">Select Resource:</span>
            <select
              value={selectedResource}
              onChange={(e) => setSelectedResource(e.target.value)}
              className="border border-slate-300 rounded px-3 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 min-w-[150px]"
            >
              <option value="ALL">ALL</option>
              {activeResources.map((r) => (
                <option key={r.id} value={r.fullName}>
                  {r.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Timesheets Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-[#7a7672] text-white font-medium">
                  <th className="px-4 py-3 border-r border-slate-300/30">Week#</th>
                  <th className="px-4 py-3 border-r border-slate-300/30">WE Date</th>
                  <th className="px-4 py-3 border-r border-slate-300/30">Resource</th>
                  <th className="px-4 py-3 border-r border-slate-300/30">Status</th>
                  <th className="px-4 py-3 border-r border-slate-300/30">Total Hours</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTimesheets.map((ts) => (
                  <tr key={ts.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 border-r border-slate-200 font-medium text-slate-800">
                      {ts.weekNumber}
                    </td>
                    <td className="px-4 py-3.5 border-r border-slate-200 text-slate-700">
                      {ts.weekEndDate}
                    </td>
                    <td className="px-4 py-3.5 border-r border-slate-200 font-semibold text-slate-800">
                      {ts.resourceName}
                    </td>
                    <td className="px-4 py-3.5 border-r border-slate-200">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                          ts.status === "approved"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : ts.status === "rejected"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {ts.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 border-r border-slate-200 font-medium text-slate-800">
                      {ts.totalHours}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        to="/admin/timesheets/$id"
                        params={{ id: ts.id }}
                        className="text-teal-600 hover:text-teal-800 hover:underline font-semibold"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {filteredTimesheets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500 font-medium">
                      No timesheets found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="bg-[#7a7672] text-white px-4 py-2.5 rounded-b-lg flex justify-between items-center text-xs mt-0.5">
            <div>
              1 to {filteredTimesheets.length} of {filteredTimesheets.length}
            </div>
            <div className="flex gap-4">
              <button disabled className="opacity-50 hover:underline font-semibold">
                Next &gt;
              </button>
              <button disabled className="opacity-50 hover:underline font-semibold">
                Last &gt;&gt;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Column: Active Resources */}
      <div className="lg:col-span-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[600px]">
          <h2 className="text-lg font-bold text-teal-800 mb-4 tracking-wide">ACTIVE RESOURCES</h2>

          {/* Search Box */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-16 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-shadow"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <button className="absolute right-1 top-1 bottom-1 bg-stone-700 hover:bg-stone-800 text-white px-3 py-1 rounded text-xs font-semibold transition-colors">
              Search
            </button>
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
                      <img
                        src={r.avatarUrl}
                        alt={r.fullName}
                        className="w-full h-full object-cover"
                      />
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
