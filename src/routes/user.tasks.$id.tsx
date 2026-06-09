import { createFileRoute, useRouter } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRMS } from "@/lib/store";
import { useState, useEffect } from "react";
import { 
  Play, 
  Pause, 
  Check, 
  ArrowLeft, 
  Clock, 
  Activity, 
  FileText,
  DollarSign
} from "lucide-react";

export const Route = createFileRoute("/user/tasks/$id")({
  component: UsertasksidPage,
});

function UsertasksidPage() {
  const { id } = Route.useParams();
  const router = useRouter();

  // Load from store
  const legacyTask = useRMS((s) => s.tasks.find((t) => t.id === id));
  const projectTask = useRMS((s) => s.projectTasks.find((t) => t.id === id));
  
  const updateLegacyTask = useRMS((s) => s.updateTask);
  const updateProjectTaskStatus = useRMS((s) => s.updateProjectTaskStatus);
  const logTimeForTask = useRMS((s) => s.logTimeForTask);
  
  const timeLogs = useRMS((s) => s.taskTimeLogs.filter((l) => l.taskId === id));
  const activityLogs = useRMS((s) => s.taskActivityLogs.filter((l) => l.taskId === id));
  const projects = useRMS((s) => s.projects);

  // Status & notes states for legacy task
  const [legacyStatus, setLegacyStatus] = useState(legacyTask?.status ?? "pending");
  const [legacyNotes, setLegacyNotes] = useState(legacyTask?.notes ?? "");

  // Time logging states for project task
  const [logHours, setLogHours] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // If task not found
  if (!legacyTask && !projectTask) {
    return (
      <PageCard title="Task Not Found">
        <p className="text-slate-500 italic text-sm text-left">The requested task details could not be found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.navigate({ to: "/user/tasks" })}>
          Back to Tasks
        </Button>
      </PageCard>
    );
  }

  // ── RENDER 1: LEGACY TICKET DETAIL SCREEN ──
  if (legacyTask) {
    return (
      <div className="space-y-6 text-left max-w-2xl mx-auto">
        <div className="flex items-center">
          <Button variant="link" className="text-teal-600 hover:text-teal-800 p-0 text-xs font-bold" onClick={() => router.navigate({ to: "/user/tasks" })}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Tasks
          </Button>
        </div>
        <PageCard title="Legacy Ticket Details">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className="text-slate-500 text-xs font-bold uppercase">Task Subject</Label>
              <Input defaultValue={legacyTask.subject} readOnly className="mt-1 bg-slate-50" />
            </div>
            <div>
              <Label className="text-slate-500 text-xs font-bold uppercase">Start Date</Label>
              <Input defaultValue={legacyTask.startDate} readOnly className="mt-1 bg-slate-50" />
            </div>
            <div>
              <Label className="text-slate-500 text-xs font-bold uppercase">Project</Label>
              <Input defaultValue={legacyTask.project} readOnly className="mt-1 bg-slate-50" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-slate-500 text-xs font-bold uppercase">Task Notes (Append on top)</Label>
              <Textarea rows={6} value={legacyNotes} onChange={(e) => setLegacyNotes(e.target.value)} className="mt-1 bg-white" />
            </div>
            <div>
              <Label className="text-slate-500 text-xs font-bold uppercase">Task Status Update</Label>
              <Select value={legacyStatus} onValueChange={(v: any) => setLegacyStatus(v)}>
                <SelectTrigger className="bg-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="wanting-requirements">Wanting Requirements</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex gap-2 pt-4">
              <Button
                className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs px-6 py-2.5"
                onClick={() => {
                  // If backend is running, try to call backend PUT endpoint
                  fetch(`http://${window.location.hostname}:8000/api/tasks/${id}/status`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: legacyStatus })
                  }).catch(e => console.warn("Backend legacy task status update failed. Saved locally."));

                  updateLegacyTask(id, { status: legacyStatus, notes: legacyNotes });
                  router.navigate({ to: "/user/tasks" });
                }}
              >
                Update Ticket
              </Button>
              <Button variant="outline" className="bg-white text-xs font-semibold px-6" onClick={() => router.navigate({ to: "/user/tasks" })}>
                Cancel
              </Button>
            </div>
          </div>
        </PageCard>
      </div>
    );
  }

  // ── RENDER 2: MILESTONE 2 PROJECT TASK EXECUTION SCREEN ──
  const projObj = projects.find(p => p.id === projectTask.projectId);

  const handleStatusTransition = async (newStatus: "in_progress" | "paused" | "completed") => {
    setLoading(true);
    try {
      const endpoint = newStatus === "in_progress" ? "start" : newStatus === "paused" ? "pause" : "complete";
      await fetch(`http://${window.location.hostname}:8000/api/tasks/${id}/${endpoint}`, {
        method: "POST"
      });
    } catch (e) {
      console.warn("Backend task action failed. Updating state locally.");
    }
    updateProjectTaskStatus(id, newStatus);
    setLoading(false);
  };

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    const hours = parseFloat(logHours);
    if (isNaN(hours) || hours <= 0) return;

    setLoading(true);
    try {
      await fetch(`http://${window.location.hostname}:8000/api/tasks/${id}/log-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hours_logged: hours,
          notes: logNotes || null
        })
      });
    } catch (err) {
      console.warn("Backend log time failed. Saving locally.");
    }

    logTimeForTask(id, hours, logNotes || null);
    setLogHours("");
    setLogNotes("");
    setLoading(false);
  };

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      <div className="flex items-center">
        <Button variant="link" className="text-teal-600 hover:text-teal-800 p-0 text-xs font-bold" onClick={() => router.navigate({ to: "/user/tasks" })}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Tasks
        </Button>
      </div>

      {/* Task Header */}
      <header className="bg-white border p-5 rounded-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] bg-teal-50 border border-teal-200 text-teal-800 px-2 py-0.5 rounded font-extrabold uppercase tracking-wide">
            {projObj ? projObj.name : "Project Task"}
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#115e59] mt-2">{projectTask.taskName}</h2>
          <p className="text-xs text-slate-500 mt-1">{projectTask.description}</p>
        </div>

        <div className="flex flex-col items-center shrink-0">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estimated Effort</span>
          <span className="text-2xl font-extrabold text-teal-800 mt-1">{projectTask.estimatedHours} Hours</span>
        </div>
      </header>

      <div className="grid md:grid-cols-12 gap-6">
        {/* Left Column: Status controllers and Log Time */}
        <div className="md:col-span-7 space-y-6">
          {/* Status Controllers */}
          <PageCard title="Task Tracking & Activity Control">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500">Current State:</span>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                  projectTask.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : projectTask.status === 'in_progress'
                    ? 'bg-sky-100 text-sky-800 border border-sky-200 animate-pulse'
                    : projectTask.status === 'paused'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {projectTask.status === 'in_progress' ? 'Running' : projectTask.status === 'completed' ? 'Finished' : projectTask.status}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  disabled={projectTask.status === "in_progress" || projectTask.status === "completed" || loading}
                  onClick={() => handleStatusTransition("in_progress")}
                  className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 py-2 flex items-center gap-1.5 shadow-sm"
                >
                  <Play className="w-3.5 h-3.5" /> Start Task
                </Button>
                <Button
                  disabled={projectTask.status !== "in_progress" || loading}
                  onClick={() => handleStatusTransition("paused")}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2 flex items-center gap-1.5 shadow-sm"
                >
                  <Pause className="w-3.5 h-3.5" /> Pause Task
                </Button>
                <Button
                  disabled={projectTask.status === "completed" || loading}
                  onClick={() => handleStatusTransition("completed")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" /> Mark Completed
                </Button>
              </div>
            </div>
          </PageCard>

          {/* Log Time Form */}
          <PageCard title="Log Work Effort Hours">
            <form onSubmit={handleLogTime} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <Label className="text-slate-500 font-bold text-xs uppercase">Hours Worked</Label>
                  <Input
                    type="number"
                    step="0.25"
                    placeholder="e.g. 4.5"
                    value={logHours}
                    onChange={(e) => setLogHours(e.target.value)}
                    required
                    className="mt-1 bg-white"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-slate-500 font-bold text-xs uppercase">Progress notes</Label>
                  <Input
                    placeholder="What did you complete?"
                    value={logNotes}
                    onChange={(e) => setLogNotes(e.target.value)}
                    className="mt-1 bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={loading || !logHours}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-5 py-2 flex items-center gap-1 shadow-sm"
                >
                  <Clock className="w-4 h-4" /> Log Effort Hours
                </Button>
              </div>
            </form>
          </PageCard>
        </div>

        {/* Right Column: Time logs list & transitions history */}
        <div className="md:col-span-5 space-y-6">
          {/* Progress Indicators */}
          <div className="bg-white border p-5 rounded-lg shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-teal-600" /> Task Progress Rate
            </span>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-extrabold text-slate-800 text-lg">{projectTask.actualHours} / {projectTask.estimatedHours} hrs</span>
              <span className="font-extrabold text-teal-700 text-xs">
                {projectTask.estimatedHours > 0 ? Math.round((projectTask.actualHours / projectTask.estimatedHours) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
              <div 
                className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${projectTask.estimatedHours > 0 ? Math.min(100, Math.round((projectTask.actualHours / projectTask.estimatedHours) * 100)) : 0}%` }}
              />
            </div>
          </div>

          {/* Time logs history */}
          <PageCard title="Logged Effort History">
            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
              {timeLogs.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No effort logged yet for this task.</p>
              ) : (
                timeLogs.slice().reverse().map((log) => (
                  <div key={log.id} className="p-3 border border-slate-100 bg-slate-50/50 rounded text-xs flex justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-700">{log.notes || "Effort hours log"}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {new Date(log.loggedAt).toLocaleDateString("en-GB")} {new Date(log.loggedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded shrink-0 h-fit self-center">
                      {log.hoursLogged} hrs
                    </div>
                  </div>
                ))
              )}
            </div>
          </PageCard>

          {/* Activity transition logs */}
          <PageCard title="Task Transitions Activity">
            <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
              {activityLogs.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No task activity recorded yet.</p>
              ) : (
                activityLogs.slice().reverse().map((log) => (
                  <div key={log.id} className="text-xs flex justify-between items-center py-1 border-b last:border-0 last:pb-0">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      log.action === "started" ? "bg-sky-50 text-sky-700" : log.action === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </PageCard>
        </div>
      </div>
    </div>
  );
}
