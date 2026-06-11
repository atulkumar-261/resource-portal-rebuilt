import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useRMS } from "@/lib/store";
import { Search, User } from "lucide-react";

export const Route = createFileRoute("/admin/timesheets/$id")({
  component: AdminTimesheetDetail,
});

function AdminTimesheetDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const timesheets = useRMS((s) => s.timesheets);
  const resources = useRMS((s) => s.resources);
  const updateTimesheet = useRMS((s) => s.updateTimesheet);

  const ts = timesheets.find((x) => x.id === id);

  // Form states
  const [projectName, setProjectName] = useState("LMS");
  const [status, setStatus] = useState<
    "pending" | "approved" | "rejected" | "deleted" | "in draft"
  >("pending");
  const [dailyHours, setDailyHours] = useState<number[]>([7, 7, 7, 7, 7, 0, 0]);

  // Sidebar search state
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (ts) {
      setProjectName(ts.projectName || "LMS");
      setStatus(ts.status);
      setDailyHours(ts.dailyHours || [7, 7, 7, 7, 7, 0, 0]);
    }
  }, [ts]);

  if (!ts) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold text-red-600">Timesheet not found</h2>
        <Link to="/admin/timesheets" className="text-teal-600 underline mt-2 inline-block">
          Back to Timesheets
        </Link>
      </div>
    );
  }

  // Sidebar active resources filter
  const activeResources = resources.filter((r) => r.status === "active" && r.approvalStatus === "approved");
  const filteredActive = activeResources.filter(
    (r) =>
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Helper to calculate daily dates from week end date
  const getWeekDates = (endDateStr: string) => {
    const clean = endDateStr.replace(/\//g, " ");
    const dateObj = new Date(clean);
    if (isNaN(dateObj.getTime())) {
      return [
        "06-04-2026",
        "07-04-2026",
        "08-04-2026",
        "09-04-2026",
        "10-04-2026",
        "11-04-2026",
        "12-04-2026",
      ];
    }
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(dateObj);
      d.setDate(dateObj.getDate() - i);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      dates.push(`${dd}-${mm}-${yyyy}`);
    }
    return dates;
  };

  const dates = getWeekDates(ts.weekEndDate);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Calculate current total
  const calculatedTotal = dailyHours.reduce((a, b) => a + (Number(b) || 0), 0);

  const handleHourChange = (index: number, val: string) => {
    const num = Number(val) || 0;
    setDailyHours((prev) => prev.map((h, i) => (i === index ? num : h)));
  };

  const handleSave = async () => {
    try {
      await updateTimesheet(ts.id, {
        status,
        projectName,
        dailyHours,
        totalHours: calculatedTotal,
      });
      router.navigate({ to: "/admin/timesheets" });
    } catch (e) {
      // Error toast is handled by store action
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-8">
      {/* Left Column: Timesheet view details */}
      <div className="lg:col-span-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-xl font-bold text-teal-800 mb-8 border-b pb-2">Timesheet view</h2>

          <div className="space-y-6 max-w-4xl">
            {/* Metadata Fields */}
            <div className="grid grid-cols-3 gap-y-4 text-sm font-medium">
              <div className="text-slate-500">Submitted By:</div>
              <div className="col-span-2 text-slate-800">{ts.resourceName}</div>

              <div className="text-slate-500 flex items-center">Week submitted:</div>
              <div className="col-span-2">
                <select className="border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 min-w-[200px]">
                  <option>W/c {ts.weekEndDate}</option>
                </select>
              </div>

              <div className="text-slate-500 flex items-center">Week Total Hours:</div>
              <div className="col-span-2 text-slate-800 flex items-center gap-1">
                <span>{calculatedTotal} /</span>
                <span className="text-slate-500 text-xs">(Max. Hours Allowed: 40)</span>
              </div>

              <div className="text-slate-500 flex items-center">Project Name:</div>
              <div className="col-span-2">
                <select
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 min-w-[200px]"
                >
                  <option value="LMS">LMS</option>
                  <option value="Training">Training</option>
                  <option value="Support">Support</option>
                </select>
              </div>

              <div className="text-slate-500">Total Hours:</div>
              <div className="col-span-2 text-slate-800 font-bold">{calculatedTotal}</div>
            </div>

            {/* Daily Hours Table Grid */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg mt-6">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#7a7672] text-white font-medium">
                    {days.map((day, idx) => (
                      <th key={day} className="p-3 text-center border-r border-slate-300/30">
                        <div>{day}</div>
                        <div className="text-[10px] opacity-90 mt-0.5">{dates[idx]}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Shift slot row */}
                  <tr className="bg-slate-50 border-b border-slate-200 text-center font-medium text-slate-600">
                    {days.map((_, idx) => (
                      <td key={idx} className="p-2 border-r border-slate-200 text-[10px]">
                        {idx < 5 ? "09:00 AM - 05:00 PM" : "00:00 AM - 00:00 PM"}
                      </td>
                    ))}
                  </tr>
                  {/* Input value row */}
                  <tr>
                    {dailyHours.map((hour, idx) => (
                      <td key={idx} className="p-3 border-r border-slate-200 text-center">
                        <input
                          type="number"
                          value={hour}
                          onChange={(e) => handleHourChange(idx, e.target.value)}
                          className="w-14 text-center border border-slate-300 rounded py-1 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Status Dropdown */}
            <div className="grid grid-cols-3 gap-y-4 text-sm font-medium items-center mt-6">
              <div className="text-slate-500">Status:</div>
              <div className="col-span-2">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 min-w-[200px]"
                >
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="deleted">Deleted</option>
                  <option value="in draft">In Draft</option>
                  <option value="approved">Approved</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t mt-8">
              <button
                onClick={handleSave}
                className="bg-teal-700 hover:bg-teal-800 text-white font-semibold px-6 py-2 rounded text-sm transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => router.navigate({ to: "/admin/timesheets" })}
                className="bg-slate-500 hover:bg-slate-600 text-white font-semibold px-6 py-2 rounded text-sm transition-colors"
              >
                Cancel
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
