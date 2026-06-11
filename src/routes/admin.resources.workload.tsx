import { createFileRoute, Link } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { useRMS, calculateResourceCapacity } from "@/lib/store";
import { isResourceAssignable } from "@/lib/types";
import { useState } from "react";
import { 
  Users, 
  AlertTriangle, 
  Search, 
  TrendingUp, 
  Activity,
  Calendar,
  CheckCircle,
  Clock
} from "lucide-react";

export const Route = createFileRoute("/admin/resources/workload")({
  component: ResourceWorkloadHeatmap,
});

function ResourceWorkloadHeatmap() {
  const allResources = useRMS((s) => s.resources);
  const resources = allResources.filter(isResourceAssignable);
  const projectTasks = useRMS((s) => s.projectTasks);
  const taskScheduleEntries = useRMS((s) => s.taskScheduleEntries);

  const [searchQuery, setSearchQuery] = useState("");

  // Determine a 2-week date range starting from today for the daily load heatmap
  const today = new Date();
  // Align to Monday of current week for a cleaner grid view
  const monday = new Date(today);
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(today.getDate() + diffToMonday);

  const daysToShow: Date[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    daysToShow.push(d);
  }

  // Filter resources based on query
  const filteredResources = resources.filter(
    (r) =>
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#115e59] flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-[#0d9488]" />
            Resource Workload Heatmap
          </h1>
          <p className="text-sm text-slate-500 mt-1">Monitor active capacity distribution and identify overallocation risks.</p>
        </div>
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>
      </header>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-teal-600" /> Assignable Staff Loaded
          </span>
          <div className="text-2xl font-extrabold text-teal-900 mt-2">{resources.length} resources</div>
          <p className="text-[11px] text-slate-400 mt-1">Currently tracked employee profiles</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-indigo-600" /> Average Utilization
          </span>
          <div className="text-2xl font-extrabold text-indigo-900 mt-2">
            {resources.length > 0 
              ? Math.round(
                  resources.reduce((sum, r) => {
                    const sched = taskScheduleEntries.filter(se => se.resourceId === r.id);
                    const hours = sched.reduce((s, e) => s + e.plannedHours, 0);
                    const pct = (hours / ((r.weeklyAllowedHours || 35) * 2)) * 100; // 2 weeks period
                    return sum + pct;
                  }, 0) / resources.length
                )
              : 0
            }%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Average capacity load over next 2 weeks</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600" /> Overload Alerts
          </span>
          <div className="text-2xl font-extrabold text-rose-700 mt-2">
            {resources.filter(r => {
              // Check if any day has > 8 hours planned
              return daysToShow.some(d => {
                const dateStr = d.toISOString().split("T")[0];
                const dayHours = taskScheduleEntries
                  .filter(se => se.resourceId === r.id && se.workDate === dateStr)
                  .reduce((sum, se) => sum + se.plannedHours, 0);
                return dayHours > 8;
              });
            }).length} resources
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Exceeding daily threshold of 8 hours</p>
        </div>
      </div>

      {/* Heatmap Grid PageCard */}
      <PageCard title="Weekly Heatmap & Daily Utilization Grid">
        <div className="overflow-x-auto">
          <div className="min-w-[800px] divide-y divide-slate-100">
            {/* Header Dates Row */}
            <div className="grid grid-cols-12 gap-2 pb-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider items-center">
              <div className="col-span-3 text-left pl-2">Resource Details</div>
              <div className="col-span-1">Utilization</div>
              {daysToShow.map((d, idx) => {
                const isToday = d.toDateString() === today.toDateString();
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div 
                    key={idx} 
                    className={`col-span-1 py-1 rounded flex flex-col items-center ${
                      isToday ? "bg-teal-50 border border-teal-200 text-teal-800" : ""
                    } ${isWeekend ? "text-slate-300" : ""}`}
                  >
                    <span>{d.toLocaleDateString("en-GB", { weekday: 'short' })}</span>
                    <span className="text-xs font-extrabold mt-0.5">{d.getDate()}</span>
                  </div>
                );
              })}
            </div>

            {/* Resources Heatmap Rows */}
            {filteredResources.map((r) => {
              // Calculate weekly totals
              const weeklyLimit = r.weeklyAllowedHours || 35;
              const twoWeeksLimit = weeklyLimit * 2;
              
              const resEntries = taskScheduleEntries.filter(se => se.resourceId === r.id);
              const totalHoursPlanned = resEntries.reduce((sum, e) => sum + e.plannedHours, 0);
              const utilizationPct = twoWeeksLimit > 0 ? Math.round((totalHoursPlanned / twoWeeksLimit) * 100) : 0;

              return (
                <div 
                  key={r.id} 
                  className="grid grid-cols-12 gap-2 py-4 items-center text-xs hover:bg-slate-50/50 transition-colors"
                >
                  {/* Info Column */}
                  <div className="col-span-3 text-left pl-2">
                    <div className="font-bold text-slate-800 hover:text-teal-700 transition-colors">
                      <Link to="/admin/resources/$id" params={{ id: r.id }}>{r.fullName}</Link>
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold">{r.jobTitle}</div>
                  </div>

                  {/* Allocation Rate */}
                  <div className="col-span-1 text-center font-bold">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      utilizationPct > 100 
                        ? 'bg-rose-100 text-rose-800'
                        : utilizationPct > 80
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {utilizationPct}%
                    </span>
                  </div>

                  {/* Daily calendar cells */}
                  {daysToShow.map((d, idx) => {
                    const dateStr = d.toISOString().split("T")[0];
                    const dailyHours = resEntries
                      .filter(se => se.workDate === dateStr)
                      .reduce((sum, e) => sum + e.plannedHours, 0);
                    
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                    // Color heuristic based on planned hours
                    let cellColor = "bg-stone-50 border-stone-200 text-slate-400";
                    if (dailyHours > 8) {
                      cellColor = "bg-rose-500 border-rose-600 text-white font-extrabold shadow-sm";
                    } else if (dailyHours > 4) {
                      cellColor = "bg-teal-600 border-teal-700 text-white font-bold";
                    } else if (dailyHours > 0) {
                      cellColor = "bg-teal-100 border-teal-200 text-teal-800 font-bold";
                    } else if (isWeekend) {
                      cellColor = "bg-slate-100/50 border-slate-200/50 text-slate-300";
                    }

                    return (
                      <div 
                        key={idx}
                        className={`col-span-1 aspect-square rounded border flex items-center justify-center text-[10px] transition-all ${cellColor}`}
                        title={`${r.fullName} on ${d.toLocaleDateString("en-GB")}: ${dailyHours} Hours Planned`}
                      >
                        {dailyHours > 0 ? `${dailyHours}h` : "-"}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {filteredResources.length === 0 && (
              <div className="text-center py-12 text-slate-400 italic">No resources matched your search query.</div>
            )}
          </div>
        </div>

        {/* Grid Color Indicators */}
        <div className="flex gap-4 mt-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider justify-end border-t pt-4">
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded border bg-slate-100" /> Weekend</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded border bg-stone-50" /> Available (0h)</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded border bg-teal-100" /> Loaded (1-4h)</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded border bg-teal-600" /> Loaded (5-8h)</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded border bg-rose-500" /> Overload (&gt;8h)</span>
        </div>
      </PageCard>
    </div>
  );
}
