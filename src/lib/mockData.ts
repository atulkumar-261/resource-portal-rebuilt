import type {
  ProjectRequirement,
  ProjectSkillRequirement,
  ProjectAssignment,
  ProjectTask,
  TaskActivityLog,
  TaskScheduleEntry,
  TaskTimeLog,
  DailyReport,
  DailyReportItem
} from "./types";

// ─── AI Planning & Project Execution mock data ─────────────────────────────
// These are kept because the AI planning features do not have dedicated CRUD
// API endpoints yet and still operate on local state.

export const initialProjectRequirements: ProjectRequirement[] = [
  {
    id: 1,
    projectId: "p1",
    moduleName: "Frontend UI/UX",
    description: "User dashboard screens and TanStack Router integrations.",
    estimatedHours: 80,
    priority: "High",
    status: "active",
  },
  {
    id: 2,
    projectId: "p1",
    moduleName: "Backend API Framework",
    description: "FastAPI routing setups and PostgreSQL connections.",
    estimatedHours: 100,
    priority: "High",
    status: "active",
  }
];

export const initialProjectSkillRequirements: ProjectSkillRequirement[] = [
  {
    id: 1,
    requirementId: 1,
    skillId: "skill_react",
    requiredLevel: "Senior",
    mandatory: true,
  }
];

export const initialProjectAssignments: ProjectAssignment[] = [
  {
    id: 1,
    projectId: "p1",
    requirementId: 1,
    resourceId: "177", // Asra Ghafoor
    assignmentType: "standard",
    assignedBy: "admin",
    assignedAt: "2026-06-01T09:00:00Z"
  }
];

export const initialProjectTasks: ProjectTask[] = [
  {
    id: "T-101",
    projectId: "p1",
    requirementId: 1,
    resourceId: "177",
    resourceName: "Asra Ghafoor",
    parentTaskId: null,
    taskName: "Develop Dashboard layout and charts",
    description: "User dashboard screens and TanStack Router integrations.",
    estimatedHours: 40,
    actualHours: 12,
    priority: "High",
    status: "in_progress",
    startDate: "2026-06-08",
    endDate: "2026-06-12",
    dependsOn: []
  },
  {
    id: "T-102",
    projectId: "p1",
    requirementId: 1,
    resourceId: "177",
    resourceName: "Asra Ghafoor",
    parentTaskId: null,
    taskName: "Implement user settings form",
    description: "User settings editing screen and theme configs.",
    estimatedHours: 40,
    actualHours: 0,
    priority: "Medium",
    status: "pending",
    startDate: "2026-06-15",
    endDate: "2026-06-19",
    dependsOn: ["T-101"]
  },
  {
    id: "T-201",
    projectId: "p1",
    requirementId: 2,
    resourceId: "178",
    resourceName: "Supriya Dalli",
    parentTaskId: null,
    taskName: "Implement FastAPI router setups",
    description: "FastAPI routing setups and PostgreSQL connections.",
    estimatedHours: 50,
    actualHours: 50,
    priority: "High",
    status: "completed",
    startDate: "2026-06-01",
    endDate: "2026-06-05",
    dependsOn: []
  },
  {
    id: "T-202",
    projectId: "p1",
    requirementId: 2,
    resourceId: "178",
    resourceName: "Supriya Dalli",
    parentTaskId: null,
    taskName: "Configure PostgreSQL connections",
    description: "Setup SQLAlchemy models and migrate DDL tables.",
    estimatedHours: 50,
    actualHours: 8,
    priority: "High",
    status: "in_progress",
    startDate: "2026-06-08",
    endDate: "2026-06-12",
    dependsOn: ["T-201"]
  }
];

export const initialTaskScheduleEntries: TaskScheduleEntry[] = [
  // Asra Ghafoor (177) T-101 (2026-06-08 to 2026-06-12, 8h per day)
  { id: "se-1", taskId: "T-101", resourceId: "177", workDate: "2026-06-08", plannedHours: 8, status: "planned" },
  { id: "se-2", taskId: "T-101", resourceId: "177", workDate: "2026-06-09", plannedHours: 8, status: "planned" },
  { id: "se-3", taskId: "T-101", resourceId: "177", workDate: "2026-06-10", plannedHours: 8, status: "planned" },
  { id: "se-4", taskId: "T-101", resourceId: "177", workDate: "2026-06-11", plannedHours: 8, status: "planned" },
  { id: "se-5", taskId: "T-101", resourceId: "177", workDate: "2026-06-12", plannedHours: 8, status: "planned" },
  
  // Supriya Dalli (178) T-202 (2026-06-08 to 2026-06-12, 8h per day)
  { id: "se-6", taskId: "T-202", resourceId: "178", workDate: "2026-06-08", plannedHours: 8, status: "planned" },
  { id: "se-7", taskId: "T-202", resourceId: "178", workDate: "2026-06-09", plannedHours: 8, status: "planned" },
  { id: "se-8", taskId: "T-202", resourceId: "178", workDate: "2026-06-10", plannedHours: 8, status: "planned" },
  { id: "se-9", taskId: "T-202", resourceId: "178", workDate: "2026-06-11", plannedHours: 8, status: "planned" },
  { id: "se-10", taskId: "T-202", resourceId: "178", workDate: "2026-06-12", plannedHours: 8, status: "planned" }
];

export const initialTaskActivityLogs: TaskActivityLog[] = [
  { id: "log-1", taskId: "T-201", resourceId: "178", action: "started", createdAt: "2026-06-01T09:00:00Z" },
  { id: "log-2", taskId: "T-201", resourceId: "178", action: "completed", createdAt: "2026-06-05T17:00:00Z" },
  { id: "log-3", taskId: "T-101", resourceId: "177", action: "started", createdAt: "2026-06-08T09:30:00Z" },
  { id: "log-4", taskId: "T-202", resourceId: "178", action: "started", createdAt: "2026-06-08T10:00:00Z" }
];

export const initialTaskTimeLogs: TaskTimeLog[] = [
  { id: "tl-1", taskId: "T-101", resourceId: "177", hoursLogged: 12.0, notes: "Created shells and navigation menus.", loggedAt: "2026-06-08T16:00:00Z" },
  { id: "tl-2", taskId: "T-202", resourceId: "178", hoursLogged: 8.0, notes: "Setup connection pool and basic engine config.", loggedAt: "2026-06-08T17:00:00Z" }
];

export const initialDailyReports: DailyReport[] = [
  {
    id: "dr-1",
    resourceId: "177",
    resourceName: "Asra Ghafoor",
    projectId: "p1",
    projectName: "HMS System Integration",
    workDate: "2026-06-08",
    workDone: "Configured dashboard layouts, navigation panel widgets, and styled the execution grids.",
    blockers: "",
    tomorrowPlan: "Complete data binding filters and connect state handlers.",
    hoursWorked: 8.0,
    status: "analyzed",
    createdAt: "2026-06-08T17:00:00Z",
    submittedAt: "2026-06-08T17:05:00Z",
    analysisResult: {
      summary: "Progressed dashboard interface panels and navigation layout configurations.",
      progressScore: 90,
      riskLevel: "low",
      warnings: []
    },
    flags: []
  },
  {
    id: "dr-2",
    resourceId: "178",
    resourceName: "Supriya Dalli",
    projectId: "p1",
    projectName: "HMS System Integration",
    workDate: "2026-06-08",
    workDone: "Worked on connections.",
    blockers: "Waiting on backend API routes specs from the tech lead.",
    tomorrowPlan: "Establish entity mappings.",
    hoursWorked: 8.0,
    status: "analyzed",
    createdAt: "2026-06-08T17:10:00Z",
    submittedAt: "2026-06-08T17:15:00Z",
    analysisResult: {
      summary: "Attempted database pool connections. Stymied by api spec blockers.",
      progressScore: 40,
      riskLevel: "medium",
      warnings: [
        "Vague work description: 'Worked on connections.' Please add technical details.",
        "Blocker warning: 'Waiting on backend API routes specs from the tech lead.'"
      ]
    },
    flags: [
      {
        id: "rf-1",
        reportId: "dr-2",
        flagType: "vague_report",
        severity: "warning",
        message: "Work done text is too generic. Try adding specific file references.",
        createdAt: "2026-06-08T17:15:00Z"
      },
      {
        id: "rf-2",
        reportId: "dr-2",
        flagType: "blocker_detected",
        severity: "warning",
        message: "Resource is blocked by: 'Waiting on backend API routes specs'. Check integration dependencies.",
        createdAt: "2026-06-08T17:15:00Z"
      }
    ]
  }
];

export const initialDailyReportItems: DailyReportItem[] = [
  {
    id: "dri-1",
    reportId: "dr-1",
    taskId: "T-101",
    taskName: "Develop Dashboard layout and charts",
    hoursSpent: 8.0,
    completionPercent: 50,
    comments: "Created dashboard layout and panels."
  },
  {
    id: "dri-2",
    reportId: "dr-2",
    taskId: "T-202",
    taskName: "Configure PostgreSQL connections",
    hoursSpent: 8.0,
    completionPercent: 20,
    comments: "Connected PG client but blocked on spec layout."
  }
];


