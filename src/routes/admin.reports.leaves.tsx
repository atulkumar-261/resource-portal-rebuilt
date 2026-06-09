import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useRMS } from "@/lib/store";
import { PageCard } from "@/components/layout/AppShell";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin/reports/leaves")({
  component: LeaveRecordsPage,
});

function LeaveRecordsPage() {
  const leaves = useRMS((s) => s.leaves);
  const resources = useRMS((s) => s.resources);

  // Filter states
  const [selectedResource, setSelectedResource] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  // Filtering logic
  const filtered = leaves.filter((l) => {
    const matchResource = selectedResource === "All" || l.resourceName === selectedResource;
    const matchType = selectedType === "All" || l.type === selectedType;
    const matchStatus =
      selectedStatus === "All" || l.status.toLowerCase() === selectedStatus.toLowerCase();
    return matchResource && matchType && matchStatus;
  });

  // Export filtered data as CSV
  const handleExportExcel = () => {
    const headers = [
      "ID",
      "Resource Name",
      "From Date",
      "To Date",
      "Total Days",
      "Type",
      "Reason",
      "Status",
    ];
    const rows = filtered.map((l) => [
      l.id,
      l.resourceName,
      l.fromDate,
      l.toDate,
      String(l.totalDays),
      l.type,
      l.reason,
      l.status,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "leave_records.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PageCard
      title="Leave Records"
      actions={
        <Link
          to="/admin/reports"
          className="text-sm font-semibold text-teal-600 hover:text-teal-800 hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Reports
        </Link>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Filters Panel */}
        <div className="flex flex-wrap items-center gap-6 text-sm text-slate-700">
          <div className="flex items-center gap-2">
            <span>Select Resource</span>
            <select
              value={selectedResource}
              onChange={(e) => setSelectedResource(e.target.value)}
              className="border border-black px-2 py-1 bg-white font-medium focus:outline-none min-w-[150px]"
            >
              <option value="All">All Resources</option>
              {resources.map((r) => (
                <option key={r.id} value={r.fullName}>
                  {r.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span>Select Leave Type</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="border border-black px-2 py-1 bg-white font-medium focus:outline-none min-w-[130px]"
            >
              <option value="All">All Types</option>
              <option value="Annual">Annual</option>
              <option value="Sick">Sick</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Casual">Casual</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span>Select Status</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-black px-2 py-1 bg-white font-medium focus:outline-none min-w-[120px]"
            >
              <option value="All">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Microsoft Excel Icon Button */}
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center hover:opacity-85 transition-opacity focus:outline-none ml-2"
            title="Export to Excel"
          >
            <svg
              className="w-6 h-6 text-[#107c41] fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M16.2 2H7.8C6.8 2 6 2.8 6 3.8v16.4c0 1 .8 1.8 1.8 1.8h8.4c1 0 1.8-.8 1.8-1.8V3.8c0-1-.8-1.8-1.8-1.8zm-5.4 15.6H9.3v-1.5h1.5v1.5zm0-3h-1.5v-1.5h1.5v1.5zm0-3H9.3V10.1h1.5v1.5zm3.6 6h-1.5v-1.5h1.5v1.5zm0-3h-1.5v-1.5h1.5v1.5zm0-3h-1.5V10.1h1.5v1.5zM3 7.2v9.6c0 1.1.9 2 2 2h1V5.2H5c-1.1 0-2 .9-2 1.7zm5 3.9l1.6 2.5 1.6-2.5h1.3L10.7 14l1.8 2.9h-1.3l-1.6-2.6-1.6 2.6H6.7l1.8-2.9-1.8-2.9H8z" />
            </svg>
          </button>
        </div>

        {/* Leave Data Table */}
        <div className="border border-slate-300 overflow-hidden rounded">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#7a7a7a] text-white font-bold">
                <th className="text-left px-4 py-2 border-r border-slate-400 font-semibold w-[10%]">
                  ID
                </th>
                <th className="text-left px-4 py-2 border-r border-slate-400 font-semibold w-[20%]">
                  Resource Name
                </th>
                <th className="text-left px-4 py-2 border-r border-slate-400 font-semibold w-[15%]">
                  From Date
                </th>
                <th className="text-left px-4 py-2 border-r border-slate-400 font-semibold w-[15%]">
                  To Date
                </th>
                <th className="text-left px-4 py-2 border-r border-slate-400 font-semibold w-[10%]">
                  Total Days
                </th>
                <th className="text-left px-4 py-2 border-r border-slate-400 font-semibold w-[10%]">
                  Type
                </th>
                <th className="text-left px-4 py-2 border-r border-slate-400 font-semibold w-[10%]">
                  Reason
                </th>
                <th className="text-left px-4 py-2 font-semibold w-[10%]">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, index) => {
                const rowBg = index % 2 === 0 ? "bg-[#e6e6e6]" : "bg-white";
                return (
                  <tr key={l.id} className={`${rowBg} text-slate-800`}>
                    <td className="px-4 py-2 border-r border-slate-300 font-normal">{l.id}</td>
                    <td className="px-4 py-2 border-r border-slate-300 font-normal">
                      {l.resourceName}
                    </td>
                    <td className="px-4 py-2 border-r border-slate-300 font-normal font-mono">
                      {l.fromDate}
                    </td>
                    <td className="px-4 py-2 border-r border-slate-300 font-normal font-mono">
                      {l.toDate}
                    </td>
                    <td className="px-4 py-2 border-r border-slate-300 font-normal">
                      {l.totalDays} days
                    </td>
                    <td className="px-4 py-2 border-r border-slate-300 font-normal">{l.type}</td>
                    <td className="px-4 py-2 border-r border-slate-300 font-normal truncate max-w-[120px]">
                      {l.reason}
                    </td>
                    <td className="px-4 py-2 font-normal capitalize">{l.status}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500 font-medium bg-white">
                    No leave records found matching the filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination Footer */}
          <div className="bg-[#7a7a7a] text-white px-4 py-2 text-xs font-semibold">
            {filtered.length > 0 ? `1 to ${filtered.length} of ${filtered.length}` : "0 to 0 of 0"}
          </div>
        </div>
      </div>
    </PageCard>
  );
}
