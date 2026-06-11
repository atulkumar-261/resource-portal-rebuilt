import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageCard } from "@/components/layout/AppShell";
import { useRMS, calculateResourceCapacity } from "@/lib/store";
import { isResourceAssignable } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { 
  Sparkles, 
  Settings, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  Briefcase, 
  Cpu, 
  Clock, 
  ShieldAlert,
  Calendar,
  ChevronRight,
  ChevronDown,
  ListTodo,
  UserPlus,
  Play
} from "lucide-react";

export const Route = createFileRoute("/admin/projects/new-ai")({
  component: AIProjectCreatorWizard,
});

// Types representing analysis states inside wizard
interface WizardModule {
  id: number;
  module_name: string;
  description: string;
  estimated_hours: number;
  priority: string;
  skills: Array<{ skill_name: string; required_level: string; mandatory: boolean }>;
}

const mockAnalyzeProject = (name: string, description: string, deadline: string) => {
  const descLower = (name + " " + description).toLowerCase();
  
  const modules: WizardModule[] = [
    {
      id: 1,
      module_name: "Frontend UI/UX",
      description: "User dashboard screens, tables, charts, responsive layouts, and forms.",
      estimated_hours: descLower.includes("simple") ? 60 : 120,
      priority: "High",
      skills: [
        { skill_name: "React", required_level: "Senior", mandatory: true },
        { skill_name: "TypeScript", required_level: "Intermediate", mandatory: true },
        { skill_name: "Tailwind", required_level: "Intermediate", mandatory: false }
      ]
    },
    {
      id: 2,
      module_name: "Backend REST API",
      description: "Database tables, FastAPI service endpoints, security middleware, and seeder logic.",
      estimated_hours: descLower.includes("simple") ? 80 : 160,
      priority: "High",
      skills: [
        { skill_name: "Python", required_level: "Senior", mandatory: true },
        { skill_name: "FastAPI", required_level: "Intermediate", mandatory: true },
        { skill_name: "PostgreSQL", required_level: "Intermediate", mandatory: true }
      ]
    }
  ];

  if (descLower.includes("ai") || descLower.includes("machine learning") || descLower.includes("predict")) {
    modules.push({
      id: 3,
      module_name: "AI Planning Engine",
      description: "Prompt optimization flow, cache lookups, and Python match engine services.",
      estimated_hours: 140,
      priority: "Medium",
      skills: [
        { skill_name: "Python", required_level: "Senior", mandatory: true },
        { skill_name: "Machine Learning", required_level: "Senior", mandatory: true }
      ]
    });
  }

  modules.push({
    id: 4,
    module_name: "Testing & QA",
    description: "Automated unit testing checks, integration assertions, and endpoint testing.",
    estimated_hours: 40,
    priority: "Low",
    skills: [
      { skill_name: "Python", required_level: "Intermediate", mandatory: true }
    ]
  });

  return {
    modules,
    timeline: "Week 1: Design & Scope validation.\nWeek 2-4: Backend APIs & SQL DDL schemas setup.\nWeek 3-6: Frontend layout wiring & components.\nWeek 7: Integration testing.\nWeek 8: Delivery."
  };
};

function AIProjectCreatorWizard() {
  const router = useRouter();
  
  // Zustand store actions and state
  const resources = useRMS((s) => s.resources);
  const activeResources = resources.filter(isResourceAssignable);
  const projects = useRMS((s) => s.projects);
  const projectRequirements = useRMS((s) => s.projectRequirements);
  const projectAssignments = useRMS((s) => s.projectAssignments);
  const projectTasks = useRMS((s) => s.projectTasks);
  const taskScheduleEntries = useRMS((s) => s.taskScheduleEntries);
  
  const addProject = useRMS((s) => s.addProject);
  const addProjectRequirements = useRMS((s) => s.addProjectRequirements);
  const assignResource = useRMS((s) => s.assignResourceToRequirement);
  const generateTasks = useRMS((s) => s.generateTasksForProject);
  const reassignTask = useRMS((s) => s.reassignProjectTask);
  const updateTask = useRMS((s) => s.updateProjectTask);
  const deleteProjectTask = useRMS((s) => s.deleteProjectTask);
  
  // Wizard step state: 1 to 8
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form input states (Step 1)
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [apiError, setApiError] = useState<string | null>(null);

  // Analysis states (Step 2)
  const [projectId, setProjectId] = useState("");
  const [modules, setModules] = useState<WizardModule[]>([]);
  const [timeline, setTimeline] = useState("");

  // Assignment tracking (Step 4)
  const [tempAssignments, setTempAssignments] = useState<Record<number, string>>({}); // module_id -> resource_id
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [assignAnywayModule, setAssignAnywayModule] = useState<number | null>(null);
  const [assignAnywayResource, setAssignAnywayResource] = useState<string | null>(null);

  // Active tasks generated for review (Step 6)
  const activeProjectTasks = projectTasks.filter(t => t.projectId === projectId);

  // Trigger AI Project Analysis
  const handleAnalyze = async () => {
    if (!projectName || !description) {
      setApiError("Project Name and Description are required.");
      return;
    }
    
    setLoading(true);
    setApiError(null);

    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/ai/projects/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: projectName,
          description: description,
          deadline: deadline || null,
          priority: priority,
          budget: budget ? parseFloat(budget) : null
        })
      });

      if (response.ok) {
        const data = await response.json();
        setProjectId(data.project_id);
        const mappedModules = data.modules.map((m: any, idx: number) => ({
          id: idx + 1,
          module_name: m.module_name,
          description: m.description || "",
          estimated_hours: m.estimated_hours,
          priority: m.priority || "Medium",
          skills: m.skills.map((s: any) => ({
            skill_name: s.skill_name,
            required_level: s.required_level || "Intermediate",
            mandatory: s.mandatory !== undefined ? s.mandatory : true
          }))
        }));
        setModules(mappedModules);
        setTimeline(data.timeline);
        setCurrentStep(2);
      } else {
        throw new Error("Backend response error. Falling back to offline simulator.");
      }
    } catch (err) {
      console.warn("FastAPI backend is offline. Running client-side AI simulation.", err);
      const simulated = mockAnalyzeProject(projectName, description, deadline);
      const mockId = "mock-proj-" + Math.floor(Math.random() * 100000);
      setProjectId(mockId);
      setModules(simulated.modules);
      setTimeline(simulated.timeline);
      setCurrentStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleAddModule = () => {
    const newId = modules.length > 0 ? Math.max(...modules.map(m => m.id)) + 1 : 1;
    const newModule: WizardModule = {
      id: newId,
      module_name: "New AI Module",
      description: "Enter a brief summary of tasks",
      estimated_hours: 80,
      priority: "Medium",
      skills: [{ skill_name: "React", required_level: "Intermediate", mandatory: true }]
    };
    setModules([...modules, newModule]);
  };

  const handleRemoveModule = (id: number) => {
    setModules(modules.filter(m => m.id !== id));
  };

  const handleUpdateModule = (id: number, key: keyof WizardModule, val: any) => {
    setModules(modules.map(m => m.id === id ? { ...m, [key]: val } : m));
  };

  const handleSaveModules = () => {
    const projectExists = projects.some(p => p.id === projectId);
    if (!projectExists) {
      addProject({
        id: projectId,
        name: projectName,
        client: "Acme Corporation",
        startDate: new Date().toLocaleDateString("en-GB").replace(/\//g, "-"),
        endDate: deadline ? deadline.split("-").reverse().join("-") : "",
        status: "active",
        description: description
      });
    }

    const newReqs = modules.map(m => ({
      id: m.id + Math.floor(Math.random() * 10000),
      projectId: projectId,
      moduleName: m.module_name,
      description: m.description,
      estimatedHours: m.estimated_hours,
      priority: m.priority,
      status: "pending"
    }));

    addProjectRequirements(newReqs);
    setCurrentStep(3);
  };

  const getResourceMatches = (mod: WizardModule) => {
    const skillNames = mod.skills.map(s => s.skill_name.toLowerCase().trim());
    const exactMatches: any[] = [];
    const relatedMatches: any[] = [];
    const transferableMatches: any[] = [];
    const upskillCandidates: any[] = [];

    activeResources.forEach(r => {
      const rSkills = r.skillset.toLowerCase().split(",").map(s => s.trim());
      let matchedCount = 0;
      let matchScore = 0;
      
      skillNames.forEach(req => {
        if (rSkills.some(s => s.includes(req))) {
          matchedCount++;
        }
      });

      if (skillNames.length === 0) {
        matchScore = 100;
      } else {
        const matchPct = matchedCount / skillNames.length;
        if (matchPct === 1.0) matchScore = 100;
        else if (matchPct >= 0.6) matchScore = 75;
        else if (matchPct >= 0.3) matchScore = 60;
        else matchScore = 40;
      }

      const capacity = calculateResourceCapacity(
        r.id,
        projectAssignments,
        projectRequirements,
        projects,
        r.weeklyAllowedHours || 35
      );

      const rDetail = {
        id: r.id,
        fullName: r.fullName,
        jobTitle: r.jobTitle,
        avatarUrl: r.avatarUrl,
        matchScore,
        matchedSkills: skillNames.filter(req => rSkills.some(s => s.includes(req))),
        missingSkills: skillNames.filter(req => !rSkills.some(s => s.includes(req))),
        currentProjects: capacity.currentProjects,
        assignedHours: capacity.assignedHours,
        utilization: capacity.utilization,
        availability: capacity.availability
      };

      if (matchScore === 100) exactMatches.push(rDetail);
      else if (matchScore === 75) relatedMatches.push(rDetail);
      else if (matchScore === 60) transferableMatches.push(rDetail);
      else upskillCandidates.push(rDetail);
    });

    return { exactMatches, relatedMatches, transferableMatches, upskillCandidates };
  };

  const handleAssignClick = (moduleId: number, resourceId: string) => {
    const capacity = calculateResourceCapacity(
      resourceId,
      projectAssignments,
      projectRequirements,
      projects,
      35
    );

    const resourceName = resources.find(r => r.id === resourceId)?.fullName || "Employee";

    if (capacity.utilization >= 90) {
      setWarningMessage(
        `⚠ Warning: ${resourceName} is already assigned to projects [${capacity.currentProjects.join(
          ", "
        )}]. Current utilization is ${capacity.utilization}%. Do you still want to allocate them?`
      );
      setAssignAnywayModule(moduleId);
      setAssignAnywayResource(resourceId);
    } else {
      setTempAssignments({ ...tempAssignments, [moduleId]: resourceId });
    }
  };

  const handleConfirmAnyway = () => {
    if (assignAnywayModule !== null && assignAnywayResource !== null) {
      setTempAssignments({ ...tempAssignments, [assignAnywayModule]: assignAnywayResource });
      setWarningMessage(null);
      setAssignAnywayModule(null);
      setAssignAnywayResource(null);
    }
  };

  const handleCancelAnyway = () => {
    setWarningMessage(null);
    setAssignAnywayModule(null);
    setAssignAnywayResource(null);
  };

  // Step 4: Next -> set assignments locally
  const handleSaveAssignments = async () => {
    setLoading(true);
    try {
      for (const [modId, resId] of Object.entries(tempAssignments)) {
        await fetch(`http://${window.location.hostname}:8000/api/ai/projects/${projectId}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            module_id: parseInt(modId),
            resource_id: resId
          })
        });
      }
    } catch (err) {
      console.warn("Backend assignment storage failed. Running locally.");
    }

    Object.entries(tempAssignments).forEach(([modId, resId]) => {
      assignResource(projectId, parseInt(modId), resId);
    });

    setLoading(false);
    setCurrentStep(5); // Move to Step 5: Task Generation
  };

  // Step 5: Generate Tasks
  const handleGenerateTasks = async () => {
    setLoading(true);
    await generateTasks(projectId);
    setLoading(false);
    setCurrentStep(6); // Move to Step 6: Review Tasks
  };

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#115e59] flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-[#0d9488] animate-pulse" />
            AI Project Creator Wizard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Analyze business requirements, match resources, and map scheduling timelines.
          </p>
        </div>
      </header>

      {/* Progress Wizard Tracker (8 Steps) */}
      <div className="grid grid-cols-8 gap-1 relative bg-teal-50/50 p-4 border border-teal-100 rounded">
        {[
          { step: 1, label: "Details", icon: Briefcase },
          { step: 2, label: "Breakdown", icon: Cpu },
          { step: 3, label: "Skills Matched", icon: Sparkles },
          { step: 4, label: "Allocations", icon: Users },
          { step: 5, label: "AI Planning", icon: Settings },
          { step: 6, label: "Review Tasks", icon: ListTodo },
          { step: 7, label: "Daily Schedule", icon: Calendar },
          { step: 8, label: "Launch", icon: CheckCircle2 },
        ].map((s) => {
          const IconComponent = s.icon;
          const isCompleted = currentStep > s.step;
          const isActive = currentStep === s.step;
          return (
            <div
              key={s.step}
              className={`flex flex-col items-center text-center transition-all ${
                isCompleted
                  ? "text-teal-700"
                  : isActive
                  ? "text-teal-600 font-bold"
                  : "text-slate-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isCompleted
                    ? "bg-teal-600 border-teal-600 text-white"
                    : isActive
                    ? "bg-white border-teal-600 text-teal-600 shadow"
                    : "bg-slate-50 border-slate-300 text-slate-400"
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <IconComponent className="w-3.5 h-3.5" />}
              </div>
              <span className="text-[9px] mt-1.5 uppercase tracking-wider hidden lg:block">
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {warningMessage && (
        <Alert className="bg-rose-50 border-rose-300 text-rose-800 p-5 rounded-lg flex flex-col gap-3">
          <div className="flex gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <AlertTitle className="font-bold text-rose-900 text-base">Resource Capacity Warning</AlertTitle>
              <AlertDescription className="text-sm mt-1">{warningMessage}</AlertDescription>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              onClick={handleConfirmAnyway}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2"
            >
              Assign Anyway
            </Button>
            <Button
              onClick={handleCancelAnyway}
              variant="outline"
              className="border-slate-300 text-slate-700 text-xs font-semibold px-4 py-2 bg-white"
            >
              Cancel
            </Button>
          </div>
        </Alert>
      )}

      {/* STEP 1: DETAILS */}
      {currentStep === 1 && (
        <PageCard title="Step 1: Enter Project Scope">
          {apiError && (
            <div className="mb-4 text-xs font-bold bg-rose-50 border border-rose-200 text-rose-600 p-3">
              {apiError}
            </div>
          )}
          <div className="space-y-4 max-w-3xl text-left">
            <div>
              <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Project Name</Label>
              <Input
                placeholder="e.g. Hospital Management System"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Project Description</Label>
              <Textarea
                placeholder="Enter scope details for AI parser..."
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Deadline Date</Label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="mt-1 bg-white"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Estimated Budget (£)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 50000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v)}>
                  <SelectTrigger className="bg-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <Button
                onClick={handleAnalyze}
                disabled={loading}
                className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs px-6 py-2.5 flex items-center gap-2 transition-all shadow-md active:scale-95"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-300" />
                )}
                Analyze Project with AI
              </Button>
            </div>
          </div>
        </PageCard>
      )}

      {/* STEP 2: MODULES BREAKDOWN */}
      {currentStep === 2 && (
        <PageCard
          title="Step 2: AI Generated Modules"
          actions={
            <Button
              onClick={handleAddModule}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-3 py-1.5 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Module
            </Button>
          }
        >
          <div className="space-y-6">
            <p className="text-xs text-slate-500 font-medium text-left">
              Verify modules, adjust scope estimates, and customize technical requirements.
            </p>
            <div className="space-y-4">
              {modules.map((m) => (
                <div
                  key={m.id}
                  className="p-5 border border-slate-300 bg-stone-50/50 rounded-sm relative text-left"
                >
                  <button
                    onClick={() => handleRemoveModule(m.id)}
                    className="absolute top-4 right-4 text-rose-500 hover:text-rose-700 focus:outline-none"
                    title="Delete Module"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Label className="font-bold text-teal-800 text-xs uppercase">Module Name</Label>
                      <Input
                        value={m.module_name}
                        onChange={(e) => handleUpdateModule(m.id, "module_name", e.target.value)}
                        className="bg-white text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="font-bold text-teal-800 text-xs uppercase">Estimated Hours</Label>
                      <Input
                        type="number"
                        value={m.estimated_hours}
                        onChange={(e) => handleUpdateModule(m.id, "estimated_hours", parseInt(e.target.value) || 0)}
                        className="bg-white text-sm mt-1"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="font-bold text-teal-800 text-xs uppercase">Description</Label>
                      <Textarea
                        value={m.description}
                        onChange={(e) => handleUpdateModule(m.id, "description", e.target.value)}
                        className="bg-white text-xs h-16 mt-1"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-xs font-bold text-slate-700">Required Skills: </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {m.skills.map((s, idx) => (
                        <span
                          key={idx}
                          className="bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded"
                        >
                          {s.skill_name} ({s.required_level})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {timeline && (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded text-left">
                <h4 className="font-bold text-slate-700 text-xs flex items-center gap-1.5 mb-2">
                  <Clock className="w-4 h-4 text-teal-600" /> AI Suggested Timeline
                </h4>
                <pre className="text-xs text-slate-600 leading-relaxed font-mono whitespace-pre-line">
                  {timeline}
                </pre>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="bg-white border-slate-300 text-slate-700 font-semibold px-5 py-2 text-xs"
              >
                Back
              </Button>
              <Button
                onClick={handleSaveModules}
                className="bg-teal-700 hover:bg-teal-800 text-white font-semibold px-6 py-2 text-xs"
              >
                Approve & Continue
              </Button>
            </div>
          </div>
        </PageCard>
      )}

      {/* STEP 3: SKILL MATCHING RECOMMENDATIONS */}
      {currentStep === 3 && (
        <PageCard title="Step 3: AI Skill Recommendation Engine">
          <div className="space-y-6 text-left">
            <p className="text-xs text-slate-500 font-medium">
              Review AI recommendations mapped to tech skills required for each module requirement.
            </p>
            <div className="space-y-6">
              {modules.map((m) => {
                const matches = getResourceMatches(m);
                return (
                  <div key={m.id} className="border border-slate-300 rounded overflow-hidden bg-white">
                    <div className="bg-teal-900 text-white p-3 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-sm">{m.module_name}</h3>
                        <p className="text-[11px] text-teal-200">Required Level: {m.skills.map(s => `${s.skill_name} (${s.required_level})`).join(", ")}</p>
                      </div>
                    </div>
                    <div className="p-4 space-y-4">
                      {matches.exactMatches.length === 0 && matches.relatedMatches.length === 0 && (
                        <p className="text-xs text-slate-400 italic">No direct matches found in active resources dataset.</p>
                      )}
                      {matches.exactMatches.map((c) => (
                        <div key={c.id} className="flex justify-between items-center border-b pb-2 text-xs">
                          <div>
                            <span className="font-bold text-slate-800 text-sm">{c.fullName}</span>
                            <span className="ml-2 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-extrabold text-[10px]">100% MATCH</span>
                            <p className="text-slate-500 mt-1">{c.jobTitle} • Current projects: {c.currentProjects.join(", ") || "None"}</p>
                          </div>
                        </div>
                      ))}
                      {matches.relatedMatches.map((c) => (
                        <div key={c.id} className="flex justify-between items-center border-b pb-2 text-xs">
                          <div>
                            <span className="font-bold text-slate-800 text-sm">{c.fullName}</span>
                            <span className="ml-2 text-sky-600 bg-sky-50 px-2 py-0.5 rounded font-extrabold text-[10px]">75% MATCH</span>
                            <p className="text-slate-500 mt-1">Matched: {c.matchedSkills.join(", ")} • Missing: {c.missingSkills.join(", ")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(2)} className="bg-white border-slate-300 text-slate-700 text-xs font-semibold px-5 py-2">
                Back
              </Button>
              <Button onClick={() => setCurrentStep(4)} className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-6 py-2">
                Proceed to Allocations
              </Button>
            </div>
          </div>
        </PageCard>
      )}

      {/* STEP 4: RESOURCE ASSIGNMENT */}
      {currentStep === 4 && (
        <PageCard title="Step 4: Resource Assignments">
          <div className="space-y-6 text-left">
            <p className="text-xs text-slate-500 font-medium">
              Allocate a specific resource to manage each module requirement. Warnings show capacity overloads.
            </p>
            <div className="space-y-4">
              {modules.map((m) => {
                const assignedResource = tempAssignments[m.id];
                const resProfile = resources.find(r => r.id === assignedResource);
                return (
                  <div key={m.id} className="p-4 border border-slate-200 bg-white rounded shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{m.module_name}</h4>
                      <p className="text-xs text-slate-500 mt-1">{m.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Select
                        value={assignedResource || ""}
                        onValueChange={(val) => handleAssignClick(m.id, val)}
                      >
                        <SelectTrigger className="w-[220px] bg-white text-xs">
                          <SelectValue placeholder="Choose Resource..." />
                        </SelectTrigger>
                        <SelectContent>
                          {activeResources.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.fullName} ({r.jobTitle})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {resProfile && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
                          Allocated
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between pt-6 border-t border-slate-100">
              <Button variant="outline" onClick={() => setCurrentStep(3)} className="bg-white border-slate-300 text-slate-700 text-xs font-semibold px-5 py-2">
                Back
              </Button>
              <Button onClick={handleSaveAssignments} className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-6 py-2">
                Save & Proceed to Planning
              </Button>
            </div>
          </div>
        </PageCard>
      )}

      {/* STEP 5: TASK GENERATION */}
      {currentStep === 5 && (
        <PageCard title="Step 5: AI Task Breakdown Generator">
          <div className="text-center py-10 max-w-xl mx-auto space-y-6">
            <div className="w-16 h-16 bg-teal-50 border border-teal-200 rounded-full flex items-center justify-center mx-auto">
              <Cpu className="w-8 h-8 text-teal-600 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Generate Subtasks & Schedule Dates</h3>
              <p className="text-xs text-slate-500 mt-2">
                AI will decompose each assigned module requirement into detailed code development tickets, wire up execution dependencies, and calculate daily hours.
              </p>
            </div>
            <div className="pt-2">
              <Button
                onClick={handleGenerateTasks}
                disabled={loading}
                className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-8 py-3 flex items-center gap-2 mx-auto"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Generate Tasks & Schedule Now
              </Button>
            </div>
          </div>
        </PageCard>
      )}

      {/* STEP 6: REVIEW TASKS */}
      {currentStep === 6 && (
        <PageCard title="Step 6: Review AI Generated Tasks">
          <div className="space-y-6 text-left">
            <p className="text-xs text-slate-500 font-medium">
              Review task hierarchy and estimates. Reassign developer resources directly before launching the project.
            </p>
            <div className="border border-slate-200 rounded overflow-hidden">
              <table className="w-full text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b">
                  <tr>
                    <th className="p-3 text-left">Task Name</th>
                    <th className="p-3 text-left">Hours</th>
                    <th className="p-3 text-left">Priority</th>
                    <th className="p-3 text-left">Depends On</th>
                    <th className="p-3 text-left">Assigned Developer</th>
                    <th className="p-3 text-left w-16">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {activeProjectTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center italic text-slate-400">No tasks generated. Please go back and retry.</td>
                    </tr>
                  ) : (
                    activeProjectTasks.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">{t.taskName}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{t.description}</div>
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            value={t.estimatedHours}
                            onChange={(e) => updateTask(t.id, { estimatedHours: parseInt(e.target.value) || 0 })}
                            className="w-16 h-8 text-xs font-bold text-center bg-white border-slate-200"
                          />
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            t.priority === 'High' ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-600'
                          }`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 font-medium max-w-[220px] truncate" title={t.dependsOn.map(depId => {
                          const depTask = activeProjectTasks.find(pt => pt.id === depId);
                          return depTask ? depTask.taskName : depId;
                        }).join(", ")}>
                          {t.dependsOn.map(depId => {
                            const depTask = activeProjectTasks.find(pt => pt.id === depId);
                            return depTask ? depTask.taskName : depId;
                          }).join(", ") || "-"}
                        </td>
                        <td className="p-3">
                          <Select
                            value={t.resourceId || "unassigned"}
                            onValueChange={(val) => reassignTask(t.id, val === "unassigned" ? null : val)}
                          >
                            <SelectTrigger className="h-8 bg-white text-xs w-[160px]">
                              <SelectValue placeholder="Assign Resource" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {activeResources.map((r) => (
                                <SelectItem key={r.id} value={r.id}>{r.fullName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteProjectTask(t.id)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 w-8"
                            title="Delete Task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(5)} className="bg-white border-slate-300 text-slate-700 text-xs font-semibold px-5 py-2">
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={handleGenerateTasks}
                  disabled={loading}
                  variant="outline"
                  className="border-teal-600 text-teal-700 hover:bg-teal-50 text-xs font-semibold px-4 py-2 bg-white flex items-center gap-1.5"
                >
                  {loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  Regenerate Tasks
                </Button>
                <Button onClick={() => setCurrentStep(7)} className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-6 py-2">
                  Confirm & View Schedule
                </Button>
              </div>
            </div>
          </div>
        </PageCard>
      )}

      {/* STEP 7: TASK SCHEDULING PREVIEW */}
      {currentStep === 7 && (
        <PageCard title="Step 7: Daily Workload Calendar Distribution">
          <div className="space-y-6 text-left">
            <p className="text-xs text-slate-500 font-medium">
              Below is the daily workload layout mapped on calendar dates (excluding weekends and keeping 8h daily capacity).
            </p>
            <div className="border border-slate-200 rounded p-4 bg-slate-50 space-y-4">
              {activeResources.map((res) => {
                const resSchedule = taskScheduleEntries.filter(
                  se => se.resourceId === res.id && activeProjectTasks.some(pt => pt.id === se.taskId)
                );
                
                if (resSchedule.length === 0) return null;

                return (
                  <div key={res.id} className="bg-white border border-slate-200 p-4 rounded shadow-sm">
                    <h4 className="font-bold text-teal-800 text-xs mb-3 flex items-center gap-1.5 border-b pb-2 uppercase tracking-wide">
                      <Users className="w-4 h-4" /> {res.fullName} ({res.jobTitle})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {resSchedule.slice(0, 10).map((se) => {
                        const taskObj = activeProjectTasks.find(pt => pt.id === se.taskId);
                        return (
                          <div key={se.id} className="border border-teal-100 bg-teal-50/30 p-2.5 rounded text-xs">
                            <span className="font-bold text-slate-800">{new Date(se.workDate).toLocaleDateString("en-GB", { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                            <p className="text-[10px] text-teal-900 mt-1 font-semibold truncate" title={taskObj?.taskName}>{taskObj?.taskName}</p>
                            <div className="flex justify-between items-center mt-2 border-t border-teal-50 pt-1.5 text-[10px]">
                              <span className="text-slate-400">Effort:</span>
                              <span className="font-bold text-teal-800">{se.plannedHours} Hrs</span>
                            </div>
                          </div>
                        );
                      })}
                      {resSchedule.length > 10 && (
                        <div className="border border-slate-200 bg-slate-50 p-2.5 rounded text-xs flex items-center justify-center font-bold text-slate-500">
                          + {resSchedule.length - 10} more days planned
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(6)} className="bg-white border-slate-300 text-slate-700 text-xs font-semibold px-5 py-2">
                Back
              </Button>
              <Button onClick={() => setCurrentStep(8)} className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-6 py-2">
                Launch Project Confirmation
              </Button>
            </div>
          </div>
        </PageCard>
      )}

      {/* STEP 8: SUCCESS FINISH */}
      {currentStep === 8 && (
        <PageCard title="Project Activated & Planned Successfully!">
          <div className="text-center py-8 space-y-6 max-w-xl mx-auto">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-800">Project "{projectName}" is Live</h2>
              <p className="text-sm text-slate-500 mt-2">
                Modules, skill profiles, schedules, subtask lists, and resource work dates are configured and synced live.
              </p>
            </div>

            <div className="bg-stone-50 border border-slate-200 rounded p-4 text-left text-xs space-y-2">
              <div className="font-bold text-slate-700 text-sm border-b pb-1.5 mb-2 uppercase">Planning Performance</div>
              <div className="flex justify-between">
                <span className="text-slate-500">Modules Breakdown:</span>
                <span className="font-bold text-slate-800">{modules.length} Modules</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Subtasks Created:</span>
                <span className="font-bold text-slate-800">{activeProjectTasks.length} subtasks</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Resources Loaded:</span>
                <span className="font-bold text-slate-800">{Object.keys(tempAssignments).length} resources</span>
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={() => router.navigate({ to: "/admin/projects" })}
                className="bg-teal-700 hover:bg-teal-800 text-white font-semibold px-6 py-2.5"
              >
                Go to Projects Dashboard
              </Button>
            </div>
          </div>
        </PageCard>
      )}
    </div>
  );
}
