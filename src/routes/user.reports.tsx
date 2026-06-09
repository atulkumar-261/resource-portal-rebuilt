import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth, useRMS } from "@/lib/store";
import { PageCard } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DailyReportModal } from "@/components/shared/DailyReportModal";
import type { DailyReport, ProductivityMetrics } from "@/lib/types";
import {
  FileText,
  Clock,
  CheckCircle2,
  Flame,
  Plus,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  AlertCircle
} from "lucide-react";

export const Route = createFileRoute("/user/reports")({
  component: UserReportsPage,
});

function UserReportsPage() {
  const resourceId = useAuth((s) => s.resourceId) || "177";
  const fetchMyReports = useRMS((s) => s.fetchMyReports);
  const fetchProductivity = useRMS((s) => s.fetchProductivity);

  const [reports, setReports] = useState<DailyReport[]>([]);
  const [productivity, setProductivity] = useState<ProductivityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [reps, prod] = await Promise.all([
      fetchMyReports(resourceId),
      fetchProductivity(resourceId, false),
    ]);
    setReports(reps);
    setProductivity(prod);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [resourceId]);

  const toggleExpand = (id: string) => {
    setExpandedReportId(expandedReportId === id ? null : id);
  };

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#115e59]">Daily Work Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Review logged hours, check streaks, and audit AI feedback.</p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#115e59] hover:bg-[#0f4d49] text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 flex items-center gap-1.5 shadow-md active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Log Today's Work
        </Button>
      </header>

      {/* Resource Productivity Stats Widget */}
      {productivity && (
        <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded shadow-sm text-center relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-2 right-2 text-rose-500">
              <Flame className="w-5 h-5 fill-rose-100 animate-pulse" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reporting Streak</span>
            <span className="text-2xl font-extrabold text-[#115e59] mt-2 block">{productivity.reportingStreak} Days</span>
            <p className="text-[9px] text-slate-400 mt-1.5">Consecutive logged workdays</p>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded shadow-sm text-center flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Logs Submitted</span>
            <span className="text-2xl font-extrabold text-[#115e59] mt-2 block">{productivity.reportsSubmitted} Logs</span>
            <p className="text-[9px] text-slate-400 mt-1.5">Total daily report counts</p>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded shadow-sm text-center flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Logged Hours</span>
            <span className="text-2xl font-extrabold text-[#115e59] mt-2 block">{productivity.hoursLogged} Hrs</span>
            <p className="text-[9px] text-slate-400 mt-1.5">Accumulated project effort</p>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded shadow-sm text-center flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tasks Completed</span>
            <span className="text-2xl font-extrabold text-[#115e59] mt-2 block">{productivity.tasksCompleted} Tasks</span>
            <p className="text-[9px] text-slate-400 mt-1.5">Closed planning tickets</p>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded shadow-sm text-center flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Audit Efficiency</span>
            <span className="text-2xl font-extrabold text-teal-600 mt-2 block">
              {productivity.efficiencyMetrics?.efficiencyScore ?? 100}%
            </span>
            <p className="text-[9px] text-slate-400 mt-1.5">AI quality analysis metric</p>
          </div>
        </section>
      )}

      {/* Main Reports List */}
      <PageCard title="Reporting History Log">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-bold">Retrieving report logs...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center text-slate-400 italic text-sm">
            No daily work reports logged yet. Click "Log Today's Work" to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((r) => {
              const isExpanded = expandedReportId === r.id;
              const hasFlags = r.flags && r.flags.length > 0;
              const riskColor = 
                r.analysisResult?.riskLevel === 'high' ? 'text-rose-600 bg-rose-50 border-rose-200' :
                r.analysisResult?.riskLevel === 'medium' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                'text-teal-600 bg-teal-50 border-teal-200';

              return (
                <div key={r.id} className="border border-slate-200 rounded overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Summary Bar */}
                  <div
                    onClick={() => toggleExpand(r.id)}
                    className="p-4 bg-white hover:bg-slate-50/50 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-50 text-[#115e59] rounded-full flex items-center justify-center font-extrabold text-xs shrink-0">
                        {r.hoursWorked}h
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-800 text-sm">{r.projectName || "Project Tasks"}</div>
                        <div className="text-[11px] text-slate-400 font-bold mt-0.5">
                          Work Date: {new Date(r.workDate).toLocaleDateString("en-GB", { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {hasFlags && (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 font-bold text-[9px] uppercase">
                          <AlertTriangle className="w-2.5 h-2.5 mr-1" /> Flags Raised
                        </Badge>
                      )}
                      <Badge className={`font-bold text-[9px] uppercase border px-2 py-0.5 rounded ${riskColor}`}>
                        Risk: {r.analysisResult?.riskLevel || "low"}
                      </Badge>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-5 text-xs text-slate-700 animate-in slide-in-from-top-4 duration-200">
                      
                      {/* Sub-inputs Grid */}
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="bg-white border p-3.5 rounded shadow-sm">
                          <span className="text-[10px] font-extrabold text-[#115e59] uppercase tracking-wider block mb-1">Work Accomplished</span>
                          <p className="text-xs text-slate-600 leading-relaxed leading-normal">{r.workDone || "No description logged."}</p>
                        </div>
                        <div className="bg-white border p-3.5 rounded shadow-sm border-l-4 border-l-teal-500">
                          <span className="text-[10px] font-extrabold text-teal-800 uppercase tracking-wider block mb-1">Plan for Tomorrow</span>
                          <p className="text-xs text-slate-600 leading-relaxed leading-normal">{r.tomorrowPlan || "No plan logged."}</p>
                        </div>
                        <div className={`bg-white border p-3.5 rounded shadow-sm ${r.blockers ? 'border-l-4 border-l-rose-500 bg-rose-50/20' : ''}`}>
                          <span className="text-[10px] font-extrabold text-rose-800 uppercase tracking-wider block mb-1">Impediments / Blockers</span>
                          <p className="text-xs text-slate-600 leading-relaxed leading-normal">{r.blockers || "No blockers logged."}</p>
                        </div>
                      </div>

                      {/* Task-Level Items Breakdown */}
                      {r.items && r.items.length > 0 && (
                        <div className="space-y-2 bg-white border p-4 rounded shadow-sm">
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5 border-b pb-1">Task Breakdown Log</span>
                          <div className="space-y-3">
                            {r.items.map((it) => (
                              <div key={it.id} className="flex justify-between items-center text-xs pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                                <div>
                                  <span className="font-semibold text-slate-800">{it.taskName}</span>
                                  {it.comments && <p className="text-[10px] text-slate-400 italic mt-0.5">"{it.comments}"</p>}
                                </div>
                                <div className="text-right flex items-center gap-3 font-mono shrink-0">
                                  <span className="text-slate-400">Effort: <strong className="text-slate-700">{it.hoursSpent}h</strong></span>
                                  <span className="text-teal-600 bg-teal-50 px-2 py-0.5 rounded font-extrabold text-[10px]">{it.completionPercent}% Complete</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI Feedback Cache */}
                      {r.analysisResult && (
                        <div className="bg-slate-100 border border-slate-200 p-4 rounded flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                          <div className="space-y-2 flex-1">
                            <h4 className="font-extrabold text-[#115e59] text-xs flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-amber-500" /> AI Auditor Report Summary
                            </h4>
                            <p className="text-[11px] text-slate-600 leading-relaxed leading-normal">
                              {r.analysisResult.summary}
                            </p>

                            {/* Warnings/Flags display */}
                            {r.flags && r.flags.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {r.flags.map((flag) => (
                                  <div key={flag.id} className="flex items-center gap-1.5 text-[10px] text-amber-800 font-medium">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    <span>[{flag.flagType.toUpperCase()}] {flag.message}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0 bg-white border border-slate-200 px-4 py-3 rounded text-center">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Progress Quality</span>
                              <span className="text-2xl font-extrabold text-[#115e59]">{r.analysisResult.progressScore}%</span>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PageCard>

      {/* Reporting Popup Dialog */}
      <DailyReportModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          loadData(); // Reload history after log
        }}
      />
    </div>
  );
}
