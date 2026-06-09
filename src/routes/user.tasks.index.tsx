import { createFileRoute, useRouter } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth, useRMS } from "@/lib/store";
import { useState } from "react";
import { ListTodo, Ticket, Play, CheckCircle } from "lucide-react";

export const Route = createFileRoute('/user/tasks/')({
  component: UserTasksPage,
});

function UserTasksPage() {
  const resourceId = useAuth((s) => s.resourceId) ?? "177";
  const router = useRouter();

  // Load both legacy and new project tasks
  const legacyTasks = useRMS((s) => s.tasks.filter((t) => t.resourceId === resourceId));
  const projectTasks = useRMS((s) => s.projectTasks.filter((t) => t.resourceId === resourceId));
  const projects = useRMS((s) => s.projects);

  const [activeTab, setActiveTab] = useState<"project" | "legacy">("project");

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto">
      <header className="border-b pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#115e59]">My Tasks</h1>
        <p className="text-sm text-slate-500 mt-1">Review work packages, log hours, and update execution statuses.</p>
      </header>

      {/* Tabs selectors */}
      <div className="flex border-b border-slate-200 gap-1 bg-slate-50 p-1.5 rounded-t-lg">
        <button
          onClick={() => setActiveTab("project")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
            activeTab === "project"
              ? "bg-white text-teal-800 shadow"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          }`}
        >
          <ListTodo className="w-4 h-4 text-teal-600" /> AI Project Tasks ({projectTasks.length})
        </button>
        <button
          onClick={() => setActiveTab("legacy")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
            activeTab === "legacy"
              ? "bg-white text-teal-800 shadow"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          }`}
        >
          <Ticket className="w-4 h-4 text-slate-500" /> Legacy Tickets ({legacyTasks.length})
        </button>
      </div>

      {activeTab === "project" && (
        <PageCard title="Active Work Breakdown Tasks">
          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-3 text-left">Task Name</th>
                  <th className="p-3 text-left">Project</th>
                  <th className="p-3 text-center">Dates</th>
                  <th className="p-3 text-center">Est. Hours</th>
                  <th className="p-3 text-center">Actual Hours</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {projectTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 italic">No project tasks assigned to you.</td>
                  </tr>
                ) : (
                  projectTasks.map((t) => {
                    const projObj = projects.find(p => p.id === t.projectId);
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">{t.taskName}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{t.description}</div>
                        </td>
                        <td className="p-3 font-semibold text-slate-600">{projObj ? projObj.name : "Project"}</td>
                        <td className="p-3 text-center font-medium text-slate-500">{t.startDate ? `${t.startDate} to ${t.endDate}` : "TBD"}</td>
                        <td className="p-3 text-center font-bold text-slate-700">{t.estimatedHours}h</td>
                        <td className="p-3 text-center font-bold text-indigo-600">{t.actualHours}h</td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold ${
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
                        <td className="p-3 text-center">
                          <Button
                            size="sm"
                            className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-3 py-1"
                            onClick={() => router.navigate({ to: "/user/tasks/$id", params: { id: t.id } })}
                          >
                            Track & Log
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </PageCard>
      )}

      {activeTab === "legacy" && (
        <PageCard title="Legacy Ticketing System">
          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-3 text-left">Subject</th>
                  <th className="p-3 text-left">Project</th>
                  <th className="p-3 text-center">Start Date</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {legacyTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">No legacy tasks found.</td>
                  </tr>
                ) : (
                  legacyTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-800">{t.subject}</td>
                      <td className="p-3 font-semibold text-slate-600">{t.project}</td>
                      <td className="p-3 text-center font-medium text-slate-500">{t.startDate}</td>
                      <td className="p-3 text-center">
                        <Badge variant="secondary" className="capitalize text-[10px] font-bold">
                          {t.status.replace(/-/g, " ")}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="link"
                          className="text-teal-600 hover:text-teal-800 text-xs font-bold"
                          onClick={() => router.navigate({ to: "/user/tasks/$id", params: { id: t.id } })}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </PageCard>
      )}
    </div>
  );
}
