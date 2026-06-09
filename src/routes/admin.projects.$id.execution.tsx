import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { useRMS } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  Clock, 
  Users, 
  AlertTriangle, 
  Play, 
  Pause, 
  Check, 
  ArrowLeft,
  Calendar,
  Hourglass,
  Activity,
  ListTodo
} from "lucide-react";

export const Route = createFileRoute("/admin/projects/$id/execution")({
  component: ProjectExecutionDashboard,
});

function ProjectExecutionDashboard() {
  const { id } = Route.useParams();
  const router = useRouter();

  // Load state from useRMS
  const project = useRMS((s) => s.projects.find((p) => p.id === id));
  const tasks = useRMS((s) => s.projectTasks.filter((t) => t.projectId === id));
  const requirements = useRMS((s) => s.projectRequirements.filter((r) => r.projectId === id));
  const assignments = useRMS((s) => s.projectAssignments.filter((a) => a.projectId === id));
  const activityLogs = useRMS((s) => s.taskActivityLogs.filter((l) => tasks.some(t => t.id === l.taskId)));
  const timeLogs = useRMS((s) => s.taskTimeLogs.filter((l) => tasks.some(t => t.id === l.taskId)));
  const resources = useRMS((s) => s.resources);

  if (!project) {
    return (
      <PageCard title="Project Execution">
        <p className="text-slate-500 italic text-sm">Project not found.</p>
      </PageCard>
    );
  }

  // Calculate high-level progress metrics
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.status === "completed").length;
  const inProgressTasksCount = tasks.filter(t => t.status === "in_progress").length;
  const pausedTasksCount = tasks.filter(t => t.status === "paused").length;
  const pendingTasksCount = tasks.filter(t => t.status === "pending").length;

  const projectProgressPct = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const totalEstHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
  const totalActHours = tasks.reduce((sum, t) => sum + t.actualHours, 0);

  // Group tasks by module requirement
  const moduleTasksMap = requirements.map(req => {
    const modTasks = tasks.filter(t => t.requirementId === req.id);
    const completedModTasks = modTasks.filter(t => t.status === "completed").length;
    const progress = modTasks.length > 0 ? Math.round((completedModTasks / modTasks.length) * 100) : 0;
    
    // Find assigned developer
    const assignment = assignments.find(a => a.requirementId === req.id);
    const developer = resources.find(r => r.id === assignment?.resourceId);

    return {
      requirement: req,
      tasks: modTasks,
      progress,
      developerName: developer ? developer.fullName : "Unassigned"
    };
  });

  // Check for blocked tasks (a task that depends on non-completed tasks)
  const blockedTasks = tasks.filter(t => {
    if (t.status === "completed") return false;
    return t.dependsOn.some(depId => {
      const depTask = tasks.find(pt => pt.id === depId);
      return depTask && depTask.status !== "completed";
    });
  });

  return (
    <div className="space-y-6 text-left max-w-6xl mx-auto">
      {/* Navigation Header */}
      <div className="flex items-center gap-2">
        <Link
          to="/admin/projects"
          className="text-teal-600 hover:text-teal-800 flex items-center gap-1 text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>
      </div>

      <header className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#115e59]">{project.name}</h1>
          <p className="text-sm text-slate-500 mt-1">Execution Status & Task Planning Dashboard</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="text-xs bg-white"
            onClick={() => router.navigate({ to: `/admin/projects/${id}/edit` })}
          >
            Edit Settings
          </Button>
          <Button
            className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-4 py-2"
            onClick={() => router.navigate({ to: "/admin/projects/new-ai" })}
          >
            Re-plan with AI
          </Button>
        </div>
      </header>

      {/* High-Level KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border p-5 rounded-lg shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-teal-600" /> Completion Progress
          </span>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-teal-900">{projectProgressPct}%</div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
              <div 
                className="bg-teal-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${projectProgressPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white border p-5 rounded-lg shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <ListTodo className="w-4 h-4 text-sky-600" /> Tasks Status
          </span>
          <div className="mt-4 space-y-1">
            <div className="text-2xl font-extrabold text-slate-800">{completedTasksCount}/{totalTasksCount}</div>
            <div className="text-[10px] text-slate-400 font-bold flex gap-2">
              <span className="text-teal-600">{inProgressTasksCount} Act.</span>
              <span className="text-amber-500">{pausedTasksCount} Paused</span>
              <span className="text-slate-500">{pendingTasksCount} Pend.</span>
            </div>
          </div>
        </div>

        <div className="bg-white border p-5 rounded-lg shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Hourglass className="w-4 h-4 text-indigo-600" /> Effort Logged
          </span>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-indigo-900">{totalActHours} / {totalEstHours} hrs</div>
            <div className="text-[10px] text-slate-400 mt-1 font-bold">Planned vs Actual development hours</div>
          </div>
        </div>

        <div className="bg-white border p-5 rounded-lg shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600" /> Blocked Tasks
          </span>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-rose-700">{blockedTasks.length}</div>
            <div className="text-[10px] text-slate-400 mt-1 font-bold">Waiting for dependency task completion</div>
          </div>
        </div>
      </div>

      {/* Main Execution Breakdown Content */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left column: Module & Task Trees */}
        <div className="lg:col-span-8 space-y-6">
          <PageCard title="Project Task Breakdown by Module">
            {moduleTasksMap.length === 0 ? (
              <div className="py-12 text-center text-slate-400 italic text-sm">
                No tasks generated for this project. Use "Re-plan with AI" to generate schedules.
              </div>
            ) : (
              <div className="space-y-6 text-left">
                {moduleTasksMap.map((mod) => (
                  <div key={mod.requirement.id} className="border border-slate-200 rounded overflow-hidden">
                    {/* Header Panel */}
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2">
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm sm:text-base">{mod.requirement.moduleName}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Lead Developer: <span className="font-semibold">{mod.developerName}</span></p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-slate-600 font-bold">{mod.progress}% Done</div>
                        <div className="w-20 bg-slate-200 rounded-full h-1.5">
                          <div 
                            className="bg-teal-600 h-1.5 rounded-full" 
                            style={{ width: `${mod.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Task List table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-slate-700">
                        <thead className="bg-stone-50/50 text-[10px] uppercase text-slate-400 border-b">
                          <tr>
                            <th className="p-3 text-left">Task</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 text-center">Dates</th>
                            <th className="p-3 text-center">Estimated</th>
                            <th className="p-3 text-center">Logged</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {mod.tasks.map(t => {
                            const isBlocked = blockedTasks.some(bt => bt.id === t.id);
                            return (
                              <tr key={t.id} className="hover:bg-slate-50/30">
                                <td className="p-3">
                                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                    {t.taskName}
                                    {isBlocked && (
                                      <span className="bg-rose-50 text-rose-700 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-rose-100">
                                        <AlertTriangle className="w-3 h-3 text-rose-600" /> BLOCKED
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{t.description}</div>
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    t.status === 'completed' 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                      : t.status === 'in_progress'
                                      ? 'bg-sky-50 text-sky-700 border border-sky-100 animate-pulse'
                                      : t.status === 'paused'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                      : 'bg-slate-50 text-slate-500 border border-slate-100'
                                  }`}>
                                    {t.status === 'in_progress' ? 'Running' : t.status === 'completed' ? 'Finished' : t.status}
                                  </span>
                                </td>
                                <td className="p-3 text-center text-slate-500 font-medium">
                                  {t.startDate ? `${t.startDate} to ${t.endDate}` : "Unscheduled"}
                                </td>
                                <td className="p-3 text-center font-bold text-slate-700">{t.estimatedHours}h</td>
                                <td className="p-3 text-center font-bold text-indigo-700">{t.actualHours}h</td>
                              </tr>
                            );
                          })}
                          {mod.tasks.length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-6 text-center text-slate-400 italic">No tasks created.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PageCard>
        </div>

        {/* Right column: Activity feed, blocked alert summary */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active Blocked Alert List */}
          {blockedTasks.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-5 text-left">
              <h3 className="font-bold text-rose-900 text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" /> Blocked Tasks Summary
              </h3>
              <p className="text-[11px] text-rose-700 mt-1 leading-relaxed">
                The following tasks cannot start because their prerequisite tasks are still pending or in progress:
              </p>
              <div className="mt-3 space-y-2">
                {blockedTasks.map(t => (
                  <div key={t.id} className="bg-white border border-rose-100 p-2.5 rounded text-xs">
                    <div className="font-bold text-slate-800">{t.taskName}</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Depends on: {t.dependsOn.map(depId => {
                        const depObj = tasks.find(pt => pt.id === depId);
                        return depObj ? depObj.taskName : "Prerequisite";
                      }).join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Task Activity Feed */}
          <PageCard title="Project Activity Log">
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 text-left">
              {activityLogs.length === 0 ? (
                <div className="py-6 text-center text-slate-400 italic text-xs">
                  No recent activities recorded. Tasks started or completed will show up here.
                </div>
              ) : (
                activityLogs.slice().reverse().map((log) => {
                  const taskObj = tasks.find(t => t.id === log.taskId);
                  const resObj = resources.find(r => r.id === log.resourceId);
                  
                  let actionColor = "text-slate-500 bg-slate-50";
                  let actionLabel = log.action;
                  if (log.action === "started") {
                    actionColor = "text-sky-600 bg-sky-50 border border-sky-100";
                    actionLabel = "Started";
                  } else if (log.action === "completed") {
                    actionColor = "text-emerald-600 bg-emerald-50 border border-emerald-100";
                    actionLabel = "Finished";
                  } else if (log.action === "paused") {
                    actionColor = "text-amber-600 bg-amber-50 border border-amber-100";
                    actionLabel = "Paused";
                  }

                  return (
                    <div key={log.id} className="flex gap-3 text-xs border-b pb-3 items-start last:border-0 last:pb-0">
                      <div className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${actionColor}`}>
                        {actionLabel}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 line-clamp-1">{taskObj?.taskName || "Unknown Task"}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          By {resObj ? resObj.fullName : "Developer"} • {new Date(log.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </PageCard>

          {/* Effort Time Log Summary */}
          <PageCard title="Work Effort Logs">
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 text-left">
              {timeLogs.length === 0 ? (
                <div className="py-6 text-center text-slate-400 italic text-xs">
                  No developer effort hours logged.
                </div>
              ) : (
                timeLogs.slice().reverse().map((log) => {
                  const taskObj = tasks.find(t => t.id === log.taskId);
                  const resObj = resources.find(r => r.id === log.resourceId);
                  return (
                    <div key={log.id} className="border border-slate-100 p-2.5 rounded bg-slate-50/50 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">{resObj ? resObj.fullName : "Developer"}</span>
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">{log.hoursLogged} hrs</span>
                      </div>
                      <p className="text-slate-600 mt-1 text-[11px] leading-relaxed">{log.notes || "No notes entered."}</p>
                      <div className="text-[10px] text-slate-400 mt-2 font-mono">{taskObj?.taskName}</div>
                    </div>
                  );
                })
              )}
            </div>
          </PageCard>
        </div>
      </div>
    </div>
  );
}
