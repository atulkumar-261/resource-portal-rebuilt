import { create } from "zustand";
import type {
  Resource,
  Client,
  Project,
  Task,
  Leave,
  Timesheet,
  Payslip,
  Announcement,
  Role,
  ProjectRequirement,
  ProjectSkillRequirement,
  ProjectAssignment,
  ProjectTask,
  TaskActivityLog,
  TaskScheduleEntry,
  TaskTimeLog,
  DailyReport,
  DailyReportItem,
  ReportFlag,
  ReportAnalysisResult,
  ProjectProgress,
  ProductivityMetrics
} from "./types";
import {
  initialResources,
  initialClients,
  initialProjects,
  initialTasks,
  initialLeaves,
  initialTimesheets,
  initialPayslips,
  initialAnnouncements,
  initialProjectRequirements,
  initialProjectSkillRequirements,
  initialProjectAssignments,
  initialProjectTasks,
  initialTaskScheduleEntries,
  initialTaskActivityLogs,
  initialTaskTimeLogs,
  initialDailyReports,
  initialDailyReportItems
} from "./mockData";

interface AuthState {
  role: Role | null;
  userName: string;
  resourceId: string | null;
  token: string | null;
  onboardingStatus: string | null;
  login: (role: Role, name: string, resourceId?: string, token?: string, onboardingStatus?: string) => void;
  setOnboardingStatus: (status: string) => void;
  logout: () => void;
}

const readAuthToken = () => (typeof window === "undefined" ? null : window.localStorage.getItem("authToken"));
const readAuthRole = () => (typeof window === "undefined" ? null : (window.localStorage.getItem("authRole") as Role | null));
const readAuthName = () => (typeof window === "undefined" ? "" : window.localStorage.getItem("authName") || "");
const readResourceId = () => (typeof window === "undefined" ? null : window.localStorage.getItem("resourceId"));
const readOnboardingStatus = () => (typeof window === "undefined" ? null : window.localStorage.getItem("onboardingStatus"));

export const useAuth = create<AuthState>((set) => ({
  role: readAuthRole(),
  userName: readAuthName(),
  resourceId: readResourceId(),
  token: readAuthToken(),
  onboardingStatus: readOnboardingStatus(),
  login: (role, name, resourceId, token, onboardingStatus) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("authRole", role);
      window.localStorage.setItem("authName", name);
      if (resourceId) window.localStorage.setItem("resourceId", resourceId);
      else window.localStorage.removeItem("resourceId");
      if (token) window.localStorage.setItem("authToken", token);
      if (onboardingStatus) window.localStorage.setItem("onboardingStatus", onboardingStatus);
      else window.localStorage.removeItem("onboardingStatus");
    }
    set({ role, userName: name, resourceId: resourceId ?? null, token: token ?? null, onboardingStatus: onboardingStatus ?? null });
  },
  setOnboardingStatus: (status) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("onboardingStatus", status);
    }
    set({ onboardingStatus: status });
  },
  logout: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("authRole");
      window.localStorage.removeItem("authName");
      window.localStorage.removeItem("resourceId");
      window.localStorage.removeItem("authToken");
      window.localStorage.removeItem("onboardingStatus");
    }
    set({ role: null, userName: "", resourceId: null, token: null, onboardingStatus: null });
  },
}));

interface RMSState {
  resources: Resource[];
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  leaves: Leave[];
  timesheets: Timesheet[];
  payslips: Payslip[];
  announcements: Announcement[];
  projectRequirements: ProjectRequirement[];
  projectSkillRequirements: ProjectSkillRequirement[];
  projectAssignments: ProjectAssignment[];
  projectTasks: ProjectTask[];
  taskScheduleEntries: TaskScheduleEntry[];
  taskActivityLogs: TaskActivityLog[];
  taskTimeLogs: TaskTimeLog[];
  dailyReports: DailyReport[];
  dailyReportItems: DailyReportItem[];

  addResource: (r: Resource) => void;
  updateResource: (id: string, patch: Partial<Resource>) => void;
  deleteResource: (id: string) => void;

  addClient: (c: Client) => void;
  updateClient: (id: string, patch: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  addProject: (p: Project) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  addTask: (t: Task) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  addLeave: (l: Leave) => void;
  updateLeave: (id: string, patch: Partial<Leave>) => void;
  deleteLeave: (id: string) => void;

  addTimesheet: (t: Timesheet) => void;
  updateTimesheet: (id: string, patch: Partial<Timesheet>) => void;
  deleteTimesheet: (id: string) => void;

  addPayslip: (p: Payslip) => void;
  deletePayslip: (id: string) => void;

  addAnnouncement: (a: Announcement) => void;
  deleteAnnouncement: (id: string) => void;

  addProjectRequirements: (reqs: ProjectRequirement[]) => void;
  updateProjectRequirement: (id: number, patch: Partial<ProjectRequirement>) => void;
  deleteProjectRequirement: (id: number) => void;
  assignResourceToRequirement: (projId: string, reqId: number, resId: string) => void;
  removeAssignment: (id: number) => void;

  generateTasksForProject: (projId: string) => Promise<void>;
  updateProjectTaskStatus: (taskId: string, status: "pending" | "in_progress" | "paused" | "completed") => void;
  reassignProjectTask: (taskId: string, resourceId: string | null) => void;
  logTimeForTask: (taskId: string, hours: number, notes: string | null) => void;
  addProjectTask: (task: ProjectTask) => void;
  updateProjectTask: (id: string, patch: Partial<ProjectTask>) => void;
  deleteProjectTask: (id: string) => void;
  submitDailyReport: (resourceId: string, report: Omit<DailyReport, "id" | "submittedAt" | "createdAt" | "status" | "resourceId">, items: Omit<DailyReportItem, "id" | "reportId">[]) => Promise<DailyReport>;
  fetchMyReports: (resourceId: string) => Promise<DailyReport[]>;
  fetchProjectReports: (projId: string) => Promise<DailyReport[]>;
  analyzeReport: (reportId: string) => Promise<DailyReport>;
  fetchProjectProgress: (projId: string) => Promise<ProjectProgress>;
  fetchProductivity: (id: string, isProject: boolean) => Promise<ProductivityMetrics>;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeout = 1500
): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};


export const useRMS = create<RMSState>((set, get) => ({
  resources: initialResources,
  clients: initialClients,
  projects: initialProjects,
  tasks: initialTasks,
  leaves: initialLeaves,
  timesheets: initialTimesheets,
  payslips: initialPayslips,
  announcements: initialAnnouncements,
  projectRequirements: initialProjectRequirements,
  projectSkillRequirements: initialProjectSkillRequirements,
  projectAssignments: initialProjectAssignments,
  projectTasks: initialProjectTasks,
  taskScheduleEntries: initialTaskScheduleEntries,
  taskActivityLogs: initialTaskActivityLogs,
  taskTimeLogs: initialTaskTimeLogs,
  dailyReports: initialDailyReports,
  dailyReportItems: initialDailyReportItems,

  addResource: (r) => set((s) => ({ resources: [...s.resources, { ...r, id: r.id || uid() }] })),
  updateResource: (id, patch) =>
    set((s) => ({ resources: s.resources.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  deleteResource: (id) => set((s) => ({ resources: s.resources.filter((x) => x.id !== id) })),

  addClient: (c) => set((s) => ({ clients: [...s.clients, { ...c, id: c.id || uid() }] })),
  updateClient: (id, patch) =>
    set((s) => ({ clients: s.clients.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  deleteClient: (id) => set((s) => ({ clients: s.clients.filter((x) => x.id !== id) })),

  addProject: (p) => set((s) => ({ projects: [...s.projects, { ...p, id: p.id || uid() }] })),
  updateProject: (id, patch) =>
    set((s) => ({ projects: s.projects.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  deleteProject: (id) => set((s) => ({ projects: s.projects.filter((x) => x.id !== id) })),

  addTask: (t) => set((s) => ({ tasks: [...s.tasks, { ...t, id: t.id || uid() }] })),
  updateTask: (id, patch) =>
    set((s) => ({ tasks: s.tasks.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((x) => x.id !== id) })),

  addLeave: (l) => set((s) => ({ leaves: [...s.leaves, { ...l, id: l.id || uid() }] })),
  updateLeave: (id, patch) =>
    set((s) => ({ leaves: s.leaves.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  deleteLeave: (id) => set((s) => ({ leaves: s.leaves.filter((x) => x.id !== id) })),

  addTimesheet: (t) => set((s) => ({ timesheets: [{ ...t, id: t.id || uid() }, ...s.timesheets] })),
  updateTimesheet: (id, patch) =>
    set((s) => ({ timesheets: s.timesheets.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  deleteTimesheet: (id) => set((s) => ({ timesheets: s.timesheets.filter((x) => x.id !== id) })),

  addPayslip: (p) => set((s) => ({ payslips: [{ ...p, id: p.id || uid() }, ...s.payslips] })),
  deletePayslip: (id) => set((s) => ({ payslips: s.payslips.filter((x) => x.id !== id) })),

  addAnnouncement: (a) =>
    set((s) => ({ announcements: [{ ...a, id: a.id || uid() }, ...s.announcements] })),
  deleteAnnouncement: (id) =>
    set((s) => ({ announcements: s.announcements.filter((x) => x.id !== id) })),

  addProjectRequirements: (reqs) => set((s) => ({ projectRequirements: [...s.projectRequirements, ...reqs] })),
  updateProjectRequirement: (id, patch) =>
    set((s) => ({
      projectRequirements: s.projectRequirements.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    })),
  deleteProjectRequirement: (id) =>
    set((s) => ({
      projectRequirements: s.projectRequirements.filter((x) => x.id !== id),
      projectSkillRequirements: s.projectSkillRequirements.filter((x) => x.requirementId !== id),
      projectAssignments: s.projectAssignments.filter((x) => x.requirementId !== id),
    })),
  assignResourceToRequirement: (projId, reqId, resId) =>
    set((s) => {
      const existingIdx = s.projectAssignments.findIndex(
        (x) => x.projectId === projId && x.requirementId === reqId && x.resourceId === resId
      );
      if (existingIdx >= 0) return {};
      
      const newAssign: ProjectAssignment = {
        id: Math.floor(Math.random() * 100000),
        projectId: projId,
        requirementId: reqId,
        resourceId: resId,
        assignmentType: "standard",
        assignedBy: "admin",
        assignedAt: new Date().toISOString()
      };
      return {
        projectAssignments: [...s.projectAssignments, newAssign]
      };
    }),
  removeAssignment: (id) => set((s) => ({ projectAssignments: s.projectAssignments.filter((x) => x.id !== id) })),

  generateTasksForProject: async (projId) => {
    try {
      const resp = await fetchWithTimeout(`http://${window.location.hostname}:8000/api/ai/projects/${projId}/generate-tasks`, {
        method: "POST"
      }, 8000);
      if (resp.ok) {
        const taskResp = await fetchWithTimeout(`http://${window.location.hostname}:8000/api/projects/${projId}/tasks`, {}, 2000);
        if (taskResp.ok) {
          const fetchedTasks = await taskResp.json();
          set({
            projectTasks: fetchedTasks
          });
          return;
        }
      }
    } catch (e) {
      console.warn("Backend unavailable, falling back to mock task generator.", e);
    }

    set((s) => {
      const proj = s.projects.find((p) => p.id === projId);
      const reqs = s.projectRequirements.filter((r) => r.projectId === projId);
      const assigns = s.projectAssignments.filter((a) => a.projectId === projId);
      
      const newTasks: ProjectTask[] = [];
      const newScheduleEntries: TaskScheduleEntry[] = [];

      const cleanTasks = s.projectTasks.filter((x) => x.projectId !== projId);
      const cleanSchedule = s.taskScheduleEntries.filter((x) => {
        const t = s.projectTasks.find((pt) => pt.id === x.taskId);
        return !t || t.projectId !== projId;
      });

      reqs.forEach((r) => {
        const assignment = assigns.find((a) => a.requirementId === r.id);
        const resourceId = assignment ? assignment.resourceId : null;
        let resourceName = "Unassigned";
        if (resourceId) {
          const resObj = s.resources.find((res) => res.id === resourceId);
          if (resObj) {
            resourceName = resObj.fullName;
          }
        }

        const taskDefs = [
          { name: `Setup & Architecture for ${r.moduleName}`, est: Math.round(r.estimatedHours * 0.3), priority: "High" },
          { name: `Core Development for ${r.moduleName}`, est: Math.round(r.estimatedHours * 0.5), priority: "High" },
          { name: `Testing & QA for ${r.moduleName}`, est: Math.round(r.estimatedHours * 0.2), priority: "Medium" },
        ];

        const generatedTaskIds: string[] = [];

        taskDefs.forEach((def, index) => {
          const taskId = `t-${uid()}`;
          const isFirst = index === 0;

          let startDateStr = proj?.startDate || "08-06-2026";
          let endDateStr = proj?.endDate || "12-06-2026";
          
          if (!isFirst && generatedTaskIds.length > 0) {
            startDateStr = "15-06-2026";
            endDateStr = "19-06-2026";
          }

          const newTask: ProjectTask = {
            id: taskId,
            projectId: projId,
            requirementId: r.id,
            resourceId,
            resourceName,
            parentTaskId: null,
            taskName: def.name,
            description: `Auto-generated task breakdown for module requirement: ${r.moduleName}.`,
            estimatedHours: def.est,
            actualHours: 0,
            priority: def.priority,
            status: "pending",
            startDate: startDateStr,
            endDate: endDateStr,
            dependsOn: isFirst ? [] : [generatedTaskIds[index - 1]]
          };

          newTasks.push(newTask);
          generatedTaskIds.push(taskId);

          if (resourceId) {
            const dailyHours = 8;
            let remainingHours = def.est;
            
            let parsedStart = startDateStr.split("-");
            let currentDay = new Date(Number(parsedStart[2]), Number(parsedStart[1]) - 1, Number(parsedStart[0]));
            if (isNaN(currentDay.getTime())) {
              currentDay = new Date(startDateStr);
            }

            while (remainingHours > 0) {
              if (currentDay.getDay() !== 0 && currentDay.getDay() !== 6) {
                const hoursPlanned = Math.min(remainingHours, dailyHours);
                newScheduleEntries.push({
                  id: `se-${uid()}`,
                  taskId,
                  resourceId,
                  workDate: currentDay.toISOString().split("T")[0],
                  plannedHours: hoursPlanned,
                  status: "planned"
                });
                remainingHours -= hoursPlanned;
              }
              currentDay.setDate(currentDay.getDate() + 1);
            }
          }
        });
      });

      return {
        projectTasks: [...cleanTasks, ...newTasks],
        taskScheduleEntries: [...cleanSchedule, ...newScheduleEntries]
      };
    });
  },

  updateProjectTaskStatus: (taskId, status) =>
    set((s) => {
      const task = s.projectTasks.find((x) => x.id === taskId);
      if (!task) return {};

      const newLog: TaskActivityLog = {
        id: `log-${uid()}`,
        taskId,
        resourceId: task.resourceId,
        action: status === "in_progress" ? "started" : status === "completed" ? "completed" : "paused",
        createdAt: new Date().toISOString()
      };

      return {
        projectTasks: s.projectTasks.map((x) => (x.id === taskId ? { ...x, status } : x)),
        taskActivityLogs: [...s.taskActivityLogs, newLog]
      };
    }),

  reassignProjectTask: (taskId, resourceId) =>
    set((s) => {
      let resourceName = "Unassigned";
      if (resourceId) {
        const r = s.resources.find((res) => res.id === resourceId);
        if (r) resourceName = r.fullName;
      }

      const updatedSchedule = s.taskScheduleEntries.map((x) => {
        if (x.taskId === taskId && resourceId) {
          return { ...x, resourceId };
        }
        return x;
      });

      return {
        projectTasks: s.projectTasks.map((x) =>
          x.id === taskId ? { ...x, resourceId, resourceName } : x
        ),
        taskScheduleEntries: resourceId ? updatedSchedule : s.taskScheduleEntries.filter((x) => x.taskId !== taskId)
      };
    }),

  logTimeForTask: (taskId, hours, notes) =>
    set((s) => {
      const task = s.projectTasks.find((x) => x.id === taskId);
      if (!task) return {};

      const newLog: TaskTimeLog = {
        id: `tl-${uid()}`,
        taskId,
        resourceId: task.resourceId || "unassigned",
        hoursLogged: hours,
        notes,
        loggedAt: new Date().toISOString()
      };

      const totalActual = task.actualHours + hours;

      return {
        taskTimeLogs: [...s.taskTimeLogs, newLog],
        projectTasks: s.projectTasks.map((x) =>
          x.id === taskId ? { ...x, actualHours: totalActual } : x
        )
      };
    }),

  addProjectTask: (task) => set((s) => ({ projectTasks: [...s.projectTasks, { ...task, id: task.id || uid() }] })),
  updateProjectTask: (id, patch) =>
    set((s) => ({ projectTasks: s.projectTasks.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  deleteProjectTask: (id) =>
    set((s) => ({
      projectTasks: s.projectTasks.filter((x) => x.id !== id),
      taskScheduleEntries: s.taskScheduleEntries.filter((x) => x.taskId !== id),
      taskActivityLogs: s.taskActivityLogs.filter((x) => x.taskId !== id),
      taskTimeLogs: s.taskTimeLogs.filter((x) => x.taskId !== id)
    })),
  submitDailyReport: async (resourceId, report, items) => {
    try {
      const resp = await fetchWithTimeout(`http://${window.location.hostname}:8000/api/reports?resource_id=${resourceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...report, items })
      }, 4000);
      if (resp.ok) {
        const newReport = await resp.json();
        set((s) => ({
          dailyReports: [newReport, ...s.dailyReports],
          dailyReportItems: [...s.dailyReportItems, ...newReport.items]
        }));
        return newReport;
      }
    } catch (e) {
      console.warn("Backend submit report failed. Running offline fallback.", e);
    }

    const reportId = `dr-${uid()}`;
    const workDone = report.workDone || "";
    const blockers = report.blockers || "";
    const warnings: string[] = [];
    let progressScore = 100;
    let riskLevel: "low" | "medium" | "high" = "low";
    const flags: ReportFlag[] = [];

    if (workDone.length < 15) {
      warnings.push("Vague work description: Please add more details.");
      progressScore -= 30;
      flags.push({
        id: `rf-${uid()}`,
        reportId,
        flagType: "vague_report",
        severity: "warning",
        message: "Work done text is too generic.",
        createdAt: new Date().toISOString()
      });
    }
    const blockerLower = blockers.toLowerCase();
    if (blockers && ["blocked", "waiting", "issue", "delay"].some(kw => blockerLower.includes(kw))) {
      warnings.push(`Blocker warning: ${blockers}`);
      progressScore -= 20;
      riskLevel = blockerLower.includes("api") || blockerLower.includes("db") ? "high" : "medium";
      flags.push({
        id: `rf-${uid()}`,
        reportId,
        flagType: "blocker_detected",
        severity: riskLevel === "high" ? "critical" : "warning",
        message: `Blocked by: ${blockers}`,
        createdAt: new Date().toISOString()
      });
    }

    const itemResponses: DailyReportItem[] = items.map((it) => {
      const task = get().projectTasks.find(t => t.id === it.taskId);
      if (it.completionPercent >= 90 && task && task.estimatedHours >= 10 && it.hoursSpent <= 2) {
        warnings.push(`Completion mismatch on ${task.taskName}`);
        progressScore -= 15;
        flags.push({
          id: `rf-${uid()}`,
          reportId,
          flagType: "completion_mismatch",
          severity: "warning",
          message: `Task ${task.taskName} marked complete with low hours logged.`,
          createdAt: new Date().toISOString()
        });
      }

      return {
        id: `dri-${uid()}`,
        reportId,
        taskId: it.taskId,
        taskName: task?.taskName || "Task Item",
        hoursSpent: it.hoursSpent,
        completionPercent: it.completionPercent,
        comments: it.comments
      };
    });

    const resObj = get().resources.find(r => r.id === resourceId);
    const projObj = get().projects.find(p => p.id === report.projectId);

    const newReport: DailyReport = {
      id: reportId,
      resourceId,
      resourceName: resObj?.fullName || "Developer",
      projectId: report.projectId,
      projectName: projObj?.name || "Project",
      workDate: report.workDate,
      workDone: report.workDone,
      blockers: report.blockers,
      tomorrowPlan: report.tomorrowPlan,
      hoursWorked: report.hoursWorked,
      status: "analyzed",
      createdAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      items: itemResponses,
      analysisResult: {
        summary: workDone.slice(0, 100),
        progressScore,
        riskLevel,
        warnings
      },
      flags
    };

    set((s) => {
      const updatedTasks = s.projectTasks.map((t) => {
        const reportItem = items.find(it => it.taskId === t.id);
        if (reportItem) {
          let updatedStatus = t.status;
          if (reportItem.completionPercent >= 100) {
            updatedStatus = "completed";
          } else if (reportItem.completionPercent > 0) {
            updatedStatus = "in_progress";
          }
          return {
            ...t,
            actualHours: t.actualHours + reportItem.hoursSpent,
            status: updatedStatus
          };
        }
        return t;
      });

      return {
        dailyReports: [newReport, ...s.dailyReports],
        dailyReportItems: [...s.dailyReportItems, ...itemResponses],
        projectTasks: updatedTasks
      };
    });

    return newReport;
  },

  fetchMyReports: async (resourceId) => {
    try {
      const resp = await fetchWithTimeout(`http://${window.location.hostname}:8000/api/reports/my?resource_id=${resourceId}`, {}, 1500);
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {
      console.warn("Backend fetch my reports failed.", e);
    }
    return get().dailyReports.filter(r => r.resourceId === resourceId);
  },

  fetchProjectReports: async (projId) => {
    try {
      const resp = await fetchWithTimeout(`http://${window.location.hostname}:8000/api/projects/${projId}/reports`, {}, 1500);
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {
      console.warn("Backend fetch project reports failed.", e);
    }
    return get().dailyReports.filter(r => r.projectId === projId);
  },

  analyzeReport: async (reportId) => {
    try {
      const resp = await fetchWithTimeout(`http://${window.location.hostname}:8000/api/reports/${reportId}/analyze`, { method: "POST" }, 8000);
      if (resp.ok) {
        const updated = await resp.json();
        set((s) => ({
          dailyReports: s.dailyReports.map(r => r.id === reportId ? updated : r)
        }));
        return updated;
      }
    } catch (e) {
      console.warn("Backend analyze report failed.", e);
    }
    return get().dailyReports.find(r => r.id === reportId) || {} as DailyReport;
  },

  fetchProjectProgress: async (projId) => {
    try {
      const resp = await fetchWithTimeout(`http://${window.location.hostname}:8000/api/projects/${projId}/progress`, {}, 1500);
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {
      console.warn("Backend fetch progress failed. Calculating locally.", e);
    }

    const proj = get().projects.find(p => p.id === projId);
    const tasks = get().projectTasks.filter(t => t.projectId === projId);
    const reqs = get().projectRequirements.filter(r => r.projectId === projId);

    const totalEst = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    let weightedSum = 0;
    let actualHours = 0;

    tasks.forEach((t) => {
      const items = get().dailyReportItems.filter(dri => dri.taskId === t.id);
      let pct = 0;
      if (t.status === "completed") {
        pct = 100;
      } else if (items.length > 0) {
        pct = Math.max(...items.map(i => i.completionPercent));
      } else if (t.status === "in_progress") {
        pct = 30;
      }
      weightedSum += (pct / 100) * t.estimatedHours;
      actualHours += t.actualHours;
    });

    const overallProgress = totalEst > 0 ? (weightedSum / totalEst) * 100 : 0;

    const moduleProgress = reqs.map((r) => {
      const mTasks = tasks.filter(t => t.requirementId === r.id);
      const mEst = mTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
      let mWeighted = 0;
      let mAct = 0;
      mTasks.forEach(t => {
        const items = get().dailyReportItems.filter(dri => dri.taskId === t.id);
        let pct = t.status === "completed" ? 100 : (items.length > 0 ? Math.max(...items.map(i => i.completionPercent)) : 0);
        mWeighted += (pct / 100) * t.estimatedHours;
        mAct += t.actualHours;
      });
      return {
        moduleId: r.id,
        moduleName: r.moduleName,
        progress: mEst > 0 ? (mWeighted / mEst) * 100 : 0,
        estimatedHours: mEst,
        completedHours: mAct
      };
    });

    const startStr = proj?.startDate || "08-06-2026";
    const parsed = startStr.split("-");
    const start = new Date(Number(parsed[2]), Number(parsed[1]) - 1, Number(parsed[0]));
    const burndownData = Array.from({ length: 5 }).map((_, idx) => {
      const d = new Date(start);
      d.setDate(start.getDate() + idx * 3);
      return {
        workDate: d.toISOString().split("T")[0],
        plannedRemainingHours: Math.max(0, totalEst - idx * (totalEst / 4)),
        actualRemainingHours: Math.max(0, totalEst - idx * (actualHours / 4))
      };
    });

    const recentReports = get().dailyReports.filter(r => r.projectId === projId);
    let riskLevel: "low" | "medium" | "high" = "low";
    const riskWarnings: string[] = [];

    recentReports.forEach(r => {
      r.flags?.forEach(f => {
        riskWarnings.push(f.message);
        if (f.severity === "critical") riskLevel = "high";
        else if (riskLevel !== "high" && f.flagType === "blocker_detected") riskLevel = "medium";
      });
    });

    return {
      projectId: projId,
      overallProgress: Math.round(overallProgress * 10) / 10,
      moduleProgress,
      estimatedHours: totalEst,
      actualHours,
      burndownData,
      riskLevel,
      riskWarnings: Array.from(new Set(riskWarnings))
    };
  },

  fetchProductivity: async (id, isProject) => {
    try {
      const prefix = isProject ? "projects" : "resources";
      const resp = await fetchWithTimeout(`http://${window.location.hostname}:8000/api/${prefix}/${id}/productivity`, {}, 1500);
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {
      console.warn("Backend fetch productivity failed. Calculating locally.", e);
    }

    if (isProject) {
      const reports = get().dailyReports.filter(r => r.projectId === id);
      const hoursLogged = reports.reduce((sum, r) => sum + r.hoursWorked, 0);
      const tasks = get().projectTasks.filter(t => t.projectId === id);
      const completed = tasks.filter(t => t.status === "completed").length;
      return {
        id,
        name: get().projects.find(p => p.id === id)?.name || "Project",
        reportsSubmitted: reports.length,
        hoursLogged,
        tasksCompleted: completed,
        currentProgress: 65.0,
        reportingStreak: 4,
        efficiencyMetrics: {
          activeDevelopers: 2,
          tasksTotal: tasks.length
        }
      };
    } else {
      const reports = get().dailyReports.filter(r => r.resourceId === id);
      const hoursLogged = reports.reduce((sum, r) => sum + r.hoursWorked, 0);
      const tasks = get().projectTasks.filter(t => t.resourceId === id);
      const completed = tasks.filter(t => t.status === "completed").length;
      return {
        id,
        name: get().resources.find(r => r.id === id)?.fullName || "Developer",
        reportsSubmitted: reports.length,
        hoursLogged,
        tasksCompleted: completed,
        currentProgress: 75.0,
        reportingStreak: 5,
        efficiencyMetrics: {
          efficiencyScore: 85,
          auditsFailed: reports.reduce((sum, r) => sum + (r.flags?.length || 0), 0)
        }
      };
    }
  },
}));

export const calculateResourceCapacity = (
  resourceId: string,
  assignments: ProjectAssignment[],
  requirements: ProjectRequirement[],
  projects: Project[],
  weeklyAllowedHours: number = 35
) => {
  const resourceAssignments = assignments.filter((a) => a.resourceId === resourceId);
  let assignedHours = 0;
  const projectNames: string[] = [];

  resourceAssignments.forEach((assign) => {
    const req = requirements.find((r) => r.id === assign.requirementId);
    const proj = projects.find((p) => p.id === assign.projectId);
    if (req && proj) {
      let durationWeeks = 4;
      if (proj.startDate) {
        const partsStart = proj.startDate.split("-");
        const partsEnd = proj.endDate ? proj.endDate.split("-") : [];
        
        const start = new Date(Number(partsStart[2]), Number(partsStart[1]) - 1, Number(partsStart[0]));
        const end = partsEnd.length === 3 
          ? new Date(Number(partsEnd[2]), Number(partsEnd[1]) - 1, Number(partsEnd[0]))
          : new Date();
          
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 7) {
          durationWeeks = diffDays / 7;
        }
      }
      const weeklyLoad = req.estimatedHours / durationWeeks;
      assignedHours += weeklyLoad;
      
      if (proj.name && !projectNames.includes(proj.name)) {
        projectNames.push(proj.name);
      }
    }
  });

  const availability = Math.max(0, weeklyAllowedHours - assignedHours);
  const utilization = weeklyAllowedHours > 0 ? (assignedHours / weeklyAllowedHours) * 100 : 0;

  return {
    assignedHours: Math.round(assignedHours * 10) / 10,
    availability: Math.round(availability * 10) / 10,
    utilization: Math.round(utilization * 10) / 10,
    currentProjects: projectNames,
  };
};
