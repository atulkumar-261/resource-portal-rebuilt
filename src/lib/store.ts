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
import { toast } from "sonner";
import { fetchResources } from "./api/resources";
import { fetchClients, createClient, updateClient as updateClientApi, deleteClient as deleteClientApi } from "./api/clients";
import { fetchProjects, createProject, updateProject as updateProjectApi, deleteProject as deleteProjectApi } from "./api/projects";
import { fetchTasks, createTask, updateTask as updateTaskApi, deleteTask as deleteTaskApi } from "./api/tasks";
import { fetchLeaves, applyLeave, updateLeaveStatus, deleteLeave as deleteLeaveApi, fetchLeaveBalances } from "./api/leaves";
import { fetchTimesheets, submitTimesheet, approveTimesheet, deleteTimesheet as deleteTimesheetApi } from "./api/timesheets";
import { fetchPayslips, createPayslip, deletePayslip as deletePayslipApi } from "./api/payslips";
import { fetchAnnouncements, createAnnouncement, deleteAnnouncement as deleteAnnouncementApi, uploadAnnouncementFile } from "./api/announcements";
import {
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

  initStore: () => Promise<void>;

  addResource: (r: Resource) => Promise<void>;
  updateResource: (id: string, patch: Partial<Resource>) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;

  addClient: (c: Client) => Promise<void>;
  updateClient: (id: string, patch: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;

  addProject: (p: Project) => Promise<void>;
  updateProject: (id: string, patch: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  addTask: (t: Task) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  addLeave: (l: Leave) => Promise<void>;
  updateLeave: (id: string, patch: Partial<Leave>) => Promise<void>;
  deleteLeave: (id: string) => Promise<void>;

  addTimesheet: (t: any) => Promise<void>;
  updateTimesheet: (id: string, patch: Partial<Timesheet>) => Promise<void>;
  deleteTimesheet: (id: string) => Promise<void>;

  addPayslip: (p: any) => Promise<void>;
  deletePayslip: (id: string) => Promise<void>;

  addAnnouncement: (a: any) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;

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


let _storeInitPromise: Promise<void> | null = null;
let _initializedToken: string | null = null;

export const useRMS = create<RMSState>((set, get) => ({
  resources: [],
  clients: [],
  projects: [],
  tasks: [],
  leaves: [],
  timesheets: [],
  payslips: [],
  announcements: [],
  projectRequirements: initialProjectRequirements,
  projectSkillRequirements: initialProjectSkillRequirements,
  projectAssignments: initialProjectAssignments,
  projectTasks: initialProjectTasks,
  taskScheduleEntries: initialTaskScheduleEntries,
  taskActivityLogs: initialTaskActivityLogs,
  taskTimeLogs: initialTaskTimeLogs,
  dailyReports: initialDailyReports,
  dailyReportItems: initialDailyReportItems,

  initStore: async () => {
    const token = useAuth.getState().token;
    if (!token) {
      _storeInitPromise = null;
      _initializedToken = null;
      return;
    }

    if (_initializedToken !== token) {
      _storeInitPromise = null;
    }

    if (_storeInitPromise) return _storeInitPromise;

    _initializedToken = token;
    _storeInitPromise = (async () => {
      try {
        const [
          resList,
          clientList,
          projectList,
          taskList,
          leaveList,
          timesheetList,
          payslipList,
          announcementList
        ] = await Promise.all([
          fetchResources().catch(() => []),
          fetchClients().catch(() => []),
          fetchProjects().catch(() => []),
          fetchTasks().catch(() => []),
          fetchLeaves().catch(() => []),
          fetchTimesheets().catch(() => []),
          fetchPayslips().catch(() => []),
          fetchAnnouncements().catch(() => [])
        ]);

        const resources: Resource[] = resList.map((r: any) => ({
          id: r.id,
          fullName: r.full_name ?? "",
          jobTitle: r.designation_title || r.jobTitle || "Developer",
          email: r.email ?? "",
          employeeId: r.employee_id ?? "",
          skillset: r.skillset ?? "",
          phone: r.phone ?? "",
          address: r.address ?? "",
          citizenOf: r.citizen_of ?? "",
          passportNumber: r.passport_number ?? "",
          passportExpiry: r.passport_expiry ?? "",
          visaNumber: r.visa_number ?? "",
          visaExpiry: r.visa_expiry ?? "",
          niNumber: r.ni_number ?? "",
          dob: r.dob ?? "",
          bankAccount: r.account_number ?? "",
          sortCode: r.sort_code ?? "",
          bankName: r.bank_name ?? "",
          emergencyName: r.emergency_contact_name ?? "",
          emergencyPhone: r.emergency_contact_phone ?? "",
          emergencyEmail: r.emergency_contact_email ?? "",
          emergencyAddress: r.emergency_contact_address ?? "",
          status: (r.status || "active") as any,
          approvalStatus: r.approval_status ?? "pending",
          onboardingStatus: r.onboarding_status ?? "pending",
          avatarUrl: r.avatar_url ?? undefined,
          weeklyAllowedHours: r.weekly_allowed_hours ?? 35,
          performanceNotes: r.performance_notes ?? "",
          otherInfo: r.other_info ?? "",
          profileCompletionPercentage: r.profile_completion_percentage ?? 0,
          userIsActive: r.user_is_active ?? false,
          isDeleted: r.is_deleted ?? false,
          hasRequiredDocuments: r.has_required_documents ?? false,
        }));

        const clients: Client[] = clientList.map((c: any) => ({
          id: c.id,
          name: c.name,
          contactPerson: c.contact_person || "",
          email: c.email || "",
          phone: c.phone || "",
          address: c.address || ""
        }));

        const projects: Project[] = projectList.map((p: any) => ({
          id: p.id,
          name: p.name,
          client: p.client || "",
          startDate: p.startDate || "",
          endDate: p.endDate || "",
          status: p.status || "active",
          description: p.description || ""
        }));

        const tasks: Task[] = taskList.map((t: any) => ({
          id: t.id,
          subject: t.subject || "",
          startDate: t.startDate || "",
          resourceId: t.resourceId || "",
          resourceName: t.resourceName || "",
          project: t.project || "",
          notes: t.notes || "",
          status: t.status || "pending"
        }));

        const leaves: Leave[] = leaveList.map((l: any) => ({
          id: l.id,
          resourceId: l.resourceId,
          resourceName: l.resourceName,
          fromDate: l.fromDate,
          toDate: l.toDate,
          totalDays: l.totalDays,
          type: l.type as any,
          reason: l.reason || "",
          status: l.status
        }));

        const timesheets: Timesheet[] = timesheetList.map((ts: any) => ({
          id: ts.id,
          resourceId: ts.resourceId,
          resourceName: ts.resourceName,
          weekNumber: ts.weekNumber,
          weekEndDate: ts.weekEndDate,
          totalHours: ts.totalHours,
          status: ts.status,
          projectName: ts.projectName,
          dailyHours: ts.dailyHours
        }));

        const payslips: Payslip[] = payslipList.map((p: any) => ({
          id: p.id,
          resourceId: p.resourceId,
          resourceName: p.resourceName,
          month: p.month,
          days: p.days,
          notes: p.notes || "",
          amount: p.amount
        }));

        const announcements: Announcement[] = announcementList.map((a: any) => ({
          id: a.id,
          subject: a.subject,
          message: a.message,
          date: a.date
        }));

        set({
          resources,
          clients,
          projects,
          tasks,
          leaves,
          timesheets,
          payslips,
          announcements
        });
      } catch (e) {
        console.error("Failed to initialize store from database", e);
        _storeInitPromise = null;
        _initializedToken = null;
        throw e;
      }
    })();
    return _storeInitPromise;
  },

  addResource: async (r) => {
    console.warn("[DEPRECATED] addResource store action is a local-only stub. Use React Query mutations from api/resources.ts instead.");
    set((s) => ({ resources: [...s.resources, { ...r, id: r.id || uid() }] }));
  },
  updateResource: async (id, patch) => {
    console.warn("[DEPRECATED] updateResource store action is a local-only stub. Use React Query mutations from api/resources.ts instead.");
    set((s) => ({ resources: s.resources.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  },
  deleteResource: async (id) => {
    console.warn("[DEPRECATED] deleteResource store action is a local-only stub. Use React Query mutations from api/resources.ts instead.");
    set((s) => ({ resources: s.resources.filter((x) => x.id !== id) }));
  },

  addClient: async (c) => {
    try {
      const response = await createClient({
        name: c.name,
        contact_person: c.contactPerson,
        email: c.email,
        phone: c.phone,
        address: c.address
      });
      const newClient: Client = {
        id: response.id,
        name: response.name,
        contactPerson: response.contact_person || "",
        email: response.email || "",
        phone: response.phone || "",
        address: response.address || ""
      };
      set((s) => ({ clients: [...s.clients, newClient] }));
      toast.success("Client added successfully.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to add client.");
      throw e;
    }
  },
  updateClient: async (id, patch) => {
    try {
      const response = await updateClientApi(id, {
        name: patch.name,
        contact_person: patch.contactPerson,
        email: patch.email,
        phone: patch.phone,
        address: patch.address
      });
      set((s) => ({
        clients: s.clients.map((x) =>
          x.id === id
            ? {
                ...x,
                name: response.name,
                contactPerson: response.contact_person || "",
                email: response.email || "",
                phone: response.phone || "",
                address: response.address || ""
              }
            : x
        )
      }));
      toast.success("Client updated successfully.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to update client.");
      throw e;
    }
  },
  deleteClient: async (id) => {
    try {
      await deleteClientApi(id);
      set((s) => ({ clients: s.clients.filter((x) => x.id !== id) }));
      toast.success("Client deleted successfully.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to delete client.");
      throw e;
    }
  },

  addProject: async (p) => {
    try {
      if (p.id) {
        const exists = get().projects.some((x) => x.id === p.id);
        if (exists) return;
        set((s) => ({ projects: [...s.projects, p] }));
        return;
      }
      const response = await createProject({
        name: p.name,
        client: p.client,
        startDate: p.startDate,
        endDate: p.endDate,
        status: p.status,
        description: p.description
      });
      const newProject: Project = {
        id: response.id,
        name: response.name,
        client: response.client || "",
        startDate: response.startDate || "",
        endDate: response.endDate || "",
        status: response.status || "active",
        description: response.description || ""
      };
      set((s) => ({ projects: [...s.projects, newProject] }));
      toast.success("Project created successfully.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create project.");
      throw e;
    }
  },
  updateProject: async (id, patch) => {
    try {
      const response = await updateProjectApi(id, {
        name: patch.name,
        client: patch.client,
        startDate: patch.startDate,
        endDate: patch.endDate,
        status: patch.status,
        description: patch.description
      });
      set((s) => ({
        projects: s.projects.map((x) =>
          x.id === id
            ? {
                ...x,
                name: response.name,
                client: response.client || "",
                startDate: response.startDate || "",
                endDate: response.endDate || "",
                status: response.status || "active",
                description: response.description || ""
              }
            : x
        )
      }));
      toast.success("Project updated successfully.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to update project.");
      throw e;
    }
  },
  deleteProject: async (id) => {
    try {
      await deleteProjectApi(id);
      set((s) => ({ projects: s.projects.filter((x) => x.id !== id) }));
      toast.success("Project deleted successfully.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to delete project.");
      throw e;
    }
  },

  addTask: async (t) => {
    try {
      const response = await createTask({
        subject: t.subject,
        startDate: t.startDate,
        resourceId: t.resourceId,
        project: t.project,
        notes: t.notes
      });
      const newTask: Task = {
        id: response.id,
        subject: response.subject,
        startDate: response.startDate,
        resourceId: response.resourceId,
        resourceName: response.resourceName,
        project: response.project,
        notes: response.notes || "",
        status: response.status
      };
      set((s) => ({ tasks: [...s.tasks, newTask] }));
      toast.success("Task created successfully.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create task.");
      throw e;
    }
  },
  updateTask: async (id, patch) => {
    try {
      const response = await updateTaskApi(id, {
        subject: patch.subject,
        startDate: patch.startDate,
        resourceId: patch.resourceId,
        project: patch.project,
        notes: patch.notes,
        status: patch.status
      });
      set((s) => ({
        tasks: s.tasks.map((x) =>
          x.id === id
            ? {
                ...x,
                subject: response.subject,
                startDate: response.startDate,
                resourceId: response.resourceId,
                resourceName: response.resourceName,
                project: response.project,
                notes: response.notes || "",
                status: response.status
              }
            : x
        )
      }));
      toast.success("Task updated successfully.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to update task.");
      throw e;
    }
  },
  deleteTask: async (id) => {
    try {
      await deleteTaskApi(id);
      set((s) => ({ tasks: s.tasks.filter((x) => x.id !== id) }));
      toast.success("Task deleted successfully.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to delete task.");
      throw e;
    }
  },

  addLeave: async (l) => {
    try {
      const balances = await fetchLeaveBalances(l.resourceId);
      const bal = balances.find((b) => b.leave_type_name.toLowerCase() === l.type.toLowerCase());
      if (!bal) {
        throw new Error(`Leave type "${l.type}" not found in resource balances.`);
      }
      const resp = await applyLeave({
        leaveTypeId: bal.leave_type_id,
        fromDate: l.fromDate,
        toDate: l.toDate,
        reason: l.reason
      });
      const newLeave: Leave = {
        id: resp.id,
        resourceId: resp.resourceId,
        resourceName: resp.resourceName,
        fromDate: resp.fromDate,
        toDate: resp.toDate,
        totalDays: resp.totalDays,
        type: resp.type as any,
        reason: resp.reason || "",
        status: resp.status as any
      };
      set((s) => ({ leaves: [newLeave, ...s.leaves] }));
      toast.success("Leave applied successfully.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to apply for leave");
      throw e;
    }
  },
  updateLeave: async (id, patch) => {
    try {
      if (patch.status === "approved" || patch.status === "rejected") {
        const response = await updateLeaveStatus(id, patch.status);
        set((s) => ({
          leaves: s.leaves.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: response.status as any
                }
              : x
          )
        }));
        toast.success(`Leave request ${patch.status}.`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to update leave status.");
      throw e;
    }
  },
  deleteLeave: async (id) => {
    try {
      await deleteLeaveApi(id);
      set((s) => ({ leaves: s.leaves.filter((x) => x.id !== id) }));
      toast.success("Leave request deleted.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to delete leave request.");
      throw e;
    }
  },

  addTimesheet: async (t) => {
    try {
      const response = await submitTimesheet({
        week_end_date: t.weekEndDate,
        rows: t.rows.map((r: any) => ({
          project_id: r.projectId,
          daily_entries: r.dailyEntries.map((e: any) => ({
            work_date: e.workDate,
            hours: e.hours,
            remarks: e.remarks
          }))
        }))
      });
      const newTimesheet: Timesheet = {
        id: response.id,
        resourceId: response.resourceId,
        resourceName: response.resourceName,
        weekNumber: response.weekNumber,
        weekEndDate: response.weekEndDate,
        totalHours: response.totalHours,
        status: response.status,
        projectName: response.projectName,
        dailyHours: response.dailyHours
      };
      set((s) => ({ timesheets: [newTimesheet, ...s.timesheets] }));
      toast.success("Timesheet submitted successfully.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to submit timesheet.");
      throw e;
    }
  },
  updateTimesheet: async (id, patch) => {
    try {
      if (patch.status === "approved" || patch.status === "rejected") {
        const response = await approveTimesheet(id, patch.status);
        set((s) => ({
          timesheets: s.timesheets.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: response.status as any
                }
              : x
          )
        }));
        toast.success(`Timesheet ${patch.status}.`);
      } else {
        set((s) => ({
          timesheets: s.timesheets.map((x) => (x.id === id ? { ...x, ...patch } : x))
        }));
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to update timesheet.");
      throw e;
    }
  },
  deleteTimesheet: async (id) => {
    try {
      await deleteTimesheetApi(id);
      set((s) => ({ timesheets: s.timesheets.filter((x) => x.id !== id) }));
      toast.success("Timesheet deleted.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to delete timesheet.");
      throw e;
    }
  },

  addPayslip: async (p) => {
    try {
      const response = await createPayslip({
        month: p.month,
        days: p.days,
        notes: p.notes,
        resourceId: p.resourceId,
        amount: p.amount,
        file: p.file
      });
      const newPayslip: Payslip = {
        id: response.id,
        resourceId: response.resourceId,
        resourceName: response.resourceName,
        month: response.month,
        days: response.days,
        notes: response.notes || "",
        amount: response.amount
      };
      set((s) => ({ payslips: [newPayslip, ...s.payslips] }));
      toast.success("Payslip generated successfully.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create payslip.");
      throw e;
    }
  },
  deletePayslip: async (id) => {
    try {
      await deletePayslipApi(id);
      set((s) => ({ payslips: s.payslips.filter((x) => x.id !== id) }));
      toast.success("Payslip deleted.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to delete payslip.");
      throw e;
    }
  },

  addAnnouncement: async (a) => {
    try {
      const response = await createAnnouncement({
        subject: a.subject,
        message: a.message,
        date: a.date
      });
      if (a.file) {
        await uploadAnnouncementFile(response.id, a.file);
      }
      const newAnnouncement: Announcement = {
        id: response.id,
        subject: response.subject,
        message: response.message,
        date: response.date
      };
      set((s) => ({ announcements: [newAnnouncement, ...s.announcements] }));
      toast.success("Announcement posted successfully.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create announcement.");
      throw e;
    }
  },
  deleteAnnouncement: async (id) => {
    try {
      await deleteAnnouncementApi(id);
      set((s) => ({ announcements: s.announcements.filter((x) => x.id !== id) }));
      toast.success("Announcement deleted.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to delete announcement.");
      throw e;
    }
  },

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
        currentProgress: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
        reportingStreak: reports.length > 0 ? reports.length : 0,
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
      const totalFlags = reports.reduce((sum, r) => sum + (r.flags?.length || 0), 0);

      // Calculate actual streak from local reports
      let streak = 0;
      if (reports.length > 0) {
        const uniqueDates = [...new Set(reports.map(r => r.workDate))].sort().reverse();
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

        if (uniqueDates[0] >= threeDaysAgoStr) {
          let checkDate = new Date(uniqueDates[0]);
          let idx = 0;
          while (idx < uniqueDates.length) {
            const checkStr = checkDate.toISOString().split('T')[0];
            if (uniqueDates[idx] === checkStr) {
              streak++;
              idx++;
              checkDate.setDate(checkDate.getDate() - 1);
              // Skip weekends
              while (checkDate.getDay() === 0 || checkDate.getDay() === 6) {
                checkDate.setDate(checkDate.getDate() - 1);
              }
            } else {
              break;
            }
          }
        }
      }

      // Calculate actual efficiency: 100% - (flags * 10%), min 20%
      const efficiencyScore = Math.max(20, Math.min(100, 100 - (totalFlags * 10)));

      return {
        id,
        name: get().resources.find(r => r.id === id)?.fullName || "Developer",
        reportsSubmitted: reports.length,
        hoursLogged,
        tasksCompleted: completed,
        currentProgress: reports.length > 0 ? 75.0 : 0,
        reportingStreak: streak,
        efficiencyMetrics: {
          efficiencyScore,
          auditsFailed: totalFlags
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
