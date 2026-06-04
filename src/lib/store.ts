import { create } from "zustand";
import type { Resource, Client, Project, Task, Leave, Timesheet, Payslip, Announcement, Role } from "./types";
import { initialResources, initialClients, initialProjects, initialTasks, initialLeaves, initialTimesheets, initialPayslips, initialAnnouncements } from "./mockData";

interface AuthState {
  role: Role | null;
  userName: string;
  resourceId: string | null;
  login: (role: Role, name: string, resourceId?: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  role: null,
  userName: "",
  resourceId: null,
  login: (role, name, resourceId) => set({ role, userName: name, resourceId: resourceId ?? null }),
  logout: () => set({ role: null, userName: "", resourceId: null }),
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
  deleteTimesheet: (id: string) => void;

  addPayslip: (p: Payslip) => void;
  deletePayslip: (id: string) => void;

  addAnnouncement: (a: Announcement) => void;
  deleteAnnouncement: (id: string) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const useRMS = create<RMSState>((set) => ({
  resources: initialResources,
  clients: initialClients,
  projects: initialProjects,
  tasks: initialTasks,
  leaves: initialLeaves,
  timesheets: initialTimesheets,
  payslips: initialPayslips,
  announcements: initialAnnouncements,

  addResource: (r) => set((s) => ({ resources: [...s.resources, { ...r, id: r.id || uid() }] })),
  updateResource: (id, patch) => set((s) => ({ resources: s.resources.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  deleteResource: (id) => set((s) => ({ resources: s.resources.filter((x) => x.id !== id) })),

  addClient: (c) => set((s) => ({ clients: [...s.clients, { ...c, id: c.id || uid() }] })),
  updateClient: (id, patch) => set((s) => ({ clients: s.clients.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  deleteClient: (id) => set((s) => ({ clients: s.clients.filter((x) => x.id !== id) })),

  addProject: (p) => set((s) => ({ projects: [...s.projects, { ...p, id: p.id || uid() }] })),
  updateProject: (id, patch) => set((s) => ({ projects: s.projects.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  deleteProject: (id) => set((s) => ({ projects: s.projects.filter((x) => x.id !== id) })),

  addTask: (t) => set((s) => ({ tasks: [...s.tasks, { ...t, id: t.id || uid() }] })),
  updateTask: (id, patch) => set((s) => ({ tasks: s.tasks.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((x) => x.id !== id) })),

  addLeave: (l) => set((s) => ({ leaves: [...s.leaves, { ...l, id: l.id || uid() }] })),
  updateLeave: (id, patch) => set((s) => ({ leaves: s.leaves.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  deleteLeave: (id) => set((s) => ({ leaves: s.leaves.filter((x) => x.id !== id) })),

  addTimesheet: (t) => set((s) => ({ timesheets: [{ ...t, id: t.id || uid() }, ...s.timesheets] })),
  deleteTimesheet: (id) => set((s) => ({ timesheets: s.timesheets.filter((x) => x.id !== id) })),

  addPayslip: (p) => set((s) => ({ payslips: [{ ...p, id: p.id || uid() }, ...s.payslips] })),
  deletePayslip: (id) => set((s) => ({ payslips: s.payslips.filter((x) => x.id !== id) })),

  addAnnouncement: (a) => set((s) => ({ announcements: [{ ...a, id: a.id || uid() }, ...s.announcements] })),
  deleteAnnouncement: (id) => set((s) => ({ announcements: s.announcements.filter((x) => x.id !== id) })),
}));
