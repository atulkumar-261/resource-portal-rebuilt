import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useRMS } from "@/lib/store";
import { PageCard } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import type { ProductivityMetrics } from "@/lib/types";
import { isResourceAssignable } from "@/lib/types";
import {
  Award,
  Clock,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  UserCheck,
  Zap,
  Activity,
  Flame,
  Frown,
  Users
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/productivity")({
  component: AdminProductivityDashboardPage,
});

function AdminProductivityDashboardPage() {
  const resources = useRMS((s) => s.resources);
  const projects = useRMS((s) => s.projects);
  const projectTasks = useRMS((s) => s.projectTasks);
  const fetchProductivity = useRMS((s) => s.fetchProductivity);

  const [teamProductivity, setTeamProductivity] = useState<ProductivityMetrics[]>([]);
  const [projectProductivity, setProjectProductivity] = useState<ProductivityMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Fetch productivity statistics for all developers
        const resPromises = resources.filter(isResourceAssignable).map((r) => fetchProductivity(r.id, false));
        const resProd = await Promise.all(resPromises);
        setTeamProductivity(resProd.filter((p) => p !== null));

        // Fetch productivity statistics for all projects
        const projPromises = projects.map((p) => fetchProductivity(p.id, true));
        const projProd = await Promise.all(projPromises);
        setProjectProductivity(projProd.filter((p) => p !== null));

      } catch (err) {
        toast.error("Failed to load team productivity aggregates.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [resources, projects]);

  // Derived metrics: Top Contributors (highest reportsSubmitted or hoursLogged)
  const topContributors = [...teamProductivity]
    .sort((a, b) => b.hoursLogged - a.hoursLogged)
    .slice(0, 4);

  // Derived metrics: Most Delayed Tasks (tasks overdue but not completed)
  const todayStr = new Date().toISOString().split("T")[0];
  const delayedTasks = projectTasks.filter(
    (t) => t.endDate && t.endDate < todayStr && t.status !== "completed"
  );

  // Calculate average team efficiency score
  const avgEfficiency = teamProductivity.length > 0
    ? Math.round(
        teamProductivity.reduce((sum, p) => sum + (p.efficiencyMetrics?.efficiencyScore ?? 100), 0) /
          teamProductivity.length
      )
    : 100;

  return (
    <div className="space-y-6 text-left max-w-6xl mx-auto">
      <header className="border-b pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#115e59] flex items-center gap-2">
          <Zap className="w-8 h-8 text-amber-500 fill-amber-100 animate-bounce" /> Team Productivity & Efficiency
        </h1>
        <p className="text-sm text-slate-500 mt-1">Monitor contributor rankings, track streak lines, and trace reporting compliance.</p>
      </header>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 bg-white border rounded">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-bold">Compiling team productivity matrices...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Productivity Stats Grid */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm text-center relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-2 right-2 text-amber-500">
                <Flame className="w-5 h-5 fill-amber-100 animate-pulse" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Team Avg Efficiency</span>
              <span className="text-2xl font-extrabold text-teal-600 mt-2 block">{avgEfficiency}%</span>
              <p className="text-[9px] text-slate-400 mt-1">Average quality pre-audits pass</p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm text-center flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hours Logged (MTD)</span>
              <span className="text-2xl font-extrabold text-[#115e59] mt-2 block">
                {Math.round(teamProductivity.reduce((sum, p) => sum + p.hoursLogged, 0))} hrs
              </span>
              <p className="text-[9px] text-slate-400 mt-1">Effort reported in daily logs</p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm text-center flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tasks Completed</span>
              <span className="text-2xl font-extrabold text-[#115e59] mt-2 block">
                {teamProductivity.reduce((sum, p) => sum + p.tasksCompleted, 0)} Tasks
              </span>
              <p className="text-[9px] text-slate-400 mt-1">Incomplete tickets resolved</p>
            </div>

            <div className={`border p-5 rounded-lg shadow-sm text-center flex flex-col justify-between ${
              delayedTasks.length > 0 ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-white border-slate-200'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Delayed Tickets</span>
              <span className="text-2xl font-extrabold text-rose-600 mt-2 block">{delayedTasks.length} Overdue</span>
              <p className="text-[9px] text-slate-400 mt-1">Tasks past scheduled delivery</p>
            </div>
          </section>

          {/* Top Contributors & Delayed Tasks Columns */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Top Contributors Card */}
            <div className="lg:col-span-2">
              <PageCard title="Top Developer Contributors" actions={<Award className="w-5 h-5 text-amber-500" />}>
                <div className="space-y-4">
                  {topContributors.map((c, idx) => (
                    <div key={c.id} className="flex justify-between items-center text-xs border-b pb-3 last:border-b-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-amber-50 text-amber-700 font-extrabold rounded-full flex items-center justify-center shrink-0 border border-amber-200">
                          #{idx + 1}
                        </div>
                        <div>
                          <strong className="text-slate-800 text-sm block">{c.name}</strong>
                          <span className="text-[10px] text-slate-400">Logged streak: {c.reportingStreak} days | Tasks: {c.tasksCompleted}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <strong className="text-[#115e59] text-sm font-mono block">{c.hoursLogged} hrs</strong>
                        <span className="text-[9px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded uppercase">
                          {c.efficiencyMetrics?.efficiencyScore}% Eff
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </PageCard>
            </div>

            {/* Overdue/Delayed Tasks Widget */}
            <div>
              <PageCard title="Delayed / Overdue Tasks" actions={<AlertTriangle className="w-5 h-5 text-rose-500" />}>
                {delayedTasks.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 italic text-xs">No overdue tasks. All schedules on target!</div>
                ) : (
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {delayedTasks.map((t) => (
                      <div key={t.id} className="p-3 border border-rose-200 bg-rose-50/20 rounded text-xs space-y-1">
                        <span className="font-extrabold text-rose-900 block truncate" title={t.taskName}>{t.taskName}</span>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                          <span>Owner: {t.resourceName}</span>
                          <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-bold">{t.endDate}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </PageCard>
            </div>

          </section>

          {/* Project-level productivity overview */}
          <PageCard title="Project Team Compliance & Streaks">
            {projectProductivity.length === 0 ? (
              <div className="py-8 text-center text-slate-400 italic text-xs">No active project reporting files.</div>
            ) : (
              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b">
                    <tr>
                      <th className="p-3.5 text-left">Project Name</th>
                      <th className="p-3.5 text-left">Logs Submitted</th>
                      <th className="p-3.5 text-left">Hours Logged</th>
                      <th className="p-3.5 text-left">Current Progress</th>
                      <th className="p-3.5 text-left">Avg Team Streak</th>
                      <th className="p-3.5 text-left">Metrics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {projectProductivity.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-bold text-slate-800">{p.name}</td>
                        <td className="p-3.5 font-semibold font-mono text-[#115e59]">{p.reportsSubmitted} Logs</td>
                        <td className="p-3.5 font-mono">{p.hoursLogged} hrs</td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-teal-600">{p.currentProgress}%</span>
                            <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden shrink-0">
                              <div className="bg-teal-600 h-full" style={{ width: `${p.currentProgress}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-bold text-slate-600 flex items-center gap-1">
                          <Flame className="w-4 h-4 text-amber-500 fill-amber-100" /> {p.reportingStreak} Days
                        </td>
                        <td className="p-3.5">
                          <span className="text-slate-400 text-[10px]">
                            Devs: {p.efficiencyMetrics?.activeDevelopers || 0} | Tasks: {p.efficiencyMetrics?.tasksTotal || 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PageCard>

        </div>
      )}
    </div>
  );
}
