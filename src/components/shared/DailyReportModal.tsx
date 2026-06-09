import { useState, useEffect } from "react";
import { useRMS } from "@/lib/store";
import { useAuth } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  X,
  FileText,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon
} from "lucide-react";
import { toast } from "sonner";

interface DailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DailyReportModal({ isOpen, onClose }: DailyReportModalProps) {
  const resourceId = useAuth((s) => s.resourceId) || "177"; // Fallback to Asra Ghafoor for demo
  const projects = useRMS((s) => s.projects);
  const projectTasks = useRMS((s) => s.projectTasks);
  const submitDailyReport = useRMS((s) => s.submitDailyReport);

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [workDone, setWorkDone] = useState("");
  const [blockers, setBlockers] = useState("");
  const [tomorrowPlan, setTomorrowPlan] = useState("");
  const [hoursWorked, setHoursWorked] = useState(8.0);
  const [taskInputs, setTaskInputs] = useState<
    Record<string, { hoursSpent: number; completionPercent: number; comments: string }>
  >({});

  // Advisory warning states
  const [advisoryWarnings, setAdvisoryWarnings] = useState<string[]>([]);

  // Filter tasks assigned to resource for selected project
  const assignedTasks = projectTasks.filter(
    (t) => t.resourceId === resourceId && t.projectId === selectedProjectId && t.status !== "completed"
  );

  // Set default project on open
  useEffect(() => {
    if (isOpen && projects.length > 0) {
      // Find first project with assigned tasks
      const activeProj = projects.find(p => 
        projectTasks.some(t => t.projectId === p.id && t.resourceId === resourceId && t.status !== "completed")
      );
      setSelectedProjectId(activeProj?.id || projects[0]?.id || "");
    }
  }, [isOpen, projects, projectTasks, resourceId]);

  // Reset inputs when project changes
  useEffect(() => {
    const initialInputs: typeof taskInputs = {};
    assignedTasks.forEach((t) => {
      initialInputs[t.id] = {
        hoursSpent: 0,
        completionPercent: t.status === "in_progress" ? 30 : 0,
        comments: "",
      };
    });
    setTaskInputs(initialInputs);
  }, [selectedProjectId]);

  // Real-time advisory validation audit
  useEffect(() => {
    const warnings: string[] = [];
    
    // 1. Text length warning
    if (workDone.trim().length > 0 && workDone.trim().length < 15) {
      warnings.push("Work Done description is too vague. AI auditor will flag this as low-quality.");
    }
    
    // 2. Blocker warning
    const blockerLower = blockers.toLowerCase();
    if (blockers.trim() && ["blocked", "waiting", "issue", "delay", "stuck"].some(k => blockerLower.includes(k))) {
      warnings.push("Reported blockers will generate a warning flag for project administrators.");
    }

    // 3. Completion vs Effort check
    Object.entries(taskInputs).forEach(([taskId, values]) => {
      const task = projectTasks.find((t) => t.id === taskId);
      if (task && values.completionPercent >= 90 && task.estimatedHours >= 10 && values.hoursSpent <= 2) {
        warnings.push(`Completion mismatch warning: Mark progress on '${task.taskName}' is set to ${values.completionPercent}% but effort logged is only ${values.hoursSpent} hours.`);
      }
    });

    setAdvisoryWarnings(warnings);
  }, [workDone, blockers, taskInputs]);

  const handleTaskValueChange = (taskId: string, field: "hoursSpent" | "completionPercent" | "comments", val: any) => {
    setTaskInputs((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: val,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      toast.error("Please select a project.");
      return;
    }
    if (!workDone.trim()) {
      toast.error("Please fill in the Work Done summary.");
      return;
    }

    // Prepare task log items
    const items = Object.entries(taskInputs)
      .filter(([_, values]) => values.hoursSpent > 0 || values.completionPercent > 0)
      .map(([taskId, values]) => ({
        taskId,
        hoursSpent: Number(values.hoursSpent),
        completionPercent: Number(values.completionPercent),
        comments: values.comments,
      }));

    const totalTaskHours = items.reduce((sum, it) => sum + it.hoursSpent, 0);
    const finalHours = Math.max(hoursWorked, totalTaskHours);

    toast.loading("Submitting report and queueing AI audit...");

    try {
      await submitDailyReport(resourceId, {
        projectId: selectedProjectId,
        workDate: new Date().toISOString().split("T")[0],
        workDone,
        blockers: blockers || null,
        tomorrowPlan: tomorrowPlan || null,
        hoursWorked: finalHours,
      }, items);

      toast.dismiss();
      toast.success("Daily report submitted successfully!");
      
      // Reset state and close
      setWorkDone("");
      setBlockers("");
      setTomorrowPlan("");
      setHoursWorked(8.0);
      onClose();
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to submit daily report.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-lg max-w-2xl w-full flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <header className="flex justify-between items-center bg-[#115e59] text-white p-4 rounded-t-lg">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-300" />
            <h2 className="font-extrabold text-lg">Log Your Daily Progress</h2>
          </div>
          <button onClick={onClose} className="text-teal-200 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-left">
          
          {/* Project Selector */}
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Target Project</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="bg-white border-slate-200 mt-1">
                <SelectValue placeholder="Choose Project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assigned Tasks Grid */}
          {assignedTasks.length > 0 && (
            <div className="space-y-3 bg-slate-50 border border-slate-200 p-4 rounded">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1">
                <Clock className="w-4 h-4 text-teal-600" /> Log Task-level updates
              </Label>
              <div className="space-y-4 divide-y divide-slate-200">
                {assignedTasks.map((t) => {
                  const values = taskInputs[t.id] || { hoursSpent: 0, completionPercent: 0, comments: "" };
                  return (
                    <div key={t.id} className="pt-3 first:pt-0 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-semibold text-xs text-slate-800">{t.taskName}</span>
                          <p className="text-[10px] text-slate-400">Est Hours: {t.estimatedHours}h | Status: {t.status}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-[10px] text-slate-500 font-bold">Hours Spent</Label>
                          <Input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            placeholder="e.g. 3.5"
                            value={values.hoursSpent || ""}
                            onChange={(e) => handleTaskValueChange(t.id, "hoursSpent", parseFloat(e.target.value) || 0)}
                            className="bg-white h-8 text-xs mt-0.5"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-500 font-bold">Progress ({values.completionPercent}%)</Label>
                          <Input
                            type="range"
                            min="0"
                            max="100"
                            value={values.completionPercent}
                            onChange={(e) => handleTaskValueChange(t.id, "completionPercent", parseInt(e.target.value) || 0)}
                            className="w-full mt-2 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-500 font-bold">Task Comments</Label>
                          <Input
                            placeholder="Optional updates..."
                            value={values.comments}
                            onChange={(e) => handleTaskValueChange(t.id, "comments", e.target.value)}
                            className="bg-white h-8 text-xs mt-0.5"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Overall Report Text Inputs */}
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Work Done Summary *</Label>
              <Textarea
                placeholder="Detail the modules compiled, screens wired, or features completed..."
                rows={3}
                value={workDone}
                onChange={(e) => setWorkDone(e.target.value)}
                required
                className="bg-white mt-1 text-xs"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Tomorrow Plan</Label>
                <Textarea
                  placeholder="What will you work on next?"
                  rows={2}
                  value={tomorrowPlan}
                  onChange={(e) => setTomorrowPlan(e.target.value)}
                  className="bg-white mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 text-rose-700">Active Blockers</Label>
                <Textarea
                  placeholder="Any database specs or integrations blocking you?"
                  rows={2}
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  className="bg-white mt-1 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Total Shift Hours */}
          <div className="flex justify-between items-center bg-slate-50 border p-3 rounded">
            <div>
              <Label className="text-xs font-extrabold text-slate-800 uppercase">Total Shift Hours Worked</Label>
              <p className="text-[10px] text-slate-400">Total overall hours (defaults to 8.0 hrs)</p>
            </div>
            <Input
              type="number"
              min="0.5"
              max="24"
              step="0.5"
              value={hoursWorked}
              onChange={(e) => setHoursWorked(parseFloat(e.target.value) || 8.0)}
              className="w-20 text-center font-bold bg-white text-xs h-9 border-slate-300 text-[#115e59]"
            />
          </div>

          {/* Real-time Advisory Warnings */}
          {advisoryWarnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 p-3 rounded space-y-1.5">
              <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-600 animate-bounce" /> Advisory AI Pre-Audit Feedback
              </span>
              <ul className="list-disc pl-4 text-[10px] text-amber-900 space-y-1">
                {advisoryWarnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer Controls */}
          <footer className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-white border-slate-300 text-slate-700 text-xs font-semibold px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#115e59] hover:bg-[#0f4d49] text-white text-xs font-semibold px-5 py-2 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Submit Daily Report
            </Button>
          </footer>
        </form>
      </div>
    </div>
  );
}
