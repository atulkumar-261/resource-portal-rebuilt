import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useRMS } from "@/lib/store";
import { PageCard } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import type { ProjectProgress } from "@/lib/types";
import {
  TrendingUp,
  Clock,
  AlertTriangle,
  Award,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/projects/$id/progress")({
  component: ProjectProgressPage,
});

function ProjectProgressPage() {
  const { id } = Route.useParams();
  const projects = useRMS((s) => s.projects);
  const fetchProjectProgress = useRMS((s) => s.fetchProjectProgress);

  const [progress, setProgress] = useState<ProjectProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const project = projects.find((p) => p.id === id);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchProjectProgress(id);
        setProgress(data);
      } catch (err) {
        toast.error("Failed to load project progress statistics.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (!project) {
    return <div className="p-8 text-center text-slate-500 italic">Project not found.</div>;
  }

  // Calculate SVG Burndown chart scaling
  const maxVal = progress?.estimatedHours || 100;
  const points = progress?.burndownData || [];
  const width = 500;
  const height = 180;
  const padding = 20;

  const getPlannedPath = () => {
    if (points.length === 0) return "";
    return points
      .map((p, idx) => {
        const x = padding + (idx / (points.length - 1)) * (width - 2 * padding);
        const y = height - padding - (p.plannedRemainingHours / maxVal) * (height - 2 * padding);
        return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  const getActualPath = () => {
    if (points.length === 0) return "";
    return points
      .map((p, idx) => {
        const x = padding + (idx / (points.length - 1)) * (width - 2 * padding);
        const y = height - padding - (p.actualRemainingHours / maxVal) * (height - 2 * padding);
        return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto">
      <header className="border-b pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#115e59] flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-teal-600 animate-pulse" />
            Project Progress: {project.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Weighted module completion audit, effort aggregates, and burndown metrics.</p>
        </div>
        {progress && (
          <Badge className={`font-bold text-xs uppercase tracking-wider px-3.5 py-1 rounded shadow-sm self-start sm:self-auto border ${
            progress.riskLevel === 'high' ? 'bg-rose-50 border-rose-300 text-rose-800' :
            progress.riskLevel === 'medium' ? 'bg-amber-50 border-amber-300 text-amber-800' :
            'bg-teal-50 border-teal-300 text-teal-800'
          }`}>
            Risk Index: {progress.riskLevel}
          </Badge>
        )}
      </header>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 bg-white border rounded">
          <div className="w-9 h-9 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-bold">Aggregating weighted progress arrays...</p>
        </div>
      ) : !progress ? (
        <div className="p-12 text-center text-slate-400 italic bg-white border rounded">
          Progress metrics could not be computed for this project.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Overview Cards Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Overall Gauge Dial */}
            <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Weighted Project Completion</span>
              <div className="relative w-36 h-36 mt-4 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="72" cy="72" r="58" stroke="#f1f5f9" strokeWidth="10" fill="transparent" />
                  <circle
                    cx="72"
                    cy="72"
                    r="58"
                    stroke="#0d9488"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={364}
                    strokeDashoffset={364 - (progress.overallProgress / 100) * 364}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-3xl font-extrabold text-slate-800">{Math.round(progress.overallProgress)}%</span>
                  <span className="text-[9px] text-slate-400 font-bold block uppercase mt-0.5">Weighted Complete</span>
                </div>
              </div>
            </div>

            {/* Hours comparison cards */}
            <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Project Scope Hours</span>
              
              <div className="my-4 space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-slate-400" /> Estimated Work:</span>
                  <strong className="text-slate-800 font-mono text-base">{progress.estimatedHours} hrs</strong>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#115e59]" /> Actual Effort Logged:</span>
                  <strong className="text-[#115e59] font-mono text-base">{progress.actualHours} hrs</strong>
                </div>
              </div>

              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#115e59] h-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, (progress.actualHours / (progress.estimatedHours || 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* AI insights and warnings summary */}
            <div className={`border p-6 rounded-lg shadow-sm flex flex-col justify-between ${
              progress.riskLevel === 'high' ? 'bg-rose-50 border-rose-200 text-rose-800' :
              progress.riskLevel === 'medium' ? 'bg-amber-50 border-amber-200 text-amber-800' :
              'bg-teal-50 border-teal-200 text-teal-800'
            }`}>
              <div className="space-y-3">
                <h3 className="font-extrabold text-xs uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-4.5 h-4.5 text-amber-500 animate-spin" style={{ animationDuration: '8s' }} />
                  AI Risk warnings & Alerts
                </h3>
                {progress.riskWarnings.length === 0 ? (
                  <div className="text-xs flex items-center gap-1.5 py-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>No active blocker flags or completion discrepancies detected.</span>
                  </div>
                ) : (
                  <ul className="space-y-2 max-h-[100px] overflow-y-auto pl-2 pr-1 list-disc text-[11px] leading-relaxed">
                    {progress.riskWarnings.slice(0, 3).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                    {progress.riskWarnings.length > 3 && (
                      <li className="list-none font-bold text-[9px] text-slate-400 uppercase">
                        + {progress.riskWarnings.length - 3} more alerts raised
                      </li>
                    )}
                  </ul>
                )}
              </div>
              <Badge className="w-max mt-3 font-bold text-[9px] uppercase tracking-wider bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm text-slate-800">
                Compliance Audited
              </Badge>
            </div>
          </section>

          {/* Module-Level progress cards */}
          <PageCard title="Requirement Modules Breakdown">
            {progress.moduleProgress.length === 0 ? (
              <div className="py-8 text-center text-slate-400 italic text-xs">No active requirements modules.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {progress.moduleProgress.map((mod) => (
                  <div key={mod.moduleId} className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex flex-col justify-between shadow-sm">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">{mod.moduleName}</h4>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 font-mono">
                        <span>Scope: {mod.estimatedHours} hrs</span>
                        <span>Logged: {mod.completedHours} hrs</span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold">Progress</span>
                        <strong className="text-teal-600">{Math.round(mod.progress)}%</strong>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-teal-600 h-full transition-all duration-1000"
                          style={{ width: `${mod.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PageCard>

          {/* Burndown chart */}
          <PageCard title="Project Work Burndown Chart">
            <div className="space-y-4">
              <p className="text-xs text-slate-500 font-medium leading-relaxed leading-normal">
                Depicts planned remaining work hours (teal path) vs actual remaining work hours (amber path) based on log audits.
              </p>
              
              {points.length === 0 ? (
                <div className="py-12 text-center text-slate-400 italic text-xs">Chart path unavailable. Seeding timeline entries.</div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col items-center overflow-x-auto">
                  <svg width={width} height={height} className="overflow-visible font-mono text-[9px] text-slate-500">
                    {/* Grid Lines */}
                    <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeDasharray="3" />
                    <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#334155" strokeDasharray="3" />
                    <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#475569" />

                    {/* Chart Paths */}
                    <path d={getPlannedPath()} fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" />
                    <path d={getActualPath()} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />

                    {/* Nodes */}
                    {points.map((p, idx) => {
                      const x = padding + (idx / (points.length - 1)) * (width - 2 * padding);
                      const yPlan = height - padding - (p.plannedRemainingHours / maxVal) * (height - 2 * padding);
                      const yAct = height - padding - (p.actualRemainingHours / maxVal) * (height - 2 * padding);

                      return (
                        <g key={idx}>
                          <circle cx={x} cy={yPlan} r="3.5" fill="#0ea5e9" />
                          <circle cx={x} cy={yAct} r="3.5" fill="#f59e0b" />
                          <text x={x - 10} y={height - 5} fill="#94a3b8" className="text-[8px]">
                            {p.workDate.slice(5)}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  
                  {/* Legend */}
                  <div className="flex gap-4 mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-[#0ea5e9] rounded" /> Planned Remaining</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-[#f59e0b] rounded" /> Actual Remaining</span>
                  </div>
                </div>
              )}
            </div>
          </PageCard>

        </div>
      )}
    </div>
  );
}
