import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, User } from "lucide-react";
import { useState } from "react";
import { useRMS } from "@/lib/store";

export const Route = createFileRoute("/admin/reports/")({
  component: ReportsDashboardPage,
});

function ReportsDashboardPage() {
  const resources = useRMS((s) => s.resources);
  const timesheets = useRMS((s) => s.timesheets);
  const leaves = useRMS((s) => s.leaves);

  // Sidebar search state
  const [searchQuery, setSearchQuery] = useState("");

  // Sidebar active resources filter
  const activeResources = resources.filter((r) => r.status === "active");
  const filteredActive = activeResources.filter(
    (r) =>
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // CSV Downloader helper
  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent = [
      headers.join(","),
      ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTimesheets = () => {
    const headers = [
      "ID",
      "Resource ID",
      "Resource Name",
      "Week Number",
      "Week End Date",
      "Total Hours",
      "Status",
      "Project Name",
    ];
    const rows = timesheets.map((t) => [
      t.id,
      t.resourceId,
      t.resourceName,
      String(t.weekNumber),
      t.weekEndDate,
      String(t.totalHours),
      t.status,
      t.projectName || "",
    ]);
    downloadCSV("timesheet_records.csv", headers, rows);
  };

  const handleDownloadPeriodicTimesheets = () => {
    const headers = [
      "ID",
      "Resource Name",
      "Week Number",
      "Week End Date",
      "Total Hours",
      "Status",
    ];
    const rows = timesheets.map((t) => [
      t.id,
      t.resourceName,
      String(t.weekNumber),
      t.weekEndDate,
      String(t.totalHours),
      t.status,
    ]);
    downloadCSV("periodic_timesheet_records.csv", headers, rows);
  };

  const handleDownloadLeaves = () => {
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
    const rows = leaves.map((l) => [
      l.id,
      l.resourceName,
      l.fromDate,
      l.toDate,
      String(l.totalDays),
      l.type,
      l.reason,
      l.status,
    ]);
    downloadCSV("leave_records.csv", headers, rows);
  };

  const handleDownloadProfiles = () => {
    const headers = [
      "ID",
      "Full Name",
      "Job Title",
      "Email",
      "Employee ID",
      "Skillset",
      "Phone",
      "Address",
      "Status",
    ];
    const rows = resources.map((r) => [
      r.id,
      r.fullName,
      r.jobTitle,
      r.email,
      r.employeeId,
      r.skillset,
      r.phone,
      r.address,
      r.status,
    ]);
    downloadCSV("profile_records.csv", headers, rows);
  };

  const handleDownloadOther = () => {
    const headers = ["Document Name", "Type", "Uploaded Date"];
    const rows = [
      ["Contract_Asra_Ghafoor.pdf", "Contract", "12-04-2026"],
      ["ID_Verification_Jimy_Shine.pdf", "ID", "15-03-2026"],
      ["P45_Supriya_Dalli.pdf", "Tax Document", "01-05-2026"],
    ];
    downloadCSV("other_document_records.csv", headers, rows);
  };

  return (
    <div className="grid lg:grid-cols-12 gap-8">
      {/* Left Column: Download Records Panel */}
      <div className="lg:col-span-8">
        <div className="bg-white rounded-lg border border-slate-300 p-8 min-h-[400px] flex flex-col justify-between shadow-sm">
          <div>
            <h2 className="text-[28px] text-[#0d7a70] font-normal mb-8 border-b pb-4">
              Download Records
            </h2>
            <div className="border border-slate-300 rounded overflow-hidden divide-y divide-slate-300">
              <Link
                to="/admin/reports/timesheets"
                className="w-full text-left bg-[#d9d9d9]/70 hover:bg-[#d9d9d9] px-4 py-2.5 text-[#0d7a70] font-semibold text-sm hover:underline transition-colors block focus:outline-none"
              >
                Timesheet Records
              </Link>
              <Link
                to="/admin/reports/periodic-timesheets"
                className="w-full text-left bg-white hover:bg-slate-50 px-4 py-2.5 text-[#0d7a70] font-semibold text-sm hover:underline transition-colors block focus:outline-none"
              >
                Periodic Timesheet Records
              </Link>
              <Link
                to="/admin/reports/leaves"
                className="w-full text-left bg-[#d9d9d9]/70 hover:bg-[#d9d9d9] px-4 py-2.5 text-[#0d7a70] font-semibold text-sm hover:underline transition-colors block focus:outline-none"
              >
                Leave Records
              </Link>
              <Link
                to="/admin/reports/profiles"
                className="w-full text-left bg-white hover:bg-slate-50 px-4 py-2.5 text-[#0d7a70] font-semibold text-sm hover:underline transition-colors block focus:outline-none"
              >
                Profile Records
              </Link>
              <Link
                to="/admin/reports/other-documents"
                className="w-full text-left bg-[#d9d9d9]/70 hover:bg-[#d9d9d9] px-4 py-2.5 text-[#0d7a70] font-semibold text-sm hover:underline transition-colors block focus:outline-none"
              >
                Other Documents Records
              </Link>
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
