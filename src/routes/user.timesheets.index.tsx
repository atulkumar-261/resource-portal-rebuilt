import { createFileRoute, Link } from "@tanstack/react-router";
import { useRMS, useAuth } from "@/lib/store";
import { useState } from "react";

export const Route = createFileRoute("/user/timesheets/")({
  component: UsertimesheetsPage,
});

function UsertimesheetsPage() {
  const resourceId = useAuth((s) => s.resourceId) ?? "177";
  const allTimesheets = useRMS((s) => s.timesheets);
  const resources = useRMS((s) => s.resources);

  // Filter timesheets for the current logged-in resource
  const ts = allTimesheets.filter(
    (t) => t.resourceId === resourceId || t.resourceId === "177",
  );

  // Fetch the current resource profile
  const resource = resources.find((r) => r.id === resourceId) ?? resources[0];

  // View state toggle
  const [isArchived, setIsArchived] = useState(false);

  // Render Table Component
  const renderTable = () => (
    <div className="border border-slate-200 rounded overflow-hidden">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-[#7a7672] text-white font-medium text-left">
            <th className="px-4 py-2 border-r border-slate-300/30">Week Number</th>
            <th className="px-4 py-2 border-r border-slate-300/30">Week end Date</th>
            <th className="px-4 py-2 border-r border-slate-300/30">Resource</th>
            <th className="px-4 py-2 border-r border-slate-300/30">Status</th>
            <th className="px-4 py-2 border-r border-slate-300/30">Total Hours</th>
            <th className="px-4 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {ts.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                No timesheets applied
              </td>
            </tr>
          )}
          {ts.map((t, index) => (
            <tr
              key={t.id}
              className="border-t border-slate-100 hover:bg-slate-50 transition-colors text-left"
            >
              <td className="px-4 py-2.5 border-r border-slate-200">{t.weekNumber}</td>
              <td className="px-4 py-2.5 border-r border-slate-200">{t.weekEndDate}</td>
              <td className="px-4 py-2.5 border-r border-slate-200">{t.resourceName}</td>
              <td className="px-4 py-2.5 border-r border-slate-200 capitalize">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                    t.status === "approved"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : t.status === "rejected"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {t.status}
                </span>
              </td>
              <td className="px-4 py-2.5 border-r border-slate-200 font-semibold">{t.totalHours}</td>
              <td className="px-4 py-2.5">
                <Link
                  to="/user/timesheets"
                  className="text-teal-600 hover:text-teal-800 hover:underline font-bold text-xs"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Pagination Footer */}
      <div className="bg-[#7a7672] text-white px-4 py-2.5 flex justify-between items-center text-xs">
        <div>
          1 to {ts.length} of {ts.length}
        </div>
        <div className="flex gap-4">
          <button
            disabled
            className="opacity-50 hover:underline font-semibold uppercase cursor-pointer"
          >
            Next &gt;
          </button>
          <button
            disabled
            className="opacity-50 hover:underline font-semibold uppercase cursor-pointer"
          >
            Last &gt;&gt;
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header outside table */}
      <h1 className="text-[26px] font-normal text-[#0e7770] mb-6">Current Timesheets</h1>

      {!isArchived ? (
        // Split layout showing Table + My Profile Sidebar
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Timesheet List column */}
          <div className="lg:col-span-8 space-y-4">
            {/* Add Time sheet Button aligned right */}
            <div className="flex justify-end">
              <Link
                to="/user/timesheets/new"
                className="bg-[#5c5c5c] hover:bg-[#4d4d4d] text-white border border-black px-4 py-1.5 text-xs font-bold shadow-sm rounded-none uppercase transition-colors"
              >
                Add Time sheet
              </Link>
            </div>

            {/* Table */}
            {renderTable()}

            {/* Archive Button aligned left below table */}
            <div className="flex justify-start">
              <button
                onClick={() => setIsArchived(true)}
                className="bg-[#5c5c5c] hover:bg-[#4d4d4d] text-white border border-black px-4 py-1.5 text-xs font-bold shadow-sm rounded-none uppercase transition-colors cursor-pointer"
              >
                Archive
              </button>
            </div>
          </div>

          {/* Profile Sidebar column */}
          <div className="lg:col-span-4 bg-[#636363] text-white p-6 shadow-md rounded-none h-fit">
            <h3 className="text-[17px] font-bold text-[#0d7a70] border-b border-slate-500 pb-2 mb-4 uppercase tracking-wide">
              My Profile
            </h3>
            <div className="flex gap-4 items-start">
              {/* Profile Avatar */}
              <div className="w-20 h-24 border border-black bg-stone-200 shrink-0 overflow-hidden relative">
                {resource?.avatarUrl ? (
                  <img
                    src={resource.avatarUrl}
                    alt={resource.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-500 font-bold text-lg bg-stone-300">
                    {resource?.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                )}
              </div>
              {/* Profile details */}
              <div className="text-[11px] leading-relaxed space-y-1 text-slate-100 flex-1 min-w-0">
                <h4 className="text-[13px] font-bold text-white leading-normal truncate">
                  {resource?.fullName}
                </h4>
                <div className="font-semibold text-slate-300 truncate">{resource?.jobTitle}</div>
                <p className="text-slate-200 line-clamp-6 text-[10px] pt-1">
                  {resource?.skillset || "No skillset details provided."}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Full width Archived view
        <div className="max-w-4xl space-y-4">
          {/* Back button & Select Year inline */}
          <div className="flex items-center justify-between text-xs">
            <button
              onClick={() => setIsArchived(false)}
              className="bg-[#5c5c5c] hover:bg-[#4d4d4d] text-white border border-black px-3.5 py-1 text-[11px] font-bold shadow-sm rounded-none uppercase transition-colors h-7 cursor-pointer"
            >
              &lt; Back
            </button>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Select Year:</span>
              <select className="border border-slate-400 rounded-none px-2 py-1 text-xs bg-white w-48 focus:outline-none h-7">
                <option value="">Select Year</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {renderTable()}
        </div>
      )}
    </div>
  );
}
