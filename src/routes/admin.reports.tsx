import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useRMS, fetchWithTimeout } from "@/lib/store";
import { PageCard } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DailyReport } from "@/lib/types";
import {
  FileSearch,
  Users,
  Search,
  RefreshCw,
  AlertTriangle,
  HelpCircle,
  Clock,
  Sparkles,
  Calendar,
  ShieldAlert,
  UserCheck
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reports")({
  component: AdminReportsAuditPage,
});

function AdminReportsAuditPage() {
  const resources = useRMS((s) => s.resources);
  const projects = useRMS((s) => s.projects);
  const projectAssignments = useRMS((s) => s.projectAssignments);
  
  const fetchProjectReports = useRMS((s) => s.fetchProjectReports);
  const analyzeReport = useRMS((s) => s.analyzeReport);

  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedResourceId, setSelectedResourceId] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [missingReports, setMissingReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"submitted" | "missing">("submitted");

  const loadReports = async () => {
    setLoading(true);
    try {
      let fetched: DailyReport[] = [];
      if (selectedProjectId !== "all") {
        fetched = await fetchProjectReports(selectedProjectId);
      } else {
        // Fetch reports for all projects combined
        const promises = projects.map(p => fetchProjectReports(p.id));
        const results = await Promise.all(promises);
        fetched = results.flat();
      }

      // Sort by workDate descending
      fetched.sort((a, b) => new Date(b.workDate).getTime() - new Date(a.workDate).getTime());

      // Filter by resource if selected
      if (selectedResourceId !== "all") {
        fetched = fetched.filter(r => r.resourceId === selectedResourceId);
      }

      // Filter by date if selected
      if (selectedDate) {
        fetched = fetched.filter(r => r.workDate === selectedDate);
      }

      setReports(fetched);

      // Compute Missing Reports list
      await loadMissingReports();

    } catch (e) {
      console.error(e);
      toast.error("Failed to load audit reports.");
    } finally {
      setLoading(false);
    }
  };

  const loadMissingReports = async () => {
    try {
      const checkDay = selectedDate || new Date().toISOString().split("T")[0];
      const parsedDay = new Date(checkDay);
      if (parsedDay.getDay() === 0 || parsedDay.getDay() === 6) {
        // Weekends have no missing reports
        setMissingReports([]);
        return;
      }

      const resp = await fetchWithTimeout(`http://${window.location.hostname}:8000/api/reports/missing?work_date=${checkDay}`, {}, 1500);
      if (resp.ok) {
        const data = await resp.json();
        setMissingReports(data);
      } else {
        // Fallback calculations locally
        const missing = [];
        const activeAssignments = projectAssignments.filter(a => 
          selectedProjectId === "all" ? true : a.projectId === selectedProjectId
        );

        for (const assign of activeAssignments) {
          const hasReport = reports.some(r => 
            r.projectId === assign.projectId && 
            r.resourceId === assign.resourceId && 
            r.workDate === checkDay
          );

          if (!hasReport) {
            const resObj = resources.find(r => r.id === assign.resourceId);
            const projObj = projects.find(p => p.id === assign.projectId);
            missing.push({
              resourceId: assign.resourceId,
              resourceName: resObj?.fullName || "Developer",
              projectId: assign.projectId,
              projectName: projObj?.name || "Project",
              workDate: checkDay
            });
          }
        }
        setMissingReports(missing);
      }
    } catch (err) {
      console.warn("Backend missing reports API offline. Running local checks.");
    }
  };

  useEffect(() => {
    loadReports();
  }, [selectedProjectId, selectedResourceId, selectedDate]);

  const handleManualReAnalyze = async (reportId: string) => {
    toast.loading("Running AI Pre-Audit checklist...");
    try {
      await analyzeReport(reportId);
      toast.dismiss();
      toast.success("AI analysis successfully re-evaluated!");
      loadReports();
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to run manual analysis.");
    }
  };

  return (
    <div className="space-y-6 text-left max-w-6xl mx-auto">
      <header className="border-b pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#115e59] flex items-center gap-2">
          <FileSearch className="w-8 h-8 text-teal-600" /> Reports Audit Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">Audit developer submissions, trace AI warnings, and check missing gaps.</p>
      </header>

      {/* Audit Filters Bar */}
      <section className="bg-slate-50 border border-slate-200 p-5 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Select Project</Label>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="bg-white border-slate-200 mt-1.5 text-xs">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Select Resource</Label>
          <Select value={selectedResourceId} onValueChange={setSelectedResourceId}>
            <SelectTrigger className="bg-white border-slate-200 mt-1.5 text-xs">
              <SelectValue placeholder="All Developers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Developers</SelectItem>
              {resources.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Work Date</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white mt-1.5 text-xs h-9 border-slate-200"
          />
        </div>

        <div className="flex items-end">
          <Button
            onClick={loadReports}
            className="w-full bg-[#115e59] hover:bg-[#0f4d49] text-white text-xs font-bold uppercase tracking-wider h-9"
          >
            <Search className="w-4 h-4 mr-1.5" /> Refresh Audit
          </Button>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-1 bg-slate-50 p-1.5 rounded-t-lg">
        <button
          onClick={() => setActiveTab("submitted")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
            activeTab === "submitted"
              ? "bg-white text-teal-800 shadow"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          }`}
        >
          <UserCheck className="w-4 h-4 text-teal-600" /> Submitted Reports ({reports.length})
        </button>
        <button
          onClick={() => setActiveTab("missing")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
            activeTab === "missing"
              ? "bg-white text-teal-800 shadow animate-pulse"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-600" /> Missing Reports ({missingReports.length})
        </button>
      </div>

      {/* Results Card */}
      <PageCard title={activeTab === "submitted" ? "Audited Daily Reports" : "Compliance Submission Gaps"}>
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-bold">Scanning database registries...</p>
          </div>
        ) : activeTab === "submitted" ? (
          reports.length === 0 ? (
            <div className="py-16 text-center text-slate-400 italic text-sm">
              No daily reports logged for the selected filters.
            </div>
          ) : (
            <div className="space-y-6">
              {reports.map((r) => {
                const hasFlags = r.flags && r.flags.length > 0;
                return (
                  <div key={r.id} className="border border-slate-200 rounded-lg p-5 bg-white space-y-4 shadow-sm hover:shadow-md transition-shadow">
                    
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 text-xs">
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-800">{r.resourceName}</h3>
                        <p className="text-slate-400 mt-0.5">Project: <strong className="text-slate-600">{r.projectName}</strong> | Work Date: <strong className="text-slate-600">{r.workDate}</strong></p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {r.analysisResult && (
                          <Badge variant="outline" className={`font-bold text-[9px] uppercase px-2 py-0.5 rounded border ${
                            r.analysisResult.riskLevel === 'high' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            r.analysisResult.riskLevel === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-teal-50 text-teal-700 border-teal-200'
                          }`}>
                            Risk: {r.analysisResult.riskLevel}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleManualReAnalyze(r.id)}
                          className="h-8 w-8 text-teal-600 hover:text-teal-800 hover:bg-teal-50"
                          title="Re-run AI Analysis"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Report Text Entries */}
                    <div className="grid md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1 text-[9px]">Work Done</span>
                        <p className="text-slate-700 bg-slate-50 p-2.5 border rounded leading-relaxed leading-normal">{r.workDone || "Empty log."}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1 text-[9px]">Tomorrow Plan</span>
                        <p className="text-slate-700 bg-slate-50 p-2.5 border rounded leading-relaxed leading-normal">{r.tomorrowPlan || "Empty log."}</p>
                      </div>
                      <div>
                        <span className="font-bold text-rose-800 uppercase tracking-wider block mb-1 text-[9px]">Blockers</span>
                        <p className={`p-2.5 border rounded leading-relaxed leading-normal ${r.blockers ? 'bg-rose-50/50 text-rose-900 border-rose-200' : 'bg-slate-50 text-slate-700'}`}>
                          {r.blockers || "No blockers reported."}
                        </p>
                      </div>
                    </div>

                    {/* Task Breakdown Items */}
                    {r.items && r.items.length > 0 && (
                      <div className="bg-slate-50/50 border rounded p-4 text-xs space-y-2">
                        <span className="font-bold text-slate-500 uppercase tracking-wider block mb-2 text-[9px] border-b pb-1">Task Breakdown Logs</span>
                        {r.items.map((it) => (
                          <div key={it.id} className="flex justify-between items-center text-xs">
                            <div>
                              <strong className="text-slate-700">{it.taskName}</strong>
                              {it.comments && <p className="text-[10px] text-slate-400 italic">"{it.comments}"</p>}
                            </div>
                            <div className="flex gap-4 text-slate-400 font-mono">
                              <span>Effort: <strong className="text-slate-600">{it.hoursSpent} hrs</strong></span>
                              <span className="text-teal-600 bg-teal-50 px-2 py-0.5 rounded font-extrabold text-[10px]">{it.completionPercent}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* AI Feedback Cache & Warnings */}
                    {r.analysisResult && (
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div className="space-y-1.5 flex-1 text-xs">
                          <h4 className="font-bold text-[#115e59] flex items-center gap-1">
                            <Sparkles className="w-4 h-4 text-amber-500" /> AI Auditor Evaluation
                          </h4>
                          <p className="text-slate-600 leading-relaxed leading-normal">{r.analysisResult.summary}</p>
                          
                          {/* Flags listing */}
                          {hasFlags && (
                            <div className="mt-2 space-y-1">
                              {r.flags?.map((flag) => (
                                <div key={flag.id} className="flex items-center gap-1 text-[10px] text-amber-900 font-bold bg-amber-50 border border-amber-200 p-1.5 rounded">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>[{flag.flagType.toUpperCase()}] {flag.message}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="bg-white border px-4 py-2.5 rounded text-center shrink-0">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Score</span>
                          <span className="text-xl font-extrabold text-[#115e59]">{r.analysisResult.progressScore}%</span>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )
        ) : (
          missingReports.length === 0 ? (
            <div className="py-16 text-center text-emerald-600 font-bold flex flex-col items-center justify-center gap-2">
              <UserCheck className="w-10 h-10 text-emerald-500 animate-bounce" />
              <span>100% Submission Compliance. All developers submitted logs for this date!</span>
            </div>
          ) : (
            <div className="border border-slate-200 rounded overflow-hidden">
              <table className="w-full text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b">
                  <tr>
                    <th className="p-3.5 text-left">Developer</th>
                    <th className="p-3.5 text-left">Project Assigned</th>
                    <th className="p-3.5 text-left">Missing Date</th>
                    <th className="p-3.5 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {missingReports.map((mr, idx) => (
                    <tr key={idx} className="hover:bg-rose-50/10">
                      <td className="p-3.5 font-bold text-slate-800 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-rose-500" /> {mr.resourceName}
                      </td>
                      <td className="p-3.5 text-slate-600">{mr.projectName}</td>
                      <td className="p-3.5 text-slate-500 font-mono">{mr.workDate}</td>
                      <td className="p-3.5">
                        <span className="text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded font-extrabold text-[9px] uppercase">
                          Report Missing
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </PageCard>
    </div>
  );
}
