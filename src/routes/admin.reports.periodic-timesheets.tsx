import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useRMS } from "@/lib/store";
import { PageCard } from "@/components/layout/AppShell";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin/reports/periodic-timesheets")({
  component: PeriodicTimesheetsPage,
});

function PeriodicTimesheetsPage() {
  const timesheets = useRMS((s) => s.timesheets);

  // Filter states
  const [startYear, setStartYear] = useState(2025);
  const [startWeek, setStartWeek] = useState(6);
  const [endYear, setEndYear] = useState(2025);
  const [endWeek, setEndWeek] = useState(6);

  // Years options
  const years = [2024, 2025, 2026];
  // Weeks options
  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);

  // Helper to calculate start date (Monday) of a week
  const getStartDateOfWeek = (weekNum: number, year: number) => {
    if (weekNum === 6 && year === 2025) return "2025-02-03";
    const jan1 = new Date(year, 0, 1);
    const day = jan1.getDay();
    const diff = jan1.getDate() - day + (day === 0 ? -6 : 1);
    const startMonday = new Date(jan1.setDate(diff));
    startMonday.setDate(startMonday.getDate() + (weekNum - 1) * 7);

    const y = startMonday.getFullYear();
    const m = String(startMonday.getMonth() + 1).padStart(2, "0");
    const d = String(startMonday.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Filter timesheets based on range
  const filtered = timesheets.filter((t) => {
    // In our mock data, we might not store a full year field explicitly.
    // We can infer year from weekEndDate (e.g. "09-02-2025" or "12/Apr/2026")
    let tsYear = 2026;
    if (t.weekEndDate.includes("2025")) {
      tsYear = 2025;
    } else if (t.weekEndDate.includes("2024")) {
      tsYear = 2024;
    }

    // Check if within week range
    const startVal = startYear * 100 + startWeek;
    const endVal = endYear * 100 + endWeek;
    const currentVal = tsYear * 100 + t.weekNumber;

    return currentVal >= startVal && currentVal <= endVal;
  });

  // Export filtered data as CSV
  const handleExportExcel = () => {
    const headers = ["Week#", "Start Date", "Resource", "Projects(Hrs.)", "Total Hours", "Status"];
    const rows = filtered.map((t) => {
      let tsYear = 2026;
      if (t.weekEndDate.includes("2025")) {
        tsYear = 2025;
      } else if (t.weekEndDate.includes("2024")) {
        tsYear = 2024;
      }
      return [
        String(t.weekNumber),
        getStartDateOfWeek(t.weekNumber, tsYear),
        t.resourceName,
        `1. ${t.projectName || "LMS"} (${t.totalHours} hrs)`,
        String(t.totalHours),
        t.status === "approved" ? "Approve" : "Pending",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "periodic_timesheets.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PageCard
      title="Periodic Timesheets"
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
            <span>Start Year</span>
            <select
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              className="border border-black px-2 py-1 bg-white font-medium focus:outline-none min-w-[70px]"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span>Start Week</span>
            <select
              value={startWeek}
              onChange={(e) => setStartWeek(Number(e.target.value))}
              className="border border-black px-2 py-1 bg-white font-medium focus:outline-none min-w-[70px]"
            >
              {weeks.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span>End Year</span>
            <select
              value={endYear}
              onChange={(e) => setEndYear(Number(e.target.value))}
              className="border border-black px-2 py-1 bg-white font-medium focus:outline-none min-w-[70px]"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span>End Week</span>
            <select
              value={endWeek}
              onChange={(e) => setEndWeek(Number(e.target.value))}
              className="border border-black px-2 py-1 bg-white font-medium focus:outline-none min-w-[70px]"
            >
              {weeks.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
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

        {/* Timesheet Data Table */}
        <div className="border border-slate-300 overflow-hidden rounded">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#7a7a7a] text-white font-bold">
                <th className="text-left px-4 py-2 border-r border-slate-400 font-semibold w-[10%]">
                  Week#
                </th>
                <th className="text-left px-4 py-2 border-r border-slate-400 font-semibold w-[20%]">
                  Start Date
                </th>
                <th className="text-left px-4 py-2 border-r border-slate-400 font-semibold w-[25%]">
                  Resource
                </th>
                <th className="text-left px-4 py-2 border-r border-slate-400 font-semibold w-[25%]">
                  Projects(Hrs.)
                </th>
                <th className="text-left px-4 py-2 border-r border-slate-400 font-semibold w-[10%]">
                  Total Hours
                </th>
                <th className="text-left px-4 py-2 font-semibold w-[10%]">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, index) => {
                let tsYear = 2026;
                if (t.weekEndDate.includes("2025")) {
                  tsYear = 2025;
                } else if (t.weekEndDate.includes("2024")) {
                  tsYear = 2024;
                }
                const rowBg = index % 2 === 0 ? "bg-[#e6e6e6]" : "bg-white";

                return (
                  <tr key={t.id} className={`${rowBg} text-slate-800`}>
                    <td className="px-4 py-2 border-r border-slate-300 font-normal">
                      {t.weekNumber}
                    </td>
                    <td className="px-4 py-2 border-r border-slate-300 font-normal">
                      {getStartDateOfWeek(t.weekNumber, tsYear)}
                    </td>
                    <td className="px-4 py-2 border-r border-slate-300 font-normal">
                      {t.resourceName}
                    </td>
                    <td className="px-4 py-2 border-r border-slate-300 font-normal">
                      1. {t.projectName || "LMS"} ({t.totalHours} hrs)
                    </td>
                    <td className="px-4 py-2 border-r border-slate-300 font-normal">
                      {t.totalHours}
                    </td>
                    <td className="px-4 py-2 font-normal">
                      {t.status === "approved" ? "Approve" : "Pending"}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 font-medium bg-white">
                    No records found for the selected period
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
