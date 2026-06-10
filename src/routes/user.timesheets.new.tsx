import { createFileRoute, useRouter } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { useAuth, useRMS } from "@/lib/store";
import { useState } from "react";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const weekOptions = [
  "W/e 03 May, 2026",
  "W/e 10 May, 2026",
  "W/e 17 May, 2026",
  "W/e 24 May, 2026",
  "W/e 31 May, 2026",
  "W/e 07 Jun, 2026",
  "W/e 14 Jun, 2026",
  "W/e 21 Jun, 2026",
  "W/e 28 Jun, 2026",
  "W/e 05 Jul, 2026",
  "W/e 12 Jul, 2026",
];

interface TimesheetRow {
  projectName: string;
  hours: number[];
}

export const Route = createFileRoute("/user/timesheets/new")({
  component: UsertimesheetsnewPage,
});

function UsertimesheetsnewPage() {
  const router = useRouter();
  const addTs = useRMS((s) => s.addTimesheet);
  const allProjects = useRMS((s) => s.projects);
  const resourceId = useAuth((s) => s.resourceId) ?? "177";
  const resourceName = useAuth((s) => s.userName) || "Asra Ghafoor";

  // Form states
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedWeek, setSelectedWeek] = useState("W/e 07 Jun, 2026");
  const [rows, setRows] = useState<TimesheetRow[]>([
    { projectName: "", hours: [0, 0, 0, 0, 0, 0, 0] },
  ]);

  // Helper to compute dates based on selected week ending date (Sunday)
  const getWeekDates = (weekEndDateStr: string) => {
    const cleanStr = weekEndDateStr.replace("W/e ", "");
    const sundayDate = new Date(cleanStr);
    if (isNaN(sundayDate.getTime())) {
      return [
        "01-06-2026",
        "02-06-2026",
        "03-06-2026",
        "04-06-2026",
        "05-06-2026",
        "06-06-2026",
        "07-06-2026",
      ];
    }
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(sundayDate);
      d.setDate(sundayDate.getDate() - i);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      dates.push(`${dd}-${mm}-${yyyy}`);
    }
    return dates;
  };

  const weekDates = getWeekDates(selectedWeek);

  // Helper to calculate week number dynamically
  const getWeekNumber = (dateStr: string) => {
    const cleanStr = dateStr.replace("W/e ", "");
    const target = new Date(cleanStr);
    if (isNaN(target.getTime())) return 23;
    const dayNr = (target.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  };

  // Format week ending date for mock store format (e.g. "07/Jun/2026")
  const formatWeekEndDate = (weekStr: string) => {
    const clean = weekStr.replace("W/e ", "");
    const dateObj = new Date(clean);
    if (isNaN(dateObj.getTime())) return "07/Jun/2026";
    const dd = String(dateObj.getDate()).padStart(2, "0");
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const mmm = months[dateObj.getMonth()];
    const yyyy = dateObj.getFullYear();
    return `${dd}/${mmm}/${yyyy}`;
  };

  // Row operations
  const handleAddRow = () => {
    setRows((prev) => [...prev, { projectName: "", hours: [0, 0, 0, 0, 0, 0, 0] }]);
  };

  const handleRemoveRow = () => {
    if (rows.length > 1) {
      setRows((prev) => prev.slice(0, -1));
    }
  };

  const handleProjectChange = (rowIndex: number, val: string) => {
    setRows((prev) =>
      prev.map((row, rIdx) => {
        if (rIdx === rowIndex) {
          return { ...row, projectName: val };
        }
        return row;
      }),
    );
  };

  const handleHourChange = (rowIndex: number, dayIndex: number, val: string) => {
    const num = Number(val) || 0;
    setRows((prev) =>
      prev.map((row, rIdx) => {
        if (rIdx === rowIndex) {
          const newHours = [...row.hours];
          newHours[dayIndex] = num;
          return { ...row, hours: newHours };
        }
        return row;
      }),
    );
  };

  const handleSubmit = async () => {
    const hasEmptyProject = rows.some((r) => !r.projectName);
    if (hasEmptyProject) {
      alert("Please select a project for all timesheet rows.");
      return;
    }

    const hasZeroHours = rows.some((r) => r.hours.reduce((a, b) => a + b, 0) === 0);
    if (hasZeroHours) {
      alert("Please enter hours for all timesheet rows.");
      return;
    }

    // Resolve weekEndDate
    const cleanStr = selectedWeek.replace("W/e ", "");
    const dateObj = new Date(cleanStr);
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    const weekEndDate = `${yyyy}-${mm}-${dd}`;

    // Map rows to request structure
    const payloadRows = rows.map((row) => {
      const proj = allProjects.find((p) => p.name === row.projectName);
      const projectId = proj ? proj.id : "";

      const dailyEntries = row.hours.map((hours, dayIdx) => {
        const dStr = weekDates[dayIdx]; // DD-MM-YYYY
        const parts = dStr.split("-");
        const workDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
        return {
          workDate,
          hours,
          remarks: `Logged ${hours} hours for ${row.projectName}`,
        };
      });

      return {
        projectId,
        dailyEntries,
      };
    });

    try {
      await addTs({
        weekEndDate,
        rows: payloadRows,
      });
      alert("Timesheet submitted to Admin successfully!");
      router.navigate({ to: "/user/timesheets" });
    } catch (e: any) {
      alert(e.message || "Failed to submit timesheet.");
    }
  };

  return (
    <PageCard title="Submit Timesheet">
      <div className="border border-slate-300 p-6 max-w-[650px] bg-white rounded-none shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        {/* Year Selector */}
        <div className="flex items-center mb-3 text-xs">
          <label className="w-28 text-slate-700 font-semibold shrink-0">Select Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="border border-slate-400 rounded-none px-2 py-1 text-xs bg-white w-64 focus:outline-none h-7"
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
        </div>

        {/* Week Selector + Max Hours */}
        <div className="flex items-center justify-between mb-3 w-full text-xs max-w-[550px]">
          <div className="flex items-center flex-grow">
            <label className="w-28 text-slate-700 font-semibold shrink-0">Select Week:</label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="border border-slate-400 rounded-none px-2 py-1 text-xs bg-white w-64 focus:outline-none h-7 shrink-0"
            >
              {weekOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <span className="text-[11px] text-slate-700 font-semibold ml-4 shrink-0 whitespace-nowrap">
            Max. Hours Allowed:35
          </span>
        </div>

        {/* Projects + Hours Rows */}
        <div className="space-y-6">
          {rows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="space-y-2 border-b border-slate-200 pb-4 last:border-b-0 last:pb-0"
            >
              {/* Project Selector */}
              <div className="flex items-center text-xs">
                <label className="w-28 text-slate-700 font-semibold shrink-0">Select project:</label>
                <select
                  value={row.projectName}
                  onChange={(e) => handleProjectChange(rowIndex, e.target.value)}
                  className="border border-slate-400 rounded-none px-2 py-1 text-xs bg-white w-64 focus:outline-none h-7"
                >
                  <option value="">Select project</option>
                  {allProjects.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Day Grid */}
              <div className="overflow-x-auto">
                <table className="table-fixed border-collapse text-[10px] w-full max-w-[550px] border border-slate-300">
                  <thead>
                    <tr className="bg-[#636363] text-white font-medium text-center">
                      {days.map((d, i) => (
                        <th
                          key={i}
                          className="py-1.5 border-r border-slate-500 font-semibold w-16 last:border-r-0"
                        >
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Date and Timing subheader */}
                    <tr className="bg-slate-50 text-center text-slate-700 font-semibold border-b border-slate-200">
                      {days.map((_, i) => (
                        <td
                          key={i}
                          className="py-1 border-r border-slate-200 text-[9px] leading-tight last:border-r-0"
                        >
                          <div>{weekDates[i]}</div>
                          <div className="text-[8px] font-normal text-slate-500">
                            10:00 AM - 05:00 PM
                          </div>
                        </td>
                      ))}
                    </tr>
                    {/* Hours Inputs */}
                    <tr className="bg-white text-center">
                      {row.hours.map((h, i) => (
                        <td key={i} className="p-2 border-r border-slate-200 last:border-r-0">
                          <input
                            type="number"
                            value={h}
                            min="0"
                            max="24"
                            onChange={(e) => handleHourChange(rowIndex, i, e.target.value)}
                            className="w-12 text-center border border-slate-400 px-1 py-0.5 text-xs focus:outline-none focus:border-teal-500 h-6"
                          />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Add / Remove Buttons */}
        <div className="flex gap-2.5 mt-4">
          <button
            type="button"
            onClick={handleAddRow}
            className="bg-[#247373] hover:bg-[#1d5d5d] text-white px-3.5 py-1 text-[11px] font-bold border border-slate-600 rounded-none shadow-sm transition-colors uppercase cursor-pointer"
          >
            Add
          </button>
          <button
            type="button"
            onClick={handleRemoveRow}
            disabled={rows.length <= 1}
            className="bg-[#247373] hover:bg-[#1d5d5d] text-white px-3.5 py-1 text-[11px] font-bold border border-slate-600 rounded-none shadow-sm transition-colors uppercase disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Remove
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 mt-6 pt-5 border-t border-slate-200">
          <button
            type="button"
            onClick={handleSubmit}
            className="bg-[#247373] hover:bg-[#1d5d5d] text-white px-4 py-1.5 text-xs font-bold border border-slate-600 rounded-none shadow-sm transition-colors cursor-pointer"
          >
            Submit to Admin
          </button>
          <button
            type="button"
            onClick={() => router.history.back()}
            className="bg-[#247373] hover:bg-[#1d5d5d] text-white px-4 py-1.5 text-xs font-bold border border-slate-600 rounded-none shadow-sm transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </PageCard>
  );
}
