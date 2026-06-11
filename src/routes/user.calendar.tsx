import { createFileRoute } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { useAuth, useRMS } from "@/lib/store";
import { useState } from "react";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Users, 
  CheckCircle2, 
  Briefcase 
} from "lucide-react";

export const Route = createFileRoute("/user/calendar")({
  component: UserCalendarPage,
});

function UserCalendarPage() {
  const resourceId = useAuth((s) => s.resourceId) ?? "177";

  // Load from store
  const allProjectTasks = useRMS((s) => s.projectTasks);
  const allScheduleEntries = useRMS((s) => s.taskScheduleEntries);
  const projects = useRMS((s) => s.projects);

  const projectTasks = allProjectTasks.filter(pt => pt.resourceId === resourceId);
  const scheduleEntries = allScheduleEntries.filter(se => se.resourceId === resourceId);

  // Focus week start date (aligns to Monday of selected week)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    return monday;
  });

  // Calculate dates in focus week (Monday to Sunday)
  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentWeekStart);
    d.setDate(currentWeekStart.getDate() + i);
    weekDates.push(d);
  }

  // Navigation handlers
  const handlePrevWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(d);
  };

  const handleToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    setCurrentWeekStart(monday);
  };

  // Calculate sum of scheduled hours for the week
  const weekDatesStr = weekDates.map(d => d.toISOString().split("T")[0]);
  const weeklyScheduledEntries = scheduleEntries.filter(se => weekDatesStr.includes(se.workDate));
  const totalWeeklyHours = weeklyScheduledEntries.reduce((sum, se) => sum + se.plannedHours, 0);

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#115e59] flex items-center gap-2">
            <Calendar className="w-8 h-8 text-[#0d9488]" />
            My Calendar Schedule
          </h1>
          <p className="text-sm text-slate-500 mt-1">View your scheduled task hours, upcoming deadlines, and allocations.</p>
        </div>

        {/* Navigation controls */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-lg self-end sm:self-center shadow-sm">
          <button 
            onClick={handlePrevWeek}
            className="p-2 hover:bg-slate-50 rounded text-slate-500 hover:text-slate-800 transition-colors"
            title="Previous Week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded transition-colors"
          >
            Today
          </button>
          <button 
            onClick={handleNextWeek}
            className="p-2 hover:bg-slate-50 rounded text-slate-500 hover:text-slate-800 transition-colors"
            title="Next Week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Week Title and Summary Info */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-teal-50 border border-teal-100 p-4 rounded-lg">
        <div>
          <span className="text-[10px] text-teal-800 uppercase tracking-widest font-extrabold">Active Schedule week</span>
          <h2 className="text-lg font-bold text-teal-900 mt-1">
            {weekDates[0].toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })} to {weekDates[6].toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })}
          </h2>
        </div>
        <div className="flex items-center gap-2 bg-white border border-teal-200 px-4 py-2 rounded-md shadow-sm">
          <Clock className="w-4 h-4 text-teal-600" />
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Scheduled:</span>
          <span className="text-sm font-extrabold text-teal-900">{totalWeeklyHours} Hours</span>
        </div>
      </div>

      {/* Week Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDates.map((d, index) => {
          const dateStr = d.toISOString().split("T")[0];
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          const isToday = d.toDateString() === new Date().toDateString();
          
          // Get schedule entries for this day
          const dayEntries = scheduleEntries.filter(se => se.workDate === dateStr);
          const dayTotalHours = dayEntries.reduce((sum, se) => sum + se.plannedHours, 0);

          return (
            <div 
              key={index} 
              className={`border rounded-lg overflow-hidden shadow-sm flex flex-col min-h-[220px] bg-white transition-all hover:shadow-md ${
                isToday ? "border-teal-500 ring-1 ring-teal-500/20" : "border-slate-200"
              }`}
            >
              {/* Day Header */}
              <div className={`p-3 text-center border-b flex justify-between items-center ${
                isToday ? "bg-teal-600 text-white" : isWeekend ? "bg-slate-100/70 text-slate-400" : "bg-slate-50 text-slate-700"
              }`}>
                <span className="font-bold text-xs uppercase tracking-wider">
                  {d.toLocaleDateString("en-GB", { weekday: 'short' })}
                </span>
                <span className="text-sm font-extrabold">
                  {d.getDate()}
                </span>
              </div>

              {/* Day Contents (Scheduled tasks) */}
              <div className="p-3 flex-1 flex flex-col gap-2 overflow-y-auto bg-stone-50/20">
                {dayEntries.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                    <span className="text-[10px] text-slate-400 font-medium">Free or Holiday</span>
                  </div>
                ) : (
                  dayEntries.map((se) => {
                    const task = projectTasks.find(t => t.id === se.taskId);
                    const proj = projects.find(p => p.id === task?.projectId);
                    return (
                      <div 
                        key={se.id} 
                        className="bg-white border border-slate-200 rounded p-2.5 shadow-sm text-left hover:border-teal-200 transition-colors"
                      >
                        <span className="text-[9px] bg-teal-50 border border-teal-100 text-teal-800 font-bold px-1 py-0.5 rounded truncate block w-fit">
                          {proj ? proj.name : "Project"}
                        </span>
                        <h4 className="font-bold text-slate-800 text-[11px] mt-1.5 line-clamp-2" title={task?.taskName}>
                          {task?.taskName || "Work Task"}
                        </h4>
                        <div className="flex justify-between items-center mt-3 border-t pt-1.5 text-[10px]">
                          <span className="text-slate-400 font-medium">Capacity:</span>
                          <span className="font-extrabold text-teal-800">{se.plannedHours} hrs</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Day Footer showing total daily hours */}
              {dayTotalHours > 0 && (
                <div className="p-2 border-t bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center px-3">
                  <span>Day Total:</span>
                  <span className="text-teal-700 font-extrabold">{dayTotalHours} hrs</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
